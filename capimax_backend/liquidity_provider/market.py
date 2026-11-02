"""
Requests open to every liquidity provider, and closing requests nobody answers
(client voice notes, round 5).

The negotiation stays: an investor can still ask one provider and wait for its
offer. The weak point was that a provider who never answers kept the investor
waiting with the shares locked. Now:

  * every request has a deadline (admin: Platform fee settings → Liquidity
    providers). Unanswered requests and offers not accepted in time close by
    themselves and the shares are free again (expire_due, every 10 minutes);
  * the investor can send a request to all providers at once. Each provider
    sees it in its liquidity market and can send an offer; the investor
    accepts the best one, which settles like a direct sale, and the other
    offers close;
  * a request that is waiting, declined or closed can be sent again to another
    provider or to all, without first withdrawing it (``replaces``).
"""

from __future__ import annotations

import logging
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from .models import (ExitOffer, ExitOfferStatus, ExitRequest, ExitRequestStatus, LiquidityProvider, LPStatus,
                     answer_deadline)
from .settlement import ExitSettlementError, lp_can_pay, settle_exit

logger = logging.getLogger(__name__)

CENT = Decimal('0.01')
WAITING = (ExitRequestStatus.PENDING, ExitRequestStatus.UNDER_REVIEW)
OPEN = (*WAITING, ExitRequestStatus.APPROVED)


def open_market(lp):
    """Requests open to all providers that this provider can still offer on."""
    qs = (ExitRequest.objects.filter(liquidity_provider__isnull=True, status__in=WAITING,
                                     expires_at__gt=timezone.now())
          .select_related('investor', 'investment__property_investment')
          .order_by('-created_at'))
    if lp.user_id:
        qs = qs.exclude(investor_id=lp.user_id)
    return qs


def check_offer(lp, total: Decimal) -> None:
    if lp.status != LPStatus.ACTIVE or lp.user_id is None:
        raise ExitSettlementError('LP_INACTIVE', 'Your liquidity provider account is not active.')
    if not lp.check_transaction_limit(total) or not lp.check_monthly_limit(total):
        raise ExitSettlementError('LP_LIMIT', 'This offer is above your per-transaction or monthly limit.')
    if not lp_can_pay(lp, total):
        raise ExitSettlementError('LP_INSUFFICIENT_FUNDS',
                                  'Your wallet balance does not cover this offer and its fee. Add funds first.')


def make_offer(lp, er: ExitRequest, price: Decimal, notes: str = '') -> ExitOffer:
    """A provider offers on an open request (a new offer replaces its earlier open one)."""
    from .notify import open_offer_made

    price = Decimal(price).quantize(CENT)
    if price <= 0:
        raise ExitSettlementError('BAD_PRICE', 'Enter a price per share.')
    total = (price * er.units_requested).quantize(CENT)
    with transaction.atomic():
        er = ExitRequest.objects.select_for_update().get(pk=er.pk)
        if er.liquidity_provider_id is not None or er.status not in WAITING:
            raise ExitSettlementError('NOT_OPEN', 'This request is no longer open.')
        if er.expires_at and er.expires_at <= timezone.now():
            raise ExitSettlementError('NOT_OPEN', 'This request has closed.')
        if lp.user_id and er.investor_id == lp.user_id:
            raise ExitSettlementError('OWN_REQUEST', 'You cannot buy your own shares.')
        check_offer(lp, total)
        ExitOffer.objects.filter(exit_request=er, liquidity_provider=lp, status=ExitOfferStatus.OPEN).update(
            status=ExitOfferStatus.WITHDRAWN, updated_at=timezone.now())
        offer = ExitOffer.objects.create(exit_request=er, liquidity_provider=lp, price_per_unit=price,
                                         total_amount=total, notes=notes or '', expires_at=answer_deadline())
    open_offer_made(offer)
    return offer


def withdraw_offer(lp, offer: ExitOffer) -> None:
    if offer.liquidity_provider_id != lp.pk:
        raise ExitSettlementError('NOT_YOURS', 'This is not your offer.')
    if offer.status != ExitOfferStatus.OPEN:
        raise ExitSettlementError('NOT_OPEN', 'This offer is no longer open.')
    offer.status = ExitOfferStatus.WITHDRAWN
    offer.save(update_fields=['status', 'updated_at'])


