"""
Withdrawals the PropShare way (manual desk).

  * A member withdraws only to one of their SAVED payout accounts (bank or
    crypto). The account is copied onto the request, so the desk still sees
    where to pay if the member deletes it later.
  * Asking holds the money at once (available -> locked) and writes the
    ledger row; a replayed request (same Idempotency-Key) returns the first
    one, never a second hold.
  * The team pays by hand and closes it on the desk: processing (transfer
    started) -> PAID with the transfer number / transaction hash, or FAILED
    with the reason — the amount goes back to the wallet, exactly once.
  * The member is told at each step; the team is told when a request arrives.
"""

from __future__ import annotations

import logging
import secrets
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

CENT = Decimal('0.01')
MIN_AMOUNT = Decimal('10.00')
_REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  # no 0/O or 1/I: reads back over the phone

OPEN_STATUSES = ('pending', 'approved', 'processing')


class WithdrawalError(Exception):
    def __init__(self, code: str, message: str, status: int = 400):
        super().__init__(message)
        self.code, self.message, self.status = code, message, status


def _new_reference() -> str:
    from .models import BankWithdrawalRequest

    for _ in range(5):
        ref = 'WD-' + ''.join(secrets.choice(_REF_ALPHABET) for _ in range(10))
        if not BankWithdrawalRequest.objects.filter(reference=ref).exists():
            return ref
    raise WithdrawalError('REFERENCE_UNAVAILABLE', 'Please try again.', 503)


def _notify(user, title: str, message: str) -> None:
    try:
        from notifications.services import NotificationService
        NotificationService.create_notification(user=user, title=title, message=message,
                                                notification_type='payment', priority='high',
                                                send_email=True, send_real_time=True)
    except Exception:  # noqa: BLE001 — never block a money step on a notice
        logger.exception('Withdrawal notice failed for %s', user)


def _desk_link(wd) -> str:
    from django.conf import settings
    from django.urls import reverse
    base = (getattr(settings, 'BACKEND_URL', '') or getattr(settings, 'FRONTEND_URL', '') or '').rstrip('/')
    return base + reverse('admin:payments_withdrawal_desk', args=[wd.pk])


def _tell_staff(wd) -> None:
    """A request waits for the team: in-app notice for every admin, an email to the support inbox."""
    subject = f'[Withdrawal] {wd.reference} — ${wd.amount} {wd.withdrawal_method}'
    body = (f'{wd.user.email} asked for a ${wd.amount} {wd.withdrawal_method} withdrawal, {wd.reference}, '
            f'to {wd.destination_label}.\n\nPay it and close it in the admin panel (Withdrawals desk): '
            f'{_desk_link(wd)}')
    try:
        from django.db.models import Q

        from accounts.models import User
        from notifications.services import NotificationService
        for admin in User.objects.filter(Q(role='admin') | Q(is_staff=True), is_active=True):
            NotificationService.create_notification(
                user=admin, title=f'Withdrawal {wd.reference} waiting',
                message=f'{wd.user.email}: ${wd.amount} by {wd.withdrawal_method} to {wd.destination_label}.',
                notification_type='payment', priority='high', send_email=False)
        from support.notify import _send, support_inbox
        _send(support_inbox(), subject, body)
    except Exception:  # noqa: BLE001
        logger.exception('Withdrawal notice to staff failed (%s)', wd.pk)


def request_withdrawal(user, *, payout_account_id, amount, idempotency_key: str | None = None, notes: str = ''):
    """Hold the amount and open a request to a saved account. Returns the request."""
    from .models import BankWithdrawalRequest, PayoutAccount, WalletBalance, WalletTransaction

    if idempotency_key:
        existing = BankWithdrawalRequest.objects.filter(idempotency_key=idempotency_key, user=user).first()
        if existing is not None:
            return existing
    account = PayoutAccount.objects.filter(pk=payout_account_id, user=user).first() if payout_account_id else None
    if account is None:
        raise WithdrawalError('ACCOUNT_REQUIRED', 'Choose one of your saved accounts.', 422)
    try:
        amount = Decimal(str(amount)).quantize(CENT)
    except (InvalidOperation, TypeError, ValueError):
        raise WithdrawalError('INVALID_AMOUNT', 'Enter an amount.', 422)
    if amount < MIN_AMOUNT:
        raise WithdrawalError('AMOUNT_TOO_LOW', f'The smallest withdrawal is ${MIN_AMOUNT}.', 422)

    with transaction.atomic():
        wallet = WalletBalance.objects.select_for_update().filter(user=user, currency='USD').first()
        if wallet is None or wallet.available_balance < amount:
            available = wallet.available_balance if wallet else Decimal('0.00')
            raise WithdrawalError('INSUFFICIENT_FUNDS',
                                  f'Your available balance is ${available:,.2f}.', 409)
        before = wallet.available_balance
        wallet.available_balance -= amount
        wallet.locked_balance += amount
        wallet.save(update_fields=['available_balance', 'locked_balance', 'updated_at'])

        snap = account.snapshot()
        wd = BankWithdrawalRequest.objects.create(
            user=user, amount=amount, currency='USD', withdrawal_method=account.kind,
            reference=_new_reference(), payout_account=account, destination=snap,
            destination_label=account.label_text(), idempotency_key=idempotency_key or None,
            notes=(notes or '')[:1000],
            # the older columns keep the same data for existing screens and statements
            **{k: v for k, v in snap.items() if k in (
                'account_holder_name', 'bank_name', 'account_number', 'routing_number', 'swift_code',
                'bank_country', 'crypto_asset', 'crypto_network', 'crypto_address', 'crypto_memo')},
        )
        WalletTransaction.objects.create(
            user=user, transaction_type='withdrawal', amount=-amount, currency='USD',
            balance_before=before, balance_after=wallet.available_balance, reference_id=wd.id,
            description=f'Withdrawal {wd.reference} to {wd.destination_label} — waiting for our team',
        )

    _notify(user, 'Withdrawal request received',
            f'We received your request {wd.reference} to withdraw ${amount:,.2f} to {wd.destination_label}. '
            'The amount is held in your wallet until our team sends it.')
    _tell_staff(wd)
    return wd


