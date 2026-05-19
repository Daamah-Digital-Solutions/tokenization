"""
Investment Models for Capimax Real Estate Tokenization Platform.

This module contains models for investment management, portfolio tracking,
and token ownership including installment payments and dividend distributions.
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
import uuid


class InvestmentStatus(models.TextChoices):
    """Investment status choices throughout the lifecycle."""
    PENDING = 'pending', 'Pending'                      # Initial state, awaiting payment
    PROCESSING = 'processing', 'Processing'              # Payment being processed
    PAYMENT_CONFIRMED = 'payment_confirmed', 'Payment Confirmed'  # Payment success, pre-mint
    PENDING_MINT = 'pending_mint', 'Pending Mint'        # Payment done, awaiting blockchain mint
    MINTING = 'minting', 'Minting'                       # Mint transaction submitted
    COMPLETED = 'completed', 'Completed'                 # Fully complete with tokens minted
    MINT_FAILED = 'mint_failed', 'Mint Failed'           # Mint failed after retries
    FAILED = 'failed', 'Failed'                          # Payment or other failure
    CANCELLED = 'cancelled', 'Cancelled'                 # User cancelled
    REFUNDED = 'refunded', 'Refunded'                    # Refund processed


class Investment(models.Model):
    """
    Core Investment model for property token purchases.
    
    Represents an investment transaction where a user purchases
    tokens representing fractional ownership in a property.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the investment"
    )
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='investments',
        help_text="User making the investment"
    )
    
    property_investment = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        related_name='investments',
        help_text="Property being invested in"
    )
    
    token_amount = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Number of tokens being purchased"
    )
    
    investment_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Total investment amount in USD"
    )
    
    status = models.CharField(
        max_length=20,
        choices=InvestmentStatus.choices,
        default=InvestmentStatus.PENDING,
        help_text="Current status of the investment"
    )
    
    payment_method = models.JSONField(
        default=dict,
        help_text="Payment method details and metadata"
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

    # Mint tracking fields for deferred minting with retry
    mint_retry_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of mint retry attempts"
    )

    mint_last_attempt = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp of last mint attempt"
    )

    mint_error = models.TextField(
        blank=True,
        null=True,
        help_text="Last mint error message"
    )

    mint_scheduled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When next mint attempt is scheduled"
    )

    tokens_minted = models.PositiveIntegerField(
        default=0,
        help_text="Actual number of tokens minted on-chain"
    )

    idempotency_key = models.CharField(
        max_length=64,
        unique=True,
        null=True,
        blank=True,
        help_text="Unique key to prevent double processing"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when investment was completed"
    )

    # ------------------------------------------------------------------
    # Lockup & compliance snapshot (Phase 2)
    # ------------------------------------------------------------------
    lockup_end_date = models.DateTimeField(
        null=True, blank=True,
        help_text=(
            "Date/time when this investment's tokens become transferable on "
            "the secondary market. Set when the mint completes; enforced by "
            "the marketplace listing validator and the on-chain compliance "
            "registry."
        ),
    )
    accredited_at_investment_time = models.BooleanField(
        default=False,
        help_text=(
            "Snapshot of the investor's accredited status at investment "
            "creation. Used for audit trail even if status changes later."
        ),
    )
    jurisdiction_at_investment_time = models.CharField(
        max_length=2,
        blank=True,
        help_text="ISO country code of investor at investment creation.",
    )

    class Meta:
        db_table = 'investments_investment'
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['property_investment', 'status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['status', 'mint_scheduled_at']),  # For mint processor query
            models.Index(fields=['idempotency_key']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(token_amount__gt=0),
                name='investment_token_amount_positive'
            ),
            models.CheckConstraint(
                condition=models.Q(investment_amount__gt=0),
                name='investment_amount_positive'
            ),
        ]
        verbose_name = 'Investment'
        verbose_name_plural = 'Investments'

    def __str__(self):
        return f"Investment {self.id} - {self.user.email} - {self.token_amount} tokens in {self.property_investment.title}"

    # -------------------------------------------------------------------------
    # Mint State Machine Methods
    # -------------------------------------------------------------------------

    MAX_MINT_RETRIES = 3
    RETRY_DELAYS = [120, 240, 480]  # Seconds: 2min, 4min, 8min (exponential backoff)

    def mark_payment_confirmed(self):
        """Mark payment as confirmed, ready for minting."""
        import hashlib
        self.status = InvestmentStatus.PENDING_MINT
        self.mint_scheduled_at = timezone.now()
        # Generate idempotency key if not set
        if not self.idempotency_key:
            key_data = f"{self.id}-{self.user_id}-{self.property_investment_id}-{self.token_amount}"
            self.idempotency_key = hashlib.sha256(key_data.encode()).hexdigest()[:64]
        self.save(update_fields=['status', 'mint_scheduled_at', 'idempotency_key'])

    def mark_minting_started(self):
        """Mark that minting transaction has been submitted."""
        self.status = InvestmentStatus.MINTING
        self.mint_last_attempt = timezone.now()
        self.save(update_fields=['status', 'mint_last_attempt'])

    def mark_mint_success(self, tx_hash: str, tokens_minted: int):
        """Mark minting as successful and set the lockup expiry."""
        from datetime import timedelta
        self.status = InvestmentStatus.COMPLETED
        self.transaction_hash = tx_hash
        self.tokens_minted = tokens_minted
        self.blockchain_confirmed = True
        self.completed_at = timezone.now()
        self.mint_error = None

        # Compute lockup end from the property's policy. Default 12 months.
        lockup_months = getattr(self.property_investment, 'lockup_months', 12) or 0
        if lockup_months > 0:
            # 30 days per "month" is acceptable approximation; refine later
            # if calendar-precise lockups become a requirement.
            self.lockup_end_date = self.completed_at + timedelta(days=30 * lockup_months)

        self.save(update_fields=[
            'status', 'transaction_hash', 'tokens_minted',
            'blockchain_confirmed', 'completed_at', 'mint_error',
            'lockup_end_date',
        ])

    def mark_mint_failed(self, error_message: str):
        """Mark a mint attempt as failed, schedule retry or final failure."""
        self.mint_retry_count += 1
        self.mint_last_attempt = timezone.now()
        self.mint_error = error_message

        if self.mint_retry_count >= self.MAX_MINT_RETRIES:
            # Max retries exceeded - mark as failed
            self.status = InvestmentStatus.MINT_FAILED
            self.mint_scheduled_at = None
        else:
            # Schedule next retry with exponential backoff
            delay_seconds = self.RETRY_DELAYS[min(self.mint_retry_count - 1, len(self.RETRY_DELAYS) - 1)]
            self.status = InvestmentStatus.PENDING_MINT
            self.mint_scheduled_at = timezone.now() + timezone.timedelta(seconds=delay_seconds)

        self.save(update_fields=[
            'status', 'mint_retry_count', 'mint_last_attempt',
            'mint_error', 'mint_scheduled_at'
        ])

    def can_retry_mint(self) -> bool:
        """Check if mint can be retried."""
        return (
            self.status in [InvestmentStatus.PENDING_MINT, InvestmentStatus.MINT_FAILED] and
            self.mint_retry_count < self.MAX_MINT_RETRIES
        )

    def is_ready_for_mint(self) -> bool:
        """Check if investment is ready for mint processing."""
        if self.status != InvestmentStatus.PENDING_MINT:
            return False
        if self.mint_scheduled_at and self.mint_scheduled_at > timezone.now():
            return False
        return True

    @property
    def ownership_percentage(self):
        """Calculate ownership percentage in the property."""
        if self.property_investment.total_tokens == 0:
            return Decimal('0.00')
        percentage = (Decimal(self.token_amount) / Decimal(self.property_investment.total_tokens)) * 100
        return percentage.quantize(Decimal('0.0001'))

    @property
    def current_value(self):
        """Calculate current value based on latest property valuation."""
        latest_valuation = self.property_investment.valuations.first()
        if latest_valuation:
            property_value = latest_valuation.current_value
        else:
            property_value = self.property_investment.total_value

        ownership_fraction = Decimal(self.token_amount) / Decimal(self.property_investment.total_tokens)
        return (property_value * ownership_fraction).quantize(Decimal('0.01'))

    def complete_investment(self):
        """Mark investment as completed (legacy method, use mark_mint_success instead)."""
        self.status = InvestmentStatus.COMPLETED
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'completed_at'])


