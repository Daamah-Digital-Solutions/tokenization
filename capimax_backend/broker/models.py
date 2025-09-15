"""
Broker Management Models for Capimax Real Estate Tokenization Platform.

This module contains models for broker management, commission tracking,
referral systems, marketing materials, and performance metrics.
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
import uuid
import secrets
import string


class BrokerVerificationStatus(models.TextChoices):
    """Broker verification status choices."""
    PENDING = 'pending', 'Pending'
    UNDER_REVIEW = 'under_review', 'Under Review'
    VERIFIED = 'verified', 'Verified'
    REJECTED = 'rejected', 'Rejected'
    SUSPENDED = 'suspended', 'Suspended'


class CommissionType(models.TextChoices):
    """Commission type choices."""
    INVESTMENT = 'investment', 'Investment Commission'
    REFERRAL = 'referral', 'Referral Commission'
    PERFORMANCE = 'performance', 'Performance Bonus'
    DIRECT_SALES = 'direct_sales', 'Direct Sales'


class CommissionStatus(models.TextChoices):
    """Commission status choices."""
    PENDING = 'pending', 'Pending'
    APPROVED = 'approved', 'Approved'
    PAID = 'paid', 'Paid'
    DISPUTED = 'disputed', 'Disputed'
    CANCELLED = 'cancelled', 'Cancelled'


class MaterialType(models.TextChoices):
    """Marketing material type choices."""
    BROCHURE = 'brochure', 'Brochure'
    PRESENTATION = 'presentation', 'Presentation'
    FLYER = 'flyer', 'Flyer'
    VIDEO = 'video', 'Video'
    INFOGRAPHIC = 'infographic', 'Infographic'
    REPORT = 'report', 'Report'
    LOGO = 'logo', 'Logo'
    BANNER = 'banner', 'Banner'


class BrokerProfile(models.Model):
    """
    Extended profile for broker users.
    
    Contains broker-specific information including verification status,
    commission rates, and professional credentials.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the broker profile"
    )
    
    user = models.OneToOneField(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='broker_profile',
        help_text="Associated user account"
    )
    
    license_number = models.CharField(
        max_length=50,
        unique=True,
        help_text="Broker license number"
    )
    
    license_state = models.CharField(
        max_length=50,
        help_text="State/province where license is valid"
    )
    
    license_expiry = models.DateField(
        help_text="License expiration date"
    )
    
    verification_status = models.CharField(
        max_length=20,
        choices=BrokerVerificationStatus.choices,
        default=BrokerVerificationStatus.PENDING,
        help_text="Broker verification status"
    )
    
    commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('2.50'),
        validators=[MinValueValidator(Decimal('0.01')), MaxValueValidator(Decimal('10.00'))],
        help_text="Commission rate percentage (0.01-10.00)"
    )
    
    referral_commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('1.00'),
        validators=[MinValueValidator(Decimal('0.01')), MaxValueValidator(Decimal('5.00'))],
        help_text="Referral commission rate percentage (0.01-5.00)"
    )
    
    company_name = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="Broker's company name"
    )
    
    company_address = models.TextField(
        blank=True,
        null=True,
        help_text="Company address"
    )
    
    website = models.URLField(
        blank=True,
        null=True,
        help_text="Broker's website URL"
    )
    
    bio = models.TextField(
        blank=True,
        null=True,
        help_text="Professional biography"
    )
    
    experience_years = models.PositiveIntegerField(
        default=0,
        help_text="Years of experience in real estate"
    )
    
    specializations = models.JSONField(
        default=list,
        blank=True,
        help_text="List of specialization areas"
    )
    
    languages_spoken = models.JSONField(
        default=list,
        blank=True,
        help_text="List of languages spoken"
    )
    
    profile_image = models.ImageField(
        upload_to='broker_profiles/',
        blank=True,
        null=True,
        help_text="Broker profile image"
    )
    
    is_premium = models.BooleanField(
        default=False,
        help_text="Whether broker has premium features"
    )
    
    premium_expires_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Premium subscription expiry date"
    )
    
    total_sales = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total sales amount"
    )
    
    total_commissions_earned = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total commissions earned"
    )
    
    active_referrals_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of active referrals"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'broker_profile'
        indexes = [
            models.Index(fields=['verification_status']),
            models.Index(fields=['license_number']),
            models.Index(fields=['is_premium']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'Broker Profile'
        verbose_name_plural = 'Broker Profiles'

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.license_number}"
    
    def is_verified(self):
        """Check if broker is verified and license is valid."""
        return (
            self.verification_status == BrokerVerificationStatus.VERIFIED and 
            self.license_expiry > timezone.now().date()
        )
    
    def is_premium_active(self):
        """Check if premium subscription is active."""
        return (
            self.is_premium and 
            self.premium_expires_at and 
            self.premium_expires_at > timezone.now()
        )
    
    def calculate_commission(self, investment_amount, commission_type=CommissionType.INVESTMENT):
        """Calculate commission based on investment amount and type."""
        if commission_type == CommissionType.REFERRAL:
            rate = self.referral_commission_rate
        else:
            rate = self.commission_rate
        
        # Apply premium bonus if applicable
        if self.is_premium_active():
            rate = rate * Decimal('1.1')  # 10% bonus for premium brokers
        
        return (investment_amount * rate) / Decimal('100')


class BrokerCommission(models.Model):
    """
    Commission tracking for broker earnings.
    
    Records commissions earned from investments, referrals,
    and performance bonuses with payment tracking.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the commission"
    )
    
    broker = models.ForeignKey(
        BrokerProfile,
        on_delete=models.CASCADE,
        related_name='commissions',
        help_text="Broker earning the commission"
    )
    
    investment = models.ForeignKey(
        'investments.Investment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='broker_commissions',
        help_text="Related investment (if applicable)"
    )
    
    referral = models.ForeignKey(
        'BrokerReferral',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='commissions',
        help_text="Related referral (if applicable)"
    )
    
    commission_type = models.CharField(
        max_length=20,
        choices=CommissionType.choices,
        default=CommissionType.INVESTMENT,
        help_text="Type of commission"
    )
    
    base_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text="Base amount for commission calculation"
    )
    
    commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Commission rate applied"
    )
    
    commission_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Commission amount earned"
    )
    
    status = models.CharField(
        max_length=20,
        choices=CommissionStatus.choices,
        default=CommissionStatus.PENDING,
        help_text="Commission status"
    )
    
    earned_at = models.DateTimeField(
        default=timezone.now,
        help_text="When commission was earned"
    )
    
    approved_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="When commission was approved"
    )
    
    paid_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="When commission was paid"
    )
    
    payment_reference = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Payment reference number"
    )
    
    notes = models.TextField(
        blank=True,
        null=True,
        help_text="Additional notes about the commission"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'broker_commission'
        indexes = [
            models.Index(fields=['broker', 'status']),
            models.Index(fields=['commission_type']),
            models.Index(fields=['earned_at']),
            models.Index(fields=['status', 'earned_at']),
        ]
        verbose_name = 'Broker Commission'
        verbose_name_plural = 'Broker Commissions'

    def __str__(self):
        return f"${self.commission_amount} commission for {self.broker.user.get_full_name()}"
    
    def approve(self):
        """Approve the commission for payment."""
        if self.status == CommissionStatus.PENDING:
            self.status = CommissionStatus.APPROVED
            self.approved_at = timezone.now()
            self.save(update_fields=['status', 'approved_at'])
    
    def mark_paid(self, payment_reference=None):
        """Mark commission as paid."""
        if self.status == CommissionStatus.APPROVED:
            self.status = CommissionStatus.PAID
            self.paid_at = timezone.now()
            if payment_reference:
                self.payment_reference = payment_reference
            self.save(update_fields=['status', 'paid_at', 'payment_reference'])


def generate_referral_code():
    """Generate a unique referral code."""
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))


class BrokerReferral(models.Model):
    """
    Broker referral system for tracking referred users.
    
    Manages referral codes, tracks referred users,
    and calculates referral commissions.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the referral"
    )
    
    broker = models.ForeignKey(
        BrokerProfile,
        on_delete=models.CASCADE,
        related_name='referrals',
        help_text="Broker making the referral"
    )
    
    referral_code = models.CharField(
        max_length=20,
        unique=True,
        default=generate_referral_code,
        help_text="Unique referral code"
    )
    
    referred_user = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='referral_source',
        help_text="User who was referred"
    )
    
    referred_email = models.EmailField(
        blank=True,
        null=True,
        help_text="Email of referred prospect (before registration)"
    )
    
    is_converted = models.BooleanField(
        default=False,
        help_text="Whether referral resulted in successful conversion"
    )
    
    conversion_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total amount invested by referred user"
    )
    
    commission_earned = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total commission earned from this referral"
    )
    
    first_investment_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="When referred user made first investment"
    )
    
    last_activity_at = models.DateTimeField(
        auto_now=True,
        help_text="Last activity from this referral"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether referral code is active"
    )
    
    expires_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Referral code expiration date"
    )
    
    notes = models.TextField(
        blank=True,
        null=True,
        help_text="Notes about the referral"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'broker_referral'
        indexes = [
            models.Index(fields=['referral_code']),
            models.Index(fields=['broker', 'is_converted']),
            models.Index(fields=['is_active', 'expires_at']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'Broker Referral'
        verbose_name_plural = 'Broker Referrals'

    def __str__(self):
        if self.referred_user:
            return f"Referral {self.referral_code} -> {self.referred_user.email}"
        return f"Referral {self.referral_code} (pending)"
    
    def is_valid(self):
        """Check if referral code is valid and active."""
        if not self.is_active:
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        return True
    
    def mark_converted(self, investment_amount):
        """Mark referral as converted with first investment."""
        if not self.is_converted:
            self.is_converted = True
            self.first_investment_at = timezone.now()
            self.conversion_amount = investment_amount
            self.save(update_fields=['is_converted', 'first_investment_at', 'conversion_amount'])
    
    def add_conversion_amount(self, amount):
        """Add to total conversion amount."""
        self.conversion_amount += amount
        self.save(update_fields=['conversion_amount'])


class MarketingMaterial(models.Model):
    """
    Marketing materials for broker use.
    
    Stores promotional materials, brochures, and assets
    that brokers can download and use for marketing.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the material"
    )
    
    title = models.CharField(
        max_length=200,
        help_text="Material title"
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Material description"
    )
    
    material_type = models.CharField(
        max_length=20,
        choices=MaterialType.choices,
        help_text="Type of marketing material"
    )
    
    file = models.FileField(
        upload_to='marketing_materials/',
        help_text="Marketing material file"
    )
    
    thumbnail = models.ImageField(
        upload_to='marketing_materials/thumbnails/',
        blank=True,
        null=True,
        help_text="Material thumbnail image"
    )
    
    file_size = models.BigIntegerField(
        help_text="File size in bytes"
    )
    
    file_format = models.CharField(
        max_length=10,
        help_text="File format (PDF, PNG, etc.)"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether material is available for download"
    )
    
    is_premium_only = models.BooleanField(
        default=False,
        help_text="Whether material is only for premium brokers"
    )
    
    download_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of times downloaded"
    )
    
    version = models.CharField(
        max_length=20,
        default='1.0',
        help_text="Material version"
    )
    
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text="Tags for categorizing materials"
    )
    
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_materials',
        help_text="User who created the material"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'marketing_material'
        indexes = [
            models.Index(fields=['material_type', 'is_active']),
            models.Index(fields=['is_premium_only']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'Marketing Material'
        verbose_name_plural = 'Marketing Materials'

    def __str__(self):
        return f"{self.title} ({self.material_type})"
    
    def increment_download_count(self):
        """Increment download counter."""
        self.download_count += 1
        self.save(update_fields=['download_count'])


class BrokerPerformanceMetrics(models.Model):
    """
    Performance metrics tracking for brokers.
    
    Aggregates broker performance data on a monthly basis
    for analytics and commission calculations.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the metrics record"
    )
    
    broker = models.ForeignKey(
        BrokerProfile,
        on_delete=models.CASCADE,
        related_name='performance_metrics',
        help_text="Broker these metrics belong to"
    )
    
    month = models.DateField(
        help_text="Month these metrics are for (first day of month)"
    )
    
    total_sales = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total sales amount for the month"
    )
    
    total_commissions = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total commissions earned for the month"
    )
    
    investment_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of investments facilitated"
    )
    
    new_referrals = models.PositiveIntegerField(
        default=0,
        help_text="New referrals generated this month"
    )
    
    converted_referrals = models.PositiveIntegerField(
        default=0,
        help_text="Referrals that converted to investors"
    )
    
    referral_conversion_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Referral conversion rate percentage"
    )
    
    avg_investment_size = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Average investment size facilitated"
    )
    
    unique_investors = models.PositiveIntegerField(
        default=0,
        help_text="Number of unique investors served"
    )
    
    repeat_investors = models.PositiveIntegerField(
        default=0,
        help_text="Number of repeat investors"
    )
    
    client_retention_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Client retention rate percentage"
    )
    
    marketing_materials_downloaded = models.PositiveIntegerField(
        default=0,
        help_text="Marketing materials downloaded this month"
    )
    
    performance_rank = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Performance rank among all brokers"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'broker_performance_metrics'
        unique_together = [['broker', 'month']]
        indexes = [
            models.Index(fields=['broker', 'month']),
            models.Index(fields=['month', 'total_sales']),
            models.Index(fields=['performance_rank']),
        ]
        verbose_name = 'Broker Performance Metrics'
        verbose_name_plural = 'Broker Performance Metrics'

    def __str__(self):
        return f"{self.broker.user.get_full_name()} - {self.month.strftime('%Y-%m')}"
    
    def calculate_performance_score(self):
        """Calculate overall performance score based on metrics."""
        # Weight different metrics for overall score
        sales_score = min(float(self.total_sales) / 100000 * 30, 30)  # Max 30 points
        investment_score = min(self.investment_count * 2, 25)  # Max 25 points
        referral_score = min(float(self.referral_conversion_rate) * 0.25, 25)  # Max 25 points
        retention_score = min(float(self.client_retention_rate) * 0.20, 20)  # Max 20 points
        
        return round(sales_score + investment_score + referral_score + retention_score, 2)
