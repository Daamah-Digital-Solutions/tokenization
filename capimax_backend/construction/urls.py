"""
URL configuration for construction app.

This module defines URL patterns for construction milestone management endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a router for the ConstructionMilestoneViewSet
router = DefaultRouter()
router.register(
    r'(?P<property_id>[^/.]+)/milestones', 
    views.ConstructionMilestoneViewSet, 
    basename='milestone'
)

app_name = 'construction'

urlpatterns = [
    # Milestone ViewSet routes (nested under property)
    path('', include(router.urls)),
    
    # Construction progress overview
    path('<uuid:property_id>/progress/', 
         views.ConstructionProgressView.as_view(), 
         name='construction-progress'),
    
    # Milestone update creation
    path('<uuid:property_id>/milestones/<uuid:milestone_id>/updates/', 
         views.MilestoneUpdateCreateView.as_view(), 
         name='milestone-update-create'),
    
    # Milestone image upload
    path('<uuid:property_id>/milestones/<uuid:milestone_id>/images/', 
         views.MilestoneImageUploadView.as_view(), 
         name='milestone-image-upload'),
    
    # Milestone document upload
    path('<uuid:property_id>/milestones/<uuid:milestone_id>/documents/', 
         views.MilestoneDocumentUploadView.as_view(), 
         name='milestone-document-upload'),
]