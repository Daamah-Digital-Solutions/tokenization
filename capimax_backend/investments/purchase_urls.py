from django.urls import path

from .purchase_views import (
    CryptoCoinsView, CryptoMinimumView, DepositCheckoutView, PurchaseProofView, OpenCryptoPaymentsView, PaymentMethodsView, PaymentStatusView, PurchaseStatusView,
    PurchaseView, QuoteView, ReinvestView, ReturnsView,
)

urlpatterns = [
    path('', PurchaseView.as_view(), name='purchase-create'),
    path('methods/', PaymentMethodsView.as_view(), name='purchase-methods'),
    path('quote/', QuoteView.as_view(), name='purchase-quote'),
    path('crypto/coins/', CryptoCoinsView.as_view(), name='purchase-crypto-coins'),
    path('crypto/minimum/', CryptoMinimumView.as_view(), name='purchase-crypto-minimum'),
    path('crypto/open/', OpenCryptoPaymentsView.as_view(), name='purchase-crypto-open'),
    path('returns/', ReturnsView.as_view(), name='purchase-returns'),
    path('reinvest/', ReinvestView.as_view(), name='purchase-reinvest'),
    path('deposit/', DepositCheckoutView.as_view(), name='purchase-deposit'),
    path('payments/<uuid:payment_id>/', PaymentStatusView.as_view(), name='purchase-payment-status'),
    path('<uuid:investment_id>/proof/', PurchaseProofView.as_view(), name='purchase-proof'),
    path('<uuid:investment_id>/', PurchaseStatusView.as_view(), name='purchase-status'),
]
