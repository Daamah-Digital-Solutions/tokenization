"""Celery tasks for transfers between users."""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=0)
def process_transfers(self):
    """Hourly: deliver due transfers, remind waiting recipients, return unclaimed transfers."""
    from .services import process_due
    return process_due()


@shared_task(bind=True, max_retries=0)
def transfer_tokens(self, transfer_id: str):
    """Move a delivered share transfer's tokens on-chain (sender custodial wallet -> recipient's)."""
    from django.core.cache import cache

    from marketplace.chain_transfer import ChainUnavailable, transfer_trade

    from .models import Transfer

    lock = f'transfer-chain-{transfer_id}'
    if not cache.add(lock, '1', timeout=300):
        return 'busy'
    try:
        t = Transfer.objects.select_related('sender', 'recipient', 'property_ref').get(pk=transfer_id)
        return transfer_trade(t)
    except ChainUnavailable as exc:
        logger.warning('Transfer %s on-chain move postponed: %s', transfer_id, exc)
        return 'postponed'
    except Exception:  # noqa: BLE001 — the reconcile job retries
        logger.exception('Transfer %s on-chain move failed', transfer_id)
        return 'error'
    finally:
        cache.delete(lock)
