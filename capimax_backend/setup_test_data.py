#!/usr/bin/env python
"""
Setup script for end-to-end testing
Cleans database and creates test accounts
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, timezone
import uuid

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capimax_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import transaction
from accounts.models import UserRole
from properties.models import Property
from investments.models import Investment
from payments.models import Payment, UserPaymentMethod, WalletBalance

User = get_user_model()

def clean_database():
    """Clean all test data from database"""
    print("Cleaning database...")

    with transaction.atomic():
        # Clean in dependency order
        Payment.objects.all().delete()
        Investment.objects.all().delete()
        Property.objects.all().delete()
        UserPaymentMethod.objects.all().delete()
        WalletBalance.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

    print("Database cleaned successfully")

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
        wallet = WalletBalance.objects.create(
            user=user,
            currency='USD',
            available_balance=Decimal('100000.00'),
            currency_type='fiat'
        )

        # Create payment method
        UserPaymentMethod.objects.create(
            user=user,
            method_type='credit_card',
            display_name='Test Credit Card',
            last_four='4242',
            brand='Visa',
            is_default=True,
            is_verified=True,
            external_id='cus_test_investor'
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
        UserPaymentMethod.objects.create(
            user=user,
            method_type='bank_transfer',
            display_name='Test Bank Account',
            last_four='6789',
            brand='Wells Fargo',
            is_default=True,
            is_verified=True,
            external_id='cus_test_owner'
        )

        print(f"Property Owner account created: {user.email}")
        return user

def create_sample_property(owner):
    """Create a sample property ready for investment"""
    print("Creating sample property...")

    with transaction.atomic():
        # Create property
        property_obj = Property.objects.create(
            title="Downtown Office Complex",
            description="A modern office complex in the heart of downtown, featuring premium commercial spaces with high occupancy rates and stable rental income.",
            address="123 Business District, New York, NY 10001",
            city="New York",
            state="NY",
            country="United States",
            property_type="commercial",
            total_value=Decimal('2500000.00'),
            token_price=Decimal('100.00'),
            total_tokens=25000,
            tokens_sold=0,
            expected_return=Decimal('8.5'),
            rental_yield=Decimal('7.2'),
            minimum_investment=Decimal('1000.00'),
            owner=owner,
            status='active',
            property_category='ready_property',
            monthly_rental_income=Decimal('15000.00'),
            rental_income_active=True,
            occupancy_rate=Decimal('95.00'),
            property_size=Decimal('50000.00'),
            year_built=2018,
            smart_contract_address=f"0x{uuid.uuid4().hex[:40]}"
        )

        print(f"Sample property created: {property_obj.title}")
        print(f"   - Total Value: ${property_obj.total_value:,}")
        print(f"   - Token Price: ${property_obj.token_price}")
        print(f"   - Expected Return: {property_obj.expected_return}%")
        print(f"   - Total Tokens: {property_obj.total_tokens:,}")
        print(f"   - Monthly Income: ${property_obj.monthly_rental_income:,}")

        return property_obj

def main():
    """Main setup function"""
    print("Starting end-to-end test setup...")
    print("=" * 50)

    try:
        # Step 1: Clean database
        clean_database()

        # Step 2: Create test accounts
        investor = create_investor_account()
        owner = create_property_owner_account()

        # Step 3: Create sample property
        property_obj = create_sample_property(owner)

        print("\n" + "=" * 50)
        print("TEST SETUP COMPLETED SUCCESSFULLY!")
        print("\nLOGIN CREDENTIALS:")
        print("-" * 30)
        print("Account A - Pure Investor:")
        print(f"  Email: {investor.email}")
        print("  Password: TestPass123!")
        print(f"  Wallet Balance: $100,000")
        print(f"  Verified: {investor.is_verified}")

        print("\nAccount B - Property Owner:")
        print(f"  Email: {owner.email}")
        print("  Password: TestPass123!")
        print(f"  Verified: {owner.is_verified}")
        print(f"  Property: {property_obj.title}")

        print("\nSAMPLE PROPERTY:")
        print("-" * 30)
        print(f"  Title: {property_obj.title}")
        print(f"  Value: ${property_obj.total_value:,}")
        print(f"  Status: {property_obj.status}")
        print(f"  Available for investment: Yes")

        print("\nPlatform is ready for end-to-end testing!")

    except Exception as e:
        print(f"Error during setup: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()