class InstallmentPayment(models.Model):
    """
    Installment payment model for graduated ownership investments.
    
    Allows users to pay for property tokens in multiple installments
    rather than a single lump sum payment.
    """
    
    INSTALLMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the installment payment"
    )
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        help_text="User making the installment payment"
    )
    
    property_investment = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        help_text="Property being invested in"
    )
    
    installment_number = models.PositiveIntegerField(
        help_text="Installment sequence number (1, 2, 3...)"
    )
    
    due_date = models.DateTimeField(
        help_text="Due date for this installment"
    )
    
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Installment amount in USD"
    )
    
    status = models.CharField(
        max_length=20,
        choices=INSTALLMENT_STATUS_CHOICES,
        default='pending',
        help_text="Status of this installment"
    )
    
    paid_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when installment was paid"
    )
    
    payment = models.ForeignKey(
        'payments.Payment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Associated payment record"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'investments_installment_payment'
        unique_together = ('user', 'property_investment', 'installment_number')
        ordering = ['installment_number']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['due_date', 'status']),
            models.Index(fields=['property_investment', 'status']),
        ]
        verbose_name = 'Installment Payment'
        verbose_name_plural = 'Installment Payments'

    def __str__(self):
        return f"Installment {self.installment_number} for {self.user.email} - {self.property_investment.title}"
    
    @property
    def is_overdue(self):
        """Check if installment is overdue."""
        return self.status == 'pending' and self.due_date < timezone.now()
    
    def mark_as_paid(self, payment):
        """Mark installment as paid."""
        self.status = 'paid'
        self.paid_at = timezone.now()
        self.payment = payment
        self.save(update_fields=['status', 'paid_at', 'payment'])


