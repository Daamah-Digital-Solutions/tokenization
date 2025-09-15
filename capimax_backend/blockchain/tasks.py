"""
Celery Tasks for Blockchain Operations.

This module defines all Celery tasks for automated blockchain operations
including monitoring, token processing, and rental income distribution.
"""

from celery import shared_task
from celery.schedules import crontab
from django.conf import settings
import logging

from .services.blockchain_monitoring_service import (
    monitor_blockchain_networks,
    resync_token_balances_task,
    process_pending_investments,
    auto_distribute_rental_income
)

logger = logging.getLogger(__name__)


# Re-export monitoring service tasks
__all__ = [
    'monitor_blockchain_networks',
    'resync_token_balances_task', 
    'process_pending_investments',
    'auto_distribute_rental_income',
    'cleanup_old_transactions',
    'update_gas_price_history',
    'verify_contract_states'
]


@shared_task(bind=True)
def cleanup_old_transactions(self):
    """Clean up old transaction records and events."""
    try:
        from django.utils import timezone
        from datetime import timedelta
        from .models import TokenTransaction, ContractEvent
        
        # Delete transaction records older than 1 year
        cutoff_date = timezone.now() - timedelta(days=365)
        
        old_transactions = TokenTransaction.objects.filter(
            created_at__lt=cutoff_date,
            status__in=['confirmed', 'failed']
        )
        
        transaction_count = old_transactions.count()
        old_transactions.delete()
        
        # Delete old events
        old_events = ContractEvent.objects.filter(
            created_at__lt=cutoff_date
        )
        
        event_count = old_events.count()
        old_events.delete()
        
        logger.info(f"Cleaned up {transaction_count} old transactions and {event_count} old events")
        return f"Cleanup completed: {transaction_count} transactions, {event_count} events removed"
        
    except Exception as e:
        logger.error(f"Error in cleanup_old_transactions task: {str(e)}")
        return f"Cleanup failed: {str(e)}"


@shared_task(bind=True)
def update_gas_price_history(self):
    """Update gas price history for all networks."""
    try:
        from .models import BlockchainNetwork, GasTracker
        from .services.web3_service import Web3Service
        
        networks = BlockchainNetwork.objects.filter(is_active=True)
        updated_count = 0
        
        for network in networks:
            try:
                web3_service = Web3Service(str(network.id))
                if web3_service.w3 and web3_service.w3.is_connected():
                    
                    # Get current gas prices
                    current_gas_price = web3_service.get_optimal_gas_price()
                    
                    # Create gas tracker record
                    GasTracker.objects.create(
                        network=network,
                        slow_gas_price=int(current_gas_price * 0.8),
                        standard_gas_price=current_gas_price,
                        fast_gas_price=int(current_gas_price * 1.2),
                        base_fee=None,  # Would be set for EIP-1559 networks
                        priority_fee=None
                    )
                    
                    updated_count += 1
                    
            except Exception as e:
                logger.error(f"Error updating gas prices for {network.name}: {str(e)}")
        
        return f"Updated gas prices for {updated_count} networks"
        
    except Exception as e:
        logger.error(f"Error in update_gas_price_history task: {str(e)}")
        return f"Gas price update failed: {str(e)}"


@shared_task(bind=True)
def verify_contract_states(self):
    """Verify that smart contract states match database records."""
    try:
        from .models import SmartContract, TokenBalance
        from .services.web3_service import Web3Service
        
        contracts = SmartContract.objects.filter(
            contract_type='real_estate_token',
            status='active'
        )
        
        verified_count = 0
        issues_found = 0
        
        for contract in contracts:
            try:
                web3_service = Web3Service(str(contract.network.id))
                
                # Verify contract is still active
                property_info = web3_service.read_contract_function(
                    contract.contract_address,
                    contract.abi,
                    'getPropertyInfo',
                    [0]  # First property token ID
                )
                
                if property_info:
                    total_supply, current_supply, category, status_code, token_price, rental_active = property_info
                    
                    # Check if database values match contract values
                    property_obj = contract.property_reference
                    if property_obj:
                        if property_obj.total_tokens != total_supply:
                            logger.warning(f"Token supply mismatch for {property_obj.title}: DB={property_obj.total_tokens}, Contract={total_supply}")
                            issues_found += 1
                        
                        # Update property with current contract state
                        property_obj.tokens_sold = current_supply
                        property_obj.rental_income_active = rental_active
                        property_obj.save(update_fields=['tokens_sold', 'rental_income_active'])
                
                verified_count += 1
                
            except Exception as e:
                logger.error(f"Error verifying contract {contract.contract_address}: {str(e)}")
                issues_found += 1
        
        return f"Verified {verified_count} contracts, found {issues_found} issues"
        
    except Exception as e:
        logger.error(f"Error in verify_contract_states task: {str(e)}")
        return f"Contract verification failed: {str(e)}"


# Celery Beat Schedule (to be added to Django settings)
CELERY_BEAT_SCHEDULE = {
    'monitor-blockchain-every-5-minutes': {
        'task': 'blockchain.tasks.monitor_blockchain_networks',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
        'options': {'queue': 'blockchain'}
    },
    'process-pending-investments-every-2-minutes': {
        'task': 'blockchain.tasks.process_pending_investments', 
        'schedule': crontab(minute='*/2'),  # Every 2 minutes
        'options': {'queue': 'blockchain'}
    },
    'resync-token-balances-hourly': {
        'task': 'blockchain.tasks.resync_token_balances_task',
        'schedule': crontab(minute=0),  # Every hour
        'options': {'queue': 'blockchain'}
    },
    'update-gas-prices-every-10-minutes': {
        'task': 'blockchain.tasks.update_gas_price_history',
        'schedule': crontab(minute='*/10'),  # Every 10 minutes
        'options': {'queue': 'blockchain'}
    },
    'verify-contract-states-daily': {
        'task': 'blockchain.tasks.verify_contract_states',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
        'options': {'queue': 'blockchain'}
    },
    'cleanup-old-data-weekly': {
        'task': 'blockchain.tasks.cleanup_old_transactions',
        'schedule': crontab(hour=3, minute=0, day_of_week=0),  # Weekly on Sunday at 3 AM
        'options': {'queue': 'blockchain'}
    },
    'auto-distribute-rental-income-daily': {
        'task': 'blockchain.tasks.auto_distribute_rental_income',
        'schedule': crontab(hour=9, minute=0),  # Daily at 9 AM
        'options': {'queue': 'blockchain'}
    },
}