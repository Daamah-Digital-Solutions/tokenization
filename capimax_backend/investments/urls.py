"""
Investment URLs for Capimax Real Estate Tokenization Platform.

This module defines URL patterns for investment management endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    InvestmentViewSet, PortfolioViewSet, DividendViewSet,
    AutoInvestmentViewSet, InvestmentWithdrawalViewSet,
    InvestmentRecommendationViewSet, InvestmentLimitsViewSet,
    CollaborativeInvestmentView, InvestmentTransactionsView
)

app_name = 'investments'

# Create router and register viewsets
router = DefaultRouter()
router.register(r'investments', InvestmentViewSet, basename='investment')
router.register(r'portfolio', PortfolioViewSet, basename='portfolio')
router.register(r'dividends', DividendViewSet, basename='dividend')
router.register(r'auto-invest', AutoInvestmentViewSet, basename='auto-investment')
router.register(r'withdrawals', InvestmentWithdrawalViewSet, basename='withdrawal')
router.register(r'recommendations', InvestmentRecommendationViewSet, basename='recommendation')
router.register(r'limits', InvestmentLimitsViewSet, basename='limits')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Additional custom endpoints
    path('collaborative/', CollaborativeInvestmentView.as_view(), 
         name='collaborative-investments'),
    path('transactions/', InvestmentTransactionsView.as_view(), 
         name='investment-transactions'),
]

# API URL patterns defined by the router:
# 
# Investment Management:
# - GET /api/investments/ - List user's investments
# - POST /api/investments/ - Create new investment
# - GET /api/investments/{id}/ - Get specific investment
# - PUT /api/investments/{id}/ - Update investment
# - DELETE /api/investments/{id}/ - Delete investment
# - POST /api/investments/calculate/ - Calculate investment details
# - POST /api/investments/{id}/cancel/ - Cancel pending investment
# - GET /api/investments/transactions/ - Get investment transaction history
# - POST /api/investments/simulate/ - Simulate investment returns
# 
# Portfolio Management:
# - GET /api/portfolio/summary/ - Get portfolio summary
# - GET /api/portfolio/performance/ - Get portfolio performance data
# - GET /api/portfolio/analytics/ - Get detailed investment analytics
# 
# Dividend Management:
# - GET /api/dividends/ - List user's dividend payments
# - GET /api/dividends/{id}/ - Get specific dividend payment
# - GET /api/dividends/summary/ - Get dividend summary
# 
# Automatic Investment (DCA):
# - GET /api/auto-invest/ - List user's auto investment plans
# - POST /api/auto-invest/ - Create new auto investment plan
# - GET /api/auto-invest/{id}/ - Get specific auto investment plan
# - PUT /api/auto-invest/{id}/ - Update auto investment plan
# - DELETE /api/auto-invest/{id}/ - Delete auto investment plan
# - POST /api/auto-invest/{id}/pause/ - Pause auto investment
# - POST /api/auto-invest/{id}/resume/ - Resume auto investment
# 
# Investment Withdrawals:
# - GET /api/withdrawals/ - List user's withdrawal requests
# - POST /api/withdrawals/ - Create withdrawal request
# - GET /api/withdrawals/{id}/ - Get specific withdrawal request
# 
# Investment Recommendations:
# - GET /api/recommendations/ - Get personalized investment recommendations
# 
# Investment Limits:
# - GET /api/limits/ - Get user's investment limits and remaining amounts