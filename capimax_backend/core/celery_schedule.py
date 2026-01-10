"""
Celery Beat Schedule Configuration for Capimax Platform.

This module defines all periodic tasks that should run automatically,
including dividend distribution, property completion checks, and system maintenance.
"""

from celery.schedules import crontab
from datetime import timedelta

# Celery Beat Schedule
CELERYBEAT_SCHEDULE = {
    # ============================================================================
    # DIVIDEND DISTRIBUTION AUTOMATION
    # ============================================================================

    'process-monthly-dividends': {
        'task': 'investments.tasks.process_monthly_dividend_distributions',
        'schedule': crontab(
            day_of_month='5',  # Run on the 5th of each month
            hour='2',          # At 2:00 AM
            minute='0'
        ),
        'args': (),  # No args = processes last month
        'options': {
            'queue': 'financial',
            'priority': 9
        }
    },

    # ============================================================================
    # INVESTMENT COMPLETION AUTOMATION
    # ============================================================================

    'check-funded-properties': {
        'task': 'investments.tasks.check_and_complete_funded_properties',
        'schedule': crontab(
            hour='*/6',  # Every 6 hours
            minute='15'
        ),
        'options': {
            'queue': 'default',
            'priority': 7
        }
    },

    # ============================================================================
    # INSTALLMENT PAYMENT PROCESSING
    # ============================================================================

    'process-due-installments': {
        'task': 'properties.tasks.process_due_installments',
        'schedule': crontab(
            hour='1',    # Daily at 1:00 AM
            minute='0'
        ),
        'options': {
            'queue': 'financial',
            'priority': 8
        }
    },

    'send-payment-reminders': {
        'task': 'properties.tasks.send_payment_reminders',
        'schedule': crontab(
            hour='9',    # Daily at 9:00 AM
            minute='0'
        ),
        'kwargs': {'days_before_due': 3},
        'options': {
            'queue': 'notifications',
            'priority': 5
        }
    },

    'process-late-payments': {
        'task': 'properties.tasks.process_late_payments',
        'schedule': crontab(
            hour='3',    # Daily at 3:00 AM
            minute='0'
        ),
        'options': {
            'queue': 'financial',
            'priority': 7
        }
    },

    # ============================================================================
    # PERFORMANCE METRICS & ANALYTICS
    # ============================================================================

    'update-investment-metrics': {
        'task': 'investments.tasks.update_investment_performance_metrics',
        'schedule': crontab(
            hour='*/12',  # Every 12 hours
            minute='30'
        ),
        'options': {
            'queue': 'analytics',
            'priority': 4
        }
    },

    # ============================================================================
    # SYSTEM MONITORING & HEALTH CHECKS
    # ============================================================================

    'test-dividend-automation': {
        'task': 'investments.tasks.test_dividend_automation',
        'schedule': crontab(
            hour='*/4',  # Every 4 hours
            minute='0'
        ),
        'options': {
            'queue': 'monitoring',
            'priority': 2
        }
    },

    'test-installment-processing': {
        'task': 'properties.tasks.test_installment_processing',
        'schedule': crontab(
            hour='*/4',  # Every 4 hours
            minute='15'
        ),
        'options': {
            'queue': 'monitoring',
            'priority': 2
        }
    },

    # ============================================================================
    # DATA CLEANUP & MAINTENANCE
    # ============================================================================

    'cleanup-expired-sessions': {
        'task': 'core.tasks.cleanup_expired_sessions',
        'schedule': crontab(
            hour='4',    # Daily at 4:00 AM
            minute='0'
        ),
        'options': {
            'queue': 'maintenance',
            'priority': 1
        }
    },

    'cleanup-old-notifications': {
        'task': 'notifications.tasks.cleanup_old_notifications',
        'schedule': crontab(
            day_of_week='sunday',  # Weekly on Sunday
            hour='5',
            minute='0'
        ),
        'kwargs': {'days_old': 90},
        'options': {
            'queue': 'maintenance',
            'priority': 1
        }
    },
}

# Alternative schedule using timedelta for simpler recurring tasks
CELERYBEAT_SCHEDULE_TIMEDELTA = {
    # These can be added if you prefer timedelta-based scheduling
    # 'check-system-health': {
    #     'task': 'core.tasks.check_system_health',
    #     'schedule': timedelta(minutes=15),  # Every 15 minutes
    #     'options': {
    #         'queue': 'monitoring',
    #         'priority': 3
    #     }
    # },
}

# Celery configuration
CELERY_TIMEZONE = 'UTC'
CELERY_ENABLE_UTC = True

# Task routing
CELERY_ROUTES = {
    # Financial operations - high priority queue
    'investments.tasks.process_monthly_dividend_distributions': {'queue': 'financial'},
    'properties.tasks.process_due_installments': {'queue': 'financial'},
    'properties.tasks.process_late_payments': {'queue': 'financial'},

    # Investment operations
    'investments.tasks.process_investment_completion': {'queue': 'default'},
    'investments.tasks.check_and_complete_funded_properties': {'queue': 'default'},

    # Analytics and metrics
    'investments.tasks.update_investment_performance_metrics': {'queue': 'analytics'},

    # Notifications
    'properties.tasks.send_payment_reminders': {'queue': 'notifications'},
    'notifications.tasks.*': {'queue': 'notifications'},

    # Monitoring
    '*.test_*': {'queue': 'monitoring'},

    # Maintenance
    'core.tasks.cleanup_*': {'queue': 'maintenance'},
}

# Task time limits
CELERY_TASK_TIME_LIMIT = 3600  # 1 hour hard limit
CELERY_TASK_SOFT_TIME_LIMIT = 3000  # 50 minutes soft limit

# Task result backend
CELERY_RESULT_EXTENDED_METADATA = True

# Queue priority levels (1-10, 10 is highest)
# Financial operations: 8-9
# Investment operations: 7
# Notifications: 5
# Analytics: 4
# Monitoring: 2-3
# Maintenance: 1
