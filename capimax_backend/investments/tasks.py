"""
Celery tasks for investment processing.

Production-grade mint pipeline:
- `process_pending_mints` atomically claims a batch of investments under a
  row-level lock and moves them to a "claimed" state, so concurrent workers
  never see the same investment.
- `process_single_mint` takes a Redis-backed distributed lock keyed on the
  investment id and is wrapped in `transaction.atomic()`. The blockchain
  call itself is idempotent (we check `transaction_hash` first).
- On terminal mint failure, `auto_refund_failed_mint` is scheduled to refund
  the captured payment and release the token reservation.
"""

import logging
from contextlib import contextmanager

from celery import shared_task
from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from .models import Investment, InvestmentStatus

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Redis-backed distributed lock
# ---------------------------------------------------------------------------

_MINT_LOCK_TTL = 180  # seconds — longer than the mint task time_limit


@contextmanager
def _distributed_lock(key: str, ttl: int = _MINT_LOCK_TTL):
    """
    Acquire a cache-backed lock that prevents two Celery workers from
    processing the same item simultaneously.

    Uses `cache.add` which is atomic in Django's Redis backend. The lock
    expires automatically if the worker crashes.
    """
    acquired = cache.add(key, "locked", timeout=ttl)
    try:
        yield acquired
    finally:
        if acquired:
            cache.delete(key)


# ---------------------------------------------------------------------------
# Batch dispatcher — runs every 2 minutes via celery-beat
# ---------------------------------------------------------------------------

@shared_task(
    bind=True,
    acks_late=True,
    time_limit=120,
    soft_time_limit=100,
)
def process_pending_mints(self):
    """
    Atomically claim a batch of investments ready for minting and dispatch
    individual `process_single_mint` tasks for each.

    Concurrency safety: the SELECT and the status update both happen inside
    one transaction with `select_for_update(skip_locked=True)`. Any other
    worker running this task in parallel will skip the rows we hold.
    """
    claimed_ids: list[str] = []

    with transaction.atomic():
        eligible = (
            Investment.objects
            .select_for_update(skip_locked=True)
            .filter(
                status=InvestmentStatus.PENDING_MINT,
                mint_scheduled_at__lte=timezone.now(),
            )
            .order_by('mint_scheduled_at')[:50]
        )

        for inv in eligible:
            # Move to MINTING so no other dispatcher picks it up. The actual
            # mint runs in `process_single_mint` which also rechecks state.
            inv.status = InvestmentStatus.MINTING
            inv.mint_last_attempt = timezone.now()
            inv.save(update_fields=['status', 'mint_last_attempt'])
            claimed_ids.append(str(inv.id))

    queued = 0
    for inv_id in claimed_ids:
        try:
            process_single_mint.delay(inv_id)
            queued += 1
        except Exception as e:
            logger.exception(
                "Failed to enqueue process_single_mint",
                extra={'investment_id': inv_id, 'error': str(e)}
            )
            # Roll the investment back so the next tick picks it up.
            Investment.objects.filter(id=inv_id).update(
                status=InvestmentStatus.PENDING_MINT
            )

    logger.info(
        "process_pending_mints batch dispatched",
        extra={'claimed': len(claimed_ids), 'queued': queued}
    )
    return {'claimed': len(claimed_ids), 'queued': queued}


# ---------------------------------------------------------------------------
# Single-investment mint executor
# ---------------------------------------------------------------------------

