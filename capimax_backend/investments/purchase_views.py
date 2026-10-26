"""
Unified purchase API (PropShare model) — mounted at /api/v1/purchases/.

  GET  methods/                 the payment-method list (same on every property) + fees
  POST quote/                   price an amount for a method (nothing is held)
  POST                          buy (Idempotency-Key header recommended)
  GET  <investment_id>/         the purchase status (polled by the payment return page)
"""

from types import SimpleNamespace

from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils import create_error_response, create_success_response

from .purchase import PurchaseError, create_purchase, quote_for


def _error(exc: PurchaseError) -> Response:
    body = create_error_response(exc.message, status_code=exc.status, details=exc.details)
    body['error']['code'] = exc.code
    return Response(body, status=exc.status)


def _purchase_dict(inv, payment=None) -> dict:
    return {
        'investment_id': str(inv.id),
        'status': inv.status,
        'method': inv.purchase_method,
        'property_id': str(inv.property_investment_id),
        'property_title': inv.property_investment.title,
        'shares': inv.token_amount,
        'unit_price': str(inv.unit_price_snapshot) if inv.unit_price_snapshot is not None else None,
        'subtotal': str(inv.investment_amount),
        'platform_fee': str(inv.platform_fee_amount),
        'total': str(inv.total_charged) if inv.total_charged is not None else None,
        'reserved_until': inv.reserved_until.isoformat() if inv.reserved_until else None,
        'payment_id': str(payment.id) if payment else None,
        'payment_status': payment.status if payment else None,
        'checkout_url': (payment.metadata or {}).get('checkout_url') if payment else None,
    }


class PaymentMethodsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from payments.models import PlatformFeeSettings
        from payments.providers import method_list

        fees = PlatformFeeSettings.current()
        return Response(create_success_response(data={
            'methods': method_list(),
            'fees': {
                'platform_fee_pct': str(fees.platform_fee_pct),
                'installment_fee_pct': str(fees.installment_fee_pct),
                'secondary_resale_fee_pct': str(fees.secondary_resale_fee_pct),
                'management_fee_pct': str(fees.management_fee_pct),
                'pronova_discount_pct': str(fees.pronova_discount_pct),
                'reinvest_discount_pct': str(fees.reinvest_discount_pct),
            },
        }))


class QuoteView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from properties.models import Property

        prop = get_object_or_404(Property, pk=request.data.get('property_id'))
        try:
            quote = quote_for(prop, request.data.get('amount') or 0, request.data.get('method') or 'wallet',
                              request.data.get('expected_unit_price'))
        except PurchaseError as exc:
            return _error(exc)
        return Response(create_success_response(data=quote.as_dict()))


class PurchaseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from properties.models import Property

        from .views import InvestmentViewSet

        property_id = request.data.get('property_id')
        method = request.data.get('method') or ''
        prop = get_object_or_404(Property, pk=property_id)
        try:
            quote = quote_for(prop, request.data.get('amount') or 0, method,
                              request.data.get('expected_unit_price'))
        except PurchaseError as exc:
            return _error(exc)

        # Same compliance gate as every other purchase: verified KYC, sanctions,
        # yearly limit, accredited-only offerings, jurisdiction.
        InvestmentViewSet()._enforce_compliance_gate(SimpleNamespace(
            user=request.user, data={'property_id': str(prop.pk), 'investment_amount': str(quote.subtotal)}))

        try:
            result = create_purchase(
                request.user, property_id=prop.pk, amount=request.data.get('amount'), method=method,
                expected_unit_price=request.data.get('expected_unit_price'),
                idempotency_key=request.headers.get('Idempotency-Key') or request.data.get('idempotency_key'),
                extra_metadata={k: request.data[k] for k in ('pay_currency',) if request.data.get(k)},
            )
        except PurchaseError as exc:
            return _error(exc)

        inv, payment = result['investment'], result['payment']
        if result['next'] == 'checkout' and payment is not None and payment.status == 'pending':
            from payments.checkout import start_checkout, CheckoutError
            try:
                start_checkout(payment, request)
            except CheckoutError as exc:
                return _error(PurchaseError(exc.code, exc.message, exc.status))
            payment.refresh_from_db()
        data = _purchase_dict(inv, payment)
        data['next'] = result['next']
        return Response(create_success_response(data=data), status=status.HTTP_201_CREATED)


class PurchaseStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, investment_id):
        from payments.models import Payment

        from .models import Investment

        inv = get_object_or_404(Investment, pk=investment_id, user=request.user)
        payment = Payment.objects.filter(investment=inv).order_by('-created_at').first()
        if payment is not None and payment.status == 'pending':
            # Safety net when the provider's webhook is late (rate-limited lookup).
            from payments.checkout import refresh_from_provider
            refresh_from_provider(payment)
            payment.refresh_from_db()
            inv.refresh_from_db()
        return Response(create_success_response(data=_purchase_dict(inv, payment)))


