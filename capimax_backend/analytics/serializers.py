"""
Analytics Serializers for Capimax Real Estate Tokenization Platform.

This module contains serializers for analytics tracking, performance metrics,
event logging, and automated report generation API endpoints.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from django.db.models import Avg, Sum, Count
from datetime import datetime, timedelta
from decimal import Decimal
from .models import (
    AnalyticsEvent, DashboardMetrics, DetailedPropertyAnalytics,
    UserAnalytics, PerformanceReport,
    EventType, ReportType, ReportStatus
)

User = get_user_model()


class AnalyticsEventSerializer(serializers.ModelSerializer):
    """
    Serializer for analytics event tracking.
    
    Handles event creation and querying with support for
    generic foreign keys and custom event properties.
    """
    
    user_email = serializers.EmailField(source='user.email', read_only=True)
    content_type_name = serializers.CharField(source='content_type.name', read_only=True)
    time_since_event = serializers.SerializerMethodField()
    
    class Meta:
        model = AnalyticsEvent
        fields = [
            'id', 'user', 'user_email', 'session_id', 'event_type',
            'event_name', 'event_data', 'content_type', 'content_type_name',
            'object_id', 'ip_address', 'user_agent', 'referrer',
            'page_url', 'duration', 'value', 'properties',
            'time_since_event', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_time_since_event(self, obj):
        """Get time since event in human readable format."""
        delta = timezone.now() - obj.created_at
        
        if delta.days > 0:
            return f"{delta.days} days ago"
        elif delta.seconds > 3600:
            hours = delta.seconds // 3600
            return f"{hours} hours ago"
        elif delta.seconds > 60:
            minutes = delta.seconds // 60
            return f"{minutes} minutes ago"
        else:
            return "Just now"
    
    def validate_event_data(self, value):
        """Validate event data is a valid dict."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Event data must be a dictionary.")
        return value
    
    def validate_properties(self, value):
        """Validate properties is a valid dict."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Properties must be a dictionary.")
        return value
    
    def create(self, validated_data):
        """Create analytics event with automatic user detection."""
        request = self.context.get('request')
        if request:
            if not validated_data.get('user') and request.user.is_authenticated:
                validated_data['user'] = request.user
            
            if not validated_data.get('session_id'):
                validated_data['session_id'] = request.session.session_key
            
            if not validated_data.get('ip_address'):
                x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
                if x_forwarded_for:
                    validated_data['ip_address'] = x_forwarded_for.split(',')[0]
                else:
                    validated_data['ip_address'] = request.META.get('REMOTE_ADDR')
            
            if not validated_data.get('user_agent'):
                validated_data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')
        
        return super().create(validated_data)


class DashboardMetricsSerializer(serializers.ModelSerializer):
    """
    Serializer for dashboard metrics.
    
    Provides daily KPI aggregation with growth rates
    and trend calculations.
    """
    
    date_formatted = serializers.SerializerMethodField()
    investment_growth_rate = serializers.SerializerMethodField()
    user_growth_rate = serializers.SerializerMethodField()
    revenue_growth_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = DashboardMetrics
        fields = [
            'id', 'date', 'date_formatted', 'total_users', 'new_users',
            'active_users', 'verified_users', 'total_investments',
            'daily_investments', 'investment_count', 'avg_investment_size',
            'investment_growth_rate', 'user_growth_rate', 'revenue_growth_rate',
            'total_properties', 'active_properties', 'fully_funded_properties',
            'property_views', 'active_brokers', 'broker_commissions',
            'total_revenue', 'daily_revenue', 'transaction_volume',
            'avg_response_time', 'error_rate', 'uptime_percentage',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_date_formatted(self, obj):
        """Get formatted date string."""
        return obj.date.strftime('%B %d, %Y')
    
    def get_investment_growth_rate(self, obj):
        """Calculate investment growth rate compared to previous day."""
        previous_day = obj.date - timedelta(days=1)
        try:
            previous_metrics = DashboardMetrics.objects.get(date=previous_day)
            if previous_metrics.daily_investments > 0:
                growth = ((obj.daily_investments - previous_metrics.daily_investments) / 
                         previous_metrics.daily_investments) * 100
                return round(float(growth), 2)
        except DashboardMetrics.DoesNotExist:
            pass
        return 0.0
    
    def get_user_growth_rate(self, obj):
        """Calculate user growth rate compared to previous day."""
        previous_day = obj.date - timedelta(days=1)
        try:
            previous_metrics = DashboardMetrics.objects.get(date=previous_day)
            if previous_metrics.total_users > 0:
                growth = ((obj.total_users - previous_metrics.total_users) / 
                         previous_metrics.total_users) * 100
                return round(float(growth), 2)
        except DashboardMetrics.DoesNotExist:
            pass
        return 0.0
    
    def get_revenue_growth_rate(self, obj):
        """Calculate revenue growth rate compared to previous day."""
        previous_day = obj.date - timedelta(days=1)
        try:
            previous_metrics = DashboardMetrics.objects.get(date=previous_day)
            if previous_metrics.daily_revenue > 0:
                growth = ((obj.daily_revenue - previous_metrics.daily_revenue) / 
                         previous_metrics.daily_revenue) * 100
                return round(float(growth), 2)
        except DashboardMetrics.DoesNotExist:
            pass
        return 0.0


class PropertyAnalyticsSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed property analytics.
    
    Provides detailed property performance metrics
    with calculated scores and rankings.
    """
    
    property_title = serializers.CharField(source='property.title', read_only=True)
    property_type = serializers.CharField(source='property.property_type', read_only=True)
    funding_progress = serializers.SerializerMethodField()
    performance_score = serializers.SerializerMethodField()
    roi_projection = serializers.SerializerMethodField()
    
    class Meta:
        model = DetailedPropertyAnalytics
        fields = [
            'id', 'property', 'property_title', 'property_type',
            'total_views', 'unique_views', 'avg_time_on_page', 'bounce_rate',
            'total_invested', 'investment_count', 'unique_investors',
            'avg_investment_size', 'conversion_rate', 'funding_progress',
            'saved_count', 'shared_count', 'inquiries_count',
            'popularity_rank', 'performance_rank', 'performance_score',
            'days_to_first_investment', 'days_to_funding_goal',
            'last_investment_at', 'roi_projection',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'popularity_rank', 'performance_rank',
            'created_at', 'updated_at'
        ]
    
    def get_funding_progress(self, obj):
        """Calculate funding progress percentage."""
        if hasattr(obj.property, 'funding_goal') and obj.property.funding_goal > 0:
            progress = (obj.total_invested / obj.property.funding_goal) * 100
            return min(round(float(progress), 2), 100.0)
        return 0.0
    
    def get_performance_score(self, obj):
        """Get calculated performance score."""
        return obj.calculate_performance_score()
    
    def get_roi_projection(self, obj):
        """Calculate projected ROI based on property data."""
        if hasattr(obj.property, 'expected_annual_return'):
            return round(float(obj.property.expected_annual_return), 2)
        return 0.0


