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
