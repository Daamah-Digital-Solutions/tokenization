"""
Construction Milestone Models for Capimax Real Estate Tokenization Platform.

This module contains models for construction milestone tracking,
progress monitoring, and construction-related operations.
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
import uuid


class MilestoneStatus(models.TextChoices):
    """Construction milestone status choices."""
    PENDING = 'pending', 'Pending'
    IN_PROGRESS = 'in_progress', 'In Progress'
    COMPLETED = 'completed', 'Completed'
    VERIFIED = 'verified', 'Verified'
    DELAYED = 'delayed', 'Delayed'
    CANCELLED = 'cancelled', 'Cancelled'


class MilestoneCategory(models.TextChoices):
    """Construction milestone category choices."""
    FOUNDATION = 'foundation', 'Foundation'
    STRUCTURE = 'structure', 'Structure'
    ROOFING = 'roofing', 'Roofing'
    PLUMBING = 'plumbing', 'Plumbing'
    ELECTRICAL = 'electrical', 'Electrical'
    INTERIOR = 'interior', 'Interior'
    EXTERIOR = 'exterior', 'Exterior'
    LANDSCAPING = 'landscaping', 'Landscaping'
    FINAL_INSPECTION = 'final_inspection', 'Final Inspection'
    OCCUPANCY = 'occupancy', 'Occupancy'


class ConstructionMilestone(models.Model):
    """
    Construction milestone model for tracking property construction progress.
    
    Represents specific milestones in the construction process that need
    to be completed and verified.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the milestone"
    )
    
    property_obj = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        related_name='construction_milestones',
        help_text="Property this milestone belongs to"
    )
    
    title = models.CharField(
        max_length=255,
        help_text="Milestone title"
    )
    
    description = models.TextField(
        help_text="Detailed description of the milestone"
    )
    
    category = models.CharField(
        max_length=20,
        choices=MilestoneCategory.choices,
        help_text="Category of the milestone"
    )
    
    status = models.CharField(
        max_length=20,
        choices=MilestoneStatus.choices,
        default=MilestoneStatus.PENDING,
        help_text="Current status of the milestone"
    )
    
    planned_start_date = models.DateField(
        help_text="Planned start date for the milestone"
    )
    
    planned_completion_date = models.DateField(
        help_text="Planned completion date for the milestone"
    )
    
    actual_start_date = models.DateField(
        null=True,
        blank=True,
        help_text="Actual start date of the milestone"
    )
    
    actual_completion_date = models.DateField(
        null=True,
        blank=True,
        help_text="Actual completion date of the milestone"
    )
    
    progress_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text="Progress percentage (0-100)"
    )
    
    estimated_cost = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Estimated cost for this milestone"
    )
    
    actual_cost = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Actual cost for this milestone"
    )
    
    contractor = models.CharField(
        max_length=255,
        blank=True,
        help_text="Contractor responsible for this milestone"
    )
    
    inspector = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='inspected_milestones',
        help_text="Inspector who verified this milestone"
    )
    
    inspection_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date and time of inspection"
    )
    
    inspection_notes = models.TextField(
        blank=True,
        help_text="Inspector's notes and comments"
    )
    
    order = models.PositiveIntegerField(
        default=0,
        help_text="Order of this milestone in the construction sequence"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'construction_milestone'
        ordering = ['order', 'planned_start_date']
        indexes = [
            models.Index(fields=['property_obj', 'status']),
            models.Index(fields=['category', 'status']),
            models.Index(fields=['planned_start_date']),
            models.Index(fields=['planned_completion_date']),
            models.Index(fields=['order']),
        ]
        verbose_name = 'Construction Milestone'
        verbose_name_plural = 'Construction Milestones'

    def __str__(self):
        return f"{self.title} - {self.property_obj.title} ({self.status})"
    
    @property
    def is_delayed(self):
        """Check if milestone is delayed."""
        from django.utils import timezone
        if self.planned_completion_date and not self.actual_completion_date:
            return timezone.now().date() > self.planned_completion_date
        return False
    
    @property
    def days_delayed(self):
        """Get number of days the milestone is delayed."""
        from django.utils import timezone
        if self.is_delayed:
            return (timezone.now().date() - self.planned_completion_date).days
        return 0


class MilestoneUpdate(models.Model):
    """
    Updates and progress reports for construction milestones.
    """
    
    milestone = models.ForeignKey(
        ConstructionMilestone,
        on_delete=models.CASCADE,
        related_name='updates',
        help_text="Milestone this update belongs to"
    )
    
    title = models.CharField(
        max_length=255,
        help_text="Update title"
    )
    
    description = models.TextField(
        help_text="Update description"
    )
    
    progress_change = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('-100.00')), MaxValueValidator(Decimal('100.00'))],
        help_text="Change in progress percentage"
    )
    
    author = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        help_text="User who created this update"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'construction_milestone_update'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['milestone', 'created_at']),
            models.Index(fields=['author']),
        ]
        verbose_name = 'Milestone Update'
        verbose_name_plural = 'Milestone Updates'

    def __str__(self):
        return f"Update: {self.title} for {self.milestone.title}"


class MilestoneImage(models.Model):
    """
    Images for construction milestones showing progress.
    """
    
    milestone = models.ForeignKey(
        ConstructionMilestone,
        on_delete=models.CASCADE,
        related_name='images',
        help_text="Milestone this image belongs to"
    )
    
    image = models.ImageField(
        upload_to='milestone_images/',
        help_text="Milestone progress image"
    )
    
    caption = models.CharField(
        max_length=255,
        blank=True,
        help_text="Image caption"
    )
    
    taken_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the image was taken"
    )
    
    uploaded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        help_text="User who uploaded this image"
    )

    class Meta:
        db_table = 'construction_milestone_image'
        ordering = ['-taken_at']
        indexes = [
            models.Index(fields=['milestone', 'taken_at']),
            models.Index(fields=['uploaded_by']),
        ]
        verbose_name = 'Milestone Image'
        verbose_name_plural = 'Milestone Images'

    def __str__(self):
        return f"Image for {self.milestone.title}"


class MilestoneDocument(models.Model):
    """
    Documents related to construction milestones (permits, certificates, etc.).
    """
    
    milestone = models.ForeignKey(
        ConstructionMilestone,
        on_delete=models.CASCADE,
        related_name='documents',
        help_text="Milestone this document belongs to"
    )
    
    name = models.CharField(
        max_length=255,
        help_text="Document name"
    )
    
    document = models.FileField(
        upload_to='milestone_documents/',
        help_text="Document file"
    )
    
    document_type = models.CharField(
        max_length=100,
        help_text="Type of document (e.g., permit, certificate, inspection_report)"
    )
    
    description = models.TextField(
        blank=True,
        help_text="Document description"
    )
    
    size = models.PositiveIntegerField(
        help_text="File size in bytes"
    )
    
    uploaded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        help_text="User who uploaded this document"
    )
    
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'construction_milestone_document'
        indexes = [
            models.Index(fields=['milestone', 'document_type']),
            models.Index(fields=['uploaded_at']),
        ]
        verbose_name = 'Milestone Document'
        verbose_name_plural = 'Milestone Documents'

    def __str__(self):
        return f"{self.name} for {self.milestone.title}"
