#!/usr/bin/env python
"""Check wallet balance data in the database."""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capimax_backend.settings.development')
django.setup()

from payments.models import WalletBalance
from accounts.models import User
from decimal import Decimal

def check_wallet_data():
    """Check and create wallet balance data if needed."""
    # Find test investor user
    user = User.objects.filter(email='investor@test.com').first()

    if not user:
        print("Error: Test investor user not found!")
        return False

    print(f"User found: {user.email}")

    # Check existing wallet balances
    balances = WalletBalance.objects.filter(user=user)
    print(f"Existing wallet balances: {balances.count()}")

    if balances.exists():
        for balance in balances:
            print(f"  - {balance.currency}: {balance.total_balance} (available: {balance.available_balance})")
    else:
        print("No wallet balances found. Creating default balances...")

        # Create default USD balance
        usd_balance = WalletBalance.objects.create(
            user=user,
            currency='USD',
            total_balance=Decimal('10000.00'),
            available_balance=Decimal('10000.00'),
            locked_balance=Decimal('0.00')
        )
        print(f"Created USD balance: {usd_balance.total_balance}")

        # Create default USDC balance
        usdc_balance = WalletBalance.objects.create(
            user=user,
            currency='USDC',
            total_balance=Decimal('5000.00'),
            available_balance=Decimal('5000.00'),
            locked_balance=Decimal('0.00')
        )
        print(f"Created USDC balance: {usdc_balance.total_balance}")

    return True

if __name__ == '__main__':
    success = check_wallet_data()
    sys.exit(0 if success else 1)