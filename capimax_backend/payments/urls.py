"""
Payment URL Configuration for Capimax Real Estate Tokenization Platform.

This module contains URL patterns for payment processing, wallet management,
and financial transaction endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    PaymentMethodViewSet,
    PaymentViewSet,
    StripePaymentView,
    StripeWebhookView,
    CryptoPaymentView,
    WalletManagementView,
    get_wallet_transactions,
    RefundViewSet,
    RecurringPaymentViewSet,
    BankTransferView,
)
from .nowpayments_views import (
    nowpayments_currencies,
    nowpayments_estimate,
    nowpayments_create_payment,
    nowpayments_create_invoice,
    nowpayments_payment_status,
    nowpayments_ipn_callback,
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'methods', PaymentMethodViewSet, basename='payment-methods')
router.register(r'payments', PaymentViewSet, basename='payments')
router.register(r'refunds', RefundViewSet, basename='refunds')
router.register(r'recurring', RecurringPaymentViewSet, basename='recurring-payments')

app_name = 'payments'

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),

    # Stripe Payment Processing
    path('stripe/<str:action>/', StripePaymentView.as_view(), name='stripe-payment'),

    # Stripe Webhooks (no auth - uses signature verification)
    path('webhooks/stripe/', StripeWebhookView.as_view(), name='stripe-webhook'),

    # Cryptocurrency Payment Processing
    path('crypto/<str:action>/', CryptoPaymentView.as_view(), name='crypto-payment'),

    # NOWPayments Cryptocurrency Gateway
    path('nowpayments/currencies/', nowpayments_currencies, name='nowpayments-currencies'),
    path('nowpayments/estimate/', nowpayments_estimate, name='nowpayments-estimate'),
    path('nowpayments/create-payment/', nowpayments_create_payment, name='nowpayments-create-payment'),
    path('nowpayments/create-invoice/', nowpayments_create_invoice, name='nowpayments-create-invoice'),
    path('nowpayments/status/<uuid:payment_id>/', nowpayments_payment_status, name='nowpayments-status'),
    path('nowpayments/ipn/', nowpayments_ipn_callback, name='nowpayments-ipn'),

    # Wallet Management
    # NOTE: order matters — `wallet/transactions/` MUST come before
    # `wallet/<str:action>/` or the latter swallows the former and
    # raises a 500 on every transactions-history fetch.
    path('wallet/', WalletManagementView.as_view(), name='wallet-balance'),
    path('wallet/transactions/', get_wallet_transactions, name='wallet-transactions'),
    path('wallet/<str:action>/', WalletManagementView.as_view(), name='wallet-action'),

    # Bank Transfer Integration
    path('bank-transfer/<str:action>/', BankTransferView.as_view(), name='bank-transfer'),
]

"""
API Endpoint Documentation:

Payment Methods:
- GET    /api/payments/methods/           - List user's payment methods
- POST   /api/payments/methods/           - Add new payment method
- GET    /api/payments/methods/{id}/      - Get specific payment method
- PUT    /api/payments/methods/{id}/      - Update payment method
- DELETE /api/payments/methods/{id}/      - Remove payment method
- POST   /api/payments/methods/{id}/set_default/ - Set as default method

Payments:
- GET    /api/payments/payments/          - List user's payments
- POST   /api/payments/payments/          - Create new payment
- GET    /api/payments/payments/{id}/     - Get specific payment
- POST   /api/payments/payments/estimate/ - Get payment estimate
- POST   /api/payments/payments/{id}/cancel/ - Cancel payment

Stripe Payment Processing:
- POST   /api/payments/stripe/create-payment-intent/ - Create Stripe payment intent
- POST   /api/payments/stripe/confirm-payment/ - Confirm Stripe payment

Cryptocurrency Payments:
- POST   /api/payments/crypto/get-quote/     - Get crypto payment quote
- POST   /api/payments/crypto/create-payment/ - Create crypto payment
- POST   /api/payments/crypto/verify-payment/ - Verify crypto payment

