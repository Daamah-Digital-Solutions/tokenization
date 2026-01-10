#!/usr/bin/env python
"""
Complete database reset script for UAT testing.
Creates clean environment with only test accounts and one property.
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capimax_backend.settings')
django.setup()

from django.db import transaction
from accounts.models import User, UserRole, UserRoleAssignment
from properties.models import Property
from payments.models import WalletBalance
from investments.models import Investment
from decimal import Decimal
import uuid

print("RESETTING DATABASE FOR UAT...")
print("=" * 50)

# Step 1: Clear all existing data
print("1. Clearing all existing data...")

try:
    with transaction.atomic():
        # Clear all investments first (due to foreign key constraints)
        Investment.objects.all().delete()

        # Clear wallet balances
        WalletBalance.objects.all().delete()

        # Clear properties
        Property.objects.all().delete()

        # Clear all users except superusers
        User.objects.filter(is_superuser=False).delete()

        print("   - All existing data cleared successfully")
except Exception as e:
    print(f"   - Error clearing data: {e}")

# Step 2: Create clean test accounts
print("2. Creating test accounts...")

try:
    with transaction.atomic():
        # Create Investor account
        investor = User.objects.create_user(
            email='investor@test.com',
            password='investor123!',
            first_name='Test',
            last_name='Investor',
            country='USA',
            role=UserRole.INVESTOR,
            is_verified=True,
            is_active=True
        )

        # Create investor wallet with cash balance but no properties/transactions
        investor_wallet = WalletBalance.objects.create(
            user=investor,
            currency='USD',
            available_balance=Decimal('50000.00'),  # $50,000 initial balance
            pending_balance=Decimal('0.00'),
            locked_balance=Decimal('0.00')
        )

        print(f"   - Investor account created: {investor.email}")
        print(f"     Wallet balance: ${investor_wallet.available_balance}")

        # Create Property Owner account
        owner = User.objects.create_user(
            email='owner@test.com',
            password='owner123!',
            first_name='Property',
            last_name='Owner',
            country='USA',
            role=UserRole.PROPERTY_OWNER,
            is_verified=True,
            is_active=True
        )

        # Create owner wallet
        owner_wallet = WalletBalance.objects.create(
            user=owner,
            currency='USD',
            available_balance=Decimal('10000.00'),
            pending_balance=Decimal('0.00'),
            locked_balance=Decimal('0.00')
        )

        print(f"   - Property Owner account created: {owner.email}")
        print(f"     Wallet balance: ${owner_wallet.available_balance}")

except Exception as e:
    print(f"   - Error creating accounts: {e}")

# Step 3: Create one sample property with $0 Total Raised and 0 Investors
print("3. Creating sample property...")

try:
    with transaction.atomic():
        property_obj = Property.objects.create(
            id=uuid.uuid4(),
            owner=owner,
            title="Luxury Downtown Apartment Complex",
            description="Premium residential complex in the heart of downtown, featuring modern amenities and high rental yield potential.",
            property_type="apartment",
            property_category="residential",
            address="123 Downtown Plaza",
            city="New York",
            state="NY",
            country="USA",
            latitude=40.7831,
            longitude=-73.9712,
            property_size=25000,  # sq ft
            year_built=2020,
            total_value=Decimal('2500000.00'),  # $2.5M total value
            token_price=Decimal('100.00'),  # $100 per token
            total_tokens=25000,  # 25,000 tokens total
            tokens_sold=0,  # Starting with 0 tokens sold = $0 Total Raised
            minimum_investment=Decimal('1000.00'),
            expected_return=Decimal('8.5'),  # 8.5% annual return
            rental_yield=Decimal('6.0'),  # 6% rental yield
            monthly_rental_income=Decimal('12500.00'),
            occupancy_rate=Decimal('95.0'),
            status='approved',  # Ready for investment
            supports_installments=True,
            installment_period_months=12,
            rental_income_active=True,
            featured=True
        )

        print(f"   - Property created: {property_obj.title}")
        print(f"     Total Value: ${property_obj.total_value:,}")
        print(f"     Token Price: ${property_obj.token_price}")
        print(f"     Total Tokens: {property_obj.total_tokens:,}")
        print(f"     Tokens Sold: {property_obj.tokens_sold} (Total Raised: $0)")
        print(f"     Available Tokens: {property_obj.total_tokens - property_obj.tokens_sold:,}")
        print(f"     Current Investors: 0")

except Exception as e:
    print(f"   - Error creating property: {e}")

print("\nENVIRONMENT RESET COMPLETE!")
print("=" * 50)
print("TEST ACCOUNTS:")
print("- Investor: investor@test.com / investor123! (Balance: $50,000)")
print("- Owner: owner@test.com / owner123! (Balance: $10,000)")
print("")
print("PROPERTY STATUS:")
print("- 1 property owned by owner@test.com")
print("- $0 Total Raised (0 tokens sold)")
print("- 0 Investors")
print("- Ready for investment testing")
print("")
print("CLEAN REAL-DATA ENVIRONMENT READY FOR UAT")