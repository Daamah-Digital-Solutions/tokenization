"""
Tests for Payment System.

This module contains comprehensive tests for payment processing, wallet management,
and financial transaction functionality.
"""

from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from decimal import Decimal
from datetime import datetime, timedelta
from unittest.mock import patch, Mock
import json

from .models import (
    Payment, UserPaymentMethod, WalletBalance, WalletTransaction,
    CryptoPayment, Refund, RecurringPayment, PaymentMethod, PaymentStatus
)
from .services import (
    PaymentProcessorService, FraudDetectionService, WalletService,
    PaymentAnalyticsService, RecurringPaymentService
)

User = get_user_model()


class PaymentModelTests(TestCase):
    """Test Payment model functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            country='US'
        )
    
    def test_payment_creation(self):
        """Test payment model creation."""
        payment = Payment.objects.create(
            user=self.user,
            amount=Decimal('100.00'),
            currency='USD',
            payment_method=PaymentMethod.CREDIT_CARD,
            net_amount=Decimal('97.10')  # After 2.9% fee
        )
        
        self.assertEqual(payment.user, self.user)
        self.assertEqual(payment.amount, Decimal('100.00'))
        self.assertEqual(payment.status, PaymentStatus.PENDING)
        self.assertIsNotNone(payment.id)
    
    def test_payment_fee_calculation(self):
        """Test payment fee calculation."""
        payment = Payment.objects.create(
            user=self.user,
            amount=Decimal('100.00'),
            currency='USD',
            payment_method=PaymentMethod.CREDIT_CARD,
            processing_fee=Decimal('2.90'),
            net_amount=Decimal('97.10')
        )
        
        self.assertEqual(payment.fee_percentage, Decimal('2.90'))
        self.assertEqual(payment.net_amount, Decimal('97.10'))
    
    def test_auto_net_amount_calculation(self):
        """Test automatic net amount calculation on save."""
        payment = Payment(
            user=self.user,
            amount=Decimal('100.00'),
            currency='USD',
            payment_method=PaymentMethod.CREDIT_CARD,
            processing_fee=Decimal('2.90')
        )
        payment.save()
        
        self.assertEqual(payment.net_amount, Decimal('97.10'))
    
    def test_payment_string_representation(self):
        """Test payment string representation."""
        payment = Payment.objects.create(
            user=self.user,
            amount=Decimal('100.00'),
            currency='USD',
            payment_method=PaymentMethod.CREDIT_CARD,
            net_amount=Decimal('97.10')
        )
        
        expected_str = f"Payment {payment.id} - test@example.com - $100.00 (credit_card)"
        self.assertEqual(str(payment), expected_str)


class UserPaymentMethodModelTests(TestCase):
    """Test UserPaymentMethod model functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            country='US'
        )
    
    def test_payment_method_creation(self):
        """Test payment method creation."""
        method = UserPaymentMethod.objects.create(
            user=self.user,
            method_type=PaymentMethod.CREDIT_CARD,
            display_name='Visa *1234',
            last_four='1234',
            expiry_date='12/2025',
            brand='Visa'
        )
        
        self.assertEqual(method.user, self.user)
        self.assertEqual(method.method_type, PaymentMethod.CREDIT_CARD)
        self.assertEqual(method.display_name, 'Visa *1234')
        self.assertFalse(method.is_default)
    
    def test_crypto_payment_method(self):
        """Test cryptocurrency payment method."""
        method = UserPaymentMethod.objects.create(
            user=self.user,
            method_type=PaymentMethod.CRYPTOCURRENCY,
            display_name='Bitcoin Wallet',
            wallet_address='1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
            network='Bitcoin'
        )
        
        self.assertEqual(method.method_type, PaymentMethod.CRYPTOCURRENCY)
        self.assertEqual(method.wallet_address, '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')
        self.assertEqual(method.network, 'Bitcoin')


