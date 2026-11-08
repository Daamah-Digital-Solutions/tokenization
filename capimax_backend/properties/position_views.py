"""
Installment positions for sale (properties/positions.py), at /api/v1/properties/positions/:

  GET  positions/?channel=market|providers  positions the caller can buy (everyone's but their own)
  GET  positions/mine/                    the caller's listings and the positions they bought
  GET  positions/<id>/quote/?units=N      the figures and installments for N of its shares (buyer)
  POST positions/        {plan, units?, price_per_share?, note?, to_market?, to_providers?}   list a plan (seller)
  POST positions/<id>/channels/  {to_market, to_providers}       where an open listing is offered
  POST positions/<id>/cancel/                                    withdraw it (seller)
  POST positions/<id>/buy/  {units?, expected_cash, expected_fee}   buy (all or part) at the asking price
  POST positions/<id>/offer/  {price_per_share, notes?}          liquidity provider offer
  POST positions/<id>/withdraw_offer/                            liquidity provider
  POST positions/<id>/answer/  {offer, action: accept|decline}   seller answers an offer
"""

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.utils import create_error_response, create_success_response

from . import positions as P


def _error(exc: P.PositionError):
    code = status.HTTP_409_CONFLICT if exc.code in ('POSITION_CHANGED', 'INSUFFICIENT_FUNDS') else status.HTTP_400_BAD_REQUEST
    return Response(create_error_response(message=exc.message, details={'code': exc.code, **exc.details}),
                    status=code)


def _flag(value) -> bool:
    if isinstance(value, str):
        return value.strip().lower() in ('1', 'true', 'yes', 'on')
    return bool(value)


def _where(listing) -> str:
    if listing.to_market and listing.to_providers:
        return 'Your position is for sale on the secondary market and to the liquidity providers.'
    if listing.to_market:
        return 'Your position is for sale on the secondary market.'
    return 'Your position is offered to the liquidity providers.'


def _provider(user):
    lp = getattr(user, 'liquidity_provider_profile', None)
    return lp if lp is not None and lp.status == 'active' else None


class PositionListingViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        channel = request.query_params.get('channel')
        channel = channel if channel in ('market', 'providers') else None
        rows = [P.listing_summary(listing, viewer=request.user, request=request)
                for listing in P.market(request.user, channel)]
        return Response(create_success_response(data=rows))

    @action(detail=False, methods=['get'])
    def mine(self, request):
        rows = []
        for listing in P.investors_view_q(request.user).order_by('-created_at')[:100]:
            row = P.listing_summary(listing, for_seller=listing.seller_id == request.user.pk, viewer=request.user)
            row.update({'role': 'seller' if listing.seller_id == request.user.pk else 'buyer',
                        'sold_price_per_share': str(listing.sold_price_per_share or ''),
                        'seller_cash': str(listing.seller_cash or ''),
                        'buyer_fee': str(listing.buyer_fee or ''),
                        'assumed_principal': str(listing.assumed_principal or ''),
                        'sold_at': listing.sold_at.isoformat() if listing.sold_at else None})
            rows.append(row)
        return Response(create_success_response(data=rows))

    def create(self, request):
        try:
            listing = P.list_position(request.user, request.data.get('plan'), request.data.get('price_per_share'),
                                      request.data.get('note', ''),
                                      to_market=_flag(request.data.get('to_market', True)),
                                      to_providers=_flag(request.data.get('to_providers', True)),
                                      units=request.data.get('units'))
        except P.PositionError as exc:
            return _error(exc)
        return Response(create_success_response(data=P.listing_summary(listing, for_seller=True, viewer=request.user),
                                                message=_where(listing)),
                        status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def channels(self, request, pk=None):
        try:
            listing = P.set_channels(request.user, pk, to_market=_flag(request.data.get('to_market')),
                                     to_providers=_flag(request.data.get('to_providers')))
        except P.PositionError as exc:
            return _error(exc)
        return Response(create_success_response(data=P.listing_summary(listing, for_seller=True, viewer=request.user),
                                                message=_where(listing)))

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        try:
            P.cancel_listing(request.user, pk)
        except P.PositionError as exc:
            return _error(exc)
        return Response(create_success_response(message='Your position is no longer for sale.'))

    @action(detail=True, methods=['post'])
    def buy(self, request, pk=None):
        try:
            listing = P.buy(request.user, pk, request.data.get('expected_cash'), request.data.get('expected_fee'),
                            units=request.data.get('units'))
        except P.PositionError as exc:
            return _error(exc)
        return Response(create_success_response(
            data={'plan': str(listing.plan_id), 'units': listing.units or listing.plan.token_allocation,
                  'paid': str(listing.seller_cash + (listing.buyer_fee or 0))},
            message='Position bought. The installment plan is yours now; find it under Installments.'))

    @action(detail=True, methods=['get'])
    def quote(self, request, pk=None):
        from .models import PositionListing, PositionListingStatus
        listing = (PositionListing.objects.select_related('plan__property_investment')
                   .filter(pk=pk, status=PositionListingStatus.LISTED).first())
        if listing is None:
            return Response(create_error_response(message='This position is no longer for sale.'),
                            status=status.HTTP_404_NOT_FOUND)
        try:
            units = int(request.query_params.get('units') or 0) or None
        except ValueError:
            units = None
        return Response(create_success_response(
            data=P.listing_summary(listing, viewer=request.user, request=request, units=units)))

    @action(detail=True, methods=['post'])
    def offer(self, request, pk=None):
        lp = _provider(request.user)
        if lp is None:
            return Response(create_error_response(message='Only an active liquidity provider can send an offer.'),
                            status=status.HTTP_403_FORBIDDEN)
        try:
            offer = P.make_offer(lp, pk, request.data.get('price_per_share'), request.data.get('notes', ''))
        except P.PositionError as exc:
            return _error(exc)
        return Response(create_success_response(
            data=P.offer_summary(offer, offer.listing.plan),
            message=f'Offer sent. The seller can accept it until {offer.expires_at:%Y-%m-%d %H:%M} UTC.'),
            status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def withdraw_offer(self, request, pk=None):
        lp = _provider(request.user)
        try:
            if lp is None:
                raise P.PositionError('NO_OFFER', 'You have no open offer on this position.')
            P.withdraw_offer(lp, pk)
        except P.PositionError as exc:
            return _error(exc)
        return Response(create_success_response(message='Offer withdrawn.'))

    @action(detail=True, methods=['post'])
    def answer(self, request, pk=None):
        action_ = request.data.get('action')
        offer_id = request.data.get('offer')
        try:
            if action_ == 'accept':
                P.accept_offer(request.user, pk, offer_id)
                return Response(create_success_response(
                    message='Offer accepted. The amount was added to your wallet and the plan moved to the provider.'))
            if action_ == 'decline':
                P.decline_offer(request.user, pk, offer_id)
                return Response(create_success_response(message='Offer declined. Your position stays for sale.'))
        except P.PositionError as exc:
            return _error(exc)
        return Response(create_error_response(message='Choose accept or decline.'), status=status.HTTP_400_BAD_REQUEST)
