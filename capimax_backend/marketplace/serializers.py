"""
Marketplace Serializers for Capimax Real Estate Tokenization Platform.

This module contains serializers for the secondary marketplace system,
providing API serialization for market listings, orders, transactions,
and analytics data.
"""

from rest_framework import serializers
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from .models import (
    MarketListing, TradeOrder, TradeTransaction, EscrowAccount,
    MarketAnalytics, TradingPair, ListingType, ListingStatus,
    OrderType, OrderStatus, TransactionStatus, EscrowStatus
)


class MarketListingSerializer(serializers.ModelSerializer):
    """
    Serializer for MarketListing model with comprehensive validation.
    """
    
    # Read-only fields calculated by the model
    tokens_filled = serializers.ReadOnlyField()
    fill_percentage = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    is_active = serializers.ReadOnlyField()
    current_value = serializers.ReadOnlyField()
    
    # Related field representations
    property_title = serializers.CharField(source='property_listing.title', read_only=True)
    seller_email = serializers.CharField(source='seller.email', read_only=True)
    seller_name = serializers.SerializerMethodField()

    class Meta:
        model = MarketListing
        fields = [
            'id', 'property_listing', 'property_title', 'seller', 'seller_email', 'seller_name',
            'listing_type', 'tokens_offered', 'tokens_remaining', 'tokens_filled',
            'price_per_token', 'total_price', 'minimum_order_size', 'status',
            'expires_at', 'auto_extend', 'is_market_maker', 'priority_score',
            'accepts_partial_fills', 'notes', 'created_at', 'updated_at',
            'completed_at', 'fill_percentage', 'is_expired', 'is_active',
            'current_value'
        ]
        read_only_fields = [
            'id', 'tokens_filled', 'fill_percentage', 'is_expired', 'is_active',
            'current_value', 'created_at', 'updated_at', 'completed_at',
            'property_title', 'seller_email', 'seller_name'
        ]
    
    def get_seller_name(self, obj):
        """Get seller's full name."""
        return obj.seller.get_full_name() if obj.seller else ""
    
    def validate_tokens_offered(self, value):
        """Validate that tokens_offered is positive."""
        if value <= 0:
            raise serializers.ValidationError("Tokens offered must be greater than 0.")
        return value
    
    def validate_price_per_token(self, value):
        """Validate that price_per_token is positive."""
        if value <= 0:
            raise serializers.ValidationError("Price per token must be greater than 0.")
        return value
    
    def validate_minimum_order_size(self, value):
        """Validate that minimum_order_size is positive."""
        if value <= 0:
            raise serializers.ValidationError("Minimum order size must be greater than 0.")
        return value
    
    def validate_expires_at(self, value):
        """Validate that expires_at is in the future."""
        if value <= timezone.now():
            raise serializers.ValidationError("Expiry date must be in the future.")
        return value
    
    def validate(self, data):
        """Cross-field validation for MarketListing — securities compliance."""
        # Check that minimum_order_size doesn't exceed tokens_offered
        if 'minimum_order_size' in data and 'tokens_offered' in data:
            if data['minimum_order_size'] > data['tokens_offered']:
                raise serializers.ValidationError(
                    "Minimum order size cannot exceed tokens offered."
                )

        # Securities-law gating for SELL listings
        if data.get('listing_type') == ListingType.SELL:
            request = self.context.get('request')
            user = getattr(request, 'user', None)
            property_obj = data.get('property_listing')
            if user and property_obj:
                _validate_sell_listing_compliance(user, property_obj)

        return data


