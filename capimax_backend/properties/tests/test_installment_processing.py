"""
Tests for installment payment processing automation.

This module contains comprehensive tests for the installment payment
processing system including services, tasks, and API endpoints.
"""

from decimal import Decimal
from datetime import date, timedelta
from unittest.mock import patch, Mock

from django.test import TestCase
from django.utils import timezone
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

from accounts.models import User
from properties.models import Property, InstallmentPayment, PropertyStatus
from properties.services import InstallmentProcessingService
from properties.tasks import process_due_installments, send_payment_reminders
from payments.models import WalletBalance, Payment, UserPaymentMethod
from notifications.models import Notification


class InstallmentProcessingServiceTests(TestCase):
    """Test cases for InstallmentProcessingService."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='investor@test.com',
            password='testpass123',
            first_name='Test',
            last_name='Investor',
            user_type='investor'
        )
        
        self.property = Property.objects.create(
            title='Test Property',
            description='A test property for installments',
            property_type='residential',
            status=PropertyStatus.ACTIVE,
            total_value=Decimal('100000.00'),
            token_price=Decimal('100.00'),
            total_tokens=1000,
            supports_installments=True,
            installment_period_months=12,
            address='123 Test St',
            city='Test City',
            country='Test Country',
            owner=self.user
        )
        
        self.installment = InstallmentPayment.objects.create(
            property_investment=self.property,
            investor=self.user,
            total_investment_amount=Decimal('5000.00'),
            token_allocation=50,
            installment_amount=Decimal('500.00'),
            total_installments=10,
            frequency='monthly',
            next_payment_date=date.today(),
            graduated_release=True
        )
        
        # Create wallet balance for user
        self.wallet_balance = WalletBalance.objects.create(
            user=self.user,
            currency='USD',
            available_balance=Decimal('10000.00')
        )
        
        # Create payment method
        self.payment_method = UserPaymentMethod.objects.create(
            user=self.user,
            method_type='wallet',
            display_name='USD Wallet',
            is_default=True,
            is_verified=True
        )
        
        self.service = InstallmentProcessingService()
    
    def test_process_due_payments_success(self):
        """Test successful processing of due payments."""
        # Make installment due
        self.installment.next_payment_date = date.today() - timedelta(days=1)
        self.installment.save()
        
        result = self.service.process_due_payments(max_payments=10)
        
        self.assertTrue(result['successful'] > 0)
        self.assertEqual(result['failed'], 0)
        self.assertTrue(result['total_amount'] > Decimal('0'))
        
        # Check installment was updated
        self.installment.refresh_from_db()
        self.assertEqual(self.installment.payments_made, 1)
        self.assertTrue(self.installment.total_amount_paid > Decimal('0'))
    
    def test_process_payment_insufficient_balance(self):
        """Test processing payment with insufficient wallet balance."""
        # Reduce wallet balance
        self.wallet_balance.available_balance = Decimal('100.00')
        self.wallet_balance.save()
        
        result = self.service._process_single_installment(self.installment)
        
        self.assertFalse(result['success'])
        self.assertIn('Insufficient wallet balance', result['error'])
    
    def test_send_payment_reminders(self):
        """Test sending payment reminders."""
        # Set payment due in 3 days
        self.installment.next_payment_date = date.today() + timedelta(days=3)
        self.installment.save()
        
        result = self.service.send_payment_reminders(days_before_due=3)
        
        self.assertEqual(result['reminders_sent'], 1)
        self.assertEqual(result['failed'], 0)
        
        # Check notification was created
        notifications = Notification.objects.filter(user=self.user)
        self.assertTrue(notifications.exists())
        self.assertIn('Payment Reminder', notifications.first().title)
    
    def test_process_late_payments(self):
        """Test processing late payments and applying fees."""
        # Make payment overdue
        self.installment.next_payment_date = date.today() - timedelta(days=10)
        self.installment.late_payment_fee = Decimal('50.00')
        self.installment.grace_period_days = 7
        self.installment.save()
        
        result = self.service.process_late_payments()
        
        self.assertTrue(result['processed'] > 0)
        # Note: Late fee application would be tested with more specific logic
    
    def test_token_release_graduated(self):
        """Test graduated token release with payments."""
        # Set up graduated release
        self.installment.graduated_release = True
        self.installment.save()
        
        # Process payment
        success, message, tokens_released = self.installment.process_payment(
            Decimal('500.00')
        )
        
        self.assertTrue(success)
        self.assertTrue(tokens_released > 0)
        self.installment.refresh_from_db()
        self.assertTrue(self.installment.tokens_released > 0)
    
    def test_payment_schedule_calculation(self):
        """Test payment schedule calculation."""
        next_date = self.installment.calculate_next_payment_date(date.today())
        
        # Should be one month later for monthly frequency
        expected_date = date.today() + timedelta(days=30)  # Approximate
        self.assertTrue(abs((next_date - expected_date).days) <= 2)  # Allow 2-day variance
    
    def test_installment_completion(self):
        """Test installment completion logic."""
        # Complete all payments
        self.installment.payments_made = self.installment.total_installments
        self.installment.total_amount_paid = self.installment.total_investment_amount
        self.installment.save()
        
        self.assertTrue(self.installment.is_completed)
        self.assertEqual(self.installment.remaining_payments, 0)


class InstallmentTaskTests(TestCase):
    """Test cases for installment processing Celery tasks."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='investor@test.com',
            password='testpass123',
            user_type='investor'
        )
        
        self.property = Property.objects.create(
            title='Test Property',
            description='Test property',
            property_type='residential',
            status=PropertyStatus.ACTIVE,
            total_value=Decimal('100000.00'),
            token_price=Decimal('100.00'),
            total_tokens=1000,
            supports_installments=True,
            address='123 Test St',
            city='Test City',
            country='Test Country',
            owner=self.user
        )
        
        self.installment = InstallmentPayment.objects.create(
            property_investment=self.property,
            investor=self.user,
            total_investment_amount=Decimal('5000.00'),
            token_allocation=50,
            installment_amount=Decimal('500.00'),
            total_installments=10,
            next_payment_date=date.today() - timedelta(days=1),  # Due yesterday
        )
        
        WalletBalance.objects.create(
            user=self.user,
            currency='USD',
            available_balance=Decimal('10000.00')
        )
        
        UserPaymentMethod.objects.create(
            user=self.user,
            method_type='wallet',
            display_name='USD Wallet',
            is_default=True,
            is_verified=True
        )
    
    @patch('properties.services.InstallmentProcessingService.process_due_payments')
    def test_process_due_installments_task(self, mock_process):
        """Test the process_due_installments Celery task."""
        # Mock the service method
        mock_process.return_value = {
            'processed': 1,
            'successful': 1,
            'failed': 0,
            'errors': [],
            'total_amount': Decimal('500.00'),
            'tokens_released': 5
        }
        
        from properties.tasks import process_due_installments
        result = process_due_installments(max_payments=10)
        
        self.assertTrue(result['successful'] > 0)
        self.assertEqual(result['failed'], 0)
        mock_process.assert_called_once_with(max_payments=10)
    
    @patch('properties.services.InstallmentProcessingService.send_payment_reminders')
    def test_send_payment_reminders_task(self, mock_reminders):
        """Test the send_payment_reminders Celery task."""
        mock_reminders.return_value = {
            'reminders_sent': 1,
            'failed': 0,
            'errors': []
        }
        
        from properties.tasks import send_payment_reminders
        result = send_payment_reminders(days_before_due=3)
        
        self.assertEqual(result['reminders_sent'], 1)
        mock_reminders.assert_called_once_with(days_before_due=3)


