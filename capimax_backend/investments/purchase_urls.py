from django.urls import path

from .purchase_views import PaymentMethodsView, PurchaseStatusView, PurchaseView, QuoteView

urlpatterns = [
    path('', PurchaseView.as_view(), name='purchase-create'),
    path('methods/', PaymentMethodsView.as_view(), name='purchase-methods'),
    path('quote/', QuoteView.as_view(), name='purchase-quote'),
    path('<uuid:investment_id>/', PurchaseStatusView.as_view(), name='purchase-status'),
]
