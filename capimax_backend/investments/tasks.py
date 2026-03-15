"""
Celery tasks for investment processing.

Handles deferred token minting with retry logic and failure recovery.
"""

import logging
from celery import shared_task
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail

from .models import Investment, InvestmentStatus

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    max_retries=0,  # We handle retries manually via Investment model
    acks_late=True,
    time_limit=300,
    soft_time_limit=240,
)
def process_pending_mints(self):
    """
    Process all investments pending token minting.

    This task runs periodically (every 2 minutes) and processes investments
    that have confirmed payments but haven't had tokens minted yet.

    The minting flow:
    1. Find investments with status=PENDING_MINT where mint_scheduled_at <= now
    2. For each investment:
       a. Mark as MINTING
       b. Attempt blockchain mint
       c. On success: mark COMPLETED
       d. On failure: increment retry_count, schedule next retry or mark MINT_FAILED
    """
    # Find investments ready for minting
    ready_investments = Investment.objects.filter(
        status=InvestmentStatus.PENDING_MINT,
    ).filter(
        # Only process if scheduled time has passed (or not set)
        mint_scheduled_at__lte=timezone.now()
    ).select_related(
        'user', 'property_investment'
    ).order_by('mint_scheduled_at')[:50]  # Process in batches of 50

    processed = 0
    failed = 0

    for investment in ready_investments:
        try:
            process_single_mint.delay(str(investment.id))
            processed += 1
            logger.info(f"Queued mint task for investment {investment.id}")
        except Exception as e:
            logger.error(f"Failed to queue mint task for investment {investment.id}: {e}")
            failed += 1

    logger.info(
        f"process_pending_mints completed: "
        f"queued={processed}, failed_to_queue={failed}"
    )

    return {
        'processed': processed,
        'failed': failed,
    }


@shared_task(
    bind=True,
    acks_late=True,
    time_limit=120,
    soft_time_limit=100,
)
def process_single_mint(self, investment_id: str):
    """
    Process a single investment mint operation.

    This is called for each individual investment to provide isolation
    between mint operations - one failure won't affect others.
    """
    try:
        investment = Investment.objects.select_for_update().get(id=investment_id)
    except Investment.DoesNotExist:
        logger.error(f"Investment {investment_id} not found")
        return {'success': False, 'error': 'Investment not found'}

    # Double-check it's ready for minting
    if not investment.is_ready_for_mint():
        logger.info(f"Investment {investment_id} not ready for mint (status={investment.status})")
        return {'success': False, 'error': 'Not ready for mint'}

    # Check idempotency - if already has tx_hash, it's already minted
    if investment.transaction_hash:
        logger.warning(f"Investment {investment_id} already has tx_hash, skipping")
        investment.status = InvestmentStatus.COMPLETED
        investment.save(update_fields=['status'])
        return {'success': True, 'skipped': True, 'reason': 'Already minted'}

    # Mark as minting
    investment.mark_minting_started()

    try:
        # Attempt the actual mint
        result = _execute_blockchain_mint(investment)

        if result['success']:
            investment.mark_mint_success(
                tx_hash=result['transaction_hash'],
                tokens_minted=result['tokens_minted']
            )
            logger.info(
                f"Successfully minted {result['tokens_minted']} tokens "
                f"for investment {investment_id}. TX: {result['transaction_hash']}"
            )
            return {
                'success': True,
                'investment_id': str(investment_id),
                'tx_hash': result['transaction_hash'],
                'tokens_minted': result['tokens_minted'],
            }
        else:
            raise Exception(result.get('error', 'Unknown mint error'))

    except Exception as e:
        error_message = str(e)
        logger.error(f"Mint failed for investment {investment_id}: {error_message}")

        # Mark as failed (this handles retry scheduling)
        investment.mark_mint_failed(error_message)

        # If this was the final retry, send alert
        if investment.status == InvestmentStatus.MINT_FAILED:
            _send_mint_failure_alert(investment, error_message)

        return {
            'success': False,
            'investment_id': str(investment_id),
            'error': error_message,
            'retry_count': investment.mint_retry_count,
            'final_failure': investment.status == InvestmentStatus.MINT_FAILED,
        }