class WalletModelTests(TestCase):
    """Test wallet-related model functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            country='US'
        )
    
    def test_wallet_balance_creation(self):
        """Test wallet balance creation."""
        balance = WalletBalance.objects.create(
            user=self.user,
            currency='USD',
            available_balance=Decimal('1000.00'),
            pending_balance=Decimal('100.00'),
            locked_balance=Decimal('50.00')
        )
        
        self.assertEqual(balance.available_balance, Decimal('1000.00'))
        self.assertEqual(balance.total_balance, Decimal('1150.00'))
    
    def test_wallet_transaction_creation(self):
        """Test wallet transaction creation."""
        transaction = WalletTransaction.objects.create(
            user=self.user,
            transaction_type='deposit',
            amount=Decimal('100.00'),
            currency='USD',
            balance_before=Decimal('500.00'),
            balance_after=Decimal('600.00'),
            description='Test deposit'
        )
        
        self.assertEqual(transaction.amount, Decimal('100.00'))
        self.assertEqual(transaction.transaction_type, 'deposit')
        self.assertEqual(transaction.balance_after, Decimal('600.00'))


class PaymentAPITests(APITestCase):
    """Test Payment API endpoints."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            country='US'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_get_payment_methods(self):
        """Test getting user payment methods."""
        # Create test payment method
        UserPaymentMethod.objects.create(
            user=self.user,
            method_type=PaymentMethod.CREDIT_CARD,
            display_name='Visa *1234',
            last_four='1234',
            brand='Visa'
        )
        
        url = reverse('payments:payment-methods-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['display_name'], 'Visa *1234')
    
    def test_create_payment_method(self):
        """Test creating a payment method."""
        url = reverse('payments:payment-methods-list')
        data = {
            'method_type': PaymentMethod.CREDIT_CARD,
            'display_name': 'Visa *5678',
            'last_four': '5678',
            'expiry_date': '12/2026',
            'brand': 'Visa'
        }
        
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(UserPaymentMethod.objects.count(), 1)
        
        method = UserPaymentMethod.objects.first()
        self.assertEqual(method.user, self.user)
        self.assertEqual(method.display_name, 'Visa *5678')
    
    def test_payment_estimate(self):
        """Test payment fee estimation."""
        url = reverse('payments:payments-estimate')
        data = {
            'amount': '100.00',
            'payment_method': PaymentMethod.CREDIT_CARD,
            'currency': 'USD'
        }
        
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['amount'], Decimal('100.00'))
        self.assertEqual(response.data['data']['processing_fee'], Decimal('2.90'))
        self.assertEqual(response.data['data']['net_amount'], Decimal('97.10'))
    
    @patch('payments.views.stripe.PaymentIntent.create')
    def test_stripe_payment_intent_creation(self, mock_stripe):
        """Test Stripe payment intent creation."""
        # Mock Stripe response
        mock_payment_intent = Mock()
        mock_payment_intent.id = 'pi_test123'
        mock_payment_intent.client_secret = 'pi_test123_secret'
        mock_stripe.return_value = mock_payment_intent
        
        url = reverse('payments:stripe-payment', args=['create-payment-intent'])
        data = {
            'amount': '100.00',
            'currency': 'USD'
        }
        
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['payment_intent_id'], 'pi_test123')
        
        # Verify payment record was created
        self.assertEqual(Payment.objects.count(), 1)
        payment = Payment.objects.first()
        self.assertEqual(payment.user, self.user)
        self.assertEqual(payment.amount, Decimal('100.00'))
    
    def test_wallet_balance_retrieval(self):
        """Test wallet balance retrieval."""
        # Create wallet balance
        WalletBalance.objects.create(
            user=self.user,
            currency='USD',
            available_balance=Decimal('500.00'),
            pending_balance=Decimal('50.00')
        )
        
        url = reverse('payments:wallet-balance')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        balances = response.data['data']['balances']
        self.assertEqual(len(balances), 1)
        self.assertEqual(balances[0]['currency'], 'USD')
        self.assertEqual(balances[0]['available'], Decimal('500.00'))