class PaymentStatusView(APIView):
    """GET payments/<payment_id>/ — follow a wallet deposit after the provider's page sends the member back."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, payment_id):
        from decimal import Decimal

        from payments.models import Payment

        payment = get_object_or_404(Payment, pk=payment_id, user=request.user)
        if payment.status == 'pending':
            from payments.checkout import refresh_from_provider
            refresh_from_provider(payment)
            payment.refresh_from_db()
        meta = payment.metadata or {}
        credited = sum((Decimal(r['credited']) for r in (meta.get('np') or {}).values() if r.get('credited')),
                       Decimal('0'))
        if not credited and payment.status == 'completed':
            credited = Decimal(payment.amount)
        return Response(create_success_response(data={
            'payment_id': str(payment.id), 'status': payment.status, 'amount': str(payment.amount),
            'credited': str(credited), 'purpose': meta.get('purpose', 'deposit'),
            'investment_id': str(payment.investment_id) if payment.investment_id else None,
        }))


class ReinvestView(APIView):
    """GET reinvest/ — the member's returns that can be reinvested at the discount."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from payments.models import PlatformFeeSettings

        from .purchase import reinvestable_returns
        return Response(create_success_response(data={
            'returns': str(reinvestable_returns(request.user)),
            'discount_pct': str(PlatformFeeSettings.current().reinvest_discount_pct),
        }))


class CryptoCoinsView(APIView):
    """The coins enabled on the NOWPayments account (cached 10 minutes)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.core.cache import cache

        from payments.nowpayments_service import NOWPaymentsService
        from payments.providers import nowpayments_configured

        if not nowpayments_configured():
            return Response(create_success_response(data={'coins': [], 'available': False}))
        coins = cache.get('np_coins')
        if coins is None:
            service = NOWPaymentsService()
            try:
                coins = (service._make_request('GET', 'merchant/coins') or {}).get('selectedCurrencies') or []
            except Exception:  # noqa: BLE001
                coins = []
            if not coins:
                coins = service.get_available_currencies() or []
            coins = sorted({str(c).lower() for c in coins})
            cache.set('np_coins', coins, 600)
        return Response(create_success_response(data={'coins': coins, 'available': True}))


class CryptoMinimumView(APIView):
    """The smallest amount NOWPayments accepts for a coin, in USD."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from payments.nowpayments_service import NOWPaymentsService
        from payments.providers import nowpayments_configured

        coin = (request.query_params.get('coin') or '').lower()
        if not coin or not nowpayments_configured():
            return Response(create_success_response(data={'coin': coin, 'minimum_usd': None}))
        try:
            data = NOWPaymentsService()._make_request('GET', 'min-amount', {
                'currency_from': coin, 'currency_to': coin, 'fiat_equivalent': 'usd'})
        except Exception:  # noqa: BLE001
            data = {}
        minimum = data.get('fiat_equivalent')
        return Response(create_success_response(data={
            'coin': coin, 'minimum_usd': str(minimum) if minimum is not None else None,
            'minimum_coin': str(data.get('min_amount')) if data.get('min_amount') is not None else None}))