def _execute_blockchain_mint(investment: Investment) -> dict:
    """
    Execute the actual blockchain minting operation.

    Returns:
        dict with keys: success, transaction_hash, tokens_minted, error
    """
    try:
        # Import here to avoid circular imports
        from blockchain.services.web3_service import Web3Service

        property_obj = investment.property_investment
        user = investment.user

        # Check if property is tokenized
        if property_obj.status != 'tokenized' or not getattr(property_obj, 'smart_contract_address', None):
            return {
                'success': False,
                'error': 'Property is not tokenized or missing contract address'
            }

        # Check user has wallet address
        if not getattr(user, 'wallet_address', None):
            return {
                'success': False,
                'error': 'User does not have a wallet address configured'
            }

        # Initialize Web3 service
        web3_service = Web3Service()

        # Get the property's blockchain network
        from blockchain.models import SmartContract
        contract = SmartContract.objects.filter(
            property_reference=property_obj,
            contract_type='real_estate_token',
            status='active'
        ).first()

        if not contract:
            return {
                'success': False,
                'error': 'No active token contract found for property'
            }

        # Initialize network connection
        if not web3_service.initialize_network(str(contract.network_id)):
            return {
                'success': False,
                'error': 'Failed to connect to blockchain network'
            }

        # Calculate tokens to mint
        tokens_to_mint = investment.token_amount

        # Execute mint transaction
        result = web3_service.call_contract_function(
            contract_address=contract.contract_address,
            abi=contract.abi,
            function_name='mintTokens',
            args=[
                user.wallet_address,
                tokens_to_mint,
                0  # token_id (property token ID, usually 0 for single property contracts)
            ],
            gas_settings={
                'gas_limit': 500000,
                'gas_price': None  # Use automatic gas price
            }
        )

        if result and result.get('status') == 1:
            # Record the transaction
            from blockchain.models import TokenTransaction, TokenBalance

            TokenTransaction.objects.create(
                contract=contract,
                property_reference=property_obj,
                user=user,
                investment_reference=investment,
                transaction_type='mint',
                transaction_hash=result['transaction_hash'],
                from_address=web3_service.account.address if web3_service.account else '',
                to_address=user.wallet_address,
                token_amount=tokens_to_mint,
                status='confirmed',
                block_number=result.get('block_number'),
                gas_used=result.get('gas_used'),
            )

            # Update or create token balance
            token_balance, created = TokenBalance.objects.get_or_create(
                contract=contract,
                user=user,
                property_reference=property_obj,
                defaults={
                    'wallet_address': user.wallet_address,
                    'token_id': 0,
                    'balance': 0,
                }
            )
            token_balance.balance += tokens_to_mint
            token_balance.save(update_fields=['balance'])

            return {
                'success': True,
                'transaction_hash': result['transaction_hash'],
                'tokens_minted': tokens_to_mint,
            }
        else:
            return {
                'success': False,
                'error': result.get('error', 'Transaction failed') if result else 'No response from blockchain'
            }

    except Exception as e:
        logger.exception(f"Blockchain mint execution failed: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def _send_mint_failure_alert(investment: Investment, error_message: str):
    """Send email alert to admins when mint fails after max retries."""
    try:
        admin_emails = getattr(settings, 'ADMIN_ALERT_EMAILS', [])
        if not admin_emails:
            # Fallback to DEFAULT_FROM_EMAIL domain admin
            default_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@capimax.com')
            admin_emails = [f"admin@{default_email.split('@')[-1]}"]

        subject = f"[CRITICAL] Token Mint Failed - Investment {investment.id}"
        message = f"""
Token minting has failed after maximum retries.

Investment Details:
- ID: {investment.id}
- User: {investment.user.email}
- Property: {investment.property_investment.title}
- Token Amount: {investment.token_amount}
- Investment Amount: ${investment.investment_amount}

Failure Details:
- Retry Count: {investment.mint_retry_count}
- Last Error: {error_message}
- Last Attempt: {investment.mint_last_attempt}

Action Required:
1. Investigate the error
2. Fix any issues (RPC, gas, contract state)
3. Use admin panel to retry or process refund

Admin Panel: {getattr(settings, 'SITE_URL', 'https://capimaxrt.com')}/admin/investments/investment/{investment.id}/change/
        """

        send_mail(
            subject=subject,
            message=message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@capimax.com'),
            recipient_list=admin_emails,
            fail_silently=True,
        )

        logger.info(f"Mint failure alert sent for investment {investment.id}")

    except Exception as e:
        logger.error(f"Failed to send mint failure alert: {e}")


@shared_task
def retry_failed_mint(investment_id: str):
    """
    Manually retry a failed mint (called from admin action).

    Resets retry count and schedules immediate processing.
    """
    try:
        investment = Investment.objects.get(id=investment_id)

        if investment.status not in [InvestmentStatus.MINT_FAILED, InvestmentStatus.PENDING_MINT]:
            return {
                'success': False,
                'error': f'Cannot retry investment with status {investment.status}'
            }

        # Reset for retry
        investment.mint_retry_count = 0
        investment.mint_error = None
        investment.status = InvestmentStatus.PENDING_MINT
        investment.mint_scheduled_at = timezone.now()
        investment.save()

        # Immediately trigger processing
        return process_single_mint(investment_id)

    except Investment.DoesNotExist:
        return {'success': False, 'error': 'Investment not found'}
    except Exception as e:
        logger.error(f"Failed to retry mint for {investment_id}: {e}")
        return {'success': False, 'error': str(e)}
