"""
Production Django settings for capimax_backend project.

This file enforces production-grade configuration: required env vars must be
present, defaults are removed for anything security-sensitive, and CSP is
locked down. If any critical variable is missing, the Django app refuses to
start — a hard failure is always safer than a silently misconfigured prod
deployment.
"""

import os
from django.core.exceptions import ImproperlyConfigured
from .base import *


# ============================================================================
# Required environment variables
# ----------------------------------------------------------------------------
# Listed here so the app fails fast on misconfiguration. Add to this list any
# variable that, if missing, would create a security or operational risk.
# ============================================================================

REQUIRED_ENV_VARS = [
    'SECRET_KEY',
    'ALLOWED_HOSTS',
    'CSRF_TRUSTED_ORIGINS',
    'CORS_ALLOWED_ORIGINS',
    'FRONTEND_URL',
    'DB_PASSWORD',
    'EMAIL_HOST_PASSWORD',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NOWPAYMENTS_API_KEY',
    'NOWPAYMENTS_IPN_SECRET',
    # Hybrid custodial wallets: without the master seed we cannot derive
    # users' on-chain destinations. Fail-fast in production rather than
    # silently letting new users sign up with no wallet.
    'PLATFORM_CUSTODY_MASTER_SEED',
]

_missing = [var for var in REQUIRED_ENV_VARS if not os.environ.get(var, '').strip()]
if _missing:
    raise ImproperlyConfigured(
        "Production deployment refused: missing required environment variables: "
        + ", ".join(_missing)
        + ". Set them via your secrets manager or .env file before starting."
    )


def _split_csv(env_name: str) -> list[str]:
    """Parse a CSV env var into a clean non-empty list."""
    raw = os.environ.get(env_name, '').strip()
    items = [item.strip() for item in raw.split(',') if item.strip()]
    if not items:
        raise ImproperlyConfigured(
            f"{env_name} is required and must contain at least one value."
        )
    return items


# ============================================================================
# Core security flags
# ============================================================================

DEBUG = False

ALLOWED_HOSTS = _split_csv('ALLOWED_HOSTS')

# Public URL of the frontend SPA — used for password reset links, OAuth
# redirects, and email content. Never default this to localhost.
FRONTEND_URL = os.environ['FRONTEND_URL'].rstrip('/')


# ============================================================================
# Database — PostgreSQL with required SSL
# ============================================================================

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'capimax_prod'),
        'USER': os.environ.get('DB_USER', 'capimax'),
        'PASSWORD': os.environ['DB_PASSWORD'],
        'HOST': os.environ.get('DB_HOST', 'db'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'CONN_MAX_AGE': int(os.environ.get('DB_CONN_MAX_AGE', '600')),
        'OPTIONS': {
            # 'require' is the minimum acceptable; for managed providers use
            # 'verify-full' with a CA bundle.
            'sslmode': os.environ.get('DB_SSLMODE', 'require'),
        },
    }
}


# ============================================================================
# Transport security
# ============================================================================

SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
# HSTS_PRELOAD: only enable after the domain is committed to the preload list.
SECURE_HSTS_PRELOAD = os.environ.get('SECURE_HSTS_PRELOAD', 'False').lower() == 'true'
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'


# ============================================================================
# Content Security Policy
# ----------------------------------------------------------------------------
# Notes:
# - unsafe-inline has been REMOVED from script-src and style-src.
# - Stripe.js is explicitly allowlisted (their checkout requires their CDN).
# - For runtime nonce support, install django-csp and switch directives to
#   include 'CSP_INCLUDE_NONCE_IN'.
# ============================================================================

CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "https://js.stripe.com")
CSP_STYLE_SRC = ("'self'",)
CSP_IMG_SRC = ("'self'", "https:", "data:")
CSP_CONNECT_SRC = (
    "'self'",
    "https://api.stripe.com",
    "wss:",
)
CSP_FONT_SRC = ("'self'", "data:")
CSP_BASE_URI = ("'self'",)
CSP_FRAME_SRC = ("https://js.stripe.com", "https://hooks.stripe.com")
CSP_FRAME_ANCESTORS = ("'none'",)
CSP_OBJECT_SRC = ("'none'",)


# ============================================================================
# Session & CSRF
# ============================================================================

SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict'
SESSION_COOKIE_AGE = int(os.environ.get('SESSION_COOKIE_AGE', '1800'))  # 30 min

CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = False  # SPA needs to read it for the X-CSRFToken header
CSRF_COOKIE_SAMESITE = 'Strict'
CSRF_TRUSTED_ORIGINS = _split_csv('CSRF_TRUSTED_ORIGINS')


# ============================================================================
# CORS — explicit allowlist only
# ============================================================================

CORS_ALLOWED_ORIGINS = _split_csv('CORS_ALLOWED_ORIGINS')
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False  # Hard rule.


# ============================================================================
# Redis / Channels / Cache
# ============================================================================

REDIS_URL = os.environ.get('REDIS_URL', 'redis://redis:6379/0')

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {"hosts": [REDIS_URL]},
    },
}

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {'CLIENT_CLASS': 'django_redis.client.DefaultClient'},
        'KEY_PREFIX': 'capimax_prod',
        'TIMEOUT': 300,
    }
}


# ============================================================================
# Celery
# ============================================================================

CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', REDIS_URL)
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', REDIS_URL)
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_ALWAYS_EAGER = False
CELERY_TASK_EAGER_PROPAGATES = True