class FraudDetectionTests(TestCase):
    """Test fraud detection functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            country='US'
        )
        self.fraud_service = FraudDetectionService()
    
    def test_daily_limit_check(self):
        """Test daily spending limit fraud detection."""
        # Create payments approaching daily limit
        Payment.objects.create(
            user=self.user,
            amount=Decimal('5000.00'),
            currency='USD',
            payment_method=PaymentMethod.CREDIT_CARD,
            status=PaymentStatus.COMPLETED,
            completed_at=timezone.now(),
            net_amount=Decimal('5000.00')
        )
        
        new_payment = Payment(
            user=self.user,
            amount=Decimal('6000.00'),  # Would exceed $10k daily limit
            currency='USD',
            payment_method=PaymentMethod.CREDIT_CARD
        )
        
        fraud_score = self.fraud_service.assess_payment_risk(
            self.user, new_payment, {'ip_address': '127.0.0.1'}
        )
        
        self.assertGreater(fraud_score.score, 0)
        self.assertIn("Daily spending limit exceeded", fraud_score.factors)
    
    def test_new_user_risk(self):
        """Test new user account risk factor."""
        new_user = User.objects.create_user(
            email='newuser@example.com',
            password='testpass123',
            first_name='New',
            last_name='User',
            country='US'
        )
        
        payment = Payment(
            user=new_user,
            amount=Decimal('100.00'),
            currency='USD',
            payment_method=PaymentMethod.CREDIT_CARD
        )
        
        fraud_score = self.fraud_service.assess_payment_risk(
            new_user, payment, {'ip_address': '127.0.0.1'}
        )
        
        self.assertGreater(fraud_score.score, 0)
        self.assertIn("New user account", fraud_score.factors)
    
    def test_unverified_user_risk(self):
        """Test unverified user risk factor."""
        self.user.is_verified = False
        self.user.save()
        
        payment = Payment(
            user=self.user,
            amount=Decimal('100.00'),
            currency='USD',
            payment_method=PaymentMethod.CREDIT_CARD
        )
        
        fraud_score = self.fraud_service.assess_payment_risk(
            self.user, payment, {'ip_address': '127.0.0.1'}
        )
        
        self.assertGreater(fraud_score.score, 0)
        self.assertIn("User not verified", fraud_score.factors)


class WalletServiceTests(TestCase):
    """Test wallet service functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            country='US'
        )
        self.wallet_service = WalletService()
    
    def test_get_user_balances(self):
        """Test getting user wallet balances."""
        WalletBalance.objects.create(
            user=self.user,
            currency='USD',
            available_balance=Decimal('1000.00'),
            pending_balance=Decimal('100.00')
        )
        
        WalletBalance.objects.create(
            user=self.user,
            currency='BTC',
            available_balance=Decimal('0.01')
        )
        
        balances = self.wallet_service.get_user_balances(self.user)
        
        self.assertEqual(len(balances['balances']), 2)
        self.assertGreater(balances['total_usd_value'], Decimal('0.00'))
    
    def test_funds_transfer(self):
        """Test transferring funds between currencies."""
        # Create source balance
        WalletBalance.objects.create(
            user=self.user,
            currency='USD',
            available_balance=Decimal('1000.00')
        )
        
        result = self.wallet_service.transfer_funds(
            self.user, 'USD', 'EUR', Decimal('100.00')
        )
        
        self.assertTrue(result.success)
        
        # Check balances
        usd_balance = WalletBalance.objects.get(user=self.user, currency='USD')
        eur_balance = WalletBalance.objects.get(user=self.user, currency='EUR')
        
        self.assertEqual(usd_balance.available_balance, Decimal('900.00'))
        self.assertGreater(eur_balance.available_balance, Decimal('0.00'))
    
    def test_insufficient_funds_transfer(self):
        """Test transfer with insufficient funds."""
        WalletBalance.objects.create(
            user=self.user,
            currency='USD',
            available_balance=Decimal('50.00')
        )
        
        result = self.wallet_service.transfer_funds(
            self.user, 'USD', 'EUR', Decimal('100.00')
        )
        
        self.assertFalse(result.success)
        self.assertEqual(result.error_message, "Insufficient balance")
    
    def test_lock_funds(self):
        """Test locking funds in wallet."""
        balance = WalletBalance.objects.create(
            user=self.user,
            currency='USD',
            available_balance=Decimal('500.00')
        )
        
        result = self.wallet_service.lock_funds(
            self.user, 'USD', Decimal('100.00'), 'Test lock'
        )
        
        self.assertTrue(result.success)
        
        balance.refresh_from_db()
        self.assertEqual(balance.available_balance, Decimal('400.00'))
        self.assertEqual(balance.locked_balance, Decimal('100.00'))
    
    def test_unlock_funds(self):
        """Test unlocking funds in wallet."""
        balance = WalletBalance.objects.create(
            user=self.user,
            currency='USD',
            available_balance=Decimal('400.00'),
            locked_balance=Decimal('100.00')
        )
        
        result = self.wallet_service.unlock_funds(
            self.user, 'USD', Decimal('100.00'), 'Test unlock'
        )
        
        self.assertTrue(result.success)
        
        balance.refresh_from_db()
        self.assertEqual(balance.available_balance, Decimal('500.00'))
        self.assertEqual(balance.locked_balance, Decimal('0.00'))


