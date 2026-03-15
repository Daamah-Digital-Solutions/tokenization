"""
Property Models for Capimax Real Estate Tokenization Platform.

This module contains models for property management, tokenization,
and property-related operations including images, documents, and reviews.
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
import uuid
import logging


class PropertyType(models.TextChoices):
    """Property type choices."""
    RESIDENTIAL = 'residential', 'Residential'
    COMMERCIAL = 'commercial', 'Commercial'
    INDUSTRIAL = 'industrial', 'Industrial'
    MIXED_USE = 'mixed_use', 'Mixed Use'
    LAND = 'land', 'Land'


class PropertyCategory(models.TextChoices):
    """Property category choices based on investment model."""
    UNDER_CONSTRUCTION = 'under_construction', 'Under Construction'
    READY_PROPERTY = 'ready_property', 'Ready Property'


class PropertyStatus(models.TextChoices):
    """Property status choices throughout the lifecycle."""
    DRAFT = 'draft', 'Draft'
    PENDING_APPROVAL = 'pending_approval', 'Pending Approval'
    APPROVED = 'approved', 'Approved'
    ACTIVE = 'active', 'Active'
    TOKENIZED = 'tokenized', 'Tokenized'
    UNDER_CONSTRUCTION = 'under_construction', 'Under Construction'
    SOLD_OUT = 'sold_out', 'Sold Out'
    CLOSED = 'closed', 'Closed'
    DELISTED = 'delisted', 'Delisted'


class Property(models.Model):
    """
    Core Property model for real estate tokenization.
    
    Represents a real estate property that can be tokenized
    and offered for fractional investment.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the property"
    )
    
    title = models.CharField(
        max_length=255,
        help_text="Property title/name"
    )
    
    description = models.TextField(
        help_text="Detailed description of the property"
    )
    
    property_type = models.CharField(
        max_length=20,
        choices=PropertyType.choices,
        help_text="Type of property"
    )
    
    status = models.CharField(
        max_length=20,
        choices=PropertyStatus.choices,
        default=PropertyStatus.DRAFT,
        help_text="Current status of the property"
    )
    
    total_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Total property value in USD"
    )
    
    token_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Price per token in USD"
    )
    
    total_tokens = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Total number of tokens for this property"
    )
    
    tokens_sold = models.PositiveIntegerField(
        default=0,
        help_text="Number of tokens already sold"
    )
    
    expected_return = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text="Expected annual return percentage"
    )
    
    rental_yield = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text="Annual rental yield percentage"
    )
    
    # Property Category Fields
    property_category = models.CharField(
        max_length=20,
        choices=PropertyCategory.choices,
        default=PropertyCategory.READY_PROPERTY,
        help_text="Investment category - construction vs ready property"
    )
    
    # Construction-specific fields
    expected_completion_date = models.DateField(
        null=True,
        blank=True,
        help_text="Expected completion date for construction properties"
    )
    
    construction_progress = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text="Construction completion percentage"
    )
    
    # Ready property specific fields
    rental_income_active = models.BooleanField(
        default=False,
        help_text="Whether property is actively generating rental income"
    )
    
    monthly_rental_income = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Current monthly rental income"
    )
    
    occupancy_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('100.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text="Current occupancy rate percentage"
    )
    
    # Investment model fields
    supports_installments = models.BooleanField(
        default=False,
        help_text="Whether property supports installment payments"
    )
    
    installment_period_months = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(120)],
        help_text="Maximum installment period in months"
    )
    
    property_size = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Property size in square feet"
    )
    
    year_built = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1800), MaxValueValidator(2100)],
        help_text="Year the property was built"
    )
    
    address = models.TextField(
        help_text="Full property address"
    )
    
    city = models.CharField(
        max_length=100,
        help_text="Property city"
    )
    
    state = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Property state/province"
    )
    
    country = models.CharField(
        max_length=100,
        help_text="Property country"
    )
    
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        null=True,
        blank=True,
        help_text="Property latitude coordinate"
    )
    
    longitude = models.DecimalField(
        max_digits=11,
        decimal_places=8,
        null=True,
        blank=True,
        help_text="Property longitude coordinate"
    )
    
    smart_contract_address = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Blockchain smart contract address"
    )
    
    owner = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='owned_properties',
        help_text="Property owner"
    )
    
    featured = models.BooleanField(
        default=False,
        help_text="Whether property is featured"
    )

    minimum_investment = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Minimum investment amount"
    )

    # SPV (Special Purpose Vehicle) fields
    spv_company_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="SPV company name for this property"
    )
    spv_registration_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="SPV registration/license number"
    )
    spv_bank_account_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="SPV dedicated bank account number"
    )
    spv_bank_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="SPV bank name"
    )
    spv_establishment_date = models.DateField(
        blank=True,
        null=True,
        help_text="Date the SPV was legally established"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'properties_property'
        indexes = [
            models.Index(fields=['status', 'property_type']),
            models.Index(fields=['city', 'country']),
            models.Index(fields=['created_at']),
            models.Index(fields=['featured', 'status']),
            models.Index(fields=['owner']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(tokens_sold__lte=models.F('total_tokens')),
                name='tokens_sold_not_exceed_total'
            ),
            models.CheckConstraint(
                check=models.Q(total_value__gt=0),
                name='total_value_positive'
            ),
            models.CheckConstraint(
                check=models.Q(token_price__gt=0),
                name='token_price_positive'
            ),
        ]
        verbose_name = 'Property'
        verbose_name_plural = 'Properties'

    def __str__(self):
        return f"{self.title} ({self.city}, {self.country})"
    
    @property
    def tokens_available(self):
        """Get number of available tokens for purchase."""
        return self.total_tokens - self.tokens_sold
    
    @property
    def funding_percentage(self):
        """Get funding completion percentage."""
        if self.total_tokens == 0:
            return Decimal('0.00')
        percentage = (Decimal(self.tokens_sold) / Decimal(self.total_tokens)) * 100
        return percentage.quantize(Decimal('0.01'))
    
    @property
    def is_fully_funded(self):
        """Check if property is fully funded."""
        return self.tokens_sold >= self.total_tokens
    
    @property
    def can_accept_investments(self):
        """Check if property can accept new investments."""
        return (
            self.status in [PropertyStatus.ACTIVE, PropertyStatus.TOKENIZED] and
            not self.is_fully_funded
        )
    
    @property
    def is_under_construction(self):
        """Check if property is under construction."""
        return self.property_category == PropertyCategory.UNDER_CONSTRUCTION
    
    @property
    def is_ready_property(self):
        """Check if property is ready for income."""
        return self.property_category == PropertyCategory.READY_PROPERTY
    
    @property
    def estimated_monthly_return(self):
        """Calculate estimated monthly return for ready properties."""
        if self.is_ready_property and self.monthly_rental_income and self.total_value:
            return (self.monthly_rental_income / self.total_value) * 100
        return Decimal('0.00')
    
    @property
    def construction_status_display(self):
        """Get construction status display."""
        if self.is_under_construction:
            if self.construction_progress >= 100:
                return "Construction Complete"
            elif self.construction_progress >= 75:
                return "Nearly Complete"
            elif self.construction_progress >= 50:
                return "Half Complete"
            elif self.construction_progress >= 25:
                return "In Progress"
            else:
                return "Just Started"
        return "N/A"
    
    def calculate_investment_amount(self, token_count):
        """Calculate total investment amount for given token count."""
        return self.token_price * Decimal(token_count)


class PropertyImage(models.Model):
    """
    Property image storage with ordering and primary image designation.
    """
    
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='images',
        help_text="Property this image belongs to"
    )
    
    image = models.ImageField(
        upload_to='property_images/',
        help_text="Property image file"
    )
    
    caption = models.CharField(
        max_length=255,
        blank=True,
        help_text="Image caption"
    )
    
    is_primary = models.BooleanField(
        default=False,
        help_text="Whether this is the primary property image"
    )
    
    order = models.PositiveIntegerField(
        default=0,
        help_text="Display order of the image"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'properties_property_image'
        ordering = ['order', 'created_at']
        indexes = [
            models.Index(fields=['property', 'is_primary']),
            models.Index(fields=['order']),
        ]
        verbose_name = 'Property Image'
        verbose_name_plural = 'Property Images'

    def __str__(self):
        return f"Image for {self.property.title}"


class DocumentType(models.TextChoices):
    """Document type choices for Data Room."""
    OWNERSHIP = 'ownership', 'Ownership & Title'
    VALUATION = 'valuation', 'Valuation Report'
    INSURANCE = 'insurance', 'Insurance Policy'
    SPV = 'spv', 'SPV Documents'
    MANAGEMENT = 'management', 'Property Management'
    FINANCIAL = 'financial', 'Financial Report'
    LEGAL = 'legal', 'Legal Documents'
    TECHNICAL = 'technical', 'Technical Documents'
    OTHER = 'other', 'Other'


class PropertyDocument(models.Model):
    """
    Enhanced property document storage for Data Room functionality.

    Supports version control, access permissions, and audit trail
    for legal and informational documents.
    """

    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='documents',
        help_text="Property this document belongs to"
    )

    name = models.CharField(
        max_length=255,
        help_text="Document name"
    )

    document = models.FileField(
        upload_to='property_documents/',
        help_text="Document file"
    )

    document_type = models.CharField(
        max_length=100,
        choices=DocumentType.choices,
        default=DocumentType.OTHER,
        help_text="Type of document (ownership, valuation, insurance, spv, management, financial, other)"
    )

    description = models.TextField(
        blank=True,
        help_text="Document description"
    )

    size = models.PositiveIntegerField(
        help_text="File size in bytes"
    )

    # Version control fields
    version = models.PositiveIntegerField(
        default=1,
        help_text="Document version number"
    )

    is_latest = models.BooleanField(
        default=True,
        help_text="Whether this is the latest version of the document"
    )

    # Audit trail fields
    uploaded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_documents',
        help_text="User who uploaded this document"
    )

    uploaded_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    # Access control fields
    is_public = models.BooleanField(
        default=False,
        help_text="Whether this document is publicly accessible"
    )

    investor_access = models.BooleanField(
        default=True,
        help_text="Whether verified investors can access this document"
    )

    class Meta:
        db_table = 'properties_property_document'
        indexes = [
            models.Index(fields=['property', 'document_type']),
            models.Index(fields=['uploaded_at']),
            models.Index(fields=['property', 'name', 'is_latest']),
        ]
        verbose_name = 'Property Document'
        verbose_name_plural = 'Property Documents'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.name} v{self.version} for {self.property.title}"

    def save(self, *args, **kwargs):
        """Override save to handle version control."""
        if not self.pk:  # New document
            # Check if there's an existing document with same name for this property
            existing = PropertyDocument.objects.filter(
                property=self.property,
                name=self.name,
                is_latest=True
            ).first()

            if existing:
                # Mark existing as not latest
                existing.is_latest = False
                existing.save(update_fields=['is_latest'])
                # Set new version number
                self.version = existing.version + 1

        super().save(*args, **kwargs)


