"""
Payment Serializers for Capimax Real Estate Tokenization Platform.

This module contains serializers for payment processing, wallet management,
and financial transactions including validation and data transformation.
"""

from rest_framework import serializers
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from typing import Dict, Any
import re

from .models import (
    Payment, UserPaymentMethod, WalletBalance, WalletTransaction,
    CryptoPayment, Refund, RecurringPayment, PaymentMethod, PaymentStatus,
    BankTransfer, NovaSukukPayment, PronovaPayment,
    BankWithdrawalRequest,
)
from core.utils import validate_investment_amount, calculate_tokens_for_amount


class PaymentMethodSerializer(serializers.ModelSerializer):
    """Serializer for user payment methods."""
    
    class Meta:
        model = UserPaymentMethod
        fields = [
            'id', 'method_type', 'display_name', 'last_four', 'expiry_date',
            'brand', 'wallet_address', 'network', 'is_default', 'is_verified',
            'created_at'
        ]
        read_only_fields = ['id', 'is_verified', 'created_at']
    
    def validate_expiry_date(self, value):
        """Validate credit card expiry date format and ensure it's not expired."""
        if not value:
            return value
        
        # Validate format MM/YYYY
        if not re.match(r'^(0[1-9]|1[0-2])\/\d{4}$', value):
            raise serializers.ValidationError("Expiry date must be in MM/YYYY format")
        
        month, year = value.split('/')
        expiry_date = timezone.datetime(int(year), int(month), 1)
        
        if expiry_date < timezone.now():
            raise serializers.ValidationError("Card has expired")
        
        return value
    
    def validate_wallet_address(self, value):
        """Validate cryptocurrency wallet address format."""
        if not value:
            return value
        
        # Basic validation for common wallet address formats
        if len(value) < 26 or len(value) > 62:
            raise serializers.ValidationError("Invalid wallet address format")
        
        return value
    
    def validate(self, attrs):
        """Validate payment method based on type."""
        method_type = attrs.get('method_type')
        
        if method_type == PaymentMethod.CREDIT_CARD:
            if not attrs.get('last_four'):
                raise serializers.ValidationError({
                    'last_four': 'Last four digits are required for credit cards'
                })
            if not attrs.get('expiry_date'):
                raise serializers.ValidationError({
                    'expiry_date': 'Expiry date is required for credit cards'
                })
        
        elif method_type == PaymentMethod.CRYPTOCURRENCY:
            if not attrs.get('wallet_address'):
                raise serializers.ValidationError({
                    'wallet_address': 'Wallet address is required for cryptocurrency'
                })
            if not attrs.get('network'):
                raise serializers.ValidationError({
                    'network': 'Network is required for cryptocurrency'
                })
        
        return attrs


class PaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating payments."""
    
    payment_method_id = serializers.UUIDField(required=False, help_text="Saved payment method ID")
    stripe_payment_method_id = serializers.CharField(required=False, help_text="Stripe payment method ID")
    crypto_details = serializers.JSONField(required=False, help_text="Cryptocurrency payment details")
    
    class Meta:
        model = Payment
        fields = [
            'amount', 'currency', 'payment_method', 'investment',
            'payment_method_id', 'stripe_payment_method_id', 'crypto_details'
        ]
    
    def validate_amount(self, value):
        """Validate payment amount."""
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Amount must be greater than zero")
        
        if value > Decimal('1000000.00'):  # $1M max
            raise serializers.ValidationError("Amount exceeds maximum limit")
        
        return value
    
    def validate(self, attrs):
        """Validate payment creation data."""
        payment_method = attrs.get('payment_method')
        
        # Validate required fields based on payment method
        if payment_method == PaymentMethod.CREDIT_CARD:
            if not attrs.get('stripe_payment_method_id') and not attrs.get('payment_method_id'):
                raise serializers.ValidationError({
                    'payment_method': 'Either stripe_payment_method_id or payment_method_id is required for credit cards'
                })
        
        elif payment_method == PaymentMethod.CRYPTOCURRENCY:
            if not attrs.get('crypto_details'):
                raise serializers.ValidationError({
                    'crypto_details': 'Crypto details are required for cryptocurrency payments'
                })
        
        # Validate investment if provided
        investment = attrs.get('investment')
        if investment:
            property_obj = investment.property
            if not property_obj or property_obj.status != 'active':
                raise serializers.ValidationError({
                    'investment': 'Investment property is not available for funding'
                })
        
        return attrs


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for payment details."""
    
    user_email = serializers.CharField(source='user.email', read_only=True)
    investment_property = serializers.SerializerMethodField()
    crypto_details = serializers.SerializerMethodField()
    refunds = serializers.SerializerMethodField()
    fee_percentage = serializers.ReadOnlyField()
    
    class Meta:
        model = Payment
        fields = [
            'id', 'user_email', 'investment', 'investment_property', 'amount',
            'currency', 'payment_method', 'status', 'transaction_hash',
            'payment_intent_id', 'external_transaction_id', 'processing_fee',
            'net_amount', 'fee_percentage', 'metadata', 'crypto_details',
            'refunds', 'created_at', 'updated_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'status', 'transaction_hash', 'payment_intent_id',
            'external_transaction_id', 'processing_fee', 'net_amount',
            'created_at', 'updated_at', 'completed_at'
        ]
    
    def get_investment_property(self, obj):
        """Get investment property details."""
        if obj.investment and obj.investment.property:
            return {
                'id': obj.investment.property.id,
                'title': obj.investment.property.title,
                'city': obj.investment.property.city,
                'country': obj.investment.property.country
            }
        return None
    
    def get_crypto_details(self, obj):
        """Get cryptocurrency payment details."""
        try:
            crypto = obj.crypto_details
            return {
                'wallet_address': crypto.wallet_address,
                'network': crypto.network,
                'confirmations': crypto.confirmations,
                'confirmation_blocks_required': crypto.confirmation_blocks_required,
                'is_confirmed': crypto.is_confirmed,
                'block_height': crypto.block_height
            }
        except CryptoPayment.DoesNotExist:
            return None
    
    def get_refunds(self, obj):
        """Get payment refunds."""
        refunds = obj.refunds.all()
        return [{
            'id': refund.id,
            'amount': refund.amount,
            'status': refund.status,
            'reason': refund.reason,
            'created_at': refund.created_at,
            'processed_at': refund.processed_at
        } for refund in refunds]


class WalletBalanceSerializer(serializers.ModelSerializer):
    """Serializer for wallet balances."""
    
    total_balance = serializers.ReadOnlyField()
    
    class Meta:
        model = WalletBalance
        fields = [
            'currency', 'available_balance', 'pending_balance',
            'locked_balance', 'total_balance', 'updated_at'
        ]
        read_only_fields = ['updated_at']


