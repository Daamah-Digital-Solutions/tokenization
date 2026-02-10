from django.urls import path
from .views import DocumentListView, DocumentAdminView, DocumentAdminDetailView

urlpatterns = [
    path('', DocumentListView.as_view(), name='document-list'),
    path('admin/', DocumentAdminView.as_view(), name='document-admin-list'),
    path('admin/<uuid:pk>/', DocumentAdminDetailView.as_view(), name='document-admin-detail'),
]
