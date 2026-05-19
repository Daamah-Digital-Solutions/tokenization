"""
Celery tasks for payment processing.
"""

import logging
from celery import shared_task
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=20, default_retry_delay=30)
def verify_pronova_transaction(self, pronova_payment_id: str):
    """
    Verify a Pronova crypto payment on BNB Smart Chain.

    Retries every 30 seconds up to 20 times (~10 minutes).
    """
    from .models import PronovaPayment, PaymentStatus
    from investments.services import InvestmentProcessingService
    from notifications.services import NotificationService

    try:
        pronova = PronovaPayment.objects.select_related(
            'investment', 'investment__user', 'investment__property_investment', 'payment'
        ).get(id=pronova_payment_id)
    except PronovaPayment.DoesNotExist:
        logger.error(f"PronovaPayment {pronova_payment_id} not found")
        return

    if pronova.status not in ('pending', 'confirming'):
        logger.info(f"PronovaPayment {pronova_payment_id} already in status {pronova.status}")
        return

    if not pronova.tx_hash:
        logger.warning(f"PronovaPayment {pronova_payment_id} has no tx_hash yet")
        self.retry()
        return

    pronova_config = getattr(settings, 'PRONOVA_CONFIG', {})
    required_confirmations = pronova_config.get('REQUIRED_CONFIRMATIONS', 12)

    try:
        from blockchain.services.web3_service import Web3Service
        rpc_url = pronova_config.get('RPC_URL', 'https://bsc-dataseed.binance.org/')
        web3_service = Web3Service(rpc_url=rpc_url)

        if not web3_service.w3:
            logger.warning(f"Could not connect to BSC RPC: {rpc_url}, retrying...")
            self.retry()
            return

        tx_status = web3_service.monitor_transaction(pronova.tx_hash)

        if tx_status.get('status') == 'confirmed':
            confirmations = tx_status.get('confirmations', 0)
            if confirmations >= required_confirmations:
                pronova.status = 'confirmed'
                pronova.confirmations = confirmations
                pronova.confirmed_at = timezone.now()
                pronova.save(update_fields=[
                    'status', 'confirmations', 'confirmed_at', 'updated_at'
                ])

                payment = pronova.payment
                if payment:
                    payment.status = PaymentStatus.COMPLETED
                    payment.completed_at = timezone.now()
                    payment.transaction_hash = pronova.tx_hash
                    payment.save(update_fields=[
                        'status', 'completed_at', 'transaction_hash', 'updated_at'
                    ])

                InvestmentProcessingService.process_investment(
                    pronova.investment, payment
                )

                NotificationService.create_notification(
                    user=pronova.investment.user,
                    title="Pronova Payment Confirmed",
                    message=(
                        f"Your Pronova payment for "
                        f"{pronova.investment.property_investment.title} "
                        f"has been confirmed on-chain. Tokens have been allocated."
                    ),
                    notification_type='payment',
                    priority='high',
                    send_email=True,
                    send_real_time=True,
                )

                logger.info(f"PronovaPayment {pronova_payment_id} confirmed successfully")
                return

        if tx_status.get('status') == 'failed':
            pronova.status = 'failed'
            pronova.save(update_fields=['status', 'updated_at'])

            investment = pronova.investment
            investment.status = 'failed'
            investment.save(update_fields=['status', 'updated_at'])

            if pronova.payment:
                pronova.payment.status = PaymentStatus.FAILED
                pronova.payment.save(update_fields=['status', 'updated_at'])

            NotificationService.create_notification(
                user=investment.user,
                title="Pronova Payment Failed",
                message="Your Pronova transaction failed on-chain. Please try again.",
                notification_type='payment',
                priority='high',
                send_email=True,
                send_real_time=True,
            )

            logger.warning(f"PronovaPayment {pronova_payment_id} failed on-chain")
            return

        # Still pending — retry
        pronova.confirmations = tx_status.get('confirmations', 0)
        pronova.save(update_fields=['confirmations', 'updated_at'])
        self.retry()

    except Exception as e:
        logger.error(f"Error verifying PronovaPayment {pronova_payment_id}: {str(e)}")
        if self.request.retries < self.max_retries:
            self.retry(exc=e)
        else:
            pronova.status = 'failed'
            pronova.save(update_fields=['status', 'updated_at'])
            logger.error(f"PronovaPayment {pronova_payment_id} verification exhausted retries")


