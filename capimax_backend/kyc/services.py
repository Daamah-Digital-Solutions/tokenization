"""
KYC Services for Capimax Real Estate Tokenization Platform.

This module contains business logic services for KYC verification,
compliance checking, biometric verification, and risk assessment.
"""

import requests
import json
import hashlib
import logging
from typing import Dict, List, Optional, Tuple
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from django.db.models import Q, Count
from django.core.files.base import ContentFile
from .models import (
    KYCProfile, KYCDocument, BiometricVerification, 
    ComplianceCheck, KYCAuditLog, VerificationLevel,
    KYCStatus, DocumentType, DocumentStatus
)
from accounts.models import User

logger = logging.getLogger(__name__)


class KYCService:
    """Service class for KYC operations and business logic."""
    
    @staticmethod
    def get_verification_requirements(level: str) -> Dict:
        """Get document and verification requirements for a KYC level."""
        requirements = {
            VerificationLevel.BASIC: {
                'required_documents': [
                    DocumentType.PASSPORT,
                    DocumentType.PROOF_OF_ADDRESS
                ],
                'optional_documents': [DocumentType.SELFIE],
                'biometric_required': False,
                'compliance_checks': ['aml'],
                'investment_limit': Decimal('10000.00'),
                'processing_time_days': 1
            },
            VerificationLevel.ENHANCED: {
                'required_documents': [
                    DocumentType.PASSPORT,
                    DocumentType.PROOF_OF_ADDRESS,
                    DocumentType.BANK_STATEMENT,
                    DocumentType.SELFIE
                ],
                'optional_documents': [DocumentType.VIDEO_VERIFICATION],
                'biometric_required': True,
                'compliance_checks': ['aml', 'sanctions', 'pep'],
                'investment_limit': Decimal('50000.00'),
                'processing_time_days': 3
            },
            VerificationLevel.PREMIUM: {
                'required_documents': [
                    DocumentType.PASSPORT,
                    DocumentType.PROOF_OF_ADDRESS,
                    DocumentType.BANK_STATEMENT,
                    DocumentType.SELFIE,
                    DocumentType.VIDEO_VERIFICATION
                ],
                'optional_documents': [],
                'biometric_required': True,
                'compliance_checks': [
                    'aml', 'sanctions', 'pep', 'adverse_media', 'watchlist'
                ],
                'investment_limit': Decimal('500000.00'),
                'processing_time_days': 7
            }
        }
        
        return requirements.get(level, requirements[VerificationLevel.BASIC])
    
    @staticmethod
    def check_completion_status(kyc_profile: KYCProfile) -> Dict:
        """Check KYC completion status and missing requirements."""
        requirements = KYCService.get_verification_requirements(
            kyc_profile.verification_level
        )
        
        # Check document completion
        uploaded_documents = set(
            kyc_profile.documents.values_list('document_type', flat=True)
        )
        required_documents = set(requirements['required_documents'])
        missing_documents = required_documents - uploaded_documents
        
        # Check approved documents
        approved_documents = set(
            kyc_profile.documents.filter(
                status=DocumentStatus.APPROVED
            ).values_list('document_type', flat=True)
        )
        pending_approval = required_documents - approved_documents
        
        # Check biometric verification
        biometric_complete = True
        if requirements['biometric_required']:
            biometric = getattr(kyc_profile, 'biometric', None)
            biometric_complete = (
                biometric and 
                biometric.status == 'completed' and
                biometric.liveness_score and
                biometric.face_match_score
            )
        
        # Check compliance
        compliance_checks = requirements['compliance_checks']
        completed_checks = set(
            kyc_profile.user.compliance_checks.filter(
                result='clear'
            ).values_list('check_type', flat=True)
        )
        missing_compliance = set(compliance_checks) - completed_checks
        
        # Overall completion status
        is_complete = (
            len(missing_documents) == 0 and
            len(pending_approval) == 0 and
            biometric_complete and
            len(missing_compliance) == 0
        )
        
        return {
            'is_complete': is_complete,
            'completion_percentage': KYCService._calculate_completion_percentage(
                requirements, uploaded_documents, approved_documents,
                biometric_complete, completed_checks
            ),
            'missing_documents': list(missing_documents),
            'pending_approval': list(pending_approval),
            'biometric_required': requirements['biometric_required'],
            'biometric_complete': biometric_complete,
            'missing_compliance': list(missing_compliance),
            'next_steps': KYCService._generate_next_steps(
                missing_documents, pending_approval, biometric_complete,
                missing_compliance, requirements
            )
        }
    
    @staticmethod
    def _calculate_completion_percentage(requirements, uploaded, approved, 
                                       biometric_complete, compliance_checks):
        """Calculate completion percentage for KYC process."""
        total_weight = 0
        completed_weight = 0
        
        # Document weight (50%)
        required_docs = len(requirements['required_documents'])
        if required_docs > 0:
            total_weight += 50
            completed_weight += (len(approved) / required_docs) * 50
        
        # Biometric weight (25% if required)
        if requirements['biometric_required']:
            total_weight += 25
            if biometric_complete:
                completed_weight += 25
        
        # Compliance weight (25%)
        required_compliance = len(requirements['compliance_checks'])
        if required_compliance > 0:
            total_weight += 25
            completed_weight += (len(compliance_checks) / required_compliance) * 25
        
        return round(completed_weight, 1) if total_weight > 0 else 0
    
    @staticmethod
    def _generate_next_steps(missing_docs, pending_approval, biometric_complete,
                           missing_compliance, requirements):
        """Generate next steps for KYC completion."""
        steps = []
        
        if missing_docs:
            steps.append({
                'step': 'upload_documents',
                'title': 'Upload Required Documents',
                'description': f'Upload missing documents: {", ".join(missing_docs)}',
                'priority': 'high'
            })
        
        if pending_approval:
            steps.append({
                'step': 'await_review',
                'title': 'Document Review in Progress',
                'description': 'Your documents are being reviewed by our team.',
                'priority': 'medium'
            })
        
        if requirements['biometric_required'] and not biometric_complete:
            steps.append({
                'step': 'complete_biometric',
                'title': 'Complete Biometric Verification',
                'description': 'Complete liveness detection and face verification.',
                'priority': 'high'
            })
        
        if missing_compliance:
            steps.append({
                'step': 'compliance_check',
                'title': 'Compliance Screening',
                'description': 'Compliance checks are being processed automatically.',
                'priority': 'low'
            })
        
        return steps
    
    @staticmethod
    def submit_for_review(kyc_profile: KYCProfile, user: User) -> bool:
        """Submit KYC profile for admin review."""
        completion_status = KYCService.check_completion_status(kyc_profile)
        
        if not completion_status['is_complete']:
            return False
        
        kyc_profile.submit_for_review()
        
        # Log audit trail
        KYCAuditLog.objects.create(
            kyc_profile=kyc_profile,
            action="Submitted for Review",
            actor=user,
            details={
                'completion_percentage': completion_status['completion_percentage'],
                'verification_level': kyc_profile.verification_level
            }
        )
        
        return True
    
    @staticmethod
    def calculate_risk_score(kyc_profile: KYCProfile) -> int:
        """Calculate automated risk score for KYC profile."""
        risk_score = 0
        
        # Check compliance hits
        compliance_checks = kyc_profile.user.compliance_checks.all()
        for check in compliance_checks:
            if check.result == 'hit':
                risk_score += 30
            elif check.result == 'inconclusive':
                risk_score += 15
        
        # Check document quality/age
        for doc in kyc_profile.documents.all():
            if doc.is_expired():
                risk_score += 20
            
            # Check OCR confidence if available
            if doc.ocr_data and 'confidence' in doc.ocr_data:
                confidence = doc.ocr_data['confidence']
                if confidence < 0.8:
                    risk_score += 10
        
        # Check user profile completeness
        user = kyc_profile.user
        if not user.phone:
            risk_score += 5
        if not user.date_of_birth:
            risk_score += 5
        if not user.address:
            risk_score += 10
        
        # Country risk (simplified - would use actual risk ratings)
        high_risk_countries = ['XX', 'YY']  # Placeholder
        if user.country in high_risk_countries:
            risk_score += 25
        
        return min(risk_score, 100)  # Cap at 100


