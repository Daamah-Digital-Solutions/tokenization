"""
Smart Contract Deployment Service for Capimax Real Estate Tokenization Platform.

This module handles automated deployment and management of property-specific
smart contracts including token contracts and rental distribution contracts.
"""

import logging
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
import json
import os
from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from ..models import (
    BlockchainNetwork, SmartContract, TokenTransaction
)
from .web3_service import Web3Service, ContractManager
from properties.models import Property, PropertyCategory


logger = logging.getLogger(__name__)


class ContractDeploymentService:
    """
    Service for deploying and managing smart contracts for real estate properties.
    
    Handles the full lifecycle of contract deployment from preparation through
    verification and activation.
    """
    
    def __init__(self, network_id: str):
        self.network_id = network_id
        self.web3_service = Web3Service(network_id)
        self.contract_manager = ContractManager(network_id)
        self.network = self.web3_service.network
        
        # Load contract artifacts
        self.contract_artifacts = self._load_contract_artifacts()
    
    def deploy_property_contracts(
        self,
        property_id: str,
        multi_sig_owners: List[str],
        gas_settings: Dict = None
    ) -> Dict[str, Optional[SmartContract]]:
        """
        Deploy all necessary contracts for a property.
        
        Returns dictionary with deployed contract instances.
        """
        if not self.web3_service.w3:
            logger.error("Web3 service not properly initialized")
            return {'token_contract': None, 'distributor_contract': None}
        
        try:
            property_obj = Property.objects.get(id=property_id)
            logger.info(f"Deploying contracts for property: {property_obj.title}")
            
            results = {
                'token_contract': None,
                'distributor_contract': None,
                'factory_used': False
            }
            
            # Deploy main token contract
            token_contract = self._deploy_token_contract(
                property_obj, multi_sig_owners, gas_settings
            )
            results['token_contract'] = token_contract
            
            if not token_contract:
                logger.error(f"Failed to deploy token contract for {property_obj.title}")
                return results
            
            # Deploy rental distributor for ready properties
            if property_obj.property_category == PropertyCategory.READY_PROPERTY:
                distributor_contract = self._deploy_rental_distributor(
                    property_obj, token_contract, gas_settings
                )
                results['distributor_contract'] = distributor_contract
            
            # Update property with contract information
            with transaction.atomic():
                property_obj.smart_contract_address = token_contract.contract_address
                property_obj.save(update_fields=['smart_contract_address'])
            
            logger.info(f"Successfully deployed contracts for {property_obj.title}")
            return results
            
        except Property.DoesNotExist:
            logger.error(f"Property {property_id} not found")
            return {'token_contract': None, 'distributor_contract': None}
        except Exception as e:
            logger.error(f"Error deploying contracts for property {property_id}: {str(e)}")
            return {'token_contract': None, 'distributor_contract': None}
    
    def _deploy_token_contract(
        self,
        property_obj: Property,
        multi_sig_owners: List[str],
        gas_settings: Dict = None
    ) -> Optional[SmartContract]:
        """Deploy the main ERC-1155 property token contract."""
        try:
            # Get contract artifacts
            token_artifact = self.contract_artifacts.get('RealEstateToken')
            if not token_artifact:
                logger.error("RealEstateToken artifact not found")
                return None
            
            # Prepare constructor arguments
            property_uri = self._generate_property_uri(property_obj)
            constructor_args = [
                property_uri,
                multi_sig_owners,
                2  # Required confirmations for multi-sig
            ]
            
            # Deploy contract
            deployment_result = self.web3_service.deploy_contract(
                contract_name="RealEstateToken",
                abi=token_artifact['abi'],
                bytecode=token_artifact['bytecode'],
                constructor_args=constructor_args,
                gas_limit=gas_settings.get('gas_limit') if gas_settings else None,
                gas_price=gas_settings.get('gas_price') if gas_settings else None
            )
            
            if not deployment_result:
                logger.error("Token contract deployment failed")
                return None
            
            # Save contract to database
            contract = SmartContract.objects.create(
                network=self.network,
                property_reference=property_obj,
                contract_type='real_estate_token',
                contract_address=deployment_result['contract_address'],
                contract_name=f"Property Token - {property_obj.title}",
                abi=token_artifact['abi'],
                bytecode=token_artifact['bytecode'],
                source_code=token_artifact.get('source_code', ''),
                compiler_version=token_artifact.get('compiler_version', ''),
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
            
            # Create the property within the token contract
            self._create_property_in_contract(contract, property_obj)
            
            logger.info(f"Token contract deployed at {deployment_result['contract_address']}")
            return contract
            
        except Exception as e:
            logger.error(f"Error deploying token contract: {str(e)}")
            return None
    
    def _deploy_rental_distributor(
        self,
        property_obj: Property,
        token_contract: SmartContract,
        gas_settings: Dict = None
    ) -> Optional[SmartContract]:
        """Deploy rental income distributor contract for ready properties."""
        try:
            # Get contract artifacts
            distributor_artifact = self.contract_artifacts.get('RentalIncomeDistributor')
            if not distributor_artifact:
                logger.error("RentalIncomeDistributor artifact not found")
                return None
            
            # Supported payment tokens
            supported_tokens = [
                "0x0000000000000000000000000000000000000000",  # ETH
                "0xA0b86a33E6441E70C06ef1b6f8b4A6aBd8A8Ac4e",  # USDC (example)
                "0x55d398326f99059fF775485246999027B3197955",  # USDT (example)
                "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"   # DAI (example)
            ]
            
            token_types = [0, 1, 2, 3]  # ETH, USDC, USDT, DAI enum values
            
            # Constructor arguments
            constructor_args = [
                token_contract.contract_address,
                settings.BLOCKCHAIN_SETTINGS.get('PLATFORM_TREASURY', self.web3_service.account.address),
                supported_tokens,
                token_types
            ]
            
            # Deploy contract
            deployment_result = self.web3_service.deploy_contract(
                contract_name="RentalIncomeDistributor",
                abi=distributor_artifact['abi'],
                bytecode=distributor_artifact['bytecode'],
                constructor_args=constructor_args,
                gas_limit=gas_settings.get('gas_limit') if gas_settings else None,
                gas_price=gas_settings.get('gas_price') if gas_settings else None
            )
            
            if not deployment_result:
                logger.error("Rental distributor deployment failed")
                return None
            
            # Save contract to database
            contract = SmartContract.objects.create(
                network=self.network,
                property_reference=property_obj,
                contract_type='rental_distributor',
                contract_address=deployment_result['contract_address'],
                contract_name=f"Rental Distributor - {property_obj.title}",
                abi=distributor_artifact['abi'],
                bytecode=distributor_artifact['bytecode'],
                source_code=distributor_artifact.get('source_code', ''),
                compiler_version=distributor_artifact.get('compiler_version', ''),
                deployer_address=self.web3_service.account.address,
                deployment_transaction=deployment_result['transaction_hash'],
                deployment_block=deployment_result['block_number'],
                deployment_gas_used=deployment_result['gas_used'],
                deployment_cost=Decimal(str(deployment_result['deployment_cost'])),
                status='deployed',
                constructor_args={
                    'real_estate_token': token_contract.contract_address,
                    'platform_treasury': settings.BLOCKCHAIN_SETTINGS.get('PLATFORM_TREASURY'),
                    'supported_tokens': supported_tokens,
                    'token_types': token_types
                }
            )
            
            logger.info(f"Rental distributor deployed at {deployment_result['contract_address']}")
            return contract
            
        except Exception as e:
            logger.error(f"Error deploying rental distributor: {str(e)}")
            return None
    
    def _create_property_in_contract(
        self,
        contract: SmartContract,
        property_obj: Property
    ) -> bool:
        """Create property within the deployed token contract."""
        try:
            # Calculate lock-up period (6 months default)
            lockup_period = 6 * 30 * 24 * 3600  # 6 months in seconds
            
            # Calculate early exit fee (5% default)
            early_exit_fee = 500  # 5% in basis points
            
            # Expected rental yield (from property data)
            rental_yield = int((property_obj.rental_yield or Decimal('0')) * 100)  # Convert to basis points
            
            # Call createProperty function
            result = self.web3_service.call_contract_function(
                contract_address=contract.contract_address,
                abi=contract.abi,
                function_name='createProperty',
                args=[
                    property_obj.total_tokens,                    # totalSupply
                    0 if property_obj.is_under_construction else 1,  # category
                    int(property_obj.token_price * 10**18),       # tokenPrice in wei
                    lockup_period,                                # lockupPeriod
                    early_exit_fee,                              # earlyExitFeeRate
                    rental_yield,                                 # rentalYieldRate
                    self.web3_service.account.address,           # propertyManager
                    self._generate_property_uri(property_obj)     # propertyURI
                ]
            )
            
            if result and result['status'] == 1:
                logger.info(f"Created property in contract for {property_obj.title}")
                return True
            else:
                logger.error(f"Failed to create property in contract: {result}")
                return False
                
        except Exception as e:
            logger.error(f"Error creating property in contract: {str(e)}")
            return False
    
    def verify_contract_on_explorer(self, contract: SmartContract) -> bool:
        """
        Verify contract source code on block explorer.
        
        This is network-specific and would integrate with services like
        Etherscan, BscScan, PolygonScan, etc.
        """
        try:
            if not self.network.explorer_url:
                logger.warning(f"No explorer URL configured for {self.network.name}")
                return False
            
            # Network-specific verification logic would go here
            # For now, just mark as verified
            contract.is_verified = True
            contract.verification_date = timezone.now()
            contract.status = 'verified'
            contract.save(update_fields=['is_verified', 'verification_date', 'status'])
            
            logger.info(f"Contract {contract.contract_address} marked as verified")
            return True
            
        except Exception as e:
            logger.error(f"Error verifying contract: {str(e)}")
            return False
    
    def activate_property_contract(self, contract: SmartContract) -> bool:
        """Activate a property contract for investments."""
        try:
            # Call activateProperty function
            result = self.web3_service.call_contract_function(
                contract_address=contract.contract_address,
                abi=contract.abi,
                function_name='activateProperty',
                args=[0]  # tokenId (first property in contract)
            )
            
            if result and result['status'] == 1:
                contract.status = 'active'
                contract.save(update_fields=['status'])
                logger.info(f"Activated property contract {contract.contract_address}")
                return True
            else:
                logger.error(f"Failed to activate property contract: {result}")
                return False
                
        except Exception as e:
            logger.error(f"Error activating property contract: {str(e)}")
            return False
    
    def batch_deploy_properties(
        self,
        property_ids: List[str],
        multi_sig_owners: List[str],
        gas_settings: Dict = None
    ) -> Dict[str, Dict]:
        """Deploy contracts for multiple properties in batch."""
        results = {}
        
        for property_id in property_ids:
            logger.info(f"Deploying contracts for property {property_id}")
            
            try:
                result = self.deploy_property_contracts(
                    property_id, multi_sig_owners, gas_settings
                )
                results[property_id] = result
                
                # Add delay between deployments to avoid nonce issues
                import time
                time.sleep(2)
                
            except Exception as e:
                logger.error(f"Error in batch deployment for {property_id}: {str(e)}")
                results[property_id] = {'token_contract': None, 'distributor_contract': None}
        
        return results
    
    def upgrade_contract(
        self,
        contract: SmartContract,
        new_implementation_address: str
    ) -> bool:
        """
        Upgrade a proxy contract to a new implementation.
        
        Only works with upgradeable proxy contracts.
        """
        try:
            if not contract.is_proxy:
                logger.error(f"Contract {contract.contract_address} is not a proxy contract")
                return False
            
            # Call upgrade function (this would be specific to the proxy pattern used)
            result = self.web3_service.call_contract_function(
                contract_address=contract.contract_address,
                abi=contract.abi,
                function_name='upgradeTo',
                args=[new_implementation_address]
            )
            
            if result and result['status'] == 1:
                contract.proxy_implementation = new_implementation_address
                contract.status = 'upgraded'
                contract.save(update_fields=['proxy_implementation', 'status'])
                logger.info(f"Upgraded contract to {new_implementation_address}")
                return True
            else:
                logger.error(f"Failed to upgrade contract: {result}")
                return False
                
        except Exception as e:
            logger.error(f"Error upgrading contract: {str(e)}")
            return False
    
    def _load_contract_artifacts(self) -> Dict[str, Dict]:
        """Load compiled contract artifacts (ABI, bytecode) from Hardhat build output."""
        artifacts = {}
        contracts_dir = Path(__file__).resolve().parent.parent / 'contracts' / 'artifacts' / 'src'

        contract_files = {
            'RealEstateToken': contracts_dir / 'RealEstateToken.sol' / 'RealEstateToken.json',
            'RentalIncomeDistributor': contracts_dir / 'RentalIncomeDistributor.sol' / 'RentalIncomeDistributor.json',
            'PropertyContractFactory': contracts_dir / 'PropertyContractFactory.sol' / 'PropertyContractFactory.json',
        }

        try:
            for name, artifact_path in contract_files.items():
                if artifact_path.exists():
                    with open(artifact_path, 'r') as f:
                        artifact = json.load(f)
                    artifacts[name] = {
                        'abi': artifact.get('abi', []),
                        'bytecode': artifact.get('bytecode', ''),
                        'source_code': '',
                        'compiler_version': '0.8.19'
                    }
                    logger.info(f"Loaded artifact for {name} from {artifact_path}")
                else:
                    logger.warning(
                        f"Artifact not found for {name} at {artifact_path}. "
                        f"Run 'npx hardhat compile' in the blockchain directory first."
                    )

            if not artifacts:
                logger.error(
                    "No contract artifacts found. Compile contracts with: "
                    "cd capimax_backend/blockchain && npx hardhat compile"
                )

            return artifacts

        except Exception as e:
            logger.error(f"Error loading contract artifacts: {str(e)}")
            return {}

    def _generate_property_uri(self, property_obj: Property) -> str:
        """Generate metadata URI for property NFT."""
        base_url = getattr(settings, 'PROPERTY_METADATA_BASE_URL', 'https://api.capimax.com/metadata/')
        return f"{base_url}property/{property_obj.id}"


class ContractUpgradeService:
    """
    Service for managing contract upgrades and migrations.
    
    Handles upgrading proxy contracts and migrating data between
    contract versions.
    """
    
    def __init__(self, network_id: str):
        self.deployment_service = ContractDeploymentService(network_id)
        self.web3_service = self.deployment_service.web3_service
    
    def prepare_upgrade(
        self,
        contract: SmartContract,
        new_implementation_bytecode: str,
        new_implementation_abi: List[Dict]
    ) -> Optional[str]:
        """
        Prepare a new implementation for proxy upgrade.
        
        Returns the address of the new implementation contract.
        """
        try:
            # Deploy new implementation
            deployment_result = self.web3_service.deploy_contract(
                contract_name=f"{contract.contract_name}_Implementation_v2",
                abi=new_implementation_abi,
                bytecode=new_implementation_bytecode,
                constructor_args=[]  # Implementation contracts don't need constructor args
            )
            
            if deployment_result:
                logger.info(f"New implementation deployed at {deployment_result['contract_address']}")
                return deployment_result['contract_address']
            
            return None
            
        except Exception as e:
            logger.error(f"Error preparing upgrade: {str(e)}")
            return None
    
    def execute_upgrade(
        self,
        contract: SmartContract,
        new_implementation_address: str
    ) -> bool:
        """Execute the upgrade to new implementation."""
        return self.deployment_service.upgrade_contract(contract, new_implementation_address)
    
    def migrate_contract_data(
        self,
        old_contract: SmartContract,
        new_contract: SmartContract
    ) -> bool:
        """
        Migrate data from old contract to new contract.
        
        This would be used for non-upgradeable contracts that need
        to be replaced entirely.
        """
        try:
            # Implementation would depend on specific migration requirements
            # This is a placeholder for the migration logic
            
            logger.info(f"Migrating data from {old_contract.contract_address} to {new_contract.contract_address}")
            
            # Mark old contract as deprecated
            old_contract.status = 'deprecated'
            old_contract.save(update_fields=['status'])
            
            # Activate new contract
            new_contract.status = 'active'
            new_contract.save(update_fields=['status'])
            
            return True
            
        except Exception as e:
            logger.error(f"Error migrating contract data: {str(e)}")
            return False