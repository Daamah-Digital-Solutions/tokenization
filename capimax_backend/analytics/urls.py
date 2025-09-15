"""
URL Configuration for Analytics App.

This module defines URL patterns for analytics endpoints
including dashboard metrics, event tracking, and reports.
"""

from django.urls import path
from . import views

app_name = 'analytics'

urlpatterns = [
    # Dashboard Analytics
    path('dashboard/', views.DashboardAnalyticsView.as_view(), name='dashboard_analytics'),
    
    # Property Analytics
    path('properties/<uuid:property_id>/', views.PropertyAnalyticsDetailView.as_view(), name='property_analytics'),
    
    # User Analytics (Admin only)
    path('users/<uuid:user_id>/', views.UserAnalyticsDetailView.as_view(), name='user_analytics'),
    
    # Investment Analytics
    path('investments/', views.InvestmentAnalyticsView.as_view(), name='investment_analytics'),
    
    # Payment Analytics
    path('payments/', views.PaymentAnalyticsView.as_view(), name='payment_analytics'),
    
    # Event Tracking
    path('events/', views.EventTrackingView.as_view(), name='track_events'),
    path('events/query/', views.AnalyticsQueryView.as_view(), name='query_events'),
    
    # Market Trends
    path('market-trends/', views.MarketTrendsView.as_view(), name='market_trends'),
    
    # Reports
    path('reports/', views.PerformanceReportListView.as_view(), name='report_list'),
    path('reports/generate/', views.GenerateCustomReportView.as_view(), name='generate_report'),
    path('reports/<uuid:report_id>/download/', views.download_report, name='download_report'),
]