"""
Base Django settings for capimax_backend project.
Contains common settings shared across all environments.
"""

import os
from pathlib import Path
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    # Check if this is production environment
    if os.environ.get('DJANGO_SETTINGS_MODULE', '').endswith('production'):
        raise ValueError(
            "SECRET_KEY environment variable must be set in production. "
            "Generate a secure key using: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'"
        )
    else:
        # Use development fallback (NOT FOR PRODUCTION)
        SECRET_KEY = 'django-insecure-dev-key-$k3y-f0r-d3v310pm3nt-0n1y-n0t-pr0duct10n-u53'
        import logging
        logger = logging.getLogger(__name__)
        logger.warning("Using development SECRET_KEY - NOT FOR PRODUCTION USE")

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'channels',
    'drf_yasg',
    
    # Custom apps
    'accounts',
    'properties',
    'investments',
    'payments',
    'kyc',
    'notifications',
    'dashboard',
    'construction',
    'broker',
    'admin_panel',
    # 'ws_app',  # Removed - WebSocket app moved to separate deployment
    'analytics',
    'blockchain',
    'marketplace',
    'core',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'capimax_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'capimax_backend.wsgi.application'
ASGI_APPLICATION = 'capimax_backend.asgi.application'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files (User uploads)
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# Django REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.OrderingFilter',
        'rest_framework.filters.SearchFilter',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'login': '5/min',
    },
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
}

# JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# File Upload Settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

# Custom Settings for the Application
CAPIMAX_SETTINGS = {
    'PLATFORM_COMMISSION_RATE': float(os.environ.get('PLATFORM_COMMISSION_RATE', '0.025')),
    'DEFAULT_INVESTMENT_LIMIT': int(os.environ.get('DEFAULT_INVESTMENT_LIMIT', '10000')),
    'KYC_DOCUMENT_RETENTION_DAYS': int(os.environ.get('KYC_RETENTION_DAYS', '2555')),
    'PASSWORD_RESET_TIMEOUT': int(os.environ.get('PASSWORD_RESET_TIMEOUT', '3600')),
    'EMAIL_VERIFICATION_TIMEOUT': int(os.environ.get('EMAIL_VERIFICATION_TIMEOUT', '86400')),
    'TWO_FACTOR_ISSUER': 'Capimax',
    'BLOCKCHAIN_CONFIRMATION_BLOCKS': int(os.environ.get('BLOCKCHAIN_CONFIRMATION_BLOCKS', '12')),
    'PAYMENT_TIMEOUT_MINUTES': 30,
    'TOKEN_RESERVATION_TIMEOUT_MINUTES': int(os.environ.get('TOKEN_RESERVATION_TIMEOUT', '15')),
}

# Payment Provider Settings
PAYMENT_PROVIDERS = {
    'STRIPE': {
        'PUBLISHABLE_KEY': os.environ.get('STRIPE_PUBLISHABLE_KEY', ''),
        'SECRET_KEY': os.environ.get('STRIPE_SECRET_KEY', ''),
        'WEBHOOK_SECRET': os.environ.get('STRIPE_WEBHOOK_SECRET', ''),
    },
    'COINBASE': {
        'API_KEY': os.environ.get('COINBASE_API_KEY', ''),
        'API_SECRET': os.environ.get('COINBASE_API_SECRET', ''),
    },
    'PAYPAL': {
        'CLIENT_ID': os.environ.get('PAYPAL_CLIENT_ID', ''),
        'CLIENT_SECRET': os.environ.get('PAYPAL_CLIENT_SECRET', ''),
        'SANDBOX': os.environ.get('PAYPAL_SANDBOX', 'True').lower() == 'true',
    },
}

# KYC Provider Settings
KYC_PROVIDERS = {
    'JUMIO': {
        'API_TOKEN': os.environ.get('JUMIO_API_TOKEN', ''),
        'API_SECRET': os.environ.get('JUMIO_API_SECRET', ''),
        'DATACENTER': os.environ.get('JUMIO_DATACENTER', 'US'),
    },
}

# Blockchain Settings
BLOCKCHAIN_SETTINGS = {
    'ETHEREUM_RPC_URL': os.environ.get('ETHEREUM_RPC_URL', 'https://mainnet.infura.io/v3/'),
    'POLYGON_RPC_URL': os.environ.get('POLYGON_RPC_URL', 'https://polygon-rpc.com/'),
    'PRIVATE_KEY': os.environ.get('BLOCKCHAIN_PRIVATE_KEY', ''),
    'CONTRACT_FACTORY_ADDRESS': os.environ.get('CONTRACT_FACTORY_ADDRESS', ''),
}

# Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'localhost')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@capimax.com')

# Create logs directory if it doesn't exist
logs_dir = BASE_DIR / 'logs'
logs_dir.mkdir(exist_ok=True)