"""
Investment Serializers for Capimax Real Estate Tokenization Platform.

This module contains serializers for investment management, portfolio tracking,
and token ownership including installment payments and dividend distributions.
"""

from rest_framework import serializers
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta

from .models import (
    Investment, InstallmentPayment, TokenReservation,
    InvestmentWithdrawal, AutoInvestment, DividendPayment,
    InvestmentStatus
)
from properties.models import Property
from payments.models import Payment


# Investment limits by KYC verification level.
#
# These ceilings are deliberately permissive — they're sized for the
# demo/staging environment where ops want to drive multiple investments
# through the flow per day. The values are surfaced via the Django
# settings so a production deploy can lock them down per regulatory
# requirements without a code change.
from django.conf import settings as _settings

INVESTMENT_LIMITS = getattr(_settings, 'INVESTMENT_LIMITS', None) or {
    # daily / monthly USD caps. The old values
    # (1k/5k/25k/100k/25k/100k) made any non-trivial demo run hit the
    # daily ceiling on the third or fourth attempt and surfaced as a
    # confusing "Remaining today: $30.00" error.
    'basic':    {'daily': Decimal('10000'),  'monthly': Decimal('100000')},
    'enhanced': {'daily': Decimal('50000'),  'monthly': Decimal('500000')},
    'premium':  {'daily': Decimal('500000'), 'monthly': Decimal('5000000')},
}


class InvestmentCalculationSerializer(serializers.Serializer):
    """Serializer for investment calculation requests."""
    
    property_id = serializers.UUIDField()
    token_amount = serializers.IntegerField(min_value=1)
    payment_method = serializers.ChoiceField(
        choices=['credit_card', 'bank_transfer', 'cryptocurrency', 'paypal'],
        required=False,
        default='credit_card'
    )
    
    def validate_property_id(self, value):
        """Validate that property exists and is available for investment."""
        try:
            property_obj = Property.objects.get(id=value)
        except Property.DoesNotExist:
            raise serializers.ValidationError("Property not found")
        
        if property_obj.status not in ['active', 'tokenized']:
            raise serializers.ValidationError("Property is not available for investment")
        
        return value
    
    def validate_token_amount(self, value):
        """Validate token amount against property availability."""
        property_id = self.initial_data.get('property_id')
        if property_id:
            try:
                property_obj = Property.objects.get(id=property_id)
                available_tokens = property_obj.total_tokens - property_obj.tokens_sold
                if value > available_tokens:
                    raise serializers.ValidationError(f"Only {available_tokens} tokens available")
            except Property.DoesNotExist:
                pass
        
        return value


class InvestmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new investments."""
    
    property_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = Investment
        fields = [
            'property_id', 'token_amount', 'investment_amount',
            'payment_method'
        ]
    
    def validate_property_id(self, value):
        """Validate that property exists and is available for investment."""
        try:
            property_obj = Property.objects.get(id=value)
        except Property.DoesNotExist:
            raise serializers.ValidationError("Property not found")
        
        if property_obj.status not in ['active', 'tokenized']:
            raise serializers.ValidationError("Property is not available for investment")
        
        return value
    
    def validate_token_amount(self, value):
        """Validate token amount against property availability."""
        property_id = self.initial_data.get('property_id')
        if property_id:
            try:
                property_obj = Property.objects.get(id=property_id)
                available_tokens = property_obj.total_tokens - property_obj.tokens_sold
                
                # Consider existing reservations
                reserved_tokens = TokenReservation.objects.filter(
                    property_investment=property_obj,
                    released=False,
                    expires_at__gt=timezone.now()
                ).aggregate(
                    total=serializers.models.Sum('token_amount')
                )['total'] or 0
                
                available_tokens -= reserved_tokens
                
                if value > available_tokens:
                    raise serializers.ValidationError(f"Only {available_tokens} tokens available")
                    
                # Check minimum investment if set
                if property_obj.minimum_investment:
                    min_tokens = int(property_obj.minimum_investment / property_obj.token_price)
                    if value < min_tokens:
                        raise serializers.ValidationError(
                            f"Minimum investment requires {min_tokens} tokens"
                        )
                        
            except Property.DoesNotExist:
                pass
        
        return value
    
    def validate_investment_amount(self, value):
        """Validate investment amount matches token calculation."""
        property_id = self.initial_data.get('property_id')
        token_amount = self.initial_data.get('token_amount')

        if property_id and token_amount:
            try:
                property_obj = Property.objects.get(id=property_id)
                expected_amount = property_obj.token_price * token_amount

                # Allow small variance for rounding
                if abs(value - expected_amount) > Decimal('0.01'):
                    raise serializers.ValidationError(
                        f"Investment amount should be ${expected_amount}"
                    )
            except Property.DoesNotExist:
                pass

        return value

    def validate(self, attrs):
        """Validate investment against user's daily and monthly limits."""
        user = self.context['request'].user
        investment_amount = attrs.get('investment_amount', Decimal('0'))

        # Get user's KYC level for limits
        kyc_profile = getattr(user, 'kyc_profile', None)
        kyc_level = kyc_profile.verification_level if kyc_profile else 'basic'

        # Get limits for this KYC level
        limits = INVESTMENT_LIMITS.get(kyc_level, INVESTMENT_LIMITS['basic'])
        daily_limit = limits['daily']
        monthly_limit = limits['monthly']

        # Calculate current usage
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = today_start.replace(day=1)

        daily_used = Investment.objects.filter(
            user=user,
            created_at__gte=today_start,
            status__in=['pending', 'processing', 'pending_mint', 'minting', 'completed']
        ).aggregate(
            total=Sum('investment_amount')
        )['total'] or Decimal('0')

        monthly_used = Investment.objects.filter(
            user=user,
            created_at__gte=month_start,
            status__in=['pending', 'processing', 'pending_mint', 'minting', 'completed']
        ).aggregate(
            total=Sum('investment_amount')
        )['total'] or Decimal('0')

        # Check daily limit
        daily_remaining = daily_limit - daily_used
        if investment_amount > daily_remaining:
            raise serializers.ValidationError({
                'investment_amount': f"Exceeds daily investment limit. "
                                     f"Remaining today: ${daily_remaining:.2f} (Limit: ${daily_limit:.2f})"
            })

        # Check monthly limit
        monthly_remaining = monthly_limit - monthly_used
        if investment_amount > monthly_remaining:
            raise serializers.ValidationError({
                'investment_amount': f"Exceeds monthly investment limit. "
                                     f"Remaining this month: ${monthly_remaining:.2f} (Limit: ${monthly_limit:.2f})"
            })

        return attrs

    def create(self, validated_data):
        """Create investment with token reservation."""
        property_id = validated_data.pop('property_id')
        user = self.context['request'].user
        
        with transaction.atomic():
            property_obj = Property.objects.select_for_update().get(id=property_id)
            
            # Create token reservation first
            reservation = TokenReservation.objects.create(
                user=user,
                property_investment=property_obj,
                token_amount=validated_data['token_amount'],
                expires_at=timezone.now() + timedelta(minutes=15)
            )
            
            # Create investment
            investment = Investment.objects.create(
                user=user,
                property_investment=property_obj,
                **validated_data
            )
            
            return investment


class InvestmentSerializer(serializers.ModelSerializer):
    """Serializer for investment details."""
    
    property_investment = serializers.StringRelatedField()
    property_title = serializers.CharField(source='property_investment.title', read_only=True)
    property_id = serializers.UUIDField(source='property_investment.id', read_only=True)
    ownership_percentage = serializers.DecimalField(max_digits=8, decimal_places=4, read_only=True)
    current_value = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = Investment
        fields = [
            'id', 'property_investment', 'property_title', 'property_id',
            'token_amount', 'investment_amount', 'status', 'payment_method',
            'transaction_hash', 'blockchain_confirmed', 'confirmation_blocks',
            'ownership_percentage', 'current_value', 'created_at',
            'updated_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'status', 'transaction_hash', 'blockchain_confirmed',
            'confirmation_blocks', 'created_at', 'updated_at', 'completed_at'
        ]


class PortfolioSummarySerializer(serializers.Serializer):
    """Serializer for portfolio summary data."""
    
    total_invested = serializers.DecimalField(max_digits=15, decimal_places=2)
    current_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_return = serializers.DecimalField(max_digits=15, decimal_places=2)
    return_percentage = serializers.DecimalField(max_digits=8, decimal_places=4)
    total_dividends = serializers.DecimalField(max_digits=12, decimal_places=2)
    active_investments = serializers.IntegerField()
    properties_count = serializers.IntegerField()
    pending_investments = serializers.IntegerField()


