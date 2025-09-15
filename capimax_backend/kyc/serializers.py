"""
KYC Serializers for Capimax Real Estate Tokenization Platform.

This module contains serializers for KYC verification, document management,
and compliance checking API endpoints with comprehensive validation and
data transformation.
"""

from rest_framework import serializers
from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone
from .models import (
    KYCProfile, KYCDocument, BiometricVerification, 
    ComplianceCheck, KYCNote, KYCAuditLog,
    DocumentType, DocumentStatus, KYCStatus, VerificationLevel
)
from accounts.serializers import UserProfileSerializer
import base64
import uuid
import mimetypes


class KYCProfileSerializer(serializers.ModelSerializer):
    """Serializer for KYC Profile with computed fields."""
    
    user_details = UserProfileSerializer(source='user', read_only=True)
    is_verified = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    days_until_expiry = serializers.SerializerMethodField()
    document_count = serializers.SerializerMethodField()
    pending_documents = serializers.SerializerMethodField()
    compliance_status = serializers.SerializerMethodField()
    
    class Meta:
        model = KYCProfile
        fields = [
            'user', 'user_details', 'status', 'verification_level',
            'submitted_at', 'reviewed_at', 'reviewed_by', 'rejection_reason',
            'notes', 'risk_score', 'investment_limit', 'expires_at',
            'last_updated_documents', 'created_at', 'updated_at',
            'is_verified', 'is_expired', 'days_until_expiry',
            'document_count', 'pending_documents', 'compliance_status'
        ]
        read_only_fields = [
            'user', 'submitted_at', 'reviewed_at', 'reviewed_by',
            'investment_limit', 'expires_at', 'created_at', 'updated_at'
        ]
    
    def get_is_verified(self, obj):
        """Check if KYC is verified and not expired."""
        return obj.is_verified()
    
    def get_is_expired(self, obj):
        """Check if KYC verification has expired."""
        return obj.is_expired()
    
    def get_days_until_expiry(self, obj):
        """Calculate days until KYC expires."""
        if not obj.expires_at:
            return None
        days = (obj.expires_at - timezone.now()).days
        return max(0, days)
    
    def get_document_count(self, obj):
        """Get count of uploaded documents."""
        return obj.documents.count()
    
    def get_pending_documents(self, obj):
        """Get count of pending documents."""
        return obj.documents.filter(status=DocumentStatus.PENDING).count()
    
    def get_compliance_status(self, obj):
        """Get overall compliance status."""
        compliance_checks = obj.user.compliance_checks.all()
        if not compliance_checks.exists():
            return 'pending'
        
        # Check if any compliance check failed
        if compliance_checks.filter(result='hit').exists():
            return 'flagged'
        
        # Check if all checks passed
        if compliance_checks.filter(result='clear').count() == compliance_checks.count():
            return 'clear'
        
        return 'pending'


class KYCProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating KYC Profile by admin users."""
    
    class Meta:
        model = KYCProfile
        fields = [
            'status', 'verification_level', 'rejection_reason', 
            'notes', 'risk_score'
        ]
    
    def update(self, instance, validated_data):
        """Update KYC profile with audit logging."""
        request = self.context.get('request')
        reviewer = request.user if request else None
        
        # Store old values for audit
        old_status = instance.status
        new_status = validated_data.get('status', instance.status)
        
        # Update the instance
        instance = super().update(instance, validated_data)
        
        # Set reviewed information if status changed
        if old_status != new_status and reviewer:
            instance.reviewed_by = reviewer
            instance.reviewed_at = timezone.now()
            
            # Set investment limit if approved
            if new_status == KYCStatus.APPROVED:
                instance.set_investment_limit()
                
            instance.save()
        
        return instance


class KYCDocumentSerializer(serializers.ModelSerializer):
    """Serializer for KYC documents with file upload handling."""
    
    file_url = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    reviewer_name = serializers.SerializerMethodField()
    
    class Meta:
        model = KYCDocument
        fields = [
            'id', 'kyc_profile', 'document_type', 'status', 'file_path',
            'file_name', 'file_size', 'file_hash', 'expiry_date',
            'document_number', 'country_of_issue', 'reviewed_by',
            'reviewed_at', 'rejection_reason', 'ocr_data',
            'verification_checks', 'metadata', 'created_at', 'updated_at',
            'file_url', 'is_expired', 'reviewer_name'
        ]
        read_only_fields = [
            'id', 'kyc_profile', 'file_size', 'file_hash', 'reviewed_by',
            'reviewed_at', 'ocr_data', 'verification_checks', 'created_at',
            'updated_at'
        ]
    
    def get_file_url(self, obj):
        """Get secure file URL."""
        if obj.file_path:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file_path.url)
        return None
    
    def get_is_expired(self, obj):
        """Check if document has expired."""
        return obj.is_expired()
    
    def get_reviewer_name(self, obj):
        """Get reviewer name if available."""
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name()
        return None


class KYCDocumentUploadSerializer(serializers.ModelSerializer):
    """Serializer for uploading KYC documents with validation."""
    
    file_data = serializers.CharField(
        write_only=True,
        help_text="Base64 encoded file data"
    )
    
    class Meta:
        model = KYCDocument
        fields = [
            'document_type', 'file_name', 'expiry_date', 
            'document_number', 'country_of_issue', 'file_data'
        ]
    
    def validate_file_data(self, value):
        """Validate base64 file data."""
        try:
            # Decode base64
            file_data = base64.b64decode(value)
            
            # Check file size (max 10MB)
            if len(file_data) > 10 * 1024 * 1024:
                raise serializers.ValidationError("File size too large. Maximum 10MB allowed.")
            
            # Check file type using mimetypes (simple detection based on filename)
            file_name = self.initial_data.get('file_name', '')
            mime_type, _ = mimetypes.guess_type(file_name)
            
            allowed_types = [
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
                'application/pdf', 'image/webp'
            ]
            
            # If we can't detect from filename, check first few bytes for common file signatures
            if not mime_type or mime_type not in allowed_types:
                # Simple file signature detection
                if file_data.startswith(b'\xFF\xD8\xFF'):
                    mime_type = 'image/jpeg'
                elif file_data.startswith(b'\x89PNG\r\n\x1A\n'):
                    mime_type = 'image/png'
                elif file_data.startswith(b'%PDF'):
                    mime_type = 'application/pdf'
                elif file_data.startswith(b'GIF8'):
                    mime_type = 'image/gif'
                else:
                    raise serializers.ValidationError(
                        "Invalid file type. Allowed types: JPEG, PNG, GIF, PDF, WebP"
                    )
            
            if mime_type not in allowed_types:
                raise serializers.ValidationError(
                    f"Invalid file type: {mime_type}. "
                    "Allowed types: JPEG, PNG, GIF, PDF, WebP"
                )
            
            return file_data
            
        except Exception as e:
            raise serializers.ValidationError(f"Invalid file data: {str(e)}")
    
    def validate_document_type(self, value):
        """Validate document type."""
        request = self.context.get('request')
        if not request:
            return value
        
        user = request.user
        kyc_profile = getattr(user, 'kyc_profile', None)
        
        if kyc_profile:
            # Check if document type already exists (excluding current instance)
            existing = kyc_profile.documents.filter(document_type=value)
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            
            if existing.exists():
                raise serializers.ValidationError(
                    f"Document of type {value} already exists. Please delete the existing one first."
                )
        
        return value
    
    def validate_expiry_date(self, value):
        """Validate document expiry date."""
        if value and value <= timezone.now().date():
            raise serializers.ValidationError("Document has already expired.")
        return value
    
    def create(self, validated_data):
        """Create KYC document with file processing."""
        request = self.context.get('request')
        user = request.user
        kyc_profile = user.kyc_profile
        
        file_data = validated_data.pop('file_data')
        file_name = validated_data.get('file_name')
        
        # Create file from base64 data
        file_content = ContentFile(file_data, name=file_name)
        
        # Create document instance
        document = KYCDocument.objects.create(
            kyc_profile=kyc_profile,
            file_path=file_content,
            file_size=len(file_data),
            **validated_data
        )
        
        # Calculate file hash
        document.calculate_file_hash()
        document.save()
        
        # Update KYC profile last updated documents timestamp
        kyc_profile.last_updated_documents = timezone.now()
        kyc_profile.save(update_fields=['last_updated_documents'])
        
        return document


class BiometricVerificationSerializer(serializers.ModelSerializer):
    """Serializer for biometric verification data."""
    
    can_attempt = serializers.SerializerMethodField()
    attempts_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = BiometricVerification
        fields = [
            'kyc_profile', 'liveness_score', 'face_match_score',
            'verification_session_id', 'provider', 'status',
            'attempts', 'max_attempts', 'metadata',
            'created_at', 'updated_at', 'can_attempt', 'attempts_remaining'
        ]
        read_only_fields = [
            'kyc_profile', 'liveness_score', 'face_match_score',
            'verification_session_id', 'created_at', 'updated_at'
        ]
    
    def get_can_attempt(self, obj):
        """Check if user can make another attempt."""
        return obj.can_attempt()
    
    def get_attempts_remaining(self, obj):
        """Get remaining attempts."""
        return max(0, obj.max_attempts - obj.attempts)


class ComplianceCheckSerializer(serializers.ModelSerializer):
    """Serializer for compliance check data."""
    
    user_name = serializers.SerializerMethodField()
    reviewer_name = serializers.SerializerMethodField()
    needs_review = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplianceCheck
        fields = [
            'id', 'user', 'check_type', 'result', 'confidence_score',
            'provider', 'reference_id', 'raw_response', 'hits_data',
            'reviewed_by', 'reviewed_at', 'notes', 'created_at',
            'user_name', 'reviewer_name', 'needs_review'
        ]
        read_only_fields = [
            'id', 'user', 'raw_response', 'created_at'
        ]
    
    def get_user_name(self, obj):
        """Get user's full name."""
        return obj.user.get_full_name()
    
    def get_reviewer_name(self, obj):
        """Get reviewer's name if available."""
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name()
        return None
    
    def get_needs_review(self, obj):
        """Check if compliance check needs review."""
        return obj.needs_review()


