"""
Staging Django settings for capimax_backend project.
Settings for staging environment - similar to production but with debugging.
"""

import os
from .production import *

# Allow debugging in staging
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

# Staging-specific allowed hosts
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'staging.capimax.com,localhost').split(',')

# Less restrictive CORS for staging
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', 'https://staging-app.capimax.com').split(',')

# Staging database configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'capimax_staging'),
        'USER': os.environ.get('DB_USER', 'capimax'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'CONN_MAX_AGE': int(os.environ.get('DB_CONN_MAX_AGE', '300')),
    }
}

# Staging-specific logging with more detailed logs
LOGGING['loggers']['django']['level'] = 'DEBUG'
LOGGING['loggers']['capimax_backend']['level'] = 'DEBUG'

# Staging cache prefix
CACHES['default']['KEY_PREFIX'] = 'capimax_staging'

# More permissive rate limiting for staging
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '200/hour',
    'user': '2000/hour',
    'login': '10/min',
}

# Staging email configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@staging.capimax.com')

# Disable some security features for easier staging testing
SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'False').lower() == 'true'
SECURE_HSTS_SECONDS = 0  # Disable HSTS in staging