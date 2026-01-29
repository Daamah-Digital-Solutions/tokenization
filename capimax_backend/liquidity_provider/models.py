"""
Liquidity Provider Models for Capimax Real Estate Tokenization Platform.

This module contains models for liquidity provider management, applications,
exit requests, and transaction processing.

Important Notes:
- Liquidity Provider is NOT a redemption entity
- Does NOT guarantee exit or redemption
- Acts as an independent third party
- All operations are subject to LP's terms and compliance approvals
"""

from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
import uuid


class LPApplicationStatus(models.TextChoices):
    """LP Application status choices."""
    PENDING = 'pending', 'Pending Review'
    UNDER_REVIEW = 'under_review', 'Under Review'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
    WITHDRAWN = 'withdrawn', 'Withdrawn'


class LPStatus(models.TextChoices):
    """Liquidity Provider status choices."""
    PENDING = 'pending', 'Pending Activation'
    ACTIVE = 'active', 'Active'
    SUSPENDED = 'suspended', 'Suspended'
    INACTIVE = 'inactive', 'Inactive'


class ExitRequestStatus(models.TextChoices):
    """Exit Request status choices."""
    PENDING = 'pending', 'Pending'
    UNDER_REVIEW = 'under_review', 'Under Review'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'
    EXPIRED = 'expired', 'Expired'


class EntityType(models.TextChoices):
    """Entity type choices for LP applicants."""
    COMPANY = 'company', 'Company'
    FUND = 'fund', 'Investment Fund'
    PROFESSIONAL_INDIVIDUAL = 'professional_individual', 'Professional Individual'


