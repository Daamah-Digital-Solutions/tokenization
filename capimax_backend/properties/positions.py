"""
Selling an installment plan as ONE position (client, Nov 2026 — as on Capimax BRX).

An investor still paying installments can't sell part of the plan's shares; the whole
plan is sold together and the buyer takes it over:

    position value   = all the plan's shares x price per share
    remaining        = the plan's principal not paid yet
    seller's cash    = position value - remaining   (never below 0: nothing is owed)
    resale fee       = secondary-market fee % of the seller's cash, paid by the BUYER on top

The installment fee the seller already paid is not refunded ("paid" means principal only).
The buyer pays cash + fee now; the plan — its remaining installments, dates, autopay —
becomes the buyer's from then on, and its certificate is re-issued in the buyer's name.

Who can buy: any investor on the secondary market at the asking price, and liquidity
providers at that price too, or with a lower offer that the seller accepts or declines
(offers close after the admin's answer time, Platform fee settings -> Liquidity providers).

Installment shares are only on the platform ledger (no installment holder is minted
on-chain), so a position sale moves nothing on-chain.
"""

from __future__ import annotations

import logging
from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .models import (ConstructionInstallment, PositionListing, PositionListingStatus, PositionOffer,
                     PositionOfferStatus)

logger = logging.getLogger(__name__)

CENT = Decimal('0.01')
OPEN_PLAN = ('pending', 'processing')