class TokenReservation(models.Model):
    """
    Token reservation model for holding tokens during payment processing.
    
    Temporarily reserves tokens to prevent overselling while payment
    is being processed.
    """
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        help_text="User reserving tokens"
    )
    
    property_investment = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        help_text="Property with reserved tokens"
    )
    
    token_amount = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Number of tokens reserved"
    )
    
    reserved_at = models.DateTimeField(auto_now_add=True)
    
    expires_at = models.DateTimeField(
        help_text="When the reservation expires"
    )
    
    released = models.BooleanField(
        default=False,
        help_text="Whether tokens have been released"
    )

    class Meta:
        db_table = 'investments_token_reservation'
        indexes = [
            models.Index(fields=['user', 'property_investment']),
            models.Index(fields=['expires_at', 'released']),
            models.Index(fields=['property_investment', 'released']),
        ]
        verbose_name = 'Token Reservation'
        verbose_name_plural = 'Token Reservations'

    def __str__(self):
        return f"Reservation: {self.token_amount} tokens for {self.user.email} in {self.property_investment.title}"
    
    @property
    def is_expired(self):
        """Check if reservation is expired."""
        return timezone.now() > self.expires_at
    
    def release_tokens(self):
        """Release the reserved tokens."""
        self.released = True
        self.save(update_fields=['released'])


class InvestmentWithdrawal(models.Model):
    """
    Investment withdrawal model for selling tokens back to the platform.
    
    Allows investors to request withdrawal of their investment
    subject to liquidity and platform policies.
    """
    
    WITHDRAWAL_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the withdrawal"
    )
    
    investment = models.ForeignKey(
        Investment,
        on_delete=models.CASCADE,
        help_text="Original investment being withdrawn"
    )
    
    token_amount = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Number of tokens to withdraw"
    )
    
    estimated_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Estimated withdrawal amount in USD"
    )
    
    processing_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Processing fee for withdrawal"
    )
    
    status = models.CharField(
        max_length=20,
        choices=WITHDRAWAL_STATUS_CHOICES,
        default='pending',
        help_text="Status of withdrawal request"
    )
    
    requested_at = models.DateTimeField(auto_now_add=True)
    
    estimated_completion = models.DateTimeField(
        help_text="Estimated completion date"
    )
    
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Actual completion timestamp"
    )

    class Meta:
        db_table = 'investments_investment_withdrawal'
        indexes = [
            models.Index(fields=['investment', 'status']),
            models.Index(fields=['status', 'requested_at']),
            models.Index(fields=['estimated_completion']),
        ]
        verbose_name = 'Investment Withdrawal'
        verbose_name_plural = 'Investment Withdrawals'

    def __str__(self):
        return f"Withdrawal: {self.token_amount} tokens from {self.investment.id}"
    
    @property
    def net_amount(self):
        """Calculate net amount after fees."""
        return self.estimated_amount - self.processing_fee