@shared_task(
    bind=True,
    acks_late=True,
    time_limit=120,
    soft_time_limit=100,
)
def process_single_mint(self, investment_id: str):
    """
    Execute the blockchain mint for one investment.

    Guards:
    - Redis distributed lock on `mint:{investment_id}` so a duplicate task
      delivery never executes the chain call twice.
    - Idempotency check on `investment.transaction_hash` so a previously
      successful mint short-circuits even if the lock has lapsed.
    - All DB writes occur inside `transaction.atomic()`.
    """
    lock_key = f"mint:{investment_id}"

    with _distributed_lock(lock_key) as acquired:
        if not acquired:
            logger.info(
                "Skipping mint — another worker holds the lock",
                extra={'investment_id': investment_id}
            )
            return {'success': False, 'reason': 'lock_held'}

        try:
            with transaction.atomic():
                try:
                    investment = (
                        Investment.objects
                        .select_for_update()
                        .select_related('user', 'property_investment')
                        .get(id=investment_id)
                    )
                except Investment.DoesNotExist:
                    logger.error("Investment missing in mint task",
                                 extra={'investment_id': investment_id})
                    return {'success': False, 'error': 'Investment not found'}

                # Idempotency — already minted in a prior run
                if investment.transaction_hash:
                    if investment.status != InvestmentStatus.COMPLETED:
                        investment.status = InvestmentStatus.COMPLETED
                        investment.save(update_fields=['status'])
                    return {
                        'success': True,
                        'skipped': True,
                        'reason': 'already_minted',
                        'tx_hash': investment.transaction_hash,
                    }

                # The dispatcher moves us into MINTING. Anything else is invalid.
                if investment.status not in (
                    InvestmentStatus.MINTING,
                    InvestmentStatus.PENDING_MINT,
                ):
                    return {
                        'success': False,
                        'reason': 'invalid_status',
                        'status': investment.status,
                    }

                if investment.status == InvestmentStatus.PENDING_MINT:
                    investment.mark_minting_started()

                # Capture variables needed outside the atomic block
                inv_local = investment

            # Blockchain call happens OUTSIDE the DB transaction so a slow
            # RPC doesn't hold the row lock. The lock_key still prevents
            # other workers from racing.
            result = _execute_blockchain_mint(inv_local)

            with transaction.atomic():
                fresh = Investment.objects.select_for_update().get(id=investment_id)
                if result['success']:
                    fresh.mark_mint_success(
                        tx_hash=result['transaction_hash'],
                        tokens_minted=result['tokens_minted'],
                    )
                    logger.info(
                        "Mint succeeded",
                        extra={
                            'investment_id': investment_id,
                            'tx_hash': result['transaction_hash'],
                            'tokens_minted': result['tokens_minted'],
                        }
                    )
                    return {
                        'success': True,
                        'investment_id': investment_id,
                        'tx_hash': result['transaction_hash'],
                        'tokens_minted': result['tokens_minted'],
                    }

                # Failure path
                error_message = result.get('error', 'unknown')
                fresh.mark_mint_failed(error_message)
                terminal = fresh.status == InvestmentStatus.MINT_FAILED
                fresh_id = str(fresh.id)

            if terminal:
                _send_mint_failure_alert(fresh, error_message)
                # Schedule automatic refund of the captured payment.
                auto_refund_failed_mint.delay(fresh_id)

            return {
                'success': False,
                'investment_id': investment_id,
                'error': error_message,
                'final_failure': terminal,
            }

        except Exception as exc:
            logger.exception(
                "Unhandled exception in process_single_mint",
                extra={'investment_id': investment_id, 'error': str(exc)}
            )
            # Roll the investment back to PENDING_MINT so it retries.
            Investment.objects.filter(
                id=investment_id,
                status=InvestmentStatus.MINTING,
            ).update(status=InvestmentStatus.PENDING_MINT)
            raise


# ---------------------------------------------------------------------------
# Blockchain execution — pure side-effecting layer
# ---------------------------------------------------------------------------

