"""Celery tasks for liquidity-provider sales."""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=0)
def transfer_lp_tokens(self, tx_id: str):
    """Move a just-settled LP sale's tokens on-chain (investor custodial wallet -> LP's)."""
    from django.core.cache import cache

    from marketplace.chain_transfer import ChainUnavailable, transfer_trade

    from .models import LiquidityTransaction

    lock = f'lp-chain-{tx_id}'
    if not cache.add(lock, '1', timeout=300):
        return 'busy'
    try:
        tx = LiquidityTransaction.objects.select_related(
            'investor', 'liquidity_provider__user', 'exit_request__investment__property_investment').get(pk=tx_id)
        return transfer_trade(tx)
    except ChainUnavailable as exc:
        logger.warning('LP sale %s on-chain transfer postponed: %s', tx_id, exc)
        return 'postponed'
    except Exception:  # noqa: BLE001 — the reconcile job retries
        logger.exception('LP sale %s on-chain transfer failed', tx_id)
        return 'error'
    finally:
        cache.delete(lock)
