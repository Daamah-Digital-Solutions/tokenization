"""
Analytics Models for Capimax Real Estate Tokenization Platform.

This module contains models for analytics tracking, performance metrics,
event logging, and automated report generation.
"""

from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.utils import timezone
from django.core.serializers.json import DjangoJSONEncoder
from decimal import Decimal
import uuid
import json


class EventType(models.TextChoices):
    """Analytics event type choices."""
    USER_ACTION = 'user_action', 'User Action'
    INVESTMENT = 'investment', 'Investment'
    PROPERTY_VIEW = 'property_view', 'Property View'
    PAGE_VIEW = 'page_view', 'Page View'
    CONVERSION = 'conversion', 'Conversion'
    ERROR = 'error', 'Error'
    PERFORMANCE = 'performance', 'Performance'
    SECURITY = 'security', 'Security'


class ReportType(models.TextChoices):
    """Report type choices."""
    DAILY = 'daily', 'Daily Report'
    WEEKLY = 'weekly', 'Weekly Report'
    MONTHLY = 'monthly', 'Monthly Report'
    QUARTERLY = 'quarterly', 'Quarterly Report'
    CUSTOM = 'custom', 'Custom Report'


class ReportStatus(models.TextChoices):
    """Report status choices."""
    PENDING = 'pending', 'Pending'
    GENERATING = 'generating', 'Generating'
    COMPLETED = 'completed', 'Completed'
    FAILED = 'failed', 'Failed'
    SCHEDULED = 'scheduled', 'Scheduled'


class AnalyticsEvent(models.Model):
    """
    Analytics event tracking model.
    
    Records user interactions, system events, and business metrics
    for comprehensive analytics and reporting.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the event"
    )
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='analytics_events',
        help_text="User who triggered the event (if applicable)"
    )
    
    session_id = models.CharField(
        max_length=40,
        blank=True,
        null=True,
        help_text="Session identifier"
    )
    
    event_type = models.CharField(
        max_length=20,
        choices=EventType.choices,
        help_text="Type of event"
    )
    
    event_name = models.CharField(
        max_length=100,
        help_text="Specific event name"
    )
    
    event_data = models.JSONField(
        default=dict,
        encoder=DjangoJSONEncoder,
        help_text="Additional event data"
    )
    
    # Generic relation to any model
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Content type of related object"
    )
    
    object_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="ID of related object"
    )
    
    content_object = GenericForeignKey('content_type', 'object_id')
    
    ip_address = models.GenericIPAddressField(
        blank=True,
        null=True,
        help_text="IP address of the user"
    )
    
    user_agent = models.TextField(
        blank=True,
        null=True,
        help_text="Browser user agent string"
    )
    
    referrer = models.URLField(
        blank=True,
        null=True,
        help_text="Referrer URL"
    )
    
    page_url = models.URLField(
        blank=True,
        null=True,
        help_text="Page URL where event occurred"
    )
    
    duration = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Event duration in milliseconds"
    )
    
    value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Monetary value associated with event"
    )
    
    properties = models.JSONField(
        default=dict,
        encoder=DjangoJSONEncoder,
        help_text="Custom event properties"
    )
    
    created_at = models.DateTimeField(
        default=timezone.now,
        help_text="When the event occurred"
    )

    class Meta:
        db_table = 'analytics_event'
        indexes = [
            models.Index(fields=['user', 'event_type']),
            models.Index(fields=['event_type', 'created_at']),
            models.Index(fields=['session_id', 'created_at']),
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'Analytics Event'
        verbose_name_plural = 'Analytics Events'

    def __str__(self):
        user_str = self.user.email if self.user else 'Anonymous'
        return f"{self.event_name} by {user_str} at {self.created_at}"
    
    def to_dict(self):
        """Convert event to dictionary for JSON serialization."""
        return {
            'id': str(self.id),
            'user_id': str(self.user.id) if self.user else None,
            'event_type': self.event_type,
            'event_name': self.event_name,
            'event_data': self.event_data,
            'value': float(self.value) if self.value else None,
            'properties': self.properties,
            'created_at': self.created_at.isoformat(),
        }


class DashboardMetrics(models.Model):
    """
    Daily dashboard metrics aggregation.
    
    Stores key performance indicators and metrics
    for dashboard display and trend analysis.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the metrics record"
    )
    
    date = models.DateField(
        unique=True,
        help_text="Date these metrics are for"
    )
    
    # User metrics
    total_users = models.PositiveIntegerField(
        default=0,
        help_text="Total registered users"
    )
    
    new_users = models.PositiveIntegerField(
        default=0,
        help_text="New users registered today"
    )
    
    active_users = models.PositiveIntegerField(
        default=0,
        help_text="Users active today"
    )
    
    verified_users = models.PositiveIntegerField(
        default=0,
        help_text="Users with completed KYC"
    )
    
    # Investment metrics
    total_investments = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total investment amount (cumulative)"
    )
    
    daily_investments = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Investment amount for this day"
    )
    
    investment_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of investments made today"
    )
    
    avg_investment_size = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Average investment size today"
    )
    
    # Property metrics
    total_properties = models.PositiveIntegerField(
        default=0,
        help_text="Total properties listed"
    )
    
    active_properties = models.PositiveIntegerField(
        default=0,
        help_text="Properties available for investment"
    )
    
    fully_funded_properties = models.PositiveIntegerField(
        default=0,
        help_text="Properties that reached funding goal"
    )
    
    property_views = models.PositiveIntegerField(
        default=0,
        help_text="Property detail page views today"
    )
    
    # Broker metrics
    active_brokers = models.PositiveIntegerField(
        default=0,
        help_text="Brokers active today"
    )
    
    broker_commissions = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total broker commissions earned today"
    )
    
    # Platform metrics
    total_revenue = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total platform revenue (cumulative)"
    )
    
    daily_revenue = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Platform revenue for today"
    )
    
    transaction_volume = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total transaction volume today"
    )
    
    # Performance metrics
    avg_response_time = models.PositiveIntegerField(
        default=0,
        help_text="Average API response time in milliseconds"
    )
    
    error_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Error rate percentage"
    )
    
    uptime_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('100.00'),
        help_text="System uptime percentage"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'dashboard_metrics'
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-date']
        verbose_name = 'Dashboard Metrics'
        verbose_name_plural = 'Dashboard Metrics'

    def __str__(self):
        return f"Dashboard metrics for {self.date}"


