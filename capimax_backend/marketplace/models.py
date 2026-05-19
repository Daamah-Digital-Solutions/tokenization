"""
Marketplace Models for Capimax Real Estate Tokenization Platform.

This module contains models for the secondary marketplace system, including
market listings, trade orders, completed transactions, and escrow management.
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import uuid


class ListingType(models.TextChoices):
    """Market listing type choices."""
    SELL = 'sell', 'Sell Order'
    BUY = 'buy', 'Buy Order'


class ListingStatus(models.TextChoices):
    """Market listing status choices."""
    ACTIVE = 'active', 'Active'
    PARTIALLY_FILLED = 'partially_filled', 'Partially Filled'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'
    EXPIRED = 'expired', 'Expired'


class OrderType(models.TextChoices):
    """Trade order type choices."""
    MARKET = 'market', 'Market Order'
    LIMIT = 'limit', 'Limit Order'


class OrderStatus(models.TextChoices):
    """Trade order status choices."""
    PENDING = 'pending', 'Pending'
    PROCESSING = 'processing', 'Processing'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'
    REJECTED = 'rejected', 'Rejected'


class TransactionStatus(models.TextChoices):
    """Transaction status choices."""
    PENDING = 'pending', 'Pending'
    PROCESSING = 'processing', 'Processing'
    IN_ESCROW = 'in_escrow', 'In Escrow'
    COMPLETED = 'completed', 'Completed'
    FAILED = 'failed', 'Failed'
    CANCELLED = 'cancelled', 'Cancelled'


class EscrowStatus(models.TextChoices):
    """Escrow status choices."""
    HOLDING = 'holding', 'Holding'
    RELEASED = 'released', 'Released'
    REFUNDED = 'refunded', 'Refunded'


class MarketListing(models.Model):
    """
    Market listing model for buy/sell orders in the secondary marketplace.
    
    Represents tokens available for sale or buy orders from users
    looking to purchase tokens in the secondary market.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the market listing"
    )
    
    property_listing = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        related_name='market_listings',
        help_text="Property associated with this listing"
    )
    
    seller = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='market_listings',
        help_text="User creating the listing"
    )
    
    listing_type = models.CharField(
        max_length=10,
        choices=ListingType.choices,
        help_text="Type of listing - sell or buy order"
    )
    
    tokens_offered = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Number of tokens offered for sale or requested for purchase"
    )
    
    tokens_remaining = models.PositiveIntegerField(
        help_text="Number of tokens still available in this listing"
    )
    
    price_per_token = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        validators=[MinValueValidator(Decimal('0.00000001'))],
        help_text="Price per token in USD"
    )
    
    total_price = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Total price for all tokens in the listing"
    )
    
    minimum_order_size = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Minimum number of tokens per order"
    )
    
    status = models.CharField(
        max_length=20,
        choices=ListingStatus.choices,
        default=ListingStatus.ACTIVE,
        help_text="Current status of the listing"
    )
    
    expires_at = models.DateTimeField(
        help_text="When the listing expires"
    )
    
    auto_extend = models.BooleanField(
        default=False,
        help_text="Whether to automatically extend listing when it expires"
    )
    
    # Market maker features
    is_market_maker = models.BooleanField(
        default=False,
        help_text="Whether this listing is from a market maker"
    )
    
    priority_score = models.PositiveIntegerField(
        default=100,
        help_text="Priority score for order matching (higher = better)"
    )
    
    # Trading preferences
    accepts_partial_fills = models.BooleanField(
        default=True,
        help_text="Whether to accept partial order fills"
    )
    
    # Metadata
    notes = models.TextField(
        blank=True,
        help_text="Optional notes about the listing"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the listing was completed"
    )

    class Meta:
        db_table = 'marketplace_market_listing'
        indexes = [
            models.Index(fields=['property_listing', 'listing_type', 'status']),
            models.Index(fields=['seller', 'status']),
            models.Index(fields=['price_per_token', 'listing_type']),
            models.Index(fields=['expires_at', 'status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['priority_score', 'price_per_token']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(tokens_remaining__lte=models.F('tokens_offered')),
                name='marketplace_tokens_remaining_valid'
            ),
            models.CheckConstraint(
                condition=models.Q(minimum_order_size__lte=models.F('tokens_offered')),
                name='marketplace_minimum_order_valid'
            ),
            models.CheckConstraint(
                condition=models.Q(total_price__gt=0),
                name='marketplace_total_price_positive'
            ),
        ]
        verbose_name = 'Market Listing'
        verbose_name_plural = 'Market Listings'

    def __str__(self):
        return f"{self.listing_type.title()} {self.tokens_offered} tokens of {self.property_listing.title} at ${self.price_per_token}"
    
    @property
    def tokens_filled(self):
        """Get number of tokens that have been filled."""
        return self.tokens_offered - self.tokens_remaining
    
    @property
    def fill_percentage(self):
        """Get fill percentage of the listing."""
        if self.tokens_offered == 0:
            return Decimal('0.00')
        percentage = (Decimal(self.tokens_filled) / Decimal(self.tokens_offered)) * 100
        return percentage.quantize(Decimal('0.01'))
    
    @property
    def is_expired(self):
        """Check if listing is expired."""
        return timezone.now() > self.expires_at and self.status == ListingStatus.ACTIVE
    
    @property
    def is_active(self):
        """Check if listing is active and available for trading."""
        return (
            self.status in [ListingStatus.ACTIVE, ListingStatus.PARTIALLY_FILLED] and
            not self.is_expired and
            self.tokens_remaining > 0
        )
    
    @property
    def current_value(self):
        """Get current value of remaining tokens."""
        return self.price_per_token * Decimal(self.tokens_remaining)
    
    def can_fill_order(self, token_amount):
        """Check if the listing can fill an order for the specified token amount."""
        return (
            self.is_active and
            token_amount >= self.minimum_order_size and
            token_amount <= self.tokens_remaining
        )
    
    def fill_order(self, token_amount):
        """Fill an order by reducing tokens_remaining."""
        if not self.can_fill_order(token_amount):
            return False
        
        self.tokens_remaining -= token_amount
        
        if self.tokens_remaining == 0:
            self.status = ListingStatus.COMPLETED
            self.completed_at = timezone.now()
        elif self.tokens_remaining < self.tokens_offered:
            self.status = ListingStatus.PARTIALLY_FILLED
        
        self.save(update_fields=['tokens_remaining', 'status', 'completed_at'])
        return True
    
    def cancel_listing(self, reason=""):
        """Cancel the listing."""
        self.status = ListingStatus.CANCELLED
        if reason:
            self.notes += f"\nCancelled: {reason}"
        self.save(update_fields=['status', 'notes'])
    
    def save(self, *args, **kwargs):
        """Calculate total_price before saving if not set."""
        if not self.total_price or self.total_price == 0:
            self.total_price = self.price_per_token * Decimal(self.tokens_offered)
        
        # Set tokens_remaining to tokens_offered if not set
        if not self.tokens_remaining and self.tokens_remaining != 0:
            self.tokens_remaining = self.tokens_offered
        
        super().save(*args, **kwargs)


class TradeOrder(models.Model):
    """
    Trade order model for buy/sell requests in the marketplace.
    
    Represents individual orders placed by users to buy or sell tokens,
    which are matched against existing market listings.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the trade order"
    )
    
    listing = models.ForeignKey(
        MarketListing,
        on_delete=models.CASCADE,
        related_name='orders',
        help_text="Market listing this order is for"
    )
    
    buyer = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='trade_orders',
        help_text="User placing the order"
    )
    
    order_type = models.CharField(
        max_length=10,
        choices=OrderType.choices,
        default=OrderType.LIMIT,
        help_text="Type of order - market or limit"
    )
    
    tokens_requested = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Number of tokens requested in this order"
    )
    
    tokens_filled = models.PositiveIntegerField(
        default=0,
        help_text="Number of tokens actually filled"
    )
    
    price_per_token = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        validators=[MinValueValidator(Decimal('0.00000001'))],
        help_text="Maximum price per token for buy orders"
    )
    
    total_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Total order amount"
    )
    
    fee_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('0.0250'),  # 2.5%
        validators=[MinValueValidator(Decimal('0.0000')), MaxValueValidator(Decimal('10.0000'))],
        help_text="Platform fee percentage for this order"
    )
    
    trading_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Trading fee amount calculated from total"
    )
    
    net_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text="Net amount after fees"
    )
    
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
        help_text="Current status of the order"
    )
    
    # Order execution details
    executed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the order was executed"
    )
    
    execution_price = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00000001'))],
        help_text="Actual execution price per token"
    )
    
    # Blockchain integration
    transaction_hash = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Blockchain transaction hash for token transfer"
    )
    
    blockchain_confirmed = models.BooleanField(
        default=False,
        help_text="Whether blockchain transaction is confirmed"
    )
    
    confirmation_blocks = models.PositiveIntegerField(
        default=0,
        help_text="Number of blockchain confirmation blocks"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'marketplace_trade_order'
        indexes = [
            models.Index(fields=['listing', 'status']),
            models.Index(fields=['buyer', 'status']),
            models.Index(fields=['price_per_token', 'order_type']),
            models.Index(fields=['created_at']),
            models.Index(fields=['executed_at']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(tokens_filled__lte=models.F('tokens_requested')),
                name='marketplace_order_tokens_filled_valid'
            ),
            models.CheckConstraint(
                condition=models.Q(total_amount__gt=0),
                name='marketplace_order_total_amount_positive'
            ),
        ]
        verbose_name = 'Trade Order'
        verbose_name_plural = 'Trade Orders'

    def __str__(self):
        return f"Order {self.id} - {self.buyer.email} - {self.tokens_requested} tokens at ${self.price_per_token}"
    
    @property
    def is_fully_filled(self):
        """Check if order is fully filled."""
        return self.tokens_filled >= self.tokens_requested
    
    @property
    def fill_percentage(self):
        """Get fill percentage of the order."""
        if self.tokens_requested == 0:
            return Decimal('0.00')
        percentage = (Decimal(self.tokens_filled) / Decimal(self.tokens_requested)) * 100
        return percentage.quantize(Decimal('0.01'))
    
    @property
    def tokens_remaining(self):
        """Get remaining tokens to be filled."""
        return self.tokens_requested - self.tokens_filled
    
    def calculate_fees(self):
        """Calculate trading fees based on total amount."""
        self.trading_fee = (self.total_amount * self.fee_percentage).quantize(Decimal('0.01'))
        self.net_amount = self.total_amount - self.trading_fee
    
    def execute_order(self, tokens_filled, execution_price):
        """Execute the order with specified tokens and price."""
        self.tokens_filled = tokens_filled
        self.execution_price = execution_price
        self.executed_at = timezone.now()
        
        if self.is_fully_filled:
            self.status = OrderStatus.COMPLETED
        
        self.save(update_fields=['tokens_filled', 'execution_price', 'executed_at', 'status'])
    
    def cancel_order(self):
        """Cancel the order."""
        self.status = OrderStatus.CANCELLED
        self.save(update_fields=['status'])
    
    def save(self, *args, **kwargs):
        """Calculate fees and net amount before saving."""
        if not self.net_amount:
            self.calculate_fees()
        
        super().save(*args, **kwargs)


class TradeTransaction(models.Model):
    """
    Trade transaction model for completed trades in the marketplace.
    
    Represents successful trades between buyers and sellers,
    including all financial details and blockchain information.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the trade transaction"
    )
    
    listing = models.ForeignKey(
        MarketListing,
        on_delete=models.CASCADE,
        related_name='transactions',
        help_text="Market listing involved in the trade"
    )
    
    order = models.ForeignKey(
        TradeOrder,
        on_delete=models.CASCADE,
        related_name='transactions',
        help_text="Trade order that resulted in this transaction"
    )
    
    buyer = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='purchase_transactions',
        help_text="User who bought the tokens"
    )
    
    seller = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='sale_transactions',
        help_text="User who sold the tokens"
    )
    
    property_traded = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        related_name='trade_transactions',
        help_text="Property whose tokens were traded"
    )
    
    tokens_traded = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Number of tokens traded"
    )
    
    price_per_token = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        validators=[MinValueValidator(Decimal('0.00000001'))],
        help_text="Price per token for this transaction"
    )
    
    total_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Total transaction amount before fees"
    )
    
    platform_fee_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('0.0250'),  # 2.5%
        validators=[MinValueValidator(Decimal('0.0000')), MaxValueValidator(Decimal('10.0000'))],
        help_text="Platform fee percentage applied"
    )
    
    platform_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Platform fee amount"
    )
    
    buyer_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Fee charged to buyer"
    )
    
    seller_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Fee charged to seller"
    )
    
    net_amount_to_seller = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Net amount paid to seller after fees"
    )
    
    total_cost_to_buyer = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Total cost to buyer including fees"
    )
    
    status = models.CharField(
        max_length=20,
        choices=TransactionStatus.choices,
        default=TransactionStatus.PENDING,
        help_text="Current status of the transaction"
    )
    
    # Payment and blockchain details
    payment_method = models.JSONField(
        default=dict,
        help_text="Payment method details"
    )
    
    blockchain_network = models.CharField(
        max_length=50,
        default='ethereum',
        help_text="Blockchain network used for token transfer"
    )
    
    transaction_hash = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Blockchain transaction hash"
    )
    
    blockchain_confirmed = models.BooleanField(
        default=False,
        help_text="Whether blockchain transaction is confirmed"
    )
    
    confirmation_blocks = models.PositiveIntegerField(
        default=0,
        help_text="Number of blockchain confirmation blocks"
    )
    
    gas_fee = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        default=Decimal('0.00000000'),
        validators=[MinValueValidator(Decimal('0.00000000'))],
        help_text="Gas fee for blockchain transaction"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When payment processing started"
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When transaction was completed"
    )
    
    # Market analytics
    market_cap_at_trade = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Property market cap at time of trade"
    )
    
    volume_24h = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="24-hour trading volume at time of trade"
    )

    class Meta:
        db_table = 'marketplace_trade_transaction'
        indexes = [
            models.Index(fields=['buyer', 'completed_at']),
            models.Index(fields=['seller', 'completed_at']),
            models.Index(fields=['property_traded', 'completed_at']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['price_per_token', 'completed_at']),
            models.Index(fields=['transaction_hash']),
            models.Index(fields=['completed_at']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(total_amount__gt=0),
                name='marketplace_transaction_total_positive'
            ),
            models.CheckConstraint(
                condition=models.Q(net_amount_to_seller__gte=0),
                name='marketplace_transaction_seller_amount_valid'
            ),
            models.CheckConstraint(
                condition=models.Q(total_cost_to_buyer__gt=0),
                name='marketplace_transaction_buyer_cost_positive'
            ),
        ]
        verbose_name = 'Trade Transaction'
        verbose_name_plural = 'Trade Transactions'

    def __str__(self):
        return f"Trade {self.id} - {self.tokens_traded} tokens at ${self.price_per_token}"
    
    @property
    def ownership_percentage_traded(self):
        """Calculate ownership percentage traded in the property."""
        if self.property_traded.total_tokens == 0:
            return Decimal('0.0000')
        percentage = (Decimal(self.tokens_traded) / Decimal(self.property_traded.total_tokens)) * 100
        return percentage.quantize(Decimal('0.0001'))
    
    def calculate_fees(self):
        """Calculate all fees for the transaction."""
        self.platform_fee = (self.total_amount * self.platform_fee_percentage).quantize(Decimal('0.01'))
        
        # Split platform fee between buyer and seller (50/50)
        fee_split = self.platform_fee / 2
        self.buyer_fee = fee_split.quantize(Decimal('0.01'))
        self.seller_fee = fee_split.quantize(Decimal('0.01'))
        
        # Calculate net amounts
        self.net_amount_to_seller = (self.total_amount - self.seller_fee).quantize(Decimal('0.01'))
        self.total_cost_to_buyer = (self.total_amount + self.buyer_fee).quantize(Decimal('0.01'))
    
    def complete_transaction(self, transaction_hash=None):
        """Mark transaction as completed."""
        self.status = TransactionStatus.COMPLETED
        self.completed_at = timezone.now()
        if transaction_hash:
            self.transaction_hash = transaction_hash
        self.save(update_fields=['status', 'completed_at', 'transaction_hash'])
    
    def fail_transaction(self, reason=""):
        """Mark transaction as failed."""
        self.status = TransactionStatus.FAILED
        if reason:
            # Store reason in payment_method for now
            self.payment_method['failure_reason'] = reason
        self.save(update_fields=['status', 'payment_method'])
    
    def save(self, *args, **kwargs):
        """Calculate fees before saving."""
        if not self.net_amount_to_seller or not self.total_cost_to_buyer:
            self.calculate_fees()
        
        # Set total_amount if not provided
        if not self.total_amount:
            self.total_amount = self.price_per_token * Decimal(self.tokens_traded)
        
        super().save(*args, **kwargs)


