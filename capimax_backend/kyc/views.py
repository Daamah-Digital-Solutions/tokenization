"""
KYC Views for Capimax Real Estate Tokenization Platform.

This module contains API views for KYC verification, document management,
compliance checking, and biometric verification endpoints.
"""

from rest_framework import status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, GenericViewSet
from rest_framework.views import APIView
from rest_framework.mixins import (
    ListModelMixin, RetrieveModelMixin, 
    UpdateModelMixin, DestroyModelMixin
)
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from django.core.exceptions import PermissionDenied
import logging

from .models import (
    KYCProfile, KYCDocument, BiometricVerification,
    ComplianceCheck, KYCNote, KYCAuditLog,
    KYCStatus, DocumentStatus, VerificationLevel
)
from .serializers import (
    KYCProfileSerializer, KYCProfileUpdateSerializer,
    KYCDocumentSerializer, KYCDocumentUploadSerializer,
    BiometricVerificationSerializer, ComplianceCheckSerializer,
    KYCNoteSerializer, KYCAuditLogSerializer,
    KYCStatusUpdateSerializer, KYCSummarySerializer,
    DocumentTypeRequirementSerializer, get_document_requirements,
    KYCPersonalInfoSerializer
)
from .services import (
    KYCService, ComplianceService, BiometricService,
    OCRService, KYCAnalyticsService
)
from core.permissions import CanManageKYC, IsAdminUser
from core.utils import get_client_ip

logger = logging.getLogger(__name__)