class InstallmentPaymentSerializer(serializers.ModelSerializer):
    """Serializer for installment payments."""
    
    property_title = serializers.CharField(source='property_investment.title', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = InstallmentPayment
        fields = [
            'id', 'property_investment', 'property_title', 'installment_number',
            'due_date', 'amount', 'status', 'paid_at', 'payment', 'is_overdue',
            'created_at'
        ]
        read_only_fields = [
            'id', 'status', 'paid_at', 'payment', 'created_at'
        ]


class TokenReservationSerializer(serializers.ModelSerializer):
    """Serializer for token reservations."""
    
    property_title = serializers.CharField(source='property_investment.title', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = TokenReservation
        fields = [
            'id', 'property_investment', 'property_title', 'token_amount',
            'reserved_at', 'expires_at', 'released', 'is_expired'
        ]
        read_only_fields = ['id', 'reserved_at', 'released']


class InvestmentWithdrawalSerializer(serializers.ModelSerializer):
    """Serializer for investment withdrawal requests."""
    
    investment_property_title = serializers.CharField(
        source='investment.property_investment.title', read_only=True
    )
    net_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = InvestmentWithdrawal
        fields = [
            'id', 'investment', 'investment_property_title', 'token_amount',
            'estimated_amount', 'processing_fee', 'net_amount', 'status',
            'requested_at', 'estimated_completion', 'completed_at'
        ]
        read_only_fields = [
            'id', 'status', 'requested_at', 'estimated_completion',
            'completed_at'
        ]
    
    def validate_token_amount(self, value):
        """Validate token amount against owned tokens."""
        investment = self.initial_data.get('investment')
        if investment:
            try:
                investment_obj = Investment.objects.get(id=investment)
                if value > investment_obj.token_amount:
                    raise serializers.ValidationError(
                        f"Cannot withdraw more than {investment_obj.token_amount} tokens owned"
                    )
            except Investment.DoesNotExist:
                pass
        
        return value


class AutoInvestmentSerializer(serializers.ModelSerializer):
    """Serializer for automatic investment plans."""
    
    property_title = serializers.CharField(source='property_investment.title', read_only=True)
    
    class Meta:
        model = AutoInvestment
        fields = [
            'id', 'property_investment', 'property_title', 'amount',
            'frequency', 'payment_method', 'start_date', 'end_date',
            'max_total_amount', 'next_execution', 'total_invested',
            'status', 'created_at'
        ]
        read_only_fields = [
            'id', 'next_execution', 'total_invested', 'created_at'
        ]
    
    def validate_start_date(self, value):
        """Validate start date is in the future."""
        if value <= timezone.now():
            raise serializers.ValidationError("Start date must be in the future")
        return value
    
    def validate_end_date(self, value):
        """Validate end date is after start date."""
        start_date = self.initial_data.get('start_date')
        if start_date and value and value <= start_date:
            raise serializers.ValidationError("End date must be after start date")
        return value
    
    def validate_max_total_amount(self, value):
        """Validate max total amount is greater than single amount."""
        amount = self.initial_data.get('amount')
        if value and amount and value <= amount:
            raise serializers.ValidationError(
                "Maximum total amount must be greater than single investment amount"
            )
        return value


class DividendPaymentSerializer(serializers.ModelSerializer):
    """Serializer for dividend payments."""
    
    property_title = serializers.CharField(
        source='investment.property_investment.title', read_only=True
    )
    investor_email = serializers.CharField(source='investment.user.email', read_only=True)
    annual_yield = serializers.DecimalField(max_digits=8, decimal_places=4, read_only=True)
    
    class Meta:
        model = DividendPayment
        fields = [
            'id', 'investment', 'property_title', 'investor_email',
            'amount', 'currency', 'payment_date', 'period_start',
            'period_end', 'status', 'annual_yield', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class InvestmentAnalyticsSerializer(serializers.Serializer):
    """Serializer for investment analytics data."""
    
    property_id = serializers.UUIDField()
    property_title = serializers.CharField()
    total_investment = serializers.DecimalField(max_digits=15, decimal_places=2)
    token_count = serializers.IntegerField()
    ownership_percentage = serializers.DecimalField(max_digits=8, decimal_places=4)
    current_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_dividends = serializers.DecimalField(max_digits=12, decimal_places=2)
    roi_percentage = serializers.DecimalField(max_digits=8, decimal_places=4)
    investment_date = serializers.DateTimeField()


class InvestmentRecommendationSerializer(serializers.Serializer):
    """Serializer for investment recommendations."""
    
    property_id = serializers.UUIDField()
    property_title = serializers.CharField()
    recommendation_score = serializers.DecimalField(max_digits=5, decimal_places=2)
    recommendation_reason = serializers.CharField()
    expected_return = serializers.DecimalField(max_digits=5, decimal_places=2)
    risk_level = serializers.CharField()
    available_tokens = serializers.IntegerField()
    token_price = serializers.DecimalField(max_digits=10, decimal_places=2)


class InvestmentLimitsSerializer(serializers.Serializer):
    """Serializer for user investment limits."""
    
    daily_limit = serializers.DecimalField(max_digits=12, decimal_places=2)
    monthly_limit = serializers.DecimalField(max_digits=12, decimal_places=2)
    daily_remaining = serializers.DecimalField(max_digits=12, decimal_places=2)
    monthly_remaining = serializers.DecimalField(max_digits=12, decimal_places=2)
    kyc_level = serializers.CharField()
    is_verified = serializers.BooleanField()