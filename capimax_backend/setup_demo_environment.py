#!/usr/bin/env python
"""
Demo Environment Setup Script for Capimax Real Estate Tokenization Platform
Creates pre-configured user accounts and demo data for client presentation.
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
from properties.models import Property, PropertyCategory, PropertyStatus
from investments.models import Investment, InvestmentStatus
from payments.models import WalletBalance, WalletTransaction, Payment, PaymentStatus, PaymentMethod
from investments.models import DividendPayment
from payments.models import WalletWithdrawal


def create_demo_users():
    """Create the two demo user accounts with secure credentials"""
    print("Creating demo user accounts...")

    # Secure passwords for demo accounts
    investor_password = "CapimaxDemo2024!Investor"
    owner_password = "CapimaxDemo2024!Owner"

    # Account #1: Active Investor
    investor_user, created = User.objects.get_or_create(
        email="investor.demo@capimax.com",
        defaults={
            'username': 'investor_demo',
            'password': make_password(investor_password),
            'first_name': 'Alex',
            'last_name': 'Investor',
            'role': 'investor',
            'is_verified': True,
            'is_active': True,
            'phone': '+1-555-0123',
            'date_of_birth': datetime(1985, 6, 15).date(),
            'country': 'United States',
            'city': 'New York',
            'address': '123 Investment Avenue, New York, NY 10001'
        }
    )

    # Account #2: Property Owner (with multi-role access)
    owner_user, created = User.objects.get_or_create(
        email="owner.demo@capimax.com",
        defaults={
            'username': 'owner_demo',
            'password': make_password(owner_password),
            'first_name': 'Sarah',
            'last_name': 'PropertyOwner',
            'role': 'property_owner',
            'is_verified': True,
            'is_active': True,
            'phone': '+1-555-0456',
            'date_of_birth': datetime(1978, 3, 22).date(),
            'country': 'United States',
            'city': 'Los Angeles',
            'address': '456 Property Lane, Los Angeles, CA 90210'
        }
    )

    print(f"Created Active Investor: {investor_user.email}")
    print(f"   Password: {investor_password}")
    print(f"Created Property Owner: {owner_user.email}")
    print(f"   Password: {owner_password}")

    return investor_user, owner_user


def setup_investor_wallet(user):
    """Set up the investor's wallet with $200,000 USD balance"""
    print(f"Setting up wallet for {user.email}...")

    # Create USD wallet balance
    wallet_balance, created = WalletBalance.objects.get_or_create(
        user=user,
        currency='USD',
        defaults={
            'currency_type': 'fiat',
            'available_balance': Decimal('200000.00'),
            'pending_balance': Decimal('0.00'),
            'locked_balance': Decimal('0.00'),
            'is_active': True
        }
    )

    if created:
        # Create initial deposit transaction record
        WalletTransaction.objects.create(
            user=user,
            transaction_type='deposit',
            amount=Decimal('200000.00'),
            currency='USD',
            balance_before=Decimal('0.00'),
            balance_after=Decimal('200000.00'),
            description='Initial demo account funding'
        )

    print(f"Wallet balance: ${wallet_balance.available_balance:,.2f} USD")
    return wallet_balance