class KYCNoteSerializer(serializers.ModelSerializer):
    """Serializer for KYC notes and comments."""
    
    author_name = serializers.SerializerMethodField()
    
    class Meta:
        model = KYCNote
        fields = [
            'id', 'kyc_profile', 'author', 'note', 'is_internal',
            'note_type', 'created_at', 'author_name'
        ]
        read_only_fields = ['id', 'kyc_profile', 'author', 'created_at']
    
    def get_author_name(self, obj):
        """Get author's full name."""
        return obj.author.get_full_name()
    
    def create(self, validated_data):
        """Create note with author from request."""
        request = self.context.get('request')
        validated_data['author'] = request.user
        return super().create(validated_data)


class KYCAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for KYC audit log entries."""
    
    actor_name = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = KYCAuditLog
        fields = [
            'id', 'kyc_profile', 'action', 'actor', 'details',
            'ip_address', 'user_agent', 'created_at',
            'actor_name', 'user_name'
        ]
        read_only_fields = fields  # All fields are read-only
    
    def get_actor_name(self, obj):
        """Get actor's name."""
        if obj.actor:
            return obj.actor.get_full_name()
        return "System"
    
    def get_user_name(self, obj):
        """Get KYC profile user's name."""
        return obj.kyc_profile.user.get_full_name()


