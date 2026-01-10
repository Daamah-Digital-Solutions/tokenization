#!/usr/bin/env python
"""
Test script for CapiMax Email Notification System

This script tests all email templates and the EmailService functionality
to ensure the email notification system is working correctly.
"""

import os
import sys
import django
from datetime import datetime

# Add the project directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capimax_backend.settings.development')
django.setup()

from core.services.email_service import EmailService
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

def create_test_user():
    """Create or get a test user for email testing."""
    test_email = "test@example.com"
    try:
        user = User.objects.get(email=test_email)
        print(f"[OK] Using existing test user: {test_email}")
    except User.DoesNotExist:
        user = User.objects.create_user(
            email=test_email,
            password="testpassword123",
            first_name="Test",
            last_name="User"
        )
        print(f"[OK] Created test user: {test_email}")
    return user

def test_welcome_verification_email(user):
    """Test welcome and email verification email."""
    print("\n[*] Testing Welcome & Email Verification Email...")

    verification_url = "http://localhost:3000/verify-email?token=test123"
    verification_code = "VERIFY123"

    success = EmailService.send_welcome_verification_email(
        user=user,
        verification_url=verification_url,
        verification_code=verification_code
    )

    if success:
        print("[+] Welcome & Email Verification email sent successfully!")
    else:
        print("[-] Failed to send Welcome & Email Verification email")

    return success

def test_password_reset_email(user):
    """Test password reset email."""
    print("\n[*] Testing Password Reset Email...")

    reset_url = "http://localhost:3000/reset-password?token=reset123"
    request_info = {
        'ip_address': '127.0.0.1',
        'user_agent': 'Mozilla/5.0 (Test Browser)',
    }

    success = EmailService.send_password_reset_email(
        user=user,
        reset_url=reset_url,
        request_info=request_info
    )

    if success:
        print("[+] Password Reset email sent successfully!")
    else:
        print("[-] Failed to send Password Reset email")

    return success

def test_password_changed_email(user):
    """Test password change confirmation email."""
    print("\n[*] Testing Password Changed Email...")

    change_info = {
        'ip_address': '127.0.0.1',
        'user_agent': 'Mozilla/5.0 (Test Browser)',
        'location': 'Test Location',
        'dashboard_url': 'http://localhost:3000/dashboard',
        'security_settings_url': 'http://localhost:3000/dashboard/security',
    }

    success = EmailService.send_password_changed_email(
        user=user,
        change_info=change_info
    )

    if success:
        print("[+] Password Changed email sent successfully!")
    else:
        print("[-] Failed to send Password Changed email")

    return success

def test_security_alert_email(user):
    """Test security alert email."""
    print("\n[*] Testing Security Alert Email...")

    alert_info = {
        'alert_type': 'Suspicious Login Attempt',
        'message': 'Multiple failed login attempts detected from unknown location',
        'ip_address': '192.168.1.100',
        'user_agent': 'Mozilla/5.0 (Unknown Browser)',
        'location': 'Unknown Location',
        'recommended_actions': [
            'Change your password immediately',
            'Enable two-factor authentication',
            'Review recent account activity',
            'Contact support if this wasn\'t you'
        ]
    }

    success = EmailService.send_security_alert_email(
        user=user,
        alert_info=alert_info
    )

    if success:
        print("[+] Security Alert email sent successfully!")
    else:
        print("[-] Failed to send Security Alert email")

    return success

def test_investment_confirmation_email(user):
    """Test investment confirmation email."""
    print("\n[*] Testing Investment Confirmation Email...")

    investment_details = {
        'property_name': 'Luxury Downtown Apartments',
        'property_location': '123 Main Street, Downtown City',
        'property_type': 'Residential Complex',
        'amount': '5000',
        'shares': '500',
        'share_price': '10.00',
        'expected_return': '10.5%',
        'transaction_id': 'INV123456',
        'payment_method': 'Credit Card (**** 1234)',
        'id': 1
    }

    success = EmailService.send_investment_confirmation_email(
        user=user,
        investment_details=investment_details
    )

    if success:
        print("[+] Investment Confirmation email sent successfully!")
    else:
        print("[-] Failed to send Investment Confirmation email")

    return success