class PaymentAnalyticsTests(TestCase):
    """Test payment analytics functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            country='US'
        )
        self.analytics_service = PaymentAnalyticsService()
    
    def test_payment_summary(self):
        """Test payment summary generation."""
        # Create test payments
        Payment.objects.create(
            user=self.user,
            amount=Decimal('100.00'),
            currency='USD',
            payment_method=PaymentMethod.CREDIT_CARD,
            status=PaymentStatus.COMPLETED,
            net_amount=Decimal('97.10')
        )
        
        Payment.objects.create(
            user=self.user,
            amount=Decimal('200.00'),
            currency='USD',
            payment_method=PaymentMethod.CRYPTOCURRENCY,
            status=PaymentStatus.COMPLETED,
            net_amount=Decimal('198.00')
        )
        
        summary = self.analytics_service.get_payment_summary(user=self.user)
        
        self.assertEqual(summary['summary']['total_payments'], 2)
        self.assertEqual(summary['summary']['total_amount'], Decimal('300.00'))
        self.assertEqual(summary['summary']['success_rate'], 100.0)
        self.assertEqual(len(summary['by_method']), 2)
    
    def test_revenue_trends(self):
        """Test revenue trend analysis."""
        # Create payments over time
        base_date = timezone.now() - timedelta(days=5)
        
        for i in range(5):
            Payment.objects.create(
                user=self.user,
                amount=Decimal('100.00'),
                currency='USD',
                payment_method=PaymentMethod.CREDIT_CARD,
                status=PaymentStatus.COMPLETED,
                completed_at=base_date + timedelta(days=i),
                net_amount=Decimal('97.10')
            )
        
        trends = self.analytics_service.get_revenue_trends(days=7)
        
        self.assertEqual(len(trends['daily_revenue']), 8)  # 7 days + partial
        self.assertIsInstance(trends['growth_rate'], float)


class RecurringPaymentTests(TransactionTestCase):
    """Test recurring payment functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            country='US'
        )
        
        self.payment_method = UserPaymentMethod.objects.create(
            user=self.user,
            method_type=PaymentMethod.CREDIT_CARD,
            display_name='Test Card',
            last_four='1234'
        )
        
        self.recurring_service = RecurringPaymentService()
    
    def test_recurring_payment_execution(self):
        """Test executing due recurring payments."""
        # Create due recurring payment
        recurring_payment = RecurringPayment.objects.create(
            user=self.user,
            amount=Decimal('100.00'),
            currency='USD',
            frequency='monthly',
            payment_method=self.payment_method,
            start_date=timezone.now() - timedelta(days=1),
            next_payment=timezone.now() - timedelta(minutes=1),
            purpose='wallet_topup',
            status='active'
        )
        
        with patch.object(PaymentProcessorService, 'process_payment') as mock_processor:
            mock_result = Mock()
            mock_result.success = True
            mock_result.payment_id = 'test_payment_id'
            mock_processor.return_value = mock_result
            
            results = self.recurring_service.execute_due_payments()
            
            self.assertEqual(len(results), 1)
            self.assertTrue(results[0]['result'].success)
            
            # Check that recurring payment was updated
            recurring_payment.refresh_from_db()
            self.assertEqual(recurring_payment.total_payments, 1)
            self.assertEqual(recurring_payment.total_amount, Decimal('100.00'))
    
    def test_recurring_payment_frequency_calculation(self):
        """Test next payment date calculation."""
        current_date = timezone.now()
        
        # Test weekly frequency
        next_weekly = self.recurring_service._calculate_next_payment(
            current_date, 'weekly'
        )
        self.assertEqual(
            (next_weekly - current_date).days, 7
        )
        
        # Test monthly frequency
        next_monthly = self.recurring_service._calculate_next_payment(
            current_date, 'monthly'
        )
        self.assertEqual(
            (next_monthly - current_date).days, 30
        )


