"""
URL Configuration for Blockchain API endpoints.

This module defines URL routing for all blockchain-related API endpoints
including smart contracts, transactions, token operations, and monitoring.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for ViewSets
router = DefaultRouter()

# Register ViewSets
router.register(r'networks', views.BlockchainNetworkViewSet, basename='blockchain-networks')
router.register(r'contracts', views.SmartContractViewSet, basename='smart-contracts')
router.register(r'transactions', views.TokenTransactionViewSet, basename='token-transactions')
router.register(r'balances', views.TokenBalanceViewSet, basename='token-balances')
router.register(r'distributions', views.RentalDistributionViewSet, basename='rental-distributions')
router.register(r'gas-tracker', views.GasTrackerViewSet, basename='gas-tracker')
router.register(r'events', views.ContractEventViewSet, basename='contract-events')

# URL patterns
urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Legacy API views
    path('token-operations/', views.TokenOperationsView.as_view(), name='token-operations'),
    path('stats/', views.BlockchainStatsView.as_view(), name='blockchain-stats'),
    
    # Phase 3.1 Enhanced API endpoints
    path('tokenization/', views.PropertyTokenizationView.as_view(), name='property-tokenization'),
    path('investments/process/', views.InvestmentProcessingView.as_view(), name='investment-processing'),
    path('rental-income/', views.RentalIncomeView.as_view(), name='rental-income'),
    path('portfolio/', views.InvestorPortfolioView.as_view(), name='investor-portfolio'),
    path('health/', views.BlockchainHealthView.as_view(), name='blockchain-health'),
]