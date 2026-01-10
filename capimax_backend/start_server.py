#!/usr/bin/env python
"""Start Django development server."""
import os
import sys
import django
from django.core.management import execute_from_command_line

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capimax_backend.settings.development')
django.setup()

# Force unbuffered output
sys.stdout = os.fdopen(sys.stdout.fileno(), 'w', 1)
sys.stderr = os.fdopen(sys.stderr.fileno(), 'w', 1)

print("Starting Django development server on http://127.0.0.1:8000/")
print("Press Ctrl+C to stop the server")
sys.stdout.flush()

# Start the server
execute_from_command_line(['manage.py', 'runserver', '127.0.0.1:8000', '--noreload'])