class PropertyUpdate(models.Model):
    """
    Property updates and announcements for investors.
    """
    
    UPDATE_TYPES = [
        ('general', 'General'),
        ('financial', 'Financial'),
        ('construction', 'Construction'),
        ('legal', 'Legal'),
    ]
    
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='updates',
        help_text="Property this update belongs to"
    )
    
    title = models.CharField(
        max_length=255,
        help_text="Update title"
    )
    
    content = models.TextField(
        help_text="Update content"
    )
    
    update_type = models.CharField(
        max_length=20,
        choices=UPDATE_TYPES,
        help_text="Type of update"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'properties_property_update'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['property', 'update_type']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'Property Update'
        verbose_name_plural = 'Property Updates'

    def __str__(self):
        return f"Update: {self.title} for {self.property.title}"


class PropertySubscription(models.Model):
    """
    User subscriptions to property updates and notifications.
    """
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        help_text="User subscribing to updates"
    )
    
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        help_text="Property being subscribed to"
    )
    
    subscribed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'properties_property_subscription'
        unique_together = ('user', 'property')
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['property']),
        ]
        verbose_name = 'Property Subscription'
        verbose_name_plural = 'Property Subscriptions'

    def __str__(self):
        return f"{self.user.email} subscribed to {self.property.title}"