NOWPayments Cryptocurrency Gateway:
- GET    /api/payments/nowpayments/currencies/ - Get available cryptocurrencies
- POST   /api/payments/nowpayments/estimate/   - Get price estimate for crypto payment
- POST   /api/payments/nowpayments/create-payment/ - Create NOWPayments payment
- POST   /api/payments/nowpayments/create-invoice/ - Create NOWPayments invoice
- GET    /api/payments/nowpayments/status/{payment_id}/ - Get payment status
- POST   /api/payments/nowpayments/ipn/        - IPN webhook callback (internal)

Wallet Management:
- GET    /api/payments/wallet/            - Get wallet balances
- POST   /api/payments/wallet/deposit/    - Deposit funds to wallet
- POST   /api/payments/wallet/withdraw/   - Withdraw funds from wallet
- POST   /api/payments/wallet/transfer/   - Transfer funds (internal)
- GET    /api/payments/wallet/transactions/ - Get wallet transaction history

Refunds:
- GET    /api/payments/refunds/           - List user's refunds
- POST   /api/payments/refunds/           - Create refund request
- GET    /api/payments/refunds/{id}/      - Get specific refund

Recurring Payments:
- GET    /api/payments/recurring/         - List recurring payments
- POST   /api/payments/recurring/         - Create recurring payment
- GET    /api/payments/recurring/{id}/    - Get specific recurring payment
- PUT    /api/payments/recurring/{id}/    - Update recurring payment
- DELETE /api/payments/recurring/{id}/    - Cancel recurring payment
- POST   /api/payments/recurring/{id}/pause/ - Pause recurring payment
- POST   /api/payments/recurring/{id}/resume/ - Resume recurring payment

NOWPayments Request/Response Examples:

1. Get Available Cryptocurrencies:
   GET /api/payments/nowpayments/currencies/

   Response:
   {
     "success": true,
     "data": {
       "currencies": ["BTC", "ETH", "USDT", "BNB", ...]
     },
     "message": "150 cryptocurrencies available"
   }

2. Get Payment Estimate:
   POST /api/payments/nowpayments/estimate/
   {
     "amount": "100.00",
     "currency_from": "USD",
     "currency_to": "BTC"
   }

   Response:
   {
     "success": true,
     "data": {
       "amount": "100.00",
       "currency_from": "USD",
       "currency_to": "BTC",
       "estimated_amount": "0.00234567",
       "min_amount": "0.0001",
       "exchange_rate": "42500.00",
       "valid_until": "2024-01-15T12:45:00Z"
     }
   }

3. Create NOWPayments Payment:
   POST /api/payments/nowpayments/create-payment/
   {
     "amount": "500.00",
     "currency": "USD",
     "pay_currency": "BTC",
     "order_description": "Property investment",
     "investment_id": "uuid-here"
   }

   Response:
   {
     "success": true,
     "data": {
       "payment_id": "uuid-here",
       "nowpayments_payment_id": "12345678",
       "pay_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
       "pay_amount": "0.01175000",
       "pay_currency": "BTC",
       "payment_status": "waiting",
       "payment_url": "https://nowpayments.io/payment/...",
       "created_at": "2024-01-15T12:30:00Z"
     },
     "message": "NOWPayments transaction created successfully"
   }

4. Create NOWPayments Invoice (user selects crypto):
   POST /api/payments/nowpayments/create-invoice/
   {
     "amount": "500.00",
     "currency": "USD",
     "order_description": "Property investment",
     "investment_id": "uuid-here"
   }

   Response:
   {
     "success": true,
     "data": {
       "payment_id": "uuid-here",
       "invoice_id": "abc123",
       "invoice_url": "https://nowpayments.io/invoice/abc123",
       "created_at": "2024-01-15T12:30:00Z"
     },
     "message": "NOWPayments invoice created successfully"
   }

5. Check Payment Status:
   GET /api/payments/nowpayments/status/{payment_id}/

   Response:
   {
     "success": true,
     "data": {
       "payment_id": "uuid-here",
       "nowpayments_payment_id": "12345678",
       "payment_status": "finished",
       "pay_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
       "pay_amount": "0.01175000",
       "pay_currency": "BTC",
       "actually_paid": "0.01175000",
       "is_completed": true,
       "is_pending": false,
       "is_failed": false
     }
   }
"""