# ============================================================================
# Email
# ============================================================================

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.hostinger.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '465'))
EMAIL_USE_SSL = True
EMAIL_USE_TLS = False
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', 'tech@capimaxinvestment.com')
EMAIL_HOST_PASSWORD = os.environ['EMAIL_HOST_PASSWORD']
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'CapiMax Investment <tech@capimaxinvestment.com>')
SERVER_EMAIL = os.environ.get('SERVER_EMAIL', 'tech@capimaxinvestment.com')


# ============================================================================
# Logging
# ============================================================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s',
        },
    },
    'handlers': {
        'console': {'class': 'logging.StreamHandler', 'formatter': 'json'},
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'maxBytes': 10 * 1024 * 1024,
            'backupCount': 5,
            'formatter': 'json',
        },
        'error_file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'django_error.log',
            'maxBytes': 10 * 1024 * 1024,
            'backupCount': 5,
            'formatter': 'json',
            'level': 'ERROR',
        },
    },
    'loggers': {
        'django': {'handlers': ['console', 'file'], 'level': 'INFO', 'propagate': False},
        'django.request': {'handlers': ['console', 'error_file'], 'level': 'ERROR', 'propagate': False},
        'capimax_backend': {'handlers': ['console', 'file'], 'level': 'INFO', 'propagate': False},
        'investments.tasks': {'handlers': ['console', 'file'], 'level': 'INFO', 'propagate': False},
        'payments': {'handlers': ['console', 'file'], 'level': 'INFO', 'propagate': False},
        'blockchain': {'handlers': ['console', 'file'], 'level': 'INFO', 'propagate': False},
    },
}


# ============================================================================
# Static / Media
# ============================================================================

STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage'

if os.environ.get('USE_S3_STORAGE', 'False').lower() == 'true':
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME', 'us-east-1')
    AWS_S3_CUSTOM_DOMAIN = os.environ.get('AWS_S3_CUSTOM_DOMAIN')
    AWS_DEFAULT_ACL = 'private'
    AWS_S3_OBJECT_PARAMETERS = {'CacheControl': 'max-age=86400'}
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'


# ============================================================================
# Throttling
# ----------------------------------------------------------------------------
# Tighter limits than the previous defaults. Financial endpoints are throttled
# at the view level via custom scopes (see investments/views.py).
# ============================================================================

REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '20/hour',
    'user': '120/hour',
    'login': '5/min',
    'register': '3/hour',
    'investment_create': '10/hour',
    'payment_create': '20/hour',
    'webhook': '1000/min',
}


# ============================================================================
# Sentry — required in production
# ============================================================================

SENTRY_DSN = os.environ.get('SENTRY_DSN')
if not SENTRY_DSN:
    import warnings
    warnings.warn(
        "SENTRY_DSN is not set. Errors will not be tracked in production. "
        "This is strongly discouraged.",
        RuntimeWarning,
    )
else:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.redis import RedisIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(auto_enabling=True),
            CeleryIntegration(auto_enabling=True),
            RedisIntegration(),
        ],
        traces_sample_rate=float(os.environ.get('SENTRY_TRACES_SAMPLE_RATE', '0.1')),
        send_default_pii=False,
        environment='production',
        release=os.environ.get('APP_VERSION', '1.0.0'),
    )


# ============================================================================
# Upload limits
# ============================================================================

DATA_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024


# ============================================================================
# Admin
# ============================================================================

ADMIN_URL = os.environ.get('ADMIN_URL', 'admin/')


# ============================================================================
# Health checks
# ============================================================================

HEALTH_CHECK_ENABLED = True


# ============================================================================
# Stripe / NOWPayments / Blockchain — required values exposed for app code
# ============================================================================

STRIPE_SECRET_KEY = os.environ['STRIPE_SECRET_KEY']
STRIPE_WEBHOOK_SECRET = os.environ['STRIPE_WEBHOOK_SECRET']
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')

NOWPAYMENTS_API_KEY = os.environ['NOWPAYMENTS_API_KEY']
NOWPAYMENTS_IPN_SECRET = os.environ['NOWPAYMENTS_IPN_SECRET']
NOWPAYMENTS_API_URL = os.environ.get('NOWPAYMENTS_API_URL', 'https://api.nowpayments.io/v1')

# Blockchain private key MUST come from KMS in production. The env var path
# remains supported for staging environments only — production deployments
# should set BLOCKCHAIN_KEY_PROVIDER=kms and configure the KMS adapter.
BLOCKCHAIN_KEY_PROVIDER = os.environ.get('BLOCKCHAIN_KEY_PROVIDER', 'env')
if BLOCKCHAIN_KEY_PROVIDER == 'env':
    BLOCKCHAIN_PRIVATE_KEY = os.environ.get('BLOCKCHAIN_PRIVATE_KEY', '')
    if not BLOCKCHAIN_PRIVATE_KEY:
        import warnings
        warnings.warn(
            "BLOCKCHAIN_PRIVATE_KEY not set. Blockchain operations will fail. "
            "For mainnet deployments use BLOCKCHAIN_KEY_PROVIDER=kms.",
            RuntimeWarning,
        )
elif BLOCKCHAIN_KEY_PROVIDER == 'kms':
    # The actual signing is delegated to blockchain.services.kms_signer.
    # Configure AWS_REGION and BLOCKCHAIN_KMS_KEY_ID in env.
    BLOCKCHAIN_PRIVATE_KEY = None
else:
    raise ImproperlyConfigured(
        f"BLOCKCHAIN_KEY_PROVIDER='{BLOCKCHAIN_KEY_PROVIDER}' is not supported. "
        "Use 'env' (staging) or 'kms' (production)."
    )