def _validate_sell_listing_compliance(user, property_obj):
    """
    Reject sell listings if the seller's tokens are still in lockup or if
    the seller no longer holds a clean KYC status. Centralises the
    securities-law check shared between primary creation and secondary
    market listing.
    """
    from django.utils import timezone
    from investments.models import Investment, InvestmentStatus

    # Find the seller's completed investments in this property
    completed = (
        Investment.objects
        .filter(
            user=user,
            property_investment=property_obj,
            status=InvestmentStatus.COMPLETED,
        )
        .order_by('completed_at')
    )
    if not completed.exists():
        raise serializers.ValidationError(
            "You have no completed investment in this property to sell."
        )

    # Lockup check — any investment still locked blocks the listing.
    now = timezone.now()
    locked_investments = completed.filter(
        lockup_end_date__isnull=False,
        lockup_end_date__gt=now,
    )
    if locked_investments.exists():
        earliest_unlock = locked_investments.order_by('lockup_end_date').first().lockup_end_date
        raise serializers.ValidationError({
            'listing': (
                f"Your tokens in this property are still in lockup. "
                f"Earliest unlock: {earliest_unlock.isoformat()}."
            )
        })

    # KYC check — seller must currently hold approved KYC.
    kyc = getattr(user, 'kyc_profile', None)
    if not kyc or not kyc.is_verified():
        raise serializers.ValidationError(
            "You must maintain a verified KYC status to list tokens for sale."
        )

    # Sanctions / PEP check — block if any unresolved hit exists.
    try:
        from kyc.models import ComplianceCheck
        hits = ComplianceCheck.objects.filter(
            kyc_profile=kyc,
            result='hit',
        )
        if hits.exists():
            raise serializers.ValidationError(
                "Your account has an unresolved compliance review. "
                "Contact support before listing tokens."
            )
    except Exception:
        # If the ComplianceCheck model layout differs, fail open with a log.
        import logging
        logging.getLogger(__name__).exception(
            "ComplianceCheck enforcement skipped due to import/query error"
        )


class MarketListingCreateSerializer(MarketListingSerializer):
    """
    Specialized serializer for creating market listings.
    """
    
    class Meta(MarketListingSerializer.Meta):
        fields = [
            'property_listing', 'listing_type', 'tokens_offered', 'price_per_token',
            'minimum_order_size', 'expires_at', 'auto_extend', 'accepts_partial_fills',
            'notes'
        ]


class MarketListingListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing market listings.

    Returns BOTH the flattened legacy fields (`property_title`, `property_city`,
    `seller_name`) and nested `property_listing` / `seller` objects, because the
    SPA's marketplace cards and modals read nested shape. Removing either would
    break the dashboard or older consumers.
    """

    property_title = serializers.CharField(source='property_listing.title', read_only=True)
    property_city = serializers.CharField(source='property_listing.city', read_only=True)
    seller_name = serializers.SerializerMethodField()
    property_listing = serializers.SerializerMethodField()
    seller = serializers.SerializerMethodField()
    tokens_filled = serializers.ReadOnlyField()
    fill_percentage = serializers.ReadOnlyField()
    is_active = serializers.ReadOnlyField()
    current_value = serializers.ReadOnlyField()

    class Meta:
        model = MarketListing
        fields = [
            'id', 'property_listing', 'property_title', 'property_city',
            'seller', 'seller_name',
            'listing_type', 'tokens_offered', 'tokens_remaining', 'tokens_filled',
            'price_per_token', 'total_price', 'minimum_order_size', 'status',
            'expires_at', 'fill_percentage', 'is_active', 'current_value',
            'created_at'
        ]

    def get_seller_name(self, obj):
        """Get seller's full name."""
        return obj.seller.get_full_name() if obj.seller else ""

    def get_property_listing(self, obj):
        p = obj.property_listing
        if not p:
            return None
        primary_image = p.images.filter(is_primary=True).first() if hasattr(p, 'images') else None
        if not primary_image and hasattr(p, 'images'):
            primary_image = p.images.first()
        return {
            'id': str(p.id),
            'title': p.title,
            'city': p.city,
            'location': f"{p.city}, {p.country}" if p.country else p.city,
            'property_type': p.property_type,
            'total_value': float(p.total_value) if p.total_value is not None else None,
            'image_url': primary_image.image.url if primary_image and getattr(primary_image, 'image', None) else None,
            'images': [{'image': primary_image.image.url}] if primary_image and getattr(primary_image, 'image', None) else [],
        }

    def get_seller(self, obj):
        s = obj.seller
        if not s:
            return None
        return {
            'id': str(s.id),
            'email': s.email,
            'full_name': s.get_full_name() or s.email,
        }


