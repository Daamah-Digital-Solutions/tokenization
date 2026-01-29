"""
Serializers for Liquidity Provider module.
"""

from rest_framework import serializers
from django.utils import timezone
from decimal import Decimal

from .models import (
    LPApplication, LiquidityProvider, ExitRequest, LiquidityTransaction,
    LPApplicationStatus, LPStatus, ExitRequestStatus, EntityType
)


class LPApplicationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating LP applications."""

    preferred_currencies = serializers.ListField(
        child=serializers.ChoiceField(choices=['USD', 'EUR', 'CRYPTO', 'OTHER']),
        min_length=1
    )

    class Meta:
        model = LPApplication
        fields = [
            # Entity Information
            'legal_entity_name', 'country', 'jurisdiction', 'entity_type',
            'registration_number', 'website',
            # Contact Information
            'contact_person_name', 'contact_position', 'official_email', 'phone_number',
            # Financial Information
            'approximate_liquidity_available', 'preferred_currencies', 'average_transaction_size',
            # Operating Policy
            'target_ready_properties', 'target_under_construction', 'target_property_portfolios',
            'expected_discount_rate', 'max_per_transaction', 'max_per_month',
            # Acknowledgments
            'ack_independent_provider', 'ack_no_exit_guarantee', 'ack_compliance_agreement'
        ]

    def validate(self, attrs):
        """Validate all acknowledgments are accepted."""
        if not attrs.get('ack_independent_provider'):
            raise serializers.ValidationError({
                'ack_independent_provider': 'You must acknowledge operating as an independent provider.'
            })
        if not attrs.get('ack_no_exit_guarantee'):
            raise serializers.ValidationError({
                'ack_no_exit_guarantee': 'You must acknowledge there is no obligation to guarantee exits.'
            })
        if not attrs.get('ack_compliance_agreement'):
            raise serializers.ValidationError({
                'ack_compliance_agreement': 'You must agree to comply with platform terms.'
            })
        return attrs


class LPApplicationSerializer(serializers.ModelSerializer):
    """Serializer for LP applications (read)."""

    status_display = serializers.CharField(source='get_status_display', read_only=True)
    entity_type_display = serializers.CharField(source='get_entity_type_display', read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LPApplication
        fields = [
            'id', 'legal_entity_name', 'country', 'jurisdiction', 'entity_type',
            'entity_type_display', 'registration_number', 'website',
            'contact_person_name', 'contact_position', 'official_email', 'phone_number',
            'approximate_liquidity_available', 'preferred_currencies', 'average_transaction_size',
            'target_ready_properties', 'target_under_construction', 'target_property_portfolios',
            'expected_discount_rate', 'max_per_transaction', 'max_per_month',
            'ack_independent_provider', 'ack_no_exit_guarantee', 'ack_compliance_agreement',
            'status', 'status_display', 'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'review_notes', 'rejection_reason', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'reviewed_by', 'reviewed_at', 'review_notes',
            'rejection_reason', 'created_at', 'updated_at'
        ]

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return f"{obj.reviewed_by.first_name} {obj.reviewed_by.last_name}".strip() or obj.reviewed_by.email
        return None


class LPApplicationAdminSerializer(serializers.ModelSerializer):
    """Serializer for admin managing LP applications."""

    class Meta:
        model = LPApplication
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class LiquidityProviderSerializer(serializers.ModelSerializer):
    """Serializer for Liquidity Provider (read)."""

    status_display = serializers.CharField(source='get_status_display', read_only=True)
    entity_type_display = serializers.CharField(source='get_entity_type_display', read_only=True)
    remaining_monthly_capacity = serializers.DecimalField(
        max_digits=20, decimal_places=2, read_only=True
    )

    class Meta:
        model = LiquidityProvider
        fields = [
            'id', 'legal_entity_name', 'country', 'jurisdiction', 'entity_type',
            'entity_type_display', 'registration_number', 'website',
            'contact_person_name', 'contact_position', 'official_email', 'phone_number',
            'liquidity_available', 'preferred_currencies',
            'target_ready_properties', 'target_under_construction', 'target_property_portfolios',
            'discount_rate', 'max_per_transaction', 'max_per_month',
            'current_month_total', 'remaining_monthly_capacity',
            'status', 'status_display', 'approved_at', 'activated_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'approved_at', 'activated_at']


class LiquidityProviderUpdateSerializer(serializers.ModelSerializer):
    """Serializer for LP updating their settings."""

    class Meta:
        model = LiquidityProvider
        fields = [
            'liquidity_available', 'preferred_currencies',
            'target_ready_properties', 'target_under_construction', 'target_property_portfolios',
            'discount_rate', 'max_per_transaction', 'max_per_month',
            'contact_person_name', 'contact_position', 'official_email', 'phone_number'
        ]


class LiquidityProviderPublicSerializer(serializers.ModelSerializer):
    """Serializer for public LP listing (limited info)."""

    entity_type_display = serializers.CharField(source='get_entity_type_display', read_only=True)

    class Meta:
        model = LiquidityProvider
        fields = [
            'id', 'legal_entity_name', 'country', 'entity_type', 'entity_type_display',
            'target_ready_properties', 'target_under_construction', 'target_property_portfolios',
            'discount_rate', 'max_per_transaction'
        ]


class ExitRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for investor creating exit requests."""

    class Meta:
        model = ExitRequest
        fields = [
            'investment', 'liquidity_provider', 'units_requested', 'requested_price_per_unit'
        ]

    def validate(self, attrs):
        request = self.context.get('request')
        investment = attrs.get('investment')
        lp = attrs.get('liquidity_provider')
        units = attrs.get('units_requested')
        price = attrs.get('requested_price_per_unit')

        # Verify investor owns the investment
        if investment.user != request.user:
            raise serializers.ValidationError({
                'investment': 'You do not own this investment.'
            })

        # Verify investment is completed
        if investment.status != 'completed':
            raise serializers.ValidationError({
                'investment': 'Investment must be completed to request exit.'
            })

        # Verify units available
        if units > investment.token_amount:
            raise serializers.ValidationError({
                'units_requested': f'You only have {investment.token_amount} units available.'
            })

        # Verify LP is active
        if lp.status != LPStatus.ACTIVE:
            raise serializers.ValidationError({
                'liquidity_provider': 'This liquidity provider is not currently active.'
            })

        # Calculate total and check LP limits
        total_amount = units * price
        if not lp.check_transaction_limit(total_amount):
            raise serializers.ValidationError({
                'units_requested': f'Total amount exceeds LP per-transaction limit of ${lp.max_per_transaction}.'
            })

        if not lp.check_monthly_limit(total_amount):
            raise serializers.ValidationError({
                'units_requested': f'LP has insufficient monthly capacity. Remaining: ${lp.remaining_monthly_capacity}'
            })

        # Check for existing pending exit request for same investment
        existing = ExitRequest.objects.filter(
            investor=request.user,
            investment=investment,
            status__in=[ExitRequestStatus.PENDING, ExitRequestStatus.UNDER_REVIEW, ExitRequestStatus.APPROVED]
        ).exists()
        if existing:
            raise serializers.ValidationError({
                'investment': 'You already have a pending exit request for this investment.'
            })

        return attrs

    def create(self, validated_data):
        validated_data['investor'] = self.context['request'].user
        validated_data['total_requested_amount'] = (
            validated_data['units_requested'] * validated_data['requested_price_per_unit']
        )
        return super().create(validated_data)


