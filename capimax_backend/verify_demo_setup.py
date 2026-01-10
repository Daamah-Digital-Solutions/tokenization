#!/usr/bin/env python
"""
Demo Environment Verification Script
Verifies that all demo accounts and data are properly set up.
"""

import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capimax_backend.settings.development')
django.setup()

from accounts.models import User
from properties.models import Property
from investments.models import Investment, DividendPayment
from payments.models import WalletBalance, WalletTransaction
from payments.models import WalletWithdrawal

def verify_demo_setup():
    """Verify the demo environment setup"""
    print("CAPIMAX DEMO ENVIRONMENT VERIFICATION")
    print("="*50)

    # Check users
    try:
        investor = User.objects.get(email="investor.demo@capimax.com")
        owner = User.objects.get(email="owner.demo@capimax.com")
        print("Demo user accounts found")
        print(f"  - Investor: {investor.email} (Role: {investor.role})")
        print(f"  - Owner: {owner.email} (Role: {owner.role})")
    except User.DoesNotExist:
        print("Demo user accounts not found")
        return False

    # Check wallet balance
    try:
        wallet = WalletBalance.objects.get(user=investor, currency='USD')
        print(f"Investor wallet balance: ${wallet.available_balance:,.2f}")
    except WalletBalance.DoesNotExist:
        print("Investor wallet not found")
        return False

    # Check properties
    try:
        luxury_property = Property.objects.get(title="Luxury Downtown Apartment Complex")
        print(f"Luxury property found: {luxury_property.tokens_sold}/{luxury_property.total_tokens} tokens sold")
    except Property.DoesNotExist:
        print("Luxury property not found")
        return False

    # Check investments
    investments = Investment.objects.filter(user=investor)
    print(f"Investor has {investments.count()} investments")
    total_invested = sum(inv.investment_amount for inv in investments)
    print(f"  - Total invested: ${total_invested:,.2f}")

    # Check dividends
    dividends = DividendPayment.objects.filter(investment__user=investor)
    print(f"Investor has {dividends.count()} dividend payments")
    total_dividends = sum(div.amount for div in dividends)
    print(f"  - Total dividends: ${total_dividends:,.2f}")

    # Check withdrawals
    withdrawals = WalletWithdrawal.objects.filter(user=investor)
    print(f"Investor has {withdrawals.count()} withdrawals")

    # Check owner investments
    owner_investments = Investment.objects.filter(user=owner)
    print(f"Owner has {owner_investments.count()} personal investments")

    print("\n" + "="*50)
    print("DEMO ENVIRONMENT VERIFICATION COMPLETE")
    print("All systems ready for client presentation!")

    return True

if __name__ == "__main__":
    verify_demo_setup()