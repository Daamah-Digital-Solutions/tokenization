"""
Selling shares to a liquidity provider (client round 4, #13).

  1. The investor asks an active LP to buy N shares of a property at a price
     (ExitRequest, pending). The shares are set aside: they cannot be listed
     on the market or offered to another LP meanwhile.
  2. The LP offers a price (approved, 48 h to answer) or declines.
  3. The investor accepts: everything settles at once, like a market trade —
     the LP's wallet pays the price plus the resale fee (its own ledger line),
     the investor's wallet receives the full price, the shares move from the
     investor's holdings to a new holding of the LP's account, and the tokens
     then move on-chain (marketplace/chain_transfer.py, retried until done).
"""

from __future__ import annotations

import logging
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

CENT = Decimal('0.01')


class ExitSettlementError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def resale_fee(amount: Decimal) -> Decimal:
    from payments.models import PlatformFeeSettings

    pct = Decimal(PlatformFeeSettings.current().secondary_resale_fee_pct)
    return (Decimal(amount) * pct / 100).quantize(CENT)


def lp_can_pay(lp, amount: Decimal) -> bool:
    from payments.models import WalletBalance

    if lp.user_id is None:
        return False
    wb = WalletBalance.objects.filter(user=lp.user, currency='USD').first()
    return bool(wb) and wb.available_balance >= Decimal(amount) + resale_fee(amount)


def settle_exit(exit_request):
    """The investor accepted the LP's offer. Returns the LiquidityTransaction. Raises ExitSettlementError."""
    from marketplace.settlement import TradeSettlementError, _check_custody
    from marketplace.share_moves import ShareMoveError, held_shares, move_holdings
    from payments.models import WalletBalance

    from .models import ExitRequest, ExitRequestStatus, LiquidityTransaction

    with transaction.atomic():
        er = ExitRequest.objects.select_for_update().select_related(
            'liquidity_provider__user', 'investor', 'investment__property_investment').get(pk=exit_request.pk)
        if er.status != ExitRequestStatus.APPROVED or er.offered_price_per_unit is None:
            raise ExitSettlementError('NO_OFFER', 'There is no offer to accept.')
        if er.expires_at and er.expires_at < timezone.now():
            er.status = ExitRequestStatus.EXPIRED
            er.save(update_fields=['status', 'updated_at'])
            raise ExitSettlementError('OFFER_EXPIRED', 'The offer has expired.')

        lp = er.liquidity_provider
        buyer, seller = lp.user, er.investor
        if buyer is None:
            raise ExitSettlementError('LP_NOT_LINKED', 'The liquidity provider has no active account yet.')
        prop = er.investment.property_investment
        units = int(er.units_requested)
        total = (Decimal(er.offered_price_per_unit) * units).quantize(CENT)
        fee = resale_fee(total)

        if not lp.check_monthly_limit(total):
            raise ExitSettlementError('LP_LIMIT', 'The liquidity provider has reached its monthly limit.')

        for user in sorted([buyer, seller], key=lambda u: str(u.pk)):
            WalletBalance.objects.get_or_create(user=user, currency='USD',
                                                defaults={'available_balance': Decimal('0.00')})
        wallets = {wb.user_id: wb for wb in WalletBalance.objects.select_for_update()
                   .filter(user__in=[buyer, seller], currency='USD').order_by('user_id')}
        if wallets[buyer.pk].available_balance < total + fee:
            raise ExitSettlementError('LP_INSUFFICIENT_FUNDS',
                                      'The liquidity provider does not have enough funds right now. '
                                      'Try again later or contact support.')
        if held_shares(seller, prop) < units:
            raise ExitSettlementError('SHARES_UNAVAILABLE', 'You no longer hold enough shares for this sale.')
        try:
            _check_custody(seller, prop, units)
        except TradeSettlementError as exc:
            raise ExitSettlementError(exc.code, exc.message) from exc

        ref = er.pk
        WalletBalance.debit(buyer, total, transaction_type='trade_purchase', reference_id=ref,
                            description=f'Liquidity purchase: {units} shares of {prop.title}')
        if fee > 0:
            WalletBalance.debit(buyer, fee, transaction_type='fee', reference_id=ref,
                                description=f'Resale fee — {prop.title}')
        WalletBalance.credit(seller, total, transaction_type='trade_sale', reference_id=ref,
                             description=f'Sold to liquidity provider: {units} shares of {prop.title}')
        try:
            move_holdings(seller=seller, buyer=buyer, prop=prop, tokens=units, buyer_cost=total,
                          payment_method={'type': 'liquidity_exit', 'exit_id': str(er.pk),
                                          'price_per_token': str(er.offered_price_per_unit)})
        except ShareMoveError as exc:
            raise ExitSettlementError(exc.code, exc.message) from exc

        now = timezone.now()
        tx = LiquidityTransaction.objects.create(
            exit_request=er, liquidity_provider=lp, investor=seller, units_purchased=units,
            price_per_unit=er.offered_price_per_unit, total_amount=total, platform_fee=fee,
            net_amount_to_investor=total)
        er.status = ExitRequestStatus.COMPLETED
        er.investor_accepted_offer = True
        er.investor_response_at = now
        er.save(update_fields=['status', 'investor_accepted_offer', 'investor_response_at', 'updated_at'])
        lp.current_month_total = (lp.current_month_total or 0) + total
        lp.save(update_fields=['current_month_total'])
        transaction.on_commit(lambda: _queue_chain_transfer(tx.pk))

    _notify(tx)
    return tx


def _queue_chain_transfer(tx_id) -> None:
    try:
        from .tasks import transfer_lp_tokens
        transfer_lp_tokens.delay(str(tx_id))
    except Exception:  # noqa: BLE001 — the reconcile job picks it up
        logger.warning('Could not queue the on-chain transfer of LP sale %s', tx_id, exc_info=True)


def notify(user, title: str, message: str) -> None:
    try:
        from notifications.services import NotificationService
        NotificationService.create_notification(user=user, title=title, message=message,
                                                notification_type='investment', send_email=True)
    except Exception:  # noqa: BLE001 — a notice never undoes a settlement
        logger.warning('LP notification failed (%s)', title, exc_info=True)


def _notify(tx) -> None:
    prop = tx.exit_request.investment.property_investment.title
    notify(tx.investor, 'Shares sold to a liquidity provider',
           f'{tx.units_purchased} shares of {prop} were sold to {tx.liquidity_provider.legal_entity_name} for '
           f'${tx.total_amount:,.2f}. The amount was added to your wallet. Reference {tx.reference_number}.')
    notify(tx.liquidity_provider.user, 'Exit purchase completed',
           f'You bought {tx.units_purchased} shares of {prop} for ${tx.total_amount:,.2f} '
           f'(+ ${tx.platform_fee:,.2f} fee). Reference {tx.reference_number}.')