class DetailedPropertyAnalytics(models.Model):
    """
    Property-specific analytics and performance metrics.
    
    Tracks property performance, investor interest,
    and investment patterns for individual properties.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the analytics record"
    )
    
    property = models.OneToOneField(
        'properties.Property',
        on_delete=models.CASCADE,
        related_name='detailed_analytics',
        help_text="Property these analytics belong to"
    )
    
    # View metrics
    total_views = models.PositiveIntegerField(
        default=0,
        help_text="Total property detail page views"
    )
    
    unique_views = models.PositiveIntegerField(
        default=0,
        help_text="Unique property detail page views"
    )
    
    avg_time_on_page = models.PositiveIntegerField(
        default=0,
        help_text="Average time spent on property page (seconds)"
    )
    
    bounce_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Property page bounce rate percentage"
    )
    
    # Investment metrics
    total_invested = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total amount invested in this property"
    )
    
    investment_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of investments made"
    )
    
    unique_investors = models.PositiveIntegerField(
        default=0,
        help_text="Number of unique investors"
    )
    
    avg_investment_size = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Average investment size"
    )
    
    conversion_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="View to investment conversion rate"
    )
    
    # Engagement metrics
    saved_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of times property was saved/favorited"
    )
    
    shared_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of times property was shared"
    )
    
    inquiries_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of inquiries received"
    )
    
    # Performance rankings
    popularity_rank = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Popularity rank among all properties"
    )
    
    performance_rank = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Investment performance rank"
    )
    
    # Time-based metrics
    days_to_first_investment = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Days from listing to first investment"
    )
    
    days_to_funding_goal = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Days to reach funding goal (if achieved)"
    )
    
    last_investment_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="When last investment was made"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'detailed_property_analytics'
        indexes = [
            models.Index(fields=['property']),
            models.Index(fields=['popularity_rank']),
            models.Index(fields=['performance_rank']),
            models.Index(fields=['conversion_rate']),
        ]
        verbose_name = 'Detailed Property Analytics'
        verbose_name_plural = 'Detailed Property Analytics'

    def __str__(self):
        return f"Analytics for {self.property.title}"
    
    def calculate_performance_score(self):
        """Calculate overall property performance score."""
        # Weight different metrics for overall score
        view_score = min(self.total_views / 1000 * 20, 20)  # Max 20 points
        investment_score = min(float(self.total_invested) / 100000 * 30, 30)  # Max 30 points
        conversion_score = min(float(self.conversion_rate) * 0.25, 25)  # Max 25 points
        engagement_score = min((self.saved_count + self.shared_count) / 100 * 25, 25)  # Max 25 points
        
        return round(view_score + investment_score + conversion_score + engagement_score, 2)


class UserAnalytics(models.Model):
    """
    User behavior and engagement analytics.
    
    Tracks individual user behavior patterns, preferences,
    and investment history for personalization and insights.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the analytics record"
    )
    
    user = models.OneToOneField(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='detailed_analytics',
        help_text="User these analytics belong to"
    )
    
    # Engagement metrics
    total_sessions = models.PositiveIntegerField(
        default=0,
        help_text="Total number of sessions"
    )
    
    total_session_duration = models.PositiveIntegerField(
        default=0,
        help_text="Total session duration in seconds"
    )
    
    avg_session_duration = models.PositiveIntegerField(
        default=0,
        help_text="Average session duration in seconds"
    )
    
    pages_per_session = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Average pages viewed per session"
    )
    
    bounce_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="User bounce rate percentage"
    )
    
    # Investment behavior
    total_investments = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total amount invested"
    )
    
    investment_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of investments made"
    )
    
    avg_investment_size = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Average investment size"
    )
    
    properties_invested = models.PositiveIntegerField(
        default=0,
        help_text="Number of different properties invested in"
    )
    
    investment_frequency_days = models.PositiveIntegerField(
        default=0,
        help_text="Average days between investments"
    )
    
    # Property preferences
    preferred_property_types = models.JSONField(
        default=list,
        help_text="Preferred property types based on behavior"
    )
    
    preferred_locations = models.JSONField(
        default=list,
        help_text="Preferred investment locations"
    )
    
    preferred_price_range = models.JSONField(
        default=dict,
        help_text="Preferred investment price range"
    )
    
    # Activity metrics
    properties_viewed = models.PositiveIntegerField(
        default=0,
        help_text="Total properties viewed"
    )
    
    properties_saved = models.PositiveIntegerField(
        default=0,
        help_text="Properties saved to wishlist"
    )
    
    searches_performed = models.PositiveIntegerField(
        default=0,
        help_text="Number of searches performed"
    )
    
    # Engagement scores
    engagement_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Overall engagement score (0-100)"
    )
    
    risk_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('50.00'),
        help_text="Investment risk preference score (0-100)"
    )
    
    loyalty_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="User loyalty score (0-100)"
    )
    
    # Time-based metrics
    first_investment_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="When user made first investment"
    )
    
    last_investment_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="When user made last investment"
    )
    
    last_login_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Last login timestamp"
    )
    
    last_activity_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Last activity timestamp"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_analytics'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['engagement_score']),
            models.Index(fields=['loyalty_score']),
            models.Index(fields=['last_activity_at']),
        ]
        verbose_name = 'User Analytics'
        verbose_name_plural = 'User Analytics'

    def __str__(self):
        return f"Analytics for {self.user.email}"
    
    def calculate_engagement_score(self):
        """Calculate user engagement score based on activity."""
        # Weight different activities for engagement score
        session_score = min(self.total_sessions / 50 * 25, 25)  # Max 25 points
        duration_score = min(self.avg_session_duration / 3600 * 20, 20)  # Max 20 points
        investment_score = min(self.investment_count / 10 * 30, 30)  # Max 30 points
        activity_score = min((self.properties_viewed + self.searches_performed) / 100 * 25, 25)  # Max 25 points
        
        return round(session_score + duration_score + investment_score + activity_score, 2)