def _execute_blockchain_mint(investment: Investment) -> dict:
    """Execute the blockchain mintTokens call. Returns a result dict."""
    try:
        from blockchain.services.web3_service import Web3Service
        from blockchain.models import SmartContract, TokenTransaction, TokenBalance

        property_obj = investment.property_investment
        user = investment.user

        if property_obj.status != 'tokenized' or not getattr(property_obj, 'smart_contract_address', None):
            return {
                'success': False,
                'error': 'Property is not tokenized or missing contract address',
            }

        if not getattr(user, 'wallet_address', None):
            return {
                'success': False,
                'error': 'User does not have a wallet address configured',
            }

        contract = SmartContract.objects.filter(
            property_reference=property_obj,
            contract_type='real_estate_token',
            status='active',
        ).first()
        if not contract:
            return {'success': False, 'error': 'No active token contract for property'}

        web3_service = Web3Service()
        if not web3_service.initialize_network(str(contract.network_id)):
            return {'success': False, 'error': 'Failed to connect to blockchain network'}

        tokens_to_mint = investment.token_amount

        result = web3_service.call_contract_function(
            contract_address=contract.contract_address,
            abi=contract.abi,
            function_name='mintTokens',
            args=[user.wallet_address, tokens_to_mint, 0],
            gas_settings={'gas_limit': 500000, 'gas_price': None},
        )

        if not (result and result.get('status') == 1):
            return {
                'success': False,
                'error': (result or {}).get('error', 'Blockchain transaction failed'),
            }

        # Record the transaction. submitted -> confirmed update will be
        # handled by the chain monitor (see blockchain/tasks.py).
        with transaction.atomic():
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
                status='submitted',
                block_number=result.get('block_number'),
                gas_used=result.get('gas_used'),
            )

            token_balance, _ = (
                TokenBalance.objects
                .select_for_update()
                .get_or_create(
                    contract=contract,
                    user=user,
                    property_reference=property_obj,
                    defaults={
                        'wallet_address': user.wallet_address,
                        'token_id': 0,
                        'balance': 0,
                    },
                )
            )
            token_balance.balance = (token_balance.balance or 0) + tokens_to_mint
            token_balance.save(update_fields=['balance'])

        # Cap table — write only if the legal app is installed.
        _write_cap_table_entry_for_mint(investment, result['transaction_hash'])

        return {
            'success': True,
            'transaction_hash': result['transaction_hash'],
            'tokens_minted': tokens_to_mint,
        }

    except Exception as exc:
        logger.exception("Blockchain mint execution failed")
        return {'success': False, 'error': str(exc)}


def _write_cap_table_entry_for_mint(investment: Investment, tx_hash: str) -> None:
    """Append a CapTableEntry row, if the legal app is installed."""
    try:
        from legal.models import CapTableEntry, OwnershipEvent
    except ImportError:
        return

    legal_entity = getattr(investment.property_investment, 'spv_entity', None)
    if not legal_entity:
        return

    try:
        with transaction.atomic():
            holder = investment.user
            # Recompute current balance for this holder + entity
            last = (
                CapTableEntry.objects
                .filter(legal_entity=legal_entity, holder=holder)
                .order_by('-timestamp')
                .first()
            )
            prev_balance = last.tokens_balance_after if last else 0
            CapTableEntry.objects.create(
                legal_entity=legal_entity,
                holder=holder,
                tokens_delta=investment.token_amount,
                tokens_balance_after=prev_balance + investment.token_amount,
                event_type=OwnershipEvent.MINT,
                investment=investment,
                blockchain_tx_hash=tx_hash,
            )
    except Exception:
        logger.exception("Failed to write CapTableEntry for mint",
                         extra={'investment_id': str(investment.id)})