class WalletTransactionSerializer(serializers.ModelSerializer):
    """Serializer for wallet transactions."""
    
    class Meta:
        model = WalletTransaction
        fields = [
            'id', 'transaction_type', 'amount', 'currency',
            'balance_before', 'balance_after', 'reference_id',
            'description', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class CryptoPaymentSerializer(serializers.ModelSerializer):
    """Serializer for cryptocurrency payment details."""
    
    is_confirmed = serializers.ReadOnlyField()
    
    class Meta:
        model = CryptoPayment
        fields = [
            'wallet_address', 'network', 'gas_limit', 'gas_price',
            'confirmation_blocks_required', 'confirmations', 'is_confirmed',
            'block_height'
        ]
        read_only_fields = ['confirmations', 'block_height']


class RefundCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating refunds."""
    
    class Meta:
        model = Refund
        fields = ['payment', 'amount', 'reason']
    
    def validate_amount(self, value):
        """Validate refund amount."""
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Refund amount must be greater than zero")
        return value
    
    def validate(self, attrs):
        """Validate refund creation."""
        payment = attrs.get('payment')
        amount = attrs.get('amount')
        
        if payment.status != PaymentStatus.COMPLETED:
            raise serializers.ValidationError({
                'payment': 'Can only refund completed payments'
            })
        
        # Check if refund amount doesn't exceed available refund amount
        total_refunded = sum(
            refund.amount for refund in payment.refunds.filter(status='completed')
        )
        available_for_refund = payment.amount - total_refunded
        
        if amount > available_for_refund:
            raise serializers.ValidationError({
                'amount': f'Refund amount cannot exceed available amount: ${available_for_refund}'
            })
        
        return attrs


class RefundSerializer(serializers.ModelSerializer):
    """Serializer for refund details."""
    
    payment_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Refund
        fields = [
            'id', 'payment', 'payment_details', 'amount', 'reason',
            'status', 'external_refund_id', 'processed_at', 'created_at'
        ]
        read_only_fields = [
            'id', 'status', 'external_refund_id', 'processed_at', 'created_at'
        ]
    
    def get_payment_details(self, obj):
        """Get original payment details."""
        return {
            'id': obj.payment.id,
            'amount': obj.payment.amount,
            'payment_method': obj.payment.payment_method,
            'created_at': obj.payment.created_at
        }


class RecurringPaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating recurring payments."""
    
    class Meta:
        model = RecurringPayment
        fields = [
            'amount', 'currency', 'frequency', 'payment_method',
            'start_date', 'end_date', 'purpose', 'investment'
        ]
    
    def validate_amount(self, value):
        """Validate recurring payment amount."""
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Amount must be greater than zero")
        
        if value < Decimal('10.00'):  # Minimum $10 for recurring payments
            raise serializers.ValidationError("Minimum recurring payment amount is $10")
        
        return value
    
    def validate_start_date(self, value):
        """Validate start date is not in the past."""
        if value < timezone.now():
            raise serializers.ValidationError("Start date cannot be in the past")
        return value
    
    def validate(self, attrs):
        """Validate recurring payment setup."""
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        purpose = attrs.get('purpose')
        investment = attrs.get('investment')
        
        if end_date and end_date <= start_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date'
            })
        
        if purpose == 'investment' and not investment:
            raise serializers.ValidationError({
                'investment': 'Investment is required when purpose is investment'
            })
        
        return attrs


class RecurringPaymentSerializer(serializers.ModelSerializer):
    """Serializer for recurring payment details."""
    
    payment_method_details = serializers.SerializerMethodField()
    investment_details = serializers.SerializerMethodField()
    
    class Meta:
        model = RecurringPayment
        fields = [
            'id', 'amount', 'currency', 'frequency', 'payment_method',
            'payment_method_details', 'start_date', 'end_date', 'next_payment',
            'purpose', 'investment', 'investment_details', 'status',
            'total_payments', 'total_amount', 'created_at'
        ]
        read_only_fields = [
            'id', 'total_payments', 'total_amount', 'created_at'
        ]
    
    def get_payment_method_details(self, obj):
        """Get payment method details."""
        return {
            'id': obj.payment_method.id,
            'display_name': obj.payment_method.display_name,
            'method_type': obj.payment_method.method_type,
            'last_four': obj.payment_method.last_four
        }
    
    def get_investment_details(self, obj):
        """Get investment details if applicable."""
        if obj.investment:
            return {
                'id': obj.investment.id,
                'property_title': obj.investment.property.title,
                'token_amount': obj.investment.token_amount
            }
        return None


class PaymentEstimateSerializer(serializers.Serializer):
    """Serializer for payment estimation requests."""
    
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payment_method = serializers.ChoiceField(choices=PaymentMethod.choices)
    currency = serializers.CharField(default='USD')
    
    def validate_amount(self, value):
        """Validate amount for estimation."""
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Amount must be greater than zero")
        return value


class PaymentQuoteSerializer(serializers.Serializer):
    """Serializer for cryptocurrency payment quotes."""
    
    from_currency = serializers.CharField(help_text="Source cryptocurrency")
    to_currency = serializers.CharField(default='USD', help_text="Target currency")
    amount = serializers.DecimalField(max_digits=15, decimal_places=8)
    
    def validate_amount(self, value):
        """Validate quote amount."""
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Amount must be greater than zero")
        return value


