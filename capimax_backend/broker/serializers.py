"""
Broker Serializers for Capimax Real Estate Tokenization Platform.

This module contains serializers for broker management, commission tracking,
referral systems, and performance metrics API endpoints.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from .models import (
    BrokerProfile, BrokerCommission, BrokerReferral,
    MarketingMaterial, BrokerPerformanceMetrics, BrokerApplication,
    BrokerVerificationStatus, CommissionType, CommissionStatus,
    BrokerApplicationStatus, ExperienceLevel
)

User = get_user_model()


class BrokerProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for broker profile data.
    
    Handles broker profile creation, updates, and detail views
    with validation for license information and commission rates.
    """
    
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    is_license_valid = serializers.SerializerMethodField()
    is_premium_active = serializers.SerializerMethodField()
    commission_tier = serializers.SerializerMethodField()
    
    class Meta:
        model = BrokerProfile
        fields = [
            'id', 'user', 'user_email', 'user_name', 'license_number',
            'license_state', 'license_expiry', 'verification_status',
            'commission_rate', 'referral_commission_rate', 'company_name',
            'company_address', 'website', 'bio', 'experience_years',
            'specializations', 'languages_spoken', 'profile_image',
            'is_premium', 'premium_expires_at', 'total_sales',
            'total_commissions_earned', 'active_referrals_count',
            'is_license_valid', 'is_premium_active', 'commission_tier',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'total_sales', 'total_commissions_earned',
            'active_referrals_count', 'created_at', 'updated_at'
        ]
    
    def get_is_license_valid(self, obj):
        """Check if broker license is valid."""
        return obj.is_verified()
    
    def get_is_premium_active(self, obj):
        """Check if premium subscription is active."""
        return obj.is_premium_active()
    
    def get_commission_tier(self, obj):
        """Get commission tier based on performance."""
        if obj.total_sales >= 1000000:
            return 'platinum'
        elif obj.total_sales >= 500000:
            return 'gold'
        elif obj.total_sales >= 100000:
            return 'silver'
        return 'bronze'
    
    def validate_license_expiry(self, value):
        """Validate license expiry date."""
        if value <= timezone.now().date():
            raise serializers.ValidationError("License expiry date must be in the future.")
        return value
    
    def validate_commission_rate(self, value):
        """Validate commission rate range."""
        if not (Decimal('0.01') <= value <= Decimal('10.00')):
            raise serializers.ValidationError("Commission rate must be between 0.01% and 10.00%.")
        return value
    
    def validate_referral_commission_rate(self, value):
        """Validate referral commission rate range."""
        if not (Decimal('0.01') <= value <= Decimal('5.00')):
            raise serializers.ValidationError("Referral commission rate must be between 0.01% and 5.00%.")
        return value


class BrokerCommissionSerializer(serializers.ModelSerializer):
    """
    Serializer for broker commission tracking.
    
    Handles commission creation, status updates, and payment tracking
    with automated calculation based on investment amounts.
    """
    
    broker_name = serializers.CharField(source='broker.user.get_full_name', read_only=True)
    broker_email = serializers.EmailField(source='broker.user.email', read_only=True)
    investment_property = serializers.CharField(
        source='investment.property_investment.title', read_only=True
    )
    referral_code = serializers.CharField(source='referral.referral_code', read_only=True)
    commission_percentage = serializers.SerializerMethodField()
    days_since_earned = serializers.SerializerMethodField()
    
    class Meta:
        model = BrokerCommission
        fields = [
            'id', 'broker', 'broker_name', 'broker_email', 'investment',
            'investment_property', 'referral', 'referral_code',
            'commission_type', 'base_amount', 'commission_rate',
            'commission_amount', 'commission_percentage', 'status',
            'earned_at', 'approved_at', 'paid_at', 'payment_reference',
            'days_since_earned', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'commission_amount', 'earned_at', 'approved_at',
            'paid_at', 'created_at', 'updated_at'
        ]
    
    def get_commission_percentage(self, obj):
        """Get commission as percentage of base amount."""
        if obj.base_amount > 0:
            return round(float(obj.commission_amount / obj.base_amount * 100), 2)
        return 0.0
    
    def get_days_since_earned(self, obj):
        """Get days since commission was earned."""
        return (timezone.now() - obj.earned_at).days
    
    def validate(self, data):
        """Validate commission data."""
        if 'base_amount' in data and 'commission_rate' in data:
            # Calculate commission amount
            base_amount = data['base_amount']
            commission_rate = data['commission_rate']
            data['commission_amount'] = (base_amount * commission_rate) / Decimal('100')
        return data
    
    def create(self, validated_data):
        """Create commission with automatic calculation."""
        broker = validated_data['broker']
        commission_type = validated_data.get('commission_type', CommissionType.INVESTMENT)
        base_amount = validated_data['base_amount']
        
        # Calculate commission using broker profile method
        commission_amount = broker.calculate_commission(base_amount, commission_type)
        validated_data['commission_amount'] = commission_amount
        validated_data['commission_rate'] = broker.commission_rate
        
        return super().create(validated_data)


