"""
Crypto payments the PropShare way (NOWPayments).

One invoice (our Payment) can receive several NOWPayments payments: the
coin chosen, a second transfer, or a deposit NOWPayments recovered. Each is
real money, so each is settled exactly once and recorded on the payment
(metadata['np'][<their payment id>]):

  * paid as asked ("finished"): the purchase is confirmed / the deposit
    credited; anything above the amount due goes to the wallet;
  * short by no more than the tolerance (admin setting: % and USD cap):
    the purchase still goes through, the platform bearing the difference;
  * clearly short / an extra deposit: what it is worth goes to the wallet,
    and a purchase it was meant for releases its shares (buy from the
    wallet instead);
  * money that cannot be valued: nothing is credited and staff are alerted.

Crypto is confirmed by the signed IPN only (no polling of NOWPayments).
"""

from __future__ import annotations

import logging
from datetime import timedelta
from decimal import ROUND_DOWN, Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

CENT = Decimal('0.01')
OPEN_WINDOW = timedelta(hours=24)


def _dec(value) -> Decimal | None:
    if value in (None, ''):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


def short_tolerance(amount_due: Decimal) -> Decimal:
    """How much less than the amount due a crypto payment may be worth and still buy."""
    from .models import PlatformFeeSettings

    fees = PlatformFeeSettings.current()
    pct = Decimal(fees.crypto_short_tolerance_pct)
    cap = Decimal(fees.crypto_short_tolerance_max)
    if pct <= 0 or cap <= 0:
        return Decimal('0.00')
    return min(Decimal(amount_due) * pct / 100, cap).quantize(CENT, rounding=ROUND_DOWN)


def value_of(ipn: dict) -> Decimal | None:
    """USD value of what arrived in this notification."""
    direct = _dec(ipn.get('actually_paid_at_fiat'))
    if direct is not None and direct > 0:
        return direct.quantize(CENT)
    paid, asked, price = _dec(ipn.get('actually_paid')), _dec(ipn.get('pay_amount')), _dec(ipn.get('price_amount'))
    if paid is not None and asked and price and asked > 0:
        return (price * paid / asked).quantize(CENT)
    return None


def _alert_staff(payment, message: str) -> None:
    logger.error('Crypto payment %s needs review: %s', payment.pk, message)
    try:
        from support.notify import _send, support_inbox
        _send(support_inbox(), f'[Crypto review] payment {payment.pk}', message)
    except Exception:  # noqa: BLE001
        pass


def settle_ipn(payment, ipn: dict) -> str:
    """Apply one verified NOWPayments notification. Returns what was done."""
    from investments.purchase import release_hold

    from .checkout import fail_payment
    from .models import Payment, WalletBalance
    from .settlement import settle_payment

    status = str(ipn.get('payment_status') or '')
    np_id = str(ipn.get('payment_id') or ipn.get('invoice_id') or 'invoice')
    extra = bool(ipn.get('parent_payment_id'))

    with transaction.atomic():
        locked = Payment.objects.select_for_update().get(pk=payment.pk)
        meta = dict(locked.metadata or {})
        records = dict(meta.get('np') or {})
        entry = dict(records.get(np_id) or {})
        entry.update({'status': status, 'coin': ipn.get('pay_currency'), 'asked': str(ipn.get('pay_amount') or ''),
                      'received': str(ipn.get('actually_paid') or ''), 'extra': extra})
        records[np_id] = entry
        meta['np'] = records
        locked.metadata = meta
        locked.save(update_fields=['metadata', 'updated_at'])

        if entry.get('credited') is not None:
            return 'duplicate'

        if status in ('failed', 'expired', 'refunded'):
            if extra or locked.status != 'pending':
                return 'ignored'
            fail_payment(locked, reason=f'Crypto payment {status}')
            return 'failed'

        if status not in ('finished', 'partially_paid'):
            return 'pending'  # waiting / confirming / sending

        value = value_of(ipn)
        due = Decimal(locked.amount)
        if status == 'finished' and not extra and locked.status == 'pending':
            if value is None:
                value = due
            settle_payment(locked, external_id=np_id, transaction_hash=ipn.get('tx_hash') or None,
                           source='nowpayments_ipn')
            extra_value = (value - due).quantize(CENT)
            _record(locked, np_id, value)
            if extra_value > Decimal('0.50'):
                WalletBalance.credit(locked.user, extra_value, transaction_type='deposit', reference_id=locked.id,
                                     description='Crypto overpayment credited to your wallet')
            return 'completed'

        if value is None or value <= 0:
            if not entry.get('review'):
                records[np_id]['review'] = True
                Payment.objects.filter(pk=locked.pk).update(metadata={**meta, 'np': records})
                _alert_staff(locked, f'Received {ipn.get("actually_paid")} {ipn.get("pay_currency")} '
                                     'that could not be valued.')
            return 'review'

        is_purchase = bool(locked.investment_id) and (meta.get('purpose') in ('investment', 'installment', None))
        if is_purchase and locked.status == 'pending' and not extra:
            if value >= due - short_tolerance(due):
                settle_payment(locked, external_id=np_id, transaction_hash=ipn.get('tx_hash') or None,
                               source='nowpayments_ipn_tolerance')
                _record(locked, np_id, value)
                if value > due:
                    WalletBalance.credit(locked.user, (value - due).quantize(CENT), transaction_type='deposit',
                                         reference_id=locked.id, description='Crypto overpayment credited to your wallet')
                return 'completed'
            # Clearly short: the purchase is not completed; the shares go back on sale.
            locked.status = 'failed'
            locked.metadata = {**(locked.metadata or {}), 'failure_reason': 'Crypto payment arrived short'}
            locked.save(update_fields=['status', 'metadata', 'updated_at'])
            release_hold(locked.investment, status='failed')

        if not is_purchase and locked.status == 'pending' and not extra:
            # A wallet deposit that arrived short: what arrived is the deposit.
            locked.status = 'completed'
            locked.completed_at = timezone.now()
            locked.save(update_fields=['status', 'completed_at', 'updated_at'])
        WalletBalance.credit(locked.user, value, transaction_type='deposit', reference_id=locked.id,
                             description=f'Crypto received ({ipn.get("pay_currency") or "crypto"}) credited to your wallet')
        _record(locked, np_id, value)
        return 'credited'


def _record(payment, np_id: str, value: Decimal) -> None:
    from .models import Payment

    p = Payment.objects.get(pk=payment.pk)
    meta = dict(p.metadata or {})
    records = dict(meta.get('np') or {})
    records.setdefault(np_id, {})['credited'] = str(value)
    meta['np'] = records
    Payment.objects.filter(pk=p.pk).update(metadata=meta)


def open_payments(user) -> list:
    """Crypto payments still open (last 24 h) — shown on the wallet page to finish them."""
    from .models import Payment

    since = timezone.now() - OPEN_WINDOW
    out = []
    for p in Payment.objects.filter(user=user, payment_method='cryptocurrency', status='pending',
                                    created_at__gte=since).order_by('-created_at'):
        meta = p.metadata or {}
        if not meta.get('checkout_url'):
            continue
        out.append({'payment_id': str(p.id), 'amount': str(p.amount), 'purpose': meta.get('purpose', 'deposit'),
                    'coin': meta.get('pay_currency'), 'checkout_url': meta['checkout_url'],
                    'created_at': p.created_at.isoformat(),
                    'property_title': p.investment.property_investment.title if p.investment_id else None})
    return out
