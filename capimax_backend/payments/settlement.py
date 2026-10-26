"""
One way to settle a payment (client round 3, #14).

Every provider path (Stripe confirm + webhook, NOWPayments IPN + status
poll, Pronova, bank transfer / Nova Sukuk review) used to complete payments
on its own, and the card and crypto paths credited the buyer's wallet even
when the payment was for an investment — the buyer got the shares AND the
money back as wallet balance. They all go through :func:`settle_payment`
now:

  * the Payment row is locked and settled exactly once;
  * a payment for an investment confirms that investment and never touches
    the wallet;
  * a payment without an investment is a wallet top-up and credits the
    wallet (with a ledger row and the funds email).
"""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Optional

from django.db import transaction
from django.db.models import F
from django.utils import timezone

logger = logging.getLogger(__name__)

# Investment statuses that mean "payment already applied".
SETTLED_INVESTMENT_STATUSES = ('payment_confirmed', 'pending_mint', 'minting', 'completed')

METHOD_LABELS = {
    'credit_card': 'Credit Card',
    'cryptocurrency': 'Cryptocurrency',
    'bank_transfer': 'Bank Transfer',
    'nova_sukuk': 'Nova Sukuk',
    'pronova': 'Pronova',
    'wallet': 'Wallet',
    'paypal': 'PayPal',
}


def investment_for(payment):
    """The investment a payment pays for (FK, or the id kept in metadata)."""
    if payment.investment_id:
        return payment.investment
    inv_id = (payment.metadata or {}).get('investment_id')
    if inv_id:
        from investments.models import Investment
        return Investment.objects.filter(pk=inv_id, user=payment.user).first()
    return None


def settle_payment(payment_or_id, *, external_id: Optional[str] = None,
                   transaction_hash: Optional[str] = None, mint: bool = False,
                   source: str = '') -> bool:
    """
    Complete a payment and apply it. Returns True if this call settled it,
    False if it was already completed (idempotent — webhooks, polling and
    retries can all call it safely).

    ``mint=True`` hands a linked investment to the token minter
    (PENDING_MINT, the card flow); otherwise the investment is completed
    directly through InvestmentProcessingService (the other flows).
    """
    from .models import Payment, PaymentStatus

    pk = getattr(payment_or_id, 'pk', payment_or_id)
    with transaction.atomic():
        payment = Payment.objects.select_for_update().get(pk=pk)
        if payment.status == PaymentStatus.COMPLETED:
            return False

        payment.status = PaymentStatus.COMPLETED
        payment.completed_at = timezone.now()
        fields = ['status', 'completed_at', 'updated_at']
        if external_id:
            payment.external_transaction_id = external_id
            fields.append('external_transaction_id')
        if transaction_hash:
            payment.transaction_hash = transaction_hash
            fields.append('transaction_hash')
        meta = dict(payment.metadata or {})
        meta['settled_by'] = source or meta.get('settled_by', '')
        payment.metadata = meta
        fields.append('metadata')
        payment.save(update_fields=fields)

        investment = investment_for(payment)
        if investment is not None:
            _apply_to_investment(investment, payment, mint=mint)
        else:
            _credit_wallet(payment)

    logger.info('Payment %s settled (%s)', payment.pk, source or 'unspecified')
    return True


def _apply_to_investment(investment, payment, *, mint: bool) -> None:
    from investments.models import Investment
    from investments.services import InvestmentProcessingService
    from properties.models import Property

    investment = Investment.objects.select_for_update().get(pk=investment.pk)
    if investment.status in SETTLED_INVESTMENT_STATUSES:
        logger.info('Investment %s already confirmed (%s)', investment.pk, investment.status)
        return
    if investment.status in ('expired', 'cancelled', 'failed'):
        # Paid after the shares were released (PropShare model): re-take them
        # if still free at the same price, otherwise refund to the wallet.
        from investments.purchase import late_payment
        outcome = late_payment(investment, payment)
        logger.info('Late payment %s for investment %s: %s', payment.pk, investment.pk, outcome)
        return
    # The shares held for this purchase become sold shares.
    investment.reservations.filter(released=False).update(released=True)
    if mint:
        Property.objects.filter(pk=investment.property_investment_id).update(
            tokens_sold=F('tokens_sold') + investment.token_amount)
        investment.mark_payment_confirmed()
    else:
        InvestmentProcessingService.process_investment(investment, payment)


def _credit_wallet(payment) -> None:
    from .models import WalletBalance

    WalletBalance.objects.get_or_create(
        user=payment.user, currency=payment.currency,
        defaults={'available_balance': Decimal('0.00')})
    locked = WalletBalance.objects.select_for_update().get(user=payment.user, currency=payment.currency)
    before = locked.available_balance
    method = METHOD_LABELS.get(payment.payment_method, payment.payment_method)
    wb = WalletBalance.credit(
        payment.user, payment.net_amount, currency=payment.currency,
        transaction_type='deposit', reference_id=payment.id,
        description=f'Wallet deposit via {method}',
    )
    try:
        from core.services.email_service import EmailService
        EmailService.send_funds_notification_email(
            user=payment.user,
            transaction_details={
                'type': 'Deposit',
                'amount': str(payment.net_amount),
                'transaction_id': str(payment.id),
                'payment_method': method,
                'status': 'Confirmed',
                'previous_balance': str(before),
                'new_balance': str(wb.available_balance),
                'id': payment.id,
            },
        )
    except Exception:  # noqa: BLE001 — the credit stands even if the email fails
        logger.warning('Deposit %s credited but email failed', payment.pk, exc_info=True)


def check_payable_investment(user, investment_id, amount):
    """
    Validate the investment a new card/crypto payment is for: it must be the
    payer's own, still awaiting payment, and the amount must cover it.
    Returns an error message, or None when the payment may be created.
    """
    if not investment_id:
        return None
    from investments.models import Investment
    try:
        investment = Investment.objects.get(pk=investment_id)
    except (Investment.DoesNotExist, ValueError, TypeError):
        return 'Investment not found.'
    if investment.user_id != user.pk:
        return 'Investment not found.'
    if investment.status not in ('pending', 'processing'):
        return 'This investment is not awaiting payment.'
    if Decimal(str(amount)) + Decimal('0.01') < investment.investment_amount:
        return f'The amount must be at least ${investment.investment_amount:,.2f} for this investment.'
    return None
