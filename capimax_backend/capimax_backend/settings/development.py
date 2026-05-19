"""
Development Django settings for capimax_backend project.
Optimized for local development with debugging features enabled.
"""

import os
from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', 'testserver']

# Frontend URL for password reset, email links, OAuth callbacks
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

# Database Configuration - SQLite for development
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# CORS Configuration - Permissive for development
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3030",  # UAT Frontend Port
    "http://127.0.0.1:3030",  # UAT Frontend Port
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = True  # Only in development

# Channels Configuration for WebSockets - In-memory for development
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

# Try to use Redis if available, fallback to in-memory
try:
    import redis
    r = redis.Redis(host='localhost', port=6379, db=0, socket_connect_timeout=1, socket_timeout=1, retry_on_timeout=False)
    r.ping()
    # Redis is available, use it
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                "hosts": [('127.0.0.1', 6379)],
            },
        },
    }
except:
    # Redis not available, use in-memory backend
    pass

# Redis Configuration
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

# Caching Configuration - Local memory for development
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# Try to use Redis for caching if available
try:
    import redis
    r = redis.Redis(host='localhost', port=6379, db=0, socket_connect_timeout=1, socket_timeout=1, retry_on_timeout=False)
    r.ping()
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            }
        }
    }
except:
    pass

# Celery Configuration for development
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_ALWAYS_EAGER = True  # Execute tasks synchronously in development
CELERY_TASK_EAGER_PROPAGATES = True

# Email Configuration - Using Hostinger SMTP for development testing
# For console output during development, use:
# EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# For testing actual email sending with Hostinger SMTP:
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.hostinger.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '465'))
EMAIL_USE_SSL = os.environ.get('EMAIL_USE_SSL', 'True') == 'True'
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'False') == 'True'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', 'tech@capimaxinvestment.com')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'CapiMax Investment <tech@capimaxinvestment.com>')
SERVER_EMAIL = os.environ.get('SERVER_EMAIL', 'tech@capimaxinvestment.com')

# Development Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose'
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'formatter': 'verbose'
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'capimax_backend': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# Development Security Settings - Relaxed for development
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Session settings for development
SESSION_COOKIE_SECURE = False
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

# CSRF settings for development
CSRF_COOKIE_SECURE = False
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'

# Django Debug Toolbar for development (optional)
if DEBUG:
    try:
        import debug_toolbar
        INSTALLED_APPS += ['debug_toolbar']
        MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
        INTERNAL_IPS = ['127.0.0.1', 'localhost']
    except ImportError:
        # Debug toolbar not installed, skip it
        pass

# Development-specific rate limiting (more permissive)
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '1000/hour',
    'user': '5000/hour',
    'login': '10/min',
}

# File upload limits for development
FILE_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024  # 20MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024  # 20MB