"""
Celery configuration for Capimax backend.

This module configures Celery for asynchronous task processing including:
- Installment payment automation
- Rental income distribution processing
- Email notifications
- Blockchain transaction monitoring
"""

import os
from celery import Celery
from celery.schedules import crontab
from django.conf import settings

# Set the default Django settings module for the 'celery' program
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capimax_backend.settings')

app = Celery('capimax_backend')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps
app.autodiscover_tasks()

# Celery Beat Schedule for Periodic Tasks
app.conf.beat_schedule = {
    # Token minting - runs every 2 minutes (CRITICAL for payment→mint flow)
    'process-pending-mints': {
        'task': 'investments.tasks.process_pending_mints',
        'schedule': 120.0,  # Every 2 minutes
        'kwargs': {},
    },

    # Secondary marketplace: re-match PENDING limit orders against the
    # current order book. Without this, limit orders that don't fill at
    # creation time sit forever and never trade.
    'match-pending-limit-orders': {
        'task': 'marketplace.tasks.match_pending_limit_orders',
        'schedule': 60.0,  # Every 1 minute
        'kwargs': {},
    },

    # Marketplace: garbage-collect limit orders older than 30 days.
    'expire-stale-limit-orders': {
        'task': 'marketplace.tasks.expire_stale_limit_orders',
        'schedule': 60.0 * 60.0 * 6.0,  # Every 6 hours
        'kwargs': {},
    },

    # Cancel abandoned payments after PAYMENT_TIMEOUT_HOURS
    'expire-pending-payments': {
        'task': 'payments.tasks.expire_pending_payments',
        'schedule': 60.0 * 10.0,  # Every 10 minutes
        'kwargs': {},
    },

    # Daily Stripe reconciliation
    'reconcile-stripe-payments': {
        'task': 'payments.tasks.reconcile_stripe_payments',
        'schedule': 60.0 * 60.0 * 24.0,
        'kwargs': {},
    },

    # Token balance reconciliation (every 6 hours)
    'reconcile-token-balances': {
        'task': 'blockchain.tasks.reconcile_token_balances',
        'schedule': 60.0 * 60.0 * 6.0,
        'kwargs': {},
    },

    # Daily installment processing
    'process-due-installments': {
        'task': 'properties.tasks.process_due_installments',
        'schedule': 60.0 * 60.0 * 24.0,  # Every day at midnight
        'kwargs': {},
    },
    
    # Daily payment reminders (3 days before due date)
    'send-payment-reminders': {
        'task': 'properties.tasks.send_payment_reminders',
        'schedule': 60.0 * 60.0 * 24.0,  # Every day at midnight
        'kwargs': {'days_before_due': 3},
    },
    
    # Daily late payment processing
    'process-late-payments': {
        'task': 'properties.tasks.process_late_payments',
        'schedule': 60.0 * 60.0 * 24.0,  # Every day at midnight
        'kwargs': {},
    },
    
    # Monthly rental income distribution — runs on the 1st of every month
    # to align with calendar months (not every 30 days which drifts).
    'distribute-monthly-rental-income': {
        'task': 'core.tasks.distribute_monthly_rental_income',
        'schedule': crontab(day_of_month=1, hour=0, minute=30),
        'kwargs': {},
    },
    
    # Weekly rental income collection
    'collect-rental-income': {
        'task': 'core.tasks.collect_rental_income',
        'schedule': 60.0 * 60.0 * 24.0 * 7.0,  # Every week
        'kwargs': {},
    },
    
    # Daily blockchain transaction monitoring
    'monitor-blockchain-transactions': {
        'task': 'blockchain.tasks.monitor_pending_transactions',
        'schedule': 60.0 * 60.0,  # Every hour
        'kwargs': {},
    },
    
    # Email notification processing
    'process-pending-emails': {
        'task': 'notifications.tasks.process_pending_emails',
        'schedule': 60.0 * 5.0,  # Every 5 minutes
        'kwargs': {},
    },
    
    # Cleanup expired notifications
    'cleanup-expired-notifications': {
        'task': 'notifications.tasks.cleanup_expired_notifications',
        'schedule': 60.0 * 60.0 * 24.0,  # Every day
        'kwargs': {},
    },
}

# Task routing configuration
app.conf.task_routes = {
    # Critical: Token minting tasks (high priority)
    'investments.tasks.process_pending_mints': {'queue': 'high_priority'},
    'investments.tasks.process_single_mint': {'queue': 'high_priority'},
    'investments.tasks.retry_failed_mint': {'queue': 'high_priority'},

    # High priority payment tasks
    'properties.tasks.process_installment_payment': {'queue': 'high_priority'},
    'properties.tasks.send_payment_reminder': {'queue': 'high_priority'},
    'payments.tasks.process_payment': {'queue': 'high_priority'},
    
    # Medium priority distribution tasks
    'core.tasks.distribute_rental_income_to_investor': {'queue': 'medium_priority'},
    'core.tasks.calculate_rental_distribution': {'queue': 'medium_priority'},
    
    # Low priority notification tasks
    'notifications.tasks.send_email_notification': {'queue': 'low_priority'},
    'notifications.tasks.send_bulk_notifications': {'queue': 'low_priority'},
    
    # Blockchain tasks
    'blockchain.tasks.*': {'queue': 'blockchain'},

    # Marketplace matching — runs hot, cheap, doesn't touch the chain.
    'marketplace.tasks.match_pending_limit_orders': {'queue': 'high_priority'},
    'marketplace.tasks.expire_stale_limit_orders': {'queue': 'low_priority'},
}

# Task retry configuration
app.conf.task_annotations = {
    '*': {
        'rate_limit': '10/s',
        'time_limit': 300,  # 5 minutes
        'soft_time_limit': 240,  # 4 minutes
    },
    'properties.tasks.process_installment_payment': {
        'autoretry_for': (Exception,),
        'retry_backoff': True,
        'retry_backoff_max': 700,
        'retry_jitter': True,
        'max_retries': 3,
    },
    'core.tasks.distribute_rental_income_to_investor': {
        'autoretry_for': (Exception,),
        'retry_backoff': True,
        'max_retries': 3,
    },
    'notifications.tasks.send_email_notification': {
        'autoretry_for': (Exception,),
        'max_retries': 5,
        'retry_backoff': True,
    },
}

# Additional Celery configuration
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_disable_rate_limits=False,
)

@app.task(bind=True)
def debug_task(self):
    """Debug task for testing Celery configuration."""
    print(f'Request: {self.request!r}')