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
    
    # Property image upload
    path('<uuid:property_id>/images/', 
         views.PropertyImageUploadView.as_view(), 
         name='property-image-upload'),
    
    # Property document upload
    path('<uuid:property_id>/documents/', 
         views.PropertyDocumentUploadView.as_view(), 
         name='property-document-upload'),
    
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