"""
Settings module selector for Capimax backend.
Selects appropriate settings based on DJANGO_SETTINGS_MODULE environment variable.
"""

import os
from .base import *

# Determine which settings to use based on environment
environment = os.environ.get('ENVIRONMENT', 'development')

if environment == 'production':
    from .production import *
elif environment == 'staging':
    from .staging import *
elif environment == 'testing':
    from .testing import *
else:
    from .development import *