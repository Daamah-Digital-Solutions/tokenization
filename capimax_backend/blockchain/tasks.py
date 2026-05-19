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
    'verify_contract_states',
    'reconcile_token_balances',
    'monitor_pending_transactions',
]


# ===========================================================================
# Token balance reconciliation
# ---------------------------------------------------------------------------
# Compares the off-chain TokenBalance ledger against on-chain `balanceOf`
# for every active (contract, user) pair. Any drift is logged at ERROR and
# persisted to TokenBalanceDrift so operations can investigate.
# ===========================================================================

@shared_task(bind=True, rate_limit='1/m')
def reconcile_token_balances(self, max_records: int = 500):
    """Walk all active TokenBalance rows and verify on-chain agreement."""
    from .models import TokenBalance
    from .services.web3_service import Web3Service

    web3_service = Web3Service()
    checked = 0
    drift = 0

    qs = TokenBalance.objects.filter(balance__gt=0).select_related(
        'contract', 'user', 'property_reference'
    )[:max_records]

    for tb in qs:
        checked += 1
        try:
            if not web3_service.initialize_network(str(tb.contract.network_id)):
                logger.warning(
                    'Skip reconcile — network unreachable',
                    extra={'token_balance_id': str(tb.pk)}
                )
                continue

            on_chain = web3_service.call_contract_view(
                contract_address=tb.contract.contract_address,
                abi=tb.contract.abi,
                function_name='balanceOf',
                args=[tb.wallet_address, tb.token_id],
            )
            if on_chain is None:
                continue

            on_chain_int = int(on_chain)
            db_int = int(tb.balance or 0)
            if on_chain_int != db_int:
                drift += 1
                logger.error(
                    'Token balance drift detected',
                    extra={
                        'token_balance_id': str(tb.pk),
                        'wallet': tb.wallet_address,
                        'token_id': tb.token_id,
                        'db_balance': db_int,
                        'chain_balance': on_chain_int,
                        'delta': on_chain_int - db_int,
                    },
                )
                _persist_drift_record(tb, db_int, on_chain_int)
        except Exception:
            logger.exception(
                'Error during token balance reconciliation',
                extra={'token_balance_id': str(tb.pk)},
            )

    return {'checked': checked, 'drift': drift}


def _persist_drift_record(token_balance, db_value: int, chain_value: int) -> None:
    """Persist drift to a dedicated audit table if the model is available."""
    try:
        from .models import TokenBalanceDrift
    except ImportError:
        return
    try:
        TokenBalanceDrift.objects.create(
            token_balance=token_balance,
            db_value=db_value,
            chain_value=chain_value,
            delta=chain_value - db_value,
        )
    except Exception:
        logger.exception('Failed to persist TokenBalanceDrift record')


# ===========================================================================
# Confirmation watcher
# ---------------------------------------------------------------------------
# For every TokenTransaction in `submitted` status, query the chain for the
# transaction receipt and update status to `confirmed` once we hit the
# network's required confirmations. Without this loop, transactions stay
# perpetually 'submitted' even after they land on-chain.
# ===========================================================================

@shared_task(bind=True, rate_limit='1/m')
def monitor_pending_transactions(self, max_records: int = 200):
    from .models import TokenTransaction
    from .services.web3_service import Web3Service

    web3_service = Web3Service()
    confirmed = 0
    failed = 0

    pending = TokenTransaction.objects.filter(status='submitted').order_by('created_at')[:max_records]
    for tx in pending:
        try:
            if not web3_service.initialize_network(str(tx.contract.network_id)):
                continue
            receipt = web3_service.get_transaction_receipt(tx.transaction_hash)
            if receipt is None:
                continue  # not mined yet
            if receipt.get('status') == 1:
                # Wait for required confirmations
                current_block = web3_service.get_block_number()
                required = getattr(tx.contract.network, 'block_confirmation_count', 12)
                if current_block - (receipt.get('blockNumber') or 0) >= required:
                    tx.status = 'confirmed'
                    tx.block_number = receipt.get('blockNumber')
                    tx.gas_used = receipt.get('gasUsed')
                    tx.save(update_fields=['status', 'block_number', 'gas_used'])
                    confirmed += 1
            else:
                tx.status = 'failed'
                tx.save(update_fields=['status'])
                failed += 1
        except Exception:
            logger.exception(
                'Error while polling transaction',
                extra={'tx_hash': tx.transaction_hash},
            )

    return {'confirmed': confirmed, 'failed': failed}


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