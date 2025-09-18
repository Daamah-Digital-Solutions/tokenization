#!/usr/bin/env python
"""
Quick script to create wallet balance for testing
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capimax_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from payments.models import WalletBalance

User = get_user_model()

def create_wallet_balance():
    """Create wallet balance for existing test user"""
    try:
        # Get the test user (assuming there's one)
        user = User.objects.filter(email__icontains='test').first()
        if not user:
            # Try to get any user
            user = User.objects.first()

        if not user:
            print("No users found. Please create a user first.")
            return

        print(f"Creating wallet balance for user: {user.email}")

        # Create or update USD wallet balance
        wallet_balance, created = WalletBalance.objects.get_or_create(
            user=user,
            currency='USD',
            defaults={
                'available_balance': Decimal('100000.00'),
                'locked_balance': Decimal('0.00'),
                'pending_balance': Decimal('0.00'),
                'currency_type': 'fiat'
            }
        )

        if not created:
            wallet_balance.available_balance = Decimal('100000.00')
            wallet_balance.save()

        print(f"SUCCESS: Created/Updated USD wallet balance: ${wallet_balance.available_balance}")

        # Create or update BTC wallet balance
        btc_balance, created = WalletBalance.objects.get_or_create(
            user=user,
            currency='BTC',
            defaults={
                'available_balance': Decimal('0.1'),
                'locked_balance': Decimal('0.00'),
                'pending_balance': Decimal('0.00'),
                'currency_type': 'crypto'
            }
        )

        if not created:
            btc_balance.available_balance = Decimal('0.1')
            btc_balance.save()

        print(f"SUCCESS: Created/Updated BTC wallet balance: {btc_balance.available_balance} BTC")

        print("\nWallet balances created successfully!")
        print(f"User: {user.email}")
        print(f"USD Balance: ${wallet_balance.available_balance}")
        print(f"BTC Balance: {btc_balance.available_balance} BTC")

    except Exception as e:
        print(f"ERROR: Error creating wallet balance: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    create_wallet_balance()