class PropertyReview(models.Model):
    """
    Property reviews and ratings from investors.
    """
    
    RATING_CHOICES = [(i, i) for i in range(1, 6)]
    
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='reviews',
        help_text="Property being reviewed"
    )
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        help_text="User writing the review"
    )
    
    rating = models.PositiveIntegerField(
        choices=RATING_CHOICES,
        help_text="Rating from 1 to 5 stars"
    )
    
    review = models.TextField(
        help_text="Review text"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'properties_property_review'
        unique_together = ('property', 'user')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['property', 'rating']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'Property Review'
        verbose_name_plural = 'Property Reviews'

    def __str__(self):
        return f"Review by {self.user.email} for {self.property.title} ({self.rating}/5)"


class PropertyValuation(models.Model):
    """
    Property valuations and appraisals over time.
    """
    
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='valuations',
        help_text="Property being valued"
    )
    
    current_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Current appraised value"
    )
    
    valuation_date = models.DateTimeField(
        help_text="Date of valuation"
    )
    
    valuation_method = models.CharField(
        max_length=100,
        help_text="Method used for valuation"
    )
    
    appraiser = models.CharField(
        max_length=255,
        help_text="Name of appraiser or valuation company"
    )
    
    report = models.FileField(
        upload_to='valuation_reports/',
        null=True,
        blank=True,
        help_text="Valuation report document"
    )
    
    notes = models.TextField(
        blank=True,
        help_text="Additional notes about the valuation"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'properties_property_valuation'
        ordering = ['-valuation_date']
        indexes = [
            models.Index(fields=['property', 'valuation_date']),
            models.Index(fields=['valuation_date']),
        ]
        verbose_name = 'Property Valuation'
        verbose_name_plural = 'Property Valuations'

    def __str__(self):
        return f"Valuation for {self.property.title} - ${self.current_value} ({self.valuation_date.date()})"


class PropertyAnalytics(models.Model):
    """
    Property analytics and performance tracking.
    """
    
    property = models.OneToOneField(
        Property,
        on_delete=models.CASCADE,
        related_name='analytics',
        help_text="Property these analytics belong to"
    )
    
    total_views = models.PositiveIntegerField(
        default=0,
        help_text="Total number of property page views"
    )
    
    unique_views = models.PositiveIntegerField(
        default=0,
        help_text="Number of unique visitors to property page"
    )
    
    total_subscriptions = models.PositiveIntegerField(
        default=0,
        help_text="Total number of subscriptions to property updates"
    )
    
    conversion_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text="Conversion rate from views to investments"
    )
    
    average_investment_size = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Average investment amount for this property"
    )
    
    funding_velocity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Tokens sold per day (funding velocity)"
    )
    
    roi_actual = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Actual ROI achieved"
    )
    
    market_performance_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('10.00'))],
        help_text="Market performance score (0-10)"
    )
    
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'properties_property_analytics'
        verbose_name = 'Property Analytics'
        verbose_name_plural = 'Property Analytics'

    def __str__(self):
        return f"Analytics for {self.property.title}"