class InstallmentAPITests(APITestCase):
    """Test cases for installment payment API endpoints."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='investor@test.com',
            password='testpass123',
            user_type='investor'
        )
        
        self.property = Property.objects.create(
            title='Test Property',
            description='Test property',
            property_type='residential',
            status=PropertyStatus.ACTIVE,
            total_value=Decimal('100000.00'),
            token_price=Decimal('100.00'),
            total_tokens=1000,
            supports_installments=True,
            installment_period_months=12,
            address='123 Test St',
            city='Test City',
            country='Test Country',
            owner=self.user
        )
        
        self.installment = InstallmentPayment.objects.create(
            property_investment=self.property,
            investor=self.user,
            total_investment_amount=Decimal('5000.00'),
            token_allocation=50,
            installment_amount=Decimal('500.00'),
            total_installments=10,
            next_payment_date=date.today(),
        )
        
        # Authenticate user
        self.client.force_authenticate(user=self.user)
    
    def test_list_installments(self):
        """Test listing user's installments."""
        url = reverse('properties:installment-payment-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], str(self.installment.id))
    
    def test_create_installment(self):
        """Test creating a new installment plan."""
        url = reverse('properties:installment-payment-list')
        
        # Create another property for new installment
        property2 = Property.objects.create(
            title='Test Property 2',
            description='Test property 2',
            property_type='commercial',
            status=PropertyStatus.ACTIVE,
            total_value=Decimal('200000.00'),
            token_price=Decimal('200.00'),
            total_tokens=1000,
            supports_installments=True,
            address='456 Test Ave',
            city='Test City',
            country='Test Country',
            owner=self.user
        )
        
        data = {
            'property_investment': str(property2.id),
            'total_investment_amount': '10000.00',
            'token_allocation': 50,
            'installment_amount': '1000.00',
            'total_installments': 10,
            'frequency': 'monthly',
            'graduated_release': True
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check installment was created
        installment = InstallmentPayment.objects.get(id=response.data['id'])
        self.assertEqual(installment.investor, self.user)
        self.assertEqual(installment.property_investment, property2)
    
    def test_process_payment_api(self):
        """Test processing an installment payment via API."""
        url = reverse('properties:installment-payment-process-payment', 
                     kwargs={'pk': self.installment.id})
        
        data = {
            'amount': '500.00',
            'payment_method': 'wallet'
        }
        
        with patch.object(InstallmentPayment, 'process_payment') as mock_process:
            mock_process.return_value = (True, 'Payment processed successfully', Decimal('5'))
            
            response = self.client.post(url, data, format='json')
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertTrue(response.data['success'])
            self.assertEqual(float(response.data['tokens_released']), 5.0)
    
    def test_payment_schedule_api(self):
        """Test getting payment schedule via API."""
        url = reverse('properties:installment-payment-payment-schedule', 
                     kwargs={'pk': self.installment.id})
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_payments'], self.installment.total_installments)
        self.assertTrue(len(response.data['schedule']) > 0)
    
    def test_cancel_installment_api(self):
        """Test cancelling an installment plan via API."""
        url = reverse('properties:installment-payment-cancel', 
                     kwargs={'pk': self.installment.id})
        
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        
        # Check installment was cancelled
        self.installment.refresh_from_db()
        self.assertEqual(self.installment.status, 'cancelled')
    
    def test_installment_statistics_api(self):
        """Test getting installment statistics via API."""
        url = reverse('properties:installment-payment-statistics')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_installment_plans'], 1)
        self.assertEqual(response.data['active_plans'], 1)
    
    def test_unauthorized_access(self):
        """Test that unauthorized users cannot access installments."""
        # Create another user
        other_user = User.objects.create_user(
            email='other@test.com',
            password='testpass123'
        )
        
        # Authenticate as other user
        self.client.force_authenticate(user=other_user)
        
        url = reverse('properties:installment-payment-list')
        response = self.client.get(url)
        
        # Should return empty list (user has no installments)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)


class InstallmentModelTests(TestCase):
    """Test cases for InstallmentPayment model methods and properties."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='investor@test.com',
            password='testpass123'
        )
        
        self.property = Property.objects.create(
            title='Test Property',
            description='Test property',
            property_type='residential',
            status=PropertyStatus.ACTIVE,
            total_value=Decimal('100000.00'),
            token_price=Decimal('100.00'),
            total_tokens=1000,
            address='123 Test St',
            city='Test City',
            country='Test Country',
            owner=self.user
        )
        
        self.installment = InstallmentPayment.objects.create(
            property_investment=self.property,
            investor=self.user,
            total_investment_amount=Decimal('5000.00'),
            token_allocation=50,
            installment_amount=Decimal('500.00'),
            total_installments=10,
            next_payment_date=date.today(),
        )
    
    def test_remaining_amount_calculation(self):
        """Test remaining amount calculation."""
        self.installment.total_amount_paid = Decimal('1500.00')
        self.installment.save()
        
        remaining = self.installment.remaining_amount
        expected_remaining = Decimal('5000.00') - Decimal('1500.00')
        
        self.assertEqual(remaining, expected_remaining)
    
    def test_completion_percentage_calculation(self):
        """Test completion percentage calculation."""
        self.installment.payments_made = 3
        self.installment.save()
        
        percentage = self.installment.completion_percentage
        expected_percentage = Decimal('30.00')  # 3/10 * 100
        
        self.assertEqual(percentage, expected_percentage)
    
    def test_tokens_pending_release(self):
        """Test tokens pending release calculation."""
        self.installment.tokens_released = 20
        self.installment.save()
        
        pending = self.installment.tokens_pending_release
        expected_pending = 50 - 20
        
        self.assertEqual(pending, expected_pending)
    
    def test_can_make_payment(self):
        """Test can_make_payment logic."""
        # Payment should be allowed if due date has passed and plan is active
        self.installment.next_payment_date = date.today() - timedelta(days=1)
        self.installment.status = 'pending'
        self.installment.save()
        
        self.assertTrue(self.installment.can_make_payment())
        
        # Payment should not be allowed if completed
        self.installment.payments_made = self.installment.total_installments
        self.installment.save()
        
        self.assertFalse(self.installment.can_make_payment())
    
    def test_calculate_tokens_per_payment(self):
        """Test tokens per payment calculation."""
        self.installment.graduated_release = True
        
        tokens_per_payment = self.installment.calculate_tokens_per_payment()
        expected_tokens = Decimal('50') / Decimal('10')  # 50 tokens / 10 payments
        
        self.assertEqual(tokens_per_payment, expected_tokens)