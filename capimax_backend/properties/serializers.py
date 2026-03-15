"""
Property Serializers for Capimax Real Estate Tokenization Platform.

This module contains serializers for property management, including nested
relationships for images, documents, reviews, and construction milestones.
"""

from rest_framework import serializers
from django.db import transaction, models
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from typing import Dict, Any

from .models import (
    Property, PropertyImage, PropertyDocument, PropertyUpdate,
    PropertySubscription, PropertyReview, PropertyValuation,
    PropertyType, PropertyStatus, PropertyCategory, RentalIncomeDistribution,
    ConstructionInstallment
)
from construction.models import ConstructionMilestone
from investments.models import Investment

User = get_user_model()


class PropertyImageSerializer(serializers.ModelSerializer):
    """Serializer for property images."""
    
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = PropertyImage
        fields = [
            'id', 'image', 'image_url', 'caption', 
            'is_primary', 'order', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_image_url(self, obj):
        """Get the full URL for the image."""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
        return None


class PropertyDocumentSerializer(serializers.ModelSerializer):
    """Enhanced serializer for property documents with Data Room support."""

    document_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PropertyDocument
        fields = [
            'id', 'name', 'document', 'document_url', 'document_type',
            'description', 'size', 'version', 'is_latest',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at', 'updated_at',
            'is_public', 'investor_access'
        ]
        read_only_fields = [
            'id', 'size', 'version', 'is_latest', 'uploaded_by',
            'uploaded_at', 'updated_at'
        ]

    def get_document_url(self, obj):
        """Get the full URL for the document."""
        if obj.document:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.document.url)
        return None

    def get_uploaded_by_name(self, obj):
        """Get the name of the user who uploaded the document."""
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.email
        return None

    def create(self, validated_data):
        """Set uploaded_by and calculate file size on create."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['uploaded_by'] = request.user

        # Calculate file size
        document_file = validated_data.get('document')
        if document_file:
            validated_data['size'] = document_file.size

        return super().create(validated_data)


class PropertyDocumentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for document listings (no file data)."""

    document_url = serializers.SerializerMethodField()

    class Meta:
        model = PropertyDocument
        fields = [
            'id', 'name', 'document_type', 'description', 'size',
            'version', 'is_latest', 'uploaded_at', 'document_url'
        ]

    def get_document_url(self, obj):
        """Get the full URL for the document."""
        if obj.document:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.document.url)
        return None


