"""
Secondary-market trade settlement (client round 3, #14 / #21).

A matched trade used to be parked "in escrow" forever: the buyer was never
charged, the seller never paid and the shares never changed hands. Trades
now settle instantly on the platform ledger, in one database transaction:

  * the buyer's wallet is debited the price, and the resale fee as its own
    line (PropShare model: the buyer pays it, admin setting, 1% by default);
  * the seller's wallet is credited the full price;
  * the shares move from the seller's completed investments (oldest first)
    to a new completed investment for the buyer.

The tokens are then moved on-chain, from the seller's custodial wallet to
the buyer's, by marketplace/chain_transfer.py (queued after commit, retried
by the reconcile job); the trade's ``chain_status`` shows where that stands.
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


def buyer_cost(amount: Decimal) -> Decimal:
    """Price + the buyer's resale fee (mirrors TradeTransaction.calculate_fees)."""
    from payments.models import PlatformFeeSettings

    amount = Decimal(amount)
    pct = Decimal(PlatformFeeSettings.current().secondary_resale_fee_pct)
    return (amount + (amount * pct / 100).quantize(CENT)).quantize(CENT)


def seller_available_shares(seller, property_obj) -> int:
    from investments.models import Investment, InvestmentStatus
    return sum(
        Investment.objects.filter(
            user=seller, property_investment=property_obj, status=InvestmentStatus.COMPLETED,
        ).values_list('token_amount', flat=True)
    )


def _check_custody(seller, prop, tokens: int) -> None:
    """
    A tokenized property's shares move on-chain from the seller's custodial
    wallet. Shares the seller moved out to an external wallet cannot be moved
    by the platform, so they cannot be sold until they are back.
    """
    from django.db.models import Sum

    from blockchain.models import SmartContract, TokenBalance

    contract = SmartContract.objects.filter(property_reference=prop, contract_type='real_estate_token',
                                            status='active').first()
    if contract is None or not seller.wallet_address:
        return
    rows = TokenBalance.objects.filter(contract=contract, user=seller, property_reference=prop)
    custody = rows.filter(wallet_address__iexact=seller.wallet_address).aggregate(s=Sum('balance'))['s'] or 0
    outside = rows.exclude(wallet_address__iexact=seller.wallet_address).aggregate(s=Sum('balance'))['s'] or 0
    if custody < tokens and outside > 0:
        raise TradeSettlementError(
            'SHARES_NOT_IN_CUSTODY',
            "These shares are in the seller's external wallet, so they cannot be transferred right now.",
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
        _check_custody(trade.seller, prop, tokens)

        reference = trade.id
        WalletBalance.debit(
            trade.buyer, trade.total_amount, transaction_type='trade_purchase', reference_id=reference,
            description=f'Secondary market purchase: {tokens} shares of {prop.title}',
        )
        if trade.buyer_fee > 0:  # its own ledger line, like PropShare
            WalletBalance.debit(
                trade.buyer, trade.buyer_fee, transaction_type='fee', reference_id=reference,
                description=f'Resale fee ({trade.platform_fee_percentage * 100:.2f}%) — {prop.title}',
            )
        WalletBalance.credit(
            trade.seller, proceeds, transaction_type='trade_sale', reference_id=reference,
            description=f'Secondary market sale: {tokens} shares of {prop.title}',
        )

        # Move the shares (oldest holdings first). The cost basis moves with them.
        from .share_moves import move_holdings
        now = timezone.now()
        move_holdings(seller=trade.seller, buyer=trade.buyer, prop=prop, tokens=tokens,
                      buyer_cost=trade.total_amount,
                      payment_method={'type': 'secondary_market', 'trade_id': str(trade.id),
                                      'price_per_token': str(trade.price_per_token)})

        trade.status = TransactionStatus.COMPLETED
        trade.processed_at = trade.processed_at or now
        trade.completed_at = now
        trade.payment_method = {**(trade.payment_method or {}), 'type': 'wallet', 'settled': 'ledger'}
        trade.save(update_fields=['status', 'processed_at', 'completed_at', 'payment_method'])

        # Then move the tokens on-chain, seller custodial wallet -> buyer's
        # (marketplace/chain_transfer.py); the reconcile job retries it.
        transaction.on_commit(lambda: _queue_chain_transfer(trade.id))

    _notify(trade)


def _queue_chain_transfer(trade_id) -> None:
    try:
        from .tasks import transfer_trade_tokens
        transfer_trade_tokens.delay(str(trade_id))
    except Exception:  # noqa: BLE001 — the reconcile job picks it up
        logger.warning('Could not queue the on-chain transfer of trade %s', trade_id, exc_info=True)


def _notify(trade) -> None:
    try:
        from notifications.services import NotificationService
        title = trade.property_traded.title
        NotificationService.create_notification(
            user=trade.buyer,
            title='Purchase completed',
            message=f'You bought {trade.tokens_traded} shares of {title} for ${trade.total_cost_to_buyer:,.2f}. '
                    f'The shares are in My Properties and your ownership certificate is in My Certificates.',
            notification_type='investment',
            action_url='/dashboard?view=my-properties',
            action_label='My Properties',
            send_email=True,  # client round 4, #16: sales and purchases are emailed
        )
        NotificationService.create_notification(
            user=trade.seller,
            title='Shares sold',
            message=f'{trade.tokens_traded} shares of {title} were sold. ${trade.net_amount_to_seller:,.2f} '
                    f'was added to your wallet.',
            notification_type='investment',
            action_url='/dashboard?view=wallet',
            action_label='My Wallet',
            send_email=True,
        )
    except Exception:  # noqa: BLE001 — notifications must never undo a settled trade
        logger.warning('Trade %s settled but notification failed', trade.id, exc_info=True)