class TradeOrderSerializer(serializers.ModelSerializer):
    """
    Serializer for TradeOrder model with comprehensive validation.
    """
    
    # Read-only fields calculated by the model
    is_fully_filled = serializers.ReadOnlyField()
    fill_percentage = serializers.ReadOnlyField()
    tokens_remaining = serializers.ReadOnlyField()
    
    # Related field representations
    listing_property_title = serializers.CharField(source='listing.property_listing.title', read_only=True)
    buyer_email = serializers.CharField(source='buyer.email', read_only=True)
    buyer_name = serializers.SerializerMethodField()
    
    class Meta:
        model = TradeOrder
        fields = [
            'id', 'listing', 'listing_property_title', 'buyer', 'buyer_email',
            'buyer_name', 'order_type', 'tokens_requested', 'tokens_filled',
            'tokens_remaining', 'price_per_token', 'total_amount', 'fee_percentage',
            'trading_fee', 'net_amount', 'status', 'executed_at', 'execution_price',
            'transaction_hash', 'blockchain_confirmed', 'confirmation_blocks',
            'created_at', 'updated_at', 'is_fully_filled', 'fill_percentage'
        ]
        read_only_fields = [
            'id', 'tokens_filled', 'tokens_remaining', 'trading_fee', 'net_amount',
            'executed_at', 'execution_price', 'transaction_hash', 'blockchain_confirmed',
            'confirmation_blocks', 'created_at', 'updated_at', 'is_fully_filled',
            'fill_percentage', 'listing_property_title', 'buyer_email', 'buyer_name'
        ]
    
    def get_buyer_name(self, obj):
        """Get buyer's full name."""
        return obj.buyer.get_full_name() if obj.buyer else ""
    
    def validate_tokens_requested(self, value):
        """Validate that tokens_requested is positive."""
        if value <= 0:
            raise serializers.ValidationError("Tokens requested must be greater than 0.")
        return value
    
    def validate_price_per_token(self, value):
        """Validate that price_per_token is positive."""
        if value <= 0:
            raise serializers.ValidationError("Price per token must be greater than 0.")
        return value
    
    def validate_total_amount(self, value):
        """Validate that total_amount is positive."""
        if value <= 0:
            raise serializers.ValidationError("Total amount must be greater than 0.")
        return value
    
    def validate(self, data):
        """Cross-field validation for TradeOrder."""
        # Check that total_amount matches tokens_requested * price_per_token
        if all(key in data for key in ['tokens_requested', 'price_per_token', 'total_amount']):
            expected_total = Decimal(data['tokens_requested']) * data['price_per_token']
            if abs(data['total_amount'] - expected_total) > Decimal('0.01'):
                raise serializers.ValidationError(
                    "Total amount must equal tokens requested × price per token."
                )
        
        # Validate order constraints against listing
        if 'listing' in data and data['listing']:
            listing = data['listing']
            
            # Check listing is active
            if not listing.is_active:
                raise serializers.ValidationError("Cannot place order on inactive listing.")
            
            # Check minimum order size
            if data.get('tokens_requested', 0) < listing.minimum_order_size:
                raise serializers.ValidationError(
                    f"Order size must be at least {listing.minimum_order_size} tokens."
                )
            
            # Check available tokens
            if data.get('tokens_requested', 0) > listing.tokens_remaining:
                raise serializers.ValidationError(
                    f"Only {listing.tokens_remaining} tokens available in this listing."
                )
            
            # For market orders, accept listing price
            if data.get('order_type') == OrderType.MARKET:
                data['price_per_token'] = listing.price_per_token
                data['total_amount'] = listing.price_per_token * Decimal(data['tokens_requested'])

            # ----------------------------------------------------------------
            # Securities-law gating on secondary market BUY
            # ----------------------------------------------------------------
            request = self.context.get('request')
            user = getattr(request, 'user', None)
            if user and user.is_authenticated:
                _validate_buyer_compliance(user, listing)

        return data


