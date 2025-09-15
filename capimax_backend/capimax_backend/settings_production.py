"""
Production settings for Capimax Backend.

This configuration is optimized for production deployment with
security, performance, and monitoring considerations.
"""

from .settings import *
import os
import dj_database_url
from datetime import timedelta

# Security Settings
DEBUG = False
TESTING = False

# Environment-based configuration
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'production')

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise ValueError('SECRET_KEY environment variable must be set in production')

# Allowed hosts configuration
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')
if not ALLOWED_HOSTS or ALLOWED_HOSTS == ['']:
    raise ValueError('ALLOWED_HOSTS environment variable must be set in production')

# Database Configuration
# Use DATABASE_URL for easier deployment
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL)
    }
else:
    # Fallback to individual environment variables
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'capimax_prod'),
            'USER': os.environ.get('DB_USER', 'capimax'),
            'PASSWORD': os.environ.get('DB_PASSWORD'),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5432'),
            'CONN_MAX_AGE': int(os.environ.get('DB_CONN_MAX_AGE', '60')),
            'OPTIONS': {
                'connect_timeout': 10,
                'options': '-c default_transaction_isolation=serializable'
            },
        }
    }

# Database connection pooling
DATABASES['default']['CONN_HEALTH_CHECKS'] = True

# Redis Configuration
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

# Cache Configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 100,
                'retry_on_timeout': True,
            },
            'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
        },
        'KEY_PREFIX': 'capimax_prod',
        'TIMEOUT': 300,
    }
}

# Session configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
SESSION_COOKIE_AGE = 3600  # 1 hour
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

# CSRF Configuration
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'

# Security Middleware Configuration
MIDDLEWARE = [
    'core.middleware.SecurityHeadersMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Static files
    'core.middleware.RateLimitMiddleware',
    'core.middleware.RequestMonitoringMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'core.middleware.MaintenanceModeMiddleware',
]

# Add IP whitelist middleware if configured
if os.environ.get('ENABLE_IP_WHITELIST', 'False').lower() == 'true':
    MIDDLEWARE.insert(-1, 'core.middleware.IPWhitelistMiddleware')

# Security Headers Configuration
SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Content-Security-Policy': os.environ.get('CSP_POLICY', 
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; "
        "style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; "
        "connect-src 'self' https://api.stripe.com wss:; frame-src https://js.stripe.com"
    )
}

# Enhanced Security Settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'True').lower() == 'true'
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Rate Limiting Configuration
RATE_LIMITS = {
    'default': int(os.environ.get('RATE_LIMIT_DEFAULT', '300')),
    'api': int(os.environ.get('RATE_LIMIT_API', '120')),
    'auth': int(os.environ.get('RATE_LIMIT_AUTH', '10')),
    'upload': int(os.environ.get('RATE_LIMIT_UPLOAD', '5')),
    'anonymous': int(os.environ.get('RATE_LIMIT_ANONYMOUS', '30')),
    'authenticated': int(os.environ.get('RATE_LIMIT_AUTHENTICATED', '500'))
}

# IP Restrictions (if needed)
IP_RESTRICTIONS = {}
if os.environ.get('ADMIN_WHITELIST_IPS'):
    IP_RESTRICTIONS['/admin/'] = os.environ.get('ADMIN_WHITELIST_IPS').split(',')

# Static Files Configuration
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media Files Configuration
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Use cloud storage for media files in production
if os.environ.get('USE_S3_STORAGE', 'False').lower() == 'true':
    # AWS S3 Configuration
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME', 'us-east-1')
    AWS_S3_CUSTOM_DOMAIN = os.environ.get('AWS_S3_CUSTOM_DOMAIN')
    AWS_DEFAULT_ACL = None
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',
    }

# Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.sendgrid.net')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@capimax.com')
SERVER_EMAIL = os.environ.get('SERVER_EMAIL', DEFAULT_FROM_EMAIL)

# Celery Configuration for Production
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', REDIS_URL)
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', REDIS_URL)
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_ALWAYS_EAGER = False
CELERY_TASK_EAGER_PROPAGATES = False
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_TASK_ACKS_LATE = True