# ---------------------------------------------------------------------------
# Auto-refund on terminal mint failure
# ---------------------------------------------------------------------------

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    max_retries=5,
    acks_late=True,
)
def auto_refund_failed_mint(self, investment_id: str):
    """
    When a mint fails permanently (MINT_FAILED), automatically refund the
    captured payment and release the token reservation. Idempotent: skips if
    a refund already exists.
    """
    try:
        investment = Investment.objects.get(id=investment_id)
    except Investment.DoesNotExist:
        return {'skipped': True, 'reason': 'investment_not_found'}

    if investment.status != InvestmentStatus.MINT_FAILED:
        return {'skipped': True, 'reason': 'not_mint_failed',
                'status': investment.status}

    # Investment → Payment is one-to-many (``Payment.investment`` FK with no
    # related_name → reverse manager ``payment_set``). In practice each
    # investment has exactly one COMPLETED payment that captured the funds;
    # pick the most recent in case retries created additional rows.
    from payments.models import Payment, PaymentStatus
    payment = (
        Payment.objects
        .filter(investment_id=investment_id, status=PaymentStatus.COMPLETED)
        .order_by('-completed_at', '-created_at')
        .first()
    )
    if not payment:
        logger.warning("No completed payment linked to failed-mint investment",
                       extra={'investment_id': investment_id})
        return {'skipped': True, 'reason': 'no_payment'}

    # Skip if a refund already exists for this payment
    if payment.refunds.filter(status__in=['pending', 'processing', 'completed']).exists():
        return {'skipped': True, 'reason': 'refund_exists'}

    try:
        from payments.services import RefundService
    except ImportError:
        logger.error("payments.services.RefundService not importable")
        return {'skipped': True, 'reason': 'refund_service_unavailable'}

    refund = RefundService.create_refund(
        payment=payment,
        amount=payment.amount,
        reason='mint_failed',
        initiated_by_system=True,
    )

    with transaction.atomic():
        inv = Investment.objects.select_for_update().get(id=investment_id)
        inv.status = InvestmentStatus.REFUNDED
        inv.save(update_fields=['status'])
        reservation = getattr(inv, 'token_reservation', None)
        if reservation and hasattr(reservation, 'release'):
            reservation.release()

    logger.info("Auto-refund issued for failed mint",
                extra={'investment_id': investment_id,
                       'refund_id': getattr(refund, 'id', None)})
    return {'success': True, 'refund_id': str(getattr(refund, 'id', ''))}


# ---------------------------------------------------------------------------
# Operational utilities
# ---------------------------------------------------------------------------

def _send_mint_failure_alert(investment: Investment, error_message: str):
    """Email admins on terminal mint failure."""
    try:
        admin_emails = getattr(settings, 'ADMIN_ALERT_EMAILS', None)
        if not admin_emails:
            default_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@capimax.com')
            admin_emails = [f"admin@{default_email.split('@')[-1]}"]

        subject = f"[CRITICAL] Token Mint Failed — Investment {investment.id}"
        message = (
            f"Token minting has failed after maximum retries.\n\n"
            f"Investment Details:\n"
            f"- ID: {investment.id}\n"
            f"- User: {investment.user.email}\n"
            f"- Property: {investment.property_investment.title}\n"
            f"- Token Amount: {investment.token_amount}\n"
            f"- Investment Amount: ${investment.investment_amount}\n\n"
            f"Failure Details:\n"
            f"- Retry Count: {investment.mint_retry_count}\n"
            f"- Last Error: {error_message}\n"
            f"- Last Attempt: {investment.mint_last_attempt}\n\n"
            f"An automated refund has been queued. Verify in the admin panel."
        )

        send_mail(
            subject=subject,
            message=message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@capimax.com'),
            recipient_list=admin_emails,
            fail_silently=True,
        )
    except Exception:
        logger.exception("Failed to send mint failure alert")


@shared_task
def retry_failed_mint(investment_id: str):
    """Admin-initiated retry for a permanently failed mint."""
    try:
        investment = Investment.objects.get(id=investment_id)
    except Investment.DoesNotExist:
        return {'success': False, 'error': 'Investment not found'}

    if investment.status not in (InvestmentStatus.MINT_FAILED, InvestmentStatus.PENDING_MINT):
        return {
            'success': False,
            'error': f'Cannot retry investment with status {investment.status}',
        }

    investment.mint_retry_count = 0
    investment.mint_error = None
    investment.status = InvestmentStatus.PENDING_MINT
    investment.mint_scheduled_at = timezone.now()
    investment.save()

    return process_single_mint(investment_id)