def create_luxury_property(owner_user):
    """Create the Luxury Downtown Apartment Complex property"""
    print("Creating Luxury Downtown Apartment Complex...")

    property_obj, created = Property.objects.get_or_create(
        title="Luxury Downtown Apartment Complex",
        defaults={
            'description': '''Premium luxury apartment complex located in the heart of downtown financial district.

Features:
• 120 modern luxury units
• Rooftop amenities and fitness center
• Prime location with excellent transportation access
• Professional property management
• Stable rental income from high-quality tenants
• Expected annual yield: 8.5%

This is an exceptional investment opportunity in a high-demand urban location with strong fundamentals and growth potential.''',

            'owner': owner_user,
            'property_type': 'residential',
            'property_category': PropertyCategory.READY_PROPERTY,
            'status': PropertyStatus.ACTIVE,

            # Financial details
            'total_value': Decimal('2500000.00'),  # $2.5M total value
            'token_price': Decimal('100.00'),      # $100 per token
            'total_tokens': 25000,                 # 25,000 total tokens
            'tokens_sold': 0,                      # Will be updated with investments
            'expected_return': Decimal('8.50'),    # 8.5% expected annual return
            'rental_yield': Decimal('7.20'),       # 7.2% rental yield
            'minimum_investment': Decimal('1000.00'),

            # Property category specific
            'rental_income_active': True,
            'monthly_rental_income': Decimal('18750.00'),  # $18,750/month
            'occupancy_rate': Decimal('95.00'),     # 95% occupancy

            # Location
            'address': '789 Financial District Blvd, Downtown Core',
            'city': 'New York',
            'state': 'New York',
            'country': 'United States',
            'latitude': Decimal('40.7589'),
            'longitude': Decimal('-73.9851'),

            # Property details
            'property_size': Decimal('85000.00'),   # 85,000 sq ft
            'year_built': 2018,
            'featured': True,

            'created_at': timezone.now() - timedelta(days=30)
        }
    )

    print(f"Created property: {property_obj.title}")
    print(f"   Total Value: ${property_obj.total_value:,.2f}")
    print(f"   Token Price: ${property_obj.token_price}")
    print(f"   Total Tokens: {property_obj.total_tokens:,}")

    return property_obj


def create_secondary_property(owner_user):
    """Create a secondary property for cross-investment demo"""
    print("Creating secondary property for cross-investment...")

    property_obj, created = Property.objects.get_or_create(
        title="Tech Campus Office Building",
        defaults={
            'description': '''Modern office building in growing tech campus area.

Features:
• 50,000 sq ft of premium office space
• Long-term corporate tenants
• Growing tech hub location
• Expected annual yield: 9.2%
• Under-construction expansion planned

Perfect for diversified real estate investment portfolio.''',

            'owner': owner_user,  # Different owner for realistic demo
            'property_type': 'commercial',
            'property_category': PropertyCategory.READY_PROPERTY,
            'status': PropertyStatus.ACTIVE,

            # Financial details
            'total_value': Decimal('1800000.00'),   # $1.8M total value
            'token_price': Decimal('75.00'),        # $75 per token
            'total_tokens': 24000,                  # 24,000 total tokens
            'tokens_sold': 0,
            'expected_return': Decimal('9.20'),     # 9.2% expected return
            'rental_yield': Decimal('8.80'),        # 8.8% rental yield
            'minimum_investment': Decimal('500.00'),

            # Property category specific
            'rental_income_active': True,
            'monthly_rental_income': Decimal('14400.00'),  # $14,400/month
            'occupancy_rate': Decimal('88.00'),     # 88% occupancy

            # Location
            'address': '456 Innovation Drive, Tech Campus',
            'city': 'Austin',
            'state': 'Texas',
            'country': 'United States',
            'latitude': Decimal('30.2672'),
            'longitude': Decimal('-97.7431'),

            # Property details
            'property_size': Decimal('50000.00'),   # 50,000 sq ft
            'year_built': 2020,
            'featured': False,

            'created_at': timezone.now() - timedelta(days=20)
        }
    )

    print(f"Created secondary property: {property_obj.title}")
    return property_obj


