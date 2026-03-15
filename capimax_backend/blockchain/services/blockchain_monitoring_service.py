"""
Blockchain Monitoring Service for Capimax Platform.

This service provides real-time monitoring of blockchain transactions,
contract events, and automated status updates for the platform.
"""

import logging
from decimal import Decimal
from typing import Dict, List, Optional, Any
import asyncio
from datetime import datetime, timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from celery import shared_task

from ..models import (
    BlockchainNetwork, SmartContract, TokenTransaction,
    ContractEvent, TokenBalance, RentalDistribution
)
from .web3_service import Web3Service
from properties.models import Property
from investments.models import Investment, InvestmentStatus


logger = logging.getLogger(__name__)


class BlockchainMonitoringService:
    """
    Service for monitoring blockchain transactions and contract events.
    
    Handles real-time event processing, transaction status updates,
    and automated synchronization between blockchain and database state.
    """
    
    def __init__(self, network_id: str = None):
        self.network_id = network_id
        self.web3_service = Web3Service(network_id) if network_id else None
        self.event_handlers = {
            'PropertyCreated': self._handle_property_created,
            'TokensMinted': self._handle_tokens_minted,
            'TokensBurned': self._handle_tokens_burned,
            'RentalIncomeDistributed': self._handle_rental_distributed,
            'RentalIncomeClaimed': self._handle_rental_claimed,
            'EarlyExit': self._handle_early_exit,
            'InstallmentPaid': self._handle_installment_paid,
            'TokensGraduated': self._handle_tokens_graduated,
        }
    
    def monitor_all_networks(self):
        """Monitor all active blockchain networks."""
        networks = BlockchainNetwork.objects.filter(is_active=True)
        
        for network in networks:
            try:
                self.monitor_network(str(network.id))
            except Exception as e:
                logger.error(f"Error monitoring network {network.name}: {str(e)}")
    
    def monitor_network(self, network_id: str):
        """Monitor a specific blockchain network for events and transactions."""
        try:
            web3_service = Web3Service(network_id)
            if not web3_service.w3 or not web3_service.w3.is_connected():
                logger.error(f"Cannot connect to network {network_id}")
                return
            
            network = web3_service.network
            
            # Update pending transactions
            self._update_pending_transactions(network_id)
            
            # Process new blocks and events
            self._process_new_blocks(network_id)
            
            # Update gas prices
            self._update_gas_prices(network_id)
            
            logger.info(f"Completed monitoring cycle for {network.name}")
            
        except Exception as e:
            logger.error(f"Error monitoring network {network_id}: {str(e)}")
    
    def _update_pending_transactions(self, network_id: str):
        """Update status of pending transactions."""
        web3_service = Web3Service(network_id)
        
        pending_transactions = TokenTransaction.objects.filter(
            contract__network_id=network_id,
            status__in=['pending', 'submitted']
        ).order_by('submitted_at')
        
        for tx_record in pending_transactions[:50]:  # Process in batches
            try:
                receipt = web3_service.get_transaction_receipt(tx_record.transaction_hash)
                
                if receipt:
                    # Transaction is mined
                    with transaction.atomic():
                        tx_record.status = 'confirmed' if receipt['status'] == 1 else 'failed'
                        tx_record.block_number = receipt['blockNumber']
                        tx_record.gas_used = receipt['gasUsed']
                        tx_record.confirmed_at = timezone.now()
                        
                        # Update confirmation count
                        current_block = web3_service.get_current_block_number()
                        if current_block:
                            tx_record.confirmation_count = current_block - receipt['blockNumber'] + 1
                        
                        tx_record.save(update_fields=[
                            'status', 'block_number', 'gas_used', 
                            'confirmed_at', 'confirmation_count'
                        ])
                        
                        # Process transaction events
                        if receipt['status'] == 1:
                            self._process_transaction_events(tx_record, receipt)
                        
                        # Update related models
                        self._update_related_models_on_confirmation(tx_record)
                
            except Exception as e:
                logger.error(f"Error updating transaction {tx_record.transaction_hash}: {str(e)}")
    
    def _process_transaction_events(self, tx_record: TokenTransaction, receipt: Dict):
        """Process events emitted by a transaction."""
        try:
            contract = tx_record.contract
            web3_service = Web3Service(str(contract.network.id))
            
            contract_instance = web3_service.create_contract_instance(
                contract.contract_address, 
                contract.abi
            )
            
            if not contract_instance:
                return
            
            # Process all events in the transaction
            for log in receipt['logs']:
                try:
                    # Decode the event
                    decoded_event = contract_instance.events.get(log['topics'][0]).processLog(log)
                    
                    # Create event record
                    event_record = ContractEvent.objects.create(
                        transaction=tx_record,
                        contract=contract,
                        event_type=decoded_event['event'],
                        event_signature=log['topics'][0].hex(),
                        log_index=log['logIndex'],
                        decoded_data=dict(decoded_event['args']),
                        raw_data=dict(log),
                        topics=[topic.hex() for topic in log['topics']]
                    )
                    
                    # Handle specific event types
                    handler = self.event_handlers.get(decoded_event['event'])
                    if handler:
                        handler(event_record, decoded_event['args'])
                    
                except Exception as e:
                    logger.warning(f"Could not decode event in transaction {tx_record.transaction_hash}: {str(e)}")
                    
        except Exception as e:
            logger.error(f"Error processing events for transaction {tx_record.transaction_hash}: {str(e)}")
    
    def _handle_property_created(self, event_record: ContractEvent, event_args: Dict):
        """Handle PropertyCreated event."""
        try:
            property_obj = event_record.contract.property_reference
            if property_obj:
                property_obj.status = 'tokenized'
                property_obj.save(update_fields=['status'])
                
            logger.info(f"Property created event processed for property {property_obj.id if property_obj else 'unknown'}")
            
        except Exception as e:
            logger.error(f"Error handling PropertyCreated event: {str(e)}")
    
    def _handle_tokens_minted(self, event_record: ContractEvent, event_args: Dict):
        """Handle TokensMinted event."""
        try:
            token_id = event_args.get('tokenId', 0)
            investor_address = event_args.get('investor')
            amount = event_args.get('amount', 0)
            
            # Find the investment record
            investment = Investment.objects.filter(
                property_investment=event_record.contract.property_reference,
                user__wallet_address__iexact=investor_address,
                status='confirmed'
            ).first()
            
            if investment:
                investment.tokens_minted = amount
                investment.status = InvestmentStatus.ACTIVE
                investment.token_mint_tx_hash = event_record.transaction.transaction_hash
                investment.save(update_fields=['tokens_minted', 'status', 'token_mint_tx_hash'])
            
            # Update or create token balance
            from accounts.models import User
            user = User.objects.filter(wallet_address__iexact=investor_address).first()
            
            if user:
                balance, created = TokenBalance.objects.get_or_create(
                    contract=event_record.contract,
                    user=user,
                    property_reference=event_record.contract.property_reference,
                    token_id=token_id,
                    defaults={
                        'wallet_address': investor_address,
                        'balance': Decimal(str(amount)),
                        'lockup_end_time': timezone.now() + timedelta(days=365)
                    }
                )
                
                if not created:
                    balance.balance += Decimal(str(amount))
                    balance.save(update_fields=['balance'])
            
            logger.info(f"Tokens minted event processed: {amount} tokens for {investor_address}")
            
        except Exception as e:
            logger.error(f"Error handling TokensMinted event: {str(e)}")
    
    def _handle_tokens_burned(self, event_record: ContractEvent, event_args: Dict):
        """Handle TokensBurned event."""
        try:
            token_id = event_args.get('tokenId', 0)
            investor_address = event_args.get('investor')
            amount = event_args.get('amount', 0)
            
            # Update token balance
            from accounts.models import User
            user = User.objects.filter(wallet_address__iexact=investor_address).first()
            
            if user:
                try:
                    balance = TokenBalance.objects.get(
                        contract=event_record.contract,
                        user=user,
                        token_id=token_id
                    )
                    balance.balance -= Decimal(str(amount))
                    if balance.balance <= 0:
                        balance.delete()
                    else:
                        balance.save(update_fields=['balance'])
                except TokenBalance.DoesNotExist:
                    logger.warning(f"Token balance not found for burn event")
            
            logger.info(f"Tokens burned event processed: {amount} tokens for {investor_address}")
            
        except Exception as e:
            logger.error(f"Error handling TokensBurned event: {str(e)}")
    
    def _handle_rental_distributed(self, event_record: ContractEvent, event_args: Dict):
        """Handle RentalIncomeDistributed event."""
        try:
            token_id = event_args.get('tokenId', 0)
            distribution_id = event_args.get('distributionId', 0)
            total_amount = event_args.get('totalAmount', 0)
            
            # Update rental distribution record
            distribution = RentalDistribution.objects.filter(
                property_reference=event_record.contract.property_reference,
                distribution_id=distribution_id
            ).first()
            
            if distribution:
                distribution.status = 'completed'
                distribution.distributed_at = timezone.now()
                distribution.save(update_fields=['status', 'distributed_at'])
            
            # Update property rental statistics
            property_obj = event_record.contract.property_reference
            if property_obj:
                property_obj.total_rental_distributed += Decimal(str(total_amount)) / (10 ** 18)
                property_obj.last_rental_distribution = timezone.now()
                property_obj.save(update_fields=['total_rental_distributed', 'last_rental_distribution'])
            
            logger.info(f"Rental distribution event processed: {total_amount} wei distributed")
            
        except Exception as e:
            logger.error(f"Error handling RentalIncomeDistributed event: {str(e)}")
    
    def _handle_rental_claimed(self, event_record: ContractEvent, event_args: Dict):
        """Handle RentalIncomeClaimed event."""
        try:
            token_id = event_args.get('tokenId', 0)
            distribution_id = event_args.get('distributionId', 0)
            investor_address = event_args.get('investor')
            amount = event_args.get('amount', 0)
            
            # Update token balance rental earnings
            from accounts.models import User
            user = User.objects.filter(wallet_address__iexact=investor_address).first()
            
            if user:
                try:
                    balance = TokenBalance.objects.get(
                        contract=event_record.contract,
                        user=user,
                        token_id=token_id
                    )
                    balance.total_earned_rental += Decimal(str(amount)) / (10 ** 18)
                    balance.last_distribution_claim = timezone.now()
                    balance.save(update_fields=['total_earned_rental', 'last_distribution_claim'])
                    
                    # Update investment rental earnings
                    investment = Investment.objects.filter(
                        user=user,
                        property_investment=event_record.contract.property_reference,
                        status=InvestmentStatus.ACTIVE
                    ).first()
                    
                    if investment:
                        investment.total_rental_earned += Decimal(str(amount)) / (10 ** 18)
                        investment.last_rental_claim = timezone.now()
                        investment.save(update_fields=['total_rental_earned', 'last_rental_claim'])
                    
                except TokenBalance.DoesNotExist:
                    logger.warning(f"Token balance not found for rental claim event")
            
            logger.info(f"Rental claim event processed: {amount} wei claimed by {investor_address}")
            
        except Exception as e:
            logger.error(f"Error handling RentalIncomeClaimed event: {str(e)}")
    
    def _handle_early_exit(self, event_record: ContractEvent, event_args: Dict):
        """Handle EarlyExit event."""
        try:
            token_id = event_args.get('tokenId', 0)
            investor_address = event_args.get('investor')
            tokens_exited = event_args.get('tokensExited', 0)
            fee = event_args.get('fee', 0)
            
            logger.info(f"Early exit event processed: {tokens_exited} tokens exited, {fee} wei fee")
            
        except Exception as e:
            logger.error(f"Error handling EarlyExit event: {str(e)}")
    
    def _handle_installment_paid(self, event_record: ContractEvent, event_args: Dict):
        """Handle InstallmentPaid event."""
        try:
            token_id = event_args.get('tokenId', 0)
            investor_address = event_args.get('investor')
            installment_number = event_args.get('installmentNumber', 0)
            
            # Update investment installment count
            from accounts.models import User
            user = User.objects.filter(wallet_address__iexact=investor_address).first()
            
            if user:
                investment = Investment.objects.filter(
                    user=user,
                    property_investment=event_record.contract.property_reference,
                    is_installment_investment=True
                ).first()
                
                if investment:
                    investment.installments_completed = installment_number
                    investment.save(update_fields=['installments_completed'])
            
            logger.info(f"Installment paid event processed: installment {installment_number} for {investor_address}")
            
        except Exception as e:
            logger.error(f"Error handling InstallmentPaid event: {str(e)}")
    
    def _handle_tokens_graduated(self, event_record: ContractEvent, event_args: Dict):
        """Handle TokensGraduated event (for installment payments)."""
        try:
            token_id = event_args.get('tokenId', 0)
            investor_address = event_args.get('investor')
            amount = event_args.get('amount', 0)
            
            logger.info(f"Tokens graduated event processed: {amount} tokens graduated for {investor_address}")
            
        except Exception as e:
            logger.error(f"Error handling TokensGraduated event: {str(e)}")
    
    def _process_new_blocks(self, network_id: str):
        """Process new blocks for events."""
        # This would implement block-by-block event scanning
        # For now, we rely on transaction-based event processing
        pass
    
    def _update_gas_prices(self, network_id: str):
        """Update gas prices for the network."""
        try:
            web3_service = Web3Service(network_id)
            success = web3_service.update_gas_prices() if hasattr(web3_service, 'update_gas_prices') else True
            
            if success:
                logger.debug(f"Gas prices updated for network {network_id}")
            
        except Exception as e:
            logger.error(f"Error updating gas prices for network {network_id}: {str(e)}")
    
    def _update_related_models_on_confirmation(self, tx_record: TokenTransaction):
        """Update related models when a transaction is confirmed."""
        try:
            if tx_record.status == 'confirmed':
                # Update investment status if this was a token minting transaction
                if tx_record.transaction_type == 'mint' and tx_record.investment_reference:
                    investment = tx_record.investment_reference
                    if investment.status == InvestmentStatus.PROCESSING:
                        investment.blockchain_confirmed = True
                        investment.save(update_fields=['blockchain_confirmed'])
                
                # Update property token sales count
                if tx_record.transaction_type == 'mint' and tx_record.property_reference:
                    property_obj = tx_record.property_reference
                    if tx_record.token_amount:
                        property_obj.tokens_sold += int(tx_record.token_amount)
                        property_obj.save(update_fields=['tokens_sold'])
            
        except Exception as e:
            logger.error(f"Error updating related models for transaction {tx_record.transaction_hash}: {str(e)}")
    
    def resync_token_balances(self, network_id: str = None):
        """Resynchronize token balances with blockchain state."""
        try:
            if network_id:
                networks = [BlockchainNetwork.objects.get(id=network_id)]
            else:
                networks = BlockchainNetwork.objects.filter(is_active=True)
            
            for network in networks:
                web3_service = Web3Service(str(network.id))
                
                # Get all token contracts on this network
                contracts = SmartContract.objects.filter(
                    network=network,
                    contract_type='real_estate_token',
                    status='active'
                )
                
                for contract in contracts:
                    try:
                        # Get all token balances for this contract
                        balances = TokenBalance.objects.filter(contract=contract)
                        
                        for balance in balances:
                            # Query blockchain for actual balance
                            actual_balance = web3_service.get_token_balance(
                                contract.contract_address,
                                contract.abi,
                                balance.wallet_address,
                                balance.token_id
                            )
                            
                            if actual_balance is not None and actual_balance != balance.balance:
                                logger.info(f"Updating balance for {balance.wallet_address}: {balance.balance} -> {actual_balance}")
                                balance.balance = actual_balance
                                balance.save(update_fields=['balance'])
                    
                    except Exception as e:
                        logger.error(f"Error resyncing balances for contract {contract.contract_address}: {str(e)}")
            
            logger.info("Token balance resynchronization completed")
            
        except Exception as e:
            logger.error(f"Error during token balance resync: {str(e)}")