class PerformanceReport(models.Model):
    """
    Generated performance reports.
    
    Stores generated analytics reports for various time periods
    and business metrics with scheduling capabilities.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the report"
    )
    
    title = models.CharField(
        max_length=200,
        help_text="Report title"
    )
    
    report_type = models.CharField(
        max_length=20,
        choices=ReportType.choices,
        help_text="Type of report"
    )
    
    status = models.CharField(
        max_length=20,
        choices=ReportStatus.choices,
        default=ReportStatus.PENDING,
        help_text="Report generation status"
    )
    
    parameters = models.JSONField(
        default=dict,
        help_text="Report generation parameters"
    )
    
    data = models.JSONField(
        default=dict,
        encoder=DjangoJSONEncoder,
        help_text="Report data and results"
    )
    
    file_path = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Path to generated report file"
    )
    
    file_format = models.CharField(
        max_length=10,
        default='PDF',
        help_text="Report file format"
    )
    
    file_size = models.BigIntegerField(
        default=0,
        help_text="Report file size in bytes"
    )
    
    start_date = models.DateField(
        help_text="Report period start date"
    )
    
    end_date = models.DateField(
        help_text="Report period end date"
    )
    
    scheduled_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="When report was scheduled to generate"
    )
    
    generated_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="When report was generated"
    )
    
    expires_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="When report expires and should be deleted"
    )
    
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_reports',
        help_text="User who requested the report"
    )
    
    recipients = models.JSONField(
        default=list,
        help_text="Email addresses to send report to"
    )
    
    is_automated = models.BooleanField(
        default=False,
        help_text="Whether this is an automated report"
    )
    
    error_message = models.TextField(
        blank=True,
        null=True,
        help_text="Error message if report generation failed"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'performance_report'
        indexes = [
            models.Index(fields=['report_type', 'status']),
            models.Index(fields=['start_date', 'end_date']),
            models.Index(fields=['scheduled_at']),
            models.Index(fields=['created_by']),
            models.Index(fields=['is_automated']),
        ]
        ordering = ['-created_at']
        verbose_name = 'Performance Report'
        verbose_name_plural = 'Performance Reports'

    def __str__(self):
        return f"{self.title} ({self.start_date} to {self.end_date})"
    
    def mark_completed(self, file_path=None, file_size=0):
        """Mark report as completed."""
        self.status = ReportStatus.COMPLETED
        self.generated_at = timezone.now()
        if file_path:
            self.file_path = file_path
            self.file_size = file_size
        self.save(update_fields=['status', 'generated_at', 'file_path', 'file_size'])
    
    def mark_failed(self, error_message):
        """Mark report as failed with error message."""
        self.status = ReportStatus.FAILED
        self.error_message = error_message
        self.save(update_fields=['status', 'error_message'])
    
    def is_expired(self):
        """Check if report has expired."""
        return self.expires_at and self.expires_at < timezone.now()
