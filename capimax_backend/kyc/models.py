"""
KYC (Know Your Customer) Models for Capimax Real Estate Tokenization Platform.

This module contains models for KYC verification, document management, 
compliance checking, and biometric verification to ensure regulatory compliance
and user identity verification.
"""

from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import uuid
import os


class KYCStatus(models.TextChoices):
    """Status choices for KYC verification process."""
    PENDING = 'pending', 'Pending'
    IN_REVIEW = 'in_review', 'In Review'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
    EXPIRED = 'expired', 'Expired'


class DocumentType(models.TextChoices):
    """Types of documents that can be uploaded for KYC verification."""
    PASSPORT = 'passport', 'Passport'
    NATIONAL_ID = 'national_id', 'National ID'
    DRIVING_LICENSE = 'driving_license', 'Driving License'
    UTILITY_BILL = 'utility_bill', 'Utility Bill'
    BANK_STATEMENT = 'bank_statement', 'Bank Statement'
    PROOF_OF_ADDRESS = 'proof_of_address', 'Proof of Address'
    SELFIE = 'selfie', 'Selfie'
    VIDEO_VERIFICATION = 'video_verification', 'Video Verification'


class DocumentStatus(models.TextChoices):
    """Status choices for individual document verification."""
    PENDING = 'pending', 'Pending'
    IN_REVIEW = 'in_review', 'In Review'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
    EXPIRED = 'expired', 'Expired'
    RESUBMISSION_REQUIRED = 'resubmission_required', 'Resubmission Required'


class VerificationLevel(models.TextChoices):
    """KYC verification levels with different investment limits."""
    BASIC = 'basic', 'Basic'
    ENHANCED = 'enhanced', 'Enhanced'
    PREMIUM = 'premium', 'Premium'


