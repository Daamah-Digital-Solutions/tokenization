#!/usr/bin/env python
"""
Simple test runner script that works around Web3.py compatibility issues.
"""
import os
import sys
import django
from django.conf import settings
from django.test.utils import get_runner

# Set environment variables
os.environ['SECRET_KEY'] = 'test-secret-key-for-testing-only-do-not-use-in-production-123456789'
os.environ['DJANGO_SETTINGS_MODULE'] = 'capimax_backend.settings.development'

# Setup Django
django.setup()

# Run tests
TestRunner = get_runner(settings)
test_runner = TestRunner(verbosity=2, keepdb=True)

# Run all tests
failures = test_runner.run_tests(None)

sys.exit(bool(failures))
