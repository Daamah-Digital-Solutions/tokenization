"""
Moving shares between two investors on the platform ledger — one rule for
every way shares change hands: a secondary-market trade, a sale to a
liquidity provider (client round 4, #13) and, later, a transfer.

The seller's completed holdings of the property are consumed oldest first;
a holding sold in full is kept as history with status TRANSFERRED, a partly
sold one keeps the rest with its cost basis reduced pro rata. The receiver
gets a new completed holding. The tokens are moved on-chain afterwards by
marketplace/chain_transfer.py.
"""

from __future__ import annotations

from decimal import Decimal

from django.utils import timezone

CENT = Decimal('0.01')


class ShareMoveError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def held_shares(user, prop) -> int:
    from investments.models import Investment, InvestmentStatus

    return sum(Investment.objects.filter(user=user, property_investment=prop, status=InvestmentStatus.COMPLETED)
               .values_list('token_amount', flat=True))


def committed_shares(user, prop, *, exclude_exit=None) -> int:
    """Shares promised elsewhere: open market listings, liquidity-provider sales and transfers."""
    from django.db.models import Sum

    from liquidity_provider.models import ExitRequest, ExitRequestStatus
    from marketplace.models import ListingStatus, MarketListing

    listed = (MarketListing.objects.filter(seller=user, property_listing=prop, listing_type='sell',
                                           status__in=[ListingStatus.ACTIVE, ListingStatus.PARTIALLY_FILLED],
                                           expires_at__gt=timezone.now())
              .aggregate(s=Sum('tokens_remaining'))['s'] or 0)
    exits = ExitRequest.objects.filter(
        investor=user, investment__property_investment=prop,
        status__in=[ExitRequestStatus.PENDING, ExitRequestStatus.UNDER_REVIEW, ExitRequestStatus.APPROVED])
    if exclude_exit is not None:
        exits = exits.exclude(pk=exclude_exit.pk)
    from transfers.models import OPEN, Transfer
    sending = (Transfer.objects.filter(sender=user, property_ref=prop, asset='units', status__in=OPEN)
               .aggregate(s=Sum('units'))['s'] or 0)
    return int(listed) + int(exits.aggregate(s=Sum('units_requested'))['s'] or 0) + int(sending)


def free_shares(user, prop, **kw) -> int:
    return max(0, held_shares(user, prop) - committed_shares(user, prop, **kw))


def move_holdings(*, seller, buyer, prop, tokens: int, buyer_cost: Decimal, payment_method: dict):
    """Inside the caller's transaction: move `tokens` from seller to buyer. Returns the buyer's new holding."""
    from investments.models import Investment, InvestmentStatus

    holdings = list(
        Investment.objects.select_for_update()
        .filter(user=seller, property_investment=prop, status=InvestmentStatus.COMPLETED, token_amount__gt=0)
        .order_by('completed_at', 'created_at')
    )
    if sum(h.token_amount for h in holdings) < tokens:
        raise ShareMoveError('SELLER_SHARES_UNAVAILABLE', 'The seller no longer holds enough shares.')

    remaining = tokens
    for h in holdings:
        if remaining <= 0:
            break
        take = min(remaining, h.token_amount)
        if take == h.token_amount:
            # Fully sold: keep the original purchase as history; a TRANSFERRED
            # holding no longer counts as owned.
            h.status = InvestmentStatus.TRANSFERRED
            h.save(update_fields=['status', 'updated_at'])
        else:
            basis = (h.investment_amount * Decimal(take) / Decimal(h.token_amount)).quantize(CENT)
            h.token_amount -= take
            h.investment_amount = max(Decimal('0.00'), (h.investment_amount - basis).quantize(CENT))
            h.save(update_fields=['token_amount', 'investment_amount', 'updated_at'])
        remaining -= take

    return Investment.objects.create(
        user=buyer,
        property_investment=prop,
        token_amount=tokens,
        investment_amount=Decimal(buyer_cost).quantize(CENT),
        status=InvestmentStatus.COMPLETED,
        completed_at=timezone.now(),
        payment_method=payment_method,
    )
