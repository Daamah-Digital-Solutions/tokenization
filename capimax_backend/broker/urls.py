"""
URL Configuration for Broker App.

This module defines URL patterns for broker management endpoints
including profile, commissions, referrals, and marketing materials.
"""

from django.urls import path
from . import views

app_name = 'broker'

urlpatterns = [
    # Broker Profile Management
    path('profile/', views.BrokerProfileView.as_view(), name='broker_profile'),
    path('dashboard/', views.BrokerDashboardView.as_view(), name='broker_dashboard'),
    
    # Commission Management
    path('commissions/', views.BrokerCommissionListView.as_view(), name='commission_list'),
    path('commissions/summary/', views.BrokerCommissionSummaryView.as_view(), name='commission_summary'),
    
    # Referral Management
    path('referrals/', views.BrokerReferralListView.as_view(), name='referral_list'),
    path('referrals/generate/', views.GenerateReferralLinkView.as_view(), name='generate_referral'),
    
    # Performance Metrics
    path('performance/', views.BrokerPerformanceView.as_view(), name='performance_metrics'),
    
    # Marketing Materials
    path('materials/', views.MarketingMaterialListView.as_view(), name='marketing_materials'),
    path('materials/<uuid:material_id>/download/', views.DownloadMarketingMaterialView.as_view(), name='download_material'),
    
    # Verification
    path('verification/submit/', views.submit_verification_documents, name='submit_verification'),
    
    # Admin-only endpoints
    path('admin/brokers/', views.AdminBrokerListView.as_view(), name='admin_broker_list'),
    path('admin/commissions/', views.AdminBrokerCommissionListView.as_view(), name='admin_commission_list'),
    path('admin/commissions/<uuid:commission_id>/approve/', views.approve_broker_commission, name='approve_commission'),
]