"""
Serializers for the notifications app.
"""

from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from .models import (
    Notification, NotificationPreference, EmailTemplate, 
    EmailLog, SystemAlert, NotificationChannel
)


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for Notification model.
    """
    content_object_data = serializers.SerializerMethodField()
    time_since = serializers.SerializerMethodField()
    is_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'notification_type', 'priority',
            'is_read', 'read_at', 'action_url', 'action_label',
            'created_at', 'updated_at', 'expires_at', 'content_object_data',
            'time_since', 'is_expired'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_content_object_data(self, obj):
        """Get related object data if available."""
        if obj.content_object:
            try:
                if hasattr(obj.content_object, 'title'):
                    return {
                        'type': obj.content_type.model,
                        'id': str(obj.content_object.id),
                        'title': obj.content_object.title
                    }
                elif hasattr(obj.content_object, 'name'):
                    return {
                        'type': obj.content_type.model,
                        'id': str(obj.content_object.id),
                        'name': obj.content_object.name
                    }
            except AttributeError:
                pass
        return None
    
    def get_time_since(self, obj):
        """Get human-readable time since creation."""
        from django.utils import timezone
        from django.utils.timesince import timesince
        
        now = timezone.now()
        return timesince(obj.created_at, now)


class NotificationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating notifications.
    """
    class Meta:
        model = Notification
        fields = [
            'title', 'message', 'notification_type', 'priority',
            'action_url', 'action_label', 'expires_at'
        ]
    
    def create(self, validated_data):
        """Create notification with user from context."""
        user = self.context['request'].user
        validated_data['user'] = user
        return super().create(validated_data)


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """
    Serializer for NotificationPreference model.
    """
    class Meta:
        model = NotificationPreference
        fields = [
            'email_notifications_enabled', 'email_investment_updates',
            'email_payment_updates', 'email_kyc_updates', 
            'email_property_updates', 'email_marketing',
            'in_app_notifications_enabled', 'in_app_investment_updates',
            'in_app_payment_updates', 'in_app_kyc_updates',
            'in_app_property_updates', 'push_notifications_enabled',
            'push_investment_updates', 'push_payment_updates',
            'push_kyc_updates', 'digest_frequency'
        ]


class EmailTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer for EmailTemplate model.
    """
    variables_info = serializers.SerializerMethodField()
    
    class Meta:
        model = EmailTemplate
        fields = [
            'id', 'name', 'template_type', 'subject', 'html_content',
            'text_content', 'variables', 'variables_info', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_variables_info(self, obj):
        """Get formatted variable information."""
        variables = obj.variables
        if isinstance(variables, dict):
            return [
                {'name': key, 'description': value}
                for key, value in variables.items()
            ]
        return []


class EmailTemplateCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating/updating email templates.
    """
    class Meta:
        model = EmailTemplate
        fields = [
            'name', 'template_type', 'subject', 'html_content',
            'text_content', 'variables', 'is_active'
        ]
    
    def validate_template_type(self, value):
        """Validate template type is valid."""
        valid_types = [choice[0] for choice in EmailTemplate.TEMPLATE_TYPES]
        if value not in valid_types:
            raise serializers.ValidationError(f"Invalid template type. Must be one of: {valid_types}")
        return value
    
    def validate_variables(self, value):
        """Validate variables is a proper dict."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Variables must be a JSON object")
        return value


class EmailLogSerializer(serializers.ModelSerializer):
    """
    Serializer for EmailLog model.
    """
    recipient_email = serializers.ReadOnlyField()
    template_name = serializers.CharField(source='template.name', read_only=True)
    
    class Meta:
        model = EmailLog
        fields = [
            'id', 'recipient_email', 'template_name', 'subject',
            'status', 'external_id', 'created_at', 'sent_at',
            'delivered_at', 'failed_at', 'error_message', 'retry_count'
        ]
        read_only_fields = ['id', 'created_at']


class SystemAlertSerializer(serializers.ModelSerializer):
    """
    Serializer for SystemAlert model.
    """
    resolved_by_email = serializers.CharField(source='resolved_by.email', read_only=True)
    is_expired = serializers.ReadOnlyField()
    target_users_count = serializers.SerializerMethodField()
    
    class Meta:
        model = SystemAlert
        fields = [
            'id', 'title', 'message', 'alert_type', 'category',
            'is_public', 'target_user_types', 'is_active', 'is_resolved',
            'resolved_at', 'resolved_by_email', 'metadata', 'created_at',
            'updated_at', 'expires_at', 'is_expired', 'target_users_count'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'resolved_at', 'resolved_by'
        ]
    
    def get_target_users_count(self, obj):
        """Get count of targeted users."""
        return obj.target_users.count()


class SystemAlertCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating system alerts.
    """
    target_user_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        help_text="List of user IDs to target"
    )
    
    class Meta:
        model = SystemAlert
        fields = [
            'title', 'message', 'alert_type', 'category', 'is_public',
            'target_user_types', 'target_user_ids', 'expires_at', 'metadata'
        ]
    
    def validate_alert_type(self, value):
        """Validate alert type."""
        valid_types = [choice[0] for choice in SystemAlert.ALERT_TYPES]
        if value not in valid_types:
            raise serializers.ValidationError(f"Invalid alert type. Must be one of: {valid_types}")
        return value
    
    def validate_category(self, value):
        """Validate alert category."""
        valid_categories = [choice[0] for choice in SystemAlert.ALERT_CATEGORIES]
        if value not in valid_categories:
            raise serializers.ValidationError(f"Invalid category. Must be one of: {valid_categories}")
        return value
    
    def validate_target_user_types(self, value):
        """Validate target user types."""
        if not isinstance(value, list):
            raise serializers.ValidationError("target_user_types must be a list")
        return value
    
    def validate_metadata(self, value):
        """Validate metadata is proper dict."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("metadata must be a JSON object")
        return value
    
    def create(self, validated_data):
        """Create system alert with user targeting."""
        target_user_ids = validated_data.pop('target_user_ids', [])
        alert = super().create(validated_data)
        
        if target_user_ids:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            users = User.objects.filter(id__in=target_user_ids)
            alert.target_users.set(users)
        
        return alert


class NotificationChannelSerializer(serializers.ModelSerializer):
    """
    Serializer for NotificationChannel model.
    """
    class Meta:
        model = NotificationChannel
        fields = [
            'channel', 'status', 'sent_at', 'delivered_at',
            'failed_at', 'error_message', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class NotificationStatsSerializer(serializers.Serializer):
    """
    Serializer for notification statistics.
    """
    total_notifications = serializers.IntegerField()
    unread_notifications = serializers.IntegerField()
    read_notifications = serializers.IntegerField()
    notifications_by_type = serializers.DictField()
    notifications_by_priority = serializers.DictField()
    recent_notification_count = serializers.IntegerField()


class BulkNotificationCreateSerializer(serializers.Serializer):
    """
    Serializer for bulk notification creation.
    """
    user_ids = serializers.ListField(
        child=serializers.UUIDField(),
        help_text="List of user IDs to send notifications to"
    )
    title = serializers.CharField(max_length=200)
    message = serializers.CharField()
    notification_type = serializers.ChoiceField(
        choices=Notification._meta.get_field('notification_type').choices
    )
    priority = serializers.ChoiceField(
        choices=Notification._meta.get_field('priority').choices,
        default='medium'
    )
    action_url = serializers.URLField(required=False)
    action_label = serializers.CharField(max_length=100, required=False)
    expires_at = serializers.DateTimeField(required=False)
    send_email = serializers.BooleanField(default=False)
    
    def validate_user_ids(self, value):
        """Validate user IDs exist."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        existing_users = User.objects.filter(id__in=value).count()
        if existing_users != len(value):
            raise serializers.ValidationError("Some user IDs do not exist")
        return value
    
    def create(self, validated_data):
        """Create bulk notifications."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        user_ids = validated_data.pop('user_ids')
        send_email = validated_data.pop('send_email', False)
        
        users = User.objects.filter(id__in=user_ids)
        notifications = []
        
        for user in users:
            notification = Notification(user=user, **validated_data)
            notifications.append(notification)
        
        # Bulk create notifications
        created_notifications = Notification.objects.bulk_create(notifications)
        
        return {
            'created_count': len(created_notifications),
            'notifications': created_notifications
        }


class NotificationMarkReadSerializer(serializers.Serializer):
    """
    Serializer for marking notifications as read.
    """
    notification_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        help_text="List of notification IDs to mark as read. If empty, marks all as read."
    )
    
    def validate_notification_ids(self, value):
        """Validate notification IDs belong to the user."""
        if value:
            user = self.context['request'].user
            existing_notifications = Notification.objects.filter(
                id__in=value, 
                user=user
            ).count()
            
            if existing_notifications != len(value):
                raise serializers.ValidationError("Some notifications do not exist or don't belong to you")
        
        return value