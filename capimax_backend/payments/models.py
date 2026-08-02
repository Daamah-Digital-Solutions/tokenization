"""
Payment Models for Capimax Real Estate Tokenization Platform.

This module contains models for payment processing, wallet management,
and financial transactions including multi-provider payment support.
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
import uuid


class PaymentMethod(models.TextChoices):
    """Payment method choices."""
    CRYPTOCURRENCY = 'cryptocurrency', 'Cryptocurrency'
    CREDIT_CARD = 'credit_card', 'Credit Card'
    BANK_TRANSFER = 'bank_transfer', 'Bank Transfer'
    PAYPAL = 'paypal', 'PayPal'
    WALLET = 'wallet', 'Wallet'
    NOVA_SUKUK = 'nova_sukuk', 'Nova Sukuk'
    PRONOVA = 'pronova', 'Pronova'


class PaymentStatus(models.TextChoices):
    """Payment status choices throughout processing lifecycle."""
    PENDING = 'pending', 'Pending'
    PROCESSING = 'processing', 'Processing'
    COMPLETED = 'completed', 'Completed'
    FAILED = 'failed', 'Failed'
    CANCELLED = 'cancelled', 'Cancelled'
    REFUNDED = 'refunded', 'Refunded'


class Payment(models.Model):
    """
    Core Payment model for processing financial transactions.
    
    Handles payments from multiple providers (Stripe, PayPal, Crypto)
    and tracks transaction status throughout the payment lifecycle.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the payment"
    )
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='payments',
        help_text="User making the payment"
    )
    
    investment = models.ForeignKey(
        'investments.Investment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Investment this payment is for (if applicable)"
    )
    
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Payment amount"
    )
    
    currency = models.CharField(
        max_length=10,
        default='USD',
        help_text="Payment currency"
    )
    
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        help_text="Payment method used"
    )
    
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        help_text="Current payment status"
    )
    
    transaction_hash = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Blockchain transaction hash (for crypto payments)"
    )
    
    payment_intent_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Payment provider's payment intent ID"
    )
    
    external_transaction_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="External payment provider transaction ID"
    )
    
    processing_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Processing fee charged"
    )
    
    net_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Net amount after fees"
    )
    
    metadata = models.JSONField(
        default=dict,
        help_text="Additional payment metadata and provider-specific data"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when payment was completed"
    )

    class Meta:
        db_table = 'payments_payment'
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['payment_method', 'status']),
            models.Index(fields=['external_transaction_id']),
            models.Index(fields=['payment_intent_id']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount__gt=0),
                name='payment_amount_positive'
            ),
            models.CheckConstraint(
                condition=models.Q(processing_fee__gte=0),
                name='payment_fee_non_negative'
            ),
        ]
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'

    def __str__(self):
        return f"Payment {self.id} - {self.user.email} - ${self.amount} ({self.payment_method})"
    
    def save(self, *args, **kwargs):
        """Calculate net amount before saving."""
        if not self.net_amount:
            self.net_amount = self.amount - self.processing_fee
        super().save(*args, **kwargs)
    
    @property
    def fee_percentage(self):
        """Calculate processing fee as percentage of amount."""
        if self.amount == 0:
            return Decimal('0.00')
        return ((self.processing_fee / self.amount) * 100).quantize(Decimal('0.01'))