class UserAnalyticsSerializer(serializers.ModelSerializer):
    """
    Serializer for user analytics.
    
    Provides detailed user behavior metrics
    with engagement scores and preferences.
    """
    
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_role = serializers.CharField(source='user.role', read_only=True)
    engagement_level = serializers.SerializerMethodField()
    investment_behavior = serializers.SerializerMethodField()
    
    class Meta:
        model = UserAnalytics
        fields = [
            'id', 'user', 'user_email', 'user_name', 'user_role',
            'total_sessions', 'total_session_duration', 'avg_session_duration',
            'pages_per_session', 'bounce_rate', 'total_investments',
            'investment_count', 'avg_investment_size', 'properties_invested',
            'investment_frequency_days', 'preferred_property_types',
            'preferred_locations', 'preferred_price_range',
            'properties_viewed', 'properties_saved', 'searches_performed',
            'engagement_score', 'engagement_level', 'risk_score',
            'loyalty_score', 'investment_behavior', 'first_investment_at',
            'last_investment_at', 'last_login_at', 'last_activity_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_engagement_level(self, obj):
        """Get engagement level based on score."""
        score = float(obj.engagement_score)
        if score >= 80:
            return 'very_high'
        elif score >= 60:
            return 'high'
        elif score >= 40:
            return 'medium'
        elif score >= 20:
            return 'low'
        else:
            return 'very_low'
    
    def get_investment_behavior(self, obj):
        """Analyze investment behavior pattern."""
        behavior = {'type': 'new_user'}
        
        if obj.investment_count == 0:
            behavior['type'] = 'browser'
        elif obj.investment_count == 1:
            behavior['type'] = 'first_time_investor'
        elif obj.investment_frequency_days <= 30:
            behavior['type'] = 'active_investor'
        elif obj.investment_frequency_days <= 90:
            behavior['type'] = 'regular_investor'
        else:
            behavior['type'] = 'occasional_investor'
        
        # Add risk profile
        risk_score = float(obj.risk_score)
        if risk_score >= 75:
            behavior['risk_profile'] = 'aggressive'
        elif risk_score >= 50:
            behavior['risk_profile'] = 'moderate'
        else:
            behavior['risk_profile'] = 'conservative'
        
        return behavior


class PerformanceReportSerializer(serializers.ModelSerializer):
    """
    Serializer for performance reports.
    
    Handles report generation, scheduling, and
    status tracking with file management.
    """
    
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    period_days = serializers.SerializerMethodField()
    file_size_mb = serializers.SerializerMethodField()
    is_ready = serializers.SerializerMethodField()
    
    class Meta:
        model = PerformanceReport
        fields = [
            'id', 'title', 'report_type', 'status', 'parameters',
            'data', 'file_path', 'file_format', 'file_size', 'file_size_mb',
            'start_date', 'end_date', 'period_days', 'scheduled_at',
            'generated_at', 'expires_at', 'created_by', 'created_by_name',
            'recipients', 'is_automated', 'is_ready', 'error_message',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'data', 'file_path', 'file_size', 'generated_at',
            'error_message', 'created_at', 'updated_at'
        ]
    
    def get_period_days(self, obj):
        """Calculate report period in days."""
        return (obj.end_date - obj.start_date).days + 1
    
    def get_file_size_mb(self, obj):
        """Get file size in megabytes."""
        if obj.file_size > 0:
            return round(obj.file_size / (1024 * 1024), 2)
        return 0.0
    
    def get_is_ready(self, obj):
        """Check if report is ready for download."""
        return obj.status == ReportStatus.COMPLETED and obj.file_path
    
    def validate_end_date(self, value):
        """Validate end date is after start date."""
        start_date = self.initial_data.get('start_date')
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            if value <= start_date:
                raise serializers.ValidationError("End date must be after start date.")
        return value
    
    def validate_scheduled_at(self, value):
        """Validate scheduled time is in the future."""
        if value and value <= timezone.now():
            raise serializers.ValidationError("Scheduled time must be in the future.")
        return value


class AnalyticsDashboardSerializer(serializers.Serializer):
    """
    Serializer for analytics dashboard summary.
    
    Combines multiple analytics data sources
    for comprehensive dashboard view.
    """
    
    overview_metrics = DashboardMetricsSerializer(read_only=True)
    top_properties = PropertyAnalyticsSerializer(many=True, read_only=True)
    recent_events = AnalyticsEventSerializer(many=True, read_only=True)
    user_segments = serializers.DictField(read_only=True)
    growth_trends = serializers.DictField(read_only=True)
    conversion_funnels = serializers.DictField(read_only=True)


class EventTrackingSerializer(serializers.Serializer):
    """
    Serializer for event tracking requests.
    
    Handles bulk event creation and real-time
    analytics event submission.
    """
    
    events = AnalyticsEventSerializer(many=True)
    
    def create(self, validated_data):
        """Create multiple events in bulk."""
        events_data = validated_data.pop('events')
        events = []
        
        for event_data in events_data:
            serializer = AnalyticsEventSerializer(
                data=event_data, 
                context=self.context
            )
            if serializer.is_valid():
                events.append(serializer.save())
        
        return {'events': events}


class AnalyticsQuerySerializer(serializers.Serializer):
    """
    Serializer for analytics query requests.
    
    Handles complex analytics queries with filtering,
    aggregation, and time-based grouping.
    """
    
    event_type = serializers.ChoiceField(
        choices=EventType.choices,
        required=False
    )
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    user_id = serializers.UUIDField(required=False)
    property_id = serializers.UUIDField(required=False)
    group_by = serializers.ChoiceField(
        choices=['hour', 'day', 'week', 'month'],
        default='day'
    )
    metrics = serializers.ListField(
        child=serializers.CharField(),
        default=['count']
    )
    
    def validate(self, data):
        """Validate query parameters."""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date:
            if end_date <= start_date:
                raise serializers.ValidationError(
                    "End date must be after start date."
                )
        
        return data


class MarketTrendsSerializer(serializers.Serializer):
    """
    Serializer for market trends data.
    
    Provides market analysis and trend information
    based on platform analytics and external data.
    """
    
    period = serializers.CharField(read_only=True)
    investment_volume = serializers.DecimalField(
        max_digits=20, decimal_places=2, read_only=True
    )
    average_property_price = serializers.DecimalField(
        max_digits=15, decimal_places=2, read_only=True
    )
    popular_locations = serializers.ListField(read_only=True)
    trending_property_types = serializers.ListField(read_only=True)
    investor_demographics = serializers.DictField(read_only=True)
    seasonal_patterns = serializers.DictField(read_only=True)
    growth_projections = serializers.DictField(read_only=True)


class CustomReportRequestSerializer(serializers.Serializer):
    """
    Serializer for custom report generation requests.
    
    Handles custom report parameters with flexible
    data selection and formatting options.
    """
    
    title = serializers.CharField(max_length=200)
    report_type = serializers.ChoiceField(choices=ReportType.choices)
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    metrics = serializers.ListField(child=serializers.CharField())
    filters = serializers.DictField(default=dict)
    format = serializers.ChoiceField(
        choices=['PDF', 'EXCEL', 'CSV'],
        default='PDF'
    )
    include_charts = serializers.BooleanField(default=True)
    recipients = serializers.ListField(
        child=serializers.EmailField(),
        required=False
    )
    schedule = serializers.DictField(required=False)
    
    def validate_end_date(self, value):
        """Validate end date is after start date."""
        start_date = self.initial_data.get('start_date')
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            if value <= start_date:
                raise serializers.ValidationError("End date must be after start date.")
        return value
    
    def validate_metrics(self, value):
        """Validate requested metrics are available."""
        available_metrics = [
            'users', 'investments', 'revenue', 'properties',
            'commissions', 'conversions', 'engagement'
        ]
        
        for metric in value:
            if metric not in available_metrics:
                raise serializers.ValidationError(
                    f"Metric '{metric}' is not available. "
                    f"Available metrics: {', '.join(available_metrics)}"
                )
        
        return value