"""
Dashboard URL Configuration for Capimax Real Estate Tokenization Platform.

Provides routing for dashboard endpoints including user statistics,
portfolio data, and real-time market insights.
"""

from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    # Dashboard statistics endpoint
    path('stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
]