"""
A refund made at the provider (Stripe dashboard, charge.refunded) reaches the
platform here. Hosted-checkout payments keep the payment intent in
external_transaction_id and their id in the charge metadata, so looking only at
payment_intent_id found nothing and the refund was never recorded: the member
kept the wallet credit of money that had gone back to their card.

  * The Stripe account is shared with other Capimax platforms: a charge that is
    not ours is ignored.
  * Applied by amount, so replays and partial refunds count once.
  * A wallet deposit gives back what was credited. Anything else (shares, an
    installment plan) needs a person: tokens may be on chain and shares sold,
    so the team is alerted instead of guessing.
"""

from __future__ import annotations

import logging
import uuid
from decimal import Decimal

from django.db import transaction
from django.db.models import Q

logger = logging.getLogger(__name__)

CENT = Decimal('0.01')


def find_payment(charge: dict):
    """The platform payment of a Stripe charge, or None when it is not ours."""
    from .models import Payment

    intent = charge.get('payment_intent')
    if intent:
        payment = Payment.objects.filter(Q(payment_intent_id=intent) | Q(external_transaction_id=intent)).first()
        if payment is not None:
            return payment
    payment_id = (charge.get('metadata') or {}).get('payment_id')
    try:
        return Payment.objects.filter(pk=uuid.UUID(str(payment_id))).first() if payment_id else None
    except ValueError:
        return None


def _alert_team(subject: str, body: str) -> None:
    from support.notify import _send, support_inbox

    transaction.on_commit(lambda: _send(support_inbox(), subject, body))


def _notify_member(user, amount: Decimal) -> None:
    def send():
        try:
            from notifications.services import NotificationService
            NotificationService.create_notification(
                user=user, title='Deposit refunded',
                message=f'${amount:,.2f} of your wallet deposit was refunded to your card, '
                        'and your wallet balance was updated.',
                notification_type='payment', priority='high', send_email=True)
        except Exception:  # noqa: BLE001 — a notice never blocks a money step
            logger.exception('Refund notice failed for %s', user)
    transaction.on_commit(send)


def apply_provider_refund(charge: dict) -> str:
    """
    Apply a charge.refunded event. Returns 'ignored' (not ours), 'duplicate'
    (already counted), 'wallet', 'review' (the team was alerted) or 'recorded'.
    """
    from .models import Payment, PaymentStatus, WalletBalance
    from .settlement import investment_for

    found = find_payment(charge)
    if found is None:
        logger.info('Refund for a charge that is not ours: %s', charge.get('id'))
        return 'ignored'

    with transaction.atomic():
        payment = Payment.objects.select_for_update().get(pk=found.pk)
        meta = dict(payment.metadata or {})
        already = Decimal(meta.get('refunded_amount') or '0')
        total = min(Decimal(charge.get('amount_refunded') or 0) / 100, Decimal(payment.amount)).quantize(CENT)
        delta = total - already
        if delta <= 0:
            return 'duplicate'

        was_completed = payment.status == PaymentStatus.COMPLETED
        full = total >= Decimal(payment.amount)
        meta['refunded_amount'] = str(total)
        payment.metadata = meta
        fields = ['metadata', 'updated_at']
        if full:
            payment.status = PaymentStatus.REFUNDED
            fields.append('status')
        payment.save(update_fields=fields)

        label = f'payment {payment.pk} of {payment.user.email}'
        investment = investment_for(payment)
        if investment is not None:
            if full:
                investment.status = 'refunded'
                investment.save(update_fields=['status'])
            _alert_team(f'[Refund] Shares to review — ${delta:,.2f}',
                        f'Stripe refunded ${delta:,.2f} of {label} for investment {investment.pk} '
                        f'({investment.token_amount} shares of {investment.property_investment.title}).\n\n'
                        'The shares and any tokens on chain were NOT moved: please review them.')
            return 'review'

        if meta.get('purpose') == 'installment_start':
            _alert_team(f'[Refund] Installment plan to review — ${delta:,.2f}',
                        f'Stripe refunded ${delta:,.2f} of {label}, the first payment of installment plan '
                        f'{meta.get("installment_id")}.\n\nThe plan was NOT changed: please review it.')
            return 'review'

        if not was_completed:
            return 'recorded'  # nothing was credited for it

        WalletBalance.objects.get_or_create(user=payment.user, currency=payment.currency,
                                            defaults={'available_balance': Decimal('0.00')})
        wallet = WalletBalance.objects.select_for_update().get(user=payment.user, currency=payment.currency)
        taken = min(wallet.available_balance, delta)
        if taken > 0:
            WalletBalance.debit(payment.user, taken, currency=payment.currency, transaction_type='refund',
                                reference_id=payment.pk, description='Wallet deposit refunded to your card')
            _notify_member(payment.user, taken)
        if taken < delta:
            _alert_team(f'[Refund] Member owes ${delta - taken:,.2f}',
                        f'Stripe refunded ${delta:,.2f} of {label}, a wallet deposit, but the wallet only held '
                        f'${taken:,.2f}: the rest was already spent.\n\nThe member still has that money from us: '
                        'please review the account.')
            return 'review'
        return 'wallet'
