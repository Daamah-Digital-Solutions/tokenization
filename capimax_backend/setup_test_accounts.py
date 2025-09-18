#!/usr/bin/env python
"""
Setup script for end-to-end testing - Test Accounts Only
Creates just the test accounts without complex property setup
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, timezone

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capimax_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import transaction
from accounts.models import UserRole
from payments.models import PaymentMethod, WalletBalance

User = get_user_model()

def clean_test_data():
    """Clean test accounts"""
    print("Cleaning test accounts...")

    with transaction.atomic():
        # Remove test accounts and related data
        test_emails = ['investor@test.com', 'owner@test.com']
        test_users = User.objects.filter(email__in=test_emails)

        for user in test_users:
            # Clean related data
            PaymentMethod.objects.filter(user=user).delete()
            WalletBalance.objects.filter(user=user).delete()

        # Delete test users
        test_users.delete()

    print("Test accounts cleaned successfully")

def create_investor_account():
    """Create Account A: Pure Investor"""
    print("Creating Account A: Pure Investor...")

    with transaction.atomic():
        # Create user
        user = User.objects.create_user(
            username='investor_test',
            email='investor@test.com',
            password='TestPass123!',
            first_name='John',
            last_name='Investor',
            role=UserRole.INVESTOR,
            is_active=True,
            is_verified=True,
            country='United States'
        )

        # Create wallet balance
        WalletBalance.objects.create(
            user=user,
            currency='USD',
            available_balance=Decimal('100000.00')
        )

        # Create payment method
        PaymentMethod.objects.create(
            user=user,
            provider='stripe',
            external_id='cus_test_investor',
            method_type='card',
            display_name='Test Card ****4242',
            last_four='4242',
            is_default=True,
            is_verified=True
        )

        print(f"Investor account created: {user.email}")
        return user

def create_property_owner_account():
    """Create Account B: Property Owner"""
    print("Creating Account B: Property Owner...")

    with transaction.atomic():
        # Create user
        user = User.objects.create_user(
            username='owner_test',
            email='owner@test.com',
            password='TestPass123!',
            first_name='Sarah',
            last_name='PropertyOwner',
            role=UserRole.PROPERTY_OWNER,
            is_active=True,
            is_verified=True,
            country='United States'
        )

        # Create payment method
        PaymentMethod.objects.create(
            user=user,
            provider='stripe',
            external_id='cus_test_owner',
            method_type='bank_account',
            display_name='Test Bank ****6789',
            last_four='6789',
            is_default=True,
            is_verified=True
        )

        print(f"Property Owner account created: {user.email}")
        return user

def main():
    """Main setup function"""
    print("Starting test accounts setup...")
    print("=" * 50)

    try:
        # Step 1: Clean test data
        clean_test_data()

        # Step 2: Create test accounts
        investor = create_investor_account()
        owner = create_property_owner_account()

        print("\n" + "=" * 50)
        print("TEST ACCOUNTS SETUP COMPLETED!")
        print("\nLOGIN CREDENTIALS:")
        print("-" * 30)
        print("Account A - Pure Investor:")
        print(f"  Email: {investor.email}")
        print("  Password: TestPass123!")
        print("  Wallet Balance: $100,000")
        print(f"  Verified: {investor.is_verified}")

        print("\nAccount B - Property Owner:")
        print(f"  Email: {owner.email}")
        print("  Password: TestPass123!")
        print(f"  Verified: {owner.is_verified}")

        print("\nTest accounts are ready!")
        print("\nNext Steps:")
        print("- You can now log in with these credentials")
        print("- Property Owner can create properties via the UI")
        print("- Investor can browse and invest in available properties")

    except Exception as e:
        print(f"Error during setup: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()