class PositionError(Exception):
    def __init__(self, code: str, message: str, details: dict | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


def _q(value) -> Decimal:
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def fee_percent() -> Decimal:
    from payments.models import PlatformFeeSettings
    return Decimal(PlatformFeeSettings.current().secondary_resale_fee_pct)


def remaining_principal(plan) -> Decimal:
    return max(Decimal('0'), _q(Decimal(plan.total_investment_amount or 0) - Decimal(plan.total_amount_paid or 0)))


def figures(plan, price_per_share) -> dict:
    """The sale figures of `plan` at `price_per_share` (see the module docstring)."""
    units = int(plan.token_allocation or 0)
    price = _q(price_per_share)
    remaining = remaining_principal(plan)
    value = _q(Decimal(units) * price)
    cash = max(Decimal('0'), _q(value - remaining))
    pct = fee_percent()
    fee = _q(cash * pct / 100)
    return {
        'units': units, 'price_per_share': price, 'position_value': value,
        'remaining_principal': remaining, 'paid_principal': _q(Decimal(plan.total_amount_paid or 0)),
        'cash': cash, 'fee_percent': pct, 'fee': fee, 'buyer_total': _q(cash + fee),
        'remaining_payments': max(0, int(plan.total_installments or 0) - int(plan.payments_made or 0)),
        'next_payment_date': plan.next_payment_date,
        'next_payment_amount': plan.total_due if plan.is_active else Decimal('0'),
    }


def open_listing(plan):
    return plan.position_listings.filter(status=PositionListingStatus.LISTED).first()


def block_reason(plan, fig: dict) -> str | None:
    """Why the plan can't be sold right now (None = it can)."""
    if plan.status not in OPEN_PLAN or not plan.is_active:
        return 'fully_paid' if plan.is_completed else 'not_active'
    if (plan.payments_made or 0) < 1:
        return 'not_started'  # the down payment / first payment is not settled yet
    if fig['remaining_principal'] <= 0:
        return 'fully_paid'
    if fig['cash'] <= 0:
        return 'below_remaining'
    return None


def entry_price(plan) -> Decimal:
    """What the plan's current holder paid per share: the price they bought the position at, else the plan price."""
    bought = (plan.position_listings.filter(status=PositionListingStatus.SOLD, buyer_id=plan.investor_id)
              .order_by('-sold_at').first())
    if bought and bought.sold_price_per_share:
        return Decimal(bought.sold_price_per_share)
    units = int(plan.token_allocation or 0)
    return _q(Decimal(plan.total_investment_amount or 0) / units) if units else Decimal('0')


def holder_view(plan) -> dict | None:
    """The plan as a position for its holder: worth today, their share of it, gain, and blockers."""
    prop = plan.property_investment
    price = Decimal(prop.token_price or 0)
    if plan.status not in OPEN_PLAN and not plan.is_completed:
        return None
    fig = figures(plan, price)
    entry = entry_price(plan)
    listing = open_listing(plan)
    floor = _q(fig['remaining_principal'] / fig['units']) if fig['units'] else Decimal('0')
    return {
        'current_price': str(fig['price_per_share']),
        'units': fig['units'],
        'value': str(fig['position_value']),
        'paid_principal': str(fig['paid_principal']),
        'remaining_principal': str(fig['remaining_principal']),
        'equity': str(fig['cash']),
        'entry_price': str(entry),
        'gain': str(_q(Decimal(fig['units']) * (price - entry))),
        'fee_percent': str(fig['fee_percent']),
        'floor_price': str(floor),
        'blocked': None if listing else block_reason(plan, fig),
        'listing': listing_summary(listing, for_seller=True) if listing else None,
    }


def _image_url(prop, request=None) -> str:
    try:
        img = prop.images.filter(is_primary=True).first() or prop.images.order_by('order').first()
        if img and img.image:
            return request.build_absolute_uri(img.image.url) if request is not None else img.image.url
    except Exception:  # noqa: BLE001
        pass
    return ''


def remaining_schedule(plan) -> list[dict]:
    """The installments a buyer takes over: number, due date, amount + fee, and whether already due."""
    from .payment_plan import plan_schedule_with_status
    out = []
    for row in plan_schedule_with_status(plan):
        if row['status'] in ('paid', 'cancelled'):
            continue
        out.append({'number': row['number'], 'kind': row['kind'], 'due_date': row['due_date'].isoformat(),
                    'amount': str(row['amount']), 'fee': str(row['fee']), 'total': str(row['total']),
                    'status': row['status']})
    return out


def listing_summary(listing, *, for_seller: bool = False, viewer=None, request=None) -> dict:
    plan = listing.plan
    prop = plan.property_investment
    fig = figures(plan, listing.price_per_share)
    schedule = remaining_schedule(plan)
    entry = entry_price(plan)
    data = {
        'id': str(listing.id),
        'plan': str(plan.id),
        'status': listing.status,
        'property_id': str(prop.id),
        'property_title': prop.title,
        'property_city': prop.city,
        'property_country': prop.country,
        'property_image': _image_url(prop, request),
        'property_category': prop.property_category,
        'property_type': prop.property_type,
        'expected_completion_date': (prop.expected_completion_date.isoformat()
                                     if getattr(prop, 'expected_completion_date', None) else None),
        'current_price': str(prop.token_price or 0),
        # What the seller paid per share (plan price, or the price they bought the position at)
        'entry_price': str(entry),
        'price_change': str(_q(Decimal(fig['units']) * (Decimal(fig['price_per_share']) - entry))),
        'price_per_share': str(fig['price_per_share']),
        'units': fig['units'],
        'total_units': prop.total_tokens or 0,
        'position_value': str(fig['position_value']),
        'paid_principal': str(fig['paid_principal']),
        'remaining_principal': str(fig['remaining_principal']),
        'cash': str(fig['cash']),
        'fee_percent': str(fig['fee_percent']),
        'fee': str(fig['fee']),
        'buyer_total': str(fig['buyer_total']),
        'remaining_payments': fig['remaining_payments'],
        'next_payment_date': fig['next_payment_date'].isoformat() if fig['next_payment_date'] else None,
        'next_payment_amount': str(_q(fig['next_payment_amount'])),
        'frequency': plan.frequency,
        'total_payments': plan.total_installments,
        'payments_made': plan.payments_made,
        'schedule': schedule,
        'remaining_total': str(_q(sum((Decimal(r['total']) for r in schedule), Decimal('0')))),
        'remaining_fees': str(_q(sum((Decimal(r['fee']) for r in schedule), Decimal('0')))),
        'overdue_count': sum(1 for r in schedule if r['status'] in ('due', 'overdue')),
        'note': listing.note,
        'to_market': listing.to_market,
        'to_providers': listing.to_providers,
        'created_at': listing.created_at.isoformat(),
        'mine': viewer is not None and listing.seller_id == viewer.pk,
    }
    offers = listing.offers.select_related('liquidity_provider')
    if for_seller:
        data['offers'] = [offer_summary(o, plan) for o in offers if o.status == PositionOfferStatus.OPEN]
    else:
        lp = getattr(viewer, 'liquidity_provider_profile', None) if viewer is not None else None
        mine = next((o for o in offers if lp and o.liquidity_provider_id == lp.pk and o.status == 'open'), None)
        data['my_offer'] = offer_summary(mine, plan) if mine else None
    return data


def offer_summary(offer, plan) -> dict:
    fig = figures(plan, offer.price_per_share)
    return {
        'id': str(offer.id),
        'lp_name': offer.liquidity_provider.legal_entity_name,
        'price_per_share': str(fig['price_per_share']),
        'cash': str(fig['cash']),
        'fee': str(fig['fee']),
        'notes': offer.notes,
        'status': offer.status,
        'live': offer.is_live,
        'expires_at': offer.expires_at.isoformat(),
        'created_at': offer.created_at.isoformat(),
    }


def market(viewer, channel: str | None = None):
    """
    Positions for sale that `viewer` can buy (everyone's but their own). `channel`: 'market' — the
    secondary market page; 'providers' — the liquidity market; None — both.
    """
    qs = (PositionListing.objects.filter(status=PositionListingStatus.LISTED)
          .select_related('plan__property_investment').order_by('-created_at'))
    if channel == 'market':
        qs = qs.filter(to_market=True)
    elif channel == 'providers':
        qs = qs.filter(to_providers=True)
    if viewer is not None:
        qs = qs.exclude(seller=viewer)
    return [p for p in qs if p.plan.investor_id == p.seller_id and p.plan.is_active]


# ---------------------------------------------------------------------------
# Seller: list / cancel / answer an offer
# ---------------------------------------------------------------------------

def list_position(user, plan_id, price_per_share=None, note: str = '', *, to_market: bool = True,
                  to_providers: bool = True) -> PositionListing:
    if not (to_market or to_providers):
        raise PositionError('NO_CHANNEL', 'Choose where to sell: the secondary market, the liquidity providers, or both.')
    with transaction.atomic():
        plan = (ConstructionInstallment.objects.select_for_update(of=('self',))
                .select_related('property_investment').filter(pk=plan_id, investor=user).first())
        if plan is None:
            raise PositionError('NOT_FOUND', 'Installment plan not found.')
        if open_listing(plan):
            raise PositionError('ALREADY_LISTED', 'This position is already for sale.')
        price = Decimal(str(price_per_share)) if price_per_share else Decimal(plan.property_investment.token_price or 0)
        if price <= 0:
            raise PositionError('BAD_PRICE', 'Enter a price per share above 0.')
        fig = figures(plan, price)
        reason = block_reason(plan, fig)
        if reason == 'below_remaining':
            floor = _q(fig['remaining_principal'] / fig['units'])
            raise PositionError('below_remaining',
                                f'The price must cover the remaining installments: above ${floor} per share.',
                                {'floor_price': str(floor)})
        if reason:
            raise PositionError(reason, MESSAGES.get(reason, 'This position cannot be sold right now.'))
        return PositionListing.objects.create(plan=plan, seller=user, price_per_share=fig['price_per_share'],
                                              note=(note or '')[:300], to_market=bool(to_market),
                                              to_providers=bool(to_providers))


def set_channels(user, listing_id, *, to_market: bool, to_providers: bool) -> PositionListing:
    """The seller changes where an open listing is offered. Dropping the providers closes their offers."""
    if not (to_market or to_providers):
        raise PositionError('NO_CHANNEL', 'Choose where to sell: the secondary market, the liquidity providers, or both.')
    with transaction.atomic():
        listing = PositionListing.objects.select_for_update().filter(pk=listing_id, seller=user).first()
        if listing is None or listing.status != PositionListingStatus.LISTED:
            raise PositionError('NOT_OPEN', 'This position is not for sale.')
        closed = []
        if listing.to_providers and not to_providers:
            closed = list(listing.offers.filter(status=PositionOfferStatus.OPEN).select_related('liquidity_provider__user'))
            listing.offers.filter(status=PositionOfferStatus.OPEN).update(status=PositionOfferStatus.LAPSED,
                                                                          updated_at=timezone.now())
        listing.to_market, listing.to_providers = bool(to_market), bool(to_providers)
        listing.save(update_fields=['to_market', 'to_providers', 'updated_at'])
    if closed:
        from .position_notify import providers_closed
        providers_closed(listing, closed)
    return listing


def cancel_listing(user, listing_id) -> PositionListing:
    with transaction.atomic():
        listing = PositionListing.objects.select_for_update().filter(pk=listing_id, seller=user).first()
        if listing is None or listing.status != PositionListingStatus.LISTED:
            raise PositionError('NOT_OPEN', 'This position is not for sale.')
        offers = _close(listing, PositionListingStatus.CANCELLED, 'Withdrawn by the seller.')
    from .position_notify import offers_closed
    offers_closed(listing, offers, sold=False)
    return listing


def _close(listing, status, note='') -> list:
    listing.status = status
    listing.cancelled_at = timezone.now() if status == PositionListingStatus.CANCELLED else listing.cancelled_at
    if note:
        listing.note = note[:300]
    listing.save(update_fields=['status', 'cancelled_at', 'note', 'updated_at'])
    offers = list(listing.offers.filter(status=PositionOfferStatus.OPEN).select_related('liquidity_provider__user'))
    PositionOffer.objects.filter(pk__in=[o.pk for o in offers]).update(status=PositionOfferStatus.LAPSED,
                                                                       updated_at=timezone.now())
    return offers


def close_for_plan(plan, reason: str) -> None:
    """The plan was paid off or cancelled while for sale: the listing closes (call inside the plan's lock)."""
    listing = open_listing(plan)
    if listing is None:
        return
    offers = _close(listing, PositionListingStatus.CANCELLED, reason)
    from .position_notify import offers_closed
    transaction.on_commit(lambda: offers_closed(listing, offers, sold=False))


def decline_offer(user, listing_id, offer_id) -> None:
    offer = (PositionOffer.objects.select_related('listing', 'liquidity_provider__user')
             .filter(pk=offer_id, listing_id=listing_id, listing__seller=user).first())
    if offer is None or offer.status != PositionOfferStatus.OPEN:
        raise PositionError('NO_OFFER', 'There is no such offer to decline.')
    offer.status = PositionOfferStatus.DECLINED
    offer.save(update_fields=['status', 'updated_at'])
    from .position_notify import offer_declined
    offer_declined(offer)


def accept_offer(user, listing_id, offer_id) -> PositionListing:
    with transaction.atomic():
        offer = (PositionOffer.objects.select_for_update(of=('self',)).select_related('liquidity_provider__user')
                 .filter(pk=offer_id, listing_id=listing_id, listing__seller=user).first())
        if offer is None or not offer.is_live:
            raise PositionError('OFFER_EXPIRED', 'This offer is no longer available.')
        lp = offer.liquidity_provider
        if lp.user_id is None:
            raise PositionError('LP_NOT_LINKED', 'The liquidity provider has no active account.')
        # Accepted first (rolled back with the rest if the sale fails), so it is not among
        # the other offers that close and get a "sold to another buyer" notice.
        offer.status = PositionOfferStatus.ACCEPTED
        offer.save(update_fields=['status', 'updated_at'])
        listing = _transfer(listing_id, lp.user, offer.price_per_share, via='liquidity_provider', lp=lp)
    return listing


# ---------------------------------------------------------------------------
# Buyer: buy at the asking price / liquidity provider offers
# ---------------------------------------------------------------------------

def buy(buyer, listing_id, expected_cash=None, expected_fee=None) -> PositionListing:
    """Buy at the asking price. The buyer confirms the amounts they saw (they move as installments are paid)."""
    if expected_cash is None or expected_fee is None:
        raise PositionError('CONFIRM', 'Confirm the amounts shown.')
    lp = getattr(buyer, 'liquidity_provider_profile', None)
    with transaction.atomic():
        listing = (PositionListing.objects.filter(pk=listing_id)
                   .only('price_per_share', 'to_market', 'to_providers').first())
        if listing is None:
            raise PositionError('NOT_OPEN', 'This position is no longer for sale.')
        # Offered to providers: a provider buys as a provider (its limits apply). Otherwise only the
        # secondary market sells it, to anyone.
        as_provider = lp is not None and listing.to_providers
        if not as_provider and not listing.to_market:
            raise PositionError('NOT_OPEN', 'This position is offered to liquidity providers only.')
        return _transfer(listing_id, buyer, listing.price_per_share,
                         via='liquidity_provider' if as_provider else 'market', lp=lp if as_provider else None,
                         expected=(expected_cash, expected_fee))


def make_offer(lp, listing_id, price_per_share, notes: str = '') -> PositionOffer:
    from liquidity_provider.market import check_offer
    from liquidity_provider.models import answer_deadline

    price = _q(price_per_share or 0)
    if price <= 0:
        raise PositionError('BAD_PRICE', 'Enter a price per share.')
    with transaction.atomic():
        listing = (PositionListing.objects.select_for_update(of=('self',)).select_related('plan')
                   .filter(pk=listing_id).first())
        if listing is None or listing.status != PositionListingStatus.LISTED:
            raise PositionError('NOT_OPEN', 'This position is no longer for sale.')
        if not listing.to_providers:
            raise PositionError('NOT_FOR_PROVIDERS', 'The seller offers this position on the secondary market only: '
                                                     'buy it there at the asking price.')
        if lp.user_id and listing.seller_id == lp.user_id:
            raise PositionError('OWN_LISTING', 'You cannot buy your own position.')
        fig = figures(listing.plan, price)
        if fig['cash'] <= 0:
            floor = _q(fig['remaining_principal'] / fig['units']) if fig['units'] else Decimal('0')
            raise PositionError('below_remaining',
                                f'An offer must cover the remaining installments: above ${floor} per share.')
        if price >= Decimal(listing.price_per_share):
            raise PositionError('USE_BUY', 'This is the asking price or more: buy the position instead.')
        try:
            check_offer(lp, fig['cash'])
        except Exception as exc:  # ExitSettlementError: same limits and wallet check as other offers
            raise PositionError(getattr(exc, 'code', 'LP_LIMIT'), getattr(exc, 'message', str(exc))) from exc
        listing.offers.filter(liquidity_provider=lp, status=PositionOfferStatus.OPEN).update(
            status=PositionOfferStatus.WITHDRAWN, updated_at=timezone.now())
        offer = PositionOffer.objects.create(listing=listing, liquidity_provider=lp, price_per_share=price,
                                             notes=(notes or '')[:1000], expires_at=answer_deadline())
    from .position_notify import offer_received
    offer_received(offer)
    return offer


def withdraw_offer(lp, listing_id) -> None:
    updated = PositionOffer.objects.filter(listing_id=listing_id, liquidity_provider=lp,
                                           status=PositionOfferStatus.OPEN).update(
        status=PositionOfferStatus.WITHDRAWN, updated_at=timezone.now())
    if not updated:
        raise PositionError('NO_OFFER', 'You have no open offer on this position.')


def expire_offers(now=None) -> int:
    from .position_notify import offer_lapsed

    now = now or timezone.now()
    count = 0
    for offer in (PositionOffer.objects.filter(status=PositionOfferStatus.OPEN, expires_at__lte=now)
                  .select_related('liquidity_provider__user', 'listing__plan__property_investment')):
        if PositionOffer.objects.filter(pk=offer.pk, status=PositionOfferStatus.OPEN).update(
                status=PositionOfferStatus.LAPSED, updated_at=now):
            count += 1
            offer_lapsed(offer)
    return count


# ---------------------------------------------------------------------------
# The sale itself
# ---------------------------------------------------------------------------

def _transfer(listing_id, buyer, price_per_share, *, via: str, lp=None, expected=None) -> PositionListing:
    """
    Inside the caller's transaction: the buyer pays the seller's cash + the fee, the plan
    and its share hold become the buyer's, the seller's certificate is replaced by the
    buyer's. Lock order as the installment charge: plan, then listing, then wallets.
    """
    from investments.models import TokenReservation
    from payments.models import WalletBalance

    plan_id = PositionListing.objects.filter(pk=listing_id).values_list('plan_id', flat=True).first()
    if plan_id is None:
        raise PositionError('NOT_OPEN', 'This position is no longer for sale.')
    plan = (ConstructionInstallment.objects.select_for_update(of=('self',))
            .select_related('property_investment').get(pk=plan_id))
    listing = PositionListing.objects.select_for_update().get(pk=listing_id)
    if listing.status != PositionListingStatus.LISTED:
        raise PositionError('NOT_OPEN', 'This position is no longer for sale.')
    seller = listing.seller
    if buyer.pk == seller.pk:
        raise PositionError('OWN_LISTING', 'You cannot buy your own position.')
    if plan.investor_id != seller.pk or not plan.is_active:
        raise PositionError('NOT_OPEN', 'This position is no longer for sale.')

    if expected is None:  # an offer: its own price, the listing's may have changed meanwhile
        fig = figures(plan, price_per_share)
    else:  # bought at the asking price, read under the locks
        fig = figures(plan, listing.price_per_share)
        if _q(expected[0]) != fig['cash'] or _q(expected[1]) != fig['fee']:
            raise PositionError('POSITION_CHANGED', 'The amounts changed since you opened it. Check them again.',
                                {'cash': str(fig['cash']), 'fee': str(fig['fee'])})
    if fig['cash'] <= 0:
        raise PositionError('below_remaining', 'At this price the position no longer covers its installments.')
    if lp is not None:
        if not lp.check_transaction_limit(fig['cash']) or not lp.check_monthly_limit(fig['cash']):
            raise PositionError('LP_LIMIT', 'This is above the provider\'s per-transaction or monthly limit.')

    prop = plan.property_investment
    for user in sorted([buyer, seller], key=lambda u: str(u.pk)):
        WalletBalance.objects.get_or_create(user=user, currency='USD', defaults={'available_balance': Decimal('0.00')})
    wallets = {w.user_id: w for w in WalletBalance.objects.select_for_update()
               .filter(user__in=[buyer, seller], currency='USD').order_by('user_id')}
    if wallets[buyer.pk].available_balance < fig['buyer_total']:
        raise PositionError('INSUFFICIENT_FUNDS',
                            f'Your wallet balance is ${wallets[buyer.pk].available_balance:,.2f}; this position '
                            f'costs ${fig["buyer_total"]:,.2f} now. Add funds first.',
                            {'required': str(fig['buyer_total'])})

    label = f'installment position: {fig["units"]} shares of {prop.title}'
    WalletBalance.debit(buyer, fig['cash'], transaction_type='trade_purchase', reference_id=listing.pk,
                        description=f'Bought {label}')
    if fig['fee'] > 0:
        WalletBalance.debit(buyer, fig['fee'], transaction_type='fee', reference_id=listing.pk,
                            description=f'Resale fee ({fig["fee_percent"]}%) — {prop.title}')
    WalletBalance.credit(seller, fig['cash'], transaction_type='trade_sale', reference_id=listing.pk,
                         description=f'Sold {label}')

    # The plan is the buyer's now: its remaining installments are charged to them and the
    # reminders for what is left go to them.
    plan.investor = buyer
    plan.reminder_sent_for = plan.payments_made
    plan.missed_notice_for = plan.payments_made
    plan.save(update_fields=['investor', 'reminder_sent_for', 'missed_notice_for', 'updated_at'])
    TokenReservation.objects.filter(installment_plan=plan, released=False).update(user=buyer)

    now = timezone.now()
    listing.status = PositionListingStatus.SOLD
    listing.buyer = buyer
    listing.sold_price_per_share = fig['price_per_share']
    listing.seller_cash = fig['cash']
    listing.buyer_fee = fig['fee']
    listing.assumed_principal = fig['remaining_principal']
    listing.sold_via = via
    listing.sold_at = now
    listing.save()
    others = list(listing.offers.filter(status=PositionOfferStatus.OPEN).select_related('liquidity_provider__user'))
    PositionOffer.objects.filter(pk__in=[o.pk for o in others]).update(status=PositionOfferStatus.LAPSED,
                                                                       updated_at=now)
    if lp is not None:
        lp.current_month_total = (lp.current_month_total or 0) + fig['cash']
        lp.save(update_fields=['current_month_total'])

    _reissue_certificate(plan, seller)

    from .position_notify import position_sold
    transaction.on_commit(lambda: position_sold(listing, fig, others))
    return listing


def _reissue_certificate(plan, seller) -> None:
    """The seller's certificate for the plan is revoked; the buyer's provisional one is issued."""
    from certificates.models import Certificate, CertificateStatus
    from certificates.services import revoke, sync_plan

    for cert in Certificate.objects.filter(installment_plan=plan).exclude(status=CertificateStatus.REVOKED):
        revoke(cert, 'The installment position was sold; a certificate was issued to the new holder.')
    try:
        sync_plan(plan, notify=False)
    except Exception:  # noqa: BLE001 — the signal re-syncs it after the commit
        logger.warning('Certificate re-issue for plan %s postponed', plan.pk, exc_info=True)


MESSAGES = {
    'not_active': 'Only an active installment plan can be sold.',
    'not_started': 'The position can be sold once the first payment has been made.',
    'fully_paid': 'All installments are paid: these are ordinary shares now — sell them from My Properties.',
    'below_remaining': 'At this price the position is worth less than the remaining installments.',
    'ALREADY_LISTED': 'This position is already for sale.',
}


def investors_view_q(user):
    """Listings a user is part of (as seller or buyer), newest first."""
    return PositionListing.objects.filter(Q(seller=user) | Q(buyer=user)).select_related('plan__property_investment')