class OpenCryptoPaymentsView(APIView):
    """Crypto payments of the last 24 h not finished yet (wallet page card)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from payments.crypto import open_payments
        return Response(create_success_response(data={'payments': open_payments(request.user)}))


class PurchaseProofView(APIView):
    """
    POST <investment_id>/proof/ (multipart) — the second step of a bank-transfer
    or Nova Sukuk purchase: the transfer proof / the Sukuk certificate. The
    shares stay held until an admin reviews it.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, investment_id):
        import secrets
        import string

        from payments.models import BankTransfer, NovaSukukPayment, Payment

        from .models import Investment

        inv = get_object_or_404(Investment, pk=investment_id, user=request.user)
        payment = Payment.objects.filter(investment=inv).order_by('-created_at').first()
        if inv.status != 'pending' or payment is None or payment.status != 'pending':
            return _error(PurchaseError('NOT_PENDING', 'This purchase is no longer waiting for a document.', 409))
        upload = request.FILES.get('file')
        if upload is None:
            return _error(PurchaseError('FILE_REQUIRED', 'Attach the document.', 422))
        if upload.size > 10 * 1024 * 1024:
            return _error(PurchaseError('FILE_TOO_LARGE', 'The file must be 10 MB or smaller.', 422))

        if inv.purchase_method == 'nova_sukuk':
            head = upload.read(5)
            upload.seek(0)
            if head != b'%PDF-':
                return _error(PurchaseError('PDF_REQUIRED', 'The Sukuk certificate must be a PDF.', 422))
            if NovaSukukPayment.objects.filter(investment=inv).exists():
                return _error(PurchaseError('ALREADY_SUBMITTED', 'The certificate was already submitted.', 409))
            sukuk = NovaSukukPayment.objects.create(
                investment=inv, payment=payment, sukuk_pdf=upload,
                sukuk_reference_number=(request.data.get('reference') or '')[:100] or f'NS-{str(inv.pk)[:8].upper()}',
            )
            reference = sukuk.sukuk_reference_number
        elif inv.purchase_method == 'bank':
            if BankTransfer.objects.filter(payment=payment).exists():
                return _error(PurchaseError('ALREADY_SUBMITTED', 'The transfer proof was already submitted.', 409))
            reference = 'BT' + ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(10))
            BankTransfer.objects.create(
                payment=payment,
                account_holder_name=(request.data.get('account_holder_name') or '')[:200],
                account_number=(request.data.get('account_number') or '')[:50],
                routing_number=(request.data.get('routing_number') or '')[:50],
                bank_name=(request.data.get('bank_name') or '')[:200],
                swift_code=(request.data.get('swift_code') or '')[:20],
                transfer_reference=reference,
                transfer_status='pending',
                transfer_instructions=(request.data.get('reference') or '')[:500],
                proof_of_transfer=upload,
            )
        else:
            return _error(PurchaseError('INVALID_METHOD', 'This purchase does not take a document.', 400))

        # The document is in: the shares stay held until the review.
        inv.reservations.filter(released=False).update(expires_at=None)
        inv.reserved_until = None
        inv.save(update_fields=['reserved_until', 'updated_at'])

        try:
            from notifications.services import NotificationService
            NotificationService.create_notification(
                user=request.user,
                title='Document received',
                message=f'We received your document for {inv.property_investment.title} (ref. {reference}). '
                        'Your shares are held while our team reviews it.',
                notification_type='payment', send_email=True,
            )
            from support.notify import _send, support_inbox
            _send(support_inbox(), f'[Review] {inv.purchase_method} purchase {reference}',
                  f'{request.user.email} submitted a {inv.purchase_method} document for '
                  f'{inv.token_amount} shares of {inv.property_investment.title} (${inv.total_charged}).')
        except Exception:  # noqa: BLE001
            pass
        data = _purchase_dict(inv, payment)
        data['reference'] = reference
        return Response(create_success_response(data=data), status=status.HTTP_201_CREATED)


class DepositCheckoutView(APIView):
    """POST deposit/ {amount, method: card|crypto, pay_currency?} — top up the wallet on the provider's page."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from decimal import Decimal, InvalidOperation

        from payments.checkout import CheckoutError, start_checkout
        from payments.models import Payment
        from payments.providers import provider_configured

        method = request.data.get('method')
        if method not in ('card', 'crypto'):
            return _error(PurchaseError('INVALID_METHOD', 'Choose card or crypto.', 422))
        kyc = getattr(request.user, 'kyc_profile', None)
        if not kyc or not kyc.is_verified():
            return _error(PurchaseError('KYC_REQUIRED', 'Verify your identity before adding funds.', 403))
        try:
            amount = Decimal(str(request.data.get('amount'))).quantize(Decimal('0.01'))
        except (InvalidOperation, TypeError, ValueError):
            amount = Decimal('0')
        if amount <= 0 or amount > Decimal('1000000000'):
            return _error(PurchaseError('INVALID_AMOUNT', 'Enter an amount.', 422))
        if not provider_configured(method):
            return _error(PurchaseError('PAYMENTS_NOT_CONFIGURED', 'This payment method is not available right now.', 503))
        payment = Payment.objects.create(
            user=request.user, amount=amount, net_amount=amount, currency='USD',
            payment_method='credit_card' if method == 'card' else 'cryptocurrency', status='pending',
            metadata={'purpose': 'deposit', **({'pay_currency': request.data['pay_currency']}
                                                 if request.data.get('pay_currency') else {})},
        )
        try:
            url = start_checkout(payment, request)
        except CheckoutError as exc:
            payment.status = 'failed'
            payment.save(update_fields=['status', 'updated_at'])
            return _error(PurchaseError(exc.code, exc.message, exc.status))
        return Response(create_success_response(data={'payment_id': str(payment.id), 'checkout_url': url}),
                        status=status.HTTP_201_CREATED)