class PropertyUpdateSerializer(serializers.ModelSerializer):
    """Serializer for property updates."""
    
    class Meta:
        model = PropertyUpdate
        fields = [
            'id', 'title', 'content', 'update_type', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PropertyReviewSerializer(serializers.ModelSerializer):
    """Serializer for property reviews."""
    
    user = serializers.StringRelatedField(read_only=True)
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = PropertyReview
        fields = [
            'id', 'user', 'user_name', 'rating', 'review', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'created_at']
    
    def get_user_name(self, obj):
        """Get user's display name."""
        if obj.user.first_name or obj.user.last_name:
            return f"{obj.user.first_name} {obj.user.last_name}".strip()
        return obj.user.email.split('@')[0]


class PropertyValuationSerializer(serializers.ModelSerializer):
    """Serializer for property valuations."""
    
    report_url = serializers.SerializerMethodField()
    
    class Meta:
        model = PropertyValuation
        fields = [
            'id', 'current_value', 'valuation_date', 'valuation_method',
            'appraiser', 'report', 'report_url', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_report_url(self, obj):
        """Get the full URL for the valuation report."""
        if obj.report:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.report.url)
        return None


class ConstructionMilestoneSerializer(serializers.ModelSerializer):
    """Serializer for construction milestones."""
    
    inspector_name = serializers.SerializerMethodField()
    is_delayed = serializers.ReadOnlyField()
    days_delayed = serializers.ReadOnlyField()
    
    class Meta:
        model = ConstructionMilestone
        fields = [
            'id', 'title', 'description', 'category', 'status',
            'planned_start_date', 'planned_completion_date',
            'actual_start_date', 'actual_completion_date',
            'progress_percentage', 'estimated_cost', 'actual_cost',
            'contractor', 'inspector', 'inspector_name',
            'inspection_date', 'inspection_notes', 'order',
            'is_delayed', 'days_delayed', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_delayed', 'days_delayed', 'created_at', 'updated_at']
    
    def get_inspector_name(self, obj):
        """Get inspector's display name."""
        if obj.inspector:
            if obj.inspector.first_name or obj.inspector.last_name:
                return f"{obj.inspector.first_name} {obj.inspector.last_name}".strip()
            return obj.inspector.email.split('@')[0]
        return None


class RentalIncomeDistributionSerializer(serializers.ModelSerializer):
    """Serializer for rental income distributions."""
    
    property_title = serializers.CharField(source='property.title', read_only=True)
    
    class Meta:
        model = RentalIncomeDistribution
        fields = [
            'id', 'property', 'property_title', 'distribution_period',
            'total_rental_income', 'platform_fee', 'net_distribution_amount',
            'tokens_eligible', 'amount_per_token', 'distribution_date', 'notes'
        ]
        read_only_fields = ['id', 'property_title', 'distribution_date', 'net_distribution_amount', 'amount_per_token']


class PropertyOwnerSerializer(serializers.ModelSerializer):
    """Serializer for property owner information."""
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'email', 'date_joined']


class PropertyListSerializer(serializers.ModelSerializer):
    """Serializer for property list view with limited fields."""
    
    primary_image = serializers.SerializerMethodField()
    owner = PropertyOwnerSerializer(read_only=True)
    tokens_available = serializers.ReadOnlyField()
    funding_percentage = serializers.ReadOnlyField()
    is_fully_funded = serializers.ReadOnlyField()
    can_accept_investments = serializers.ReadOnlyField()
    is_under_construction = serializers.ReadOnlyField()
    is_ready_property = serializers.ReadOnlyField()
    construction_status_display = serializers.ReadOnlyField()
    estimated_monthly_return = serializers.ReadOnlyField()
    average_rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()
    latest_valuation = serializers.SerializerMethodField()
    
    class Meta:
        model = Property
        fields = [
            'id', 'title', 'description', 'property_type', 'status', 'property_category',
            'total_value', 'token_price', 'total_tokens', 'tokens_sold',
            'tokens_available', 'funding_percentage', 'is_fully_funded',
            'can_accept_investments', 'expected_return', 'rental_yield',
            'property_size', 'year_built', 'city', 'country',
            'expected_completion_date', 'construction_progress', 'rental_income_active',
            'monthly_rental_income', 'occupancy_rate', 'supports_installments',
            'installment_period_months', 'is_under_construction', 'is_ready_property',
            'construction_status_display', 'estimated_monthly_return',
            'owner', 'featured', 'minimum_investment',
            'primary_image', 'average_rating', 'total_reviews',
            'latest_valuation', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'tokens_available', 'funding_percentage', 'is_fully_funded',
            'can_accept_investments', 'average_rating', 'total_reviews',
            'latest_valuation', 'created_at', 'updated_at'
        ]
    
    def get_primary_image(self, obj):
        """Get the primary image URL."""
        primary_image = obj.images.filter(is_primary=True).first()
        if primary_image and primary_image.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(primary_image.image.url)
        # Fall back to first image if no primary image
        first_image = obj.images.first()
        if first_image and first_image.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first_image.image.url)
        return None
    
    def get_average_rating(self, obj):
        """Calculate average rating from reviews."""
        reviews = obj.reviews.all()
        if reviews.exists():
            total_rating = sum(review.rating for review in reviews)
            return round(total_rating / reviews.count(), 2)
        return None
    
    def get_total_reviews(self, obj):
        """Get total number of reviews."""
        return obj.reviews.count()
    
    def get_latest_valuation(self, obj):
        """Get the latest property valuation."""
        latest_valuation = obj.valuations.first()
        if latest_valuation:
            return {
                'current_value': latest_valuation.current_value,
                'valuation_date': latest_valuation.valuation_date,
                'appraiser': latest_valuation.appraiser
            }
        return None


class PropertyDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed property view with all related data."""
    
    images = PropertyImageSerializer(many=True, read_only=True)
    documents = PropertyDocumentSerializer(many=True, read_only=True)
    updates = PropertyUpdateSerializer(many=True, read_only=True)
    reviews = PropertyReviewSerializer(many=True, read_only=True)
    valuations = PropertyValuationSerializer(many=True, read_only=True)
    construction_milestones = ConstructionMilestoneSerializer(many=True, read_only=True)
    rental_distributions = RentalIncomeDistributionSerializer(many=True, read_only=True)
    owner = PropertyOwnerSerializer(read_only=True)
    
    # Computed fields
    tokens_available = serializers.ReadOnlyField()
    funding_percentage = serializers.ReadOnlyField()
    is_fully_funded = serializers.ReadOnlyField()
    can_accept_investments = serializers.ReadOnlyField()
    is_under_construction = serializers.ReadOnlyField()
    is_ready_property = serializers.ReadOnlyField()
    construction_status_display = serializers.ReadOnlyField()
    estimated_monthly_return = serializers.ReadOnlyField()
    average_rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()
    total_investment = serializers.SerializerMethodField()
    investor_count = serializers.SerializerMethodField()
    construction_progress = serializers.SerializerMethodField()
    
    class Meta:
        model = Property
        fields = [
            'id', 'title', 'description', 'property_type', 'status', 'property_category',
            'total_value', 'token_price', 'total_tokens', 'tokens_sold',
            'tokens_available', 'funding_percentage', 'is_fully_funded',
            'can_accept_investments', 'expected_return', 'rental_yield',
            'property_size', 'year_built', 'address', 'city', 'state',
            'country', 'latitude', 'longitude', 'smart_contract_address',
            'expected_completion_date', 'construction_progress', 'rental_income_active',
            'monthly_rental_income', 'occupancy_rate', 'supports_installments',
            'installment_period_months', 'is_under_construction', 'is_ready_property',
            'construction_status_display', 'estimated_monthly_return',
            'owner', 'featured', 'minimum_investment',
            'spv_company_name', 'spv_registration_number',
            'spv_bank_account_number', 'spv_bank_name', 'spv_establishment_date',
            'images', 'documents', 'updates', 'reviews', 'valuations',
            'construction_milestones', 'rental_distributions', 'average_rating', 'total_reviews',
            'total_investment', 'investor_count', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'tokens_available', 'funding_percentage', 'is_fully_funded',
            'can_accept_investments', 'average_rating', 'total_reviews',
            'total_investment', 'investor_count', 'construction_progress',
            'spv_company_name', 'spv_registration_number',
            'spv_bank_account_number', 'spv_bank_name', 'spv_establishment_date',
            'created_at', 'updated_at'
        ]
    
    def get_average_rating(self, obj):
        """Calculate average rating from reviews."""
        reviews = obj.reviews.all()
        if reviews.exists():
            total_rating = sum(review.rating for review in reviews)
            return round(total_rating / reviews.count(), 2)
        return None
    
    def get_total_reviews(self, obj):
        """Get total number of reviews."""
        return obj.reviews.count()
    
    def get_total_investment(self, obj):
        """Get total amount invested in this property."""
        total = Investment.objects.filter(
            property_investment=obj,
            status='completed'
        ).aggregate(
            total=models.Sum('investment_amount')
        )['total']
        return total or Decimal('0.00')

    def get_investor_count(self, obj):
        """Get number of unique investors."""
        return Investment.objects.filter(
            property_investment=obj,
            status='completed'
        ).values('user').distinct().count()
    
    def get_construction_progress(self, obj):
        """Get overall construction progress."""
        milestones = obj.construction_milestones.all()
        if not milestones.exists():
            return None
        
        total_progress = sum(
            milestone.progress_percentage for milestone in milestones
        )
        return round(total_progress / milestones.count(), 2)


class PropertyCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating properties."""
    
    images = PropertyImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Property
        fields = [
            'title', 'description', 'property_type', 'property_category',
            'total_value', 'token_price', 'total_tokens', 'expected_return',
            'rental_yield', 'property_size', 'year_built',
            'address', 'city', 'state', 'country', 'latitude',
            'longitude', 'expected_completion_date', 'construction_progress',
            'rental_income_active', 'monthly_rental_income', 'occupancy_rate',
            'supports_installments', 'installment_period_months',
            'featured', 'minimum_investment', 'images'
        ]
    
    def validate(self, attrs):
        """Validate property data."""
        # Calculate if total_value matches token_price * total_tokens
        if 'total_value' in attrs and 'token_price' in attrs and 'total_tokens' in attrs:
            calculated_value = attrs['token_price'] * attrs['total_tokens']
            if abs(calculated_value - attrs['total_value']) > Decimal('0.01'):
                raise serializers.ValidationError(
                    "Total value should equal token price multiplied by total tokens"
                )
        
        # Validate minimum investment
        if 'minimum_investment' in attrs and 'token_price' in attrs:
            if attrs['minimum_investment'] < attrs['token_price']:
                raise serializers.ValidationError(
                    "Minimum investment cannot be less than token price"
                )
        
        # Validate property category specific fields
        property_category = attrs.get('property_category', PropertyCategory.READY_PROPERTY)
        
        if property_category == PropertyCategory.UNDER_CONSTRUCTION:
            # Validate construction-specific fields
            if not attrs.get('expected_completion_date'):
                raise serializers.ValidationError(
                    "Expected completion date is required for construction properties"
                )
            if attrs.get('supports_installments') and not attrs.get('installment_period_months'):
                raise serializers.ValidationError(
                    "Installment period is required when installments are supported"
                )
        
        elif property_category == PropertyCategory.READY_PROPERTY:
            # Validate ready property specific fields
            if attrs.get('rental_income_active') and not attrs.get('monthly_rental_income'):
                raise serializers.ValidationError(
                    "Monthly rental income is required when rental income is active"
                )
        
        return attrs
    
    def create(self, validated_data):
        """Create a new property."""
        user = self.context['request'].user
        validated_data['owner'] = user
        validated_data['status'] = PropertyStatus.DRAFT
        return super().create(validated_data)


class PropertySubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for property subscriptions."""
    
    property_title = serializers.CharField(source='property.title', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = PropertySubscription
        fields = ['id', 'property', 'property_title', 'user_email', 'subscribed_at']
        read_only_fields = ['id', 'user_email', 'subscribed_at']
    
    def create(self, validated_data):
        """Create subscription for the current user."""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class PropertyAnalyticsSerializer(serializers.Serializer):
    """Serializer for property analytics data."""
    
    total_investment = serializers.DecimalField(max_digits=15, decimal_places=2)
    investor_count = serializers.IntegerField()
    average_investment = serializers.DecimalField(max_digits=15, decimal_places=2)
    funding_velocity = serializers.DecimalField(max_digits=10, decimal_places=2)
    views_count = serializers.IntegerField()
    subscriptions_count = serializers.IntegerField()
    construction_progress = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    roi_projection = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    monthly_investment_data = serializers.ListField(child=serializers.DictField())
    investor_demographics = serializers.DictField()
    performance_metrics = serializers.DictField()


class PropertySearchSerializer(serializers.Serializer):
    """Serializer for property search parameters."""
    
    search = serializers.CharField(required=False, help_text="Search in title, description, city")
    property_type = serializers.MultipleChoiceField(
        choices=PropertyType.choices,
        required=False,
        help_text="Filter by property type"
    )
    property_category = serializers.MultipleChoiceField(
        choices=PropertyCategory.choices,
        required=False,
        help_text="Filter by property category (construction vs ready)"
    )
    status = serializers.MultipleChoiceField(
        choices=PropertyStatus.choices,
        required=False,
        help_text="Filter by property status"
    )
    min_price = serializers.DecimalField(
        max_digits=15, decimal_places=2, required=False,
        help_text="Minimum total property value"
    )
    max_price = serializers.DecimalField(
        max_digits=15, decimal_places=2, required=False,
        help_text="Maximum total property value"
    )
    min_token_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False,
        help_text="Minimum token price"
    )
    max_token_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False,
        help_text="Maximum token price"
    )
    min_return = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False,
        help_text="Minimum expected return"
    )
    max_return = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False,
        help_text="Maximum expected return"
    )
    city = serializers.CharField(required=False, help_text="Filter by city")
    country = serializers.CharField(required=False, help_text="Filter by country")
    featured = serializers.BooleanField(required=False, help_text="Filter featured properties")
    available_tokens = serializers.BooleanField(
        required=False, help_text="Only properties with available tokens"
    )
    min_funding_percentage = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False,
        help_text="Minimum funding percentage"
    )
    max_funding_percentage = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False,
        help_text="Maximum funding percentage"
    )
    ordering = serializers.CharField(
        required=False,
        help_text="Order by: created_at, -created_at, total_value, -total_value, etc."
    )


class ConstructionInstallmentSerializer(serializers.ModelSerializer):
    """Serializer for ConstructionInstallment model."""
    
    # Computed fields
    remaining_amount = serializers.ReadOnlyField()
    remaining_payments = serializers.ReadOnlyField()
    completion_percentage = serializers.ReadOnlyField()
    tokens_pending_release = serializers.ReadOnlyField()
    is_completed = serializers.ReadOnlyField()
    is_active = serializers.ReadOnlyField()
    
    # Property details
    property_title = serializers.CharField(source='property_investment.title', read_only=True)
    property_address = serializers.CharField(source='property_investment.address', read_only=True)
    property_category = serializers.CharField(source='property_investment.property_category', read_only=True)
    
    # Investor details
    investor_email = serializers.CharField(source='investor.email', read_only=True)
    
    class Meta:
        model = ConstructionInstallment
        fields = [
            'id', 'property_investment', 'investor', 'total_investment_amount',
            'token_allocation', 'installment_amount', 'total_installments',
            'frequency', 'payments_made', 'total_amount_paid',
            'tokens_released', 'next_payment_date', 'completion_date',
            'status', 'graduated_release', 'tokens_per_payment',
            'early_completion_discount', 'late_payment_fee', 'grace_period_days',
            'notes', 'remaining_amount', 'remaining_payments',
            'completion_percentage', 'tokens_pending_release',
            'is_completed', 'is_active', 'property_title',
            'property_address', 'property_category', 'investor_email',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'payments_made', 'total_amount_paid', 'tokens_released',
            'tokens_per_payment', 'remaining_amount', 'remaining_payments',
            'completion_percentage', 'tokens_pending_release', 'is_completed',
            'is_active', 'property_title', 'property_address',
            'property_category', 'investor_email', 'created_at', 'updated_at'
        ]
    
    def validate(self, attrs):
        """Validate installment payment data."""
        # Validate that property supports installments if creating new
        if self.instance is None:  # Creating new
            property_obj = attrs.get('property_investment')
            if property_obj and not property_obj.supports_installments:
                raise serializers.ValidationError(
                    "This property does not support installment payments"
                )
            
            # Validate that property is under construction
            if property_obj and not property_obj.is_under_construction:
                raise serializers.ValidationError(
                    "Installment payments are only available for construction properties"
                )
        
        # Validate installment configuration
        total_investment = attrs.get('total_investment_amount')
        installment_amount = attrs.get('installment_amount')
        total_installments = attrs.get('total_installments')
        
        if total_investment and installment_amount and total_installments:
            expected_total = installment_amount * total_installments
            if abs(expected_total - total_investment) > Decimal('0.01'):
                raise serializers.ValidationError(
                    "Total investment amount should equal installment amount × total installments"
                )
        
        # Validate token allocation
        property_obj = attrs.get('property_investment') or (self.instance.property_investment if self.instance else None)
        token_allocation = attrs.get('token_allocation')
        
        if property_obj and token_allocation:
            if token_allocation > property_obj.tokens_available:
                raise serializers.ValidationError(
                    f"Token allocation ({token_allocation}) exceeds available tokens ({property_obj.tokens_available})"
                )
            
            # Calculate if investment amount matches token allocation
            expected_amount = property_obj.token_price * token_allocation
            if total_investment and abs(expected_amount - total_investment) > Decimal('0.01'):
                raise serializers.ValidationError(
                    f"Investment amount should equal token price (${property_obj.token_price}) × token allocation ({token_allocation})"
                )
        
        # Validate dates
        next_payment_date = attrs.get('next_payment_date')
        completion_date = attrs.get('completion_date')
        
        if next_payment_date and completion_date:
            if next_payment_date > completion_date:
                raise serializers.ValidationError(
                    "Next payment date cannot be after completion date"
                )
        
        # Validate frequency and installment period
        if property_obj and attrs.get('frequency') == 'monthly':
            max_months = property_obj.installment_period_months or 36
            if total_installments and total_installments > max_months:
                raise serializers.ValidationError(
                    f"Total installments ({total_installments}) exceeds maximum allowed period ({max_months} months)"
                )
        
        return attrs


class ConstructionInstallmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating installment payment plans."""
    
    class Meta:
        model = ConstructionInstallment
        fields = [
            'property_investment', 'total_investment_amount', 'token_allocation',
            'total_installments', 'frequency', 'graduated_release',
            'notes'
        ]
    
    def validate(self, attrs):
        """Validate installment payment creation data."""
        property_obj = attrs.get('property_investment')
        
        # Validate property supports installments
        if not property_obj.supports_installments:
            raise serializers.ValidationError(
                "This property does not support installment payments"
            )
        
        # Validate property is under construction
        if not property_obj.is_under_construction:
            raise serializers.ValidationError(
                "Installment payments are only available for construction properties"
            )
        
        # Validate token allocation
        token_allocation = attrs.get('token_allocation')
        if token_allocation > property_obj.tokens_available:
            raise serializers.ValidationError(
                f"Token allocation ({token_allocation}) exceeds available tokens ({property_obj.tokens_available})"
            )
        
        # Calculate investment amount and installment amount
        total_investment_amount = property_obj.token_price * token_allocation
        total_installments = attrs.get('total_installments')
        installment_amount = total_investment_amount / total_installments
        
        # Validate minimum installment amount (e.g., $100)
        min_installment = Decimal('100.00')
        if installment_amount < min_installment:
            raise serializers.ValidationError(
                f"Installment amount (${installment_amount:.2f}) is below minimum (${min_installment})"
            )
        
        attrs['total_investment_amount'] = total_investment_amount
        attrs['installment_amount'] = installment_amount
        
        return attrs
    
    def create(self, validated_data):
        """Create installment payment plan with calculated fields."""
        from django.utils import timezone
        from dateutil.relativedelta import relativedelta
        
        # Set investor to current user
        validated_data['investor'] = self.context['request'].user
        
        # Calculate next payment date (1 month from now by default)
        frequency = validated_data.get('frequency', 'monthly')
        if frequency == 'monthly':
            next_payment = timezone.now().date() + relativedelta(months=1)
        elif frequency == 'quarterly':
            next_payment = timezone.now().date() + relativedelta(months=3)
        elif frequency == 'semi_annual':
            next_payment = timezone.now().date() + relativedelta(months=6)
        elif frequency == 'annual':
            next_payment = timezone.now().date() + relativedelta(months=12)
        else:
            next_payment = timezone.now().date() + relativedelta(months=1)
        
        validated_data['next_payment_date'] = next_payment
        
        # Set initial status
        validated_data['status'] = 'pending'
        
        return super().create(validated_data)


class ConstructionInstallmentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating installment payment plans."""
    
    class Meta:
        model = ConstructionInstallment
        fields = [
            'status', 'notes', 'late_payment_fee', 'grace_period_days'
        ]
    
    def validate_status(self, value):
        """Validate status transitions."""
        if self.instance:
            current_status = self.instance.status
            
            # Define allowed status transitions
            allowed_transitions = {
                'pending': ['processing', 'cancelled'],
                'processing': ['completed', 'failed', 'cancelled'],
                'completed': [],  # No transitions from completed
                'failed': ['pending', 'cancelled'],
                'cancelled': [],  # No transitions from cancelled
                'refunded': []   # No transitions from refunded
            }
            
            if value not in allowed_transitions.get(current_status, []):
                raise serializers.ValidationError(
                    f"Cannot transition from {current_status} to {value}"
                )
        
        return value


class RentalIncomeDistributionSerializer(serializers.ModelSerializer):
    """
    Serializer for rental income distribution records.
    
    Provides detailed information about rental income distributions
    including calculated metrics and property information.
    """
    
    property_title = serializers.CharField(source='property.title', read_only=True)
    property_type = serializers.CharField(source='property.property_type', read_only=True)
    property_city = serializers.CharField(source='property.city', read_only=True)
    property_country = serializers.CharField(source='property.country', read_only=True)
    
    # Calculated fields
    platform_fee_percentage = serializers.SerializerMethodField()
    monthly_yield_percentage = serializers.SerializerMethodField()
    annual_yield_projection = serializers.SerializerMethodField()
    occupancy_rate = serializers.DecimalField(
        source='property.occupancy_rate', 
        max_digits=5, 
        decimal_places=2, 
        read_only=True
    )
    
    # Formatted currency fields
    total_rental_income_formatted = serializers.SerializerMethodField()
    platform_fee_formatted = serializers.SerializerMethodField()
    net_distribution_amount_formatted = serializers.SerializerMethodField()
    amount_per_token_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = RentalIncomeDistribution
        fields = [
            'id', 'property', 'property_title', 'property_type', 
            'property_city', 'property_country', 'distribution_period',
            'total_rental_income', 'platform_fee', 'net_distribution_amount',
            'tokens_eligible', 'amount_per_token', 'distribution_date',
            'notes', 'platform_fee_percentage', 'monthly_yield_percentage',
            'annual_yield_projection', 'occupancy_rate',
            'total_rental_income_formatted', 'platform_fee_formatted',
            'net_distribution_amount_formatted', 'amount_per_token_formatted'
        ]
        read_only_fields = fields  # All fields are read-only
    
    def get_platform_fee_percentage(self, obj):
        """Calculate platform fee as percentage of total rental income."""
        if obj.total_rental_income and obj.total_rental_income > 0:
            return float((obj.platform_fee / obj.total_rental_income * 100).quantize(
                Decimal('0.01')
            ))
        return 0.00
    
    def get_monthly_yield_percentage(self, obj):
        """Calculate monthly yield percentage based on property value."""
        if obj.property.total_value and obj.property.total_value > 0:
            return float((obj.net_distribution_amount / obj.property.total_value * 100).quantize(
                Decimal('0.01')
            ))
        return 0.00
    
    def get_annual_yield_projection(self, obj):
        """Calculate projected annual yield based on monthly distribution."""
        monthly_yield = self.get_monthly_yield_percentage(obj)
        return monthly_yield * 12
    
    def get_total_rental_income_formatted(self, obj):
        """Format total rental income as currency string."""
        return f"${obj.total_rental_income:,.2f}"
    
    def get_platform_fee_formatted(self, obj):
        """Format platform fee as currency string."""
        return f"${obj.platform_fee:,.2f}"
    
    def get_net_distribution_amount_formatted(self, obj):
        """Format net distribution amount as currency string."""
        return f"${obj.net_distribution_amount:,.2f}"
    
    def get_amount_per_token_formatted(self, obj):
        """Format amount per token with high precision."""
        return f"${obj.amount_per_token:.8f}"


class RentalIncomeDistributionDetailSerializer(RentalIncomeDistributionSerializer):
    """
    Detailed serializer for rental income distributions with additional analytics.
    
    Includes investor statistics, property performance metrics,
    and historical comparison data.
    """
    
    property_details = serializers.SerializerMethodField()
    investor_statistics = serializers.SerializerMethodField()
    distribution_efficiency = serializers.SerializerMethodField()
    historical_comparison = serializers.SerializerMethodField()
    
    class Meta(RentalIncomeDistributionSerializer.Meta):
        fields = RentalIncomeDistributionSerializer.Meta.fields + [
            'property_details', 'investor_statistics', 
            'distribution_efficiency', 'historical_comparison'
        ]
    
    def get_property_details(self, obj):
        """Get detailed property information."""
        return {
            'total_value': float(obj.property.total_value),
            'total_tokens': obj.property.total_tokens,
            'tokens_sold': obj.property.tokens_sold,
            'funding_percentage': float(obj.property.funding_percentage),
            'rental_yield': float(obj.property.rental_yield) if obj.property.rental_yield else None,
            'expected_return': float(obj.property.expected_return) if obj.property.expected_return else None,
            'property_age_months': (obj.distribution_date - obj.property.created_at.date()).days // 30
        }
    
    def get_investor_statistics(self, obj):
        """Get investor statistics for this distribution."""
        from investments.models import Investment
        
        # Get all active investments for this property
        investments = Investment.objects.filter(
            property=obj.property,
            status='active',
            token_count__gt=0
        )
        
        if not investments.exists():
            return {
                'total_investors': 0,
                'total_tokens_held': 0,
                'average_tokens_per_investor': 0,
                'largest_holding': 0,
                'smallest_holding': 0
            }
        
        token_counts = [inv.token_count for inv in investments]
        
        return {
            'total_investors': len(token_counts),
            'total_tokens_held': sum(token_counts),
            'average_tokens_per_investor': sum(token_counts) // len(token_counts),
            'largest_holding': max(token_counts),
            'smallest_holding': min(token_counts)
        }
    
    def get_distribution_efficiency(self, obj):
        """Calculate distribution efficiency metrics."""
        # This would typically track actual vs expected distributions
        # For now, we'll provide basic efficiency metrics
        
        expected_monthly_income = obj.property.monthly_rental_income or Decimal('0.00')
        actual_income = obj.total_rental_income
        
        efficiency_percentage = 100.0
        if expected_monthly_income > 0:
            efficiency_percentage = float((actual_income / expected_monthly_income * 100).quantize(
                Decimal('0.01')
            ))
        
        return {
            'expected_monthly_income': float(expected_monthly_income),
            'actual_income': float(actual_income),
            'efficiency_percentage': efficiency_percentage,
            'variance': float(actual_income - expected_monthly_income),
            'occupancy_impact': float(obj.property.occupancy_rate or 100) - 100.0
        }
    
    def get_historical_comparison(self, obj):
        """Get historical comparison with previous distributions."""
        # Get previous distribution for this property
        previous_distribution = RentalIncomeDistribution.objects.filter(
            property=obj.property,
            distribution_date__lt=obj.distribution_date
        ).order_by('-distribution_date').first()
        
        if not previous_distribution:
            return {
                'has_previous': False,
                'income_change': 0.0,
                'income_change_percentage': 0.0,
                'token_count_change': 0,
                'amount_per_token_change': 0.0
            }
        
        income_change = obj.total_rental_income - previous_distribution.total_rental_income
        income_change_percentage = 0.0
        if previous_distribution.total_rental_income > 0:
            income_change_percentage = float(
                (income_change / previous_distribution.total_rental_income * 100).quantize(
                    Decimal('0.01')
                )
            )
        
        token_count_change = obj.tokens_eligible - previous_distribution.tokens_eligible
        amount_per_token_change = obj.amount_per_token - previous_distribution.amount_per_token
        
        return {
            'has_previous': True,
            'previous_period': previous_distribution.distribution_period,
            'previous_date': previous_distribution.distribution_date,
            'income_change': float(income_change),
            'income_change_percentage': income_change_percentage,
            'token_count_change': token_count_change,
            'amount_per_token_change': float(amount_per_token_change),
            'months_since_previous': (
                obj.distribution_date.replace(day=1) - 
                previous_distribution.distribution_date.replace(day=1)
            ).days // 30
        }


class UserRentalIncomeStatisticsSerializer(serializers.Serializer):
    """
    Serializer for user-specific rental income statistics.
    
    Provides aggregated statistics for all of a user's rental
    income from their property investments.
    """
    
    total_properties_with_rental_income = serializers.IntegerField()
    total_tokens_earning_income = serializers.IntegerField()
    total_rental_income_received = serializers.DecimalField(max_digits=15, decimal_places=2)
    average_monthly_income = serializers.DecimalField(max_digits=15, decimal_places=2)
    distribution_count = serializers.IntegerField()
    
    # Property-specific statistics
    properties = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=True
    )
    
    # Formatted fields
    total_rental_income_received_formatted = serializers.SerializerMethodField()
    average_monthly_income_formatted = serializers.SerializerMethodField()
    
    def get_total_rental_income_received_formatted(self, obj):
        """Format total rental income received as currency."""
        return f"${float(obj['total_rental_income_received']):,.2f}"
    
    def get_average_monthly_income_formatted(self, obj):
        """Format average monthly income as currency."""
        return f"${float(obj['average_monthly_income']):,.2f}"


class RentalDistributionReportSerializer(serializers.Serializer):
    """
    Serializer for comprehensive rental distribution reports.
    
    Used for generating detailed reports for specific periods
    with aggregated statistics and property breakdowns.
    """
    
    period = serializers.CharField()
    total_distributions = serializers.IntegerField()
    unique_properties = serializers.IntegerField()
    unique_investors = serializers.IntegerField()
    
    # Financial summary
    financial_summary = serializers.DictField()
    
    # Token and yield metrics
    token_metrics = serializers.DictField()
    yield_metrics = serializers.DictField()
    
    # Distribution details
    distribution_details = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=True
    )
    
    # Report metadata
    generated_at = serializers.DateTimeField(default=timezone.now)
    generated_by = serializers.CharField(required=False)
    report_type = serializers.CharField(default='monthly_distribution')