# Celery Tasks for Automated Monitoring

@shared_task(bind=True, max_retries=3)
def monitor_blockchain_networks(self):
    """Celery task to monitor all blockchain networks."""
    try:
        monitoring_service = BlockchainMonitoringService()
        monitoring_service.monitor_all_networks()
        return "Blockchain monitoring completed successfully"
        
    except Exception as e:
        logger.error(f"Error in blockchain monitoring task: {str(e)}")
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60 * (self.request.retries + 1))
        return f"Blockchain monitoring failed after {self.max_retries} retries: {str(e)}"


@shared_task(bind=True, max_retries=3)
def resync_token_balances_task(self, network_id=None):
    """Celery task to resynchronize token balances."""
    try:
        monitoring_service = BlockchainMonitoringService()
        monitoring_service.resync_token_balances(network_id)
        return f"Token balance resync completed for network {network_id or 'all networks'}"
        
    except Exception as e:
        logger.error(f"Error in token balance resync task: {str(e)}")
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60 * (self.request.retries + 1))
        return f"Token balance resync failed after {self.max_retries} retries: {str(e)}"


@shared_task(bind=True)
def process_pending_investments(self):
    """Celery task to process confirmed investments by minting tokens."""
    try:
        from .property_tokenization_service import PropertyTokenizationService
        
        # Get all confirmed investments that haven't been processed
        confirmed_investments = Investment.objects.filter(
            status=InvestmentStatus.CONFIRMED,
            tokens_minted=0
        ).select_related('property_investment', 'user')
        
        processed_count = 0
        failed_count = 0
        
        for investment in confirmed_investments[:10]:  # Process in batches
            try:
                # Determine network based on property's blockchain deployment
                network_id = None
                if hasattr(investment.property_investment, 'deployment_network'):
                    network_id = investment.property_investment.deployment_network
                
                tokenization_service = PropertyTokenizationService(network_id)
                result = tokenization_service.process_investment(str(investment.id))
                
                if result['success']:
                    processed_count += 1
                    logger.info(f"Successfully processed investment {investment.id}")
                else:
                    failed_count += 1
                    logger.error(f"Failed to process investment {investment.id}: {result.get('error')}")
                    
            except Exception as e:
                failed_count += 1
                logger.error(f"Error processing investment {investment.id}: {str(e)}")
        
        return f"Processed {processed_count} investments, {failed_count} failed"
        
    except Exception as e:
        logger.error(f"Error in process_pending_investments task: {str(e)}")
        return f"Task failed: {str(e)}"