class LPApplication(models.Model):
    """
    Liquidity Provider Application model.

    Stores application data before approval. Once approved,
    a LiquidityProvider record is created.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    # Entity Information
    legal_entity_name = models.CharField(
        max_length=255,
        help_text="Legal name of the entity"
    )
    country = models.CharField(
        max_length=100,
        help_text="Country of registration"
    )
    jurisdiction = models.CharField(
        max_length=100,
        help_text="Legal jurisdiction"
    )
    entity_type = models.CharField(
        max_length=50,
        choices=EntityType.choices,
        help_text="Type of entity"
    )
    registration_number = models.CharField(
        max_length=100,
        help_text="Business registration number"
    )
    website = models.URLField(
        blank=True,
        null=True,
        help_text="Company website"
    )

    # Contact Information
    contact_person_name = models.CharField(
        max_length=255,
        help_text="Primary contact person"
    )
    contact_position = models.CharField(
        max_length=100,
        help_text="Position/title of contact person"
    )
    official_email = models.EmailField(
        help_text="Official contact email"
    )
    phone_number = models.CharField(
        max_length=30,
        help_text="Contact phone number"
    )

    # Financial Information
    approximate_liquidity_available = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Approximate liquidity available in USD"
    )
    preferred_currencies = models.JSONField(
        default=list,
        help_text="Preferred currencies for transactions"
    )
    average_transaction_size = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Average expected transaction size in USD"
    )

    # Operating Policy
    target_ready_properties = models.BooleanField(
        default=True,
        help_text="Interested in ready/completed properties"
    )
    target_under_construction = models.BooleanField(
        default=False,
        help_text="Interested in properties under construction"
    )
    target_property_portfolios = models.BooleanField(
        default=False,
        help_text="Interested in property portfolios"
    )
    expected_discount_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        help_text="Expected discount rate percentage"
    )
    max_per_transaction = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Maximum amount per transaction in USD"
    )
    max_per_month = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Maximum total amount per month in USD"
    )

    # Acknowledgments
    ack_independent_provider = models.BooleanField(
        default=False,
        help_text="Acknowledges operating as independent provider"
    )
    ack_no_exit_guarantee = models.BooleanField(
        default=False,
        help_text="Acknowledges no obligation to guarantee exits"
    )
    ack_compliance_agreement = models.BooleanField(
        default=False,
        help_text="Agrees to comply with platform terms"
    )

    # Status and Review
    status = models.CharField(
        max_length=20,
        choices=LPApplicationStatus.choices,
        default=LPApplicationStatus.PENDING
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_lp_applications'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(
        blank=True,
        help_text="Internal review notes"
    )
    rejection_reason = models.TextField(
        blank=True,
        help_text="Reason for rejection if applicable"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'LP Application'
        verbose_name_plural = 'LP Applications'

    def __str__(self):
        return f"{self.legal_entity_name} - {self.status}"

    def approve(self, reviewer, notes=''):
        """Approve the application and create a LiquidityProvider."""
        self.status = LPApplicationStatus.APPROVED
        self.reviewed_by = reviewer
        self.reviewed_at = timezone.now()
        self.review_notes = notes
        self.save()

        # Create the LiquidityProvider record
        lp = LiquidityProvider.objects.create(
            application=self,
            legal_entity_name=self.legal_entity_name,
            country=self.country,
            jurisdiction=self.jurisdiction,
            entity_type=self.entity_type,
            registration_number=self.registration_number,
            website=self.website,
            contact_person_name=self.contact_person_name,
            contact_position=self.contact_position,
            official_email=self.official_email,
            phone_number=self.phone_number,
            liquidity_available=self.approximate_liquidity_available,
            preferred_currencies=self.preferred_currencies,
            target_ready_properties=self.target_ready_properties,
            target_under_construction=self.target_under_construction,
            target_property_portfolios=self.target_property_portfolios,
            discount_rate=self.expected_discount_rate,
            max_per_transaction=self.max_per_transaction,
            max_per_month=self.max_per_month,
            status=LPStatus.PENDING,
            approved_at=timezone.now()
        )
        return lp

    def reject(self, reviewer, reason=''):
        """Reject the application."""
        self.status = LPApplicationStatus.REJECTED
        self.reviewed_by = reviewer
        self.reviewed_at = timezone.now()
        self.rejection_reason = reason
        self.save()


class LiquidityProvider(models.Model):
    """
    Liquidity Provider model.

    Represents an approved liquidity provider that can purchase
    tokens from investors wishing to exit.

    Important:
    - LP is NOT obligated to buy all requests
    - LP sets their own pricing and limits
    - LP does not guarantee permanent liquidity
    - LP operates as an independent third party
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    # Link to application
    application = models.OneToOneField(
        LPApplication,
        on_delete=models.PROTECT,
        related_name='liquidity_provider'
    )

    # Optional user account for dashboard access
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='liquidity_provider_profile'
    )

    # Entity Information (copied from application)
    legal_entity_name = models.CharField(max_length=255)
    country = models.CharField(max_length=100)
    jurisdiction = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=50, choices=EntityType.choices)
    registration_number = models.CharField(max_length=100)
    website = models.URLField(blank=True, null=True)

    # Contact Information
    contact_person_name = models.CharField(max_length=255)
    contact_position = models.CharField(max_length=100)
    official_email = models.EmailField()
    phone_number = models.CharField(max_length=30)

    # Financial Configuration
    liquidity_available = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Current liquidity available"
    )
    preferred_currencies = models.JSONField(default=list)

    # Target Assets
    target_ready_properties = models.BooleanField(default=True)
    target_under_construction = models.BooleanField(default=False)
    target_property_portfolios = models.BooleanField(default=False)

    # Operating Limits
    discount_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        help_text="Current discount rate offered"
    )
    max_per_transaction = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))]
    )
    max_per_month = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))]
    )

    # Monthly tracking
    current_month_total = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        default=Decimal('0'),
        help_text="Total amount processed this month"
    )
    month_reset_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date when monthly counter was last reset"
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=LPStatus.choices,
        default=LPStatus.PENDING
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    activated_at = models.DateTimeField(null=True, blank=True)
    suspended_at = models.DateTimeField(null=True, blank=True)
    suspension_reason = models.TextField(blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Liquidity Provider'
        verbose_name_plural = 'Liquidity Providers'

    def __str__(self):
        return f"{self.legal_entity_name} ({self.status})"

    def activate(self):
        """Activate the liquidity provider."""
        self.status = LPStatus.ACTIVE
        self.activated_at = timezone.now()
        self.save()

    def suspend(self, reason=''):
        """Suspend the liquidity provider."""
        self.status = LPStatus.SUSPENDED
        self.suspended_at = timezone.now()
        self.suspension_reason = reason
        self.save()

    def deactivate(self):
        """Deactivate the liquidity provider."""
        self.status = LPStatus.INACTIVE
        self.save()

    def check_monthly_limit(self, amount):
        """Check if amount is within monthly limit."""
        today = timezone.now().date()

        # Reset monthly counter if new month
        if self.month_reset_date is None or self.month_reset_date.month != today.month:
            self.current_month_total = Decimal('0')
            self.month_reset_date = today
            self.save()

        return (self.current_month_total + amount) <= self.max_per_month

    def check_transaction_limit(self, amount):
        """Check if amount is within per-transaction limit."""
        return amount <= self.max_per_transaction

    @property
    def remaining_monthly_capacity(self):
        """Get remaining monthly capacity."""
        return max(self.max_per_month - self.current_month_total, Decimal('0'))


class ExitRequest(models.Model):
    """
    Exit Request model.

    Represents a request from an investor to exit their investment
    through a liquidity provider.

    Important:
    - Exit is NOT guaranteed
    - Subject to LP approval and pricing
    - LP may offer different price than requested
    - Investor can cancel before completion
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    investor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='exit_requests'
    )

    investment = models.ForeignKey(
        'investments.Investment',
        on_delete=models.CASCADE,
        related_name='exit_requests'
    )

    liquidity_provider = models.ForeignKey(
        LiquidityProvider,
        on_delete=models.CASCADE,
        related_name='exit_requests'
    )

    # Request Details
    units_requested = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Number of units/tokens to exit"
    )
    requested_price_per_unit = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Price per unit requested by investor"
    )
    total_requested_amount = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Total amount requested (units * price)"
    )

    # LP Response
    offered_price_per_unit = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Price per unit offered by LP"
    )
    total_offered_amount = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Total amount offered by LP"
    )
    lp_notes = models.TextField(
        blank=True,
        help_text="Notes from LP regarding the request"
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=ExitRequestStatus.choices,
        default=ExitRequestStatus.PENDING
    )

    # Investor Acceptance
    investor_accepted_offer = models.BooleanField(
        null=True,
        blank=True,
        help_text="Whether investor accepted LP's offer"
    )
    investor_response_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the request/offer expires"
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Exit Request'
        verbose_name_plural = 'Exit Requests'

    def __str__(self):
        return f"Exit Request {self.id} - {self.status}"

    def calculate_discount(self):
        """Calculate the discount percentage offered by LP."""
        if self.offered_price_per_unit and self.requested_price_per_unit:
            discount = (
                (self.requested_price_per_unit - self.offered_price_per_unit)
                / self.requested_price_per_unit * 100
            )
            return round(discount, 2)
        return None

    def approve(self, offered_price_per_unit, notes=''):
        """LP approves the exit request with an offer."""
        self.status = ExitRequestStatus.APPROVED
        self.offered_price_per_unit = offered_price_per_unit
        self.total_offered_amount = offered_price_per_unit * self.units_requested
        self.lp_notes = notes
        self.processed_at = timezone.now()
        # Set expiry for investor response (e.g., 48 hours)
        self.expires_at = timezone.now() + timezone.timedelta(hours=48)
        self.save()

    def reject(self, notes=''):
        """LP rejects the exit request."""
        self.status = ExitRequestStatus.REJECTED
        self.lp_notes = notes
        self.processed_at = timezone.now()
        self.save()

    def cancel(self):
        """Investor cancels the exit request."""
        self.status = ExitRequestStatus.CANCELLED
        self.save()

    def accept_offer(self):
        """Investor accepts LP's offer."""
        self.investor_accepted_offer = True
        self.investor_response_at = timezone.now()
        self.save()

    def decline_offer(self):
        """Investor declines LP's offer."""
        self.investor_accepted_offer = False
        self.investor_response_at = timezone.now()
        self.status = ExitRequestStatus.CANCELLED
        self.save()


class LiquidityTransaction(models.Model):
    """
    Liquidity Transaction model.

    Records the completed transaction when an exit request
    is fulfilled by a liquidity provider.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    exit_request = models.OneToOneField(
        ExitRequest,
        on_delete=models.PROTECT,
        related_name='transaction'
    )

    liquidity_provider = models.ForeignKey(
        LiquidityProvider,
        on_delete=models.PROTECT,
        related_name='transactions'
    )

    investor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='lp_exit_transactions'
    )

    # Transaction Details
    units_purchased = models.PositiveIntegerField(
        help_text="Number of units/tokens purchased"
    )
    price_per_unit = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        help_text="Final price per unit"
    )
    total_amount = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        help_text="Total transaction amount"
    )

    # Fee Information
    platform_fee = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        default=Decimal('0'),
        help_text="Platform fee charged"
    )
    net_amount_to_investor = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        help_text="Net amount paid to investor"
    )

    # Reference
    reference_number = models.CharField(
        max_length=50,
        unique=True,
        help_text="Transaction reference number"
    )

    # Timestamps
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-completed_at']
        verbose_name = 'Liquidity Transaction'
        verbose_name_plural = 'Liquidity Transactions'

    def __str__(self):
        return f"Transaction {self.reference_number}"

    def save(self, *args, **kwargs):
        if not self.reference_number:
            # Generate reference number
            import random
            import string
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
            random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            self.reference_number = f"LPT-{timestamp}-{random_suffix}"
        super().save(*args, **kwargs)