def test_funds_notification_email(user):
    """Test funds deposit/withdrawal notification email."""
    print("\n[*] Testing Funds Notification Email...")

    # Test deposit
    transaction_details = {
        'type': 'Deposit',
        'amount': '10000',
        'transaction_id': 'DEP123456',
        'payment_method': 'Bank Transfer',
        'status': 'Confirmed',
        'previous_balance': '5000',
        'new_balance': '15000',
        'id': 1
    }

    success = EmailService.send_funds_notification_email(
        user=user,
        transaction_details=transaction_details
    )

    if success:
        print("[+] Funds Notification (Deposit) email sent successfully!")
    else:
        print("[-] Failed to send Funds Notification email")

    return success

def test_dividend_notification_email(user):
    """Test dividend distribution notification email."""
    print("\n[*] Testing Dividend Notification Email...")

    dividend_details = {
        'property_name': 'Premium Office Complex',
        'property_location': '456 Business Ave, Financial District',
        'amount': '125.50',
        'period': 'Q4 2024',
        'ownership_percentage': '2.5%',
        'shares_owned': '250',
        'total_income': '120000',
        'occupancy_rate': '95%',
        'annual_yield': '8.2%',
        'property_value': '$4.8M',
        'initial_investment': '10000',
        'total_dividends': '1245',
        'current_value': '11200',
        'total_return': '+12.4%',
        'next_distribution': 'Expected in March 2025'
    }

    success = EmailService.send_dividend_notification_email(
        user=user,
        dividend_details=dividend_details
    )

    if success:
        print("[+] Dividend Notification email sent successfully!")
    else:
        print("[-] Failed to send Dividend Notification email")

    return success

def test_property_submission_email(user):
    """Test property submission confirmation email."""
    print("\n[*] Testing Property Submission Email...")

    property_details = {
        'title': 'Modern Residential Complex',
        'location': '789 Residential Blvd, Suburb City',
        'property_type': 'Multi-Family Residential',
        'estimated_value': '2500000',
        'square_footage': '15000',
        'expected_yield': '9.5%',
        'submission_id': 'SUB123456',
        'id': 1
    }

    success = EmailService.send_property_submission_email(
        user=user,
        property_details=property_details
    )

    if success:
        print("[+] Property Submission email sent successfully!")
    else:
        print("[-] Failed to send Property Submission email")

    return success

def test_property_status_update_email(user):
    """Test property status update email."""
    print("\n[*] Testing Property Status Update Email...")

    property_details = {
        'title': 'Modern Residential Complex',
        'location': '789 Residential Blvd, Suburb City',
        'submission_date': 'December 1, 2024'
    }

    status_update = {
        'status': 'approved',
        'new_status': 'Approved',
        'previous_status': 'Under Review',
        'description': 'Property has been approved for tokenization',
        'reviewer': 'Property Evaluation Team',
        'notes': 'Property meets all investment criteria and regulatory requirements. Proceeding to tokenization phase.'
    }

    success = EmailService.send_property_status_update_email(
        user=user,
        property_details=property_details,
        status_update=status_update
    )

    if success:
        print("[+] Property Status Update email sent successfully!")
    else:
        print("[-] Failed to send Property Status Update email")

    return success

def main():
    """Main function to run all email tests."""
    print(">>> Starting CapiMax Email Notification System Tests")
    print("=" * 60)

    # Create test user
    user = create_test_user()

    # Run all tests
    tests = [
        test_welcome_verification_email,
        test_password_reset_email,
        test_password_changed_email,
        test_security_alert_email,
        test_investment_confirmation_email,
        test_funds_notification_email,
        test_dividend_notification_email,
        test_property_submission_email,
        test_property_status_update_email,
    ]

    results = []
    for test_func in tests:
        try:
            result = test_func(user)
            results.append(result)
        except Exception as e:
            print(f"[-] Error in {test_func.__name__}: {str(e)}")
            results.append(False)

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY TEST SUMMARY")
    print("=" * 60)

    passed = sum(results)
    total = len(results)

    print(f"Total Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")

    if passed == total:
        print("\n[SUCCESS] All email notification tests passed successfully!")
        print("[+] Email notification system is fully functional")
    else:
        print(f"\n[WARNING]  {total - passed} test(s) failed")
        print("[-] Please check the SMTP configuration and email templates")

    print("\n[EMAIL] Check your email inbox for the test notifications")
    print("Note: Emails are sent to test@example.com")

if __name__ == "__main__":
    main()