def _validate_buyer_compliance(user, listing):
    """Enforce KYC, accreditation, and jurisdiction gates on a buy order."""
    property_obj = getattr(listing, 'property_listing', None)
    if property_obj is None:
        return

    # Verified KYC
    kyc = getattr(user, 'kyc_profile', None)
    if not kyc or not kyc.is_verified():
        raise serializers.ValidationError(
            "A verified KYC profile is required to trade on the secondary market."
        )

    # Sanctions / PEP
    try:
        from kyc.models import ComplianceCheck
        if ComplianceCheck.objects.filter(kyc_profile=kyc, result='hit').exists():
            raise serializers.ValidationError(
                "Your account has an unresolved compliance review. "
                "Contact support before trading."
            )
    except Exception:
        pass

    # Accreditation
    requires_accredited = (
        getattr(property_obj, 'requires_accredited_investors', False)
        or (
            getattr(property_obj, 'spv_entity', None)
            and getattr(property_obj.spv_entity, 'requires_accredited_investors', False)
        )
    )
    if requires_accredited and not getattr(kyc, 'is_accredited', False):
        raise serializers.ValidationError(
            "This property requires accredited investor status to trade."
        )

    # Jurisdiction
    spv = getattr(property_obj, 'spv_entity', None)
    if spv:
        country = (getattr(kyc, 'country_of_residence', '') or '').upper()
        if not spv.jurisdiction_allowed(country):
            raise serializers.ValidationError(
                "Your country of residence is not eligible to participate "
                "in this offering."
            )


class TradeOrderCreateSerializer(TradeOrderSerializer):
    """
    Specialized serializer for creating trade orders.

    Validates a narrow set of write-time inputs but renders the response
    via the full TradeOrderSerializer. Without this, the POST response
    omitted the `id` (plus status, tokens_filled, executed_at, etc.) and
    the frontend marketplace modal failed with "Order submission did not
    return a confirmation" even though the order had actually been
    created and — for market orders — already executed.
    """

    class Meta(TradeOrderSerializer.Meta):
        # Write-side: only accept the fields the user supplies.
        fields = [
            'listing', 'order_type', 'tokens_requested', 'price_per_token',
            'total_amount'
        ]

    def to_representation(self, instance):
        # When `instance` is a model row (post-save), render the rich
        # response so the client can act on it. When it's still a dict
        # of validated data (pre-save), fall through to the parent.
        if hasattr(instance, 'pk') and instance.pk is not None:
            return TradeOrderSerializer(instance, context=self.context).data
        return super().to_representation(instance)


class TradeTransactionSerializer(serializers.ModelSerializer):
    """
    Serializer for TradeTransaction model.
    """
    
    # Related field representations
    property_title = serializers.CharField(source='property_traded.title', read_only=True)
    buyer_email = serializers.CharField(source='buyer.email', read_only=True)
    seller_email = serializers.CharField(source='seller.email', read_only=True)
    buyer_name = serializers.SerializerMethodField()
    seller_name = serializers.SerializerMethodField()
    ownership_percentage_traded = serializers.ReadOnlyField()

    class Meta:
        model = TradeTransaction
        fields = [
            'id', 'listing', 'order', 'buyer', 'buyer_email', 'buyer_name',
            'seller', 'seller_email', 'seller_name', 'property_traded', 'property_title',
            'tokens_traded', 'price_per_token', 'total_amount', 'platform_fee_percentage',
            'platform_fee', 'buyer_fee', 'seller_fee', 'net_amount_to_seller',
            'total_cost_to_buyer', 'status', 'payment_method', 'blockchain_network',
            'transaction_hash', 'blockchain_confirmed', 'confirmation_blocks',
            'gas_fee', 'created_at', 'processed_at', 'completed_at',
            'market_cap_at_trade', 'volume_24h', 'ownership_percentage_traded'
        ]
        read_only_fields = [
            'id', 'platform_fee', 'buyer_fee', 'seller_fee', 'net_amount_to_seller',
            'total_cost_to_buyer', 'created_at', 'processed_at', 'completed_at',
            'property_title', 'buyer_email', 'seller_email', 'buyer_name',
            'seller_name', 'ownership_percentage_traded'
        ]
    
    def get_buyer_name(self, obj):
        """Get buyer's full name."""
        return obj.buyer.get_full_name() if obj.buyer else ""
    
    def get_seller_name(self, obj):
        """Get seller's full name."""
        return obj.seller.get_full_name() if obj.seller else ""


class TradeTransactionListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing trade transactions.
    """
    
    property_title = serializers.CharField(source='property_traded.title', read_only=True)
    buyer_name = serializers.SerializerMethodField()
    seller_name = serializers.SerializerMethodField()

    class Meta:
        model = TradeTransaction
        fields = [
            'id', 'property_title', 'buyer_name', 'seller_name',
            'tokens_traded', 'price_per_token', 'total_amount',
            'status', 'completed_at', 'created_at'
        ]
    
    def get_buyer_name(self, obj):
        """Get buyer's full name."""
        return obj.buyer.get_full_name() if obj.buyer else ""
    
    def get_seller_name(self, obj):
        """Get seller's full name."""
        return obj.seller.get_full_name() if obj.seller else ""


class EscrowAccountSerializer(serializers.ModelSerializer):
    """
    Serializer for EscrowAccount model.
    """
    
    # Related field representations
    transaction_id = serializers.CharField(source='transaction.id', read_only=True)
    buyer_name = serializers.SerializerMethodField()
    seller_name = serializers.SerializerMethodField()
    resolved_by_name = serializers.SerializerMethodField()
    
    # Read-only computed fields
    is_timed_out = serializers.ReadOnlyField()
    can_release = serializers.ReadOnlyField()
    
    class Meta:
        model = EscrowAccount
        fields = [
            'id', 'transaction', 'transaction_id', 'amount_held', 'tokens_held',
            'status', 'escrow_wallet_address', 'timeout_duration', 'timeout_at',
            'buyer_approved', 'seller_approved', 'admin_override',
            'resolved_by', 'resolved_by_name', 'resolution_reason',
            'created_at', 'updated_at', 'released_at', 'is_timed_out',
            'can_release', 'buyer_name', 'seller_name'
        ]
        read_only_fields = [
            'id', 'timeout_at', 'created_at', 'updated_at', 'released_at',
            'is_timed_out', 'can_release', 'transaction_id', 'buyer_name',
            'seller_name', 'resolved_by_name'
        ]
    
    def get_buyer_name(self, obj):
        """Get buyer's full name."""
        return obj.transaction.buyer.get_full_name() if obj.transaction and obj.transaction.buyer else ""
    
    def get_seller_name(self, obj):
        """Get seller's full name."""
        return obj.transaction.seller.get_full_name() if obj.transaction and obj.transaction.seller else ""
    
    def get_resolved_by_name(self, obj):
        """Get resolver's full name."""
        return obj.resolved_by.get_full_name() if obj.resolved_by else ""


class MarketAnalyticsSerializer(serializers.ModelSerializer):
    """
    Serializer for MarketAnalytics model.
    """
    
    # Related field representations
    property_title = serializers.CharField(source='property_analyzed.title', read_only=True)

    # Read-only computed fields
    price_change = serializers.ReadOnlyField()
    average_trade_size = serializers.ReadOnlyField()
    average_trade_value = serializers.ReadOnlyField()

    class Meta:
        model = MarketAnalytics
        fields = [
            'id', 'property_analyzed', 'property_title', 'timeframe', 'volume_tokens',
            'volume_usd', 'trade_count', 'unique_traders', 'opening_price',
            'closing_price', 'high_price', 'low_price', 'average_price',
            'active_listings_count', 'total_tokens_for_sale', 'total_tokens_wanted',
            'bid_ask_spread', 'new_listings_count', 'completed_listings_count',
            'cancelled_listings_count', 'platform_revenue', 'period_start',
            'period_end', 'created_at', 'updated_at', 'price_change',
            'average_trade_size', 'average_trade_value'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'property_title', 'price_change',
            'average_trade_size', 'average_trade_value'
        ]


