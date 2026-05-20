"""
Blockchain Models for Capimax Real Estate Tokenization Platform.

This module contains models for blockchain integration, smart contract management,
transaction monitoring, and Web3 interaction including token management and
rental income distribution tracking.
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
import uuid
import json


class BlockchainNetwork(models.Model):
    """
    Blockchain network configuration and settings.
    
    Supports multiple blockchain networks for property tokenization
    including Ethereum, Polygon, BNB Smart Chain, etc.
    """
    
    NETWORK_TYPES = [
        ('ethereum', 'Ethereum'),
        ('polygon', 'Polygon'),
        ('bsc', 'BNB Smart Chain'),
        ('avalanche', 'Avalanche'),
        ('arbitrum', 'Arbitrum'),
        ('optimism', 'Optimism'),
    ]
    
    ENVIRONMENTS = [
        ('mainnet', 'Mainnet'),
        ('testnet', 'Testnet'),
        ('devnet', 'Development'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the blockchain network"
    )
    
    name = models.CharField(
        max_length=100,
        help_text="Network name (e.g., Ethereum Mainnet)"
    )
    
    network_type = models.CharField(
        max_length=20,
        choices=NETWORK_TYPES,
        help_text="Type of blockchain network"
    )
    
    environment = models.CharField(
        max_length=20,
        choices=ENVIRONMENTS,
        default='testnet',
        help_text="Network environment"
    )
    
    chain_id = models.PositiveIntegerField(
        unique=True,
        help_text="Blockchain network chain ID"
    )
    
    rpc_url = models.URLField(
        help_text="Primary RPC endpoint URL for blockchain interaction"
    )

    backup_rpc_urls = models.JSONField(
        default=list,
        blank=True,
        help_text="List of backup RPC endpoint URLs for failover (e.g., ['https://backup1.com', 'https://backup2.com'])"
    )

    explorer_url = models.URLField(
        blank=True,
        null=True,
        help_text="Block explorer URL for transaction viewing"
    )
    
    native_currency = models.CharField(
        max_length=10,
        default='ETH',
        help_text="Native currency symbol (e.g., ETH, MATIC, BNB)"
    )
    
    gas_price_gwei = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Default gas price in Gwei"
    )
    
    block_confirmation_count = models.PositiveIntegerField(
        default=12,
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text="Required block confirmations for transaction finality"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this network is active for deployments"
    )
    
    supports_eip1559 = models.BooleanField(
        default=True,
        help_text="Whether network supports EIP-1559 gas pricing"
    )
    
    average_block_time = models.PositiveIntegerField(
        default=15,
        help_text="Average block time in seconds"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'blockchain_network'
        indexes = [
            models.Index(fields=['network_type', 'environment']),
            models.Index(fields=['chain_id']),
            models.Index(fields=['is_active']),
        ]
        unique_together = ('network_type', 'environment')
        verbose_name = 'Blockchain Network'
        verbose_name_plural = 'Blockchain Networks'

    def __str__(self):
        return f"{self.name} ({self.get_environment_display()})"
    
    @property
    def is_mainnet(self):
        """Check if this is a mainnet network."""
        return self.environment == 'mainnet'
    
    @property
    def block_explorer_tx_url(self):
        """Get transaction URL template for block explorer."""
        if self.explorer_url:
            return f"{self.explorer_url.rstrip('/')}/tx/{{tx_hash}}"
        return None
    
    @property
    def block_explorer_address_url(self):
        """Get address URL template for block explorer."""
        if self.explorer_url:
            return f"{self.explorer_url.rstrip('/')}/address/{{address}}"
        return None


class SmartContract(models.Model):
    """
    Smart contract registry and management.
    
    Tracks deployed smart contracts for property tokenization,
    rental distribution, and other platform functions.
    """
    
    CONTRACT_TYPES = [
        ('real_estate_token', 'Real Estate Token'),
        ('rental_distributor', 'Rental Income Distributor'),
        ('property_factory', 'Property Contract Factory'),
        ('governance', 'Governance Contract'),
        ('staking', 'Staking Contract'),
        ('marketplace', 'NFT Marketplace'),
    ]
    
    CONTRACT_STATUS = [
        ('deployed', 'Deployed'),
        ('verified', 'Verified'),
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('deprecated', 'Deprecated'),
        ('upgraded', 'Upgraded'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the smart contract"
    )
    
    network = models.ForeignKey(
        BlockchainNetwork,
        on_delete=models.CASCADE,
        related_name='contracts',
        help_text="Blockchain network where contract is deployed"
    )
    
    property_reference = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='blockchain_contracts',
        help_text="Associated property (if applicable)"
    )
    
    contract_type = models.CharField(
        max_length=30,
        choices=CONTRACT_TYPES,
        help_text="Type of smart contract"
    )
    
    contract_address = models.CharField(
        max_length=42,  # Ethereum address length
        db_index=True,
        help_text="Blockchain address of the deployed contract"
    )
    
    contract_name = models.CharField(
        max_length=100,
        help_text="Human-readable name of the contract"
    )
    
    abi = models.JSONField(
        help_text="Contract ABI (Application Binary Interface)"
    )
    
    bytecode = models.TextField(
        blank=True,
        null=True,
        help_text="Contract bytecode for verification"
    )
    
    source_code = models.TextField(
        blank=True,
        null=True,
        help_text="Contract source code"
    )
    
    compiler_version = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Solidity compiler version used"
    )
    
    constructor_args = models.JSONField(
        default=dict,
        help_text="Constructor arguments used during deployment"
    )
    
    status = models.CharField(
        max_length=20,
        choices=CONTRACT_STATUS,
        default='deployed',
        help_text="Current status of the contract"
    )
    
    deployment_transaction = models.CharField(
        max_length=66,  # Transaction hash length
        blank=True,
        null=True,
        help_text="Transaction hash of contract deployment"
    )
    
    deployer_address = models.CharField(
        max_length=42,
        default='0x0000000000000000000000000000000000000000',
        help_text="Address that deployed this contract"
    )
    
    deployment_block = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Block number where contract was deployed"
    )
    
    deployment_gas_used = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Gas used for contract deployment"
    )
    
    deployment_cost = models.DecimalField(
        max_digits=20,
        decimal_places=8,
        null=True,
        blank=True,
        help_text="Deployment cost in native currency"
    )
    
    is_verified = models.BooleanField(
        default=False,
        help_text="Whether contract is verified on block explorer"
    )
    
    verification_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date when contract was verified"
    )
    
    proxy_implementation = models.CharField(
        max_length=42,
        blank=True,
        null=True,
        help_text="Implementation contract address (for proxy contracts)"
    )
    
    is_proxy = models.BooleanField(
        default=False,
        help_text="Whether this is a proxy contract"
    )
    
    admin_addresses = models.JSONField(
        default=list,
        help_text="List of admin addresses for the contract"
    )
    
    metadata = models.JSONField(
        default=dict,
        help_text="Additional contract metadata and configuration"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'blockchain_smart_contract'
        indexes = [
            models.Index(fields=['network', 'contract_type']),
            models.Index(fields=['contract_address']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['property_reference']),
        ]
        unique_together = ('network', 'contract_address')
        verbose_name = 'Smart Contract'
        verbose_name_plural = 'Smart Contracts'

    def __str__(self):
        return f"{self.contract_name} on {self.network.name}"
    
    @property
    def explorer_url(self):
        """Get block explorer URL for this contract."""
        if self.network.block_explorer_address_url:
            return self.network.block_explorer_address_url.format(address=self.contract_address)
        return None
    
    @property
    def deployment_tx_url(self):
        """Get block explorer URL for deployment transaction."""
        if self.deployment_transaction and self.network.block_explorer_tx_url:
            return self.network.block_explorer_tx_url.format(tx_hash=self.deployment_transaction)
        return None
    
    def get_abi_for_function(self, function_name):
        """Get ABI for a specific function."""
        if not self.abi:
            return None
        
        for item in self.abi:
            if item.get('type') == 'function' and item.get('name') == function_name:
                return item
        return None


class TokenTransaction(models.Model):
    """
    Blockchain transaction tracking for token operations.
    
    Tracks all blockchain transactions related to property tokens,
    including minting, burning, transfers, and rental distributions.
    """
    
    TRANSACTION_TYPES = [
        ('mint', 'Token Mint'),
        ('burn', 'Token Burn'),
        ('transfer', 'Token Transfer'),
        ('rental_distribution', 'Rental Distribution'),
        ('installment_payment', 'Installment Payment'),
        ('early_exit', 'Early Exit'),
        ('governance', 'Governance'),
        ('staking', 'Staking'),
        ('other', 'Other'),
    ]
    
    TRANSACTION_STATUS = [
        ('pending', 'Pending'),
        ('submitted', 'Submitted'),
        ('confirmed', 'Confirmed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('replaced', 'Replaced'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the transaction record"
    )
    
    contract = models.ForeignKey(
        SmartContract,
        on_delete=models.CASCADE,
        related_name='transactions',
        help_text="Smart contract involved in this transaction"
    )
    
    property_reference = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='blockchain_transactions',
        help_text="Associated property (if applicable)"
    )
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='blockchain_transactions',
        help_text="User associated with this transaction"
    )
    
    investment_reference = models.ForeignKey(
        'investments.Investment',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='blockchain_transactions',
        help_text="Associated investment (if applicable)"
    )
    
    transaction_type = models.CharField(
        max_length=30,
        choices=TRANSACTION_TYPES,
        help_text="Type of blockchain transaction"
    )
    
    transaction_hash = models.CharField(
        max_length=66,  # Transaction hash length
        unique=True,
        db_index=True,
        help_text="Blockchain transaction hash"
    )
    
    from_address = models.CharField(
        max_length=42,
        help_text="Transaction sender address"
    )
    
    to_address = models.CharField(
        max_length=42,
        help_text="Transaction recipient address"
    )
    
    token_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Token ID (for ERC-1155 tokens)"
    )
    
    token_amount = models.DecimalField(
        max_digits=30,
        decimal_places=8,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00000001'))],
        help_text="Number of tokens involved in transaction"
    )
    
    value_wei = models.DecimalField(
        max_digits=30,
        decimal_places=0,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Transaction value in wei"
    )
    
    gas_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Gas limit for the transaction"
    )
    
    gas_used = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Actual gas used by the transaction"
    )
    
    gas_price = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        null=True,
        blank=True,
        help_text="Gas price in wei"
    )
    
    transaction_fee = models.DecimalField(
        max_digits=20,
        decimal_places=8,
        null=True,
        blank=True,
        help_text="Total transaction fee in native currency"
    )
    
    block_number = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Block number where transaction was included"
    )
    
    block_hash = models.CharField(
        max_length=66,
        blank=True,
        null=True,
        help_text="Hash of block containing this transaction"
    )
    
    transaction_index = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Transaction index within the block"
    )
    
    status = models.CharField(
        max_length=20,
        choices=TRANSACTION_STATUS,
        default='pending',
        help_text="Current status of the transaction"
    )
    
    confirmation_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of block confirmations"
    )
    
    nonce = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Transaction nonce"
    )
    
    input_data = models.TextField(
        blank=True,
        null=True,
        help_text="Transaction input data"
    )
    
    function_signature = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text="Function signature (first 4 bytes of input data)"
    )
    
    decoded_input = models.JSONField(
        null=True,
        blank=True,
        help_text="Decoded transaction input data"
    )
    
    logs = models.JSONField(
        default=list,
        help_text="Transaction event logs"
    )
    
    receipt = models.JSONField(
        null=True,
        blank=True,
        help_text="Full transaction receipt"
    )
    
    error_message = models.TextField(
        blank=True,
        null=True,
        help_text="Error message if transaction failed"
    )
    
    retry_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of times transaction was retried"
    )
    
    replaced_by = models.CharField(
        max_length=66,
        blank=True,
        null=True,
        help_text="Transaction hash that replaced this one"
    )
    
    metadata = models.JSONField(
        default=dict,
        help_text="Additional transaction metadata"
    )
    
    submitted_at = models.DateTimeField(
        default=timezone.now,
        help_text="When transaction was submitted to blockchain"
    )
    
    confirmed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When transaction was confirmed on blockchain"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'blockchain_token_transaction'
        indexes = [
            models.Index(fields=['contract', 'transaction_type']),
            models.Index(fields=['transaction_hash']),
            models.Index(fields=['status', 'submitted_at']),
            models.Index(fields=['user', 'transaction_type']),
            models.Index(fields=['property_reference', 'transaction_type']),
            models.Index(fields=['block_number']),
            models.Index(fields=['confirmation_count']),
        ]
        verbose_name = 'Token Transaction'
        verbose_name_plural = 'Token Transactions'

    def __str__(self):
        return f"{self.get_transaction_type_display()} - {self.transaction_hash[:10]}..."
    
    @property
    def explorer_url(self):
        """Get block explorer URL for this transaction."""
        if self.contract.network.block_explorer_tx_url:
            return self.contract.network.block_explorer_tx_url.format(tx_hash=self.transaction_hash)
        return None
    
    @property
    def is_confirmed(self):
        """Check if transaction has enough confirmations."""
        required_confirmations = self.contract.network.block_confirmation_count
        return self.confirmation_count >= required_confirmations
    
    @property
    def value_native(self):
        """Get transaction value in native currency (e.g., ETH)."""
        if self.value_wei:
            return self.value_wei / Decimal('10') ** 18
        return Decimal('0')
    
    def update_confirmation_count(self, current_block):
        """Update confirmation count based on current block number."""
        if self.block_number and current_block >= self.block_number:
            self.confirmation_count = current_block - self.block_number + 1
            self.save(update_fields=['confirmation_count'])


class ContractEvent(models.Model):
    """
    Smart contract event tracking and decoding.
    
    Tracks and decodes events emitted by property smart contracts
    for real-time monitoring and analytics.
    """
    
    EVENT_TYPES = [
        ('PropertyCreated', 'Property Created'),
        ('TokensMinted', 'Tokens Minted'),
        ('TokensBurned', 'Tokens Burned'),
        ('Transfer', 'Token Transfer'),
        ('RentalIncomeDistributed', 'Rental Income Distributed'),
        ('RentalIncomeClaimed', 'Rental Income Claimed'),
        ('EarlyExit', 'Early Exit'),
        ('InstallmentPaid', 'Installment Paid'),
        ('TokensGraduated', 'Tokens Graduated'),
        ('PropertyActivated', 'Property Activated'),
        ('Other', 'Other Event'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the event"
    )
    
    transaction = models.ForeignKey(
        TokenTransaction,
        on_delete=models.CASCADE,
        related_name='events',
        help_text="Transaction that emitted this event"
    )
    
    contract = models.ForeignKey(
        SmartContract,
        on_delete=models.CASCADE,
        related_name='events',
        help_text="Contract that emitted this event"
    )
    
    event_type = models.CharField(
        max_length=50,
        choices=EVENT_TYPES,
        help_text="Type of event emitted"
    )
    
    event_signature = models.CharField(
        max_length=66,
        help_text="Event signature hash"
    )
    
    log_index = models.PositiveIntegerField(
        help_text="Index of this log in the transaction"
    )
    
    decoded_data = models.JSONField(
        default=dict,
        help_text="Decoded event data"
    )
    
    raw_data = models.JSONField(
        default=dict,
        help_text="Raw event log data"
    )
    
    topics = models.JSONField(
        default=list,
        help_text="Event topics array"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'blockchain_contract_event'
        indexes = [
            models.Index(fields=['transaction', 'log_index']),
            models.Index(fields=['contract', 'event_type']),
            models.Index(fields=['event_signature']),
            models.Index(fields=['created_at']),
        ]
        unique_together = ('transaction', 'log_index')
        verbose_name = 'Contract Event'
        verbose_name_plural = 'Contract Events'

    def __str__(self):
        return f"{self.event_type} - {self.transaction.transaction_hash[:10]}..."


class RentalDistribution(models.Model):
    """
    Rental income distribution tracking on blockchain.
    
    Tracks rental income distributions processed through
    smart contracts for ready properties.
    """
    
    DISTRIBUTION_STATUS = [
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
        help_text="Unique identifier for the distribution"
    )
    
    contract = models.ForeignKey(
        SmartContract,
        on_delete=models.CASCADE,
        related_name='rental_distributions',
        help_text="Rental distributor contract"
    )
    
    property_reference = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        related_name='blockchain_distributions',
        help_text="Property for which income is distributed"
    )
    
    distribution_transaction = models.ForeignKey(
        TokenTransaction,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='rental_distributions',
        help_text="Blockchain transaction for this distribution"
    )
    
    distribution_id = models.PositiveIntegerField(
        help_text="Distribution ID on the smart contract"
    )
    
    total_amount = models.DecimalField(
        max_digits=20,
        decimal_places=8,
        validators=[MinValueValidator(Decimal('0.00000001'))],
        help_text="Total distribution amount"
    )
    
    net_amount = models.DecimalField(
        max_digits=20,
        decimal_places=8,
        validators=[MinValueValidator(Decimal('0.00000001'))],
        help_text="Net amount after platform fees"
    )
    
    platform_fee = models.DecimalField(
        max_digits=20,
        decimal_places=8,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Platform fee deducted"
    )
    
    eligible_tokens = models.PositiveIntegerField(
        help_text="Number of tokens eligible for distribution"
    )
    
    payment_token = models.CharField(
        max_length=10,
        default='ETH',
        help_text="Token used for payment (ETH, USDC, etc.)"
    )
    
    payment_token_address = models.CharField(
        max_length=42,
        blank=True,
        null=True,
        help_text="Address of payment token contract (null for ETH)"
    )
    
    distribution_period = models.CharField(
        max_length=20,
        help_text="Distribution period (e.g., '2024-01')"
    )
    
    status = models.CharField(
        max_length=20,
        choices=DISTRIBUTION_STATUS,
        default='pending',
        help_text="Current status of the distribution"
    )
    
    total_claimed = models.DecimalField(
        max_digits=20,
        decimal_places=8,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Total amount claimed by investors"
    )
    
    claims_processed = models.PositiveIntegerField(
        default=0,
        help_text="Number of claims processed"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    distributed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When distribution was processed on blockchain"
    )

    class Meta:
        db_table = 'blockchain_rental_distribution'
        indexes = [
            models.Index(fields=['property_reference', 'distribution_period']),
            models.Index(fields=['contract', 'distribution_id']),
            models.Index(fields=['status', 'created_at']),
        ]
        unique_together = ('contract', 'property_reference', 'distribution_id')
        verbose_name = 'Rental Distribution'
        verbose_name_plural = 'Rental Distributions'

    def __str__(self):
        return f"Distribution {self.distribution_id} for {self.property_reference.title}"


class TokenBalance(models.Model):
    """
    Real-time token balance tracking for investors.
    
    Tracks token balances across all properties for each investor,
    updated through blockchain event monitoring.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the balance record"
    )
    
    contract = models.ForeignKey(
        SmartContract,
        on_delete=models.CASCADE,
        related_name='token_balances',
        help_text="Token contract"
    )
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='token_balances',
        help_text="Token holder"
    )
    
    property_reference = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        related_name='token_balances',
        help_text="Property associated with tokens"
    )
    
    wallet_address = models.CharField(
        max_length=42,
        help_text="Wallet address holding the tokens"
    )
    
    token_id = models.PositiveIntegerField(
        help_text="Token ID (for ERC-1155 tokens)"
    )
    
    balance = models.DecimalField(
        max_digits=30,
        decimal_places=8,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Current token balance"
    )
    
    locked_balance = models.DecimalField(
        max_digits=30,
        decimal_places=8,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Locked token balance (during lockup period)"
    )
    
    available_balance = models.DecimalField(
        max_digits=30,
        decimal_places=8,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Available token balance (transferable)"
    )
    
    lockup_end_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When token lockup period ends"
    )
    
    total_earned_rental = models.DecimalField(
        max_digits=20,
        decimal_places=8,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Total rental income earned from these tokens"
    )
    
    last_distribution_claim = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time rental distribution was claimed"
    )
    
    is_installment_investor = models.BooleanField(
        default=False,
        help_text="Whether this is an installment investment"
    )
    
    installments_completed = models.PositiveIntegerField(
        default=0,
        help_text="Number of installments completed"
    )
    
    total_installments = models.PositiveIntegerField(
        default=0,
        help_text="Total number of installments"
    )
    
    last_updated_block = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Last block number when balance was updated"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'blockchain_token_balance'
        indexes = [
            models.Index(fields=['user', 'contract']),
            models.Index(fields=['wallet_address', 'token_id']),
            models.Index(fields=['property_reference', 'user']),
            models.Index(fields=['lockup_end_time']),
        ]
        unique_together = ('contract', 'user', 'property_reference', 'token_id', 'wallet_address')
        verbose_name = 'Token Balance'
        verbose_name_plural = 'Token Balances'

    def __str__(self):
        return f"{self.user.email} - {self.balance} tokens of {self.property_reference.title}"
    
    @property
    def is_locked(self):
        """Check if tokens are currently locked."""
        if self.lockup_end_time:
            return timezone.now() < self.lockup_end_time
        return False
    
    @property
    def ownership_percentage(self):
        """Calculate ownership percentage in the property."""
        if self.property_reference.total_tokens == 0:
            return Decimal('0.00')
        percentage = (self.balance / Decimal(self.property_reference.total_tokens)) * 100
        return percentage.quantize(Decimal('0.0001'))
    
    def update_available_balance(self):
        """Update available balance based on lockup status."""
        if self.is_locked:
            self.available_balance = Decimal('0')
            self.locked_balance = self.balance
        else:
            self.available_balance = self.balance
            self.locked_balance = Decimal('0')
        self.save(update_fields=['available_balance', 'locked_balance'])


class GasTracker(models.Model):
    """
    Gas price tracking and optimization for blockchain transactions.
    
    Tracks gas prices across different networks to optimize
    transaction costs and timing.
    """
    
    network = models.ForeignKey(
        BlockchainNetwork,
        on_delete=models.CASCADE,
        related_name='gas_prices',
        help_text="Blockchain network"
    )
    
    slow_gas_price = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        help_text="Slow gas price in wei"
    )
    
    standard_gas_price = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        help_text="Standard gas price in wei"
    )
    
    fast_gas_price = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        help_text="Fast gas price in wei"
    )
    
    base_fee = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        null=True,
        blank=True,
        help_text="Base fee (for EIP-1559 networks)"
    )
    
    priority_fee = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        null=True,
        blank=True,
        help_text="Priority fee (for EIP-1559 networks)"
    )
    
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'blockchain_gas_tracker'
        indexes = [
            models.Index(fields=['network', 'timestamp']),
        ]
        ordering = ['-timestamp']
        verbose_name = 'Gas Tracker'
        verbose_name_plural = 'Gas Trackers'

    def __str__(self):
        return f"{self.network.name} - {self.standard_gas_price} gwei"
