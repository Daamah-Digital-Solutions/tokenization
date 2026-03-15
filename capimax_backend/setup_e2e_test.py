#!/usr/bin/env python
"""
E2E Test Environment Setup for Capimax Platform.
Creates all user roles, properties, and test data needed for comprehensive testing.
"""

import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal
from django.utils import timezone
from django.contrib.auth.hashers import make_password

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capimax_backend.settings.development')
django.setup()

from accounts.models import User
from properties.models import (
    Property, PropertyCategory, PropertyStatus, PropertyImage
)
from investments.models import Investment, InvestmentStatus
from payments.models import (
    WalletBalance, WalletTransaction, Payment, PaymentStatus, PaymentMethod
)

PASSWORD = "TestPass123!"


def create_users():
    """Create all test user roles."""
    print("\n--- Creating Test Users ---")

    users = {}

    # Admin (superuser)
    admin, created = User.objects.get_or_create(
        email="admin@capimax.com",
        defaults={
            'username': 'admin_test',
            'password': make_password(PASSWORD),
            'first_name': 'Admin',
            'last_name': 'User',
            'role': 'admin',
            'is_verified': True,
            'is_active': True,
            'is_staff': True,
            'is_superuser': True,
            'phone': '+971-50-1234567',
            'country': 'United Arab Emirates',
            'city': 'Dubai',
        }
    )
    users['admin'] = admin
    print(f"  {'Created' if created else 'Exists'}: admin@capimax.com (Admin/Superuser)")

    # Investor
    investor, created = User.objects.get_or_create(
        email="investor@test.com",
        defaults={
            'username': 'investor_test',
            'password': make_password(PASSWORD),
            'first_name': 'Ahmed',
            'last_name': 'Investor',
            'role': 'investor',
            'is_verified': True,
            'is_active': True,
            'phone': '+971-55-1234567',
            'date_of_birth': datetime(1990, 1, 15).date(),
            'country': 'United Arab Emirates',
            'city': 'Abu Dhabi',
        }
    )
    users['investor'] = investor
    print(f"  {'Created' if created else 'Exists'}: investor@test.com (Investor)")

    # Property Owner
    owner, created = User.objects.get_or_create(
        email="owner@test.com",
        defaults={
            'username': 'owner_test',
            'password': make_password(PASSWORD),
            'first_name': 'Fatima',
            'last_name': 'Developer',
            'role': 'property_owner',
            'is_verified': True,
            'is_active': True,
            'phone': '+971-50-9876543',
            'country': 'United Arab Emirates',
            'city': 'Dubai',
        }
    )
    users['owner'] = owner
    print(f"  {'Created' if created else 'Exists'}: owner@test.com (Property Owner)")

    # Broker
    broker, created = User.objects.get_or_create(
        email="broker@test.com",
        defaults={
            'username': 'broker_test',
            'password': make_password(PASSWORD),
            'first_name': 'Omar',
            'last_name': 'Broker',
            'role': 'broker',
            'is_verified': True,
            'is_active': True,
            'phone': '+971-55-5555555',
            'country': 'United Arab Emirates',
            'city': 'Sharjah',
        }
    )
    users['broker'] = broker
    print(f"  {'Created' if created else 'Exists'}: broker@test.com (Broker)")

    return users


def setup_wallets(users):
    """Create wallet balances for investor and owner."""
    print("\n--- Setting Up Wallets ---")

    for role in ['investor', 'owner']:
        user = users[role]
        balance = Decimal('100000.00') if role == 'investor' else Decimal('50000.00')

        wallet, created = WalletBalance.objects.get_or_create(
            user=user,
            currency='USD',
            defaults={
                'currency_type': 'fiat',
                'available_balance': balance,
                'pending_balance': Decimal('0.00'),
                'locked_balance': Decimal('0.00'),
                'is_active': True,
            }
        )

        if created:
            WalletTransaction.objects.create(
                user=user,
                transaction_type='deposit',
                amount=balance,
                currency='USD',
                balance_before=Decimal('0.00'),
                balance_after=balance,
                description=f'Initial test funding for {role}',
            )

        print(f"  {user.email}: ${wallet.available_balance:,.2f} USD")