class ComplianceService:
    """Service class for compliance checking and AML screening."""
    
    @staticmethod
    def run_compliance_checks(user: User, check_types: List[str] = None) -> List[ComplianceCheck]:
        """Run compliance checks for a user."""
        if check_types is None:
            check_types = ['aml', 'sanctions', 'pep']
        
        results = []
        
        for check_type in check_types:
            try:
                if check_type == 'aml':
                    result = ComplianceService._run_aml_check(user)
                elif check_type == 'sanctions':
                    result = ComplianceService._run_sanctions_check(user)
                elif check_type == 'pep':
                    result = ComplianceService._run_pep_check(user)
                elif check_type == 'adverse_media':
                    result = ComplianceService._run_adverse_media_check(user)
                elif check_type == 'watchlist':
                    result = ComplianceService._run_watchlist_check(user)
                else:
                    continue
                
                results.append(result)
                
            except Exception as e:
                logger.error(f"Error running {check_type} check for user {user.id}: {str(e)}")
                # Create error record
                results.append(ComplianceCheck.objects.create(
                    user=user,
                    check_type=check_type,
                    result='error',
                    provider='internal',
                    raw_response={'error': str(e)}
                ))
        
        return results
    
    @staticmethod
    def _run_aml_check(user: User) -> ComplianceCheck:
        return ComplianceService._run_check_via_provider(user, 'aml')

    @staticmethod
    def _run_sanctions_check(user: User) -> ComplianceCheck:
        return ComplianceService._run_check_via_provider(user, 'sanctions')

    @staticmethod
    def _run_pep_check(user: User) -> ComplianceCheck:
        return ComplianceService._run_check_via_provider(user, 'pep')

    @staticmethod
    def _run_adverse_media_check(user: User) -> ComplianceCheck:
        return ComplianceService._run_check_via_provider(user, 'adverse_media')

    @staticmethod
    def _run_watchlist_check(user: User) -> ComplianceCheck:
        return ComplianceService._run_check_via_provider(user, 'watchlist')

    @staticmethod
    def _run_check_via_provider(user: User, check_type: str) -> ComplianceCheck:
        """Execute a compliance check via the configured provider."""
        from .providers import get_compliance_provider
        provider = get_compliance_provider()

        kyc = getattr(user, 'kyc_profile', None)
        country = getattr(kyc, 'country_of_residence', None) if kyc else None
        dob = getattr(kyc, 'date_of_birth', None) if kyc else None

        result = provider.screen(
            full_name=user.get_full_name() or user.email,
            date_of_birth=str(dob) if dob else None,
            country_code=country,
            check_type=check_type,
            user_reference=str(user.id),
        )

        return ComplianceCheck.objects.create(
            user=user,
            check_type=check_type,
            result=result.result,
            confidence_score=result.confidence,
            provider=result.provider or 'unknown',
            reference_id=result.provider_reference,
            raw_response=result.raw_response,
            hits_data=result.hits,
        )
    
    @staticmethod
    def _chainalysis_check(user: User, check_type: str) -> ComplianceCheck:
        """Mock Chainalysis API integration."""
        # This would be actual API call to Chainalysis
        mock_response = {
            'result': 'clear',
            'confidence': 98.5,
            'risk_level': 'low',
            'matches': []
        }
        
        return ComplianceCheck.objects.create(
            user=user,
            check_type=check_type,
            result='clear',
            confidence_score=Decimal('98.50'),
            provider='chainalysis',
            reference_id=f'ch_{user.id}_{check_type}',
            raw_response=mock_response
        )
    
    @staticmethod
    def _mock_compliance_check(user: User, check_type: str) -> ComplianceCheck:
        """Create mock compliance check result."""
        # For demo purposes - would be actual API calls
        mock_results = ['clear', 'clear', 'clear', 'hit']  # 75% clear rate
        
        import random
        result = random.choice(mock_results)
        confidence = random.uniform(85, 99) if result == 'clear' else random.uniform(60, 85)
        
        hits_data = []
        if result == 'hit':
            hits_data = [{
                'match_type': check_type,
                'confidence': confidence,
                'source': 'mock_database',
                'details': f'Potential match found for {user.get_full_name()}'
            }]
        
        return ComplianceCheck.objects.create(
            user=user,
            check_type=check_type,
            result=result,
            confidence_score=Decimal(str(round(confidence, 2))),
            provider='mock_provider',
            reference_id=f'mock_{user.id}_{check_type}_{timezone.now().timestamp()}',
            raw_response={
                'result': result,
                'confidence': confidence,
                'checked_fields': ['name', 'date_of_birth', 'country']
            },
            hits_data=hits_data
        )