def _locked(pk):
    from .models import BankWithdrawalRequest
    return BankWithdrawalRequest.objects.select_for_update().select_related('user').get(pk=pk)


def mark_processing(wd, by=None):
    with transaction.atomic():
        w = _locked(wd.pk)
        if w.status not in ('pending', 'approved'):
            raise WithdrawalError('INVALID_STATE', f'{w.reference or w.pk} is {w.status}.', 409)
        w.status = 'processing'
        w.reviewed_by = by or w.reviewed_by
        w.reviewed_at = w.reviewed_at or timezone.now()
        w.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])
    _notify(w.user, 'Your withdrawal is on its way',
            f'Our team started the transfer of ${w.amount:,.2f} to {w.destination_label or w.bank_name} '
            f'({w.reference}).')
    return w


def mark_paid(wd, transfer_reference: str, by=None):
    from .models import WalletBalance

    transfer_reference = (transfer_reference or '').strip()
    if len(transfer_reference) < 3:
        raise WithdrawalError('REFERENCE_REQUIRED', 'Enter the bank transfer number or transaction hash.', 422)
    with transaction.atomic():
        w = _locked(wd.pk)
        if w.status not in OPEN_STATUSES:
            raise WithdrawalError('INVALID_STATE', f'{w.reference or w.pk} is {w.status}.', 409)
        wallet = WalletBalance.objects.select_for_update().filter(user=w.user, currency=w.currency).first()
        if wallet is not None:
            wallet.locked_balance = max(wallet.locked_balance - w.amount, Decimal('0.00'))
            wallet.save(update_fields=['locked_balance', 'updated_at'])
        w.status = 'completed'
        w.transfer_reference = transfer_reference[:200]
        w.completed_at = timezone.now()
        w.reviewed_by = by or w.reviewed_by
        w.reviewed_at = w.reviewed_at or w.completed_at
        w.save(update_fields=['status', 'transfer_reference', 'completed_at', 'reviewed_by', 'reviewed_at',
                              'updated_at'])
    _notify(w.user, 'Withdrawal sent',
            f'${w.amount:,.2f} was sent to {w.destination_label or w.bank_name} ({w.reference}). '
            f'Transfer reference: {w.transfer_reference}.')
    return w


def mark_failed(wd, reason: str, by=None):
    """Not sent: the held amount goes back to the member's wallet (once)."""
    from .models import WalletBalance

    reason = (reason or '').strip()
    if len(reason) < 3:
        raise WithdrawalError('REASON_REQUIRED', 'Say why it was not sent — the member reads it.', 422)
    with transaction.atomic():
        w = _locked(wd.pk)
        if w.status not in OPEN_STATUSES:
            raise WithdrawalError('INVALID_STATE', f'{w.reference or w.pk} is {w.status}.', 409)
        wallet = WalletBalance.objects.select_for_update().filter(user=w.user, currency=w.currency).first()
        if wallet is not None:
            wallet.locked_balance = max(wallet.locked_balance - w.amount, Decimal('0.00'))
            wallet.save(update_fields=['locked_balance', 'updated_at'])
        WalletBalance.credit(w.user, w.amount, currency=w.currency, transaction_type='refund', reference_id=w.id,
                             description=f'Withdrawal {w.reference or str(w.pk)[:8]} not sent — returned to your wallet')
        w.status = 'rejected'
        w.failure_reason = reason[:1000]
        w.review_note = w.failure_reason
        w.reviewed_by = by or w.reviewed_by
        w.reviewed_at = timezone.now()
        w.save(update_fields=['status', 'failure_reason', 'review_note', 'reviewed_by', 'reviewed_at',
                              'updated_at'])
    _notify(w.user, 'Withdrawal not sent',
            f'Your withdrawal {w.reference or ""} of ${w.amount:,.2f} was not sent: {w.failure_reason} '
            'The amount is back in your wallet.')
    return w
