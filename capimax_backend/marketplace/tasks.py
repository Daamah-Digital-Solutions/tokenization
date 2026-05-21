"""
Celery tasks for the secondary marketplace.

The matching engine (``services.OrderMatchingEngine``) only runs once at
order-creation time. That's enough for MARKET orders — they either fill
against the current best ask/bid or fail loudly. LIMIT orders, by their
very nature, may be unmatchable at creation: the buyer's price ceiling
is below the lowest ask, or the seller's floor is above the highest
bid. Those orders sit in ``status=PENDING`` until either:

  - a counterparty listing arrives that satisfies the price, or
  - the order expires / gets cancelled.

Without a periodic re-match, those orders are dead theater. This task
sweeps PENDING limit orders every minute and re-runs the matching
engine against the current order book.
"""

import logging
from datetime import timedelta

from celery import shared_task
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    acks_late=True,
    time_limit=180,
    soft_time_limit=150,
)
def match_pending_limit_orders(self):
    """
    Re-run the matching engine against every PENDING limit order.

    Picks orders in oldest-first order so price-time priority is honoured.
    Each order is matched in its own transaction inside the engine, so a
    single failing order doesn't abort the sweep.

    Returns a summary dict for observability.
    """
    # Lazy imports so Django app registry is ready when tasks are
    # auto-discovered by Celery.
    from .models import TradeOrder, OrderStatus, OrderType
    from .services import OrderMatchingEngine

    engine = OrderMatchingEngine()

    # Cap the sweep size so a backlog can't monopolise the worker. The
    # remaining orders get picked up on the next tick.
    BATCH_SIZE = 200
    qs = (
        TradeOrder.objects
        .filter(status=OrderStatus.PENDING, order_type=OrderType.LIMIT)
        .order_by('created_at')[:BATCH_SIZE]
    )

    scanned = 0
    matched = 0
    fully_filled = 0
    partial = 0

    for order in qs:
        scanned += 1
        try:
            result = engine.match_order(order)
        except Exception as exc:
            logger.exception(
                "match_pending_limit_orders: engine error on order %s: %s",
                order.id, exc,
            )
            continue

        if result.get('success'):
            matched += 1
            if result.get('order_status') == OrderStatus.COMPLETED:
                fully_filled += 1
            else:
                partial += 1

    logger.info(
        "match_pending_limit_orders sweep",
        extra={
            'scanned': scanned,
            'matched': matched,
            'fully_filled': fully_filled,
            'partial': partial,
        },
    )
    return {
        'scanned': scanned,
        'matched': matched,
        'fully_filled': fully_filled,
        'partial': partial,
    }


@shared_task(
    bind=True,
    acks_late=True,
    time_limit=60,
)
def expire_stale_limit_orders(self, max_age_days: int = 30):
    """
    Cancel limit orders that have sat PENDING for longer than ``max_age_days``.

    Without this, abandoned limit orders pile up forever and pollute the
    order book + the user's order history.
    """
    from .models import TradeOrder, OrderStatus, OrderType

    cutoff = timezone.now() - timedelta(days=max_age_days)
    qs = TradeOrder.objects.filter(
        status=OrderStatus.PENDING,
        order_type=OrderType.LIMIT,
        created_at__lt=cutoff,
    )
    count = qs.count()
    if count == 0:
        return {'expired': 0}

    with transaction.atomic():
        # Bulk update — no signals to fire for cancellation here.
        qs.update(status=OrderStatus.CANCELLED, executed_at=timezone.now())

    logger.info("Expired %d stale limit orders older than %d days", count, max_age_days)
    return {'expired': count}