class UserPaymentMethod(models.Model):
    """
    User's saved payment methods for future transactions.
    
    Stores encrypted payment method information for quick access
    without requiring users to re-enter details.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the payment method"
    )
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='payment_methods',
        help_text="User who owns this payment method"
    )
    
    method_type = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        help_text="Type of payment method"
    )
    
    display_name = models.CharField(
        max_length=255,
        help_text="User-friendly display name for the payment method"
    )
    
    last_four = models.CharField(
        max_length=4,
        blank=True,
        help_text="Last four digits (for cards/accounts)"
    )
    
    expiry_date = models.CharField(
        max_length=7,
        blank=True,
        help_text="Expiry date in MM/YYYY format (for cards)"
    )
    
    brand = models.CharField(
        max_length=50,
        blank=True,
        help_text="Card brand or payment method brand"
    )
    
    wallet_address = models.CharField(
        max_length=255,
        blank=True,
        help_text="Cryptocurrency wallet address"
    )
    
    network = models.CharField(
        max_length=50,
        blank=True,
        help_text="Blockchain network (for crypto)"
    )
    
    is_default = models.BooleanField(
        default=False,
        help_text="Whether this is the user's default payment method"
    )
    
    is_verified = models.BooleanField(
        default=False,
        help_text="Whether the payment method is verified"
    )
    
    external_id = models.CharField(
        max_length=255,
        blank=True,
        help_text="External provider ID (Stripe customer ID, etc.)"
    )
    
    metadata = models.JSONField(
        default=dict,
        help_text="Additional payment method metadata"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments_user_payment_method'
        indexes = [
            models.Index(fields=['user', 'method_type']),
            models.Index(fields=['user', 'is_default']),
            models.Index(fields=['external_id']),
        ]
        verbose_name = 'User Payment Method'
        verbose_name_plural = 'User Payment Methods'

    def __str__(self):
        return f"{self.display_name} for {self.user.email}"


class CurrencyType(models.TextChoices):
    """Currency type choices for enhanced wallet system."""
    FIAT = 'fiat', 'Fiat Currency'
    CRYPTOCURRENCY = 'cryptocurrency', 'Cryptocurrency'


class WalletBalance(models.Model):
    """
    Enhanced user wallet balances for different currencies.
    
    Tracks available, pending, and locked balances for each currency
    a user holds in their platform wallet, including both fiat and cryptocurrencies.
    """
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='wallet_balances',
        help_text="User who owns this wallet balance"
    )
    
    currency = models.CharField(
        max_length=10,
        help_text="Currency code (USD, EUR, AED, BTC, ETH, MATIC, USDC, USDT, BNB)"
    )
    
    currency_type = models.CharField(
        max_length=20,
        choices=CurrencyType.choices,
        default=CurrencyType.FIAT,
        help_text="Type of currency (fiat or cryptocurrency)"
    )
    
    available_balance = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Available balance for spending"
    )
    
    pending_balance = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Balance pending confirmation"
    )
    
    locked_balance = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Balance locked for pending transactions"
    )
    
    # Cryptocurrency specific fields
    wallet_address = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Associated wallet address for cryptocurrency"
    )
    
    network = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Blockchain network (for cryptocurrencies)"
    )
    
    contract_address = models.CharField(
        max_length=42,
        blank=True,
        null=True,
        help_text="Token contract address (for ERC-20 tokens)"
    )
    
    minimum_withdrawal = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        default=Decimal('0.01'),
        validators=[MinValueValidator(Decimal('0.00000001'))],
        help_text="Minimum withdrawal amount for this currency"
    )
    
    withdrawal_fee = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Fixed withdrawal fee for this currency"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this currency is active for deposits/withdrawals"
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments_wallet_balance'
        unique_together = ('user', 'currency')
        indexes = [
            models.Index(fields=['user', 'currency']),
            models.Index(fields=['currency', 'currency_type']),
            models.Index(fields=['user', 'currency_type']),
            models.Index(fields=['is_active']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(available_balance__gte=0),
                name='wallet_available_balance_non_negative'
            ),
            models.CheckConstraint(
                condition=models.Q(pending_balance__gte=0),
                name='wallet_pending_balance_non_negative'
            ),
            models.CheckConstraint(
                condition=models.Q(locked_balance__gte=0),
                name='wallet_locked_balance_non_negative'
            ),
        ]
        verbose_name = 'Wallet Balance'
        verbose_name_plural = 'Wallet Balances'

    def __str__(self):
        return f"{self.user.email} - {self.available_balance} {self.currency}"
    
    @property
    def total_balance(self):
        """Calculate total balance (available + pending + locked)."""
        return self.available_balance + self.pending_balance + self.locked_balance
    
    @property
    def is_cryptocurrency(self):
        """Check if this is a cryptocurrency balance."""
        return self.currency_type == CurrencyType.CRYPTOCURRENCY
    
    @property
    def is_fiat(self):
        """Check if this is a fiat currency balance."""
        return self.currency_type == CurrencyType.FIAT
    
    def can_withdraw(self, amount):
        """Check if user can withdraw the specified amount."""
        return (
            self.is_active and
            amount >= self.minimum_withdrawal and
            self.available_balance >= amount
        )

    @classmethod
    def credit(cls, user, amount, *, currency='USD',
               transaction_type='deposit', description='', reference_id=None):
        """
        Credit a user's wallet and record an audited WalletTransaction.

        Shared entry point for money landing in a wallet — broker-commission
        payouts and admin manual owner credits both go through here, so every
        credit produces a matching ledger row.
        """
        amount = Decimal(str(amount))
        wb, _ = cls.objects.get_or_create(
            user=user, currency=currency,
            defaults={'available_balance': Decimal('0.00')},
        )
        before = wb.available_balance
        wb.available_balance = before + amount
        wb.save(update_fields=['available_balance', 'updated_at'])
        WalletTransaction.objects.create(
            user=user,
            transaction_type=transaction_type,
            amount=amount,
            currency=currency,
            balance_before=before,
            balance_after=wb.available_balance,
            reference_id=reference_id,
            description=description,
        )
        return wb

    @classmethod
    def debit(cls, user, amount, *, currency='USD',
              transaction_type='investment', description='', reference_id=None):
        """
        Debit a user's wallet and record an audited WalletTransaction.

        Mirror of :meth:`credit` for money leaving a wallet (e.g. installment
        payments). Raises ``ValueError`` when the available balance is
        insufficient so callers can surface a clean "insufficient funds"
        message instead of driving the balance negative (which the
        ``available_balance >= 0`` check constraint would reject anyway). The
        ledger row stores a negative ``amount`` per WalletTransaction's
        positive-credit / negative-debit convention.
        """
        amount = Decimal(str(amount))
        wb, _ = cls.objects.get_or_create(
            user=user, currency=currency,
            defaults={'available_balance': Decimal('0.00')},
        )
        before = wb.available_balance
        if before < amount:
            raise ValueError('Insufficient wallet balance')
        wb.available_balance = before - amount
        wb.save(update_fields=['available_balance', 'updated_at'])
        WalletTransaction.objects.create(
            user=user,
            transaction_type=transaction_type,
            amount=-amount,
            currency=currency,
            balance_before=before,
            balance_after=wb.available_balance,
            reference_id=reference_id,
            description=description,
        )
        return wb

    def get_withdrawal_total(self, amount):
        """Calculate total amount including withdrawal fees."""
        return amount + self.withdrawal_fee


class WalletTransaction(models.Model):
    """
    Wallet transaction history for balance changes.
    
    Tracks all balance changes including deposits, withdrawals,
    investments, fees, and other transactions.
    """
    
    TRANSACTION_TYPES = [
        ('deposit', 'Deposit'),
        ('withdrawal', 'Withdrawal'),
        ('investment', 'Investment'),
        ('dividend', 'Dividend'),
        ('fee', 'Fee'),
        ('refund', 'Refund'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the wallet transaction"
    )
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        help_text="User whose wallet this transaction affects"
    )
    
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPES,
        help_text="Type of wallet transaction"
    )
    
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=8,
        help_text="Transaction amount (positive for credits, negative for debits)"
    )
    
    currency = models.CharField(
        max_length=10,
        help_text="Currency of the transaction"
    )
    
    balance_before = models.DecimalField(
        max_digits=15,
        decimal_places=8,
        help_text="Balance before this transaction"
    )
    
    balance_after = models.DecimalField(
        max_digits=15,
        decimal_places=8,
        help_text="Balance after this transaction"
    )
    
    reference_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="Reference ID to payment, investment, etc."
    )
    
    description = models.TextField(
        help_text="Transaction description"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments_wallet_transaction'
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['transaction_type', 'created_at']),
            models.Index(fields=['currency', 'created_at']),
            models.Index(fields=['reference_id']),
        ]
        verbose_name = 'Wallet Transaction'
        verbose_name_plural = 'Wallet Transactions'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.transaction_type.title()}: {self.amount} {self.currency} for {self.user.email}"


class CryptoPayment(models.Model):
    """
    Cryptocurrency payment details and blockchain tracking.
    
    Extended payment information specific to cryptocurrency transactions
    including gas fees, confirmations, and network details.
    """
    
    payment = models.OneToOneField(
        Payment,
        on_delete=models.CASCADE,
        related_name='crypto_details',
        help_text="Associated payment record"
    )
    
    wallet_address = models.CharField(
        max_length=255,
        help_text="Wallet address used for payment"
    )
    
    network = models.CharField(
        max_length=50,
        help_text="Blockchain network (Ethereum, Polygon, etc.)"
    )
    
    gas_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Gas limit for the transaction"
    )
    
    gas_price = models.DecimalField(
        max_digits=20,
        decimal_places=8,
        null=True,
        blank=True,
        help_text="Gas price in network's base unit"
    )
    
    confirmation_blocks_required = models.PositiveIntegerField(
        default=12,
        help_text="Number of confirmations required"
    )
    
    confirmations = models.PositiveIntegerField(
        default=0,
        help_text="Current number of confirmations"
    )
    
    block_height = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Block height when transaction was mined"
    )

    class Meta:
        db_table = 'payments_crypto_payment'
        indexes = [
            models.Index(fields=['wallet_address']),
            models.Index(fields=['network']),
            models.Index(fields=['confirmations']),
        ]
        verbose_name = 'Crypto Payment'
        verbose_name_plural = 'Crypto Payments'

    def __str__(self):
        return f"Crypto payment {self.payment.id} on {self.network}"
    
    @property
    def is_confirmed(self):
        """Check if payment has required confirmations."""
        return self.confirmations >= self.confirmation_blocks_required


class Refund(models.Model):
    """
    Payment refund tracking and processing.
    
    Handles refund requests and processing for various payment methods
    with proper audit trail and status tracking.
    """
    
    REFUND_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the refund"
    )
    
    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name='refunds',
        help_text="Original payment being refunded"
    )
    
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Refund amount"
    )
    
    reason = models.TextField(
        help_text="Reason for the refund"
    )
    
    status = models.CharField(
        max_length=20,
        choices=REFUND_STATUS_CHOICES,
        default='pending',
        help_text="Status of the refund"
    )
    
    external_refund_id = models.CharField(
        max_length=255,
        blank=True,
        help_text="External payment provider refund ID"
    )
    
    processed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the refund was processed"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments_refund'
        indexes = [
            models.Index(fields=['payment', 'status']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['external_refund_id']),
        ]
        verbose_name = 'Refund'
        verbose_name_plural = 'Refunds'

    def __str__(self):
        return f"Refund {self.id} - ${self.amount} for payment {self.payment.id}"


class RecurringPayment(models.Model):
    """
    Recurring payment setup for automatic investments and wallet top-ups.
    
    Allows users to set up automatic recurring payments for investments
    or wallet funding with specified frequencies and limits.
    """
    
    FREQUENCY_CHOICES = [
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annually', 'Annually'),
    ]
    
    PURPOSE_CHOICES = [
        ('investment', 'Investment'),
        ('wallet_topup', 'Wallet Top-up'),
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
        help_text="Unique identifier for the recurring payment"
    )
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        help_text="User setting up recurring payment"
    )
    
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Amount for each payment"
    )
    
    currency = models.CharField(
        max_length=10,
        default='USD',
        help_text="Payment currency"
    )
    
    frequency = models.CharField(
        max_length=20,
        choices=FREQUENCY_CHOICES,
        help_text="Payment frequency"
    )
    
    payment_method = models.ForeignKey(
        UserPaymentMethod,
        on_delete=models.CASCADE,
        help_text="Payment method to use"
    )
    
    start_date = models.DateTimeField(
        help_text="Start date for recurring payments"
    )
    
    end_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="End date for recurring payments (optional)"
    )
    
    next_payment = models.DateTimeField(
        help_text="Next scheduled payment date"
    )
    
    purpose = models.CharField(
        max_length=20,
        choices=PURPOSE_CHOICES,
        help_text="Purpose of recurring payments"
    )
    
    investment = models.ForeignKey(
        'investments.Investment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Target investment (if purpose is investment)"
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        help_text="Status of recurring payment"
    )
    
    total_payments = models.PositiveIntegerField(
        default=0,
        help_text="Total number of payments made"
    )
    
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Total amount paid so far"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments_recurring_payment'
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['next_payment', 'status']),
            models.Index(fields=['purpose', 'status']),
        ]
        verbose_name = 'Recurring Payment'
        verbose_name_plural = 'Recurring Payments'

    def __str__(self):
        return f"Recurring Payment: {self.user.email} - ${self.amount} {self.frequency}"


class CurrencyExchangeRate(models.Model):
    """
    Currency exchange rates for conversion between different currencies.
    
    Maintains real-time exchange rates for both fiat and cryptocurrency
    conversions with automatic rate updates and historical tracking.
    """
    
    base_currency = models.CharField(
        max_length=10,
        help_text="Base currency code (e.g., USD)"
    )
    
    target_currency = models.CharField(
        max_length=10,
        help_text="Target currency code (e.g., BTC, ETH, EUR)"
    )
    
    rate = models.DecimalField(
        max_digits=20,
        decimal_places=8,
        validators=[MinValueValidator(Decimal('0.00000001'))],
        help_text="Exchange rate from base to target currency"
    )
    
    inverse_rate = models.DecimalField(
        max_digits=20,
        decimal_places=8,
        validators=[MinValueValidator(Decimal('0.00000001'))],
        help_text="Inverse exchange rate (target to base)"
    )
    
    source = models.CharField(
        max_length=100,
        default='CoinGecko',
        help_text="Source of exchange rate data"
    )
    
    last_updated = models.DateTimeField(
        auto_now=True,
        help_text="Last time this rate was updated"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments_currency_exchange_rate'
        unique_together = ('base_currency', 'target_currency')
        indexes = [
            models.Index(fields=['base_currency', 'target_currency']),
            models.Index(fields=['last_updated']),
        ]
        verbose_name = 'Currency Exchange Rate'
        verbose_name_plural = 'Currency Exchange Rates'

    def __str__(self):
        return f"{self.base_currency}/{self.target_currency} = {self.rate}"
    
    def save(self, *args, **kwargs):
        """Calculate inverse rate before saving."""
        if self.rate > 0:
            self.inverse_rate = Decimal('1') / self.rate
        super().save(*args, **kwargs)
    
    @classmethod
    def convert_amount(cls, amount, from_currency, to_currency):
        """Convert amount from one currency to another."""
        if from_currency == to_currency:
            return amount
        
        try:
            # Try direct conversion
            rate_obj = cls.objects.get(
                base_currency=from_currency,
                target_currency=to_currency
            )
            return amount * rate_obj.rate
        except cls.DoesNotExist:
            try:
                # Try inverse conversion
                rate_obj = cls.objects.get(
                    base_currency=to_currency,
                    target_currency=from_currency
                )
                return amount * rate_obj.inverse_rate
            except cls.DoesNotExist:
                raise ValueError(f"No exchange rate available for {from_currency} to {to_currency}")


class WalletDeposit(models.Model):
    """
    Wallet deposit tracking for cryptocurrency deposits.
    
    Tracks cryptocurrency deposits to user wallets with transaction
    monitoring and automatic balance updates upon confirmation.
    """
    
    DEPOSIT_STATUS = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the deposit"
    )
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='wallet_deposits',
        help_text="User making the deposit"
    )
    
    wallet_balance = models.ForeignKey(
        WalletBalance,
        on_delete=models.CASCADE,
        related_name='deposits',
        help_text="Wallet balance being credited"
    )
    
    amount = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        validators=[MinValueValidator(Decimal('0.00000001'))],
        help_text="Deposit amount"
    )
    
    transaction_hash = models.CharField(
        max_length=66,
        unique=True,
        help_text="Blockchain transaction hash"
    )
    
    from_address = models.CharField(
        max_length=42,
        help_text="Source wallet address"
    )
    
    to_address = models.CharField(
        max_length=42,
        help_text="Destination wallet address"
    )
    
    block_number = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Block number containing the transaction"
    )
    
    confirmations = models.PositiveIntegerField(
        default=0,
        help_text="Number of block confirmations"
    )
    
    required_confirmations = models.PositiveIntegerField(
        default=12,
        help_text="Required confirmations for completion"
    )
    
    status = models.CharField(
        max_length=20,
        choices=DEPOSIT_STATUS,
        default='pending',
        help_text="Current deposit status"
    )
    
    network_fee = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        default=Decimal('0.00'),
        help_text="Network transaction fee"
    )
    
    detected_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When deposit was first detected"
    )
    
    confirmed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When deposit was confirmed"
    )
    
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When deposit was completed and credited"
    )

    class Meta:
        db_table = 'payments_wallet_deposit'
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['transaction_hash']),
            models.Index(fields=['status', 'detected_at']),
            models.Index(fields=['wallet_balance', 'status']),
        ]
        verbose_name = 'Wallet Deposit'
        verbose_name_plural = 'Wallet Deposits'

    def __str__(self):
        return f"Deposit {self.amount} {self.wallet_balance.currency} to {self.user.email}"
    
    @property
    def is_confirmed(self):
        """Check if deposit has required confirmations."""
        return self.confirmations >= self.required_confirmations


class WalletWithdrawal(models.Model):
    """
    Wallet withdrawal requests and processing.
    
    Handles cryptocurrency withdrawal requests with multi-step approval,
    security checks, and automatic blockchain transaction processing.
    """
    
    WITHDRAWAL_STATUS = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('rejected', 'Rejected'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the withdrawal"
    )
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='wallet_withdrawals',
        help_text="User requesting withdrawal"
    )
    
    wallet_balance = models.ForeignKey(
        WalletBalance,
        on_delete=models.CASCADE,
        related_name='withdrawals',
        help_text="Wallet balance being debited"
    )
    
    amount = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        validators=[MinValueValidator(Decimal('0.00000001'))],
        help_text="Withdrawal amount (excluding fees)"
    )
    
    withdrawal_fee = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        default=Decimal('0.00'),
        help_text="Withdrawal fee charged"
    )
    
    total_amount = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        help_text="Total amount (including fees)"
    )
    
    to_address = models.CharField(
        max_length=42,
        help_text="Destination wallet address"
    )
    
    transaction_hash = models.CharField(
        max_length=66,
        blank=True,
        null=True,
        help_text="Blockchain transaction hash (once processed)"
    )
    
    status = models.CharField(
        max_length=20,
        choices=WITHDRAWAL_STATUS,
        default='pending',
        help_text="Current withdrawal status"
    )
    
    # Security and verification
    two_factor_verified = models.BooleanField(
        default=False,
        help_text="Whether 2FA was verified for this withdrawal"
    )
    
    email_verified = models.BooleanField(
        default=False,
        help_text="Whether email verification was completed"
    )
    
    approval_code = models.CharField(
        max_length=20,
        blank=True,
        help_text="Email approval code"
    )
    
    approved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_withdrawals',
        help_text="Admin user who approved withdrawal (if required)"
    )
    
    # Processing details
    gas_price = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        null=True,
        blank=True,
        help_text="Gas price used for transaction"
    )
    
    gas_used = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Gas used for transaction"
    )
    
    network_fee = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        default=Decimal('0.00'),
        help_text="Network transaction fee paid"
    )
    
    error_message = models.TextField(
        blank=True,
        null=True,
        help_text="Error message if withdrawal failed"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When withdrawal was approved"
    )
    processed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When withdrawal was processed"
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When withdrawal was completed"
    )

    class Meta:
        db_table = 'payments_wallet_withdrawal'
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['transaction_hash']),
            models.Index(fields=['wallet_balance', 'status']),
            models.Index(fields=['approved_by']),
        ]
        verbose_name = 'Wallet Withdrawal'
        verbose_name_plural = 'Wallet Withdrawals'

    def __str__(self):
        return f"Withdrawal {self.amount} {self.wallet_balance.currency} by {self.user.email}"
    
    def save(self, *args, **kwargs):
        """Calculate total amount before saving."""
        if not self.total_amount:
            self.total_amount = self.amount + self.withdrawal_fee
        super().save(*args, **kwargs)
    
    def can_be_processed(self):
        """Check if withdrawal can be processed."""
        return (
            self.status == 'approved' and
            self.two_factor_verified and
            self.email_verified
        )


class QRCodePayment(models.Model):
    """
    QR code payment generation for cryptocurrency deposits.
    
    Generates QR codes for cryptocurrency payments with amount,
    address, and network information for easy mobile wallet scanning.
    """
    
    QR_STATUS = [
        ('active', 'Active'),
        ('used', 'Used'),
        ('expired', 'Expired'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the QR payment"
    )
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='qr_payments',
        help_text="User requesting QR payment"
    )
    
    wallet_balance = models.ForeignKey(
        WalletBalance,
        on_delete=models.CASCADE,
        related_name='qr_payments',
        help_text="Target wallet balance"
    )
    
    amount = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        validators=[MinValueValidator(Decimal('0.00000001'))],
        help_text="Payment amount requested"
    )
    
    wallet_address = models.CharField(
        max_length=42,
        help_text="Deposit address for payment"
    )
    
    qr_code_data = models.TextField(
        help_text="QR code data string (URI format)"
    )
    
    qr_code_image = models.ImageField(
        upload_to='qr_codes/',
        blank=True,
        null=True,
        help_text="Generated QR code image"
    )
    
    status = models.CharField(
        max_length=20,
        choices=QR_STATUS,
        default='active',
        help_text="QR code status"
    )
    
    expires_at = models.DateTimeField(
        help_text="When QR code expires"
    )
    
    used_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When QR code was used for payment"
    )
    
    deposit = models.OneToOneField(
        WalletDeposit,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='qr_payment',
        help_text="Associated deposit (if payment was made)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments_qr_code_payment'
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['wallet_address']),
            models.Index(fields=['status', 'expires_at']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'QR Code Payment'
        verbose_name_plural = 'QR Code Payments'

    def __str__(self):
        return f"QR Payment {self.amount} {self.wallet_balance.currency} for {self.user.email}"
    
    @property
    def is_expired(self):
        """Check if QR code is expired."""
        from django.utils import timezone
        return timezone.now() > self.expires_at
    
    @property
    def is_active(self):
        """Check if QR code is active and usable."""
        return self.status == 'active' and not self.is_expired


class BankTransfer(models.Model):
    """
    Bank Transfer model for handling direct bank transfer payments.

    Stores bank account details and tracks transfer status for payments
    made through traditional banking systems.
    """

    TRANSFER_STATUS_CHOICES = [
        ('initiated', 'Initiated'),
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the bank transfer"
    )

    payment = models.OneToOneField(
        Payment,
        on_delete=models.CASCADE,
        related_name='bank_transfer',
        help_text="Associated payment record"
    )

    # Bank account details
    account_holder_name = models.CharField(
        max_length=255,
        help_text="Name of the account holder"
    )

    account_number = models.CharField(
        max_length=50,
        help_text="Bank account number"
    )

    routing_number = models.CharField(
        max_length=50,
        help_text="Bank routing number"
    )

    bank_name = models.CharField(
        max_length=255,
        help_text="Name of the bank"
    )

    bank_address = models.TextField(
        blank=True,
        help_text="Bank address"
    )

    swift_code = models.CharField(
        max_length=20,
        blank=True,
        help_text="SWIFT code for international transfers"
    )

    # Transfer details
    transfer_reference = models.CharField(
        max_length=100,
        unique=True,
        help_text="Unique reference for the transfer"
    )

    transfer_status = models.CharField(
        max_length=20,
        choices=TRANSFER_STATUS_CHOICES,
        default='initiated',
        help_text="Current status of the bank transfer"
    )

    transfer_instructions = models.TextField(
        blank=True,
        help_text="Special instructions for the transfer"
    )

    estimated_completion_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Estimated completion date for the transfer"
    )

    # Verification and tracking
    bank_reference_number = models.CharField(
        max_length=100,
        blank=True,
        help_text="Reference number provided by the bank"
    )

    verification_documents = models.JSONField(
        default=dict,
        help_text="Document IDs for verification"
    )

    # Investor-uploaded proof of the wire/ACH (screenshot, PDF receipt, etc.)
    # Required before an admin can approve the transfer — without proof we
    # have no record that the funds were actually sent.
    proof_of_transfer = models.FileField(
        upload_to='bank_transfer_proofs/%Y/%m/',
        null=True,
        blank=True,
        help_text="Proof of transfer (image or PDF) uploaded by the investor."
    )

    # Admin-review trail. When an admin marks the transfer approved/rejected
    # we capture WHO did it and WHY for audit + dispute resolution.
    reviewed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bank_transfers_reviewed',
        help_text="Admin user who approved / rejected this transfer."
    )
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the admin reviewed the transfer."
    )
    review_note = models.TextField(
        blank=True,
        help_text="Admin-visible note explaining the approval / rejection."
    )

    processing_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Processing fee for the bank transfer"
    )

    # Timestamps
    initiated_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the transfer was completed"
    )

    # Admin notes
    admin_notes = models.TextField(
        blank=True,
        help_text="Internal notes from admin"
    )

    class Meta:
        db_table = 'payments_bank_transfer'
        indexes = [
            models.Index(fields=['payment', 'transfer_status']),
            models.Index(fields=['transfer_reference']),
            models.Index(fields=['account_number']),
            models.Index(fields=['initiated_at']),
            models.Index(fields=['transfer_status', 'estimated_completion_date']),
        ]
        verbose_name = 'Bank Transfer'
        verbose_name_plural = 'Bank Transfers'

    def __str__(self):
        return f"Bank Transfer {self.transfer_reference} - {self.transfer_status}"

    @property
    def is_completed(self):
        """Check if transfer is completed."""
        return self.transfer_status == 'completed'

    @property
    def is_pending(self):
        """Check if transfer is pending processing."""
        return self.transfer_status in ['initiated', 'pending', 'processing']

    def generate_reference(self):
        """Generate unique cryptographically secure transfer reference."""
        if not self.transfer_reference:
            import secrets
            import string
            chars = string.ascii_uppercase + string.digits
            ref = 'BT' + ''.join(secrets.choice(chars) for _ in range(10))
            self.transfer_reference = ref
            return ref
        return self.transfer_reference

    def estimate_completion(self):
        """Estimate completion date based on current date."""
        from django.utils import timezone
        from datetime import timedelta

        # Standard bank transfer takes 1-3 business days
        self.estimated_completion_date = timezone.now() + timedelta(days=2)
        return self.estimated_completion_date


class NOWPaymentsTransaction(models.Model):
    """
    NOWPayments cryptocurrency payment tracking.

    Tracks cryptocurrency payments processed through NOWPayments gateway
    with support for 150+ cryptocurrencies and automatic status updates.
    """

    PAYMENT_STATUS_CHOICES = [
        ('waiting', 'Waiting'),
        ('confirming', 'Confirming'),
        ('confirmed', 'Confirmed'),
        ('sending', 'Sending'),
        ('partially_paid', 'Partially Paid'),
        ('finished', 'Finished'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
        ('expired', 'Expired'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the NOWPayments transaction"
    )

    payment = models.OneToOneField(
        Payment,
        on_delete=models.CASCADE,
        related_name='nowpayments_transaction',
        help_text="Associated payment record"
    )

    nowpayments_payment_id = models.CharField(
        max_length=255,
        unique=True,
        help_text="NOWPayments payment ID"
    )

    order_id = models.CharField(
        max_length=255,
        help_text="Internal order ID"
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='waiting',
        help_text="NOWPayments payment status"
    )

    pay_address = models.CharField(
        max_length=255,
        help_text="Cryptocurrency address for payment"
    )

    pay_amount = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        help_text="Amount to pay in cryptocurrency"
    )

    pay_currency = models.CharField(
        max_length=10,
        help_text="Cryptocurrency to pay (BTC, ETH, USDT, etc.)"
    )

    price_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Amount in base currency"
    )

    price_currency = models.CharField(
        max_length=10,
        help_text="Base currency (USD, EUR, etc.)"
    )

    order_description = models.TextField(
        blank=True,
        help_text="Order description"
    )

    invoice_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="NOWPayments invoice ID"
    )

    invoice_url = models.URLField(
        blank=True,
        null=True,
        help_text="Invoice payment URL"
    )

    ipn_callback_url = models.URLField(
        blank=True,
        null=True,
        help_text="IPN callback URL"
    )

    actually_paid = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        default=Decimal('0'),
        help_text="Actually paid amount"
    )

    outcome_amount = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        blank=True,
        null=True,
        help_text="Outcome amount"
    )

    outcome_currency = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text="Outcome currency"
    )

    network_fee = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        blank=True,
        null=True,
        help_text="Network transaction fee"
    )

    transaction_hash = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Blockchain transaction hash"
    )

    burning_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Burning percentage"
    )

    expiration_estimate_date = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Payment expiration date"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments_nowpayments_transaction'
        indexes = [
            models.Index(fields=['nowpayments_payment_id']),
            models.Index(fields=['order_id']),
            models.Index(fields=['payment_status']),
            models.Index(fields=['pay_currency']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'NOWPayments Transaction'
        verbose_name_plural = 'NOWPayments Transactions'
        ordering = ['-created_at']

    def __str__(self):
        return f"NOWPayments {self.nowpayments_payment_id} - {self.payment_status}"

    @property
    def is_completed(self):
        """Check if payment is completed."""
        return self.payment_status == 'finished'

    @property
    def is_pending(self):
        """Check if payment is pending."""
        return self.payment_status in ['waiting', 'confirming', 'confirmed', 'sending']

    @property
    def is_failed(self):
        """Check if payment failed."""
        return self.payment_status in ['failed', 'expired']


class NovaSukukPayment(models.Model):
    """Nova Sukuk payment — investor uploads a Sukuk PDF for manual admin review."""

    SUKUK_STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    investment = models.ForeignKey(
        'investments.Investment', on_delete=models.CASCADE,
        related_name='nova_sukuk_payments'
    )
    payment = models.ForeignKey(
        'payments.Payment', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='nova_sukuk_detail'
    )
    sukuk_pdf = models.FileField(upload_to='nova_sukuk_documents/')
    sukuk_reference_number = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=SUKUK_STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='reviewed_sukuk_payments'
    )
    review_note = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"NovaSukuk #{self.sukuk_reference_number} - {self.status}"


class PronovaPayment(models.Model):
    """Pronova crypto payment with automatic 5% discount and on-chain verification."""

    PRONOVA_STATUS_CHOICES = [
        ('pending', 'Pending Payment'),
        ('confirming', 'Confirming on Chain'),
        ('confirmed', 'Confirmed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    investment = models.ForeignKey(
        'investments.Investment', on_delete=models.CASCADE,
        related_name='pronova_payments'
    )
    payment = models.ForeignKey(
        'payments.Payment', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='pronova_detail'
    )
    pronova_amount = models.DecimalField(max_digits=18, decimal_places=8)
    usd_equivalent = models.DecimalField(max_digits=12, decimal_places=2)
    discount_applied = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('5.00'),
        help_text="Discount percentage applied (default 5%)"
    )
    discounted_amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        help_text="USD amount after discount"
    )
    tx_hash = models.CharField(max_length=66, blank=True)
    platform_wallet_address = models.CharField(max_length=42)
    sender_wallet_address = models.CharField(max_length=42, blank=True)
    status = models.CharField(max_length=20, choices=PRONOVA_STATUS_CHOICES, default='pending')
    confirmations = models.PositiveIntegerField(default=0)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Pronova {self.pronova_amount} - {self.status}"


class BankWithdrawalRequest(models.Model):
    """
    Bank withdrawal request from an investor's platform wallet to an
    external bank account.

    The platform debits the investor's wallet balance the moment the
    request is created (status=pending), preventing double-spend.
    Compliance / admin then reviews the request:

      - approve  -> Capimax operator wires the funds out-of-band; the
                    wallet balance has already been debited so the
                    request moves to 'completed' once payment confirms.
      - reject   -> wallet balance is refunded back to the user.

    No third-party payment provider is integrated for outgoing wires —
    the platform team executes the wire manually, then marks the request
    completed in the admin. The user gets an email at each transition.
    """

    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('processing', 'Wire In Progress'),
        ('completed', 'Completed'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='bank_withdrawal_requests',
    )
    amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(Decimal('10.00'))],
        help_text="Withdrawal amount (USD)."
    )
    currency = models.CharField(max_length=3, default='USD')

    # How the payout is delivered. Both methods use the SAME admin-reviewed,
    # manually-executed lifecycle — the crypto address is just data the
    # operator sends the funds to (no automated payout provider).
    WITHDRAWAL_METHOD_CHOICES = [
        ('bank', 'Bank Transfer'),
        ('crypto', 'Cryptocurrency'),
    ]
    withdrawal_method = models.CharField(
        max_length=10, choices=WITHDRAWAL_METHOD_CHOICES, default='bank', db_index=True,
        help_text="Destination type: bank wire or crypto payout.",
    )

    # Destination bank details (method='bank'). Captured verbatim from the
    # investor; no validation beyond presence (banking formats vary by region).
    # Blank for crypto withdrawals.
    account_holder_name = models.CharField(max_length=255, blank=True)
    bank_name = models.CharField(max_length=255, blank=True)
    account_number = models.CharField(max_length=64, blank=True, help_text="IBAN / account number.")
    routing_number = models.CharField(max_length=64, blank=True)
    swift_code = models.CharField(max_length=20, blank=True)
    bank_country = models.CharField(max_length=2, blank=True, help_text="ISO-3166 alpha-2.")

    # Destination crypto details (method='crypto'). Blank for bank withdrawals.
    crypto_asset = models.CharField(
        max_length=20, blank=True,
        help_text="Payout asset, e.g. USDT, BTC, ETH.",
    )
    crypto_network = models.CharField(
        max_length=30, blank=True,
        help_text="Network/chain, e.g. BEP20, TRC20, ERC20, BTC, ETH.",
    )
    crypto_address = models.CharField(
        max_length=255, blank=True,
        help_text="Destination wallet address.",
    )
    crypto_memo = models.CharField(
        max_length=120, blank=True,
        help_text="Optional destination tag/memo for chains that require it.",
    )

    notes = models.TextField(blank=True, help_text="Free-form note from the investor.")

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending',
        db_index=True,
    )

    # Audit trail
    reviewed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bank_withdrawal_reviews',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments_bank_withdrawal_request'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        dest = (
            self.bank_name if self.withdrawal_method == 'bank'
            else f"{self.crypto_asset} ({self.crypto_network})"
        )
        return f"Withdrawal {self.amount} {self.currency} to {dest} ({self.status})"


class PlatformBankAccount(models.Model):
    """
    A receiving bank account the platform owns, shown to investors who pick
    "Bank transfer" as a wallet top-up method.

    Admin-managed (Django admin). Only ``is_active`` accounts are exposed to
    investors. The investor wires funds to one of these accounts, uploads
    proof, and lodges a :class:`BankDepositRequest` which an admin reviews
    and credits. There is no automated bank integration — this is purely the
    set of destinations the platform advertises for manual wires.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    label = models.CharField(
        max_length=100, blank=True,
        help_text="Internal nickname, e.g. 'Primary USD account'.",
    )
    account_holder_name = models.CharField(max_length=255)
    bank_name = models.CharField(max_length=255)
    account_number = models.CharField(max_length=64, help_text="IBAN / account number.")
    routing_number = models.CharField(max_length=64, blank=True, help_text="Routing / sort code.")
    swift_code = models.CharField(max_length=20, blank=True, help_text="SWIFT / BIC.")
    bank_address = models.CharField(max_length=255, blank=True)
    bank_country = models.CharField(max_length=2, blank=True, help_text="ISO-3166 alpha-2.")
    currency = models.CharField(max_length=3, default='USD')
    instructions = models.TextField(
        blank=True,
        help_text=(
            "Shown to the investor, e.g. 'Use your account email as the "
            "transfer reference so we can match your deposit.'"
        ),
    )
    is_active = models.BooleanField(default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments_platform_bank_account'
        ordering = ['-is_active', 'bank_name']

    def __str__(self):
        tag = self.label or self.bank_name
        return f"{tag} ({self.currency})" + ('' if self.is_active else ' [inactive]')


class BankDepositRequest(models.Model):
    """
    Investor-initiated wallet top-up via a manual bank transfer.

    The investor wires funds to one of the platform's
    :class:`PlatformBankAccount` records, uploads proof, and lodges this
    request. An admin then reviews it:

      - approve -> the investor's wallet is credited with ``amount`` through
                   :meth:`WalletBalance.credit` (so a ledger row is written),
                   and the request moves to 'approved'.
      - reject  -> nothing is credited; the request moves to 'rejected'.

    Unlike the card (Stripe) and crypto (NOWPayments) rails, which credit the
    wallet automatically, bank deposits only land after admin approval.
    """

    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved & Credited'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='bank_deposit_requests',
    )
    amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(Decimal('1.00'))],
        help_text="Amount the investor says they transferred (USD).",
    )
    currency = models.CharField(max_length=3, default='USD')

    # Which platform account the investor sent to. Nullable so deactivating or
    # deleting an account later doesn't cascade-delete historical requests.
    platform_bank_account = models.ForeignKey(
        'PlatformBankAccount',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='deposit_requests',
    )

    reference = models.CharField(
        max_length=140, blank=True,
        help_text="Transfer reference the investor used.",
    )
    proof_of_transfer = models.FileField(
        upload_to='wallet_deposits/proofs/%Y/%m/',
        null=True, blank=True,
        help_text="Screenshot / PDF of the bank transfer receipt.",
    )
    notes = models.TextField(blank=True, help_text="Free-form note from the investor.")

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True,
    )

    # Audit trail
    reviewed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='bank_deposit_reviews',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments_bank_deposit_request'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status'], name='pay_bdr_user_status_idx'),
            models.Index(fields=['status', 'created_at'], name='pay_bdr_status_created_idx'),
        ]

    def __str__(self):
        return f"Bank deposit {self.amount} {self.currency} ({self.status})"
