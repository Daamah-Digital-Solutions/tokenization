from django.urls import path
from .views import (
    DocumentAdminDetailView, DocumentAdminView, DocumentListView, StatementView, TransactionsCsvView,
)

urlpatterns = [
    path('', DocumentListView.as_view(), name='document-list'),
    path('admin/', DocumentAdminView.as_view(), name='document-admin-list'),
    path('admin/<uuid:pk>/', DocumentAdminDetailView.as_view(), name='document-admin-detail'),
    # Official statements (client round 3, #16). export/ before <kind>/.
    path('statements/transactions/export/', TransactionsCsvView.as_view(), name='statement-transactions-csv'),
    path('statements/<str:kind>/', StatementView.as_view(), name='statement'),
]