# Celery Beat Configuration
CELERY_BEAT_SCHEDULE = {
    'cleanup-expired-reservations': {
        'task': 'investments.tasks.cleanup_expired_reservations',
        'schedule': timedelta(minutes=15),
    },
    'process-pending-dividends': {
        'task': 'investments.tasks.process_pending_dividends',
        'schedule': timedelta(hours=1),
    },
    'update-property-analytics': {
        'task': 'properties.tasks.update_property_analytics',
        'schedule': timedelta(hours=6),
    },
    'cleanup-old-logs': {
        'task': 'core.tasks.cleanup_old_logs',
        'schedule': timedelta(days=1),
    },
}

# Channels Configuration for Production
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [REDIS_URL],
            'capacity': 1500,
            'expiry': 60,
        },
    },
}

# REST Framework Configuration for Production
REST_FRAMEWORK.update({
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': f'{RATE_LIMITS["anonymous"]}/hour',
        'user': f'{RATE_LIMITS["authenticated"]}/hour',
        'login': '10/min',
    },
})

# JWT Configuration for Production
SIMPLE_JWT.update({
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.environ.get('JWT_ACCESS_LIFETIME', '30'))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.environ.get('JWT_REFRESH_LIFETIME', '7'))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
})

# CORS Configuration for Production
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'json': {
            'format': '{"level": "%(levelname)s", "time": "%(asctime)s", "module": "%(module)s", "message": "%(message)s"}',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose' if os.environ.get('LOG_FORMAT') != 'json' else 'json',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'production.log'),
            'maxBytes': 1024 * 1024 * 100,  # 100 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'error_file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'error.log'),
            'maxBytes': 1024 * 1024 * 50,  # 50 MB
            'backupCount': 5,
            'formatter': 'verbose',
            'level': 'ERROR',
        },
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler',
            'filters': ['require_debug_false'],
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': os.environ.get('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'capimax_backend': {
            'handlers': ['console', 'file', 'error_file'],
            'level': os.environ.get('APP_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'django.security': {
            'handlers': ['console', 'file', 'mail_admins'],
            'level': 'WARNING',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'file', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
}

# Admin Configuration
ADMINS = [
    ('Admin', os.environ.get('ADMIN_EMAIL', 'admin@capimax.com')),
]
MANAGERS = ADMINS

# Error Reporting Configuration
if os.environ.get('SENTRY_DSN'):
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.redis import RedisIntegration
    
    sentry_sdk.init(
        dsn=os.environ.get('SENTRY_DSN'),
        integrations=[
            DjangoIntegration(transaction_style='url'),
            CeleryIntegration(monitor_beat_tasks=True),
            RedisIntegration(),
        ],
        traces_sample_rate=float(os.environ.get('SENTRY_TRACES_SAMPLE_RATE', '0.1')),
        send_default_pii=False,
        environment=ENVIRONMENT,
        release=os.environ.get('APP_VERSION', '1.0.0'),
    )

# Performance Monitoring
if os.environ.get('ENABLE_PERFORMANCE_MONITORING', 'True').lower() == 'true':
    MIDDLEWARE.append('django.middleware.cache.UpdateCacheMiddleware')
    MIDDLEWARE.insert(0, 'django.middleware.cache.FetchFromCacheMiddleware')
    
    # Cache configuration for middleware
    CACHE_MIDDLEWARE_ALIAS = 'default'
    CACHE_MIDDLEWARE_SECONDS = int(os.environ.get('CACHE_MIDDLEWARE_SECONDS', '300'))
    CACHE_MIDDLEWARE_KEY_PREFIX = 'capimax_page'

# Health Check Configuration
if 'health_check' not in INSTALLED_APPS:
    INSTALLED_APPS.append('health_check')
    INSTALLED_APPS.extend([
        'health_check.db',
        'health_check.cache',
        'health_check.storage',
        'health_check.contrib.redis',
        'health_check.contrib.celery',
    ])

# Payment Provider Settings (Production)
PAYMENT_PROVIDERS = {
    'STRIPE': {
        'PUBLISHABLE_KEY': os.environ.get('STRIPE_PUBLISHABLE_KEY'),
        'SECRET_KEY': os.environ.get('STRIPE_SECRET_KEY'),
        'WEBHOOK_SECRET': os.environ.get('STRIPE_WEBHOOK_SECRET'),
    },
    'COINBASE': {
        'API_KEY': os.environ.get('COINBASE_API_KEY'),
        'API_SECRET': os.environ.get('COINBASE_API_SECRET'),
        'WEBHOOK_SECRET': os.environ.get('COINBASE_WEBHOOK_SECRET'),
    },
    'PAYPAL': {
        'CLIENT_ID': os.environ.get('PAYPAL_CLIENT_ID'),
        'CLIENT_SECRET': os.environ.get('PAYPAL_CLIENT_SECRET'),
        'SANDBOX': os.environ.get('PAYPAL_SANDBOX', 'False').lower() == 'true',
    },
}

# KYC Provider Settings (Production)
KYC_PROVIDERS = {
    'JUMIO': {
        'API_TOKEN': os.environ.get('JUMIO_API_TOKEN'),
        'API_SECRET': os.environ.get('JUMIO_API_SECRET'),
        'DATACENTER': os.environ.get('JUMIO_DATACENTER', 'US'),
        'CALLBACK_URL': os.environ.get('JUMIO_CALLBACK_URL'),
    },
}

# Blockchain Settings (Production)
BLOCKCHAIN_SETTINGS = {
    'ETHEREUM_RPC_URL': os.environ.get('ETHEREUM_RPC_URL'),
    'POLYGON_RPC_URL': os.environ.get('POLYGON_RPC_URL'),
    'PRIVATE_KEY': os.environ.get('BLOCKCHAIN_PRIVATE_KEY'),
    'CONTRACT_FACTORY_ADDRESS': os.environ.get('CONTRACT_FACTORY_ADDRESS'),
    'CONFIRMATION_BLOCKS': int(os.environ.get('BLOCKCHAIN_CONFIRMATION_BLOCKS', '12')),
}

# Custom Settings for Production
CAPIMAX_SETTINGS.update({
    'PLATFORM_COMMISSION_RATE': float(os.environ.get('PLATFORM_COMMISSION_RATE', '0.025')),
    'DEFAULT_INVESTMENT_LIMIT': int(os.environ.get('DEFAULT_INVESTMENT_LIMIT', '100000')),
    'KYC_DOCUMENT_RETENTION_DAYS': int(os.environ.get('KYC_RETENTION_DAYS', '2555')),
    'PASSWORD_RESET_TIMEOUT': int(os.environ.get('PASSWORD_RESET_TIMEOUT', '3600')),
    'EMAIL_VERIFICATION_TIMEOUT': int(os.environ.get('EMAIL_VERIFICATION_TIMEOUT', '86400')),
    'TOKEN_RESERVATION_TIMEOUT_MINUTES': int(os.environ.get('TOKEN_RESERVATION_TIMEOUT', '15')),
    'ENABLE_EMAIL_NOTIFICATIONS': os.environ.get('ENABLE_EMAIL_NOTIFICATIONS', 'True').lower() == 'true',
    'ENABLE_SMS_NOTIFICATIONS': os.environ.get('ENABLE_SMS_NOTIFICATIONS', 'False').lower() == 'true',
    'MAX_FILE_UPLOAD_SIZE': int(os.environ.get('MAX_FILE_UPLOAD_SIZE', '10485760')),  # 10MB
})

# Data Upload Settings
FILE_UPLOAD_MAX_MEMORY_SIZE = CAPIMAX_SETTINGS['MAX_FILE_UPLOAD_SIZE']
DATA_UPLOAD_MAX_MEMORY_SIZE = CAPIMAX_SETTINGS['MAX_FILE_UPLOAD_SIZE']

# Ensure logs directory exists
import os
logs_dir = BASE_DIR / 'logs'
logs_dir.mkdir(exist_ok=True)

# Validate required environment variables
required_env_vars = [
    'SECRET_KEY',
    'ALLOWED_HOSTS',
    'DB_PASSWORD',
    'EMAIL_HOST_USER',
    'EMAIL_HOST_PASSWORD',
]

missing_vars = []
for var in required_env_vars:
    if not os.environ.get(var):
        missing_vars.append(var)

if missing_vars:
    raise ValueError(f'The following environment variables are required: {", ".join(missing_vars)}')