def simulate_investments(investor_user, owner_user, luxury_property):
    """Simulate the investment transactions for the demo scenario"""
    print("Simulating investment transactions...")

    # Investment 1: $25,000 (250 tokens at $100 each)
    investment1 = Investment.objects.create(
        user=investor_user,
        property_investment=luxury_property,
        token_amount=250,
        investment_amount=Decimal('25000.00'),
        status=InvestmentStatus.COMPLETED,
        payment_method={'type': 'wallet', 'currency': 'USD'},
        completed_at=timezone.now() - timedelta(days=15),
        created_at=timezone.now() - timedelta(days=15)
    )

    # Investment 2: $15,000 (150 tokens at $100 each)
    investment2 = Investment.objects.create(
        user=investor_user,
        property_investment=luxury_property,
        token_amount=150,
        investment_amount=Decimal('15000.00'),
        status=InvestmentStatus.COMPLETED,
        payment_method={'type': 'wallet', 'currency': 'USD'},
        completed_at=timezone.now() - timedelta(days=10),
        created_at=timezone.now() - timedelta(days=10)
    )

    # Update property tokens sold
    luxury_property.tokens_sold = 400  # 250 + 150
    luxury_property.save()

    # Create payment records for the investments
    Payment.objects.create(
        user=investor_user,
        investment=investment1,
        amount=Decimal('25000.00'),
        currency='USD',
        payment_method=PaymentMethod.CREDIT_CARD,
        status=PaymentStatus.COMPLETED,
        net_amount=Decimal('24875.00'),  # After small processing fee
        processing_fee=Decimal('125.00'),
        completed_at=timezone.now() - timedelta(days=15)
    )

    Payment.objects.create(
        user=investor_user,
        investment=investment2,
        amount=Decimal('15000.00'),
        currency='USD',
        payment_method=PaymentMethod.CREDIT_CARD,
        status=PaymentStatus.COMPLETED,
        net_amount=Decimal('14925.00'),  # After small processing fee
        processing_fee=Decimal('75.00'),
        completed_at=timezone.now() - timedelta(days=10)
    )

    # Update investor's wallet balance (deduct investments)
    investor_wallet = WalletBalance.objects.get(user=investor_user, currency='USD')
    investor_wallet.available_balance -= Decimal('40000.00')  # $25k + $15k
    investor_wallet.save()

    # Create wallet transaction records
    WalletTransaction.objects.create(
        user=investor_user,
        transaction_type='investment',
        amount=Decimal('-25000.00'),
        currency='USD',
        balance_before=Decimal('200000.00'),
        balance_after=Decimal('175000.00'),
        reference_id=investment1.id,
        description=f'Investment in {luxury_property.title} - 250 tokens'
    )

    WalletTransaction.objects.create(
        user=investor_user,
        transaction_type='investment',
        amount=Decimal('-15000.00'),
        currency='USD',
        balance_before=Decimal('175000.00'),
        balance_after=Decimal('160000.00'),
        reference_id=investment2.id,
        description=f'Investment in {luxury_property.title} - 150 tokens'
    )

    print(f"Created Investment 1: ${investment1.investment_amount:,.2f} ({investment1.token_amount} tokens)")
    print(f"Created Investment 2: ${investment2.investment_amount:,.2f} ({investment2.token_amount} tokens)")

    return investment1, investment2


def simulate_dividend_payment(investor_user, luxury_property, investment1):
    """Simulate dividend payment of $350"""
    print("Simulating dividend payment...")

    # Create dividend payment
    dividend = DividendPayment.objects.create(
        investment=investment1,
        amount=Decimal('350.00'),
        currency='USD',
        payment_date=timezone.now() - timedelta(days=5),
        period_start=timezone.now() - timedelta(days=35),
        period_end=timezone.now() - timedelta(days=5),
        status='paid'
    )

    # Update investor's wallet balance (add dividend)
    investor_wallet = WalletBalance.objects.get(user=investor_user, currency='USD')
    balance_before = investor_wallet.available_balance
    investor_wallet.available_balance += Decimal('350.00')
    investor_wallet.save()

    # Create wallet transaction record
    WalletTransaction.objects.create(
        user=investor_user,
        transaction_type='dividend',
        amount=Decimal('350.00'),
        currency='USD',
        balance_before=balance_before,
        balance_after=investor_wallet.available_balance,
        reference_id=dividend.id,
        description=f'Dividend payment from {luxury_property.title}'
    )

    print(f"Created dividend payment: ${dividend.amount}")
    return dividend