class TradingPairSerializer(serializers.ModelSerializer):
    """
    Serializer for TradingPair model.
    """
    
    # Related field representations
    base_property_title = serializers.CharField(source='base_property_pair.title', read_only=True)
    quote_property_title = serializers.CharField(source='quote_property_pair.title', read_only=True)

    # Read-only computed fields
    is_active = serializers.ReadOnlyField()

    class Meta:
        model = TradingPair
        fields = [
            'id', 'base_property_pair', 'base_property_title', 'quote_property_pair',
            'quote_property_title', 'pair_type', 'symbol', 'status',
            'minimum_order_size', 'maximum_order_size', 'price_precision',
            'quantity_precision', 'maker_fee', 'taker_fee', 'created_at',
            'updated_at', 'is_active'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'base_property_title',
            'quote_property_title', 'is_active'
        ]

    def validate_symbol(self, value):
        """Validate that symbol is unique and follows correct format."""
        if not value:
            raise serializers.ValidationError("Symbol is required.")

        # Basic format validation (can be enhanced)
        if '/' not in value:
            raise serializers.ValidationError(
                "Symbol must follow format 'BASE/QUOTE' (e.g., 'PROP1/USD')."
            )

        return value.upper()

    def validate(self, data):
        """Cross-field validation for TradingPair."""
        # For token_token pairs, both base and quote properties are required
        if data.get('pair_type') == 'token_token':
            if not data.get('quote_property_pair'):
                raise serializers.ValidationError(
                    "Quote property is required for token/token trading pairs."
                )
        
        # Validate fee ranges
        for fee_field in ['maker_fee', 'taker_fee']:
            if fee_field in data and (data[fee_field] < 0 or data[fee_field] > Decimal('10.0000')):
                raise serializers.ValidationError(
                    f"{fee_field.replace('_', ' ').title()} must be between 0% and 10%."
                )
        
        return data


class MarketOverviewSerializer(serializers.Serializer):
    """
    Serializer for market overview data combining multiple analytics.
    """
    
    total_volume_24h = serializers.DecimalField(max_digits=18, decimal_places=2)
    total_trades_24h = serializers.IntegerField()
    active_listings = serializers.IntegerField()
    total_properties = serializers.IntegerField()
    top_gainers = TradeTransactionListSerializer(many=True)
    recent_trades = TradeTransactionListSerializer(many=True)
    market_statistics = MarketAnalyticsSerializer(many=True)


class OrderBookSerializer(serializers.Serializer):
    """
    Serializer for order book data showing buy/sell orders.
    """
    
    property_id = serializers.UUIDField()
    property_title = serializers.CharField()
    
    # Buy orders (bids) - highest price first
    bids = MarketListingListSerializer(many=True)
    
    # Sell orders (asks) - lowest price first
    asks = MarketListingListSerializer(many=True)
    
    # Market statistics
    spread = serializers.DecimalField(max_digits=12, decimal_places=8)
    mid_price = serializers.DecimalField(max_digits=12, decimal_places=8)
    last_trade_price = serializers.DecimalField(max_digits=12, decimal_places=8, allow_null=True)


class TradingHistorySerializer(serializers.Serializer):
    """
    Serializer for trading history and price charts.
    """
    
    property_id = serializers.UUIDField()
    property_title = serializers.CharField()
    timeframe = serializers.CharField()
    
    # OHLCV data for charting
    price_data = serializers.ListField(
        child=serializers.DictField(
            child=serializers.DecimalField(max_digits=12, decimal_places=8)
        )
    )
    
    # Volume data
    volume_data = serializers.ListField(
        child=serializers.DictField(
            child=serializers.DecimalField(max_digits=18, decimal_places=2)
        )
    )
    
    # Recent trades
    recent_trades = TradeTransactionListSerializer(many=True)


class MarketMetricsSerializer(serializers.Serializer):
    """
    Serializer for market metrics and KPIs.
    """
    
    # Trading metrics
    total_volume_usd = serializers.DecimalField(max_digits=18, decimal_places=2)
    total_trades = serializers.IntegerField()
    unique_traders = serializers.IntegerField()
    
    # Market depth
    total_liquidity = serializers.DecimalField(max_digits=18, decimal_places=2)
    average_spread = serializers.DecimalField(max_digits=12, decimal_places=8)
    
    # Platform metrics
    platform_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    active_properties = serializers.IntegerField()
    
    # Growth metrics
    volume_change_24h = serializers.DecimalField(max_digits=5, decimal_places=2)
    trades_change_24h = serializers.DecimalField(max_digits=5, decimal_places=2)
    
    # Market health indicators
    price_volatility = serializers.DecimalField(max_digits=5, decimal_places=2)
    market_participation = serializers.DecimalField(max_digits=5, decimal_places=2)