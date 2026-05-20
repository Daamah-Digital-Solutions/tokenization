"""
Blockchain Transaction Monitoring Service for Capimax Real Estate Tokenization Platform.

This module provides comprehensive transaction monitoring, event listening,
and automated processing for blockchain transactions related to property tokens.
"""

import logging
from decimal import Decimal
from typing import Dict, List, Optional, Any, Callable
import asyncio
import json
from datetime import datetime, timedelta
import threading
import time

# Real Web3 imports - fail fast if not available (Phase 1 Blockchain Activation)
from web3 import Web3
from web3.exceptions import TransactionNotFound, BlockNotFound
from eth_utils import to_checksum_address

from django.conf import settings
from django.utils import timezone
from django.db import transaction
from django.core.cache import cache

from ..models import (
    BlockchainNetwork, SmartContract, TokenTransaction, 
    ContractEvent, TokenBalance, RentalDistribution
)
from .web3_service import Web3Service
from investments.models import Investment
from properties.models import Property


logger = logging.getLogger(__name__)


class TransactionMonitor:
    """
    Monitors blockchain transactions and updates database accordingly.
    
    Provides real-time monitoring of transaction status, confirmations,
    and automated processing of transaction events.
    """
    
    def __init__(self, network_id: str):
        self.network_id = network_id
        self.web3_service = Web3Service(network_id)
        self.network = self.web3_service.network
        self.monitoring = False
        self.monitor_thread = None
        
        # Event handlers
        self.event_handlers = {
            'PropertyCreated': self._handle_property_created,
            'TokensMinted': self._handle_tokens_minted,
            'TokensBurned': self._handle_tokens_burned,
            'Transfer': self._handle_token_transfer,
            'RentalIncomeDistributed': self._handle_rental_distributed,
            'RentalIncomeClaimed': self._handle_rental_claimed,
            'EarlyExit': self._handle_early_exit,
            'InstallmentPaid': self._handle_installment_paid,
            'TokensGraduated': self._handle_tokens_graduated,
        }
    
    def start_monitoring(self) -> bool:
        """Start the transaction monitoring service."""
        if self.monitoring:
            logger.warning("Transaction monitoring already started")
            return False
        
        if not self.web3_service.w3:
            logger.error("Web3 service not initialized")
            return False
        
        self.monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        
        logger.info(f"Started transaction monitoring for {self.network.name}")
        return True
    
    def stop_monitoring(self) -> bool:
        """Stop the transaction monitoring service."""
        if not self.monitoring:
            logger.warning("Transaction monitoring not started")
            return False
        
        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=10)
        
        logger.info(f"Stopped transaction monitoring for {self.network.name}")
        return True
    
    def _monitor_loop(self):
        """Main monitoring loop that runs in a separate thread."""
        logger.info("Starting transaction monitoring loop")
        
        while self.monitoring:
            try:
                # Update pending transactions
                self._update_pending_transactions()
                
                # Process new blocks
                self._process_new_blocks()
                
                # Update gas prices
                self.web3_service.update_gas_prices()
                
                # Sleep between iterations
                time.sleep(10)  # Check every 10 seconds
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {str(e)}")
                time.sleep(30)  # Longer sleep on error
    
    def _update_pending_transactions(self):
        """Update status of pending transactions."""
        try:
            pending_transactions = TokenTransaction.objects.filter(
                contract__network=self.network,
                status__in=['pending', 'submitted']
            )
            
            for tx in pending_transactions:
                self._update_transaction_status(tx)
                
        except Exception as e:
            logger.error(f"Error updating pending transactions: {str(e)}")
    
    def _update_transaction_status(self, tx: TokenTransaction):
        """Update status of a specific transaction."""
        try:
            # Get transaction receipt
            receipt = self.web3_service.get_transaction_receipt(tx.transaction_hash)
            
            if not receipt:
                # Transaction not yet mined
                return
            
            # Update transaction with receipt data
            with transaction.atomic():
                tx.block_number = receipt['blockNumber']
                tx.block_hash = receipt['blockHash'].hex()
                tx.transaction_index = receipt['transactionIndex']
                tx.gas_used = receipt['gasUsed']
                tx.receipt = receipt
                
                if receipt['status'] == 1:
                    tx.status = 'confirmed'
                    tx.confirmed_at = timezone.now()
                else:
                    tx.status = 'failed'
                    # Try to get error reason
                    tx.error_message = self._get_transaction_error(tx.transaction_hash)
                
                # Update confirmations
                current_block = self.web3_service.get_current_block_number()
                if current_block and tx.block_number:
                    tx.confirmation_count = current_block - tx.block_number + 1
                
                tx.save()
                
                logger.debug(f"Updated transaction {tx.transaction_hash}: {tx.status}")
                
                # Process events if transaction succeeded
                if tx.status == 'confirmed':
                    self._process_transaction_events(tx)
                
        except Exception as e:
            logger.error(f"Error updating transaction {tx.transaction_hash}: {str(e)}")
    
    def _process_new_blocks(self):
        """Process new blocks for contract events."""
        try:
            current_block = self.web3_service.get_current_block_number()
            if not current_block:
                return
            
            # Get last processed block from cache
            cache_key = f"last_processed_block_{self.network_id}"
            last_processed = cache.get(cache_key, current_block - 100)  # Default to 100 blocks back
            
            if current_block <= last_processed:
                return
            
            # Process blocks in batches
            batch_size = 10
            for start_block in range(last_processed + 1, current_block + 1, batch_size):
                end_block = min(start_block + batch_size - 1, current_block)
                self._process_block_range(start_block, end_block)
            
            # Update cache
            cache.set(cache_key, current_block, 3600)  # Cache for 1 hour
            
        except Exception as e:
            logger.error(f"Error processing new blocks: {str(e)}")
    
    def _process_block_range(self, start_block: int, end_block: int):
        """Process a range of blocks for contract events."""
        try:
            contracts = SmartContract.objects.filter(
                network=self.network,
                status__in=['active', 'deployed']
            )
            
            for contract in contracts:
                self._process_contract_events(contract, start_block, end_block)
                
        except Exception as e:
            logger.error(f"Error processing block range {start_block}-{end_block}: {str(e)}")
    
    def _process_contract_events(self, contract: SmartContract, from_block: int, to_block: int):
        """Process events for a specific contract in a block range."""
        try:
            # Get all events from the contract in the block range
            events = self.web3_service.get_contract_events(
                contract_address=contract.contract_address,
                abi=contract.abi,
                event_name=None,  # Get all events
                from_block=from_block,
                to_block=to_block
            )
            
            for event_data in events:
                self._process_contract_event(contract, event_data)
                
        except Exception as e:
            logger.error(f"Error processing events for contract {contract.contract_address}: {str(e)}")
    
    def _process_contract_event(self, contract: SmartContract, event_data: Dict):
        """Process a single contract event."""
        try:
            # Get or create the transaction record
            tx, created = TokenTransaction.objects.get_or_create(
                transaction_hash=event_data['transaction_hash'],
                defaults={
                    'contract': contract,
                    'transaction_type': 'other',
                    'from_address': '0x0000000000000000000000000000000000000000',
                    'to_address': contract.contract_address,
                    'block_number': event_data['block_number'],
                    'status': 'confirmed'
                }
            )
            
            # Create event record
            event_record, event_created = ContractEvent.objects.get_or_create(
                transaction=tx,
                log_index=event_data['log_index'],
                defaults={
                    'contract': contract,
                    'event_type': event_data.get('event', 'Other'),
                    'event_signature': event_data.get('topics', [''])[0] if event_data.get('topics') else '',
                    'decoded_data': event_data.get('args', {}),
                    'raw_data': event_data,
                    'topics': event_data.get('topics', [])
                }
            )
            
            if event_created:
                # Handle the specific event type
                event_type = event_data.get('event', 'Other')
                handler = self.event_handlers.get(event_type)
                
                if handler:
                    handler(event_record, event_data)
                    logger.debug(f"Processed {event_type} event: {event_data['transaction_hash']}")
                
        except Exception as e:
            logger.error(f"Error processing contract event: {str(e)}")
    
    def _process_transaction_events(self, tx: TokenTransaction):
        """Process events for a specific transaction."""
        try:
            if not tx.receipt or not tx.receipt.get('logs'):
                return
            
            contract = tx.contract
            
            # Process each log in the transaction
            for log_index, log in enumerate(tx.receipt['logs']):
                if log['address'].lower() == contract.contract_address.lower():
                    # Decode the event
                    try:
                        decoded_event = self._decode_log(contract, log)
                        if decoded_event:
                            self._process_contract_event(contract, {
                                **decoded_event,
                                'transaction_hash': tx.transaction_hash,
                                'block_number': tx.block_number,
                                'log_index': log_index
                            })
                    except Exception as e:
                        logger.warning(f"Failed to decode log: {str(e)}")
                        
        except Exception as e:
            logger.error(f"Error processing transaction events: {str(e)}")
    
    def _decode_log(self, contract: SmartContract, log: Dict) -> Optional[Dict]:
        """Decode a contract log using the contract ABI."""
        try:
            web3_contract = self.web3_service.create_contract_instance(
                contract.contract_address, contract.abi
            )
            
            if not web3_contract:
                return None
            
            # Try to decode with each event in the ABI
            for abi_item in contract.abi:
                if abi_item.get('type') == 'event':
                    try:
                        event = getattr(web3_contract.events, abi_item['name'])
                        decoded = event().process_log(log)
                        
                        return {
                            'event': decoded['event'],
                            'args': dict(decoded['args']),
                            'topics': [topic.hex() for topic in log['topics']],
                            'data': log['data']
                        }
                    except:
                        continue
            
            return None
            
        except Exception as e:
            logger.error(f"Error decoding log: {str(e)}")
            return None
    
    def _get_transaction_error(self, tx_hash: str) -> Optional[str]:
        """Get error message for a failed transaction."""
        try:
            tx_details = self.web3_service.get_transaction_details(tx_hash)
            if tx_details and tx_details.get('receipt'):
                receipt = tx_details['receipt']
                if receipt.get('status') == 0:
                    # Try to get revert reason (this is network-specific)
                    return "Transaction failed (reverted)"
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting transaction error: {str(e)}")
            return None
    
    # Event handlers
    
    def _handle_property_created(self, event: ContractEvent, event_data: Dict):
        """Handle PropertyCreated event."""
        try:
            args = event_data.get('args', {})
            token_id = args.get('tokenId')
            category = args.get('category')
            total_supply = args.get('totalSupply')
            
            logger.info(f"Property created: tokenId={token_id}, category={category}, supply={total_supply}")
            
        except Exception as e:
            logger.error(f"Error handling PropertyCreated event: {str(e)}")
    
    def _handle_tokens_minted(self, event: ContractEvent, event_data: Dict):
        """Handle TokensMinted event."""
        try:
            args = event_data.get('args', {})
            token_id = args.get('tokenId')
            investor = args.get('investor')
            amount = args.get('amount')
            
            # Update token balance
            self._update_token_balance(
                event.contract, investor, token_id, Decimal(str(amount)), 'mint'
            )
            
            logger.info(f"Tokens minted: {amount} tokens to {investor} for property {token_id}")
            
        except Exception as e:
            logger.error(f"Error handling TokensMinted event: {str(e)}")
    
    def _handle_tokens_burned(self, event: ContractEvent, event_data: Dict):
        """Handle TokensBurned event."""
        try:
            args = event_data.get('args', {})
            token_id = args.get('tokenId')
            investor = args.get('investor')
            amount = args.get('amount')
            
            # Update token balance
            self._update_token_balance(
                event.contract, investor, token_id, -Decimal(str(amount)), 'burn'
            )
            
            logger.info(f"Tokens burned: {amount} tokens from {investor} for property {token_id}")
            
        except Exception as e:
            logger.error(f"Error handling TokensBurned event: {str(e)}")
    
    def _handle_token_transfer(self, event: ContractEvent, event_data: Dict):
        """Handle Transfer event (ERC-1155)."""
        try:
            args = event_data.get('args', {})
            from_address = args.get('from')
            to_address = args.get('to')
            token_id = args.get('id')
            amount = args.get('value')
            
            # Skip mint and burn operations (handled by specific events)
            if from_address == '0x0000000000000000000000000000000000000000':
                return  # Mint
            if to_address == '0x0000000000000000000000000000000000000000':
                return  # Burn
            
            # Update balances for both parties
            self._update_token_balance(
                event.contract, from_address, token_id, -Decimal(str(amount)), 'transfer_out'
            )
            self._update_token_balance(
                event.contract, to_address, token_id, Decimal(str(amount)), 'transfer_in'
            )
            
            logger.info(f"Token transfer: {amount} tokens from {from_address} to {to_address}")
            
        except Exception as e:
            logger.error(f"Error handling Transfer event: {str(e)}")
    
    def _handle_rental_distributed(self, event: ContractEvent, event_data: Dict):
        """Handle RentalIncomeDistributed event."""
        try:
            args = event_data.get('args', {})
            property_token_id = args.get('tokenId')
            distribution_id = args.get('distributionId')
            total_amount = args.get('totalAmount')
            
            # Create or update rental distribution record
            property_obj = Property.objects.filter(
                blockchain_contracts__contract=event.contract
            ).first()
            
            if property_obj:
                rental_dist, created = RentalDistribution.objects.get_or_create(
                    contract=event.contract,
                    property_reference=property_obj,
                    distribution_id=distribution_id,
                    defaults={
                        'total_amount': Decimal(str(total_amount)) / Decimal('10') ** 18,
                        'net_amount': Decimal(str(total_amount)) / Decimal('10') ** 18,
                        'eligible_tokens': 0,  # Would be updated from contract
                        'distribution_period': timezone.now().strftime('%Y-%m'),
                        'status': 'completed',
                        'distributed_at': timezone.now()
                    }
                )
                
                logger.info(f"Rental income distributed: {total_amount} for property {property_token_id}")
            
        except Exception as e:
            logger.error(f"Error handling RentalIncomeDistributed event: {str(e)}")
    
    def _handle_rental_claimed(self, event: ContractEvent, event_data: Dict):
        """Handle RentalIncomeClaimed event."""
        try:
            args = event_data.get('args', {})
            property_token_id = args.get('tokenId')
            distribution_id = args.get('distributionId')
            investor = args.get('investor')
            amount = args.get('amount')
            
            # Update rental distribution claim tracking
            try:
                rental_dist = RentalDistribution.objects.get(
                    contract=event.contract,
                    distribution_id=distribution_id
                )
                rental_dist.total_claimed += Decimal(str(amount)) / Decimal('10') ** 18
                rental_dist.claims_processed += 1
                rental_dist.save(update_fields=['total_claimed', 'claims_processed'])
                
            except RentalDistribution.DoesNotExist:
                logger.warning(f"Rental distribution {distribution_id} not found for claim event")
            
            # Update user's token balance with rental earnings
            self._update_rental_earnings(event.contract, investor, property_token_id, amount)
            
            logger.info(f"Rental income claimed: {amount} by {investor}")
            
        except Exception as e:
            logger.error(f"Error handling RentalIncomeClaimed event: {str(e)}")
    
    def _handle_early_exit(self, event: ContractEvent, event_data: Dict):
        """Handle EarlyExit event."""
        try:
            args = event_data.get('args', {})
            token_id = args.get('tokenId')
            investor = args.get('investor')
            tokens_exited = args.get('tokensExited')
            fee = args.get('fee')
            
            # Update token balance (tokens are burned on early exit)
            self._update_token_balance(
                event.contract, investor, token_id, -Decimal(str(tokens_exited)), 'early_exit'
            )
            
            logger.info(f"Early exit: {investor} exited {tokens_exited} tokens with fee {fee}")
            
        except Exception as e:
            logger.error(f"Error handling EarlyExit event: {str(e)}")
    
    def _handle_installment_paid(self, event: ContractEvent, event_data: Dict):
        """Handle InstallmentPaid event."""
        try:
            args = event_data.get('args', {})
            token_id = args.get('tokenId')
            investor = args.get('investor')
            installment_number = args.get('installmentNumber')
            
            # Update installment tracking in token balance
            try:
                token_balance = TokenBalance.objects.get(
                    contract=event.contract,
                    wallet_address=investor,
                    token_id=token_id
                )
                token_balance.installments_completed = installment_number
                token_balance.save(update_fields=['installments_completed'])
                
            except TokenBalance.DoesNotExist:
                logger.warning(f"Token balance not found for installment payment")
            
            logger.info(f"Installment paid: {investor} completed installment {installment_number}")
            
        except Exception as e:
            logger.error(f"Error handling InstallmentPaid event: {str(e)}")
    
    def _handle_tokens_graduated(self, event: ContractEvent, event_data: Dict):
        """Handle TokensGraduated event (installment tokens released)."""
        try:
            args = event_data.get('args', {})
            token_id = args.get('tokenId')
            investor = args.get('investor')
            amount = args.get('amount')
            
            # Update available balance (tokens are unlocked)
            try:
                token_balance = TokenBalance.objects.get(
                    contract=event.contract,
                    wallet_address=investor,
                    token_id=token_id
                )
                token_balance.available_balance += Decimal(str(amount))
                token_balance.locked_balance -= Decimal(str(amount))
                token_balance.save(update_fields=['available_balance', 'locked_balance'])
                
            except TokenBalance.DoesNotExist:
                logger.warning(f"Token balance not found for token graduation")
            
            logger.info(f"Tokens graduated: {amount} tokens unlocked for {investor}")
            
        except Exception as e:
            logger.error(f"Error handling TokensGraduated event: {str(e)}")
    
    def _update_token_balance(
        self,
        contract: SmartContract,
        wallet_address: str,
        token_id: int,
        amount_change: Decimal,
        operation: str
    ):
        """Update token balance for a user."""
        try:
            from accounts.models import User
            
            # Find user by wallet address
            user = User.objects.lookup_by_wallet(wallet_address)
            if not user:
                logger.warning(f"User not found for wallet address: {wallet_address}")
                return
            
            # Find property
            property_obj = Property.objects.filter(
                blockchain_contracts__contract=contract
            ).first()
            
            if not property_obj:
                logger.warning(f"Property not found for contract: {contract.contract_address}")
                return
            
            # Get or create token balance
            token_balance, created = TokenBalance.objects.get_or_create(
                contract=contract,
                user=user,
                property_reference=property_obj,
                token_id=token_id,
                defaults={
                    'wallet_address': wallet_address,
                    'balance': Decimal('0'),
                    'available_balance': Decimal('0'),
                    'locked_balance': Decimal('0')
                }
            )
            
            # Update balance
            with transaction.atomic():
                token_balance.balance += amount_change
                
                # Handle availability based on operation
                if operation in ['mint', 'transfer_in']:
                    # New tokens might be locked initially
                    if token_balance.is_installment_investor:
                        token_balance.locked_balance += amount_change
                    else:
                        token_balance.available_balance += amount_change
                elif operation in ['burn', 'transfer_out', 'early_exit']:
                    # Reduce available balance first, then locked
                    if token_balance.available_balance >= abs(amount_change):
                        token_balance.available_balance += amount_change
                    else:
                        remaining = abs(amount_change) - token_balance.available_balance
                        token_balance.available_balance = Decimal('0')
                        token_balance.locked_balance -= remaining
                
                # Ensure balances don't go negative
                token_balance.balance = max(token_balance.balance, Decimal('0'))
                token_balance.available_balance = max(token_balance.available_balance, Decimal('0'))
                token_balance.locked_balance = max(token_balance.locked_balance, Decimal('0'))
                
                token_balance.last_updated_block = self.web3_service.get_current_block_number()
                token_balance.save()
                
                logger.debug(f"Updated token balance for {user.email}: {token_balance.balance}")
                
        except Exception as e:
            logger.error(f"Error updating token balance: {str(e)}")
    
    def _update_rental_earnings(
        self,
        contract: SmartContract,
        wallet_address: str,
        token_id: int,
        amount: int
    ):
        """Update rental earnings for a user."""
        try:
            from accounts.models import User
            
            user = User.objects.lookup_by_wallet(wallet_address)
            if not user:
                return
            
            property_obj = Property.objects.filter(
                blockchain_contracts__contract=contract
            ).first()
            
            if not property_obj:
                return
            
            # Update token balance with rental earnings
            try:
                token_balance = TokenBalance.objects.get(
                    contract=contract,
                    user=user,
                    property_reference=property_obj,
                    token_id=token_id
                )
                
                rental_amount = Decimal(str(amount)) / Decimal('10') ** 18
                token_balance.total_earned_rental += rental_amount
                token_balance.last_distribution_claim = timezone.now()
                token_balance.save(update_fields=['total_earned_rental', 'last_distribution_claim'])
                
            except TokenBalance.DoesNotExist:
                logger.warning(f"Token balance not found for rental earnings update")
                
        except Exception as e:
            logger.error(f"Error updating rental earnings: {str(e)}")


