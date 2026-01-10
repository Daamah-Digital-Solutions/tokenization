"""
Web3 Integration Service for Capimax Real Estate Tokenization Platform.

This module provides comprehensive Web3 integration for blockchain interactions
including contract deployment, transaction monitoring, and event listening.
"""

import logging
from decimal import Decimal
from typing import Dict, List, Optional, Tuple, Any
import json
import asyncio
from datetime import datetime, timedelta

# Real Web3 imports - fail fast if not available (Phase 1 Blockchain Activation)
from web3 import Web3
from web3.contract import Contract
from web3.exceptions import ContractLogicError, TransactionNotFound
from eth_account import Account
from eth_utils import to_checksum_address
import requests

from django.conf import settings
from django.utils import timezone
from django.db import transaction

from ..models import (
    BlockchainNetwork, SmartContract, TokenTransaction, 
    ContractEvent, TokenBalance, GasTracker
)


logger = logging.getLogger(__name__)


class Web3Service:
    """
    Comprehensive Web3 service for blockchain interactions.
    
    Handles contract deployment, transaction management, event monitoring,
    and balance tracking across multiple blockchain networks.
    """
    
    def __init__(self, network_id: str = None):
        """Initialize Web3 service with network configuration."""
        self.network = None
        self.w3 = None
        self.account = None
        self.contracts_cache = {}
        self.active_rpc_url = None  # Track which RPC is currently active

        if network_id:
            self.initialize_network(network_id)

    def initialize_network(self, network_id: str) -> bool:
        """
        Initialize Web3 connection for a specific network with RPC failover.

        Tries primary RPC first, then falls back to backup RPCs if available.
        """
        try:
            self.network = BlockchainNetwork.objects.get(id=network_id, is_active=True)

            # Build list of RPC URLs to try (primary + backups)
            rpc_urls = [self.network.rpc_url]
            if self.network.backup_rpc_urls:
                rpc_urls.extend(self.network.backup_rpc_urls)

            # Try each RPC URL until one connects
            connected = False
            last_error = None

            for rpc_url in rpc_urls:
                try:
                    connected = self._try_connect_rpc(rpc_url)
                    if connected:
                        self.active_rpc_url = rpc_url
                        break
                except Exception as e:
                    last_error = e
                    logger.warning(f"RPC {rpc_url} failed: {str(e)}")
                    continue

            if not connected:
                logger.error(
                    f"Failed to connect to any RPC for {self.network.name}. "
                    f"Tried {len(rpc_urls)} endpoints. Last error: {last_error}"
                )
                return False

            # Initialize account if private key is available
            private_key = getattr(settings, 'BLOCKCHAIN_PRIVATE_KEY', None)
            if private_key:
                self.account = Account.from_key(private_key)
                logger.info(f"Initialized account: {self.account.address}")

            logger.info(
                f"Connected to {self.network.name} (Chain ID: {self.network.chain_id}) "
                f"via {self.active_rpc_url}"
            )
            return True

        except BlockchainNetwork.DoesNotExist:
            logger.error(f"Network {network_id} not found")
            return False
        except Exception as e:
            logger.error(f"Failed to initialize network {network_id}: {str(e)}")
            return False

    def _try_connect_rpc(self, rpc_url: str) -> bool:
        """
        Attempt to connect to a specific RPC endpoint.

        Returns True if connection is successful and healthy.
        """
        provider_kwargs = {
            'request_kwargs': {
                'timeout': 30,  # Shorter timeout for failover testing
                'headers': {'User-Agent': 'Capimax/1.0'}
            }
        }

        w3 = Web3(Web3.HTTPProvider(rpc_url, **provider_kwargs))

        # Verify connection with a simple call
        if not w3.is_connected():
            return False

        # Health check: try to get block number
        try:
            block_num = w3.eth.block_number
            if block_num is None or block_num < 0:
                return False
        except Exception:
            return False

        # Connection is healthy
        self.w3 = w3
        return True

    def reconnect_with_failover(self) -> bool:
        """
        Attempt to reconnect, trying backup RPCs if primary fails.

        Call this when a connection error is detected during operations.
        """
        if not self.network:
            return False

        logger.warning(f"Attempting reconnection with failover for {self.network.name}")

        # Build list of RPCs, putting current failed one at the end
        rpc_urls = [self.network.rpc_url]
        if self.network.backup_rpc_urls:
            rpc_urls.extend(self.network.backup_rpc_urls)

        # If we have an active URL that failed, move it to the end
        if self.active_rpc_url and self.active_rpc_url in rpc_urls:
            rpc_urls.remove(self.active_rpc_url)
            rpc_urls.append(self.active_rpc_url)

        for rpc_url in rpc_urls:
            try:
                if self._try_connect_rpc(rpc_url):
                    self.active_rpc_url = rpc_url
                    logger.info(f"Reconnected to {self.network.name} via {rpc_url}")
                    return True
            except Exception as e:
                logger.warning(f"Failover RPC {rpc_url} failed: {str(e)}")
                continue

        logger.error(f"All RPC failover attempts failed for {self.network.name}")
        return False

    def is_connection_healthy(self) -> bool:
        """Check if the current RPC connection is healthy."""
        if not self.w3:
            return False

        try:
            # Quick health check
            return self.w3.is_connected() and self.w3.eth.block_number > 0
        except Exception:
            return False
    
    def deploy_contract(
        self,
        contract_name: str,
        abi: List[Dict],
        bytecode: str,
        constructor_args: List = None,
        gas_limit: int = None,
        gas_price: int = None
    ) -> Optional[Dict]:
        """
        Deploy a smart contract to the blockchain.
        
        Returns deployment transaction details and contract address.
        """
        if not self.w3 or not self.account:
            logger.error("Web3 not initialized or account not available")
            return None
        
        try:
            # Create contract instance
            contract = self.w3.eth.contract(abi=abi, bytecode=bytecode)
            
            # Estimate gas if not provided
            if not gas_limit:
                try:
                    gas_limit = contract.constructor(
                        *constructor_args if constructor_args else []
                    ).estimate_gas({'from': self.account.address})
                    gas_limit = int(gas_limit * 1.2)  # Add 20% buffer
                except Exception as e:
                    logger.warning(f"Failed to estimate gas, using default: {str(e)}")
                    gas_limit = 3000000  # Default gas limit
            
            # Get gas price if not provided
            if not gas_price:
                gas_price = self.get_optimal_gas_price()
            
            # Build transaction
            constructor = contract.constructor(*constructor_args if constructor_args else [])
            
            transaction_params = {
                'from': self.account.address,
                'gas': gas_limit,
                'gasPrice': gas_price,
                'nonce': self.w3.eth.get_transaction_count(self.account.address),
            }
            
            # Build the transaction
            transaction_data = constructor.build_transaction(transaction_params)
            
            # Sign and send transaction
            signed_txn = self.w3.eth.account.sign_transaction(transaction_data, self.account.key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            logger.info(f"Contract deployment transaction sent: {tx_hash.hex()}")
            
            # Wait for transaction receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)
            
            if receipt['status'] == 1:
                contract_address = receipt['contractAddress']
                logger.info(f"Contract {contract_name} deployed at: {contract_address}")
                
                return {
                    'contract_address': contract_address,
                    'transaction_hash': tx_hash.hex(),
                    'gas_used': receipt['gasUsed'],
                    'deployment_cost': receipt['gasUsed'] * gas_price / 10**18,
                    'block_number': receipt['blockNumber'],
                    'receipt': dict(receipt)
                }
            else:
                logger.error(f"Contract deployment failed: {receipt}")
                return None
                
        except Exception as e:
            logger.error(f"Error deploying contract {contract_name}: {str(e)}")
            return None
    
    def create_contract_instance(self, contract_address: str, abi: List[Dict]) -> Optional[Contract]:
        """Create a Web3 contract instance."""
        if not self.w3:
            return None
        
        try:
            checksum_address = to_checksum_address(contract_address)
            return self.w3.eth.contract(address=checksum_address, abi=abi)
        except Exception as e:
            logger.error(f"Error creating contract instance: {str(e)}")
            return None
    
    def call_contract_function(
        self,
        contract_address: str,
        abi: List[Dict],
        function_name: str,
        args: List = None,
        value: int = 0,
        gas_limit: int = None,
        gas_price: int = None,
        gas_settings: Dict = None
    ) -> Optional[Dict]:
        """
        Call a smart contract function (state-changing transaction).

        Returns transaction hash and receipt details.
        Includes automatic failover on connection errors.
        """
        # Handle gas_settings parameter (from tasks.py)
        if gas_settings:
            gas_limit = gas_settings.get('gas_limit', gas_limit)
            gas_price = gas_settings.get('gas_price', gas_price)

        return self._call_contract_function_with_retry(
            contract_address, abi, function_name, args, value, gas_limit, gas_price
        )

    def _call_contract_function_with_retry(
        self,
        contract_address: str,
        abi: List[Dict],
        function_name: str,
        args: List = None,
        value: int = 0,
        gas_limit: int = None,
        gas_price: int = None,
        retry_count: int = 0,
        max_retries: int = 2
    ) -> Optional[Dict]:
        """
        Internal method with retry logic for contract function calls.
        """
        if not self.w3 or not self.account:
            logger.error("Web3 not initialized or account not available")
            return None

        try:
            contract = self.create_contract_instance(contract_address, abi)
            if not contract:
                return None

            # Get the function
            function = getattr(contract.functions, function_name)
            if not function:
                logger.error(f"Function {function_name} not found in contract")
                return None

            # Call with arguments
            function_call = function(*args if args else [])

            # Estimate gas if not provided
            if not gas_limit:
                try:
                    gas_limit = function_call.estimate_gas({
                        'from': self.account.address,
                        'value': value
                    })
                    gas_limit = int(gas_limit * 1.2)  # Add 20% buffer
                except Exception as e:
                    logger.warning(f"Failed to estimate gas: {str(e)}")
                    gas_limit = 200000  # Default gas limit

            # Get gas price if not provided
            if not gas_price:
                gas_price = self.get_optimal_gas_price()

            # Build transaction
            transaction_params = {
                'from': self.account.address,
                'gas': gas_limit,
                'gasPrice': gas_price,
                'value': value,
                'nonce': self.w3.eth.get_transaction_count(self.account.address),
            }

            transaction_data = function_call.build_transaction(transaction_params)

            # Sign and send transaction
            signed_txn = self.w3.eth.account.sign_transaction(transaction_data, self.account.key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)

            logger.info(f"Transaction sent: {tx_hash.hex()}")

            # Wait for transaction receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)

            return {
                'transaction_hash': tx_hash.hex(),
                'status': receipt['status'],
                'gas_used': receipt['gasUsed'],
                'transaction_fee': receipt['gasUsed'] * gas_price / 10**18,
                'block_number': receipt['blockNumber'],
                'receipt': dict(receipt)
            }

        except ContractLogicError as e:
            # Contract logic errors are not connection issues, don't retry
            logger.error(f"Contract logic error calling {function_name}: {str(e)}")
            return {'status': 0, 'error': f"Contract error: {str(e)}"}

        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout,
                ConnectionRefusedError, TimeoutError) as e:
            # Connection error - try failover
            logger.warning(f"Connection error calling {function_name}: {str(e)}")

            if retry_count < max_retries:
                logger.info(f"Attempting RPC failover (retry {retry_count + 1}/{max_retries})")
                if self.reconnect_with_failover():
                    return self._call_contract_function_with_retry(
                        contract_address, abi, function_name, args, value,
                        gas_limit, gas_price, retry_count + 1, max_retries
                    )

            logger.error(f"All retry attempts failed for {function_name}")
            return {'status': 0, 'error': f"Connection error after {max_retries} retries: {str(e)}"}

        except Exception as e:
            error_str = str(e).lower()
            # Check if this looks like a connection error
            if any(x in error_str for x in ['connection', 'timeout', 'refused', 'unavailable']):
                if retry_count < max_retries:
                    logger.info(f"Attempting RPC failover for connection-like error")
                    if self.reconnect_with_failover():
                        return self._call_contract_function_with_retry(
                            contract_address, abi, function_name, args, value,
                            gas_limit, gas_price, retry_count + 1, max_retries
                        )

            logger.error(f"Error calling contract function {function_name}: {str(e)}")
            return {'status': 0, 'error': str(e)}
    
    def read_contract_function(
        self,
        contract_address: str,
        abi: List[Dict],
        function_name: str,
        args: List = None
    ) -> Any:
        """
        Call a read-only contract function (view/pure function).
        
        Returns the function result directly.
        """
        if not self.w3:
            return None
        
        try:
            contract = self.create_contract_instance(contract_address, abi)
            if not contract:
                return None
            
            # Get the function
            function = getattr(contract.functions, function_name)
            if not function:
                logger.error(f"Function {function_name} not found in contract")
                return None
            
            # Call with arguments
            result = function(*args if args else []).call()
            return result
            
        except Exception as e:
            logger.error(f"Error reading contract function {function_name}: {str(e)}")
            return None
    
    def get_transaction_receipt(self, tx_hash: str) -> Optional[Dict]:
        """Get transaction receipt from blockchain."""
        if not self.w3:
            return None
        
        try:
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            return dict(receipt)
        except TransactionNotFound:
            logger.warning(f"Transaction not found: {tx_hash}")
            return None
        except Exception as e:
            logger.error(f"Error getting transaction receipt: {str(e)}")
            return None
    
    def get_transaction_details(self, tx_hash: str) -> Optional[Dict]:
        """Get full transaction details including receipt."""
        if not self.w3:
            return None
        
        try:
            # Get transaction
            tx = self.w3.eth.get_transaction(tx_hash)
            tx_dict = dict(tx)
            
            # Get receipt if transaction is mined
            try:
                receipt = self.w3.eth.get_transaction_receipt(tx_hash)
                tx_dict['receipt'] = dict(receipt)
                tx_dict['status'] = receipt['status']
                tx_dict['gas_used'] = receipt['gasUsed']
            except TransactionNotFound:
                tx_dict['receipt'] = None
                tx_dict['status'] = None
                tx_dict['gas_used'] = None
            
            return tx_dict
            
        except Exception as e:
            logger.error(f"Error getting transaction details: {str(e)}")
            return None
    
    def get_current_block_number(self) -> Optional[int]:
        """Get current block number."""
        if not self.w3:
            return None
        
        try:
            return self.w3.eth.block_number
        except Exception as e:
            logger.error(f"Error getting current block number: {str(e)}")
            return None
    
    def get_token_balance(self, contract_address: str, abi: List[Dict], wallet_address: str, token_id: int = None) -> Optional[Decimal]:
        """
        Get token balance for an address.
        
        For ERC-1155 tokens, token_id is required.
        For ERC-20 tokens, token_id should be None.
        """
        try:
            contract = self.create_contract_instance(contract_address, abi)
            if not contract:
                return None
            
            wallet_address = to_checksum_address(wallet_address)
            
            if token_id is not None:
                # ERC-1155
                balance = contract.functions.balanceOf(wallet_address, token_id).call()
            else:
                # ERC-20
                balance = contract.functions.balanceOf(wallet_address).call()
            
            return Decimal(str(balance))
            
        except Exception as e:
            logger.error(f"Error getting token balance: {str(e)}")
            return None
    
    def get_optimal_gas_price(self) -> int:
        """
        Get optimal gas price for current network conditions.
        
        Uses network-specific gas price or falls back to Web3 estimation.
        """
        if not self.w3:
            return 20000000000  # 20 Gwei default
        
        try:
            # Try to get latest gas tracker data
            latest_gas = GasTracker.objects.filter(network=self.network).first()
            if latest_gas and (timezone.now() - latest_gas.timestamp).seconds < 300:  # 5 minutes
                return int(latest_gas.standard_gas_price)
            
            # Fall back to network estimation
            if self.network.supports_eip1559:
                # Use EIP-1559 gas pricing
                latest_block = self.w3.eth.get_block('latest')
                base_fee = latest_block.get('baseFeePerGas', 0)
                priority_fee = 2000000000  # 2 Gwei priority fee
                return base_fee + priority_fee
            else:
                # Use legacy gas pricing
                gas_price = self.w3.eth.gas_price
                return gas_price
                
        except Exception as e:
            logger.warning(f"Error getting optimal gas price: {str(e)}")
            return self.w3.eth.gas_price if self.w3 else 20000000000
    
    def update_gas_prices(self) -> bool:
        """Update gas price tracking for the current network."""
        if not self.w3 or not self.network:
            return False
        
        try:
            if self.network.supports_eip1559:
                # EIP-1559 networks
                latest_block = self.w3.eth.get_block('latest')
                base_fee = latest_block.get('baseFeePerGas', 0)
                
                # Estimate different speed tiers
                slow_gas = base_fee + 1000000000  # 1 Gwei priority
                standard_gas = base_fee + 2000000000  # 2 Gwei priority
                fast_gas = base_fee + 5000000000  # 5 Gwei priority
                
                GasTracker.objects.create(
                    network=self.network,
                    slow_gas_price=slow_gas,
                    standard_gas_price=standard_gas,
                    fast_gas_price=fast_gas,
                    base_fee=base_fee,
                    priority_fee=2000000000
                )
            else:
                # Legacy networks
                current_gas = self.w3.eth.gas_price
                
                GasTracker.objects.create(
                    network=self.network,
                    slow_gas_price=int(current_gas * 0.8),
                    standard_gas_price=current_gas,
                    fast_gas_price=int(current_gas * 1.5)
                )
            
            logger.info(f"Updated gas prices for {self.network.name}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating gas prices: {str(e)}")
            return False
    
    def monitor_transaction(self, tx_hash: str) -> Dict:
        """
        Monitor a transaction until it's confirmed.
        
        Returns status updates and final confirmation details.
        """
        if not self.w3:
            return {'status': 'error', 'message': 'Web3 not initialized'}
        
        try:
            # Initial status
            status = {
                'tx_hash': tx_hash,
                'status': 'pending',
                'confirmations': 0,
                'required_confirmations': self.network.block_confirmation_count
            }
            
            # Wait for transaction to be mined
            try:
                receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)
                if receipt['status'] == 0:
                    status.update({
                        'status': 'failed',
                        'block_number': receipt['blockNumber'],
                        'gas_used': receipt['gasUsed']
                    })
                    return status
            except Exception as e:
                status.update({
                    'status': 'timeout',
                    'message': f'Transaction timed out: {str(e)}'
                })
                return status
            
            # Monitor confirmations
            block_number = receipt['blockNumber']
            status.update({
                'status': 'mined',
                'block_number': block_number,
                'gas_used': receipt['gasUsed']
            })
            
            # Wait for required confirmations
            required_confirmations = self.network.block_confirmation_count
            while True:
                current_block = self.w3.eth.block_number
                confirmations = current_block - block_number + 1
                status['confirmations'] = confirmations
                
                if confirmations >= required_confirmations:
                    status['status'] = 'confirmed'
                    break
                
                # Wait for next block
                asyncio.sleep(self.network.average_block_time)
            
            return status
            
        except Exception as e:
            logger.error(f"Error monitoring transaction: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    def get_contract_events(
        self,
        contract_address: str,
        abi: List[Dict],
        event_name: str,
        from_block: int = None,
        to_block: int = None,
        argument_filters: Dict = None
    ) -> List[Dict]:
        """
        Get contract events from blockchain.
        
        Returns list of decoded events matching the criteria.
        """
        if not self.w3:
            return []
        
        try:
            contract = self.create_contract_instance(contract_address, abi)
            if not contract:
                return []
            
            # Get event filter
            event = getattr(contract.events, event_name)
            
            # Set block range
            if from_block is None:
                from_block = 'earliest'
            if to_block is None:
                to_block = 'latest'
            
            # Create filter
            event_filter = event.create_filter(
                fromBlock=from_block,
                toBlock=to_block,
                argument_filters=argument_filters or {}
            )
            
            # Get events
            events = event_filter.get_all_entries()
            
            # Decode events
            decoded_events = []
            for event in events:
                decoded_event = {
                    'event': event['event'],
                    'args': dict(event['args']),
                    'transaction_hash': event['transactionHash'].hex(),
                    'block_number': event['blockNumber'],
                    'log_index': event['logIndex'],
                    'topics': [topic.hex() for topic in event['topics']],
                    'data': event['data']
                }
                decoded_events.append(decoded_event)
            
            return decoded_events
            
        except Exception as e:
            logger.error(f"Error getting contract events: {str(e)}")
            return []
    
    def decode_transaction_input(self, tx_hash: str, abi: List[Dict]) -> Optional[Dict]:
        """
        Decode transaction input data using contract ABI.
        
        Returns decoded function name and parameters.
        """
        if not self.w3:
            return None
        
        try:
            # Get transaction
            tx = self.w3.eth.get_transaction(tx_hash)
            if not tx['input'] or tx['input'] == '0x':
                return None
            
            # Create contract instance for decoding
            contract = self.w3.eth.contract(abi=abi)
            
            # Decode input
            decoded = contract.decode_function_input(tx['input'])
            function = decoded[0]
            inputs = decoded[1]
            
            return {
                'function_name': function.function_identifier,
                'function_signature': function.selector.hex(),
                'inputs': dict(inputs)
            }
            
        except Exception as e:
            logger.error(f"Error decoding transaction input: {str(e)}")
            return None
    
    def estimate_gas(
        self,
        contract_address: str,
        abi: List[Dict],
        function_name: str,
        args: List = None,
        value: int = 0,
        from_address: str = None
    ) -> Optional[int]:
        """Estimate gas required for a contract function call."""
        if not self.w3:
            return None
        
        try:
            contract = self.create_contract_instance(contract_address, abi)
            if not contract:
                return None
            
            function = getattr(contract.functions, function_name)
            function_call = function(*args if args else [])
            
            estimate = function_call.estimate_gas({
                'from': from_address or self.account.address if self.account else None,
                'value': value
            })
            
            return estimate
            
        except Exception as e:
            logger.error(f"Error estimating gas: {str(e)}")
            return None
    
    def get_network_info(self) -> Dict:
        """Get current network information and status."""
        if not self.w3 or not self.network:
            return {}
        
        try:
            current_block = self.w3.eth.block_number
            latest_block = self.w3.eth.get_block('latest')
            gas_price = self.w3.eth.gas_price
            
            return {
                'network_name': self.network.name,
                'chain_id': self.w3.eth.chain_id,
                'current_block': current_block,
                'block_timestamp': latest_block['timestamp'],
                'gas_price': gas_price,
                'gas_price_gwei': gas_price / 10**9,
                'connected': self.w3.is_connected()
            }
            
        except Exception as e:
            logger.error(f"Error getting network info: {str(e)}")
            return {}