class StripePaymentIntentSerializer(serializers.Serializer):
    """Serializer for Stripe payment intent creation."""
    
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(default='USD')
    payment_method_id = serializers.CharField(required=False)
    investment_id = serializers.UUIDField(required=False)
    save_payment_method = serializers.BooleanField(default=False)
    
    def validate_amount(self, value):
        """Validate payment intent amount."""
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Amount must be greater than zero")
        return value


class PaymentConfirmationSerializer(serializers.Serializer):
    """Serializer for payment confirmation."""
    
    payment_intent_id = serializers.CharField()
    payment_method_id = serializers.CharField(required=False)


class WalletDepositSerializer(serializers.Serializer):
    """Serializer for wallet deposit requests."""
    
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(default='USD')
    payment_method_id = serializers.UUIDField()
    
    def validate_amount(self, value):
        """Validate deposit amount."""
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Amount must be greater than zero")
        
        if value < Decimal('10.00'):  # Minimum $10 deposit
            raise serializers.ValidationError("Minimum deposit amount is $10")
        
        return value


class WalletWithdrawalSerializer(serializers.Serializer):
    """Serializer for wallet withdrawal requests."""
    
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(default='USD')
    withdrawal_method = serializers.ChoiceField(choices=[
        ('bank_transfer', 'Bank Transfer'),
        ('cryptocurrency', 'Cryptocurrency'),
    ])
    destination_details = serializers.JSONField()
    
    def validate_amount(self, value):
        """Validate withdrawal amount."""
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Amount must be greater than zero")
        
        if value < Decimal('10.00'):  # Minimum $10 withdrawal
            raise serializers.ValidationError("Minimum withdrawal amount is $10")

        return value


class BankTransferSerializer(serializers.ModelSerializer):
    """Serializer for bank transfer payment details."""

    payment_id = serializers.UUIDField(source='payment.id', read_only=True)
    payment_amount = serializers.DecimalField(
        source='payment.amount',
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    payment_currency = serializers.CharField(source='payment.currency', read_only=True)
    estimated_completion = serializers.DateTimeField(source='estimated_completion_date', read_only=True)

    class Meta:
        model = BankTransfer
        fields = [
            'id', 'payment_id', 'payment_amount', 'payment_currency',
            'account_holder_name', 'account_number', 'routing_number',
            'bank_name', 'bank_address', 'swift_code', 'transfer_reference',
            'transfer_status', 'transfer_instructions', 'estimated_completion',
            'bank_reference_number', 'processing_fee', 'initiated_at',
            'completed_at', 'admin_notes'
        ]
        read_only_fields = [
            'id', 'transfer_reference', 'transfer_status', 'processing_fee',
            'initiated_at', 'completed_at', 'admin_notes', 'bank_reference_number'
        ]


class BankTransferCreateSerializer(serializers.Serializer):
    """Serializer for creating bank transfer payments."""

    # Payment details
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(default='USD', max_length=10)
    property_id = serializers.UUIDField()

    # Bank account details
    account_holder_name = serializers.CharField(max_length=255)
    account_number = serializers.CharField(max_length=50)
    routing_number = serializers.CharField(max_length=50)
    bank_name = serializers.CharField(max_length=255)
    bank_address = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True
    )
    swift_code = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True
    )
    transfer_instructions = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=True
    )

    def validate_amount(self, value):
        """Validate payment amount."""
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Amount must be greater than zero")

        if value < Decimal('100.00'):  # Minimum $100 for bank transfers
            raise serializers.ValidationError("Minimum bank transfer amount is $100")

        if value > Decimal('1000000.00'):  # Maximum $1M
            raise serializers.ValidationError("Maximum bank transfer amount is $1,000,000")

        return value

    def validate_account_number(self, value):
        """Validate bank account number format."""
        # Remove spaces and hyphens
        value = re.sub(r'[\s\-]', '', value)

        # Check if it's numeric and appropriate length
        if not value.isdigit():
            raise serializers.ValidationError("Account number must contain only digits")

        if len(value) < 4 or len(value) > 20:
            raise serializers.ValidationError("Account number must be between 4 and 20 digits")

        return value

    def validate_routing_number(self, value):
        """Validate routing number format."""
        # Remove spaces and hyphens
        value = re.sub(r'[\s\-]', '', value)

        # US routing number is exactly 9 digits
        if not value.isdigit() or len(value) != 9:
            raise serializers.ValidationError("Routing number must be exactly 9 digits")

        return value

    def validate_swift_code(self, value):
        """Validate SWIFT code format if provided."""
        if value:
            value = value.upper().replace(' ', '')
            # SWIFT code is 8 or 11 characters: 4 letters (bank), 2 letters (country), 2 characters (location), optional 3 characters (branch)
            if not re.match(r'^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$', value):
                raise serializers.ValidationError("Invalid SWIFT code format")

        return value