class AutoInvestment(models.Model):
    """
    Automatic investment model for dollar-cost averaging strategies.
    
    Allows users to set up recurring investments in properties
    with specified amounts and frequencies.
    """
    
    FREQUENCY_CHOICES = [
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the auto investment"
    )
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        help_text="User setting up auto investment"
    )
    
    property_investment = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        help_text="Property to auto invest in"
    )
    
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Amount to invest each period"
    )
    
    frequency = models.CharField(
        max_length=20,
        choices=FREQUENCY_CHOICES,
        help_text="Investment frequency"
    )
    
    payment_method = models.JSONField(
        help_text="Payment method for auto investments"
    )
    
    start_date = models.DateTimeField(
        help_text="Start date for auto investments"
    )
    
    end_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="End date for auto investments (optional)"
    )
    
    max_total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Maximum total amount to invest (optional)"
    )
    
    next_execution = models.DateTimeField(
        help_text="Next scheduled investment date"
    )
    
    total_invested = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total amount invested so far"
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        help_text="Status of auto investment plan"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'investments_auto_investment'
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['next_execution', 'status']),
            models.Index(fields=['property_investment', 'status']),
        ]
        verbose_name = 'Auto Investment'
        verbose_name_plural = 'Auto Investments'

    def __str__(self):
        return f"Auto Investment: {self.user.email} - ${self.amount} {self.frequency} in {self.property_investment.title}"


class DividendPayment(models.Model):
    """
    Dividend payment model for distributing property income to investors.
    
    Tracks dividend payments made to investors based on their
    token ownership in properties.
    """
    
    DIVIDEND_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the dividend payment"
    )
    
    investment = models.ForeignKey(
        Investment,
        on_delete=models.CASCADE,
        help_text="Investment receiving dividend"
    )
    
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Dividend amount in specified currency"
    )
    
    currency = models.CharField(
        max_length=10,
        default='USD',
        help_text="Currency of dividend payment"
    )
    
    payment_date = models.DateTimeField(
        help_text="Date when dividend was/will be paid"
    )
    
    period_start = models.DateTimeField(
        help_text="Start of dividend period"
    )
    
    period_end = models.DateTimeField(
        help_text="End of dividend period"
    )
    
    status = models.CharField(
        max_length=20,
        choices=DIVIDEND_STATUS_CHOICES,
        default='pending',
        help_text="Status of dividend payment"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'investments_dividend_payment'
        indexes = [
            models.Index(fields=['investment', 'payment_date']),
            models.Index(fields=['status', 'payment_date']),
            models.Index(fields=['period_start', 'period_end']),
        ]
        verbose_name = 'Dividend Payment'
        verbose_name_plural = 'Dividend Payments'

    def __str__(self):
        return f"Dividend: ${self.amount} to {self.investment.user.email} for {self.investment.property_investment.title}"
    
    @property
    def annual_yield(self):
        """Calculate annualized yield for this dividend."""
        days_in_period = (self.period_end - self.period_start).days
        if days_in_period == 0:
            return Decimal('0.00')
        
        daily_yield = self.amount / self.investment.investment_amount
        annual_yield = daily_yield * 365 / days_in_period * 100
        return annual_yield.quantize(Decimal('0.01'))


class Cart(models.Model):
    """
    Shopping cart for property investments comparison and bulk investment.
    
    Allows users to add multiple properties to a cart for comparison,
    bulk investment planning, and streamlined investment workflow.
    """
    
    CART_STATUS = [
        ('active', 'Active'),
        ('checkout', 'In Checkout'),
        ('completed', 'Completed'),
        ('abandoned', 'Abandoned'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the cart"
    )
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='carts',
        help_text="User who owns this cart"
    )
    
    session_key = models.CharField(
        max_length=40,
        blank=True,
        null=True,
        help_text="Session key for anonymous users"
    )
    
    status = models.CharField(
        max_length=20,
        choices=CART_STATUS,
        default='active',
        help_text="Current status of the cart"
    )
    
    total_properties = models.PositiveIntegerField(
        default=0,
        help_text="Total number of properties in cart"
    )
    
    total_tokens = models.PositiveIntegerField(
        default=0,
        help_text="Total number of tokens selected"
    )
    
    total_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Total investment amount for all cart items"
    )
    
    estimated_annual_return = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Estimated annual return for cart investments"
    )
    
    notes = models.TextField(
        blank=True,
        help_text="User notes about the cart"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When cart expires (for anonymous users)"
    )

    class Meta:
        db_table = 'investments_cart'
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['session_key', 'status']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['expires_at']),
        ]
        verbose_name = 'Investment Cart'
        verbose_name_plural = 'Investment Carts'
        ordering = ['-updated_at']

    def __str__(self):
        if self.user:
            return f"Cart for {self.user.email} - {self.total_properties} properties"
        return f"Anonymous cart {self.id} - {self.total_properties} properties"
    
    @property
    def is_empty(self):
        """Check if cart is empty."""
        return self.total_properties == 0
    
    @property
    def is_expired(self):
        """Check if cart is expired."""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    @property
    def average_token_price(self):
        """Calculate average token price across cart items."""
        if self.total_tokens == 0:
            return Decimal('0.00')
        return self.total_amount / Decimal(self.total_tokens)
    
    def update_totals(self):
        """Update cart totals from cart items."""
        items = self.items.all()
        
        self.total_properties = items.count()
        self.total_tokens = sum(item.tokens_quantity for item in items)
        self.total_amount = sum(item.total_amount for item in items)
        
        # Calculate weighted average expected return
        total_weighted_return = Decimal('0.00')
        for item in items:
            if item.property_investment.expected_return:
                weight = item.total_amount / self.total_amount if self.total_amount > 0 else Decimal('0')
                total_weighted_return += item.property_investment.expected_return * weight
        
        self.estimated_annual_return = total_weighted_return
        self.save(update_fields=['total_properties', 'total_tokens', 'total_amount', 'estimated_annual_return'])
    
    def clear(self):
        """Clear all items from cart."""
        self.items.all().delete()
        self.update_totals()
    
    def convert_to_investments(self, payment_method='credit_card'):
        """Convert cart items to actual investments."""
        investments = []
        
        for item in self.items.all():
            investment = Investment.objects.create(
                user=self.user,
                property_investment=item.property_investment,
                tokens_purchased=item.tokens_quantity,
                price_per_token=item.property_investment.token_price,
                investment_amount=item.total_amount,
                payment_method=payment_method,
                status=InvestmentStatus.PENDING
            )
            investments.append(investment)
        
        self.status = 'completed'
        self.save()
        
        return investments


