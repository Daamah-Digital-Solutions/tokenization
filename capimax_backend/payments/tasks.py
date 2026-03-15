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
