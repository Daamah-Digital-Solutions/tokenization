"""
URL configuration for properties app.

This module defines URL patterns for property management endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a router for the PropertyViewSet, InstallmentPaymentViewSet, and RentalIncomeDistributionViewSet
router = DefaultRouter()
router.register(r'', views.PropertyViewSet, basename='property')
router.register(r'installments', views.InstallmentPaymentViewSet, basename='installment-payment')
router.register(r'rental-distributions', views.RentalIncomeDistributionViewSet, basename='rental-distribution')

app_name = 'properties'

urlpatterns = [
    # Property ViewSet routes (CRUD + custom actions)
    path('', include(router.urls)),

    # Property Owner Dashboard Endpoints
    path('owner/',
         views.PropertyOwnerDashboardView.as_view(),
         name='property-owner-dashboard'),
    path('owner/revenue-analytics/',
         views.PropertyOwnerRevenueAnalyticsView.as_view(),
         name='property-owner-revenue-analytics'),
    path('owner/tokenization-analytics/',
         views.PropertyOwnerTokenizationAnalyticsView.as_view(),
         name='property-owner-tokenization-analytics'),
    path('owner/revenue-stats/',
         views.PropertyOwnerRevenueStatsView.as_view(),
         name='property-owner-revenue-stats'),
    path('owner/investors/',
         views.PropertyOwnerInvestorsView.as_view(),
         name='property-owner-investors'),
    path('owner/investor-analytics/',
         views.PropertyOwnerInvestorAnalyticsView.as_view(),
         name='property-owner-investor-analytics'),
    path('owner/investment-metrics/',
         views.PropertyOwnerInvestmentMetricsView.as_view(),
         name='property-owner-investment-metrics'),
    path('owner/documents/',
         views.PropertyOwnerDocumentsView.as_view(),
         name='property-owner-documents'),

    # Property image upload
    path('<uuid:property_id>/images/',
         views.PropertyImageUploadView.as_view(),
         name='property-image-upload'),

    # Property document upload (legacy)
    path('<uuid:property_id>/documents/',
         views.PropertyDocumentUploadView.as_view(),
         name='property-document-upload'),

    # Data Room endpoints
    path('<uuid:property_id>/data-room/',
         views.DataRoomDocumentListView.as_view(),
         name='data-room-list'),
    path('<uuid:property_id>/data-room/upload/',
         views.DataRoomDocumentUploadView.as_view(),
         name='data-room-upload'),
    path('<uuid:property_id>/data-room/<int:document_id>/',
         views.DataRoomDocumentDetailView.as_view(),
         name='data-room-detail'),
    path('<uuid:property_id>/data-room/versions/',
         views.DataRoomDocumentVersionsView.as_view(),
         name='data-room-versions'),

    # Property review creation
    path('<uuid:property_id>/reviews/',
         views.PropertyReviewCreateView.as_view(),
         name='property-review-create'),

    # Property update creation
    path('<uuid:property_id>/updates/',
         views.PropertyUpdateCreateView.as_view(),
         name='property-update-create'),

    # Property valuation creation
    path('<uuid:property_id>/valuations/',
         views.PropertyValuationCreateView.as_view(),
         name='property-valuation-create'),

    # Property approval (admin only)
    path('<uuid:property_id>/approve/',
         views.PropertyApprovalView.as_view(),
         name='property-approve'),

    # Property approval status (property owner)
    path('<uuid:property_id>/approval-status/',
         views.PropertyApprovalStatusView.as_view(),
         name='property-approval-status'),

    # Submit property for approval
    path('<uuid:property_id>/submit-for-approval/',
         views.SubmitPropertyForApprovalView.as_view(),
         name='submit-for-approval'),

    # Advanced property search
    path('search/',
         views.PropertySearchView.as_view(),
         name='property-search'),

    # Property analytics
    path('<uuid:property_id>/analytics/',
         views.PropertyAnalyticsView.as_view(),
         name='property-analytics'),

    # Market insights
    path('market/insights/',
         views.MarketInsightsView.as_view(),
         name='market-insights'),

    # Rental income management (admin only)
    path('rental-income/management/',
         views.RentalIncomeManagementView.as_view(),
         name='rental-income-management'),
]