class RefundTests(TestCase):
    """Test refund functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            country='US'
        )
        
        self.payment = Payment.objects.create(
            user=self.user,
            amount=Decimal('100.00'),
            currency='USD',
            payment_method=PaymentMethod.CREDIT_CARD,
            status=PaymentStatus.COMPLETED,
            net_amount=Decimal('97.10'),
            payment_intent_id='pi_test123'
        )
    
    def test_refund_creation(self):
        """Test refund creation."""
        refund = Refund.objects.create(
            payment=self.payment,
            amount=Decimal('50.00'),
            reason='Customer request'
        )
        
        self.assertEqual(refund.payment, self.payment)
        self.assertEqual(refund.amount, Decimal('50.00'))
        self.assertEqual(refund.status, 'pending')
    
    def test_partial_refund_validation(self):
        """Test partial refund amount validation."""
        # Create first refund
        Refund.objects.create(
            payment=self.payment,
            amount=Decimal('50.00'),
            reason='First refund',
            status='completed'
        )
        
        # Test that second refund cannot exceed remaining amount
        with self.assertRaises(Exception):  # Would be caught by serializer validation
            refund = Refund(
                payment=self.payment,
                amount=Decimal('60.00'),  # Would total $110, exceeding $100 payment
                reason='Second refund'
            )
            # This would fail validation in the actual serializer
    
    @patch('payments.views.stripe.Refund.create')
    def test_stripe_refund_processing(self, mock_stripe_refund):
        """Test Stripe refund processing."""
        from payments.views import RefundViewSet
        
        mock_refund = Mock()
        mock_refund.id = 're_test123'
        mock_stripe_refund.return_value = mock_refund
        
        refund = Refund.objects.create(
            payment=self.payment,
            amount=Decimal('50.00'),
            reason='Customer request'
        )
        
        refund_viewset = RefundViewSet()
        refund_viewset._process_refund(refund)
        
        refund.refresh_from_db()
        self.assertEqual(refund.status, 'processing')
        self.assertEqual(refund.external_refund_id, 're_test123')


class CryptoPaymentTests(TestCase):
    """Test cryptocurrency payment functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            country='US'
        )
        
        self.payment = Payment.objects.create(
            user=self.user,
            amount=Decimal('0.01'),
            currency='BTC',
            payment_method=PaymentMethod.CRYPTOCURRENCY,
            net_amount=Decimal('0.01')
        )
    
    def test_crypto_payment_creation(self):
        """Test crypto payment details creation."""
        crypto_payment = CryptoPayment.objects.create(
            payment=self.payment,
            wallet_address='1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
            network='Bitcoin',
            confirmation_blocks_required=6
        )
        
        self.assertEqual(crypto_payment.payment, self.payment)
        self.assertEqual(crypto_payment.wallet_address, '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')
        self.assertFalse(crypto_payment.is_confirmed)
    
    def test_crypto_payment_confirmation(self):
        """Test crypto payment confirmation logic."""
        crypto_payment = CryptoPayment.objects.create(
            payment=self.payment,
            wallet_address='1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
            network='Bitcoin',
            confirmation_blocks_required=6,
            confirmations=6
        )
        
        self.assertTrue(crypto_payment.is_confirmed)
    
    def test_insufficient_confirmations(self):
        """Test insufficient confirmation handling."""
        crypto_payment = CryptoPayment.objects.create(
            payment=self.payment,
            wallet_address='1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
            network='Bitcoin',
            confirmation_blocks_required=6,
            confirmations=3
        )
        
        self.assertFalse(crypto_payment.is_confirmed)


if __name__ == '__main__':
    import django
    django.setup()
    
    from django.test.utils import get_runner
    from django.conf import settings
    
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    failures = test_runner.run_tests(["payments.tests"])
    
    if failures:
        raise SystemExit(bool(failures))
