"""
Django Admin Configuration for Analytics App.

This module configures the Django admin interface for analytics tracking,
performance metrics, event logging, and report management.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import (
    AnalyticsEvent, DashboardMetrics, DetailedPropertyAnalytics,
    UserAnalytics, PerformanceReport
)


@admin.register(AnalyticsEvent)
class AnalyticsEventAdmin(admin.ModelAdmin):
    """Admin interface for analytics events."""
    
    list_display = [
        'event_name', 'event_type', 'user_email', 'value', 'created_at'
    ]
    list_filter = ['event_type', 'created_at']
    search_fields = ['event_name', 'user__email']
    readonly_fields = ['id', 'created_at']
    
    def user_email(self, obj):
        return obj.user.email if obj.user else 'Anonymous'
    user_email.short_description = 'User'


@admin.register(DashboardMetrics)
class DashboardMetricsAdmin(admin.ModelAdmin):
    """Admin interface for dashboard metrics."""
    
    list_display = [
        'date', 'total_users', 'daily_investments', 'total_revenue'
    ]
    list_filter = ['date']
    ordering = ['-date']


@admin.register(DetailedPropertyAnalytics)
class DetailedPropertyAnalyticsAdmin(admin.ModelAdmin):
    """Admin interface for property analytics."""
    
    list_display = [
        'property_title', 'total_views', 'conversion_rate', 'total_invested'
    ]
    search_fields = ['property__title']
    
    def property_title(self, obj):
        return obj.property.title
    property_title.short_description = 'Property'


@admin.register(UserAnalytics)
class UserAnalyticsAdmin(admin.ModelAdmin):
    """Admin interface for user analytics."""
    
    list_display = [
        'user_email', 'engagement_score', 'total_investments'
    ]
    search_fields = ['user__email']
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'


@admin.register(PerformanceReport)
class PerformanceReportAdmin(admin.ModelAdmin):
    """Admin interface for performance reports."""
    
    list_display = [
        'title', 'report_type', 'status', 'start_date', 'end_date'
    ]
    list_filter = ['report_type', 'status', 'is_automated']
    search_fields = ['title']
