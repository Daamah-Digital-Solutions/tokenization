"""
URL patterns for Liquidity Provider module.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    LPApplicationViewSet,
    LiquidityProviderViewSet,
    ExitRequestViewSet,
    LiquidityTransactionViewSet
)

router = DefaultRouter()
router.register(r'applications', LPApplicationViewSet, basename='lp-application')
router.register(r'providers', LiquidityProviderViewSet, basename='liquidity-provider')
router.register(r'exit-requests', ExitRequestViewSet, basename='exit-request')
router.register(r'transactions', LiquidityTransactionViewSet, basename='lp-transaction')

urlpatterns = [
    path('', include(router.urls)),
]
