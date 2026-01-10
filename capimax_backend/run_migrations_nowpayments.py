#!/usr/bin/env python
"""Script to run NOWPayments migrations."""
import os
import sys
import django

# Set environment variables
os.environ['SECRET_KEY'] = 'u2!6k9z)o42i%$-im@n%vch6eo22u)d##pr!modguhy_d1zj=-'
os.environ['DJANGO_SETTINGS_MODULE'] = 'capimax_backend.settings.development'

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
django.setup()

# Run migrations
from django.core.management import call_command

print("Making migrations for payments app...")
call_command('makemigrations', 'payments', verbosity=2)

print("\nRunning migrations for payments app...")
call_command('migrate', 'payments', verbosity=2)

print("\nNOWPayments migrations completed!")
