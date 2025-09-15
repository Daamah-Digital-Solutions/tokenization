"""
Comprehensive Tests for KYC (Know Your Customer) Module.

This module contains tests for KYC verification, document management,
biometric verification, compliance checking, and admin workflows.
"""

from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from decimal import Decimal
import base64
import json
import uuid

from .models import (
    KYCProfile, KYCDocument, BiometricVerification,
    ComplianceCheck, KYCNote, KYCAuditLog,
    KYCStatus, DocumentStatus, DocumentType, VerificationLevel
)
from .services import KYCService, ComplianceService, BiometricService, OCRService
from accounts.models import UserRole

User = get_user_model()


class KYCModelTests(TestCase):
    """Test KYC model functionality and business logic."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role=UserRole.INVESTOR
        )
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='adminpass123',
            first_name='Admin',
            last_name='User',
            role=UserRole.ADMIN
        )
        
    def test_kyc_profile_creation(self):
        """Test automatic KYC profile creation on user registration."""
        # KYC profile should be created automatically via signal
        self.assertTrue(hasattr(self.user, 'kyc_profile'))
        self.assertEqual(self.user.kyc_profile.status, KYCStatus.PENDING)
        self.assertEqual(self.user.kyc_profile.verification_level, VerificationLevel.BASIC)
        
    def test_kyc_profile_verification_methods(self):
        """Test KYC profile verification status methods."""
        kyc_profile = self.user.kyc_profile
        
        # Initially not verified
        self.assertFalse(kyc_profile.is_verified())
        self.assertFalse(kyc_profile.is_expired())
        
        # Approve KYC
        kyc_profile.approve(self.admin_user)
        self.assertTrue(kyc_profile.is_verified())
        self.assertEqual(kyc_profile.status, KYCStatus.APPROVED)
        self.assertEqual(kyc_profile.reviewed_by, self.admin_user)
        
    def test_kyc_document_creation(self):
        """Test KYC document model functionality."""
        kyc_profile = self.user.kyc_profile
        
        # Create test document
        document = KYCDocument.objects.create(
            kyc_profile=kyc_profile,
            document_type=DocumentType.PASSPORT,
            file_name='passport.jpg',
            file_size=1024000,
            country_of_issue='US'
        )
        
        self.assertEqual(document.status, DocumentStatus.PENDING)
        self.assertFalse(document.is_expired())
        
        # Test approval
        document.approve(self.admin_user)
        self.assertEqual(document.status, DocumentStatus.APPROVED)
        self.assertEqual(document.reviewed_by, self.admin_user)
        
    def test_biometric_verification(self):
        """Test biometric verification functionality."""
        kyc_profile = self.user.kyc_profile
        
        biometric = BiometricVerification.objects.create(
            kyc_profile=kyc_profile,
            attempts=1,
            liveness_score=Decimal('85.50'),
            face_match_score=Decimal('92.30')
        )
        
        self.assertTrue(biometric.can_attempt())
        self.assertEqual(biometric.attempts, 1)
        
        # Test maximum attempts
        biometric.attempts = biometric.max_attempts
        biometric.save()
        self.assertFalse(biometric.can_attempt())
        
    def test_compliance_check(self):
        """Test compliance check functionality."""
        compliance_check = ComplianceCheck.objects.create(
            user=self.user,
            check_type='aml',
            result='clear',
            confidence_score=Decimal('95.50'),
            provider='test_provider'
        )
        
        self.assertTrue(compliance_check.is_clear())
        self.assertFalse(compliance_check.needs_review())
        
        # Test hit result
        compliance_check.result = 'hit'
        compliance_check.save()
        self.assertFalse(compliance_check.is_clear())
        self.assertTrue(compliance_check.needs_review())


class KYCServiceTests(TestCase):
    """Test KYC service layer functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role=UserRole.INVESTOR
        )
        self.kyc_profile = self.user.kyc_profile
        
    def test_get_verification_requirements(self):
        """Test verification requirements retrieval."""
        basic_req = KYCService.get_verification_requirements(VerificationLevel.BASIC)
        enhanced_req = KYCService.get_verification_requirements(VerificationLevel.ENHANCED)
        premium_req = KYCService.get_verification_requirements(VerificationLevel.PREMIUM)
        
        self.assertIn('required_documents', basic_req)
        self.assertIn('investment_limit', basic_req)
        self.assertFalse(basic_req['biometric_required'])
        
        self.assertTrue(enhanced_req['biometric_required'])
        self.assertTrue(premium_req['biometric_required'])
        
        # Check investment limits
        self.assertLess(basic_req['investment_limit'], enhanced_req['investment_limit'])
        self.assertLess(enhanced_req['investment_limit'], premium_req['investment_limit'])
        
    def test_check_completion_status(self):
        """Test KYC completion status checking."""
        status = KYCService.check_completion_status(self.kyc_profile)
        
        self.assertFalse(status['is_complete'])
        self.assertGreater(len(status['missing_documents']), 0)
        self.assertIn('next_steps', status)
        self.assertEqual(status['completion_percentage'], 0)
        
    def test_submit_for_review_incomplete(self):
        """Test submitting incomplete KYC for review."""
        result = KYCService.submit_for_review(self.kyc_profile, self.user)
        
        self.assertFalse(result)
        self.assertEqual(self.kyc_profile.status, KYCStatus.PENDING)
        
    def test_calculate_risk_score(self):
        """Test risk score calculation."""
        initial_score = KYCService.calculate_risk_score(self.kyc_profile)
        
        # Add a compliance hit
        ComplianceCheck.objects.create(
            user=self.user,
            check_type='aml',
            result='hit',
            provider='test_provider'
        )
        
        updated_score = KYCService.calculate_risk_score(self.kyc_profile)
        self.assertGreater(updated_score, initial_score)