class BiometricService:
    """Service class for biometric verification operations."""
    
    @staticmethod
    def start_verification_session(kyc_profile: KYCProfile, return_url: str = '') -> str:
        """Start a biometric verification session via the configured provider."""
        from .providers import get_biometric_provider

        biometric, _ = BiometricVerification.objects.get_or_create(
            kyc_profile=kyc_profile,
            defaults={
                'provider': getattr(settings, 'KYC_BIOMETRIC_PROVIDER', 'mock'),
                'status': 'pending'
            }
        )

        if not biometric.can_attempt():
            raise ValueError("Maximum verification attempts exceeded")

        provider = get_biometric_provider()
        session = provider.start_session(
            user_reference=str(kyc_profile.user.id),
            return_url=return_url or getattr(settings, 'FRONTEND_URL', 'https://app.capimax.com'),
        )
        if not session.success:
            biometric.status = 'failed'
            biometric.save(update_fields=['status'])
            raise RuntimeError(f'Biometric session start failed: {session.error}')

        biometric.verification_session_id = session.session_id
        biometric.status = 'in_progress'
        biometric.record_attempt()
        biometric.save(update_fields=['verification_session_id', 'status'])

        return session.session_id
    
    @staticmethod
    def complete_verification(session_id: str, results: Dict) -> BiometricVerification:
        """Complete biometric verification with results."""
        try:
            biometric = BiometricVerification.objects.get(
                verification_session_id=session_id
            )
        except BiometricVerification.DoesNotExist:
            raise ValueError("Invalid session ID")
        
        # Update verification results
        biometric.liveness_score = results.get('liveness_score')
        biometric.face_match_score = results.get('face_match_score')
        biometric.metadata.update(results.get('metadata', {}))
        
        # Determine status based on scores
        liveness_threshold = 70
        face_match_threshold = 80
        
        if (biometric.liveness_score >= liveness_threshold and 
            biometric.face_match_score >= face_match_threshold):
            biometric.status = 'completed'
        else:
            biometric.status = 'failed'
        
        biometric.save()
        
        # Log audit trail
        KYCAuditLog.objects.create(
            kyc_profile=biometric.kyc_profile,
            action="Biometric Verification Completed",
            actor=None,  # System action
            details={
                'status': biometric.status,
                'liveness_score': float(biometric.liveness_score or 0),
                'face_match_score': float(biometric.face_match_score or 0)
            }
        )
        
        return biometric


