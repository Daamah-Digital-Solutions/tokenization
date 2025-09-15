"""
KYC URL Configuration for Capimax Real Estate Tokenization Platform.

This module defines all KYC-related API endpoints including document management,
biometric verification, compliance checks, and admin review workflows.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    KYCProfileViewSet, KYCDocumentViewSet, BiometricVerificationViewSet,
    ComplianceCheckViewSet, KYCNoteViewSet, KYCAnalyticsView,
    KYCRequirementsView, KYCBulkActionsView
)

# Create main router
router = DefaultRouter()
router.register(r'profiles', KYCProfileViewSet, basename='kyc-profile')
router.register(r'documents', KYCDocumentViewSet, basename='kyc-document')
router.register(r'biometric', BiometricVerificationViewSet, basename='kyc-biometric')
router.register(r'compliance', ComplianceCheckViewSet, basename='kyc-compliance')
router.register(r'notes', KYCNoteViewSet, basename='kyc-note')

urlpatterns = [
    # Main router URLs
    path('', include(router.urls)),
    
    # KYC Status and Management Endpoints
    path('status/', 
         KYCProfileViewSet.as_view({'get': 'current'}), 
         name='kyc-status'),
    
    path('submit/', 
         KYCProfileViewSet.as_view({'post': 'submit'}), 
         name='kyc-submit'),
    
    # Document Management Endpoints
    path('documents/upload/', 
         KYCDocumentViewSet.as_view({'post': 'create'}), 
         name='kyc-document-upload'),
    
    path('documents/<uuid:pk>/approve/', 
         KYCDocumentViewSet.as_view({'post': 'approve'}), 
         name='kyc-document-approve'),
    
    path('documents/<uuid:pk>/reject/', 
         KYCDocumentViewSet.as_view({'post': 'reject'}), 
         name='kyc-document-reject'),
    
    path('documents/<uuid:pk>/ocr/', 
         KYCDocumentViewSet.as_view({'get': 'ocr_data'}), 
         name='kyc-document-ocr'),
    
    # Biometric Verification Endpoints
    path('biometric/start/', 
         BiometricVerificationViewSet.as_view({'post': 'start_session'}), 
         name='kyc-biometric-start'),
    
    path('biometric/complete/', 
         BiometricVerificationViewSet.as_view({'post': 'complete_session'}), 
         name='kyc-biometric-complete'),
    
    # Compliance Check Endpoints
    path('compliance/run/', 
         ComplianceCheckViewSet.as_view({'post': 'run_checks'}), 
         name='kyc-compliance-run'),
    
    path('compliance/<int:pk>/review/', 
         ComplianceCheckViewSet.as_view({'post': 'review'}), 
         name='kyc-compliance-review'),
    
    # Admin Review Workflow Endpoints
    path('admin/approve/<int:pk>/', 
         KYCProfileViewSet.as_view({'post': 'approve'}), 
         name='kyc-admin-approve'),
    
    path('admin/reject/<int:pk>/', 
         KYCProfileViewSet.as_view({'post': 'reject'}), 
         name='kyc-admin-reject'),
    
    path('admin/pending/', 
         KYCProfileViewSet.as_view({'get': 'list'}), 
         name='kyc-admin-pending'),
    
    path('admin/bulk-actions/', 
         KYCBulkActionsView.as_view(), 
         name='kyc-admin-bulk-actions'),
    
    # Analytics and Reporting
    path('analytics/', 
         KYCAnalyticsView.as_view(), 
         name='kyc-analytics'),
    
    # Requirements and Configuration
    path('requirements/', 
         KYCRequirementsView.as_view(), 
         name='kyc-requirements'),
    
    # Audit Trail
    path('<int:pk>/audit/', 
         KYCProfileViewSet.as_view({'get': 'audit_log'}), 
         name='kyc-audit-log'),
]

# Add app name for namespacing
app_name = 'kyc'