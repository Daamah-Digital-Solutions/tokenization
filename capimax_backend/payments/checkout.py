"""
Hosted checkout for direct payments (PropShare model).

  * Card and Pronova: a Stripe Checkout Session (Stripe shows Apple Pay /
    Google Pay on supported devices). Pronova is the same card charge with
    the Pronova discount already applied to the amount.
  * Crypto: a NOWPayments invoice (the buyer may pick the coin).

A payment is confirmed only by the provider: the signed webhook / IPN, or a
direct lookup (the return page polls; a 5-minute job reconciles). Never from
the browser redirect.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

LOOKUP_EVERY = timedelta(seconds=15)


class CheckoutError(Exception):
    def __init__(self, code: str, message: str, status: int = 502):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


def _frontend() -> str:
    return (getattr(settings, 'FRONTEND_URL', '') or 'http://localhost:5173').rstrip('/')


def _return_urls(payment) -> tuple[str, str]:
    meta = payment.metadata or {}
    base = _frontend()
    if meta.get('purpose') == 'deposit':
        return (f'{base}/wallet?payment={payment.id}&result=success',
                f'{base}/wallet?payment={payment.id}&result=cancelled')
    inv = meta.get('investment_id') or ''
    return (f'{base}/payment-return?purchase={inv}&payment={payment.id}',
            f'{base}/payment-return?purchase={inv}&payment={payment.id}&cancelled=1')


def _product_name(payment) -> str:
    meta = payment.metadata or {}
    if meta.get('purpose') == 'deposit':
        return 'Capimax RT wallet deposit'
    if payment.investment_id:
        inv = payment.investment
        return f'Capimax RT — {inv.token_amount} shares of {inv.property_investment.title}'
    return 'Capimax RT payment'


def start_checkout(payment, request=None) -> str:
    """Open the provider's payment page for a pending payment; returns its URL."""
    meta = dict(payment.metadata or {})
    if meta.get('checkout_url'):
        return meta['checkout_url']
    success_url, cancel_url = _return_urls(payment)
    if payment.payment_method in ('credit_card', 'pronova'):
        url, ref = _stripe_session(payment, success_url, cancel_url)
        meta.update({'provider': 'stripe', 'checkout_session_id': ref})
    elif payment.payment_method == 'cryptocurrency':
        url, ref = _nowpayments_invoice(payment, success_url, cancel_url, request)
        meta.update({'provider': 'nowpayments', 'invoice_id': ref})
    else:
        raise CheckoutError('INVALID_METHOD', 'This payment method has no online checkout.', 400)
    meta['checkout_url'] = url
    payment.metadata = meta
    payment.external_transaction_id = ref
    payment.save(update_fields=['metadata', 'external_transaction_id', 'updated_at'])
    return url