class OCRService:
    """Service class for document OCR and data extraction."""
    
    @staticmethod
    def extract_document_data(document: KYCDocument) -> Dict:
        """
        Extract OCR data from a document.

        Delegates to the configured document verification provider (which
        typically performs OCR as part of the verification flow). For
        non-production environments, the mock provider returns deterministic
        canned data, which is acceptable for dev/tests.
        """
        if not document.file_path:
            return {}

        try:
            from .providers import get_document_provider
            provider = get_document_provider()

            # Read file bytes if accessible
            file_bytes = b''
            try:
                with open(document.file_path.path, 'rb') as fh:
                    file_bytes = fh.read()
            except Exception:
                logger.warning('Could not read document file for OCR',
                               extra={'document_id': str(document.id)})

            result = provider.verify_document(
                document_type=document.document_type,
                file_bytes=file_bytes,
                file_name=document.file_path.name if document.file_path else '',
                user_reference=str(document.kyc_profile.user.id),
            )

            ocr_data = result.extracted_data or {}
            ocr_data['_provider_reference'] = result.provider_reference
            ocr_data['_confidence'] = float(result.confidence)
            document.ocr_data = ocr_data
            document.save(update_fields=['ocr_data'])
            return ocr_data
        except Exception:
            logger.exception(
                'OCR extraction failed',
                extra={'document_id': str(document.id)},
            )
            return {}
    
    @staticmethod
    def _generate_mock_ocr_data(document: KYCDocument) -> Dict:
        """Generate mock OCR data for testing."""
        user = document.kyc_profile.user
        
        if document.document_type == DocumentType.PASSPORT:
            return {
                'document_type': 'passport',
                'document_number': f'P{user.id}123456',
                'given_names': user.first_name,
                'surname': user.last_name,
                'date_of_birth': user.date_of_birth.isoformat() if user.date_of_birth else None,
                'nationality': user.country,
                'expiry_date': '2030-12-31',
                'confidence': 0.95,
                'extracted_fields': ['document_number', 'names', 'date_of_birth', 'nationality']
            }
        
        elif document.document_type == DocumentType.PROOF_OF_ADDRESS:
            return {
                'document_type': 'utility_bill',
                'account_holder': user.get_full_name(),
                'address': user.address or 'Mock Address 123, City',
                'issue_date': timezone.now().date().isoformat(),
                'confidence': 0.88,
                'extracted_fields': ['account_holder', 'address', 'issue_date']
            }
        
        return {
            'document_type': document.document_type,
            'confidence': 0.85,
            'extracted_fields': []
        }