class KYCStatusUpdateSerializer(serializers.Serializer):
    """Serializer for KYC status update operations."""
    
    status = serializers.ChoiceField(choices=KYCStatus.choices)
    verification_level = serializers.ChoiceField(
        choices=VerificationLevel.choices,
        required=False
    )
    rejection_reason = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=True
    )
    notes = serializers.CharField(
        max_length=2000,
        required=False,
        allow_blank=True
    )
    
    def validate(self, attrs):
        """Validate status update data."""
        status = attrs.get('status')
        rejection_reason = attrs.get('rejection_reason', '')
        
        # Rejection reason required for rejected status
        if status == KYCStatus.REJECTED and not rejection_reason:
            raise serializers.ValidationError({
                'rejection_reason': 'Rejection reason is required when rejecting KYC.'
            })
        
        return attrs


class KYCSummarySerializer(serializers.Serializer):
    """Serializer for KYC overview and summary data."""
    
    total_profiles = serializers.IntegerField()
    pending_reviews = serializers.IntegerField()
    approved_profiles = serializers.IntegerField()
    rejected_profiles = serializers.IntegerField()
    expired_profiles = serializers.IntegerField()
    documents_uploaded_today = serializers.IntegerField()
    compliance_hits = serializers.IntegerField()
    high_risk_profiles = serializers.IntegerField()
    
    # Verification levels breakdown
    basic_level = serializers.IntegerField()
    enhanced_level = serializers.IntegerField()
    premium_level = serializers.IntegerField()
    
    # Recent activity
    recent_submissions = KYCProfileSerializer(many=True)
    recent_approvals = KYCProfileSerializer(many=True)
    
    def to_representation(self, instance):
        """Custom representation for summary data."""
        data = super().to_representation(instance)
        
        # Add percentage calculations
        total = data.get('total_profiles', 1)  # Avoid division by zero
        data['approval_rate'] = round(
            (data.get('approved_profiles', 0) / total) * 100, 2
        ) if total > 0 else 0
        
        data['rejection_rate'] = round(
            (data.get('rejected_profiles', 0) / total) * 100, 2
        ) if total > 0 else 0
        
        return data


class DocumentTypeRequirementSerializer(serializers.Serializer):
    """Serializer for document type requirements by verification level."""
    
    verification_level = serializers.ChoiceField(choices=VerificationLevel.choices)
    required_documents = serializers.ListField(
        child=serializers.ChoiceField(choices=DocumentType.choices)
    )
    optional_documents = serializers.ListField(
        child=serializers.ChoiceField(choices=DocumentType.choices)
    )
    biometric_required = serializers.BooleanField()
    compliance_checks_required = serializers.ListField(
        child=serializers.CharField()
    )
    investment_limit = serializers.DecimalField(max_digits=12, decimal_places=2)


# Utility function for getting document requirements
def get_document_requirements(verification_level):
    """Get document requirements for specific verification level."""
    requirements = {
        VerificationLevel.BASIC: {
            'required_documents': [
                DocumentType.PASSPORT,
                DocumentType.PROOF_OF_ADDRESS
            ],
            'optional_documents': [
                DocumentType.SELFIE
            ],
            'biometric_required': False,
            'compliance_checks_required': ['aml'],
            'investment_limit': 10000
        },
        VerificationLevel.ENHANCED: {
            'required_documents': [
                DocumentType.PASSPORT,
                DocumentType.PROOF_OF_ADDRESS,
                DocumentType.BANK_STATEMENT,
                DocumentType.SELFIE
            ],
            'optional_documents': [
                DocumentType.VIDEO_VERIFICATION
            ],
            'biometric_required': True,
            'compliance_checks_required': ['aml', 'sanctions', 'pep'],
            'investment_limit': 50000
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
            'compliance_checks_required': [
                'aml', 'sanctions', 'pep', 'adverse_media', 'watchlist'
            ],
            'investment_limit': 500000
        }
    }
    
    return requirements.get(verification_level, requirements[VerificationLevel.BASIC])