class BrokerReferralSerializer(serializers.ModelSerializer):
    """
    Serializer for broker referral tracking.
    
    Handles referral code generation, user tracking, and conversion
    metrics with commission calculation.
    """
    
    broker_name = serializers.CharField(source='broker.user.get_full_name', read_only=True)
    referred_user_name = serializers.CharField(
        source='referred_user.get_full_name', read_only=True
    )
    conversion_rate = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    days_since_created = serializers.SerializerMethodField()
    
    class Meta:
        model = BrokerReferral
        fields = [
            'id', 'broker', 'broker_name', 'referral_code', 'referred_user',
            'referred_user_name', 'referred_email', 'is_converted',
            'conversion_amount', 'commission_earned', 'conversion_rate',
            'first_investment_at', 'last_activity_at', 'is_active',
            'expires_at', 'is_expired', 'days_since_created', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'referral_code', 'is_converted', 'conversion_amount',
            'commission_earned', 'first_investment_at', 'last_activity_at',
            'created_at', 'updated_at'
        ]
    
    def get_conversion_rate(self, obj):
        """Calculate conversion rate as percentage."""
        if obj.conversion_amount > 0:
            return round(float(obj.commission_earned / obj.conversion_amount * 100), 2)
        return 0.0
    
    def get_is_expired(self, obj):
        """Check if referral code has expired."""
        return not obj.is_valid()
    
    def get_days_since_created(self, obj):
        """Get days since referral was created."""
        return (timezone.now() - obj.created_at).days
    
    def validate_expires_at(self, value):
        """Validate expiration date."""
        if value and value <= timezone.now():
            raise serializers.ValidationError("Expiration date must be in the future.")
        return value


class MarketingMaterialSerializer(serializers.ModelSerializer):
    """
    Serializer for marketing materials.
    
    Handles file uploads, download tracking, and access control
    based on broker premium status.
    """
    
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    file_size_mb = serializers.SerializerMethodField()
    is_downloadable = serializers.SerializerMethodField()
    
    class Meta:
        model = MarketingMaterial
        fields = [
            'id', 'title', 'description', 'material_type', 'file',
            'file_url', 'thumbnail', 'thumbnail_url', 'file_size',
            'file_size_mb', 'file_format', 'is_active', 'is_premium_only',
            'download_count', 'version', 'tags', 'created_by',
            'created_by_name', 'is_downloadable', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'file_size', 'file_format', 'download_count',
            'created_at', 'updated_at'
        ]
    
    def get_file_url(self, obj):
        """Get file URL if available."""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def get_thumbnail_url(self, obj):
        """Get thumbnail URL if available."""
        if obj.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
            return obj.thumbnail.url
        return None
    
    def get_file_size_mb(self, obj):
        """Get file size in megabytes."""
        return round(obj.file_size / (1024 * 1024), 2)
    
    def get_is_downloadable(self, obj):
        """Check if material is downloadable by current user."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        if not obj.is_active:
            return False
        
        # Check premium requirements
        if obj.is_premium_only:
            if hasattr(request.user, 'broker_profile'):
                return request.user.broker_profile.is_premium_active()
            return False
        
        return True
    
    def create(self, validated_data):
        """Create marketing material with file metadata."""
        file_obj = validated_data.get('file')
        if file_obj:
            validated_data['file_size'] = file_obj.size
            validated_data['file_format'] = file_obj.name.split('.')[-1].upper()
        
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        
        return super().create(validated_data)


class BrokerPerformanceMetricsSerializer(serializers.ModelSerializer):
    """
    Serializer for broker performance metrics.
    
    Handles monthly performance data with calculated scores
    and rankings among all brokers.
    """
    
    broker_name = serializers.CharField(source='broker.user.get_full_name', read_only=True)
    performance_score = serializers.SerializerMethodField()
    month_name = serializers.SerializerMethodField()
    avg_commission_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = BrokerPerformanceMetrics
        fields = [
            'id', 'broker', 'broker_name', 'month', 'month_name',
            'total_sales', 'total_commissions', 'investment_count',
            'new_referrals', 'converted_referrals', 'referral_conversion_rate',
            'avg_investment_size', 'avg_commission_rate', 'unique_investors',
            'repeat_investors', 'client_retention_rate',
            'marketing_materials_downloaded', 'performance_rank',
            'performance_score', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'performance_rank', 'created_at', 'updated_at'
        ]
    
    def get_performance_score(self, obj):
        """Get calculated performance score."""
        return obj.calculate_performance_score()
    
    def get_month_name(self, obj):
        """Get month name in readable format."""
        return obj.month.strftime('%B %Y')
    
    def get_avg_commission_rate(self, obj):
        """Calculate average commission rate."""
        if obj.total_sales > 0:
            return round(float(obj.total_commissions / obj.total_sales * 100), 2)
        return 0.0
    
    def validate_month(self, value):
        """Validate month is first day of month."""
        if value.day != 1:
            raise serializers.ValidationError("Month must be the first day of the month.")
        return value


class BrokerDashboardSerializer(serializers.Serializer):
    """
    Serializer for broker dashboard summary data.
    
    Combines profile, performance, and commission data
    for comprehensive dashboard view.
    """
    
    profile = BrokerProfileSerializer(read_only=True)
    current_month_metrics = BrokerPerformanceMetricsSerializer(read_only=True)
    pending_commissions = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    active_referrals = serializers.IntegerField(read_only=True)
    this_month_sales = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    conversion_rate = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    rank_change = serializers.IntegerField(read_only=True)
    top_properties = serializers.ListField(read_only=True)


class BrokerCommissionSummarySerializer(serializers.Serializer):
    """
    Serializer for commission summary data.
    
    Provides aggregated commission statistics
    for reporting and analytics.
    """
    
    total_earned = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_pending = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    this_month = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    last_month = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    growth_rate = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    avg_commission_size = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    commission_count = serializers.IntegerField(read_only=True)
    by_type = serializers.DictField(read_only=True)


class ReferralLinkGeneratorSerializer(serializers.Serializer):
    """
    Serializer for generating referral links.
    
    Handles referral code generation with custom
    parameters and expiration settings.
    """
    
    expires_at = serializers.DateTimeField(required=False)
    notes = serializers.CharField(max_length=500, required=False)
    custom_code = serializers.CharField(max_length=20, required=False)
    
    def validate_custom_code(self, value):
        """Validate custom referral code."""
        if value:
            if BrokerReferral.objects.filter(referral_code=value).exists():
                raise serializers.ValidationError("This referral code is already in use.")
            if not value.isalnum():
                raise serializers.ValidationError("Referral code must contain only letters and numbers.")
        return value
    
    def validate_expires_at(self, value):
        """Validate expiration date."""
        if value and value <= timezone.now():
            raise serializers.ValidationError("Expiration date must be in the future.")
        return value


class BrokerApplicationSerializer(serializers.ModelSerializer):
    """
    Serializer for broker application submissions.

    Handles the complete broker application form data including
    personal information, professional credentials, and file uploads.
    """

    full_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_application_status_display', read_only=True)
    experience_display = serializers.CharField(source='get_experience_level_display', read_only=True)

    class Meta:
        model = BrokerApplication
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'email',
            'phone_number', 'country', 'city_address', 'license_number',
            'experience_level', 'experience_display', 'current_company',
            'referral_strategy', 'supporting_documents', 'terms_accepted',
            'application_status', 'status_display', 'rejection_reason',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'application_status', 'rejection_reason', 'created_at', 'updated_at'
        ]

    def get_full_name(self, obj):
        """Get applicant's full name."""
        return obj.get_full_name()

    def validate_email(self, value):
        """Validate email uniqueness."""
        if BrokerApplication.objects.filter(email=value).exists():
            raise serializers.ValidationError("An application with this email already exists.")
        return value

    def validate_terms_accepted(self, value):
        """Ensure terms are accepted."""
        if not value:
            raise serializers.ValidationError("You must accept the Broker Program Terms & Conditions.")
        return value

    def validate(self, data):
        """Validate the complete application."""
        # Ensure required fields are present
        required_fields = ['first_name', 'last_name', 'email', 'phone_number',
                          'country', 'city_address', 'experience_level', 'referral_strategy']

        for field in required_fields:
            if not data.get(field):
                raise serializers.ValidationError(f"{field.replace('_', ' ').title()} is required.")

        return data