class PropertyViewLog(models.Model):
    """
    Log of property page views for analytics.
    """
    
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='view_logs',
        help_text="Property that was viewed"
    )
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="User who viewed the property (if authenticated)"
    )
    
    ip_address = models.GenericIPAddressField(
        help_text="IP address of the viewer"
    )
    
    user_agent = models.TextField(
        blank=True,
        help_text="User agent string"
    )
    
    referrer = models.URLField(
        blank=True,
        help_text="Referrer URL"
    )
    
    session_key = models.CharField(
        max_length=40,
        blank=True,
        help_text="Session key for anonymous users"
    )
    
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'properties_property_view_log'
        indexes = [
            models.Index(fields=['property', 'viewed_at']),
            models.Index(fields=['user', 'viewed_at']),
            models.Index(fields=['ip_address', 'viewed_at']),
        ]
        verbose_name = 'Property View Log'
        verbose_name_plural = 'Property View Logs'

    def __str__(self):
        return f"View of {self.property.title} at {self.viewed_at}"


class PropertyApproval(models.Model):
    """
    Property approval workflow tracking.
    """
    
    APPROVAL_STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('requires_changes', 'Requires Changes'),
    ]
    
    property = models.OneToOneField(
        Property,
        on_delete=models.CASCADE,
        related_name='approval',
        help_text="Property being reviewed for approval"
    )
    
    status = models.CharField(
        max_length=20,
        choices=APPROVAL_STATUS_CHOICES,
        default='pending',
        help_text="Current approval status"
    )
    
    reviewer = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='property_reviews',
        help_text="Admin user reviewing the property"
    )
    
    review_notes = models.TextField(
        blank=True,
        help_text="Notes from the reviewer"
    )
    
    required_changes = models.TextField(
        blank=True,
        help_text="Changes required before approval"
    )
    
    submitted_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the property was submitted for approval"
    )
    
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the property was reviewed"
    )
    
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the property was approved"
    )

    class Meta:
        db_table = 'properties_property_approval'
        indexes = [
            models.Index(fields=['status', 'submitted_at']),
            models.Index(fields=['reviewer']),
        ]
        verbose_name = 'Property Approval'
        verbose_name_plural = 'Property Approvals'

    def __str__(self):
        return f"Approval for {self.property.title} - {self.status}"

    def save(self, *args, **kwargs):
        """Override save to send property status update emails when status changes."""
        is_new = self.pk is None
        old_status = None

        if not is_new:
            # Get the old status before saving
            try:
                old_instance = PropertyApproval.objects.get(pk=self.pk)
                old_status = old_instance.status
            except PropertyApproval.DoesNotExist:
                pass

        # Update timestamps based on status changes
        if self.status in ['approved', 'rejected'] and not self.reviewed_at:
            self.reviewed_at = timezone.now()

        if self.status == 'approved' and not self.approved_at:
            self.approved_at = timezone.now()

        super().save(*args, **kwargs)

        # Send email notifications for status changes (but not for initial creation)
        if not is_new and old_status and old_status != self.status:
            self._send_status_update_email(old_status)

    def _send_status_update_email(self, old_status):
        """Send property status update email to the property owner."""
        try:
            from core.services.email_service import EmailService

            property_details = {
                'title': self.property.title,
                'location': f"{self.property.city}, {self.property.country}",
                'submission_date': self.submitted_at.strftime('%B %d, %Y')
            }

            status_update = {
                'status': self.status,
                'new_status': dict(self.APPROVAL_STATUS_CHOICES).get(self.status, self.status.title()),
                'previous_status': dict(self.APPROVAL_STATUS_CHOICES).get(old_status, old_status.title()),
                'description': self._get_status_description(),
                'reviewer': self.reviewer.get_full_name() if self.reviewer else 'Property Review Team',
                'notes': self.review_notes or 'No additional notes provided.'
            }

            EmailService.send_property_status_update_email(
                user=self.property.owner,
                property_details=property_details,
                status_update=status_update
            )
            logging.getLogger(__name__).info(f"Property status update email sent for property {self.property.id}")
        except Exception as e:
            logging.getLogger(__name__).error(f"Failed to send property status update email for property {self.property.id}: {str(e)}")

    def _get_status_description(self):
        """Get a description based on the current status."""
        descriptions = {
            'approved': 'Your property has been approved and is ready for tokenization.',
            'rejected': 'Your property submission has been rejected. Please review the feedback and consider resubmitting.',
            'requires_changes': 'Your property requires some changes before approval. Please review the required changes and resubmit.',
            'under_review': 'Your property is currently under review by our team.',
            'pending': 'Your property submission is pending review.'
        }
        return descriptions.get(self.status, 'Property status has been updated.')