class EscrowAccount(models.Model):
    """
    Escrow account model for secure transaction holding.
    
    Holds funds and tokens during the transaction process to ensure
    secure trading between buyers and sellers.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the escrow account"
    )
    
    transaction = models.OneToOneField(
        TradeTransaction,
        on_delete=models.CASCADE,
        related_name='escrow',
        help_text="Transaction this escrow account is for"
    )
    
    amount_held = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Amount held in escrow"
    )
    
    tokens_held = models.PositiveIntegerField(
        default=0,
        help_text="Number of tokens held in escrow"
    )
    
    status = models.CharField(
        max_length=20,
        choices=EscrowStatus.choices,
        default=EscrowStatus.HOLDING,
        help_text="Current status of the escrow"
    )
    
    # Escrow wallet details
    escrow_wallet_address = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Escrow wallet address for holding tokens"
    )
    
    escrow_private_key_hash = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Hashed private key for escrow wallet"
    )
    
    # Timeout and conditions
    timeout_duration = models.DurationField(
        default=timedelta(hours=24),
        help_text="How long to hold funds in escrow before timeout"
    )
    
    timeout_at = models.DateTimeField(
        help_text="When escrow times out if not resolved"
    )
    
    # Release conditions
    buyer_approved = models.BooleanField(
        default=False,
        help_text="Whether buyer has approved the transaction"
    )
    
    seller_approved = models.BooleanField(
        default=False,
        help_text="Whether seller has approved the transaction"
    )
    
    admin_override = models.BooleanField(
        default=False,
        help_text="Whether admin has overridden normal release process"
    )
    
    # Resolution details
    resolved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="User who resolved the escrow (admin or automated)"
    )
    
    resolution_reason = models.TextField(
        blank=True,
        help_text="Reason for escrow resolution"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    released_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When funds/tokens were released from escrow"
    )

    class Meta:
        db_table = 'marketplace_escrow_account'
        indexes = [
            models.Index(fields=['status', 'timeout_at']),
            models.Index(fields=['transaction']),
            models.Index(fields=['created_at']),
            models.Index(fields=['timeout_at']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount_held__gte=0),
                name='marketplace_escrow_amount_positive'
            ),
        ]
        verbose_name = 'Escrow Account'
        verbose_name_plural = 'Escrow Accounts'

    def __str__(self):
        return f"Escrow for transaction {self.transaction.id} - ${self.amount_held}"
    
    @property
    def is_timed_out(self):
        """Check if escrow has timed out."""
        return timezone.now() > self.timeout_at and self.status == EscrowStatus.HOLDING
    
    @property
    def can_release(self):
        """Check if escrow can be released."""
        return (
            self.status == EscrowStatus.HOLDING and
            (self.buyer_approved and self.seller_approved) or
            self.admin_override or
            self.is_timed_out
        )
    
    def release_funds(self, released_by=None, reason=""):
        """Release funds from escrow."""
        if not self.can_release:
            return False
        
        self.status = EscrowStatus.RELEASED
        self.released_at = timezone.now()
        self.resolved_by = released_by
        self.resolution_reason = reason
        
        # Complete the associated transaction
        self.transaction.complete_transaction()
        
        self.save(update_fields=['status', 'released_at', 'resolved_by', 'resolution_reason'])
        return True
    
    def refund_funds(self, refunded_by=None, reason=""):
        """Refund funds from escrow."""
        self.status = EscrowStatus.REFUNDED
        self.released_at = timezone.now()
        self.resolved_by = refunded_by
        self.resolution_reason = reason
        
        # Fail the associated transaction
        self.transaction.fail_transaction(reason)
        
        self.save(update_fields=['status', 'released_at', 'resolved_by', 'resolution_reason'])
    
    def approve_by_buyer(self):
        """Mark as approved by buyer."""
        self.buyer_approved = True
        self.save(update_fields=['buyer_approved'])
        
        # Auto-release if both parties approved
        if self.can_release:
            self.release_funds(reason="Both parties approved")
    
    def approve_by_seller(self):
        """Mark as approved by seller."""
        self.seller_approved = True
        self.save(update_fields=['seller_approved'])
        
        # Auto-release if both parties approved
        if self.can_release:
            self.release_funds(reason="Both parties approved")
    
    def save(self, *args, **kwargs):
        """Set timeout_at before saving if not set."""
        if not self.timeout_at:
            self.timeout_at = timezone.now() + self.timeout_duration
        
        super().save(*args, **kwargs)


class MarketAnalytics(models.Model):
    """
    Market analytics model for tracking marketplace performance.
    
    Provides aggregated data about trading volume, price movements,
    and market activity for properties and the overall marketplace.
    """
    
    TIMEFRAME_CHOICES = [
        ('1h', '1 Hour'),
        ('24h', '24 Hours'),
        ('7d', '7 Days'),
        ('30d', '30 Days'),
        ('90d', '90 Days'),
        ('1y', '1 Year'),
        ('all', 'All Time'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for analytics record"
    )
    
    property_analyzed = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='market_analytics',
        help_text="Property these analytics are for (null for overall market)"
    )
    
    timeframe = models.CharField(
        max_length=5,
        choices=TIMEFRAME_CHOICES,
        help_text="Time period for these analytics"
    )
    
    # Trading volume metrics
    volume_tokens = models.PositiveIntegerField(
        default=0,
        help_text="Number of tokens traded"
    )
    
    volume_usd = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="USD value of tokens traded"
    )
    
    trade_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of trades completed"
    )
    
    unique_traders = models.PositiveIntegerField(
        default=0,
        help_text="Number of unique traders"
    )
    
    # Price metrics
    opening_price = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00000001'))],
        help_text="Opening price for the period"
    )
    
    closing_price = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00000001'))],
        help_text="Closing price for the period"
    )
    
    high_price = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00000001'))],
        help_text="Highest price during the period"
    )
    
    low_price = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00000001'))],
        help_text="Lowest price during the period"
    )
    
    average_price = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00000001'))],
        help_text="Volume-weighted average price"
    )
    
    # Market depth and liquidity
    active_listings_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of active listings"
    )
    
    total_tokens_for_sale = models.PositiveIntegerField(
        default=0,
        help_text="Total tokens available for sale"
    )
    
    total_tokens_wanted = models.PositiveIntegerField(
        default=0,
        help_text="Total tokens wanted by buyers"
    )
    
    bid_ask_spread = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00000000'))],
        help_text="Spread between highest bid and lowest ask"
    )
    
    # Market activity
    new_listings_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of new listings created"
    )
    
    completed_listings_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of listings completed"
    )
    
    cancelled_listings_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of listings cancelled"
    )
    
    # Revenue metrics
    platform_revenue = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Platform revenue from fees"
    )
    
    # Timestamps
    period_start = models.DateTimeField(
        help_text="Start of the analytics period"
    )
    
    period_end = models.DateTimeField(
        help_text="End of the analytics period"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'marketplace_market_analytics'
        unique_together = ('property_analyzed', 'timeframe', 'period_start')
        indexes = [
            models.Index(fields=['property_analyzed', 'timeframe', 'period_start']),
            models.Index(fields=['timeframe', 'period_start']),
            models.Index(fields=['volume_usd', 'period_start']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'Market Analytics'
        verbose_name_plural = 'Market Analytics'
        ordering = ['-period_start']

    def __str__(self):
        property_name = self.property_analyzed.title if self.property_analyzed else "Overall Market"
        return f"{property_name} - {self.timeframe} - {self.period_start.date()}"
    
    @property
    def price_change(self):
        """Calculate price change percentage."""
        if not self.opening_price or not self.closing_price or self.opening_price == 0:
            return Decimal('0.00')
        
        change = ((self.closing_price - self.opening_price) / self.opening_price) * 100
        return change.quantize(Decimal('0.01'))
    
    @property
    def average_trade_size(self):
        """Calculate average trade size in tokens."""
        if self.trade_count == 0:
            return 0
        return self.volume_tokens // self.trade_count
    
    @property
    def average_trade_value(self):
        """Calculate average trade value in USD."""
        if self.trade_count == 0:
            return Decimal('0.00')
        return (self.volume_usd / Decimal(self.trade_count)).quantize(Decimal('0.01'))


class TradingPair(models.Model):
    """
    Trading pair model for defining tradeable property token pairs.
    
    Defines which properties can be traded against each other or
    against base currencies in the marketplace.
    """
    
    PAIR_TYPE_CHOICES = [
        ('token_usd', 'Property Token / USD'),
        ('token_token', 'Property Token / Property Token'),
        ('token_crypto', 'Property Token / Cryptocurrency'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('delisted', 'Delisted'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the trading pair"
    )
    
    base_property_pair = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        related_name='base_trading_pairs',
        help_text="Base property in the trading pair"
    )
    
    quote_property_pair = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='quote_trading_pairs',
        help_text="Quote property in the trading pair (for token/token pairs)"
    )
    
    pair_type = models.CharField(
        max_length=15,
        choices=PAIR_TYPE_CHOICES,
        default='token_usd',
        help_text="Type of trading pair"
    )
    
    symbol = models.CharField(
        max_length=20,
        unique=True,
        help_text="Trading pair symbol (e.g., PROP1/USD)"
    )
    
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='active',
        help_text="Status of the trading pair"
    )
    
    # Trading parameters
    minimum_order_size = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Minimum order size in base tokens"
    )
    
    maximum_order_size = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum order size in base tokens (null for unlimited)"
    )
    
    price_precision = models.PositiveIntegerField(
        default=8,
        validators=[MinValueValidator(2), MaxValueValidator(18)],
        help_text="Number of decimal places for price precision"
    )
    
    quantity_precision = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(8)],
        help_text="Number of decimal places for quantity precision"
    )
    
    # Fee structure
    maker_fee = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('0.0200'),  # 2%
        validators=[MinValueValidator(Decimal('0.0000')), MaxValueValidator(Decimal('10.0000'))],
        help_text="Maker fee percentage"
    )
    
    taker_fee = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('0.0250'),  # 2.5%
        validators=[MinValueValidator(Decimal('0.0000')), MaxValueValidator(Decimal('10.0000'))],
        help_text="Taker fee percentage"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'marketplace_trading_pair'
        indexes = [
            models.Index(fields=['status', 'pair_type']),
            models.Index(fields=['base_property_pair', 'status']),
            models.Index(fields=['symbol']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'Trading Pair'
        verbose_name_plural = 'Trading Pairs'

    def __str__(self):
        return self.symbol
    
    @property
    def is_active(self):
        """Check if trading pair is active."""
        return self.status == 'active'
    
    def pause_trading(self):
        """Pause trading for this pair."""
        self.status = 'paused'
        self.save(update_fields=['status'])
    
    def resume_trading(self):
        """Resume trading for this pair."""
        self.status = 'active'
        self.save(update_fields=['status'])
    
    def delist_pair(self):
        """Delist this trading pair."""
        self.status = 'delisted'
        self.save(update_fields=['status'])