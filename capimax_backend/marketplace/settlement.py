"""
Secondary-market trade settlement (client round 3, #14 / #21).

A matched trade used to be parked "in escrow" forever: the buyer was never
charged, the seller never paid and the shares never changed hands. Trades
now settle instantly on the platform ledger, in one database transaction:

  * the buyer's wallet is debited the price + buyer fee;
  * the seller's wallet is credited the price − seller fee;
  * the shares move from the seller's completed investments (oldest first)
    to a new completed investment for the buyer.

On-chain custody balances are not moved here (there is no transfer service
yet); the trade keeps ``blockchain_confirmed=False`` so the existing token
reconciliation reports the pending sync.
"""

from __future__ import annotations

import logging
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

CENT = Decimal('0.01')


class TradeSettlementError(Exception):
    """A trade cannot settle (insufficient wallet balance or seller shares)."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def buyer_cost(amount: Decimal, fee_percentage: Decimal = Decimal('0.0250')) -> Decimal:
    """Price + the buyer's half of the platform fee (mirrors TradeTransaction.calculate_fees)."""
    amount = Decimal(amount)
    buyer_fee = ((amount * fee_percentage).quantize(CENT) / 2).quantize(CENT)
    return (amount + buyer_fee).quantize(CENT)


def seller_available_shares(seller, property_obj) -> int:
    from investments.models import Investment, InvestmentStatus
    return sum(
        Investment.objects.filter(
            user=seller, property_investment=property_obj, status=InvestmentStatus.COMPLETED,
        ).values_list('token_amount', flat=True)
    )


def settle_trade(trade) -> None:
    """Settle a just-created TradeTransaction. Raises TradeSettlementError."""
    from investments.models import Investment, InvestmentStatus
    from marketplace.models import TransactionStatus
    from payments.models import WalletBalance

    with transaction.atomic():
        cost = trade.total_cost_to_buyer
        proceeds = trade.net_amount_to_seller
        tokens = int(trade.tokens_traded)
        prop = trade.property_traded

        if trade.buyer_id == trade.seller_id:
            raise TradeSettlementError('SELF_TRADE', 'You cannot buy your own listing.')

        # Lock both wallets in a stable order to avoid deadlocks.
        for user in sorted([trade.buyer, trade.seller], key=lambda u: str(u.pk)):
            WalletBalance.objects.get_or_create(
                user=user, currency='USD', defaults={'available_balance': Decimal('0.00')})
        wallets = {
            wb.user_id: wb for wb in WalletBalance.objects.select_for_update()
            .filter(user__in=[trade.buyer, trade.seller], currency='USD').order_by('user_id')
        }
        if wallets[trade.buyer_id].available_balance < cost:
            raise TradeSettlementError(
                'INSUFFICIENT_FUNDS',
                f'Insufficient wallet balance: this purchase costs ${cost:,.2f} including fees. '
                f'Add funds to your wallet and try again.',
            )

        holdings = list(
            Investment.objects.select_for_update()
            .filter(user=trade.seller, property_investment=prop, status=InvestmentStatus.COMPLETED,
                    token_amount__gt=0)
            .order_by('completed_at', 'created_at')
        )
        if sum(h.token_amount for h in holdings) < tokens:
            raise TradeSettlementError(
                'SELLER_SHARES_UNAVAILABLE',
                'The seller no longer holds enough shares for this listing.',
            )

        reference = trade.id
        WalletBalance.debit(
            trade.buyer, cost, transaction_type='trade_purchase', reference_id=reference,
            description=f'Secondary market purchase: {tokens} shares of {prop.title}',
        )
        WalletBalance.credit(
            trade.seller, proceeds, transaction_type='trade_sale', reference_id=reference,
            description=f'Secondary market sale: {tokens} shares of {prop.title}',
        )

        # Move the shares (oldest holdings first). The cost basis moves with them.
        remaining = tokens
        for h in holdings:
            if remaining <= 0:
                break
            take = min(remaining, h.token_amount)
            if take == h.token_amount:
                # Fully sold: keep the original purchase as history; a
                # TRANSFERRED holding no longer counts as owned.
                h.status = InvestmentStatus.TRANSFERRED
                h.save(update_fields=['status', 'updated_at'])
            else:
                basis = (h.investment_amount * Decimal(take) / Decimal(h.token_amount)).quantize(CENT)
                h.token_amount -= take
                h.investment_amount = max(Decimal('0.00'), (h.investment_amount - basis).quantize(CENT))
                h.save(update_fields=['token_amount', 'investment_amount', 'updated_at'])
            remaining -= take

        now = timezone.now()
        Investment.objects.create(
            user=trade.buyer,
            property_investment=prop,
            token_amount=tokens,
            investment_amount=trade.total_amount,
            status=InvestmentStatus.COMPLETED,
            completed_at=now,
            payment_method={'type': 'secondary_market', 'trade_id': str(trade.id),
                            'price_per_token': str(trade.price_per_token)},
        )

        trade.status = TransactionStatus.COMPLETED
        trade.processed_at = trade.processed_at or now
        trade.completed_at = now
        trade.payment_method = {**(trade.payment_method or {}), 'type': 'wallet', 'settled': 'ledger'}
        trade.save(update_fields=['status', 'processed_at', 'completed_at', 'payment_method'])

    _notify(trade)


def _notify(trade) -> None:
    try:
        from notifications.services import NotificationService
        title = trade.property_traded.title
        NotificationService.create_notification(
            user=trade.buyer,
            title='Purchase completed',
            message=f'You bought {trade.tokens_traded} shares of {title} for ${trade.total_cost_to_buyer:,.2f}.',
            notification_type='investment',
        )
        NotificationService.create_notification(
            user=trade.seller,
            title='Shares sold',
            message=f'{trade.tokens_traded} shares of {title} were sold. ${trade.net_amount_to_seller:,.2f} '
                    f'was added to your wallet.',
            notification_type='investment',
        )
    except Exception:  # noqa: BLE001 — notifications must never undo a settled trade
        logger.warning('Trade %s settled but notification failed', trade.id, exc_info=True)