class ContractManager:
    """
    High-level contract management for real estate tokenization.
    
    Provides specialized methods for property contract operations.
    """
    
    def __init__(self, network_id: str):
        self.web3_service = Web3Service(network_id)
        self.network = self.web3_service.network
    
    def deploy_property_token_contract(
        self,
        property_id: str,
        total_supply: int,
        token_price: Decimal,
        property_uri: str,
        multi_sig_owners: List[str],
        **kwargs
    ) -> Optional[SmartContract]:
        """Deploy a new property token contract."""
        if not self.web3_service.w3:
            logger.error("Web3 service not initialized")
            return None
        
        try:
            # Load contract ABI and bytecode (these would be loaded from files)
            contract_abi = self._load_real_estate_token_abi()
            contract_bytecode = self._load_real_estate_token_bytecode()
            
            # Prepare constructor arguments
            constructor_args = [
                property_uri,
                multi_sig_owners,
                2  # Required confirmations
            ]
            
            # Deploy contract
            deployment_result = self.web3_service.deploy_contract(
                contract_name="RealEstateToken",
                abi=contract_abi,
                bytecode=contract_bytecode,
                constructor_args=constructor_args,
                gas_limit=kwargs.get('gas_limit'),
                gas_price=kwargs.get('gas_price')
            )
            
            if not deployment_result:
                return None
            
            # Save contract to database
            with transaction.atomic():
                from properties.models import Property
                property_obj = Property.objects.get(id=property_id)
                
                contract = SmartContract.objects.create(
                    network=self.network,
                    property_reference=property_obj,
                    contract_type='real_estate_token',
                    contract_address=deployment_result['contract_address'],
                    contract_name=f"Property Token - {property_obj.title}",
                    abi=contract_abi,
                    bytecode=contract_bytecode,
                    deployer_address=self.web3_service.account.address,
                    deployment_transaction=deployment_result['transaction_hash'],
                    deployment_block=deployment_result['block_number'],
                    deployment_gas_used=deployment_result['gas_used'],
                    deployment_cost=Decimal(str(deployment_result['deployment_cost'])),
                    status='deployed',
                    admin_addresses=multi_sig_owners,
                    constructor_args={
                        'property_uri': property_uri,
                        'multi_sig_owners': multi_sig_owners,
                        'required_confirmations': 2
                    }
                )
                
                # Update property with contract address
                property_obj.smart_contract_address = deployment_result['contract_address']
                property_obj.save(update_fields=['smart_contract_address'])
                
                logger.info(f"Deployed property token contract for {property_obj.title}")
                return contract
            
        except Exception as e:
            logger.error(f"Error deploying property token contract: {str(e)}")
            return None
    
    def mint_property_tokens(
        self,
        contract_address: str,
        investor_address: str,
        property_id: str,
        token_amount: int,
        is_installment: bool = False,
        total_installments: int = 0
    ) -> Optional[TokenTransaction]:
        """Mint property tokens for an investor."""
        try:
            contract = SmartContract.objects.get(
                contract_address=contract_address,
                network=self.network
            )
            
            # Call mint function
            result = self.web3_service.call_contract_function(
                contract_address=contract_address,
                abi=contract.abi,
                function_name='mintTokens',
                args=[
                    int(property_id),  # tokenId
                    investor_address,  # investor
                    token_amount,      # amount
                    is_installment,    # isInstallment
                    total_installments # totalInstallments
                ]
            )
            
            if not result:
                return None
            
            # Create transaction record
            from accounts.models import User
            from properties.models import Property
            
            user = User.objects.filter(wallet_address=investor_address).first()
            property_obj = Property.objects.get(id=property_id)
            
            tx_record = TokenTransaction.objects.create(
                contract=contract,
                property_reference=property_obj,
                user=user,
                transaction_type='mint',
                transaction_hash=result['transaction_hash'],
                from_address=self.web3_service.account.address,
                to_address=investor_address,
                token_id=int(property_id),
                token_amount=Decimal(str(token_amount)),
                gas_used=result['gas_used'],
                transaction_fee=Decimal(str(result['transaction_fee'])),
                block_number=result['block_number'],
                status='confirmed' if result['status'] == 1 else 'failed'
            )
            
            logger.info(f"Minted {token_amount} tokens for {investor_address}")
            return tx_record
            
        except Exception as e:
            logger.error(f"Error minting property tokens: {str(e)}")
            return None
    
    def _load_real_estate_token_abi(self) -> List[Dict]:
        """Load Real Estate Token contract ABI."""
        # In a real implementation, this would load from a file
        # For now, return a basic structure
        return [
            {
                "inputs": [
                    {"internalType": "string", "name": "uri", "type": "string"},
                    {"internalType": "address[]", "name": "_owners", "type": "address[]"},
                    {"internalType": "uint256", "name": "_requiredConfirmations", "type": "uint256"}
                ],
                "stateMutability": "nonpayable",
                "type": "constructor"
            },
            # Add more ABI entries as needed
        ]
    
    def _load_real_estate_token_bytecode(self) -> str:
        """Load Real Estate Token contract bytecode."""
        # In a real implementation, this would load from a file
        return "0x608060405234801561001057600080fd5b50..."  # Placeholder bytecode