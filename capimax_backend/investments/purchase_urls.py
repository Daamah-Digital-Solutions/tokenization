from django.urls import path

from .purchase_views import (
    CryptoCoinsView, CryptoMinimumView, OpenCryptoPaymentsView, PaymentMethodsView, PurchaseStatusView,
    PurchaseView, QuoteView,
)

urlpatterns = [
    path('', PurchaseView.as_view(), name='purchase-create'),
    path('methods/', PaymentMethodsView.as_view(), name='purchase-methods'),
    path('quote/', QuoteView.as_view(), name='purchase-quote'),
    path('crypto/coins/', CryptoCoinsView.as_view(), name='purchase-crypto-coins'),
    path('crypto/minimum/', CryptoMinimumView.as_view(), name='purchase-crypto-minimum'),
    path('crypto/open/', OpenCryptoPaymentsView.as_view(), name='purchase-crypto-open'),
    path('<uuid:investment_id>/', PurchaseStatusView.as_view(), name='purchase-status'),
]
