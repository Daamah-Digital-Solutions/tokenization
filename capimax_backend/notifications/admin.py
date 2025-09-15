"""
Admin configuration for the notifications app.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import (
    Notification, NotificationPreference, EmailTemplate,
    EmailLog, SystemAlert, NotificationChannel
)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Admin interface for Notification model."""
    
    list_display = [
        'title', 'user_email', 'notification_type', 'priority',
        'is_read', 'created_at', 'action_buttons'
    ]
    list_filter = [
        'notification_type', 'priority', 'is_read',
        'created_at', 'expires_at'
    ]
    search_fields = ['title', 'message', 'user__email', 'user__first_name', 'user__last_name']
    readonly_fields = ['id', 'created_at', 'updated_at', 'read_at']
    raw_id_fields = ['user', 'content_type']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'user', 'title', 'message')
        }),
        ('Classification', {
            'fields': ('notification_type', 'priority')
        }),
        ('Status', {
            'fields': ('is_read', 'read_at', 'is_sent_via_email', 'is_sent_via_push')
        }),
        ('Action', {
            'fields': ('action_url', 'action_label')
        }),
        ('Related Object', {
            'fields': ('content_type', 'object_id'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'expires_at'),
            'classes': ('collapse',)
        })
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User Email'
    user_email.admin_order_field = 'user__email'
    
    def action_buttons(self, obj):
        if obj.action_url:
            return format_html(
                '<a href="{}" target="_blank" class="button">View Action</a>',
                obj.action_url
            )
        return '-'
    action_buttons.short_description = 'Actions'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'content_type')


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    """Admin interface for NotificationPreference model."""
    
    list_display = [
        'user_email', 'email_notifications_enabled',
        'in_app_notifications_enabled', 'push_notifications_enabled',
        'digest_frequency'
    ]
    list_filter = [
        'email_notifications_enabled', 'in_app_notifications_enabled',
        'push_notifications_enabled', 'digest_frequency'
    ]
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    raw_id_fields = ['user']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Email Preferences', {
            'fields': (
                'email_notifications_enabled', 'email_investment_updates',
                'email_payment_updates', 'email_kyc_updates',
                'email_property_updates', 'email_marketing'
            )
        }),
        ('In-App Preferences', {
            'fields': (
                'in_app_notifications_enabled', 'in_app_investment_updates',
                'in_app_payment_updates', 'in_app_kyc_updates',
                'in_app_property_updates'
            )
        }),
        ('Push Preferences', {
            'fields': (
                'push_notifications_enabled', 'push_investment_updates',
                'push_payment_updates', 'push_kyc_updates'
            )
        }),
        ('Digest Settings', {
            'fields': ('digest_frequency',)
        })
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User Email'
    user_email.admin_order_field = 'user__email'


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    """Admin interface for EmailTemplate model."""
    
    list_display = ['name', 'template_type', 'is_active', 'created_at']
    list_filter = ['template_type', 'is_active', 'created_at']
    search_fields = ['name', 'template_type', 'subject']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'name', 'template_type', 'is_active')
        }),
        ('Email Content', {
            'fields': ('subject', 'html_content', 'text_content')
        }),
        ('Template Variables', {
            'fields': ('variables',),
            'description': 'JSON object documenting available template variables'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    """Admin interface for EmailLog model."""
    
    list_display = [
        'recipient_email', 'subject_truncated', 'status',
        'template_name', 'created_at', 'sent_at'
    ]
    list_filter = ['status', 'created_at', 'sent_at']
    search_fields = ['recipient_email', 'subject', 'recipient__email']
    readonly_fields = [
        'id', 'created_at', 'sent_at', 'delivered_at',
        'failed_at', 'external_id'
    ]
    raw_id_fields = ['recipient', 'template', 'notification']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'recipient', 'recipient_email', 'subject')
        }),
        ('Content', {
            'fields': ('template', 'notification', 'sender_email')
        }),
        ('Delivery Status', {
            'fields': ('status', 'external_id', 'retry_count')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'sent_at', 'delivered_at', 'failed_at')
        }),
        ('Error Information', {
            'fields': ('error_message',),
            'classes': ('collapse',)
        })
    )
    
    def subject_truncated(self, obj):
        if len(obj.subject) > 50:
            return obj.subject[:50] + '...'
        return obj.subject
    subject_truncated.short_description = 'Subject'
    
    def template_name(self, obj):
        return obj.template.name if obj.template else '-'
    template_name.short_description = 'Template'
    template_name.admin_order_field = 'template__name'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('recipient', 'template', 'notification')


@admin.register(SystemAlert)
class SystemAlertAdmin(admin.ModelAdmin):
    """Admin interface for SystemAlert model."""
    
    list_display = [
        'title_truncated', 'alert_type', 'category',
        'is_active', 'is_resolved', 'created_at'
    ]
    list_filter = [
        'alert_type', 'category', 'is_active', 'is_resolved',
        'is_public', 'created_at'
    ]
    search_fields = ['title', 'message']
    readonly_fields = ['id', 'created_at', 'updated_at', 'resolved_at']
    raw_id_fields = ['resolved_by']
    filter_horizontal = ['target_users']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'title', 'message', 'alert_type', 'category')
        }),
        ('Targeting', {
            'fields': ('is_public', 'target_users', 'target_user_types')
        }),
        ('Status', {
            'fields': ('is_active', 'is_resolved', 'resolved_at', 'resolved_by')
        }),
        ('Additional Data', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'expires_at'),
            'classes': ('collapse',)
        })
    )
    
    actions = ['resolve_alerts', 'activate_alerts', 'deactivate_alerts']
    
    def title_truncated(self, obj):
        if len(obj.title) > 50:
            return obj.title[:50] + '...'
        return obj.title
    title_truncated.short_description = 'Title'
    
    def resolve_alerts(self, request, queryset):
        updated = queryset.filter(is_resolved=False).update(
            is_resolved=True,
            resolved_at=timezone.now(),
            resolved_by=request.user
        )
        self.message_user(request, f'{updated} alerts resolved.')
    resolve_alerts.short_description = 'Resolve selected alerts'
    
    def activate_alerts(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} alerts activated.')
    activate_alerts.short_description = 'Activate selected alerts'
    
    def deactivate_alerts(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} alerts deactivated.')
    deactivate_alerts.short_description = 'Deactivate selected alerts'


@admin.register(NotificationChannel)
class NotificationChannelAdmin(admin.ModelAdmin):
    """Admin interface for NotificationChannel model."""
    
    list_display = [
        'notification_title', 'channel', 'status',
        'sent_at', 'delivered_at', 'failed_at'
    ]
    list_filter = ['channel', 'status', 'created_at']
    search_fields = ['notification__title', 'notification__user__email']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['notification']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Notification', {
            'fields': ('notification',)
        }),
        ('Channel Information', {
            'fields': ('channel', 'status')
        }),
        ('Timestamps', {
            'fields': ('sent_at', 'delivered_at', 'failed_at', 'created_at', 'updated_at')
        }),
        ('Error Information', {
            'fields': ('error_message',),
            'classes': ('collapse',)
        })
    )
    
    def notification_title(self, obj):
        return obj.notification.title
    notification_title.short_description = 'Notification'
    notification_title.admin_order_field = 'notification__title'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('notification', 'notification__user')