class KYCProfile(models.Model):
    """
    Main KYC profile model linking to User with verification status and metadata.
    
    This model tracks the overall KYC status for a user, including verification level,
    review timestamps, risk scoring, and investment limits based on verification status.
    """
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='kyc_profile',
        help_text="User associated with this KYC profile"
    )
    
    status = models.CharField(
        max_length=20,
        choices=KYCStatus.choices,
        default=KYCStatus.PENDING,
        help_text="Current KYC verification status"
    )
    
    verification_level = models.CharField(
        max_length=20,
        choices=VerificationLevel.choices,
        default=VerificationLevel.BASIC,
        help_text="Level of KYC verification completed"
    )
    
    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when KYC was first submitted for review"
    )
    
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when KYC was last reviewed"
    )
    
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='kyc_reviews',
        help_text="Admin user who reviewed this KYC"
    )
    
    rejection_reason = models.TextField(
        blank=True,
        help_text="Reason for KYC rejection"
    )
    
    internal_notes = models.TextField(
        blank=True,
        help_text="Internal notes about the KYC review"
    )
    
    risk_score = models.PositiveIntegerField(
        default=0,
        help_text="Automated risk score (0-100, higher = higher risk)"
    )
    
    investment_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Maximum investment amount allowed based on KYC level"
    )
    
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When KYC verification expires (for renewal)"
    )
    
    last_updated_documents = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time documents were updated"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'kyc_profile'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['verification_level']),
            models.Index(fields=['risk_score']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'KYC Profile'
        verbose_name_plural = 'KYC Profiles'

    def __str__(self):
        return f"KYC Profile for {self.user.email} - {self.get_status_display()}"
    
    def is_verified(self):
        """Check if KYC is verified and not expired."""
        if self.status != KYCStatus.APPROVED:
            return False
        if self.expires_at and self.expires_at <= timezone.now():
            return False
        return True
    
    def is_expired(self):
        """Check if KYC verification has expired."""
        return self.expires_at and self.expires_at <= timezone.now()
    
    def set_investment_limit(self):
        """Set investment limit based on verification level."""
        limits = {
            VerificationLevel.BASIC: 10000,
            VerificationLevel.ENHANCED: 50000,
            VerificationLevel.PREMIUM: 500000,
        }
        self.investment_limit = limits.get(self.verification_level, 1000)
        
    def submit_for_review(self):
        """Submit KYC for review."""
        if not self.submitted_at:
            self.submitted_at = timezone.now()
        self.status = KYCStatus.IN_REVIEW
        self.save(update_fields=['submitted_at', 'status', 'updated_at'])
        
    def approve(self, reviewed_by_user, verification_level=None):
        """Approve KYC verification."""
        self.status = KYCStatus.APPROVED
        self.reviewed_by = reviewed_by_user
        self.reviewed_at = timezone.now()
        if verification_level:
            self.verification_level = verification_level
        self.set_investment_limit()
        # Set expiration to 2 years from now
        self.expires_at = timezone.now() + timedelta(days=730)
        self.save()
        # Email the user (every path — admin + API — goes through here).
        self._notify_status_email(
            'approved',
            'Your identity verification has been approved! You now have '
            'full access to all platform features.',
        )

    def reject(self, reviewed_by_user, reason):
        """Reject KYC verification with reason."""
        self.status = KYCStatus.REJECTED
        self.reviewed_by = reviewed_by_user
        self.reviewed_at = timezone.now()
        self.rejection_reason = reason
        self.save()
        self._notify_status_email(
            'rejected',
            f'Your identity verification was not approved. Reason: {reason}',
        )

    def _notify_status_email(self, status, message):
        """Send the KYC status-change email. Never let a mail failure break
        the approve/reject transaction."""
        try:
            from core.services.email_service import EmailService
            from django.conf import settings
            base = (getattr(settings, 'FRONTEND_URL', '') or '').rstrip('/')
            EmailService.send_kyc_status_update_email(
                user=self.user,
                status=status,
                message=message,
                dashboard_url=f'{base}/dashboard' if base else '/dashboard',
            )
        except Exception:
            import logging
            logging.getLogger(__name__).warning(
                'KYC %s email failed for user %s', status, getattr(self, 'user_id', None),
                exc_info=True,
            )


def kyc_document_upload_path(instance, filename):
    """Generate upload path for KYC documents."""
    # Create path like: kyc_documents/user_id/document_type/filename
    return f'kyc_documents/{instance.kyc_profile.user.id}/{instance.document_type}/{filename}'


class KYCDocument(models.Model):
    """
    Model for individual KYC documents uploaded by users.
    
    Stores document metadata, verification status, OCR data, and security information
    for compliance and audit purposes.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the document"
    )
    
    kyc_profile = models.ForeignKey(
        KYCProfile,
        on_delete=models.CASCADE,
        related_name='documents',
        help_text="KYC profile this document belongs to"
    )
    
    document_type = models.CharField(
        max_length=30,
        choices=DocumentType.choices,
        help_text="Type of document uploaded"
    )
    
    status = models.CharField(
        max_length=30,
        choices=DocumentStatus.choices,
        default=DocumentStatus.PENDING,
        help_text="Current verification status of this document"
    )
    
    file_path = models.FileField(
        upload_to=kyc_document_upload_path,
        help_text="Path to the uploaded document file"
    )
    
    file_name = models.CharField(
        max_length=255,
        help_text="Original filename of uploaded document"
    )
    
    file_size = models.PositiveIntegerField(
        help_text="File size in bytes"
    )
    
    file_hash = models.CharField(
        max_length=64,
        blank=True,
        help_text="SHA-256 hash of the file for integrity verification"
    )
    
    expiry_date = models.DateField(
        null=True,
        blank=True,
        help_text="Document expiration date (for ID documents)"
    )
    
    document_number = models.CharField(
        max_length=100,
        blank=True,
        help_text="Document number (passport, ID number, etc.)"
    )
    
    country_of_issue = models.CharField(
        max_length=100,
        blank=True,
        help_text="Country that issued the document"
    )
    
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_documents',
        help_text="Admin user who reviewed this document"
    )
    
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when document was reviewed"
    )
    
    rejection_reason = models.TextField(
        blank=True,
        help_text="Reason for document rejection"
    )
    
    ocr_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="OCR extracted data from the document"
    )
    
    verification_checks = models.JSONField(
        default=dict,
        blank=True,
        help_text="Results from third-party verification services"
    )
    
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional metadata about the document"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'kyc_document'
        indexes = [
            models.Index(fields=['kyc_profile', 'document_type']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]
        unique_together = [
            ('kyc_profile', 'document_type')  # One document per type per profile
        ]
        verbose_name = 'KYC Document'
        verbose_name_plural = 'KYC Documents'

    def __str__(self):
        return f"{self.get_document_type_display()} for {self.kyc_profile.user.email}"
    
    def approve(self, reviewed_by_user):
        """Approve the document."""
        self.status = DocumentStatus.APPROVED
        self.reviewed_by = reviewed_by_user
        self.reviewed_at = timezone.now()
        self.save()
        
    def reject(self, reviewed_by_user, reason):
        """Reject the document with reason."""
        self.status = DocumentStatus.REJECTED
        self.reviewed_by = reviewed_by_user
        self.reviewed_at = timezone.now()
        self.rejection_reason = reason
        self.save()
        
    def is_expired(self):
        """Check if document has expired."""
        if not self.expiry_date:
            return False
        return self.expiry_date <= timezone.now().date()
        
    def calculate_file_hash(self):
        """Calculate and store SHA-256 hash of the file."""
        import hashlib
        if self.file_path and os.path.exists(self.file_path.path):
            hash_sha256 = hashlib.sha256()
            with open(self.file_path.path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha256.update(chunk)
            self.file_hash = hash_sha256.hexdigest()
            return self.file_hash
        return None


class BiometricVerification(models.Model):
    """
    Model for biometric verification data including liveness detection and face matching.
    
    Stores biometric verification session data from third-party providers
    for enhanced security verification.
    """
    
    kyc_profile = models.OneToOneField(
        KYCProfile,
        on_delete=models.CASCADE,
        related_name='biometric',
        help_text="KYC profile associated with this biometric verification"
    )
    
    liveness_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Liveness detection score (0-100)"
    )
    
    face_match_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Face matching score with ID document (0-100)"
    )
    
    verification_session_id = models.CharField(
        max_length=255,
        blank=True,
        help_text="External verification session ID"
    )
    
    provider = models.CharField(
        max_length=50,
        default='onfido',
        help_text="Biometric verification provider"
    )
    
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('in_progress', 'In Progress'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
        ],
        default='pending',
        help_text="Status of biometric verification"
    )
    
    attempts = models.PositiveIntegerField(
        default=0,
        help_text="Number of verification attempts"
    )
    
    max_attempts = models.PositiveIntegerField(
        default=3,
        help_text="Maximum allowed attempts"
    )
    
    metadata = models.JSONField(
        default=dict,
        help_text="Additional verification metadata"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'kyc_biometric_verification'
        verbose_name = 'Biometric Verification'
        verbose_name_plural = 'Biometric Verifications'

    def __str__(self):
        return f"Biometric verification for {self.kyc_profile.user.email}"
    
    def can_attempt(self):
        """Check if user can make another verification attempt."""
        return self.attempts < self.max_attempts
    
    def record_attempt(self):
        """Record a verification attempt."""
        self.attempts += 1
        self.save(update_fields=['attempts', 'updated_at'])


class ComplianceCheck(models.Model):
    """
    Model for compliance checks including AML, sanctions, and PEP screening.
    
    Stores results from compliance screening services for regulatory compliance
    and risk assessment.
    """
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='compliance_checks',
        help_text="User being screened"
    )
    
    check_type = models.CharField(
        max_length=50,
        choices=[
            ('aml', 'AML Screening'),
            ('sanctions', 'Sanctions Check'),
            ('pep', 'PEP Screening'),
            ('adverse_media', 'Adverse Media'),
            ('watchlist', 'Watchlist Check'),
        ],
        help_text="Type of compliance check"
    )
    
    result = models.CharField(
        max_length=20,
        choices=[
            ('clear', 'Clear'),
            ('hit', 'Hit'),
            ('inconclusive', 'Inconclusive'),
            ('error', 'Error'),
        ],
        help_text="Result of the compliance check"
    )
    
    confidence_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Confidence score of the result (0-100)"
    )
    
    provider = models.CharField(
        max_length=100,
        help_text="Compliance screening provider"
    )
    
    reference_id = models.CharField(
        max_length=255,
        blank=True,
        help_text="External reference ID from provider"
    )
    
    raw_response = models.JSONField(
        default=dict,
        help_text="Raw response from compliance provider"
    )
    
    hits_data = models.JSONField(
        default=list,
        help_text="Details of any hits found during screening"
    )
    
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_compliance',
        help_text="Admin who reviewed this compliance check"
    )
    
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this compliance check was reviewed"
    )
    
    notes = models.TextField(
        blank=True,
        help_text="Review notes for compliance check"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'kyc_compliance_check'
        indexes = [
            models.Index(fields=['user', 'check_type']),
            models.Index(fields=['result']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'Compliance Check'
        verbose_name_plural = 'Compliance Checks'

    def __str__(self):
        return f"{self.get_check_type_display()} for {self.user.email} - {self.get_result_display()}"
    
    def is_clear(self):
        """Check if compliance check passed."""
        return self.result == 'clear'
    
    def needs_review(self):
        """Check if compliance check needs manual review."""
        return self.result in ['hit', 'inconclusive'] and not self.reviewed_by


class KYCNote(models.Model):
    """
    Model for storing notes and comments related to KYC reviews.
    
    Provides audit trail and communication mechanism between reviewers
    and supports both internal and customer-facing notes.
    """
    
    kyc_profile = models.ForeignKey(
        KYCProfile,
        on_delete=models.CASCADE,
        related_name='notes',
        help_text="KYC profile this note belongs to"
    )
    
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        help_text="User who created this note"
    )
    
    note = models.TextField(
        help_text="Content of the note"
    )
    
    is_internal = models.BooleanField(
        default=True,
        help_text="Whether this note is for internal use only"
    )
    
    note_type = models.CharField(
        max_length=20,
        choices=[
            ('general', 'General'),
            ('review', 'Review'),
            ('rejection', 'Rejection'),
            ('approval', 'Approval'),
            ('follow_up', 'Follow Up'),
        ],
        default='general',
        help_text="Type of note"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'kyc_note'
        indexes = [
            models.Index(fields=['kyc_profile', 'created_at']),
            models.Index(fields=['note_type']),
        ]
        ordering = ['-created_at']
        verbose_name = 'KYC Note'
        verbose_name_plural = 'KYC Notes'

    def __str__(self):
        return f"Note by {self.author.get_full_name()} on {self.kyc_profile.user.email}"


class KYCAuditLog(models.Model):
    """
    Model for auditing all KYC-related actions and changes.
    
    Provides comprehensive audit trail for compliance and regulatory requirements.
    """
    
    kyc_profile = models.ForeignKey(
        KYCProfile,
        on_delete=models.CASCADE,
        related_name='audit_logs',
        help_text="KYC profile this audit log belongs to"
    )
    
    action = models.CharField(
        max_length=50,
        help_text="Action that was performed"
    )
    
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        help_text="User who performed the action"
    )
    
    details = models.JSONField(
        default=dict,
        help_text="Details of the action performed"
    )
    
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address from which action was performed"
    )
    
    user_agent = models.TextField(
        blank=True,
        help_text="User agent of the browser/client"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'kyc_audit_log'
        indexes = [
            models.Index(fields=['kyc_profile', 'created_at']),
            models.Index(fields=['action']),
        ]
        ordering = ['-created_at']
        verbose_name = 'KYC Audit Log'
        verbose_name_plural = 'KYC Audit Logs'

    def __str__(self):
        actor_name = self.actor.get_full_name() if self.actor else "System"
        return f"{self.action} by {actor_name} on {self.kyc_profile.user.email}"


# Signal handlers for automatic KYC profile creation and audit logging
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_kyc_profile(sender, instance, created, **kwargs):
    """Automatically create KYC profile when user is created."""
    if created:
        KYCProfile.objects.create(user=instance)

@receiver(post_save, sender=KYCProfile)
def log_kyc_profile_changes(sender, instance, created, **kwargs):
    """Log changes to KYC profile for audit purposes."""
    if not created:  # Only log updates, not creation
        action = "KYC Profile Updated"
        details = {
            'status': instance.status,
            'verification_level': instance.verification_level,
            'risk_score': instance.risk_score,
        }
        KYCAuditLog.objects.create(
            kyc_profile=instance,
            action=action,
            actor=instance.reviewed_by if instance.reviewed_by else None,
            details=details
        )
