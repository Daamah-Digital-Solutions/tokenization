"""
Notification models for real-time communication system.
"""

import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

User = get_user_model()


class NotificationType(models.TextChoices):
    """Notification type choices."""
    INFO = 'info', 'Information'
    SUCCESS = 'success', 'Success'
    WARNING = 'warning', 'Warning'
    ERROR = 'error', 'Error'
    INVESTMENT = 'investment', 'Investment'
    PAYMENT = 'payment', 'Payment'
    KYC = 'kyc', 'KYC'
    PROPERTY = 'property', 'Property'
    SYSTEM = 'system', 'System'


class NotificationPriority(models.TextChoices):
    """Notification priority levels."""
    LOW = 'low', 'Low'
    MEDIUM = 'medium', 'Medium'
    HIGH = 'high', 'High'
    URGENT = 'urgent', 'Urgent'


class Notification(models.Model):
    """
    User notifications model for real-time messaging.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    
    # Notification content
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=20, 
        choices=NotificationType.choices, 
        default=NotificationType.INFO
    )
    priority = models.CharField(
        max_length=10, 
        choices=NotificationPriority.choices, 
        default=NotificationPriority.MEDIUM
    )
    
    # Generic foreign key for related objects
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.UUIDField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Status tracking
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    is_sent_via_email = models.BooleanField(default=False)
    is_sent_via_push = models.BooleanField(default=False)
    
    # Action links
    action_url = models.URLField(blank=True, null=True)
    action_label = models.CharField(max_length=100, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['notification_type', '-created_at']),
            models.Index(fields=['priority', '-created_at']),
        ]
        
    def __str__(self):
        return f"{self.title} - {self.user.email}"
    
    def mark_as_read(self):
        """Mark notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    @property
    def is_expired(self):
        """Check if notification has expired."""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False


class NotificationPreference(models.Model):
    """
    User notification preferences.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    
    # Email preferences
    email_notifications_enabled = models.BooleanField(default=True)
    email_investment_updates = models.BooleanField(default=True)
    email_payment_updates = models.BooleanField(default=True)
    email_kyc_updates = models.BooleanField(default=True)
    email_property_updates = models.BooleanField(default=True)
    email_marketing = models.BooleanField(default=False)
    
    # In-app preferences
    in_app_notifications_enabled = models.BooleanField(default=True)
    in_app_investment_updates = models.BooleanField(default=True)
    in_app_payment_updates = models.BooleanField(default=True)
    in_app_kyc_updates = models.BooleanField(default=True)
    in_app_property_updates = models.BooleanField(default=True)
    
    # Push notification preferences
    push_notifications_enabled = models.BooleanField(default=True)
    push_investment_updates = models.BooleanField(default=True)
    push_payment_updates = models.BooleanField(default=True)
    push_kyc_updates = models.BooleanField(default=True)
    
    # Frequency settings
    digest_frequency = models.CharField(
        max_length=20,
        choices=[
            ('immediate', 'Immediate'),
            ('daily', 'Daily'),
            ('weekly', 'Weekly'),
            ('never', 'Never'),
        ],
        default='immediate'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Preferences for {self.user.email}"


class EmailTemplate(models.Model):
    """
    Email template management for notifications.
    """
    TEMPLATE_TYPES = [
        ('welcome', 'Welcome Email'),
        ('password_reset', 'Password Reset'),
        ('email_verification', 'Email Verification'),
        ('investment_confirmation', 'Investment Confirmation'),
        ('payment_confirmation', 'Payment Confirmation'),
        ('kyc_status_update', 'KYC Status Update'),
        ('property_update', 'Property Update'),
        ('dividend_notification', 'Dividend Notification'),
        ('system_alert', 'System Alert'),
        ('weekly_digest', 'Weekly Digest'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    template_type = models.CharField(max_length=50, choices=TEMPLATE_TYPES, unique=True)
    subject = models.CharField(max_length=200)
    html_content = models.TextField()
    text_content = models.TextField()
    
    # Template variables documentation
    variables = models.JSONField(
        default=dict,
        help_text="JSON object documenting available template variables"
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        
    def __str__(self):
        return self.name


class EmailLog(models.Model):
    """
    Email delivery tracking and logging.
    """
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
        ('bounced', 'Bounced'),
        ('complained', 'Complained'),
        ('unsubscribed', 'Unsubscribed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_logs')
    template = models.ForeignKey(EmailTemplate, on_delete=models.CASCADE, null=True, blank=True)
    notification = models.ForeignKey(Notification, on_delete=models.CASCADE, null=True, blank=True)
    
    # Email details
    subject = models.CharField(max_length=200)
    recipient_email = models.EmailField()
    sender_email = models.EmailField()
    
    # Delivery tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued')
    external_id = models.CharField(max_length=200, blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    
    # Error tracking
    error_message = models.TextField(blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['template', '-created_at']),
        ]
        
    def __str__(self):
        return f"Email to {self.recipient_email} - {self.status}"


class SystemAlert(models.Model):
    """
    System-wide alerts for admin monitoring.
    """
    ALERT_TYPES = [
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('critical', 'Critical'),
        ('maintenance', 'Maintenance'),
    ]
    
    ALERT_CATEGORIES = [
        ('system', 'System'),
        ('security', 'Security'),
        ('performance', 'Performance'),
        ('payment', 'Payment'),
        ('blockchain', 'Blockchain'),
        ('kyc', 'KYC'),
        ('user_activity', 'User Activity'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    message = models.TextField()
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    category = models.CharField(max_length=30, choices=ALERT_CATEGORIES)
    
    # Targeting
    is_public = models.BooleanField(default=False)  # Show to all users
    target_users = models.ManyToManyField(
        User, 
        blank=True, 
        related_name='targeted_system_alerts'
    )
    target_user_types = models.JSONField(
        default=list,
        help_text="List of user types to target (e.g., ['admin', 'investor'])"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='resolved_system_alerts'
    )
    
    # Additional data
    metadata = models.JSONField(
        default=dict,
        help_text="Additional alert metadata"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['alert_type', '-created_at']),
            models.Index(fields=['category', '-created_at']),
            models.Index(fields=['is_active', '-created_at']),
            models.Index(fields=['is_resolved', '-created_at']),
        ]
        
    def __str__(self):
        return f"{self.get_alert_type_display()}: {self.title}"
    
    def resolve(self, resolved_by=None):
        """Mark alert as resolved."""
        self.is_resolved = True
        self.resolved_at = timezone.now()
        if resolved_by:
            self.resolved_by = resolved_by
        self.save(update_fields=['is_resolved', 'resolved_at', 'resolved_by'])
    
    @property
    def is_expired(self):
        """Check if alert has expired."""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False


class NotificationChannel(models.Model):
    """
    Track notification delivery channels and their status.
    """
    notification = models.ForeignKey(
        Notification, 
        on_delete=models.CASCADE, 
        related_name='delivery_channels'
    )
    channel = models.CharField(
        max_length=20,
        choices=[
            ('in_app', 'In-App'),
            ('email', 'Email'),
            ('push', 'Push Notification'),
            ('sms', 'SMS'),
            ('websocket', 'WebSocket'),
        ]
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('sent', 'Sent'),
            ('delivered', 'Delivered'),
            ('failed', 'Failed'),
            ('skipped', 'Skipped'),
        ],
        default='pending'
    )
    
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['notification', 'channel']
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.notification.title} via {self.channel} - {self.status}"