def simulate_withdrawal(investor_user):
    """Simulate successful withdrawal of $5,000"""
    print("Simulating withdrawal...")

    # Get current wallet balance
    investor_wallet = WalletBalance.objects.get(user=investor_user, currency='USD')
    balance_before = investor_wallet.available_balance

    # Create withdrawal record
    withdrawal = WalletWithdrawal.objects.create(
        user=investor_user,
        wallet_balance=investor_wallet,
        amount=Decimal('5000.00'),
        withdrawal_fee=Decimal('25.00'),  # Small withdrawal fee
        total_amount=Decimal('5025.00'),
        to_address='user_bank_account_****1234',
        status='completed',
        two_factor_verified=True,
        email_verified=True,
        completed_at=timezone.now() - timedelta(days=2)
    )

    # Update wallet balance (deduct withdrawal + fee)
    investor_wallet.available_balance -= Decimal('5025.00')
    investor_wallet.save()

    # Create wallet transaction record
    WalletTransaction.objects.create(
        user=investor_user,
        transaction_type='withdrawal',
        amount=Decimal('-5025.00'),
        currency='USD',
        balance_before=balance_before,
        balance_after=investor_wallet.available_balance,
        reference_id=withdrawal.id,
        description='Withdrawal to bank account'
    )

    print(f"Created withdrawal: ${withdrawal.amount} (Fee: ${withdrawal.withdrawal_fee})")
    return withdrawal


def simulate_owner_investment(owner_user, secondary_property):
    """Simulate property owner investing $5,000 in another property"""
    print("Simulating property owner's investment...")

    # Create owner's wallet if doesn't exist
    owner_wallet, created = WalletBalance.objects.get_or_create(
        user=owner_user,
        currency='USD',
        defaults={
            'currency_type': 'fiat',
            'available_balance': Decimal('50000.00'),  # Give owner some starting balance
            'pending_balance': Decimal('0.00'),
            'locked_balance': Decimal('0.00'),
            'is_active': True
        }
    )

    if created:
        WalletTransaction.objects.create(
            user=owner_user,
            transaction_type='deposit',
            amount=Decimal('50000.00'),
            currency='USD',
            balance_before=Decimal('0.00'),
            balance_after=Decimal('50000.00'),
            description='Initial property owner funding'
        )

    # Create investment: $5,000 in secondary property (67 tokens at $75 each = $5,025)
    # Adjust to exactly $5,000 worth
    tokens_to_buy = 66  # 66 * $75 = $4,950, close to $5,000
    investment_amount = Decimal('4950.00')

    owner_investment = Investment.objects.create(
        user=owner_user,
        property_investment=secondary_property,
        token_amount=tokens_to_buy,
        investment_amount=investment_amount,
        status=InvestmentStatus.COMPLETED,
        payment_method={'type': 'wallet', 'currency': 'USD'},
        completed_at=timezone.now() - timedelta(days=3),
        created_at=timezone.now() - timedelta(days=3)
    )

    # Update secondary property tokens sold
    secondary_property.tokens_sold = tokens_to_buy
    secondary_property.save()

    # Update owner's wallet balance
    balance_before = owner_wallet.available_balance
    owner_wallet.available_balance -= investment_amount
    owner_wallet.save()

    # Create wallet transaction record
    WalletTransaction.objects.create(
        user=owner_user,
        transaction_type='investment',
        amount=Decimal(f'-{investment_amount}'),
        currency='USD',
        balance_before=balance_before,
        balance_after=owner_wallet.available_balance,
        reference_id=owner_investment.id,
        description=f'Investment in {secondary_property.title} - {tokens_to_buy} tokens'
    )

    print(f"Created owner investment: ${owner_investment.investment_amount:,.2f} ({owner_investment.token_amount} tokens)")
    return owner_investment