class ComplianceServiceTests(TestCase):
    """Test compliance service functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role=UserRole.INVESTOR
        )
        
    def test_run_compliance_checks(self):
        """Test running compliance checks."""
        check_types = ['aml', 'sanctions', 'pep']
        results = ComplianceService.run_compliance_checks(self.user, check_types)
        
        self.assertEqual(len(results), len(check_types))
        
        for result in results:
            self.assertIsInstance(result, ComplianceCheck)
            self.assertIn(result.check_type, check_types)
            self.assertIn(result.result, ['clear', 'hit', 'inconclusive', 'error'])
            
    def test_mock_compliance_check(self):
        """Test mock compliance check creation."""
        result = ComplianceService._mock_compliance_check(self.user, 'aml')
        
        self.assertEqual(result.user, self.user)
        self.assertEqual(result.check_type, 'aml')
        self.assertIn(result.result, ['clear', 'hit'])
        self.assertGreater(result.confidence_score, 0)


class BiometricServiceTests(TestCase):
    """Test biometric service functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role=UserRole.INVESTOR
        )
        self.kyc_profile = self.user.kyc_profile
        
    def test_start_verification_session(self):
        """Test starting biometric verification session."""
        session_id = BiometricService.start_verification_session(self.kyc_profile)
        
        self.assertIsInstance(session_id, str)
        self.assertTrue(session_id.startswith('session_'))
        
        # Check biometric verification record
        biometric = BiometricVerification.objects.get(kyc_profile=self.kyc_profile)
        self.assertEqual(biometric.verification_session_id, session_id)
        self.assertEqual(biometric.status, 'in_progress')
        
    def test_complete_verification_success(self):
        """Test successful biometric verification completion."""
        session_id = BiometricService.start_verification_session(self.kyc_profile)
        
        results = {
            'liveness_score': 85.5,
            'face_match_score': 92.3,
            'metadata': {'provider': 'test'}
        }
        
        biometric = BiometricService.complete_verification(session_id, results)
        
        self.assertEqual(biometric.status, 'completed')
        self.assertEqual(float(biometric.liveness_score), 85.5)
        self.assertEqual(float(biometric.face_match_score), 92.3)
        
    def test_complete_verification_failure(self):
        """Test failed biometric verification completion."""
        session_id = BiometricService.start_verification_session(self.kyc_profile)
        
        results = {
            'liveness_score': 50.0,  # Below threshold
            'face_match_score': 60.0,  # Below threshold
        }
        
        biometric = BiometricService.complete_verification(session_id, results)
        
        self.assertEqual(biometric.status, 'failed')