class EventListener:
    """
    Real-time event listener for contract events.
    
    Provides WebSocket-like real-time monitoring of blockchain events
    using Web3 event filters.
    """
    
    def __init__(self, network_id: str):
        self.network_id = network_id
        self.web3_service = Web3Service(network_id)
        self.active_filters = {}
        self.listening = False
    
    def start_listening(self, contracts: List[SmartContract]) -> bool:
        """Start listening for events from specified contracts."""
        if not self.web3_service.w3:
            logger.error("Web3 service not initialized")
            return False
        
        try:
            for contract in contracts:
                self._create_event_filters(contract)
            
            self.listening = True
            logger.info(f"Started event listening for {len(contracts)} contracts")
            return True
            
        except Exception as e:
            logger.error(f"Error starting event listener: {str(e)}")
            return False
    
    def stop_listening(self):
        """Stop listening for events."""
        self.listening = False
        
        # Uninstall all filters
        for contract_address, filters in self.active_filters.items():
            for event_name, filter_obj in filters.items():
                try:
                    self.web3_service.w3.eth.uninstall_filter(filter_obj.filter_id)
                except:
                    pass
        
        self.active_filters.clear()
        logger.info("Stopped event listening")
    
    def _create_event_filters(self, contract: SmartContract):
        """Create event filters for a contract."""
        try:
            web3_contract = self.web3_service.create_contract_instance(
                contract.contract_address, contract.abi
            )
            
            if not web3_contract:
                return
            
            contract_filters = {}
            
            # Create filters for key events
            key_events = [
                'PropertyCreated', 'TokensMinted', 'TokensBurned', 'Transfer',
                'RentalIncomeDistributed', 'RentalIncomeClaimed', 'EarlyExit'
            ]
            
            for event_name in key_events:
                try:
                    event = getattr(web3_contract.events, event_name, None)
                    if event:
                        event_filter = event.create_filter(fromBlock='latest')
                        contract_filters[event_name] = event_filter
                except AttributeError:
                    # Event not found in this contract
                    continue
            
            self.active_filters[contract.contract_address] = contract_filters
            logger.debug(f"Created {len(contract_filters)} event filters for {contract.contract_address}")
            
        except Exception as e:
            logger.error(f"Error creating event filters for {contract.contract_address}: {str(e)}")
    
    async def poll_events(self, callback: Callable = None):
        """Poll for new events and process them."""
        while self.listening:
            try:
                for contract_address, filters in self.active_filters.items():
                    for event_name, event_filter in filters.items():
                        try:
                            new_events = event_filter.get_new_entries()
                            
                            for event in new_events:
                                event_data = {
                                    'contract_address': contract_address,
                                    'event_name': event_name,
                                    'event': event['event'],
                                    'args': dict(event['args']),
                                    'transaction_hash': event['transactionHash'].hex(),
                                    'block_number': event['blockNumber'],
                                    'log_index': event['logIndex']
                                }
                                
                                if callback:
                                    callback(event_data)
                                else:
                                    logger.info(f"New event: {event_name} from {contract_address}")
                                    
                        except Exception as e:
                            logger.error(f"Error polling events for {event_name}: {str(e)}")
                
                # Sleep between polls
                await asyncio.sleep(5)
                
            except Exception as e:
                logger.error(f"Error in event polling: {str(e)}")
                await asyncio.sleep(10)


# Factory function to create monitor for a network
def create_transaction_monitor(network_id: str) -> TransactionMonitor:
    """Factory function to create a transaction monitor for a network."""
    return TransactionMonitor(network_id)


# Global monitor instances (singleton pattern)
_monitors = {}


def get_transaction_monitor(network_id: str) -> TransactionMonitor:
    """Get or create a transaction monitor instance for a network."""
    if network_id not in _monitors:
        _monitors[network_id] = TransactionMonitor(network_id)
    
    return _monitors[network_id]


def start_all_monitors():
    """Start transaction monitors for all active networks."""
    try:
        active_networks = BlockchainNetwork.objects.filter(is_active=True)
        
        for network in active_networks:
            monitor = get_transaction_monitor(str(network.id))
            monitor.start_monitoring()
            
        logger.info(f"Started monitors for {len(active_networks)} networks")
        
    except Exception as e:
        logger.error(f"Error starting all monitors: {str(e)}")


def stop_all_monitors():
    """Stop all transaction monitors."""
    try:
        for monitor in _monitors.values():
            monitor.stop_monitoring()
        
        _monitors.clear()
        logger.info("Stopped all transaction monitors")
        
    except Exception as e:
        logger.error(f"Error stopping all monitors: {str(e)}")