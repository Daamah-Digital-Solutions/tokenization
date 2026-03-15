"""
URL configuration for admin_panel app.

This module defines URL patterns for admin panel endpoints.
"""

from django.urls import path
from . import views

app_name = 'admin_panel'

urlpatterns = [
    # Property approval management
    path('property-approvals/',
         views.PropertyApprovalListView.as_view(),
         name='property-approval-list'),

    path('property-approvals/<uuid:property_id>/',
         views.PropertyApprovalDetailView.as_view(),
         name='property-approval-detail'),

    path('property-approvals/<uuid:property_id>/assign/',
         views.AssignReviewerView.as_view(),
         name='assign-reviewer'),

    path('property-approvals/stats/',
         views.ApprovalStatsView.as_view(),
         name='approval-stats'),

    # Document management
    path('documents/<uuid:document_id>/download/',
         views.DocumentDownloadView.as_view(),
         name='document-download'),

    # Valuation history
    path('properties/<uuid:property_id>/valuations/',
         views.PropertyValuationListView.as_view(),
         name='property-valuation-list'),

    # Nova Sukuk admin review
    path('nova-sukuk/',
         views.NovaSukukListView.as_view(),
         name='nova-sukuk-list'),

    path('nova-sukuk/<uuid:pk>/review/',
         views.NovaSukukReviewView.as_view(),
         name='nova-sukuk-review'),
]