def accept_offer(er: ExitRequest, offer: ExitOffer):
    """The investor accepts one provider's offer on its open request: it settles now."""
    from .notify import other_offers_closed

    if offer.exit_request_id != er.pk:
        raise ExitSettlementError('NO_OFFER', 'This offer is not for this request.')
    with transaction.atomic():
        er = ExitRequest.objects.select_for_update().get(pk=er.pk)
        offer = (ExitOffer.objects.select_for_update(of=('self',))
                 .select_related('liquidity_provider__user').get(pk=offer.pk))
        if er.liquidity_provider_id is not None or er.status not in WAITING:
            raise ExitSettlementError('NOT_OPEN', 'This request is no longer open.')
        if not offer.is_live:
            raise ExitSettlementError('OFFER_EXPIRED', 'This offer is no longer available.')
        # From here on it is an ordinary accepted offer of this provider.
        er.liquidity_provider = offer.liquidity_provider
        er.offered_price_per_unit = offer.price_per_unit
        er.total_offered_amount = offer.total_amount
        er.lp_notes = offer.notes
        er.processed_at = timezone.now()
        er.expires_at = offer.expires_at
        er.status = ExitRequestStatus.APPROVED
        er.save()
        tx = settle_exit(er)
        offer.status = ExitOfferStatus.ACCEPTED
        offer.save(update_fields=['status', 'updated_at'])
        others = list(ExitOffer.objects.filter(exit_request=er, status=ExitOfferStatus.OPEN)
                      .select_related('liquidity_provider__user'))
        ExitOffer.objects.filter(pk__in=[o.pk for o in others]).update(status=ExitOfferStatus.LAPSED,
                                                                       updated_at=timezone.now())
    other_offers_closed(er, others)
    return tx


def decline_offer(er: ExitRequest, offer: ExitOffer) -> None:
    from .notify import open_offer_declined

    if offer.exit_request_id != er.pk or offer.status != ExitOfferStatus.OPEN:
        raise ExitSettlementError('NO_OFFER', 'There is no such offer to decline.')
    offer.status = ExitOfferStatus.DECLINED
    offer.save(update_fields=['status', 'updated_at'])
    open_offer_declined(offer)


def close_request(er: ExitRequest, status: str) -> list[ExitOffer]:
    """Cancel / expire a request; its open offers close too. Returns those offers (to tell their providers)."""
    er.status = status
    er.save(update_fields=['status', 'updated_at'])
    offers = list(ExitOffer.objects.filter(exit_request=er, status=ExitOfferStatus.OPEN)
                  .select_related('liquidity_provider__user'))
    ExitOffer.objects.filter(pk__in=[o.pk for o in offers]).update(status=ExitOfferStatus.LAPSED,
                                                                   updated_at=timezone.now())
    return offers


def expire_due(now=None) -> dict:
    """Close requests and offers whose time ran out; the shares are free again."""
    from .notify import offer_lapsed, request_expired

    now = now or timezone.now()
    counts = {'requests': 0, 'offers': 0}

    # Offers on open requests the investor did not accept in time
    lapsed = list(ExitOffer.objects.filter(status=ExitOfferStatus.OPEN, expires_at__lte=now)
                  .select_related('liquidity_provider__user', 'exit_request__investment__property_investment'))
    for offer in lapsed:
        if ExitOffer.objects.filter(pk=offer.pk, status=ExitOfferStatus.OPEN).update(
                status=ExitOfferStatus.LAPSED, updated_at=now):
            counts['offers'] += 1
            offer_lapsed(offer)

    due = (ExitRequest.objects.filter(status__in=OPEN, expires_at__lte=now)
           .select_related('investor', 'liquidity_provider__user', 'investment__property_investment'))
    for er in due:
        # An open request with a live offer waits for the investor's answer on it
        if er.is_open_to_all and ExitOffer.objects.filter(exit_request=er, status=ExitOfferStatus.OPEN,
                                                          expires_at__gt=now).exists():
            continue
        with transaction.atomic():
            locked = ExitRequest.objects.select_for_update().get(pk=er.pk)
            if locked.status not in OPEN or not locked.expires_at or locked.expires_at > now:
                continue
            was_offer = locked.status == ExitRequestStatus.APPROVED
            close_request(locked, ExitRequestStatus.EXPIRED)
        counts['requests'] += 1
        request_expired(er, was_offer=was_offer)
    return counts


def providers_to_tell(er: ExitRequest):
    """Active providers with an account, except the seller itself."""
    return (LiquidityProvider.objects.filter(status=LPStatus.ACTIVE, user__isnull=False)
            .exclude(user_id=er.investor_id).select_related('user'))