class CartItem(models.Model):
    """
    Individual items in a shopping cart representing property investment selections.
    
    Each cart item represents a user's selection of a specific number of tokens
    for a particular property, with calculated totals and investment details.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the cart item"
    )
    
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name='items',
        help_text="Cart this item belongs to"
    )
    
    property_investment = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        help_text="Property selected for investment"
    )
    
    tokens_quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Number of tokens selected for purchase"
    )
    
    price_per_token = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Price per token at time of addition to cart"
    )
    
    total_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Total amount for this cart item"
    )
    
    # Investment preferences for this item
    installment_payment = models.BooleanField(
        default=False,
        help_text="Whether user wants installment payment for this item"
    )
    
    installment_months = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(120)],
        help_text="Number of installment months (if applicable)"
    )
    
    notes = models.TextField(
        blank=True,
        help_text="User notes for this specific investment"
    )
    
    added_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'investments_cart_item'
        unique_together = ('cart', 'property_investment')
        indexes = [
            models.Index(fields=['cart', 'added_at']),
            models.Index(fields=['property_investment']),
            models.Index(fields=['price_per_token']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(tokens_quantity__gt=0),
                name='cart_item_tokens_positive'
            ),
            models.CheckConstraint(
                condition=models.Q(total_amount__gt=0),
                name='cart_item_total_positive'
            ),
        ]
        verbose_name = 'Cart Item'
        verbose_name_plural = 'Cart Items'
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.tokens_quantity} tokens of {self.property_investment.title}"
    
    @property
    def ownership_percentage(self):
        """Calculate ownership percentage for this cart item."""
        if self.property_investment.total_tokens == 0:
            return Decimal('0.00')
        percentage = (Decimal(self.tokens_quantity) / Decimal(self.property_investment.total_tokens)) * 100
        return percentage.quantize(Decimal('0.0001'))
    
    @property
    def estimated_monthly_return(self):
        """Calculate estimated monthly return for this cart item."""
        if self.property_investment.expected_return:
            annual_return = self.total_amount * (self.property_investment.expected_return / 100)
            return annual_return / 12
        return Decimal('0.00')
    
    @property
    def is_installment_eligible(self):
        """Check if property supports installment payments."""
        return self.property_investment.supports_installments
    
    def save(self, *args, **kwargs):
        """Calculate total amount before saving and update cart totals."""
        if not self.total_amount:
            self.total_amount = self.price_per_token * Decimal(self.tokens_quantity)
        
        super().save(*args, **kwargs)
        
        # Update cart totals after saving
        if hasattr(self, 'cart'):
            self.cart.update_totals()
    
    def delete(self, *args, **kwargs):
        """Update cart totals after deleting item."""
        cart = self.cart
        super().delete(*args, **kwargs)
        cart.update_totals()


class PropertyComparison(models.Model):
    """
    Property comparison tracking for users analyzing multiple properties.
    
    Tracks which properties users are comparing and stores comparison
    criteria and notes for investment decision making.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the comparison"
    )
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='property_comparisons',
        help_text="User performing the comparison"
    )
    
    name = models.CharField(
        max_length=255,
        help_text="User-defined name for this comparison"
    )
    
    properties = models.ManyToManyField(
        'properties.Property',
        through='ComparisonProperty',
        help_text="Properties being compared"
    )
    
    comparison_criteria = models.JSONField(
        default=dict,
        help_text="Criteria and weights used for comparison"
    )
    
    notes = models.TextField(
        blank=True,
        help_text="User notes about the comparison"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'investments_property_comparison'
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'Property Comparison'
        verbose_name_plural = 'Property Comparisons'
        ordering = ['-updated_at']

    def __str__(self):
        return f"Comparison '{self.name}' by {self.user.email}"
    
    @property
    def property_count(self):
        """Get number of properties in comparison."""
        return self.properties.count()
    
    def add_property(self, property_obj, notes=''):
        """Add a property to the comparison."""
        comparison_property, created = ComparisonProperty.objects.get_or_create(
            comparison=self,
            property_investment=property_obj,
            defaults={'notes': notes}
        )
        return comparison_property
    
    def remove_property(self, property_obj):
        """Remove a property from the comparison."""
        ComparisonProperty.objects.filter(
            comparison=self,
            property_investment=property_obj
        ).delete()
    
    def calculate_scores(self):
        """Calculate comparison scores based on criteria."""
        scores = {}
        
        for comp_property in self.comparison_properties.all():
            property_obj = comp_property.property_investment
            total_score = Decimal('0.00')
            
            # Default scoring criteria
            criteria = self.comparison_criteria or {
                'expected_return': 30,
                'funding_percentage': 20,
                'property_value': 20,
                'rental_yield': 15,
                'location_score': 15
            }
            
            for criterion, weight in criteria.items():
                score = Decimal('0.00')
                
                if criterion == 'expected_return' and property_obj.expected_return:
                    score = min(property_obj.expected_return / 10, Decimal('10.00'))
                elif criterion == 'funding_percentage':
                    score = property_obj.funding_percentage / 10
                elif criterion == 'property_value':
                    # Normalize by comparison maximum
                    max_value = max(p.property_investment.total_value for p in self.comparison_properties.all())
                    if max_value > 0:
                        score = (property_obj.total_value / max_value) * 10
                elif criterion == 'rental_yield' and property_obj.rental_yield:
                    score = min(property_obj.rental_yield / 2, Decimal('10.00'))
                
                total_score += score * Decimal(weight) / 100
            
            scores[property_obj.id] = total_score.quantize(Decimal('0.01'))
        
        return scores


class ComparisonProperty(models.Model):
    """
    Through model for property comparisons with individual property notes.
    """
    
    comparison = models.ForeignKey(
        PropertyComparison,
        on_delete=models.CASCADE,
        related_name='comparison_properties'
    )
    
    property_investment = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        related_name='comparisons'
    )
    
    notes = models.TextField(
        blank=True,
        help_text="Specific notes for this property in this comparison"
    )
    
    score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Calculated comparison score"
    )
    
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'investments_comparison_property'
        unique_together = ('comparison', 'property_investment')
        indexes = [
            models.Index(fields=['comparison', 'score']),
            models.Index(fields=['added_at']),
        ]
        verbose_name = 'Comparison Property'
        verbose_name_plural = 'Comparison Properties'

    def __str__(self):
        return f"{self.property_investment.title} in {self.comparison.name}"
