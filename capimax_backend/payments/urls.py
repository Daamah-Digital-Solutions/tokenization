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
    CryptoPaymentView,
    WalletManagementView,
    get_wallet_transactions,
    RefundViewSet,
    RecurringPaymentViewSet,
    BankTransferView,
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
    
    # Cryptocurrency Payment Processing
    path('crypto/<str:action>/', CryptoPaymentView.as_view(), name='crypto-payment'),
    
    # Wallet Management
    path('wallet/', WalletManagementView.as_view(), name='wallet-balance'),
    path('wallet/<str:action>/', WalletManagementView.as_view(), name='wallet-action'),
    path('wallet/transactions/', get_wallet_transactions, name='wallet-transactions'),
    
    # PayPal Integration (placeholder for future implementation)
    # path('paypal/<str:action>/', PayPalPaymentView.as_view(), name='paypal-payment'),
    
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

Request/Response Examples:

1. Create Stripe Payment Intent:
   POST /api/payments/stripe/create-payment-intent/
   {
     "amount": "500.00",
     "currency": "USD",
     "investment_id": "uuid-here",
     "save_payment_method": true
   }

2. Get Crypto Quote:
   POST /api/payments/crypto/get-quote/
   {
     "from_currency": "BTC",
     "to_currency": "USD",
     "amount": "0.01"
   }

3. Add Payment Method:
   POST /api/payments/methods/
   {
     "method_type": "credit_card",
     "display_name": "Visa *1234",
     "last_four": "1234",
     "expiry_date": "12/2025",
     "brand": "Visa"
   }

4. Create Wallet Deposit:
   POST /api/payments/wallet/deposit/
   {
     "amount": "100.00",
     "currency": "USD",
     "payment_method_id": "uuid-here"
   }

5. Create Recurring Payment:
   POST /api/payments/recurring/
   {
     "amount": "100.00",
     "currency": "USD",
     "frequency": "monthly",
     "payment_method": "uuid-here",
     "start_date": "2024-02-01T00:00:00Z",
     "purpose": "investment",
     "investment": "uuid-here"
   }
"""