def create_properties(users):
    """Create test properties: 1 ready, 1 under construction."""
    print("\n--- Creating Properties ---")
    owner = users['owner']
    properties = {}

    # Ready Property
    ready, created = Property.objects.get_or_create(
        title="Al Reem Tower - Luxury Apartments",
        defaults={
            'description': (
                'Premium residential tower in Al Reem Island, Abu Dhabi. '
                '80 luxury furnished apartments with full sea views, gym, pool, '
                'and 24/7 concierge. Fully occupied with stable rental income.\n\n'
                'Investment highlights:\n'
                '- 95% occupancy rate\n'
                '- Professional property management\n'
                '- 8.5% expected annual return\n'
                '- Monthly dividend distributions'
            ),
            'owner': owner,
            'property_type': 'residential',
            'property_category': PropertyCategory.READY_PROPERTY,
            'status': PropertyStatus.ACTIVE,
            'total_value': Decimal('2000000.00'),
            'token_price': Decimal('100.00'),
            'total_tokens': 20000,
            'tokens_sold': 0,
            'expected_return': Decimal('8.50'),
            'rental_yield': Decimal('7.50'),
            'minimum_investment': Decimal('500.00'),
            'rental_income_active': True,
            'monthly_rental_income': Decimal('14166.67'),
            'occupancy_rate': Decimal('95.00'),
            'address': 'Al Reem Island, Tower 7',
            'city': 'Abu Dhabi',
            'state': 'Abu Dhabi',
            'country': 'United Arab Emirates',
            'latitude': Decimal('24.4949'),
            'longitude': Decimal('54.4100'),
            'property_size': Decimal('65000.00'),
            'year_built': 2021,
            'featured': True,
            'spv_company_name': 'Al Reem Tower SPV Ltd',
            'spv_registration_number': 'SPV-2024-001',
            'spv_bank_name': 'Emirates NBD',
            'spv_bank_account_number': 'AE12 0260 0012 3456 7890 123',
            'spv_establishment_date': datetime(2024, 1, 15).date(),
        }
    )
    properties['ready'] = ready
    print(f"  {'Created' if created else 'Exists'}: {ready.title} (Ready, ${ready.total_value:,.0f})")

    # Under Construction Property
    uc, created = Property.objects.get_or_create(
        title="Dubai Creek Harbour Residences",
        defaults={
            'description': (
                'Luxury waterfront development at Dubai Creek Harbour with views of '
                'the iconic Dubai Creek Tower. 150 premium units across 40 floors.\n\n'
                'Construction highlights:\n'
                '- 40% completed, on schedule\n'
                '- Expected completion: Q2 2027\n'
                '- 12% projected return on completion\n'
                '- Installment payment available\n'
                '- Prime location in emerging district'
            ),
            'owner': owner,
            'property_type': 'residential',
            'property_category': PropertyCategory.UNDER_CONSTRUCTION,
            'status': PropertyStatus.ACTIVE,
            'total_value': Decimal('5000000.00'),
            'token_price': Decimal('200.00'),
            'total_tokens': 25000,
            'tokens_sold': 0,
            'expected_return': Decimal('12.00'),
            'rental_yield': Decimal('0.00'),
            'minimum_investment': Decimal('1000.00'),
            'rental_income_active': False,
            'monthly_rental_income': Decimal('0.00'),
            'occupancy_rate': Decimal('0.00'),
            'expected_completion_date': (timezone.now() + timedelta(days=450)).date(),
            'construction_progress': Decimal('40.00'),
            'supports_installments': True,
            'installment_period_months': 18,
            'address': 'Dubai Creek Harbour, Plot D-42',
            'city': 'Dubai',
            'state': 'Dubai',
            'country': 'United Arab Emirates',
            'latitude': Decimal('25.1972'),
            'longitude': Decimal('55.3444'),
            'property_size': Decimal('95000.00'),
            'year_built': None,
            'featured': True,
            'spv_company_name': 'Creek Harbour Residences SPV LLC',
            'spv_registration_number': 'SPV-2024-002',
            'spv_bank_name': 'Abu Dhabi Commercial Bank',
            'spv_bank_account_number': 'AE98 0300 0045 6789 0123 456',
            'spv_establishment_date': datetime(2024, 6, 1).date(),
        }
    )
    properties['under_construction'] = uc
    print(f"  {'Created' if created else 'Exists'}: {uc.title} (Under Construction, ${uc.total_value:,.0f})")

    return properties


def print_summary(users, properties):
    """Print test environment summary."""
    print("\n" + "=" * 60)
    print("  E2E TEST ENVIRONMENT READY")
    print("=" * 60)

    print(f"\n  Backend:  http://localhost:8500")
    print(f"  Frontend: http://localhost:5173")
    print(f"  Admin:    http://localhost:8500/admin/")
    print(f"  API Docs: http://localhost:8500/api/docs/")

    print(f"\n  TEST ACCOUNTS (all use password: {PASSWORD})")
    print(f"  {'-' * 50}")
    print(f"  admin@capimax.com     — Admin (superuser)")
    print(f"  investor@test.com     — Investor ($100k wallet)")
    print(f"  owner@test.com        — Property Owner ($50k wallet)")
    print(f"  broker@test.com       — Broker")

    print(f"\n  PROPERTIES")
    print(f"  {'-' * 50}")
    for key, prop in properties.items():
        cat = "Ready" if prop.property_category == PropertyCategory.READY_PROPERTY else "Under Construction"
        print(f"  {prop.title}")
        print(f"    Category: {cat} | Value: ${prop.total_value:,.0f} | Token: ${prop.token_price}")

    print(f"\n  SPV DATA")
    print(f"  {'-' * 50}")
    for key, prop in properties.items():
        if prop.spv_company_name:
            print(f"  {prop.title}: {prop.spv_company_name} ({prop.spv_bank_name})")

    print("\n" + "=" * 60)


def main():
    print("Setting up E2E Test Environment...")

    users = create_users()
    setup_wallets(users)
    properties = create_properties(users)
    print_summary(users, properties)

    print("\nSetup complete!")


if __name__ == "__main__":
    main()
