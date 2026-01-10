"""
Pytest configuration for Capimax backend tests.

This file configures pytest to work properly with the Django test environment
and disables incompatible plugins.
"""

import os
import sys
import django
from pathlib import Path

# Add the project root to the Python path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

# Set Django settings module for tests
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capimax_backend.settings_test')
os.environ.setdefault('SECRET_KEY', 'test-secret-key-for-testing-only-do-not-use-in-production-123456789')

# Setup Django
django.setup()


def pytest_configure(config):
    """
    Configure pytest before test collection.
    
    Disables the web3 pytest plugin which has compatibility issues
    with the current eth-typing version.
    """
    # Disable web3's pytest plugin which causes import errors
    config.pluginmanager.set_blocked('web3.tools.pytest_ethereum')
    
    # Set test markers
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests (fast, isolated)"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests (slower, multiple components)"
    )
    config.addinivalue_line(
        "markers", "websocket: marks tests that require WebSocket functionality"
    )
    config.addinivalue_line(
        "markers", "performance: marks tests that measure performance"
    )
    config.addinivalue_line(
        "markers", "slow: marks tests that are slow running"
    )


def pytest_collection_modifyitems(config, items):
    """
    Modify test collection to add markers and configure test execution.
    """
    # Add markers automatically based on test location or name
    for item in items:
        # Add 'slow' marker to tests with 'slow' in their name
        if 'slow' in item.nodeid.lower():
            item.add_marker('slow')
        
        # Add 'integration' marker to tests in integration directories
        if 'integration' in item.nodeid.lower():
            item.add_marker('integration')
        
        # Add 'websocket' marker to WebSocket-related tests
        if 'websocket' in item.nodeid.lower() or 'ws_app' in item.nodeid:
            item.add_marker('websocket')
