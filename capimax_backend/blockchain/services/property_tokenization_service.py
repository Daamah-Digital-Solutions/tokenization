"""
Property Tokenization Integration Service for Capimax Platform.

This service integrates the blockchain smart contracts with the existing
Property and Investment models to enable complete tokenization functionality.
"""

import logging
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
import json
from datetime import datetime, timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.core.cache import cache

from ..models import (
    BlockchainNetwork, SmartContract, TokenTransaction,
    TokenBalance, RentalDistribution
)
from .web3_service import Web3Service
from .contract_deployment import ContractDeploymentService
from properties.models import Property, PropertyCategory
from investments.models import Investment, InvestmentStatus
from payments.models import Payment, PaymentStatus


logger = logging.getLogger(__name__)


class PropertyTokenizationService:
    """
    Service that bridges the gap between traditional property/investment 
    models and blockchain tokenization functionality.
    """
    
    def __init__(self, network_id: str = None):
        self.network_id = network_id or self._get_default_network_id()
        self.web3_service = Web3Service(self.network_id)
        self.deployment_service = ContractDeploymentService(self.network_id)
    
    def _get_default_network_id(self) -> str:
        """Get default network ID (BSC testnet for development)."""
        try:
            network = BlockchainNetwork.objects.filter(
                network_type='bsc',
                environment='testnet',
                is_active=True
            ).first()
            if network:
                return str(network.id)
            
            # Fall back to any active network
            network = BlockchainNetwork.objects.filter(is_active=True).first()
            return str(network.id) if network else None
        except Exception:
            return None
    
    def tokenize_property(
        self,
        property_id: str,
        total_tokens: int,
        token_price: Decimal,
        lockup_period_days: int = 365,
        early_exit_fee_rate: int = 1000,  # 10% in basis points
        rental_yield_rate: int = 500,  # 5% in basis points
        multi_sig_owners: List[str] = None
    ) -> Dict:
        """
        Tokenize a property by deploying smart contracts and creating tokens.
        
        Args:
            property_id: Property UUID
            total_tokens: Total number of tokens to create
            token_price: Price per token in platform currency
            lockup_period_days: Token lockup period in days
            early_exit_fee_rate: Early exit fee rate in basis points
            rental_yield_rate: Expected rental yield rate in basis points
            multi_sig_owners: List of multi-signature wallet addresses
        
        Returns:
            Dictionary with deployment results and token information
        """
        try:
            property_obj = Property.objects.get(id=property_id)
            
            # Validate property can be tokenized
            if hasattr(property_obj, 'smart_contract_address') and property_obj.smart_contract_address:
                return {
                    'success': False,
                    'error': 'Property is already tokenized'
                }
            
            # Set default multi-sig owners if not provided
            if not multi_sig_owners:
                multi_sig_owners = [
                    property_obj.owner.wallet_address if hasattr(property_obj.owner, 'wallet_address') else None,
                    settings.PLATFORM_TREASURY_ADDRESS,
                    settings.BACKUP_MULTISIG_ADDRESS
                ]
                multi_sig_owners = [addr for addr in multi_sig_owners if addr]
            
            logger.info(f"Starting tokenization for property: {property_obj.title}")
            
            # Deploy smart contracts
            deployment_result = self.deployment_service.deploy_property_contracts(
                property_id=property_id,
                multi_sig_owners=multi_sig_owners,
                gas_settings={
                    'gas_limit': 5000000,  # Higher limit for contract deployment
                    'gas_price': None  # Use optimal gas price
                }
            )
            
            if not deployment_result.get('token_contract'):
                return {
                    'success': False,
                    'error': 'Failed to deploy token contract'
                }
            
            token_contract = deployment_result['token_contract']
            
            # Create property token within the contract
            token_creation_result = self._create_property_token(
                token_contract=token_contract,
                property_obj=property_obj,
                total_tokens=total_tokens,
                token_price=token_price,
                lockup_period_days=lockup_period_days,
                early_exit_fee_rate=early_exit_fee_rate,
                rental_yield_rate=rental_yield_rate
            )
            
            if not token_creation_result['success']:
                return token_creation_result
            
            # Update property with tokenization information
            with transaction.atomic():
                property_obj.smart_contract_address = token_contract.contract_address
                property_obj.total_tokens = total_tokens
                property_obj.token_price = token_price
                property_obj.is_tokenized = True
                property_obj.tokenization_date = timezone.now()
                property_obj.save(update_fields=[
                    'smart_contract_address', 'total_tokens', 'token_price',
                    'is_tokenized', 'tokenization_date'
                ])
            
            # Set up rental income distribution for ready properties
            distributor_contract = deployment_result.get('distributor_contract')
            if distributor_contract and property_obj.property_category == PropertyCategory.READY_PROPERTY:
                self._setup_rental_distribution(property_obj, distributor_contract)
            
            logger.info(f"Successfully tokenized property: {property_obj.title}")
            
            return {
                'success': True,
                'data': {
                    'token_contract_address': token_contract.contract_address,
                    'distributor_contract_address': distributor_contract.contract_address if distributor_contract else None,
                    'property_token_id': token_creation_result.get('token_id', 0),
                    'total_tokens': total_tokens,
                    'token_price': str(token_price),
                    'deployment_tx': token_contract.deployment_transaction,
                    'gas_used': token_contract.deployment_gas_used,
                    'deployment_cost': str(token_contract.deployment_cost) if token_contract.deployment_cost else None
                }
            }
            
        except Property.DoesNotExist:
            logger.error(f"Property {property_id} not found")
            return {'success': False, 'error': 'Property not found'}
        except Exception as e:
            logger.error(f"Error tokenizing property {property_id}: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _create_property_token(
        self,
        token_contract: SmartContract,
        property_obj: Property,
        total_tokens: int,
        token_price: Decimal,
        lockup_period_days: int,
        early_exit_fee_rate: int,
        rental_yield_rate: int
    ) -> Dict:
        """Create a property token within the deployed contract."""
        try:
            # Convert parameters for smart contract
            lockup_period_seconds = lockup_period_days * 24 * 60 * 60
            token_price_wei = int(token_price * (10 ** 18))  # Convert to wei
            
            # Determine property category
            category = 0 if property_obj.property_category == PropertyCategory.UNDER_CONSTRUCTION else 1
            
            # Call createProperty function on smart contract
            result = self.web3_service.call_contract_function(
                contract_address=token_contract.contract_address,
                abi=token_contract.abi,
                function_name='createProperty',
                args=[
                    total_tokens,
                    category,
                    token_price_wei,
                    lockup_period_seconds,
                    early_exit_fee_rate,
                    rental_yield_rate,
                    property_obj.owner.wallet_address if hasattr(property_obj.owner, 'wallet_address') else self.web3_service.account.address,
                    f"https://capimax.com/api/v1/properties/{property_obj.id}/metadata"  # Metadata URI
                ]
            )
            
            if result and result.get('status') == 1:
                # Create transaction record
                TokenTransaction.objects.create(
                    contract=token_contract,
                    property_reference=property_obj,
                    transaction_type='property_creation',
                    transaction_hash=result['transaction_hash'],
                    from_address=self.web3_service.account.address,
                    to_address=token_contract.contract_address,
                    token_id=0,  # First token ID in contract
                    gas_used=result['gas_used'],
                    transaction_fee=result['transaction_fee'],
                    block_number=result['block_number'],
                    status='confirmed'
                )
                
                return {
                    'success': True,
                    'token_id': 0,
                    'transaction_hash': result['transaction_hash']
                }
            else:
                return {
                    'success': False,
                    'error': 'Property token creation transaction failed'
                }
                
        except Exception as e:
            logger.error(f"Error creating property token: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _setup_rental_distribution(self, property_obj: Property, distributor_contract: SmartContract):
        """Set up rental income distribution for ready properties."""
        try:
            # Register property with distributor
            result = self.web3_service.call_contract_function(
                contract_address=distributor_contract.contract_address,
                abi=distributor_contract.abi,
                function_name='registerProperty',
                args=[
                    0,  # Property token ID (first property in contract)
                    0,  # Monthly distribution frequency
                    0,  # ETH payment token
                    250,  # 2.5% platform fee
                    property_obj.owner.wallet_address if hasattr(property_obj.owner, 'wallet_address') else self.web3_service.account.address
                ]
            )
            
            if result and result.get('status') == 1:
                logger.info(f"Rental distribution setup completed for {property_obj.title}")
            else:
                logger.warning(f"Failed to setup rental distribution for {property_obj.title}")
                
        except Exception as e:
            logger.error(f"Error setting up rental distribution: {str(e)}")
    
    def process_investment(
        self,
        investment_id: str,
        mint_tokens_immediately: bool = True
    ) -> Dict:
        """
        Process a confirmed investment by minting tokens to the investor.
        
        Args:
            investment_id: Investment UUID
            mint_tokens_immediately: Whether to mint tokens immediately or hold in escrow
        
        Returns:
            Dictionary with processing results
        """
        try:
            investment = Investment.objects.select_related(
                'user', 'property', 'payment'
            ).get(id=investment_id)
            
            # Validate investment can be processed
            if investment.status != InvestmentStatus.CONFIRMED:
                return {
                    'success': False,
                    'error': 'Investment not confirmed'
                }
            
            if not investment.property.smart_contract_address:
                return {
                    'success': False,
                    'error': 'Property not tokenized'
                }
            
            # Get smart contract
            contract = SmartContract.objects.get(
                contract_address__iexact=investment.property.smart_contract_address,
                contract_type='real_estate_token'
            )
            
            # Calculate number of tokens to mint
            tokens_to_mint = int(investment.amount / investment.property.token_price)
            if tokens_to_mint == 0:
                return {
                    'success': False,
                    'error': 'Investment amount too small to mint tokens'
                }
            
            # Check if this is an installment investment
            is_installment = hasattr(investment, 'installment_plan') and investment.installment_plan is not None
            total_installments = investment.installment_plan.total_installments if is_installment else 0
            
            # Mint tokens
            result = self.web3_service.call_contract_function(
                contract_address=contract.contract_address,
                abi=contract.abi,
                function_name='mintTokens',
                args=[
                    0,  # Property token ID (first property in contract)
                    investment.user.wallet_address,
                    tokens_to_mint,
                    is_installment,
                    total_installments
                ]
            )
            
            if result and result.get('status') == 1:
                # Create transaction record
                token_tx = TokenTransaction.objects.create(
                    contract=contract,
                    property_reference=investment.property,
                    user=investment.user,
                    investment_reference=investment,
                    transaction_type='mint',
                    transaction_hash=result['transaction_hash'],
                    from_address=self.web3_service.account.address,
                    to_address=investment.user.wallet_address,
                    token_id=0,
                    token_amount=Decimal(str(tokens_to_mint)),
                    gas_used=result['gas_used'],
                    transaction_fee=result['transaction_fee'],
                    block_number=result['block_number'],
                    status='confirmed'
                )
                
                # Update or create token balance
                balance, created = TokenBalance.objects.get_or_create(
                    contract=contract,
                    user=investment.user,
                    property_reference=investment.property,
                    token_id=0,
                    defaults={
                        'wallet_address': investment.user.wallet_address,
                        'balance': Decimal(str(tokens_to_mint)),
                        'lockup_end_time': timezone.now() + timedelta(days=365),
                        'is_installment_investor': is_installment,
                        'total_installments': total_installments
                    }
                )
                
                if not created:
                    balance.balance += Decimal(str(tokens_to_mint))
                    balance.save(update_fields=['balance'])
                
                # Update investment with blockchain information
                investment.blockchain_tx_hash = result['transaction_hash']
                investment.tokens_minted = tokens_to_mint
                investment.status = InvestmentStatus.ACTIVE
                investment.save(update_fields=['blockchain_tx_hash', 'tokens_minted', 'status'])
                
                logger.info(f"Successfully processed investment {investment_id}: {tokens_to_mint} tokens minted")
                
                return {
                    'success': True,
                    'data': {
                        'tokens_minted': tokens_to_mint,
                        'transaction_hash': result['transaction_hash'],
                        'token_balance': str(balance.balance),
                        'lockup_end_time': balance.lockup_end_time.isoformat() if balance.lockup_end_time else None
                    }
                }
            else:
                return {
                    'success': False,
                    'error': 'Token minting transaction failed'
                }
                
        except Investment.DoesNotExist:
            logger.error(f"Investment {investment_id} not found")
            return {'success': False, 'error': 'Investment not found'}
        except SmartContract.DoesNotExist:
            logger.error(f"Smart contract not found for property")
            return {'success': False, 'error': 'Smart contract not found'}
        except Exception as e:
            logger.error(f"Error processing investment {investment_id}: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def distribute_rental_income(
        self,
        property_id: str,
        total_amount: Decimal,
        distribution_period: str
    ) -> Dict:
        """
        Distribute rental income to token holders.
        
        Args:
            property_id: Property UUID
            total_amount: Total rental income to distribute
            distribution_period: Distribution period (e.g., '2024-01')
        
        Returns:
            Dictionary with distribution results
        """
        try:
            property_obj = Property.objects.get(id=property_id)
            
            if not property_obj.smart_contract_address:
                return {
                    'success': False,
                    'error': 'Property not tokenized'
                }
            
            # Get rental distributor contract
            distributor_contract = SmartContract.objects.filter(
                property_reference=property_obj,
                contract_type='rental_distributor',
                status='active'
            ).first()
            
            if not distributor_contract:
                return {
                    'success': False,
                    'error': 'Rental distributor contract not found'
                }
            
            # Convert amount to wei (assuming ETH payment)
            amount_wei = int(total_amount * (10 ** 18))
            
            # Initiate distribution
            result = self.web3_service.call_contract_function(
                contract_address=distributor_contract.contract_address,
                abi=distributor_contract.abi,
                function_name='initiateDistribution',
                args=[
                    0,  # Property token ID
                    amount_wei
                ],
                value=amount_wei  # Send the rental income with the transaction
            )
            
            if result and result.get('status') == 1:
                # Create distribution record
                distribution = RentalDistribution.objects.create(
                    contract=distributor_contract,
                    property_reference=property_obj,
                    distribution_id=0,  # This should be read from contract events
                    total_amount=total_amount,
                    net_amount=total_amount * Decimal('0.975'),  # Minus 2.5% platform fee
                    platform_fee=total_amount * Decimal('0.025'),
                    eligible_tokens=property_obj.total_tokens,
                    payment_token='ETH',
                    distribution_period=distribution_period,
                    status='completed'
                )
                
                # Create transaction record
                TokenTransaction.objects.create(
                    contract=distributor_contract,
                    property_reference=property_obj,
                    transaction_type='rental_distribution',
                    transaction_hash=result['transaction_hash'],
                    from_address=self.web3_service.account.address,
                    to_address=distributor_contract.contract_address,
                    value_wei=amount_wei,
                    gas_used=result['gas_used'],
                    transaction_fee=result['transaction_fee'],
                    block_number=result['block_number'],
                    status='confirmed'
                )
                
                # Set distribution transaction reference
                distribution.distribution_transaction_id = TokenTransaction.objects.filter(
                    transaction_hash=result['transaction_hash']
                ).first().id
                distribution.save(update_fields=['distribution_transaction_id'])
                
                logger.info(f"Successfully distributed {total_amount} rental income for {property_obj.title}")
                
                return {
                    'success': True,
                    'data': {
                        'distribution_id': distribution.id,
                        'transaction_hash': result['transaction_hash'],
                        'total_amount': str(total_amount),
                        'net_amount': str(distribution.net_amount),
                        'platform_fee': str(distribution.platform_fee),
                        'eligible_tokens': distribution.eligible_tokens
                    }
                }
            else:
                return {
                    'success': False,
                    'error': 'Rental distribution transaction failed'
                }
                
        except Property.DoesNotExist:
            logger.error(f"Property {property_id} not found")
            return {'success': False, 'error': 'Property not found'}
        except Exception as e:
            logger.error(f"Error distributing rental income for property {property_id}: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_investor_portfolio(self, user_id: str) -> Dict:
        """
        Get comprehensive blockchain portfolio for an investor.
        
        Args:
            user_id: User UUID
        
        Returns:
            Dictionary with portfolio information
        """
        try:
            # Get all token balances for the user
            token_balances = TokenBalance.objects.select_related(
                'contract', 'property_reference'
            ).filter(user_id=user_id, balance__gt=0)
            
            portfolio_data = {
                'total_properties': token_balances.count(),
                'total_tokens': sum(balance.balance for balance in token_balances),
                'total_invested': Decimal('0'),
                'total_rental_earned': sum(balance.total_earned_rental for balance in token_balances),
                'properties': []
            }
            
            for balance in token_balances:
                property_data = {
                    'property_id': str(balance.property_reference.id),
                    'property_title': balance.property_reference.title,
                    'contract_address': balance.contract.contract_address,
                    'token_balance': str(balance.balance),
                    'ownership_percentage': str(balance.ownership_percentage),
                    'is_locked': balance.is_locked,
                    'lockup_end_time': balance.lockup_end_time.isoformat() if balance.lockup_end_time else None,
                    'total_earned_rental': str(balance.total_earned_rental),
                    'is_installment_investor': balance.is_installment_investor,
                    'installments_completed': balance.installments_completed,
                    'total_installments': balance.total_installments,
                    'last_updated': balance.updated_at.isoformat()
                }
                
                # Calculate investment amount
                investment_amount = balance.balance * balance.property_reference.token_price
                property_data['investment_amount'] = str(investment_amount)
                portfolio_data['total_invested'] += investment_amount
                
                # Get claimable rental income
                claimable_amount = self._get_claimable_rental_income(balance)
                property_data['claimable_rental'] = str(claimable_amount)
                
                portfolio_data['properties'].append(property_data)
            
            portfolio_data['total_invested'] = str(portfolio_data['total_invested'])
            portfolio_data['total_tokens'] = str(portfolio_data['total_tokens'])
            
            return {
                'success': True,
                'data': portfolio_data
            }
            
        except Exception as e:
            logger.error(f"Error getting investor portfolio for user {user_id}: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _get_claimable_rental_income(self, token_balance: TokenBalance) -> Decimal:
        """Get claimable rental income for a token balance."""
        try:
            # Get rental distributor contract
            distributor_contract = SmartContract.objects.filter(
                property_reference=token_balance.property_reference,
                contract_type='rental_distributor',
                status='active'
            ).first()
            
            if not distributor_contract:
                return Decimal('0')
            
            # Call getTotalClaimableAmount function
            result = self.web3_service.read_contract_function(
                contract_address=distributor_contract.contract_address,
                abi=distributor_contract.abi,
                function_name='getTotalClaimableAmount',
                args=[0, token_balance.wallet_address]  # Property token ID, investor address
            )
            
            if result:
                return Decimal(str(result)) / (10 ** 18)  # Convert from wei to ETH
            
            return Decimal('0')
            
        except Exception as e:
            logger.error(f"Error getting claimable rental income: {str(e)}")
            return Decimal('0')
    
    def claim_rental_income(
        self,
        user_id: str,
        property_id: str,
        distribution_ids: List[int] = None
    ) -> Dict:
        """
        Claim rental income for a user from specific distributions.
        
        Args:
            user_id: User UUID
            property_id: Property UUID
            distribution_ids: List of distribution IDs to claim (None for all available)
        
        Returns:
            Dictionary with claim results
        """
        try:
            from accounts.models import User
            user = User.objects.get(id=user_id)
            property_obj = Property.objects.get(id=property_id)
            
            # Get rental distributor contract
            distributor_contract = SmartContract.objects.filter(
                property_reference=property_obj,
                contract_type='rental_distributor',
                status='active'
            ).first()
            
            if not distributor_contract:
                return {
                    'success': False,
                    'error': 'Rental distributor contract not found'
                }
            
            # If no specific distributions provided, claim all available
            if distribution_ids is None:
                result = self.web3_service.call_contract_function(
                    contract_address=distributor_contract.contract_address,
                    abi=distributor_contract.abi,
                    function_name='claimAllAvailableIncome',
                    args=[0]  # Property token ID
                )
                function_called = 'claimAllAvailableIncome'
            else:
                # Claim specific distributions (would need multiple transactions)
                # For simplicity, claiming the first distribution ID
                distribution_id = distribution_ids[0] if distribution_ids else 0
                result = self.web3_service.call_contract_function(
                    contract_address=distributor_contract.contract_address,
                    abi=distributor_contract.abi,
                    function_name='claimIncome',
                    args=[0, distribution_id]  # Property token ID, distribution ID
                )
                function_called = 'claimIncome'
            
            if result and result.get('status') == 1:
                # Create transaction record
                TokenTransaction.objects.create(
                    contract=distributor_contract,
                    property_reference=property_obj,
                    user=user,
                    transaction_type='rental_claim',
                    transaction_hash=result['transaction_hash'],
                    from_address=distributor_contract.contract_address,
                    to_address=user.wallet_address,
                    gas_used=result['gas_used'],
                    transaction_fee=result['transaction_fee'],
                    block_number=result['block_number'],
                    status='confirmed'
                )
                
                logger.info(f"Successfully claimed rental income for user {user_id} from property {property_id}")
                
                return {
                    'success': True,
                    'data': {
                        'transaction_hash': result['transaction_hash'],
                        'function_called': function_called,
                        'gas_used': result['gas_used'],
                        'transaction_fee': result['transaction_fee']
                    }
                }
            else:
                return {
                    'success': False,
                    'error': 'Rental income claim transaction failed'
                }
                
        except Exception as e:
            logger.error(f"Error claiming rental income: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_property_tokenization_stats(self, property_id: str) -> Dict:
        """
        Get comprehensive tokenization statistics for a property.
        
        Args:
            property_id: Property UUID
        
        Returns:
            Dictionary with tokenization statistics
        """
        try:
            property_obj = Property.objects.get(id=property_id)
            
            if not property_obj.smart_contract_address:
                return {
                    'success': False,
                    'error': 'Property not tokenized'
                }
            
            # Get token contract
            token_contract = SmartContract.objects.filter(
                property_reference=property_obj,
                contract_type='real_estate_token',
                status='active'
            ).first()
            
            if not token_contract:
                return {
                    'success': False,
                    'error': 'Token contract not found'
                }
            
            # Get property info from smart contract
            property_info = self.web3_service.read_contract_function(
                contract_address=token_contract.contract_address,
                abi=token_contract.abi,
                function_name='getPropertyInfo',
                args=[0]  # Property token ID
            )
            
            if not property_info:
                return {
                    'success': False,
                    'error': 'Failed to read property info from contract'
                }
            
            # Parse contract response
            total_supply, current_supply, category, status_code, token_price, rental_active = property_info
            
            # Get token balances
            token_balances = TokenBalance.objects.filter(
                property_reference=property_obj,
                balance__gt=0
            )
            
            # Get rental distributions
            rental_distributions = RentalDistribution.objects.filter(
                property_reference=property_obj
            )
            
            stats = {
                'property_id': str(property_obj.id),
                'property_title': property_obj.title,
                'contract_address': token_contract.contract_address,
                'tokenization_date': property_obj.tokenization_date.isoformat() if hasattr(property_obj, 'tokenization_date') and property_obj.tokenization_date else None,
                'contract_info': {
                    'total_supply': total_supply,
                    'current_supply': current_supply,
                    'tokens_remaining': total_supply - current_supply,
                    'completion_percentage': (current_supply / total_supply * 100) if total_supply > 0 else 0,
                    'category': 'Under Construction' if category == 0 else 'Ready Property',
                    'status': ['Draft', 'Active', 'Paused', 'Completed', 'Cancelled'][status_code] if status_code < 5 else 'Unknown',
                    'token_price_wei': token_price,
                    'token_price_eth': str(Decimal(token_price) / (10 ** 18)),
                    'rental_income_active': rental_active
                },
                'investor_stats': {
                    'total_investors': token_balances.count(),
                    'total_tokens_sold': str(sum(balance.balance for balance in token_balances)),
                    'average_investment': str(sum(balance.balance for balance in token_balances) / token_balances.count()) if token_balances.count() > 0 else '0'
                },
                'rental_stats': {
                    'total_distributions': rental_distributions.count(),
                    'total_distributed': str(sum(dist.net_amount for dist in rental_distributions)),
                    'total_fees_collected': str(sum(dist.platform_fee for dist in rental_distributions)),
                    'last_distribution': rental_distributions.order_by('-distributed_at').first().distributed_at.isoformat() if rental_distributions.exists() else None
                },
                'transaction_stats': {
                    'total_transactions': TokenTransaction.objects.filter(property_reference=property_obj).count(),
                    'mint_transactions': TokenTransaction.objects.filter(property_reference=property_obj, transaction_type='mint').count(),
                    'distribution_transactions': TokenTransaction.objects.filter(property_reference=property_obj, transaction_type='rental_distribution').count(),
                    'claim_transactions': TokenTransaction.objects.filter(property_reference=property_obj, transaction_type='rental_claim').count()
                }
            }
            
            return {
                'success': True,
                'data': stats
            }
            
        except Property.DoesNotExist:
            logger.error(f"Property {property_id} not found")
            return {'success': False, 'error': 'Property not found'}
        except Exception as e:
            logger.error(f"Error getting tokenization stats for property {property_id}: {str(e)}")
            return {'success': False, 'error': str(e)}