class RentalIncomeDistribution(models.Model):
    """
    Rental income distribution records for ready properties.
    
    Tracks monthly rental income distributions to token holders
    for properties that are generating rental income.
    """
    
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='rental_distributions',
        help_text="Property generating the rental income"
    )
    
    distribution_period = models.CharField(
        max_length=7,  # Format: YYYY-MM
        help_text="Distribution period in YYYY-MM format"
    )
    
    total_rental_income = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Total rental income collected for the period"
    )
    
    platform_fee = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Platform management fee deducted"
    )
    
    net_distribution_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Net amount distributed to token holders"
    )
    
    tokens_eligible = models.PositiveIntegerField(
        help_text="Number of tokens eligible for distribution"
    )
    
    amount_per_token = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        validators=[MinValueValidator(Decimal('0.00000001'))],
        help_text="Distribution amount per token"
    )
    
    distribution_date = models.DateTimeField(
        auto_now_add=True,
        help_text="Date when distribution was processed"
    )
    
    notes = models.TextField(
        blank=True,
        help_text="Additional notes about the distribution"
    )

    class Meta:
        db_table = 'properties_rental_income_distribution'
        unique_together = ('property', 'distribution_period')
        indexes = [
            models.Index(fields=['property', 'distribution_period']),
            models.Index(fields=['distribution_date']),
        ]
        verbose_name = 'Rental Income Distribution'
        verbose_name_plural = 'Rental Income Distributions'
        ordering = ['-distribution_period']

    def __str__(self):
        return f"Rental distribution for {self.property.title} - {self.distribution_period}"
    
    def save(self, *args, **kwargs):
        """Calculate net distribution amount and amount per token before saving."""
        if not self.net_distribution_amount:
            self.net_distribution_amount = self.total_rental_income - self.platform_fee
        
        if self.tokens_eligible > 0 and not self.amount_per_token:
            self.amount_per_token = self.net_distribution_amount / Decimal(self.tokens_eligible)
        
        super().save(*args, **kwargs)