def print_demo_summary(investor_user, owner_user, luxury_property):
    """Print a summary of the demo environment setup"""
    print("\n" + "="*60)
    print("DEMO ENVIRONMENT SETUP COMPLETE")
    print("="*60)

    print(f"\nACTIVE INVESTOR ACCOUNT")
    print(f"   Email: {investor_user.email}")
    print(f"   Password: CapimaxDemo2024!Investor")
    print(f"   KYC Status: Approved")

    investor_wallet = WalletBalance.objects.get(user=investor_user, currency='USD')
    print(f"   Current Wallet Balance: ${investor_wallet.available_balance:,.2f} USD")

    investments = Investment.objects.filter(user=investor_user)
    print(f"   Total Investments: {investments.count()}")
    total_invested = sum(inv.investment_amount for inv in investments)
    print(f"   Total Amount Invested: ${total_invested:,.2f}")

    dividends = DividendPayment.objects.filter(investment__user=investor_user)
    total_dividends = sum(div.amount for div in dividends)
    print(f"   Total Dividends Received: ${total_dividends:,.2f}")

    print(f"\nPROPERTY OWNER ACCOUNT")
    print(f"   Email: {owner_user.email}")
    print(f"   Password: CapimaxDemo2024!Owner")
    print(f"   KYC Status: Approved")
    print(f"   Roles: Property Owner + Investor")

    owned_properties = Property.objects.filter(owner=owner_user)
    print(f"   Properties Owned: {owned_properties.count()}")

    owner_investments = Investment.objects.filter(user=owner_user)
    if owner_investments.exists():
        owner_total_invested = sum(inv.investment_amount for inv in owner_investments)
        print(f"   Personal Investments: ${owner_total_invested:,.2f}")

    print(f"\nLUXURY DOWNTOWN APARTMENT COMPLEX")
    print(f"   Owner: {luxury_property.owner.get_full_name()}")
    print(f"   Total Value: ${luxury_property.total_value:,.2f}")
    print(f"   Tokens Sold: {luxury_property.tokens_sold:,} / {luxury_property.total_tokens:,}")
    print(f"   Funding: {luxury_property.funding_percentage:.1f}%")
    print(f"   Number of Investors: {Investment.objects.filter(property_investment=luxury_property).values('user').distinct().count()}")

    print(f"\nTRANSACTION SUMMARY")
    total_platform_volume = sum(inv.investment_amount for inv in Investment.objects.all())
    print(f"   Total Platform Volume: ${total_platform_volume:,.2f}")
    print(f"   Total Transactions: {Investment.objects.count() + DividendPayment.objects.count() + WalletWithdrawal.objects.count()}")

    print(f"\nDemo environment is ready for client presentation!")
    print("="*60)


def main():
    """Main function to set up the complete demo environment"""
    print("Setting up Capimax Demo Environment...")
    print("="*50)

    try:
        # Step 1: Create demo users
        investor_user, owner_user = create_demo_users()

        # Step 2: Set up investor wallet
        setup_investor_wallet(investor_user)

        # Step 3: Create properties
        luxury_property = create_luxury_property(owner_user)
        secondary_property = create_secondary_property(owner_user)

        # Step 4: Simulate transactions
        investment1, investment2 = simulate_investments(investor_user, owner_user, luxury_property)

        # Step 5: Simulate dividend payment
        simulate_dividend_payment(investor_user, luxury_property, investment1)

        # Step 6: Simulate withdrawal
        simulate_withdrawal(investor_user)

        # Step 7: Simulate owner investment in another property
        simulate_owner_investment(owner_user, secondary_property)

        # Step 8: Print summary
        print_demo_summary(investor_user, owner_user, luxury_property)

        print("\nDemo environment setup completed successfully!")

    except Exception as e:
        print(f"\nError setting up demo environment: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()