def _stripe_session(payment, success_url: str, cancel_url: str) -> tuple[str, str]:
    import stripe

    from .providers import stripe_configured

    if not stripe_configured():
        raise CheckoutError('PAYMENTS_NOT_CONFIGURED', 'Card payments are not available right now.', 503)
    stripe.api_key = settings.STRIPE_SECRET_KEY
    cents = int((Decimal(payment.amount) * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
    try:
        session = stripe.checkout.Session.create(
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=str(payment.id),
            customer_email=payment.user.email,
            line_items=[{
                'quantity': 1,
                'price_data': {
                    'currency': (payment.currency or 'USD').lower(),
                    'unit_amount': cents,
                    'product_data': {'name': _product_name(payment)},
                },
            }],
            metadata={'payment_id': str(payment.id)},
            payment_intent_data={'metadata': {'payment_id': str(payment.id)}},
            # Stripe's minimum is 30 minutes — the same as our share hold.
            expires_at=int((timezone.now() + timedelta(minutes=31)).timestamp()),
            idempotency_key=f'checkout-{payment.id}',
        )
    except stripe.error.StripeError as exc:
        logger.error('Stripe checkout failed for payment %s: %s', payment.id, exc)
        raise CheckoutError('PAYMENT_PROVIDER_ERROR', 'The card payment page could not be opened. Please try again.')
    return session.url, session.id


def _nowpayments_invoice(payment, success_url: str, cancel_url: str, request) -> tuple[str, str]:
    from .nowpayments_service import NOWPaymentsService
    from .providers import nowpayments_configured

    if not nowpayments_configured():
        raise CheckoutError('PAYMENTS_NOT_CONFIGURED', 'Crypto payments are not available right now.', 503)
    ipn = (request.build_absolute_uri('/api/v1/payments/nowpayments/ipn/') if request
           else f"{getattr(settings, 'BACKEND_URL', '').rstrip('/')}/api/v1/payments/nowpayments/ipn/")
    data = {
        'price_amount': str(payment.amount),
        'price_currency': (payment.currency or 'USD').lower(),
        'order_id': str(payment.id),
        'order_description': _product_name(payment),
        'ipn_callback_url': ipn,
        'success_url': success_url,
        'cancel_url': cancel_url,
    }
    coin = (payment.metadata or {}).get('pay_currency')
    if coin:
        data['pay_currency'] = str(coin).lower()
    try:
        invoice = NOWPaymentsService()._make_request('POST', 'invoice', data)
    except Exception as exc:  # noqa: BLE001
        logger.error('NOWPayments invoice failed for payment %s: %s', payment.id, exc)
        invoice = None
    if not invoice or not invoice.get('invoice_url'):
        raise CheckoutError('PAYMENT_PROVIDER_ERROR', 'The crypto payment page could not be opened. Please try again.')
    return invoice['invoice_url'], str(invoice.get('id', ''))


# ------------------------------------------------------------- confirmation
def apply_checkout_session(session_obj: dict, *, source: str) -> str:
    """
    Apply a Stripe Checkout Session (from a webhook event or a lookup).
    Returns 'succeeded' / 'failed' / 'pending' / 'ignored'.
    """
    from .models import Payment, PaymentStatus
    from .settlement import settle_payment

    payment_id = session_obj.get('client_reference_id') or (session_obj.get('metadata') or {}).get('payment_id')
    payment = Payment.objects.filter(pk=payment_id).first() if payment_id else None
    if payment is None:
        return 'ignored'
    if session_obj.get('payment_status') == 'paid':
        paid_cents = session_obj.get('amount_total')
        expected = int((Decimal(payment.amount) * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
        if paid_cents is not None and int(paid_cents) < expected:
            logger.error('Stripe session %s paid %s < expected %s', session_obj.get('id'), paid_cents, expected)
            return 'ignored'
        settle_payment(payment, external_id=session_obj.get('payment_intent') or session_obj.get('id'),
                       mint=True, source=source)
        return 'succeeded'
    if session_obj.get('status') == 'expired' and payment.status == PaymentStatus.PENDING:
        fail_payment(payment, reason='Checkout expired')
        return 'failed'
    return 'pending'


def fail_payment(payment, *, reason: str = '') -> None:
    """The provider says this payment will not be paid: release the held shares."""
    from django.db import transaction

    from investments.purchase import release_hold

    from .models import Payment, PaymentStatus

    with transaction.atomic():
        locked = Payment.objects.select_for_update().get(pk=payment.pk)
        if locked.status != PaymentStatus.PENDING:
            return
        locked.status = PaymentStatus.FAILED
        locked.metadata = {**(locked.metadata or {}), 'failure_reason': reason}
        locked.save(update_fields=['status', 'metadata', 'updated_at'])
        if locked.investment_id:
            release_hold(locked.investment, status='failed')


def refresh_from_provider(payment, *, force: bool = False) -> None:
    """Ask the provider about a pending payment (at most every 15 s per payment)."""
    meta = dict(payment.metadata or {})
    now = timezone.now()
    last = meta.get('last_lookup')
    if not force and last:
        try:
            from datetime import datetime
            if now - datetime.fromisoformat(last) < LOOKUP_EVERY:
                return
        except ValueError:
            pass
    meta['last_lookup'] = now.isoformat()
    type(payment).objects.filter(pk=payment.pk).update(metadata=meta)

    if meta.get('provider') == 'stripe' and meta.get('checkout_session_id'):
        import stripe

        from .providers import stripe_configured
        if not stripe_configured():
            return
        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            session = stripe.checkout.Session.retrieve(meta['checkout_session_id'])
        except Exception as exc:  # noqa: BLE001
            logger.warning('Stripe lookup failed for payment %s: %s', payment.id, exc)
            return
        apply_checkout_session(dict(session), source='stripe_lookup')


def reconcile_pending_card_payments(max_age_hours: int = 25) -> int:
    """5-minute job: look up card checkouts still pending (missed webhooks)."""
    from .models import Payment, PaymentStatus

    since = timezone.now() - timedelta(hours=max_age_hours)
    n = 0
    for payment in Payment.objects.filter(status=PaymentStatus.PENDING, created_at__gte=since,
                                          payment_method__in=['credit_card', 'pronova'],
                                          metadata__provider='stripe'):
        refresh_from_provider(payment, force=True)
        n += 1
    return n
