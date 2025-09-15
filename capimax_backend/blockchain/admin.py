"""
Django Admin Configuration for Blockchain Models.

This module provides comprehensive admin interface for managing blockchain
operations, smart contracts, transactions, and monitoring.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Count, Sum
from django.utils import timezone

from .models import (
    BlockchainNetwork, SmartContract, TokenTransaction, 
    ContractEvent, TokenBalance, RentalDistribution, GasTracker
)


@admin.register(BlockchainNetwork)
class BlockchainNetworkAdmin(admin.ModelAdmin):
    """Admin interface for blockchain networks."""
    
    list_display = [
        'name', 'network_type', 'environment', 'chain_id', 
        'is_active', 'contracts_count', 'created_at'
    ]
    list_filter = ['network_type', 'environment', 'is_active', 'supports_eip1559']
    search_fields = ['name', 'rpc_url']
    readonly_fields = ['created_at', 'updated_at', 'contracts_count', 'transactions_count']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'network_type', 'environment', 'chain_id')
        }),
        ('Connection Settings', {
            'fields': ('rpc_url', 'explorer_url', 'native_currency')
        }),
        ('Network Configuration', {
            'fields': (
                'gas_price_gwei', 'block_confirmation_count', 'supports_eip1559', 
                'average_block_time', 'is_active'
            )
        }),
        ('Statistics', {
            'fields': ('contracts_count', 'transactions_count'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def contracts_count(self, obj):
        """Get number of contracts on this network."""
        return obj.contracts.count()
    contracts_count.short_description = 'Contracts'
    
    def transactions_count(self, obj):
        """Get number of transactions on this network."""
        return TokenTransaction.objects.filter(contract__network=obj).count()
    transactions_count.short_description = 'Transactions'


@admin.register(SmartContract)
class SmartContractAdmin(admin.ModelAdmin):
    """Admin interface for smart contracts."""
    
    list_display = [
        'contract_name', 'contract_type', 'network', 'property_title',
        'status', 'is_verified', 'deployment_cost', 'created_at'
    ]
    list_filter = ['contract_type', 'status', 'is_verified', 'network', 'created_at']
    search_fields = ['contract_name', 'contract_address', 'property_reference__title']
    readonly_fields = [
        'created_at', 'updated_at', 'deployment_transaction', 'deployment_block',
        'deployment_gas_used', 'deployment_cost', 'transactions_count', 'events_count',
        'contract_link', 'deployment_tx_link'
    ]
    
    fieldsets = (
        ('Contract Information', {
            'fields': (
                'contract_name', 'contract_type', 'contract_address', 'network',
                'property_reference', 'status'
            )
        }),
        ('Contract Code', {
            'fields': ('abi', 'bytecode', 'source_code', 'compiler_version'),
            'classes': ('collapse',)
        }),
        ('Deployment Details', {
            'fields': (
                'deployment_transaction', 'deployer_address', 'deployment_block',
                'deployment_gas_used', 'deployment_cost', 'constructor_args'
            )
        }),
        ('Verification', {
            'fields': ('is_verified', 'verification_date')
        }),
        ('Proxy Configuration', {
            'fields': ('is_proxy', 'proxy_implementation'),
            'classes': ('collapse',)
        }),
        ('Administration', {
            'fields': ('admin_addresses', 'metadata'),
            'classes': ('collapse',)
        }),
        ('Statistics', {
            'fields': ('transactions_count', 'events_count'),
            'classes': ('collapse',)
        }),
        ('External Links', {
            'fields': ('contract_link', 'deployment_tx_link'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def property_title(self, obj):
        """Get associated property title."""
        if obj.property_reference:
            return obj.property_reference.title
        return '-'
    property_title.short_description = 'Property'
    
    def transactions_count(self, obj):
        """Get number of transactions for this contract."""
        return obj.transactions.count()
    transactions_count.short_description = 'Transactions'
    
    def events_count(self, obj):
        """Get number of events for this contract."""
        return obj.events.count()
    events_count.short_description = 'Events'
    
    def contract_link(self, obj):
        """Generate block explorer link for contract."""
        if obj.explorer_url:
            return format_html(
                '<a href="{}" target="_blank">View on Explorer</a>',
                obj.explorer_url
            )
        return '-'
    contract_link.short_description = 'Block Explorer'
    
    def deployment_tx_link(self, obj):
        """Generate block explorer link for deployment transaction."""
        if obj.deployment_tx_url:
            return format_html(
                '<a href="{}" target="_blank">View Deployment Tx</a>',
                obj.deployment_tx_url
            )
        return '-'
    deployment_tx_link.short_description = 'Deployment Tx'


@admin.register(TokenTransaction)
class TokenTransactionAdmin(admin.ModelAdmin):
    """Admin interface for token transactions."""
    
    list_display = [
        'transaction_hash_short', 'transaction_type', 'contract_name',
        'user_email', 'token_amount', 'status', 'gas_used', 'submitted_at'
    ]
    list_filter = [
        'transaction_type', 'status', 'contract__network', 'contract__contract_type',
        'submitted_at', 'confirmed_at'
    ]
    search_fields = [
        'transaction_hash', 'from_address', 'to_address', 'user__email',
        'contract__contract_name'
    ]
    readonly_fields = [
        'created_at', 'updated_at', 'submitted_at', 'confirmed_at',
        'block_number', 'gas_used', 'transaction_fee', 'confirmation_count',
        'explorer_link', 'is_confirmed', 'value_native'
    ]
    date_hierarchy = 'submitted_at'
    
    fieldsets = (
        ('Transaction Information', {
            'fields': (
                'transaction_hash', 'transaction_type', 'contract', 'status',
                'from_address', 'to_address'
            )
        }),
        ('Associated Records', {
            'fields': ('property_reference', 'user', 'investment_reference')
        }),
        ('Token Details', {
            'fields': ('token_id', 'token_amount', 'value_wei', 'value_native')
        }),
        ('Gas and Fees', {
            'fields': (
                'gas_limit', 'gas_used', 'gas_price', 'transaction_fee', 'nonce'
            )
        }),
        ('Blockchain Details', {
            'fields': (
                'block_number', 'block_hash', 'transaction_index', 
                'confirmation_count', 'is_confirmed'
            )
        }),
        ('Transaction Data', {
            'fields': ('input_data', 'function_signature', 'decoded_input', 'logs'),
            'classes': ('collapse',)
        }),
        ('Error Handling', {
            'fields': ('error_message', 'retry_count', 'replaced_by'),
            'classes': ('collapse',)
        }),
        ('External Links', {
            'fields': ('explorer_link',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('submitted_at', 'confirmed_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def transaction_hash_short(self, obj):
        """Display shortened transaction hash."""
        return f"{obj.transaction_hash[:10]}...{obj.transaction_hash[-8:]}"
    transaction_hash_short.short_description = 'Tx Hash'
    
    def contract_name(self, obj):
        """Get contract name."""
        return obj.contract.contract_name
    contract_name.short_description = 'Contract'
    
    def user_email(self, obj):
        """Get user email."""
        if obj.user:
            return obj.user.email
        return '-'
    user_email.short_description = 'User'
    
    def explorer_link(self, obj):
        """Generate block explorer link."""
        if obj.explorer_url:
            return format_html(
                '<a href="{}" target="_blank">View on Explorer</a>',
                obj.explorer_url
            )
        return '-'
    explorer_link.short_description = 'Block Explorer'


@admin.register(TokenBalance)
class TokenBalanceAdmin(admin.ModelAdmin):
    """Admin interface for token balances."""
    
    list_display = [
        'user_email', 'property_title', 'balance', 'available_balance',
        'locked_balance', 'is_locked', 'total_earned_rental', 'updated_at'
    ]
    list_filter = [
        'contract__network', 'is_installment_investor', 'lockup_end_time',
        'updated_at'
    ]
    search_fields = [
        'user__email', 'wallet_address', 'property_reference__title',
        'contract__contract_name'
    ]
    readonly_fields = [
        'created_at', 'updated_at', 'ownership_percentage', 'is_locked',
        'investment_value'
    ]
    
    fieldsets = (
        ('Balance Information', {
            'fields': (
                'user', 'contract', 'property_reference', 'wallet_address', 'token_id'
            )
        }),
        ('Token Holdings', {
            'fields': (
                'balance', 'available_balance', 'locked_balance', 'ownership_percentage'
            )
        }),
        ('Lockup Configuration', {
            'fields': ('lockup_end_time', 'is_locked')
        }),
        ('Rental Income', {
            'fields': ('total_earned_rental', 'last_distribution_claim')
        }),
        ('Installment Details', {
            'fields': (
                'is_installment_investor', 'installments_completed', 'total_installments'
            ),
            'classes': ('collapse',)
        }),
        ('Value Calculation', {
            'fields': ('investment_value',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('last_updated_block',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_email(self, obj):
        """Get user email."""
        return obj.user.email
    user_email.short_description = 'User'
    
    def property_title(self, obj):
        """Get property title."""
        return obj.property_reference.title
    property_title.short_description = 'Property'
    
    def investment_value(self, obj):
        """Calculate investment value."""
        if obj.property_reference.token_price:
            value = obj.balance * obj.property_reference.token_price
            return f"${value:,.2f}"
        return '-'
    investment_value.short_description = 'Investment Value'


@admin.register(RentalDistribution)
class RentalDistributionAdmin(admin.ModelAdmin):
    """Admin interface for rental distributions."""
    
    list_display = [
        'property_title', 'distribution_id', 'distribution_period',
        'total_amount', 'net_amount', 'status', 'claims_processed', 'distributed_at'
    ]
    list_filter = [
        'status', 'payment_token', 'contract__network', 'distribution_period',
        'created_at'
    ]
    search_fields = [
        'property_reference__title', 'contract__contract_name',
        'distribution_period'
    ]
    readonly_fields = [
        'created_at', 'distributed_at', 'amount_per_token', 'claim_percentage',
        'unclaimed_amount'
    ]
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Distribution Information', {
            'fields': (
                'contract', 'property_reference', 'distribution_id',
                'distribution_period', 'status'
            )
        }),
        ('Amount Details', {
            'fields': (
                'total_amount', 'platform_fee', 'net_amount', 'eligible_tokens',
                'amount_per_token'
            )
        }),
        ('Payment Configuration', {
            'fields': ('payment_token', 'payment_token_address')
        }),
        ('Distribution Progress', {
            'fields': (
                'total_claimed', 'claims_processed', 'claim_percentage',
                'unclaimed_amount'
            )
        }),
        ('Transaction Reference', {
            'fields': ('distribution_transaction',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'distributed_at'),
            'classes': ('collapse',)
        }),
    )
    
    def property_title(self, obj):
        """Get property title."""
        return obj.property_reference.title
    property_title.short_description = 'Property'
    
    def amount_per_token(self, obj):
        """Calculate amount per token."""
        if obj.eligible_tokens > 0:
            return f"{obj.net_amount / obj.eligible_tokens:.8f}"
        return '0'
    amount_per_token.short_description = 'Per Token'
    
    def claim_percentage(self, obj):
        """Calculate claim percentage."""
        if obj.net_amount > 0:
            percentage = (obj.total_claimed / obj.net_amount) * 100
            return f"{percentage:.1f}%"
        return '0%'
    claim_percentage.short_description = 'Claimed %'
    
    def unclaimed_amount(self, obj):
        """Calculate unclaimed amount."""
        return obj.net_amount - obj.total_claimed
    unclaimed_amount.short_description = 'Unclaimed'


@admin.register(ContractEvent)
class ContractEventAdmin(admin.ModelAdmin):
    """Admin interface for contract events."""
    
    list_display = [
        'event_type', 'contract_name', 'transaction_hash_short',
        'log_index', 'created_at'
    ]
    list_filter = [
        'event_type', 'contract__contract_type', 'contract__network',
        'created_at'
    ]
    search_fields = [
        'event_type', 'contract__contract_name', 'transaction__transaction_hash',
        'event_signature'
    ]
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Event Information', {
            'fields': (
                'event_type', 'event_signature', 'contract', 'transaction', 'log_index'
            )
        }),
        ('Event Data', {
            'fields': ('decoded_data', 'raw_data', 'topics')
        }),
        ('Timestamp', {
            'fields': ('created_at',)
        }),
    )
    
    def contract_name(self, obj):
        """Get contract name."""
        return obj.contract.contract_name
    contract_name.short_description = 'Contract'
    
    def transaction_hash_short(self, obj):
        """Display shortened transaction hash."""
        tx_hash = obj.transaction.transaction_hash
        return f"{tx_hash[:10]}...{tx_hash[-8:]}"
    transaction_hash_short.short_description = 'Tx Hash'


@admin.register(GasTracker)
class GasTrackerAdmin(admin.ModelAdmin):
    """Admin interface for gas tracking."""
    
    list_display = [
        'network', 'standard_gas_price_gwei', 'fast_gas_price_gwei',
        'base_fee_gwei', 'timestamp'
    ]
    list_filter = ['network', 'timestamp']
    readonly_fields = ['timestamp', 'gas_prices_gwei']
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Network Information', {
            'fields': ('network', 'timestamp')
        }),
        ('Gas Prices (Wei)', {
            'fields': ('slow_gas_price', 'standard_gas_price', 'fast_gas_price')
        }),
        ('EIP-1559 Prices', {
            'fields': ('base_fee', 'priority_fee'),
            'classes': ('collapse',)
        }),
        ('Gas Prices (Gwei)', {
            'fields': ('gas_prices_gwei',),
            'classes': ('collapse',)
        }),
    )
    
    def standard_gas_price_gwei(self, obj):
        """Display standard gas price in Gwei."""
        return f"{obj.standard_gas_price / 10**9:.2f}"
    standard_gas_price_gwei.short_description = 'Standard (Gwei)'
    
    def fast_gas_price_gwei(self, obj):
        """Display fast gas price in Gwei."""
        return f"{obj.fast_gas_price / 10**9:.2f}"
    fast_gas_price_gwei.short_description = 'Fast (Gwei)'
    
    def base_fee_gwei(self, obj):
        """Display base fee in Gwei."""
        if obj.base_fee:
            return f"{obj.base_fee / 10**9:.2f}"
        return '-'
    base_fee_gwei.short_description = 'Base Fee (Gwei)'
    
    def gas_prices_gwei(self, obj):
        """Display all gas prices in Gwei format."""
        gwei_divisor = 10**9
        slow = obj.slow_gas_price / gwei_divisor
        standard = obj.standard_gas_price / gwei_divisor
        fast = obj.fast_gas_price / gwei_divisor
        
        return format_html(
            'Slow: {:.2f} | Standard: {:.2f} | Fast: {:.2f}',
            slow, standard, fast
        )
    gas_prices_gwei.short_description = 'Gas Prices (Gwei)'