class BankTransferStatusSerializer(serializers.Serializer):
    """Serializer for bank transfer status updates (admin only)."""

    transfer_status = serializers.ChoiceField(choices=[
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ])
    bank_reference_number = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True
    )
    admin_notes = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=True
    )
    completed_at = serializers.DateTimeField(required=False)


# --- Nova Sukuk Serializers ---

class NovaSukukCreateSerializer(serializers.Serializer):
    """Serializer for creating a Nova Sukuk investment."""
    property_id = serializers.UUIDField()
    token_amount = serializers.IntegerField(min_value=1)
    investment_amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('1.00'))
    sukuk_pdf = serializers.FileField()
    sukuk_reference_number = serializers.CharField(max_length=100)


class NovaSukukDetailSerializer(serializers.ModelSerializer):
    """Serializer for Nova Sukuk payment details."""
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = NovaSukukPayment
        fields = [
            'id', 'investment', 'sukuk_reference_number', 'status',
            'pdf_url', 'review_note', 'reviewed_by', 'reviewed_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = fields

    def get_pdf_url(self, obj):
        if obj.sukuk_pdf:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.sukuk_pdf.url)
        return None


class NovaSukukAdminSerializer(serializers.ModelSerializer):
    """Serializer for admin review of Nova Sukuk payments."""
    pdf_url = serializers.SerializerMethodField()
    investor_email = serializers.CharField(source='investment.user.email', read_only=True)
    property_title = serializers.CharField(source='investment.property_investment.title', read_only=True)
    investment_amount = serializers.DecimalField(
        source='investment.investment_amount', read_only=True,
        max_digits=12, decimal_places=2
    )
    token_amount = serializers.IntegerField(source='investment.token_amount', read_only=True)

    class Meta:
        model = NovaSukukPayment
        fields = [
            'id', 'investment', 'sukuk_reference_number', 'status',
            'pdf_url', 'review_note', 'reviewed_by', 'reviewed_at',
            'investor_email', 'property_title', 'investment_amount', 'token_amount',
            'created_at', 'updated_at'
        ]
        read_only_fields = fields

    def get_pdf_url(self, obj):
        if obj.sukuk_pdf:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.sukuk_pdf.url)
        return None


# --- Bank Transfer Investment Serializers ---
# Mirror of the Nova Sukuk pair: a multipart write serializer for the
# investor-facing endpoint, and an admin read serializer that includes the
# proof file URL + denormalised investor/property fields for the review UI.


class BankTransferInvestCreateSerializer(serializers.Serializer):
    """Serializer for creating a bank-transfer-backed investment.

    The investor uploads a proof-of-transfer file (image or PDF) and we
    create the Investment + Payment + BankTransfer rows in one shot.
    Approval is manual via the admin review endpoint.
    """
    property_id = serializers.UUIDField()
    token_amount = serializers.IntegerField(min_value=1)
    investment_amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('1.00'))
    proof_of_transfer = serializers.FileField()
    account_holder_name = serializers.CharField(max_length=255)
    bank_name = serializers.CharField(max_length=255)
    # account_number / routing_number are written verbatim; we accept short
    # bank-specific values rather than enforcing IBAN or US ABA syntax.
    account_number = serializers.CharField(max_length=50)
    routing_number = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    swift_code = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    transfer_reference_note = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')


