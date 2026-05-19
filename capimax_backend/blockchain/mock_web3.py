"""
Mock Web3 implementation — DEVELOPMENT/TEST ONLY.

This module exists ONLY to allow tests to run without a real RPC endpoint
and to give developers a way to boot the Django app when web3.py is not yet
installed. It is GUARDED so it cannot be imported in production.

If `DJANGO_SETTINGS_MODULE` points at the production settings (or
`ENVIRONMENT == 'production'`), importing this module raises
`ImportError`. This is intentional — any code path that would use the mock
in production is a bug we want to surface at import time, not at runtime.
"""

import os
import sys


def _is_production() -> bool:
    """Return True if we are running with production settings."""
    settings_module = os.environ.get('DJANGO_SETTINGS_MODULE', '')
    environment = os.environ.get('ENVIRONMENT', '').lower()
    if environment == 'production':
        return True
    if 'production' in settings_module:
        return True
    return False


if _is_production() and 'pytest' not in sys.modules:
    raise ImportError(
        "blockchain.mock_web3 cannot be imported in production. "
        "Install web3==6.12.0 and use blockchain.services.web3_service instead."
    )


class MockWeb3:
    """Mock Web3 class for development purposes."""

    @staticmethod
    def isConnected():
        return False

    @staticmethod
    def isAddress(address):
        return isinstance(address, str) and len(address) == 42

    def toChecksumAddress(self, address):
        return address

    def toWei(self, amount, unit):
        return int(amount * (10**18)) if unit == 'ether' else amount

    def fromWei(self, amount, unit):
        return amount / (10**18) if unit == 'ether' else amount


class MockContract:
    """Mock Contract class for development purposes."""

    def __init__(self, *args, **kwargs):
        pass

    def functions(self):
        return self

    def __getattr__(self, name):
        return lambda *args, **kwargs: self

    def call(self):
        return 0

    def transact(self, *args, **kwargs):
        return "0x0000000000000000000000000000000000000000000000000000000000000000"


class MockAccount:
    """Mock Account class for development purposes."""

    @staticmethod
    def create():
        return type('Account', (), {
            'address': '0x0000000000000000000000000000000000000000',
            'privateKey': '0x0000000000000000000000000000000000000000000000000000000000000000'
        })()

    @staticmethod
    def from_key(private_key):
        return MockAccount.create()


class ContractLogicError(Exception):
    """Mock ContractLogicError exception."""
    pass


class TransactionNotFound(Exception):
    """Mock TransactionNotFound exception."""
    pass


def to_checksum_address(address):
    """Mock checksum address function."""
    return address


# Mock Web3 instance — only available outside production
Web3 = MockWeb3()
Contract = MockContract
Account = MockAccount()