class KYCAnalyticsService:
    """Service class for KYC analytics and reporting."""
    
    @staticmethod
    def get_kyc_summary() -> Dict:
        """Get KYC overview summary statistics."""
        total_profiles = KYCProfile.objects.count()
        
        # Status breakdown
        status_counts = KYCProfile.objects.values('status').annotate(count=Count('id'))
        status_dict = {item['status']: item['count'] for item in status_counts}
        
        # Verification level breakdown
        level_counts = KYCProfile.objects.values('verification_level').annotate(count=Count('id'))
        level_dict = {item['verification_level']: item['count'] for item in level_counts}
        
        # Recent activity
        recent_submissions = KYCProfile.objects.filter(
            submitted_at__gte=timezone.now() - timezone.timedelta(days=7),
            status=KYCStatus.IN_REVIEW
        )[:10]
        
        recent_approvals = KYCProfile.objects.filter(
            reviewed_at__gte=timezone.now() - timezone.timedelta(days=7),
            status=KYCStatus.APPROVED
        )[:10]
        
        # Documents uploaded today
        today = timezone.now().date()
        documents_today = KYCDocument.objects.filter(
            created_at__date=today
        ).count()
        
        # Compliance statistics
        compliance_hits = ComplianceCheck.objects.filter(result='hit').count()
        high_risk_profiles = KYCProfile.objects.filter(risk_score__gte=50).count()
        
        return {
            'total_profiles': total_profiles,
            'pending_reviews': status_dict.get(KYCStatus.PENDING, 0) + 
                             status_dict.get(KYCStatus.IN_REVIEW, 0),
            'approved_profiles': status_dict.get(KYCStatus.APPROVED, 0),
            'rejected_profiles': status_dict.get(KYCStatus.REJECTED, 0),
            'expired_profiles': status_dict.get(KYCStatus.EXPIRED, 0),
            'documents_uploaded_today': documents_today,
            'compliance_hits': compliance_hits,
            'high_risk_profiles': high_risk_profiles,
            'basic_level': level_dict.get(VerificationLevel.BASIC, 0),
            'enhanced_level': level_dict.get(VerificationLevel.ENHANCED, 0),
            'premium_level': level_dict.get(VerificationLevel.PREMIUM, 0),
            'recent_submissions': recent_submissions,
            'recent_approvals': recent_approvals,
        }
    
    @staticmethod
    def get_processing_times() -> Dict:
        """Calculate average processing times for KYC reviews."""
        approved_profiles = KYCProfile.objects.filter(
            status=KYCStatus.APPROVED,
            submitted_at__isnull=False,
            reviewed_at__isnull=False
        )
        
        if not approved_profiles.exists():
            return {'average_processing_days': 0, 'median_processing_days': 0}
        
        processing_times = []
        for profile in approved_profiles:
            delta = profile.reviewed_at - profile.submitted_at
            processing_times.append(delta.days)
        
        avg_days = sum(processing_times) / len(processing_times)
        sorted_times = sorted(processing_times)
        median_days = sorted_times[len(sorted_times) // 2]
        
        return {
            'average_processing_days': round(avg_days, 1),
            'median_processing_days': median_days,
            'fastest_processing_days': min(processing_times),
            'slowest_processing_days': max(processing_times)
        }