class BankTransferAdminSerializer(serializers.ModelSerializer):
    """Admin read serializer — surfaces the proof URL + investor context."""

    proof_url = serializers.SerializerMethodField()
    investor_email = serializers.CharField(
        source='payment.investment.user.email', read_only=True
    )
    property_title = serializers.CharField(
        source='payment.investment.property_investment.title', read_only=True
    )
    investment_id = serializers.CharField(
        source='payment.investment.id', read_only=True
    )
    investment_amount = serializers.DecimalField(
        source='payment.investment.investment_amount', read_only=True,
        max_digits=12, decimal_places=2
    )
    token_amount = serializers.IntegerField(
        source='payment.investment.token_amount', read_only=True
    )

    class Meta:
        model = BankTransfer
        fields = [
            'id', 'transfer_reference', 'transfer_status', 'account_holder_name',
            'bank_name', 'account_number', 'routing_number', 'swift_code',
            'proof_url', 'review_note', 'reviewed_by', 'reviewed_at',
            'investor_email', 'property_title', 'investment_id',
            'investment_amount', 'token_amount',
            'initiated_at', 'completed_at',
        ]
        read_only_fields = fields

    def get_proof_url(self, obj):
        if obj.proof_of_transfer:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.proof_of_transfer.url)
        return None


# --- Pronova Serializers ---

class PronovaCreateSerializer(serializers.Serializer):
    """Serializer for creating a Pronova crypto investment."""
    property_id = serializers.UUIDField()
    token_amount = serializers.IntegerField(min_value=1)
    investment_amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('1.00'))


class PronovaConfirmSerializer(serializers.Serializer):
    """Serializer for confirming a Pronova payment with tx_hash."""
    tx_hash = serializers.CharField(max_length=66)
    sender_wallet_address = serializers.CharField(max_length=42)


class PronovaDetailSerializer(serializers.ModelSerializer):
    """Serializer for Pronova payment details."""

    class Meta:
        model = PronovaPayment
        fields = [
            'id', 'investment', 'pronova_amount', 'usd_equivalent',
            'discount_applied', 'discounted_amount', 'tx_hash',
            'platform_wallet_address', 'sender_wallet_address',
            'status', 'confirmations', 'confirmed_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = fields

# --- Bank Withdrawal Request Serializers ---


class BankWithdrawalRequestCreateSerializer(serializers.Serializer):
    """Serializer the investor uses to lodge a withdrawal request."""
    amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('10.00')
    )
    currency = serializers.CharField(max_length=3, default='USD', required=False)
    account_holder_name = serializers.CharField(max_length=255)
    bank_name = serializers.CharField(max_length=255)
    account_number = serializers.CharField(max_length=64)
    routing_number = serializers.CharField(max_length=64, required=False, allow_blank=True, default='')
    swift_code = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    bank_country = serializers.CharField(max_length=2, required=False, allow_blank=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class BankWithdrawalRequestSerializer(serializers.ModelSerializer):
    """Investor-facing read serializer."""
    class Meta:
        model = BankWithdrawalRequest
        fields = [
            'id', 'amount', 'currency', 'account_holder_name', 'bank_name',
            'account_number', 'routing_number', 'swift_code', 'bank_country',
            'status', 'review_note', 'created_at', 'completed_at',
        ]
        read_only_fields = fields


class BankWithdrawalRequestAdminSerializer(serializers.ModelSerializer):
    """Admin-facing read serializer with the investor identity included."""
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_full_name = serializers.SerializerMethodField()

    class Meta:
        model = BankWithdrawalRequest
        fields = [
            'id', 'user', 'user_email', 'user_full_name',
            'amount', 'currency',
            'account_holder_name', 'bank_name', 'account_number',
            'routing_number', 'swift_code', 'bank_country',
            'notes', 'status', 'review_note',
            'reviewed_by', 'reviewed_at',
            'created_at', 'updated_at', 'completed_at',
        ]
        read_only_fields = fields

    def get_user_full_name(self, obj):
        return obj.user.get_full_name() if obj.user else ''