class OCRServiceTests(TestCase):
    """Test OCR service functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role=UserRole.INVESTOR,
            date_of_birth='1990-01-01',
            country='US'
        )
        self.kyc_profile = self.user.kyc_profile
        
    def test_extract_document_data_passport(self):
        """Test OCR data extraction for passport."""
        document = KYCDocument.objects.create(
            kyc_profile=self.kyc_profile,
            document_type=DocumentType.PASSPORT,
            file_name='passport.jpg',
            file_size=1024000
        )
        
        ocr_data = OCRService.extract_document_data(document)
        
        self.assertEqual(ocr_data['document_type'], 'passport')
        self.assertIn('document_number', ocr_data)
        self.assertIn('confidence', ocr_data)
        self.assertEqual(ocr_data['given_names'], self.user.first_name)
        self.assertEqual(ocr_data['surname'], self.user.last_name)
        
    def test_extract_document_data_address_proof(self):
        """Test OCR data extraction for proof of address."""
        document = KYCDocument.objects.create(
            kyc_profile=self.kyc_profile,
            document_type=DocumentType.PROOF_OF_ADDRESS,
            file_name='utility_bill.pdf',
            file_size=512000
        )
        
        ocr_data = OCRService.extract_document_data(document)
        
        self.assertEqual(ocr_data['document_type'], 'utility_bill')
        self.assertIn('account_holder', ocr_data)
        self.assertIn('confidence', ocr_data)


class KYCAPITests(APITestCase):
    """Test KYC API endpoints."""
    
    def setUp(self):
        """Set up test data and authentication."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role=UserRole.INVESTOR
        )
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='adminpass123',
            first_name='Admin',
            last_name='User',
            role=UserRole.ADMIN
        )
        
        self.client = APIClient()
        self.admin_client = APIClient()
        
    def test_get_kyc_status_authenticated(self):
        """Test getting KYC status for authenticated user."""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('kyc:kyc-status')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('status', response.data)
        self.assertEqual(response.data['status'], KYCStatus.PENDING)
        
    def test_get_kyc_status_unauthenticated(self):
        """Test getting KYC status without authentication."""
        url = reverse('kyc:kyc-status')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
    def test_upload_document_valid(self):
        """Test uploading valid KYC document."""
        self.client.force_authenticate(user=self.user)
        
        # Create test image data (JPEG signature)
        test_image = b'\xFF\xD8\xFF\xE0' + b'test_image_data' * 100
        file_data = base64.b64encode(test_image).decode('utf-8')
        
        url = reverse('kyc:kyc-document-upload')
        data = {
            'document_type': DocumentType.PASSPORT,
            'file_name': 'passport.jpg',
            'file_data': file_data,
            'country_of_issue': 'US'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(KYCDocument.objects.filter(kyc_profile=self.user.kyc_profile).count(), 1)
        
    def test_upload_document_invalid_file_type(self):
        """Test uploading document with invalid file type."""
        self.client.force_authenticate(user=self.user)
        
        # Create test data without valid file signature
        test_data = b'invalid_file_data'
        file_data = base64.b64encode(test_data).decode('utf-8')
        
        url = reverse('kyc:kyc-document-upload')
        data = {
            'document_type': DocumentType.PASSPORT,
            'file_name': 'document.txt',
            'file_data': file_data
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid file type', str(response.data))
        
    def test_upload_document_too_large(self):
        """Test uploading oversized document."""
        self.client.force_authenticate(user=self.user)
        
        # Create large test data (over 10MB)
        large_data = b'\xFF\xD8\xFF\xE0' + b'x' * (11 * 1024 * 1024)
        file_data = base64.b64encode(large_data).decode('utf-8')
        
        url = reverse('kyc:kyc-document-upload')
        data = {
            'document_type': DocumentType.PASSPORT,
            'file_name': 'large_passport.jpg',
            'file_data': file_data
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('File size too large', str(response.data))
        
    def test_submit_kyc_incomplete(self):
        """Test submitting incomplete KYC for review."""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('kyc:kyc-submit')
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('incomplete', str(response.data))
        
    def test_admin_approve_kyc(self):
        """Test admin approving KYC profile."""
        self.admin_client.force_authenticate(user=self.admin_user)
        
        url = reverse('kyc:kyc-admin-approve', args=[self.user.kyc_profile.id])
        data = {
            'status': KYCStatus.APPROVED,
            'verification_level': VerificationLevel.ENHANCED,
            'notes': 'Approved after review'
        }
        
        response = self.admin_client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check KYC profile was updated
        self.user.kyc_profile.refresh_from_db()
        self.assertEqual(self.user.kyc_profile.status, KYCStatus.APPROVED)
        self.assertEqual(self.user.kyc_profile.verification_level, VerificationLevel.ENHANCED)
        
    def test_admin_reject_kyc(self):
        """Test admin rejecting KYC profile."""
        self.admin_client.force_authenticate(user=self.admin_user)
        
        url = reverse('kyc:kyc-admin-reject', args=[self.user.kyc_profile.id])
        data = {
            'status': KYCStatus.REJECTED,
            'rejection_reason': 'Documents not clear enough'
        }
        
        response = self.admin_client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check KYC profile was updated
        self.user.kyc_profile.refresh_from_db()
        self.assertEqual(self.user.kyc_profile.status, KYCStatus.REJECTED)
        self.assertEqual(self.user.kyc_profile.rejection_reason, 'Documents not clear enough')
        
    def test_start_biometric_verification(self):
        """Test starting biometric verification session."""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('kyc:kyc-biometric-start')
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('session_id', response.data)
        self.assertIn('verification_url', response.data)
        
    def test_complete_biometric_verification(self):
        """Test completing biometric verification."""
        self.client.force_authenticate(user=self.user)
        
        # Start session first
        start_url = reverse('kyc:kyc-biometric-start')
        start_response = self.client.post(start_url)
        session_id = start_response.data['session_id']
        
        # Complete verification
        complete_url = reverse('kyc:kyc-biometric-complete')
        data = {
            'session_id': session_id,
            'results': {
                'liveness_score': 85.5,
                'face_match_score': 92.3
            }
        }
        
        response = self.client.post(complete_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('verification', response.data)
        
    def test_run_compliance_checks(self):
        """Test running compliance checks."""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('kyc:kyc-compliance-run')
        data = {
            'check_types': ['aml', 'sanctions']
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 2)
        
    def test_get_kyc_requirements(self):
        """Test getting KYC requirements."""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('kyc:kyc-requirements')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 3)  # Three verification levels
        
        for requirement in response.data:
            self.assertIn('verification_level', requirement)
            self.assertIn('required_documents', requirement)
            self.assertIn('investment_limit', requirement)
            
    def test_get_kyc_analytics_admin_only(self):
        """Test getting KYC analytics (admin only)."""
        # Test with regular user (should fail)
        self.client.force_authenticate(user=self.user)
        
        url = reverse('kyc:kyc-analytics')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test with admin user (should succeed)
        self.admin_client.force_authenticate(user=self.admin_user)
        response = self.admin_client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_profiles', response.data)
        self.assertIn('pending_reviews', response.data)
        
    def test_bulk_actions_admin_only(self):
        """Test bulk KYC actions (admin only)."""
        self.admin_client.force_authenticate(user=self.admin_user)
        
        url = reverse('kyc:kyc-admin-bulk-actions')
        data = {
            'action': 'approve_bulk',
            'profile_ids': [self.user.kyc_profile.id],
            'verification_level': VerificationLevel.BASIC
        }
        
        response = self.admin_client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('approved_count', response.data)


class KYCIntegrationTests(TransactionTestCase):
    """Integration tests for complete KYC workflows."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role=UserRole.INVESTOR,
            date_of_birth='1990-01-01',
            country='US',
            address='123 Test St, Test City'
        )
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='adminpass123',
            first_name='Admin',
            last_name='User',
            role=UserRole.ADMIN
        )
        
        self.client = APIClient()
        self.admin_client = APIClient()
        
    def test_complete_basic_kyc_workflow(self):
        """Test complete basic KYC verification workflow."""
        self.client.force_authenticate(user=self.user)
        kyc_profile = self.user.kyc_profile
        
        # Step 1: Check initial status
        status_url = reverse('kyc:kyc-status')
        response = self.client.get(status_url)
        self.assertEqual(response.data['status'], KYCStatus.PENDING)
        
        # Step 2: Upload required documents for basic verification
        test_image = b'\xFF\xD8\xFF\xE0' + b'test_image_data' * 100
        file_data = base64.b64encode(test_image).decode('utf-8')
        
        # Upload passport
        upload_url = reverse('kyc:kyc-document-upload')
        passport_data = {
            'document_type': DocumentType.PASSPORT,
            'file_name': 'passport.jpg',
            'file_data': file_data,
            'country_of_issue': 'US',
            'document_number': 'P123456789'
        }
        response = self.client.post(upload_url, passport_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Upload proof of address
        address_data = {
            'document_type': DocumentType.PROOF_OF_ADDRESS,
            'file_name': 'utility_bill.pdf',
            'file_data': file_data
        }
        response = self.client.post(upload_url, address_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Step 3: Run compliance checks
        compliance_url = reverse('kyc:kyc-compliance-run')
        compliance_data = {'check_types': ['aml']}
        response = self.client.post(compliance_url, compliance_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Step 4: Admin approves documents
        self.admin_client.force_authenticate(user=self.admin_user)
        
        documents = KYCDocument.objects.filter(kyc_profile=kyc_profile)
        for document in documents:
            approve_url = reverse('kyc:kyc-document-approve', args=[document.id])
            response = self.admin_client.post(approve_url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Step 5: Submit KYC for review (should work now)
        self.client.force_authenticate(user=self.user)
        submit_url = reverse('kyc:kyc-submit')
        response = self.client.post(submit_url)
        
        # Should work if all compliance checks passed
        if ComplianceCheck.objects.filter(user=self.user, result='clear').exists():
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            kyc_profile.refresh_from_db()
            self.assertEqual(kyc_profile.status, KYCStatus.IN_REVIEW)
        
        # Step 6: Admin approves KYC
        self.admin_client.force_authenticate(user=self.admin_user)
        approve_url = reverse('kyc:kyc-admin-approve', args=[kyc_profile.id])
        approve_data = {
            'status': KYCStatus.APPROVED,
            'verification_level': VerificationLevel.BASIC
        }
        response = self.admin_client.post(approve_url, approve_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Step 7: Verify final status
        kyc_profile.refresh_from_db()
        self.assertEqual(kyc_profile.status, KYCStatus.APPROVED)
        self.assertTrue(kyc_profile.is_verified())
        self.assertIsNotNone(kyc_profile.investment_limit)
        
        # Check audit trail
        audit_logs = KYCAuditLog.objects.filter(kyc_profile=kyc_profile)
        self.assertGreater(audit_logs.count(), 0)
        
    def test_enhanced_kyc_workflow_with_biometric(self):
        """Test enhanced KYC workflow including biometric verification."""
        self.client.force_authenticate(user=self.user)
        kyc_profile = self.user.kyc_profile
        kyc_profile.verification_level = VerificationLevel.ENHANCED
        kyc_profile.save()
        
        # Upload all required documents for enhanced verification
        test_image = b'\xFF\xD8\xFF\xE0' + b'test_image_data' * 100
        file_data = base64.b64encode(test_image).decode('utf-8')
        
        required_docs = [
            (DocumentType.PASSPORT, 'passport.jpg'),
            (DocumentType.PROOF_OF_ADDRESS, 'utility_bill.pdf'),
            (DocumentType.BANK_STATEMENT, 'bank_statement.pdf'),
            (DocumentType.SELFIE, 'selfie.jpg')
        ]
        
        upload_url = reverse('kyc:kyc-document-upload')
        for doc_type, filename in required_docs:
            data = {
                'document_type': doc_type,
                'file_name': filename,
                'file_data': file_data
            }
            response = self.client.post(upload_url, data, format='json')
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Complete biometric verification
        start_url = reverse('kyc:kyc-biometric-start')
        start_response = self.client.post(start_url)
        self.assertEqual(start_response.status_code, status.HTTP_200_OK)
        
        session_id = start_response.data['session_id']
        complete_url = reverse('kyc:kyc-biometric-complete')
        biometric_data = {
            'session_id': session_id,
            'results': {
                'liveness_score': 85.5,
                'face_match_score': 92.3,
                'metadata': {'provider': 'test'}
            }
        }
        response = self.client.post(complete_url, biometric_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Run enhanced compliance checks
        compliance_url = reverse('kyc:kyc-compliance-run')
        compliance_data = {'check_types': ['aml', 'sanctions', 'pep']}
        response = self.client.post(compliance_url, compliance_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Admin approves all documents
        self.admin_client.force_authenticate(user=self.admin_user)
        documents = KYCDocument.objects.filter(kyc_profile=kyc_profile)
        for document in documents:
            approve_url = reverse('kyc:kyc-document-approve', args=[document.id])
            response = self.admin_client.post(approve_url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check completion status
        completion_status = KYCService.check_completion_status(kyc_profile)
        
        # Should be complete if all compliance checks passed
        if all(check.result == 'clear' for check in kyc_profile.user.compliance_checks.all()):
            self.assertTrue(completion_status['is_complete'])
            self.assertTrue(completion_status['biometric_complete'])