class BrokerApplicationStatusSerializer(serializers.ModelSerializer):
    """
    Serializer for checking broker application status.

    Provides read-only status information for applicants
    to check their application progress.
    """

    full_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_application_status_display', read_only=True)

    class Meta:
        model = BrokerApplication
        fields = [
            'id', 'full_name', 'email', 'application_status', 'status_display',
            'reviewed_at', 'rejection_reason', 'created_at'
        ]
        read_only_fields = ['id', 'full_name', 'email', 'application_status', 'status_display',
            'reviewed_at', 'rejection_reason', 'created_at']

    def get_full_name(self, obj):
        """Get applicant's full name."""
        return obj.get_full_name()


class AdminBrokerApplicationSerializer(serializers.ModelSerializer):
    """
    Serializer for admin review of broker applications.

    Includes admin-specific fields for reviewing and managing
    broker applications in the admin panel.
    """

    full_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_application_status_display', read_only=True)
    experience_display = serializers.CharField(source='get_experience_level_display', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)

    class Meta:
        model = BrokerApplication
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'email',
            'phone_number', 'country', 'city_address', 'license_number',
            'experience_level', 'experience_display', 'current_company',
            'referral_strategy', 'supporting_documents', 'terms_accepted',
            'application_status', 'status_display', 'reviewed_by',
            'reviewed_by_name', 'reviewed_at', 'rejection_reason',
            'admin_notes', 'associated_user', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'first_name', 'last_name', 'email', 'phone_number',
            'country', 'city_address', 'license_number', 'experience_level',
            'current_company', 'referral_strategy', 'supporting_documents',
            'terms_accepted', 'created_at', 'updated_at'
        ]

    def get_full_name(self, obj):
        """Get applicant's full name."""
        return obj.get_full_name()