# ============================================================================
# Periodic: expire abandoned payments
# ----------------------------------------------------------------------------
# A payment in PENDING that has not progressed within `PAYMENT_TIMEOUT_HOURS`
# is presumed abandoned by the user. We cancel it, release any token
# reservation, and unlink any in-flight investment. Provider-side timeouts
# are still enforced separately by Stripe/NOWPayments, but those don't
# always propagate cleanly to our DB — this is the defence in depth.
# ============================================================================

PAYMENT_TIMEOUT_HOURS = 1


@shared_task
def expire_pending_payments():
    """Cancel pending payments older than `PAYMENT_TIMEOUT_HOURS`."""
    from datetime import timedelta
    from django.db import transaction as db_transaction
    from .models import Payment, PaymentStatus

    cutoff = timezone.now() - timedelta(hours=PAYMENT_TIMEOUT_HOURS)
    cancelled = 0

    pending_ids = list(
        Payment.objects
        .filter(status=PaymentStatus.PENDING, created_at__lt=cutoff)
        .values_list('id', flat=True)[:200]
    )

    for pid in pending_ids:
        try:
            with db_transaction.atomic():
                p = Payment.objects.select_for_update().get(id=pid)
                # Re-check status under the lock; a webhook may have just fired.
                if p.status != PaymentStatus.PENDING:
                    continue
                if p.created_at >= cutoff:
                    continue

                p.status = PaymentStatus.CANCELLED
                p.save(update_fields=['status'])

                # Cascade to investment + token reservation
                inv = getattr(p, 'investment', None)
                if inv is not None:
                    try:
                        from investments.models import InvestmentStatus, TokenReservation
                        if inv.status in (
                            InvestmentStatus.PENDING,
                            InvestmentStatus.PROCESSING,
                        ):
                            inv.status = InvestmentStatus.CANCELLED
                            inv.save(update_fields=['status'])
                            TokenReservation.objects.filter(
                                user=inv.user,
                                property_investment=inv.property_investment,
                                released=False,
                            ).update(released=True)
                    except Exception:
                        logger.exception(
                            "Failed to cascade payment cancel to investment",
                            extra={'payment_id': str(pid)},
                        )

            cancelled += 1
            logger.info(
                "Expired pending payment",
                extra={'payment_id': str(pid)},
            )
        except Exception:
            logger.exception(
                "Error while expiring payment",
                extra={'payment_id': str(pid)},
            )

    return {'cancelled': cancelled}


# ============================================================================
# Periodic: reconcile payments against provider records
# ----------------------------------------------------------------------------
# Daily sanity check. For every COMPLETED Stripe payment in the last 24 hours,
# we verify Stripe agrees. Discrepancies are logged and emit a Sentry event.
# ============================================================================

@shared_task
def reconcile_stripe_payments():
    """Compare DB Stripe payments against Stripe API for the last 24h."""
    import stripe
    from datetime import timedelta
    from .models import Payment, PaymentMethod, PaymentStatus

    stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', None)
    if not stripe.api_key:
        return {'skipped': True, 'reason': 'no_api_key'}

    cutoff = timezone.now() - timedelta(hours=24)
    payments = Payment.objects.filter(
        payment_method=PaymentMethod.CREDIT_CARD,
        completed_at__gte=cutoff,
        payment_intent_id__isnull=False,
    ).exclude(payment_intent_id='')

    drift_count = 0
    for payment in payments:
        try:
            intent = stripe.PaymentIntent.retrieve(payment.payment_intent_id)
            if intent.status == 'succeeded' and payment.status != PaymentStatus.COMPLETED:
                logger.error(
                    "Payment status drift: Stripe says succeeded, DB does not",
                    extra={'payment_id': str(payment.id),
                           'db_status': payment.status,
                           'stripe_status': intent.status}
                )
                drift_count += 1
            elif intent.status != 'succeeded' and payment.status == PaymentStatus.COMPLETED:
                logger.error(
                    "Payment status drift: DB says completed, Stripe does not",
                    extra={'payment_id': str(payment.id),
                           'db_status': payment.status,
                           'stripe_status': intent.status}
                )
                drift_count += 1
        except stripe.error.StripeError as e:
            logger.warning(
                "Stripe API error during reconciliation",
                extra={'payment_id': str(payment.id), 'error': str(e)}
            )

    return {'checked': payments.count(), 'drift': drift_count}