class ExitRequestSerializer(serializers.ModelSerializer):
    """Serializer for exit requests (read)."""

    status_display = serializers.CharField(source='get_status_display', read_only=True)
    investor_name = serializers.SerializerMethodField()
    property_name = serializers.SerializerMethodField()
    lp_name = serializers.CharField(source='liquidity_provider.legal_entity_name', read_only=True)
    discount_percentage = serializers.SerializerMethodField()

    class Meta:
        model = ExitRequest
        fields = [
            'id', 'investor', 'investor_name', 'investment', 'property_name',
            'liquidity_provider', 'lp_name',
            'units_requested', 'requested_price_per_unit', 'total_requested_amount',
            'offered_price_per_unit', 'total_offered_amount', 'discount_percentage',
            'lp_notes', 'status', 'status_display',
            'investor_accepted_offer', 'investor_response_at',
            'created_at', 'updated_at', 'processed_at', 'expires_at'
        ]

    def get_investor_name(self, obj):
        return f"{obj.investor.first_name} {obj.investor.last_name}".strip() or obj.investor.email

    def get_property_name(self, obj):
        return obj.investment.property_investment.name if obj.investment.property_investment else None

    def get_discount_percentage(self, obj):
        return obj.calculate_discount()


class ExitRequestLPActionSerializer(serializers.Serializer):
    """Serializer for LP actions on exit requests."""

    action = serializers.ChoiceField(choices=['approve', 'reject'])
    offered_price_per_unit = serializers.DecimalField(
        max_digits=20, decimal_places=2, required=False
    )
    notes = serializers.CharField(max_length=1000, required=False, allow_blank=True)

    def validate(self, attrs):
        action = attrs.get('action')
        if action == 'approve' and not attrs.get('offered_price_per_unit'):
            raise serializers.ValidationError({
                'offered_price_per_unit': 'Price is required when approving.'
            })
        return attrs


class ExitRequestInvestorActionSerializer(serializers.Serializer):
    """Serializer for investor actions on exit requests."""

    action = serializers.ChoiceField(choices=['accept', 'decline', 'cancel'])


class LiquidityTransactionSerializer(serializers.ModelSerializer):
    """Serializer for liquidity transactions."""

    investor_name = serializers.SerializerMethodField()
    lp_name = serializers.CharField(source='liquidity_provider.legal_entity_name', read_only=True)
    property_name = serializers.SerializerMethodField()

    class Meta:
        model = LiquidityTransaction
        fields = [
            'id', 'reference_number', 'exit_request',
            'liquidity_provider', 'lp_name', 'investor', 'investor_name',
            'units_purchased', 'price_per_unit', 'total_amount',
            'platform_fee', 'net_amount_to_investor', 'completed_at',
            'property_name'
        ]

    def get_investor_name(self, obj):
        return f"{obj.investor.first_name} {obj.investor.last_name}".strip() or obj.investor.email

    def get_property_name(self, obj):
        return obj.exit_request.investment.property_investment.name if obj.exit_request.investment.property_investment else None


class LPDashboardStatsSerializer(serializers.Serializer):
    """Serializer for LP dashboard statistics."""

    total_exit_requests = serializers.IntegerField()
    pending_requests = serializers.IntegerField()
    approved_requests = serializers.IntegerField()
    completed_requests = serializers.IntegerField()
    rejected_requests = serializers.IntegerField()
    total_units_purchased = serializers.IntegerField()
    total_amount_spent = serializers.DecimalField(max_digits=20, decimal_places=2)
    current_month_volume = serializers.DecimalField(max_digits=20, decimal_places=2)
    remaining_monthly_capacity = serializers.DecimalField(max_digits=20, decimal_places=2)
