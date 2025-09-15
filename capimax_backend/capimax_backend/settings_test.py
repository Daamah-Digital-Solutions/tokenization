"""
Test settings for capimax_backend project.
Optimized for fast test execution.
"""

from .settings import *
import tempfile

# Override settings for testing
DEBUG = False
TESTING = True

# Use in-memory SQLite for faster tests
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
        'OPTIONS': {
            'timeout': 1,
        },
    }
}

# Disable migrations for faster test setup
class DisableMigrations:
    def __contains__(self, item):
        return True
    
    def __getitem__(self, item):
        return None

MIGRATION_MODULES = DisableMigrations()

# Use dummy cache for testing
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}

# Disable channels layer for testing (use in-memory)
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    }
}

# Simple password hashing for faster tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Disable logging during tests
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'null': {
            'class': 'logging.NullHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['null'],
        },
        'capimax_backend': {
            'handlers': ['null'],
        },
    },
}

# Use temporary directory for media files
MEDIA_ROOT = tempfile.mkdtemp()

# Disable email sending during tests
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# Disable Celery during tests
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Test-specific settings
TEST_SETTINGS = {
    'SKIP_EXTERNAL_API_CALLS': True,
    'MOCK_PAYMENT_PROVIDERS': True,
    'MOCK_KYC_PROVIDERS': True,
    'MOCK_BLOCKCHAIN_CALLS': True,
}

# Override payment providers for testing
PAYMENT_PROVIDERS = {
    'STRIPE': {
        'PUBLISHABLE_KEY': 'pk_test_12345',
        'SECRET_KEY': 'sk_test_12345',
        'WEBHOOK_SECRET': 'whsec_test_12345',
    },
    'COINBASE': {
        'API_KEY': 'test_api_key',
        'API_SECRET': 'test_api_secret',
    },
    'PAYPAL': {
        'CLIENT_ID': 'test_client_id',
        'CLIENT_SECRET': 'test_client_secret',
        'SANDBOX': True,
    },
}

# Override KYC providers for testing
KYC_PROVIDERS = {
    'JUMIO': {
        'API_TOKEN': 'test_api_token',
        'API_SECRET': 'test_api_secret',
        'DATACENTER': 'US',
    },
}

# Override blockchain settings for testing
BLOCKCHAIN_SETTINGS = {
    'ETHEREUM_RPC_URL': 'http://localhost:8545',
    'POLYGON_RPC_URL': 'http://localhost:8545',
    'PRIVATE_KEY': '0x' + '1' * 64,  # Test private key
    'CONTRACT_FACTORY_ADDRESS': '0x' + '0' * 40,  # Test contract address
}

# Security settings can be relaxed for testing
SECURE_BROWSER_XSS_FILTER = False
SECURE_CONTENT_TYPE_NOSNIFF = False
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Disable throttling for tests
REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = []
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {}