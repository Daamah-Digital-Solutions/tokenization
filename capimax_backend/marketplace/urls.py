"""
Marketplace URLs for Capimax Real Estate Tokenization Platform.

This module contains URL routing for the secondary marketplace system,
providing RESTful endpoints for all marketplace operations.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MarketListingViewSet, TradeOrderViewSet, TradeTransactionViewSet,
    EscrowAccountViewSet, MarketAnalyticsViewSet, MarketDataViewSet,
    TradingPairViewSet
)

# Create DRF router for ViewSets
router = DefaultRouter()

# Register marketplace ViewSets
router.register(r'listings', MarketListingViewSet, basename='marketlisting')
router.register(r'orders', TradeOrderViewSet, basename='tradeorder')
router.register(r'transactions', TradeTransactionViewSet, basename='tradetransaction')
router.register(r'escrow', EscrowAccountViewSet, basename='escrowaccount')
router.register(r'analytics', MarketAnalyticsViewSet, basename='marketanalytics')
router.register(r'market-data', MarketDataViewSet, basename='marketdata')
router.register(r'trading-pairs', TradingPairViewSet, basename='tradingpair')

# Marketplace URL patterns
urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
]

# Add custom endpoint patterns if needed
# These would be additional endpoints not covered by the ViewSets

app_name = 'marketplace'