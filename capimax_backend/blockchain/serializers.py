"""
Blockchain API Serializers for Capimax Real Estate Tokenization Platform.

This module provides serializers for blockchain-related models and operations
including smart contracts, transactions, token balances, and rental distributions.
"""

from rest_framework import serializers
from decimal import Decimal
from typing import Dict, List, Optional

from .models import (
    BlockchainNetwork, SmartContract, TokenTransaction, 
    ContractEvent, TokenBalance, RentalDistribution, GasTracker
)
from properties.models import Property
from accounts.models import User


class BlockchainNetworkSerializer(serializers.ModelSerializer):
    """Serializer for blockchain network configuration."""
    
    class Meta:
        model = BlockchainNetwork
        fields = [
            'id', 'name', 'network_type', 'environment', 'chain_id',
            'rpc_url', 'explorer_url', 'native_currency', 'gas_price_gwei',
            'block_confirmation_count', 'is_active', 'supports_eip1559',
            'average_block_time', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Custom representation with additional computed fields."""
        data = super().to_representation(instance)
        data.update({
            'is_mainnet': instance.is_mainnet,
            'block_explorer_tx_url': instance.block_explorer_tx_url,
            'block_explorer_address_url': instance.block_explorer_address_url,
            'display_name': f"{instance.name} ({instance.get_environment_display()})"
        })
        return data


class SmartContractSerializer(serializers.ModelSerializer):
    """Serializer for smart contract registry."""
    
    network_name = serializers.CharField(source='network.name', read_only=True)
    property_title = serializers.CharField(source='property_reference.title', read_only=True)
    deployment_cost_usd = serializers.SerializerMethodField()
    explorer_url = serializers.URLField(read_only=True)
    deployment_tx_url = serializers.URLField(read_only=True)
    
    class Meta:
        model = SmartContract
        fields = [
            'id', 'network', 'network_name', 'property_reference', 'property_title',
            'contract_type', 'contract_address', 'contract_name', 'abi', 'bytecode',
            'source_code', 'compiler_version', 'constructor_args', 'status',
            'deployment_transaction', 'deployer_address', 'deployment_block',
            'deployment_gas_used', 'deployment_cost', 'deployment_cost_usd',
            'is_verified', 'verification_date', 'proxy_implementation', 'is_proxy',
            'admin_addresses', 'metadata', 'explorer_url', 'deployment_tx_url',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'deployment_transaction', 'deployment_block', 'deployment_gas_used',
            'deployment_cost', 'explorer_url', 'deployment_tx_url', 'created_at', 'updated_at'
        ]
    
    def get_deployment_cost_usd(self, obj) -> Optional[float]:
        """Calculate deployment cost in USD if available."""
        if obj.deployment_cost and obj.network.native_currency == 'ETH':
            # In a real implementation, this would fetch current ETH price
            eth_price = 2000  # Placeholder price
            return float(obj.deployment_cost * Decimal(str(eth_price)))
        return None
    
    def to_representation(self, instance):
        """Custom representation with additional computed fields."""
        data = super().to_representation(instance)
        
        # Add contract interaction counts
        data['transaction_count'] = instance.transactions.count()
        data['event_count'] = instance.events.count()
        
        # Truncate bytecode for API response (keep first 100 chars)
        if data.get('bytecode'):
            data['bytecode'] = data['bytecode'][:100] + '...' if len(data['bytecode']) > 100 else data['bytecode']
        
        return data


class SmartContractSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer for smart contract summaries."""
    
    network_name = serializers.CharField(source='network.name', read_only=True)
    property_title = serializers.CharField(source='property_reference.title', read_only=True)
    
    class Meta:
        model = SmartContract
        fields = [
            'id', 'network_name', 'property_title', 'contract_type',
            'contract_address', 'contract_name', 'status', 'is_verified',
            'created_at'
        ]


class TokenTransactionSerializer(serializers.ModelSerializer):
    """Serializer for blockchain token transactions."""
    
    contract_name = serializers.CharField(source='contract.contract_name', read_only=True)
    contract_address = serializers.CharField(source='contract.contract_address', read_only=True)
    network_name = serializers.CharField(source='contract.network.name', read_only=True)
    property_title = serializers.CharField(source='property_reference.title', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    explorer_url = serializers.URLField(read_only=True)
    value_native = serializers.DecimalField(max_digits=20, decimal_places=8, read_only=True)
    is_confirmed = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = TokenTransaction
        fields = [
            'id', 'contract', 'contract_name', 'contract_address', 'network_name',
            'property_reference', 'property_title', 'user', 'user_email',
            'investment_reference', 'transaction_type', 'transaction_hash',
            'from_address', 'to_address', 'token_id', 'token_amount', 'value_wei',
            'value_native', 'gas_limit', 'gas_used', 'gas_price', 'transaction_fee',
            'block_number', 'block_hash', 'transaction_index', 'status',
            'confirmation_count', 'nonce', 'input_data', 'function_signature',
            'decoded_input', 'logs', 'receipt', 'error_message', 'retry_count',
            'replaced_by', 'metadata', 'explorer_url', 'is_confirmed',
            'submitted_at', 'confirmed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'block_number', 'block_hash', 'transaction_index', 'gas_used',
            'receipt', 'confirmation_count', 'error_message', 'confirmed_at',
            'created_at', 'updated_at'
        ]
    
    def to_representation(self, instance):
        """Custom representation with additional computed fields."""
        data = super().to_representation(instance)
        
        # Format gas price in Gwei
        if data.get('gas_price'):
            data['gas_price_gwei'] = float(Decimal(str(data['gas_price'])) / Decimal('10') ** 9)
        
        # Add confirmation status
        data['confirmation_status'] = 'confirmed' if instance.is_confirmed else 'pending'
        
        # Add estimated confirmation time
        if not instance.is_confirmed and instance.contract.network:
            remaining_confirmations = max(0, instance.contract.network.block_confirmation_count - instance.confirmation_count)
            estimated_time = remaining_confirmations * instance.contract.network.average_block_time
            data['estimated_confirmation_time'] = estimated_time
        
        return data


class ContractEventSerializer(serializers.ModelSerializer):
    """Serializer for smart contract events."""
    
    transaction_hash = serializers.CharField(source='transaction.transaction_hash', read_only=True)
    contract_name = serializers.CharField(source='contract.contract_name', read_only=True)
    contract_address = serializers.CharField(source='contract.contract_address', read_only=True)
    
    class Meta:
        model = ContractEvent
        fields = [
            'id', 'transaction', 'transaction_hash', 'contract', 'contract_name',
            'contract_address', 'event_type', 'event_signature', 'log_index',
            'decoded_data', 'raw_data', 'topics', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class TokenBalanceSerializer(serializers.ModelSerializer):
    """Serializer for token balance tracking."""
    
    contract_name = serializers.CharField(source='contract.contract_name', read_only=True)
    contract_address = serializers.CharField(source='contract.contract_address', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    property_title = serializers.CharField(source='property_reference.title', read_only=True)
    property_token_price = serializers.DecimalField(source='property_reference.token_price', max_digits=10, decimal_places=2, read_only=True)
    is_locked = serializers.BooleanField(read_only=True)
    ownership_percentage = serializers.DecimalField(max_digits=7, decimal_places=4, read_only=True)
    
    class Meta:
        model = TokenBalance
        fields = [
            'id', 'contract', 'contract_name', 'contract_address', 'user', 'user_email',
            'property_reference', 'property_title', 'property_token_price',
            'wallet_address', 'token_id', 'balance', 'locked_balance', 'available_balance',
            'lockup_end_time', 'is_locked', 'total_earned_rental', 'last_distribution_claim',
            'ownership_percentage', 'is_installment_investor', 'installments_completed',
            'total_installments', 'last_updated_block', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'last_updated_block', 'created_at', 'updated_at'
        ]
    
    def to_representation(self, instance):
        """Custom representation with additional computed fields."""
        data = super().to_representation(instance)
        
        # Calculate investment value
        if instance.property_reference.token_price:
            data['investment_value'] = float(instance.balance * instance.property_reference.token_price)
        
        # Add installment progress
        if instance.is_installment_investor and instance.total_installments > 0:
            data['installment_progress'] = {
                'completed': instance.installments_completed,
                'total': instance.total_installments,
                'percentage': float((instance.installments_completed / instance.total_installments) * 100)
            }
        
        # Add lockup status
        if instance.is_locked:
            data['lockup_status'] = {
                'locked': True,
                'end_time': instance.lockup_end_time.isoformat() if instance.lockup_end_time else None,
                'remaining_days': (instance.lockup_end_time - timezone.now()).days if instance.lockup_end_time else 0
            }
        else:
            data['lockup_status'] = {'locked': False}
        
        return data


class RentalDistributionSerializer(serializers.ModelSerializer):
    """Serializer for rental income distributions."""
    
    contract_name = serializers.CharField(source='contract.contract_name', read_only=True)
    contract_address = serializers.CharField(source='contract.contract_address', read_only=True)
    property_title = serializers.CharField(source='property_reference.title', read_only=True)
    distribution_transaction_hash = serializers.CharField(source='distribution_transaction.transaction_hash', read_only=True)
    
    class Meta:
        model = RentalDistribution
        fields = [
            'id', 'contract', 'contract_name', 'contract_address',
            'property_reference', 'property_title', 'distribution_transaction',
            'distribution_transaction_hash', 'distribution_id', 'total_amount',
            'net_amount', 'platform_fee', 'eligible_tokens', 'payment_token',
            'payment_token_address', 'distribution_period', 'status',
            'total_claimed', 'claims_processed', 'created_at', 'distributed_at'
        ]
        read_only_fields = [
            'id', 'distribution_transaction_hash', 'created_at', 'distributed_at'
        ]
    
    def to_representation(self, instance):
        """Custom representation with additional computed fields."""
        data = super().to_representation(instance)
        
        # Calculate distribution metrics
        if instance.eligible_tokens > 0:
            data['amount_per_token'] = float(instance.net_amount / instance.eligible_tokens)
        else:
            data['amount_per_token'] = 0
        
        # Calculate claim percentage
        if instance.net_amount > 0:
            claim_percentage = float((instance.total_claimed / instance.net_amount) * 100)
            data['claim_percentage'] = round(claim_percentage, 2)
        else:
            data['claim_percentage'] = 0
        
        # Add unclaimed amount
        data['unclaimed_amount'] = float(instance.net_amount - instance.total_claimed)
        
        # Add platform fee percentage
        if instance.total_amount > 0:
            fee_percentage = float((instance.platform_fee / instance.total_amount) * 100)
            data['platform_fee_percentage'] = round(fee_percentage, 2)
        else:
            data['platform_fee_percentage'] = 0
        
        return data


class GasTrackerSerializer(serializers.ModelSerializer):
    """Serializer for gas price tracking."""
    
    network_name = serializers.CharField(source='network.name', read_only=True)
    
    class Meta:
        model = GasTracker
        fields = [
            'id', 'network', 'network_name', 'slow_gas_price', 'standard_gas_price',
            'fast_gas_price', 'base_fee', 'priority_fee', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']
    
    def to_representation(self, instance):
        """Custom representation with gas prices in Gwei."""
        data = super().to_representation(instance)
        
        # Convert wei to Gwei for better readability
        gwei_divisor = Decimal('10') ** 9
        data['slow_gas_price_gwei'] = float(Decimal(str(data['slow_gas_price'])) / gwei_divisor)
        data['standard_gas_price_gwei'] = float(Decimal(str(data['standard_gas_price'])) / gwei_divisor)
        data['fast_gas_price_gwei'] = float(Decimal(str(data['fast_gas_price'])) / gwei_divisor)
        
        if data.get('base_fee'):
            data['base_fee_gwei'] = float(Decimal(str(data['base_fee'])) / gwei_divisor)
        
        if data.get('priority_fee'):
            data['priority_fee_gwei'] = float(Decimal(str(data['priority_fee'])) / gwei_divisor)
        
        return data


# Specialized serializers for specific operations

class ContractDeploymentRequestSerializer(serializers.Serializer):
    """Serializer for contract deployment requests."""
    
    property_id = serializers.UUIDField()
    network_id = serializers.UUIDField()
    multi_sig_owners = serializers.ListField(
        child=serializers.CharField(max_length=42),
        min_length=2,
        max_length=10
    )
    gas_limit = serializers.IntegerField(required=False, min_value=100000)
    gas_price = serializers.IntegerField(required=False, min_value=1000000000)  # 1 Gwei minimum
    
    def validate_multi_sig_owners(self, value):
        """Validate multi-signature owner addresses."""
        from web3 import Web3

        for address in value:
            if not Web3.is_address(address):
                raise serializers.ValidationError(f"Invalid address: {address}")
        
        # Check for duplicates
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Duplicate addresses in multi-sig owners")
        
        return value
    
    def validate(self, data):
        """Cross-field validation."""
        # Verify property exists
        try:
            property_obj = Property.objects.get(id=data['property_id'])
            data['property'] = property_obj
        except Property.DoesNotExist:
            raise serializers.ValidationError({"property_id": "Property not found"})
        
        # Verify network exists
        try:
            network = BlockchainNetwork.objects.get(id=data['network_id'], is_active=True)
            data['network'] = network
        except BlockchainNetwork.DoesNotExist:
            raise serializers.ValidationError({"network_id": "Network not found or inactive"})
        
        return data


class TokenMintRequestSerializer(serializers.Serializer):
    """Serializer for token minting requests."""
    
    contract_address = serializers.CharField(max_length=42)
    investor_address = serializers.CharField(max_length=42)
    token_amount = serializers.IntegerField(min_value=1)
    is_installment = serializers.BooleanField(default=False)
    total_installments = serializers.IntegerField(required=False, min_value=1, max_value=120)
    
    def validate_contract_address(self, value):
        """Validate contract address exists."""
        from web3 import Web3

        if not Web3.is_address(value):
            raise serializers.ValidationError("Invalid contract address")
        
        try:
            contract = SmartContract.objects.get(
                contract_address__iexact=value,
                status__in=['active', 'deployed']
            )
            return value
        except SmartContract.DoesNotExist:
            raise serializers.ValidationError("Contract not found or not active")
    
    def validate_investor_address(self, value):
        """Validate investor address."""
        from web3 import Web3

        if not Web3.is_address(value):
            raise serializers.ValidationError("Invalid investor address")
        
        return value
    
    def validate(self, data):
        """Cross-field validation."""
        if data.get('is_installment') and not data.get('total_installments'):
            raise serializers.ValidationError({
                "total_installments": "Total installments required for installment payments"
            })
        
        return data


class RentalDistributionRequestSerializer(serializers.Serializer):
    """Serializer for rental income distribution requests."""
    
    property_id = serializers.UUIDField()
    total_amount = serializers.DecimalField(max_digits=20, decimal_places=8, min_value=Decimal('0.00000001'))
    payment_token = serializers.ChoiceField(choices=['ETH', 'USDC', 'USDT', 'DAI'])
    distribution_period = serializers.CharField(max_length=20, help_text="Format: YYYY-MM")
    
    def validate_property_id(self, value):
        """Validate property exists and is ready for rental distributions."""
        try:
            property_obj = Property.objects.get(id=value)
            if not property_obj.is_ready_property:
                raise serializers.ValidationError("Only ready properties can distribute rental income")
            if not property_obj.rental_income_active:
                raise serializers.ValidationError("Rental income not active for this property")
            return value
        except Property.DoesNotExist:
            raise serializers.ValidationError("Property not found")
    
    def validate_distribution_period(self, value):
        """Validate distribution period format."""
        import re
        
        if not re.match(r'^\d{4}-\d{2}$', value):
            raise serializers.ValidationError("Invalid period format. Use YYYY-MM")
        
        return value


class BlockchainStatsSerializer(serializers.Serializer):
    """Serializer for blockchain statistics."""
    
    total_contracts = serializers.IntegerField()
    active_contracts = serializers.IntegerField()
    total_transactions = serializers.IntegerField()
    confirmed_transactions = serializers.IntegerField()
    total_volume = serializers.DecimalField(max_digits=20, decimal_places=8)
    total_gas_used = serializers.IntegerField()
    average_gas_price = serializers.DecimalField(max_digits=15, decimal_places=0)
    
    # Network-specific stats
    network_stats = serializers.DictField(child=serializers.DictField())
    
    # Property-specific stats
    properties_tokenized = serializers.IntegerField()
    total_tokens_minted = serializers.DecimalField(max_digits=30, decimal_places=8)
    active_investors = serializers.IntegerField()
    rental_distributions_count = serializers.IntegerField()
    total_rental_distributed = serializers.DecimalField(max_digits=20, decimal_places=8)


class UserTokenPortfolioSerializer(serializers.Serializer):
    """Serializer for user's complete token portfolio."""
    
    user_id = serializers.UUIDField(read_only=True)
    user_email = serializers.CharField(read_only=True)
    wallet_address = serializers.CharField(read_only=True)
    
    # Portfolio summary
    total_properties = serializers.IntegerField()
    total_tokens = serializers.DecimalField(max_digits=30, decimal_places=8)
    total_investment_value = serializers.DecimalField(max_digits=20, decimal_places=2)
    total_rental_earned = serializers.DecimalField(max_digits=20, decimal_places=8)
    
    # Token holdings
    token_holdings = TokenBalanceSerializer(many=True)
    
    # Recent transactions
    recent_transactions = TokenTransactionSerializer(many=True)
    
    # Available rental claims
    pending_rental_claims = serializers.DecimalField(max_digits=20, decimal_places=8)
    
    class Meta:
        read_only_fields = '__all__'