class KYCProfileViewSet(ModelViewSet):
    """ViewSet for KYC Profile management."""
    
    queryset = KYCProfile.objects.select_related('user', 'reviewed_by').all()
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'verification_level', 'risk_score']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    ordering_fields = ['created_at', 'updated_at', 'submitted_at', 'reviewed_at']
    ordering = ['-updated_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action in ['update', 'partial_update'] and self.request.user.is_staff:
            return KYCProfileUpdateSerializer
        return KYCProfileSerializer

    def get_queryset(self):
        """Filter queryset based on user permissions."""
        if getattr(self, 'swagger_fake_view', False):
            return KYCProfile.objects.none()
        if self.request.user.is_staff:
            return self.queryset
        return self.queryset.filter(user=self.request.user)
    
    def get_permissions(self):
        """Get permissions based on action."""
        if self.action in ['list', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [CanManageKYC]
        return [permission() for permission in permission_classes]
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current user's KYC profile."""
        try:
            kyc_profile = request.user.kyc_profile
            serializer = self.get_serializer(kyc_profile)
            return Response(serializer.data)
        except KYCProfile.DoesNotExist:
            # Create KYC profile if it doesn't exist
            kyc_profile = KYCProfile.objects.create(user=request.user)
            serializer = self.get_serializer(kyc_profile)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """Get detailed KYC status and completion information."""
        kyc_profile = self.get_object()
        completion_status = KYCService.check_completion_status(kyc_profile)
        
        data = {
            'kyc_profile': self.get_serializer(kyc_profile).data,
            'completion_status': completion_status,
            'requirements': KYCService.get_verification_requirements(
                kyc_profile.verification_level
            )
        }
        
        return Response(data)
    
    @action(detail=False, methods=['post'])
    def submit(self, request):
        """
        Submit the CURRENT user's KYC for review.

        Self-service action: resolves the profile from ``request.user`` rather
        than a URL pk. Previously this was ``detail=True`` and called
        ``self.get_object()``, but the URL conf wires it at ``/kyc/submit/``
        with no pk, so every submit 500'd with
        "Expected view … to be called with a URL keyword argument named pk" —
        i.e. KYC could never actually be submitted for review.
        """
        try:
            kyc_profile = request.user.kyc_profile
        except KYCProfile.DoesNotExist:
            return Response(
                {'error': 'No KYC profile found. Complete your KYC details first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if already submitted or approved
        if kyc_profile.status in [KYCStatus.IN_REVIEW, KYCStatus.APPROVED]:
            return Response(
                {'error': 'KYC is already submitted or approved.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Attempt to submit
        success = KYCService.submit_for_review(kyc_profile, request.user)
        
        if success:
            # Run compliance checks
            ComplianceService.run_compliance_checks(kyc_profile.user)
            
            return Response(
                {'message': 'KYC submitted for review successfully.'},
                status=status.HTTP_200_OK
            )
        else:
            completion_status = KYCService.check_completion_status(kyc_profile)
            return Response(
                {
                    'error': 'KYC is incomplete and cannot be submitted.',
                    'completion_status': completion_status
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        """Approve KYC profile (admin only)."""
        kyc_profile = self.get_object()
        serializer = KYCStatusUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            verification_level = serializer.validated_data.get(
                'verification_level', kyc_profile.verification_level
            )
            notes = serializer.validated_data.get('notes', '')
            
            # Approve KYC
            kyc_profile.approve(request.user, verification_level)
            
            # Add note if provided
            if notes:
                KYCNote.objects.create(
                    kyc_profile=kyc_profile,
                    author=request.user,
                    note=notes,
                    note_type='approval'
                )
            
            # Log audit trail
            KYCAuditLog.objects.create(
                kyc_profile=kyc_profile,
                action="KYC Approved",
                actor=request.user,
                details={
                    'verification_level': verification_level,
                    'investment_limit': str(kyc_profile.investment_limit)
                },
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response({'message': 'KYC approved successfully.'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def reject(self, request, pk=None):
        """Reject KYC profile (admin only)."""
        kyc_profile = self.get_object()
        serializer = KYCStatusUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            rejection_reason = serializer.validated_data['rejection_reason']
            notes = serializer.validated_data.get('notes', '')
            
            # Reject KYC
            kyc_profile.reject(request.user, rejection_reason)
            
            # Add note if provided
            if notes:
                KYCNote.objects.create(
                    kyc_profile=kyc_profile,
                    author=request.user,
                    note=notes,
                    note_type='rejection'
                )
            
            # Log audit trail
            KYCAuditLog.objects.create(
                kyc_profile=kyc_profile,
                action="KYC Rejected",
                actor=request.user,
                details={'rejection_reason': rejection_reason},
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response({'message': 'KYC rejected.'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def audit_log(self, request, pk=None):
        """Get audit log for KYC profile."""
        kyc_profile = self.get_object()
        
        # Check permissions
        if kyc_profile.user != request.user and not request.user.is_staff:
            raise PermissionDenied("Access denied.")
        
        audit_logs = kyc_profile.audit_logs.all()[:20]  # Last 20 entries
        serializer = KYCAuditLogSerializer(audit_logs, many=True)
        return Response(serializer.data)


class KYCDocumentViewSet(ModelViewSet):
    """ViewSet for KYC Document management."""
    
    queryset = KYCDocument.objects.select_related('kyc_profile__user', 'reviewed_by').all()
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, JSONParser]
    filterset_fields = ['document_type', 'status']
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return KYCDocumentUploadSerializer
        return KYCDocumentSerializer

    def get_queryset(self):
        """Filter queryset based on user permissions."""
        if getattr(self, 'swagger_fake_view', False):
            return KYCDocument.objects.none()
        if self.request.user.is_staff:
            return self.queryset
        return self.queryset.filter(kyc_profile__user=self.request.user)
    
    def perform_create(self, serializer):
        """Create document with user's KYC profile."""
        kyc_profile = self.request.user.kyc_profile
        document = serializer.save()
        
        # Extract OCR data asynchronously
        try:
            OCRService.extract_document_data(document)
        except Exception as e:
            logger.error(f"OCR extraction failed for document {document.id}: {str(e)}")
        
        # Log audit trail
        KYCAuditLog.objects.create(
            kyc_profile=kyc_profile,
            action=f"Document Uploaded: {document.get_document_type_display()}",
            actor=self.request.user,
            details={
                'document_id': str(document.id),
                'document_type': document.document_type,
                'file_size': document.file_size
            },
            ip_address=get_client_ip(self.request),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')
        )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        """Approve document (admin only)."""
        document = self.get_object()
        
        document.approve(request.user)
        
        # Check if all required documents are approved
        kyc_profile = document.kyc_profile
        completion_status = KYCService.check_completion_status(kyc_profile)
        
        # Update risk score
        kyc_profile.risk_score = KYCService.calculate_risk_score(kyc_profile)
        kyc_profile.save()
        
        return Response({
            'message': 'Document approved successfully.',
            'completion_status': completion_status
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def reject(self, request, pk=None):
        """Reject document (admin only)."""
        document = self.get_object()
        rejection_reason = request.data.get('rejection_reason', '')
        
        if not rejection_reason:
            return Response(
                {'error': 'Rejection reason is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        document.reject(request.user, rejection_reason)
        
        return Response({'message': 'Document rejected.'})
    
    @action(detail=True, methods=['get'])
    def ocr_data(self, request, pk=None):
        """Get OCR extracted data for document."""
        document = self.get_object()
        
        # Check permissions
        if (document.kyc_profile.user != request.user and 
            not request.user.is_staff):
            raise PermissionDenied("Access denied.")
        
        if not document.ocr_data:
            # Extract OCR data if not already done
            try:
                ocr_data = OCRService.extract_document_data(document)
                return Response({'ocr_data': ocr_data})
            except Exception as e:
                return Response(
                    {'error': f'OCR extraction failed: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response({'ocr_data': document.ocr_data})


class BiometricVerificationViewSet(GenericViewSet, RetrieveModelMixin, UpdateModelMixin):
    """ViewSet for Biometric Verification management."""
    
    queryset = BiometricVerification.objects.select_related('kyc_profile__user').all()
    serializer_class = BiometricVerificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter queryset based on user permissions."""
        # Handle Swagger schema generation
        if getattr(self, 'swagger_fake_view', False):
            return self.queryset.none()

        if self.request.user.is_staff:
            return self.queryset
        return self.queryset.filter(kyc_profile__user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def start_session(self, request):
        """Start biometric verification session."""
        try:
            kyc_profile = request.user.kyc_profile
            session_id = BiometricService.start_verification_session(kyc_profile)
            
            return Response({
                'session_id': session_id,
                'verification_url': f'/api/kyc/biometric/session/{session_id}/',
                'instructions': 'Please complete liveness detection and face verification.'
            })
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error starting biometric session: {str(e)}")
            return Response(
                {'error': 'Failed to start verification session.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def complete_session(self, request):
        """Complete biometric verification session."""
        session_id = request.data.get('session_id')
        results = request.data.get('results', {})
        
        if not session_id:
            return Response(
                {'error': 'Session ID is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            biometric = BiometricService.complete_verification(session_id, results)
            serializer = self.get_serializer(biometric)
            
            return Response({
                'message': 'Biometric verification completed.',
                'verification': serializer.data
            })
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error completing biometric session: {str(e)}")
            return Response(
                {'error': 'Failed to complete verification.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ComplianceCheckViewSet(GenericViewSet, ListModelMixin, RetrieveModelMixin):
    """ViewSet for Compliance Check management."""
    
    queryset = ComplianceCheck.objects.select_related('user', 'reviewed_by').all()
    serializer_class = ComplianceCheckSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['check_type', 'result', 'provider']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter queryset based on user permissions."""
        # Handle Swagger schema generation
        if getattr(self, 'swagger_fake_view', False):
            return self.queryset.none()

        if self.request.user.is_staff:
            return self.queryset
        return self.queryset.filter(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def run_checks(self, request):
        """Run compliance checks for current user."""
        check_types = request.data.get('check_types', ['aml', 'sanctions', 'pep'])
        
        try:
            results = ComplianceService.run_compliance_checks(
                request.user, check_types
            )
            
            serializer = self.get_serializer(results, many=True)
            return Response({
                'message': 'Compliance checks completed.',
                'results': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error running compliance checks: {str(e)}")
            return Response(
                {'error': 'Failed to run compliance checks.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def review(self, request, pk=None):
        """Review compliance check result (admin only)."""
        compliance_check = self.get_object()
        notes = request.data.get('notes', '')
        
        compliance_check.reviewed_by = request.user
        compliance_check.reviewed_at = timezone.now()
        compliance_check.notes = notes
        compliance_check.save()
        
        return Response({'message': 'Compliance check reviewed.'})


class KYCNoteViewSet(ModelViewSet):
    """ViewSet for KYC Notes management."""
    
    queryset = KYCNote.objects.select_related('kyc_profile', 'author').all()
    serializer_class = KYCNoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['note_type', 'is_internal']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter queryset based on user permissions."""
        # Handle Swagger schema generation
        if getattr(self, 'swagger_fake_view', False):
            return self.queryset.none()

        if self.request.user.is_staff:
            return self.queryset

        # Regular users can only see non-internal notes on their own KYC
        return self.queryset.filter(
            kyc_profile__user=self.request.user,
            is_internal=False
        )
    
    def perform_create(self, serializer):
        """Create note with KYC profile from URL."""
        kyc_profile_id = self.kwargs.get('kyc_profile_pk')
        if kyc_profile_id:
            kyc_profile = get_object_or_404(KYCProfile, pk=kyc_profile_id)
            serializer.save(kyc_profile=kyc_profile)
        else:
            # Create note for current user's KYC
            serializer.save(kyc_profile=self.request.user.kyc_profile)


class KYCAnalyticsView(APIView):
    """View for KYC analytics and reporting."""
    
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        """Get KYC analytics summary."""
        try:
            summary_data = KYCAnalyticsService.get_kyc_summary()
            processing_times = KYCAnalyticsService.get_processing_times()
            
            data = {
                **summary_data,
                'processing_times': processing_times
            }
            
            serializer = KYCSummarySerializer(data)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error generating KYC analytics: {str(e)}")
            return Response(
                {'error': 'Failed to generate analytics.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class KYCRequirementsView(APIView):
    """View for getting KYC requirements by verification level."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get document requirements for all verification levels."""
        requirements_data = []
        
        for level in VerificationLevel.choices:
            level_code = level[0]
            requirements = get_document_requirements(level_code)
            requirements_data.append({
                'verification_level': level_code,
                **requirements
            })
        
        serializer = DocumentTypeRequirementSerializer(requirements_data, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Get requirements for specific verification level."""
        level = request.data.get('verification_level')
        
        if not level or level not in [choice[0] for choice in VerificationLevel.choices]:
            return Response(
                {'error': 'Valid verification level is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        requirements = get_document_requirements(level)
        data = {
            'verification_level': level,
            **requirements
        }
        
        serializer = DocumentTypeRequirementSerializer(data)
        return Response(serializer.data)


class KYCBulkActionsView(APIView):
    """View for bulk KYC actions (admin only)."""
    
    permission_classes = [IsAdminUser]
    
    def post(self, request):
        """Perform bulk actions on KYC profiles."""
        action = request.data.get('action')
        profile_ids = request.data.get('profile_ids', [])
        
        if not action or not profile_ids:
            return Response(
                {'error': 'Action and profile_ids are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        profiles = KYCProfile.objects.filter(id__in=profile_ids)
        
        if action == 'approve_bulk':
            return self._bulk_approve(request, profiles)
        elif action == 'reject_bulk':
            return self._bulk_reject(request, profiles)
        elif action == 'run_compliance':
            return self._bulk_compliance_check(request, profiles)
        else:
            return Response(
                {'error': 'Invalid action.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _bulk_approve(self, request, profiles):
        """Bulk approve KYC profiles."""
        verification_level = request.data.get('verification_level', VerificationLevel.BASIC)
        approved_count = 0
        
        for profile in profiles:
            if profile.status in [KYCStatus.IN_REVIEW, KYCStatus.PENDING]:
                profile.approve(request.user, verification_level)
                approved_count += 1
        
        return Response({
            'message': f'Approved {approved_count} KYC profiles.',
            'approved_count': approved_count
        })
    
    def _bulk_reject(self, request, profiles):
        """Bulk reject KYC profiles."""
        rejection_reason = request.data.get('rejection_reason', 'Bulk rejection')
        rejected_count = 0
        
        for profile in profiles:
            if profile.status in [KYCStatus.IN_REVIEW, KYCStatus.PENDING]:
                profile.reject(request.user, rejection_reason)
                rejected_count += 1
        
        return Response({
            'message': f'Rejected {rejected_count} KYC profiles.',
            'rejected_count': rejected_count
        })
    
    def _bulk_compliance_check(self, request, profiles):
        """Run compliance checks on bulk profiles."""
        check_types = request.data.get('check_types', ['aml'])
        processed_count = 0
        
        for profile in profiles:
            try:
                ComplianceService.run_compliance_checks(profile.user, check_types)
                processed_count += 1
            except Exception as e:
                logger.error(f"Error running compliance for profile {profile.id}: {str(e)}")
        
        return Response({
            'message': f'Ran compliance checks for {processed_count} profiles.',
            'processed_count': processed_count
        })


class KYCPersonalInfoView(APIView):
    """
    View for updating user's personal information during KYC process.

    This endpoint handles the date of birth collection that was moved from
    registration to the KYC process per client requirements.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get current user's personal info relevant to KYC."""
        user = request.user
        return Response({
            'date_of_birth': user.date_of_birth,
            'country': user.country,
            'first_name': user.first_name,
            'last_name': user.last_name,
        })

    def patch(self, request):
        """Update user's personal information during KYC."""
        serializer = KYCPersonalInfoSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.update(request.user, serializer.validated_data)

            # Ensure KYC profile exists
            try:
                kyc_profile = user.kyc_profile
            except:
                from .models import KYCProfile
                kyc_profile = KYCProfile.objects.create(user=user)

            # Log the update
            KYCAuditLog.objects.create(
                kyc_profile=kyc_profile,
                action="Personal Information Updated",
                actor=user,
                details={
                    'date_of_birth': str(serializer.validated_data.get('date_of_birth')),
                    'nationality': serializer.validated_data.get('nationality', ''),
                    'residency_country': serializer.validated_data.get('residency_country', '')
                },
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )

            return Response({
                'message': 'Personal information updated successfully.',
                'date_of_birth': user.date_of_birth,
                'country': user.country
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