@shared_task(bind=True)
def auto_distribute_rental_income(self):
    """Celery task to automatically distribute rental income for ready properties."""
    try:
        from .property_tokenization_service import PropertyTokenizationService
        
        # Get ready properties that are due for rental distribution
        ready_properties = Property.objects.filter(
            property_category='ready_property',
            rental_income_active=True,
            status='tokenized'
        )
        
        distributed_count = 0
        failed_count = 0
        
        for property_obj in ready_properties:
            try:
                # Check if distribution is due (simplified logic)
                if property_obj.last_rental_distribution:
                    days_since_last = (timezone.now() - property_obj.last_rental_distribution).days
                    frequency_days = {
                        'monthly': 30,
                        'quarterly': 90,
                        'semi_annual': 180,
                        'annual': 365
                    }.get(getattr(property_obj, 'rental_distribution_frequency', 'monthly'), 30)
                    
                    if days_since_last < frequency_days:
                        continue  # Not due yet
                
                # Calculate rental income to distribute (simplified)
                monthly_rental = property_obj.monthly_rental_income or Decimal('0')
                if monthly_rental <= 0:
                    continue
                
                # This would be integrated with actual rental income collection
                # For now, we skip automatic distribution and require manual triggering
                logger.info(f"Property {property_obj.title} is due for rental distribution")
                
            except Exception as e:
                failed_count += 1
                logger.error(f"Error checking rental distribution for property {property_obj.id}: {str(e)}")
        
        return f"Checked rental distributions for {ready_properties.count()} properties"
        
    except Exception as e:
        logger.error(f"Error in auto_distribute_rental_income task: {str(e)}")
        return f"Task failed: {str(e)}"