class PropertyMarketData(models.Model):
    """
    Market data and comparable properties analysis.
    """
    
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='market_data',
        help_text="Property this market data belongs to"
    )
    
    comparable_sales_avg = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Average price of comparable sales"
    )
    
    market_appreciation_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Annual market appreciation rate"
    )
    
    rental_market_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Market rental rate per month"
    )
    
    vacancy_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text="Local vacancy rate percentage"
    )
    
    price_per_sqft = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Price per square foot"
    )
    
    neighborhood_score = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.0')), MaxValueValidator(Decimal('10.0'))],
        help_text="Neighborhood desirability score (0-10)"
    )
    
    data_source = models.CharField(
        max_length=255,
        help_text="Source of the market data"
    )
    
    data_date = models.DateField(
        help_text="Date of the market data"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'properties_property_market_data'
        ordering = ['-data_date']
        indexes = [
            models.Index(fields=['property', 'data_date']),
            models.Index(fields=['data_date']),
        ]
        verbose_name = 'Property Market Data'
        verbose_name_plural = 'Property Market Data'

    def __str__(self):
        return f"Market data for {self.property.title} ({self.data_date})"


class ConstructionInstallment(models.Model):
    """
    Installment payment tracking for construction properties.

    Allows investors to pay for their property investments in installments
    over a specified period, particularly useful for under-construction properties.
    """
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]
    
    FREQUENCY_CHOICES = [
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('semi_annual', 'Semi-Annual'),
        ('annual', 'Annual'),
        ('custom', 'Custom'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the installment payment"
    )
    
    property_investment = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='installment_payments',
        null=True,
        help_text="Property for which installment is being paid"
    )
    
    investor = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='property_installments',
        help_text="Investor making the installment payments"
    )
    
    # Investment Details
    total_investment_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Total amount to be invested over time"
    )
    
    token_allocation = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Number of tokens allocated for this installment plan"
    )
    
    # Installment Configuration
    installment_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Amount per installment payment"
    )
    
    total_installments = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(120)],
        help_text="Total number of installment payments"
    )
    
    frequency = models.CharField(
        max_length=20,
        choices=FREQUENCY_CHOICES,
        default='monthly',
        help_text="Payment frequency"
    )
    
    # Payment Tracking
    payments_made = models.PositiveIntegerField(
        default=0,
        help_text="Number of payments successfully made"
    )
    
    total_amount_paid = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Total amount paid so far"
    )
    
    tokens_released = models.PositiveIntegerField(
        default=0,
        help_text="Number of tokens released to investor"
    )
    
    # Schedule and Status
    next_payment_date = models.DateField(
        help_text="Date of next scheduled payment"
    )
    
    completion_date = models.DateField(
        null=True,
        blank=True,
        help_text="Expected or actual completion date"
    )
    
    status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='pending',
        help_text="Current status of the installment plan"
    )
    
    # Graduated Release Configuration
    graduated_release = models.BooleanField(
        default=True,
        help_text="Whether tokens are released gradually with each payment"
    )
    
    tokens_per_payment = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Tokens released per successful payment (can be fractional)"
    )
    
    # Additional Configuration
    early_completion_discount = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('25.00'))],
        help_text="Discount percentage for early completion"
    )
    
    late_payment_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Fee charged for late payments"
    )
    
    grace_period_days = models.PositiveIntegerField(
        default=7,
        validators=[MinValueValidator(1), MaxValueValidator(30)],
        help_text="Grace period for payments before late fees apply"
    )
    
    # Metadata
    notes = models.TextField(
        blank=True,
        help_text="Additional notes about the installment plan"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'properties_installment_payment'
        indexes = [
            models.Index(fields=['property_investment', 'investor']),
            models.Index(fields=['status', 'next_payment_date']),
            models.Index(fields=['investor', 'status']),
            models.Index(fields=['next_payment_date']),
            models.Index(fields=['created_at']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(total_amount_paid__lte=models.F('total_investment_amount')),
                name='installment_paid_not_exceed_total'
            ),
            models.CheckConstraint(
                check=models.Q(payments_made__lte=models.F('total_installments')),
                name='installment_payments_not_exceed_total'
            ),
            models.CheckConstraint(
                check=models.Q(tokens_released__lte=models.F('token_allocation')),
                name='installment_tokens_not_exceed_allocation'
            ),
        ]
        verbose_name = 'Installment Payment'
        verbose_name_plural = 'Installment Payments'
    
    def __str__(self):
        return f"Installment plan for {self.investor.email} - {self.property_investment.title}"
    
    @property
    def remaining_amount(self):
        """Calculate remaining amount to be paid."""
        return self.total_investment_amount - self.total_amount_paid
    
    @property
    def remaining_payments(self):
        """Calculate remaining number of payments."""
        return self.total_installments - self.payments_made
    
    @property
    def completion_percentage(self):
        """Calculate completion percentage based on payments made."""
        if self.total_installments == 0:
            return Decimal('0.00')
        percentage = (Decimal(self.payments_made) / Decimal(self.total_installments)) * 100
        return percentage.quantize(Decimal('0.01'))
    
    @property
    def tokens_pending_release(self):
        """Calculate tokens pending release."""
        return self.token_allocation - self.tokens_released
    
    @property
    def is_completed(self):
        """Check if installment plan is completed."""
        return self.payments_made >= self.total_installments or self.total_amount_paid >= self.total_investment_amount
    
    @property
    def is_active(self):
        """Check if installment plan is active."""
        return self.status in ['pending', 'processing'] and not self.is_completed
    
    @property
    def next_token_release_amount(self):
        """Calculate tokens to be released with next payment."""
        if self.graduated_release and self.tokens_per_payment:
            return min(self.tokens_per_payment, self.tokens_pending_release)
        elif not self.graduated_release and self.is_completed:
            return self.tokens_pending_release
        return Decimal('0.00')
    
    def calculate_tokens_per_payment(self):
        """Calculate tokens to release per payment."""
        if self.graduated_release and self.total_installments > 0:
            return Decimal(self.token_allocation) / Decimal(self.total_installments)
        return Decimal('0.00')
    
    def can_make_payment(self):
        """Check if a payment can be made."""
        from django.utils import timezone
        return (
            self.is_active and 
            self.remaining_payments > 0 and 
            timezone.now().date() >= self.next_payment_date
        )
    
    def calculate_next_payment_date(self, from_date=None):
        """Calculate the next payment date based on frequency."""
        from django.utils import timezone
        from dateutil.relativedelta import relativedelta
        
        if not from_date:
            from_date = timezone.now().date()
        
        if self.frequency == 'monthly':
            return from_date + relativedelta(months=1)
        elif self.frequency == 'quarterly':
            return from_date + relativedelta(months=3)
        elif self.frequency == 'semi_annual':
            return from_date + relativedelta(months=6)
        elif self.frequency == 'annual':
            return from_date + relativedelta(months=12)
        else:  # custom
            return from_date + relativedelta(months=1)  # Default to monthly
    
    def process_payment(self, amount, payment_date=None):
        """
        Process a payment and update the installment status.
        Returns (success: bool, message: str, tokens_released: Decimal)
        """
        from django.utils import timezone
        
        if not payment_date:
            payment_date = timezone.now().date()
        
        if not self.can_make_payment():
            return False, "Payment cannot be processed at this time", Decimal('0.00')
        
        if amount < self.installment_amount:
            return False, f"Payment amount must be at least ${self.installment_amount}", Decimal('0.00')
        
        # Process the payment
        self.total_amount_paid += Decimal(str(amount))
        self.payments_made += 1
        
        # Release tokens if graduated release is enabled
        tokens_to_release = Decimal('0.00')
        if self.graduated_release:
            tokens_to_release = self.next_token_release_amount
            self.tokens_released += int(tokens_to_release)
        
        # Update next payment date
        self.next_payment_date = self.calculate_next_payment_date(payment_date)
        
        # Update status if completed
        if self.is_completed:
            self.status = 'completed'
            self.completion_date = payment_date
            
            # Release any remaining tokens for non-graduated release
            if not self.graduated_release:
                tokens_to_release = self.tokens_pending_release
                self.tokens_released = self.token_allocation
        
        self.save()
        return True, "Payment processed successfully", tokens_to_release
    
    def save(self, *args, **kwargs):
        """Calculate tokens per payment before saving."""
        if self.graduated_release and not self.tokens_per_payment:
            self.tokens_per_payment = self.calculate_tokens_per_payment()
        
        super().save(*args, **kwargs)

