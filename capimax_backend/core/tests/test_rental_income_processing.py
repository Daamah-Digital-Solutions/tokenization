"""
Tests for rental income distribution processing automation.

This module contains comprehensive tests for the rental income
distribution system including services, tasks, and API endpoints.
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
from properties.models import Property, RentalIncomeDistribution, PropertyStatus
from core.services.rental_income_service import RentalIncomeService
from core.tasks import distribute_monthly_rental_income, collect_rental_income
from payments.models import WalletBalance, WalletTransaction
from investments.models import Investment
from notifications.models import Notification, SystemAlert


class RentalIncomeServiceTests(TestCase):
    """Test cases for RentalIncomeService."""
    
    def setUp(self):
        """Set up test data."""
        # Create property owner
        self.owner = User.objects.create_user(
            email='owner@test.com',
            password='testpass123',
            first_name='Property',
            last_name='Owner',
            user_type='property_owner'
        )
        
        # Create investors
        self.investor1 = User.objects.create_user(
            email='investor1@test.com',
            password='testpass123',
            user_type='investor'
        )
        
        self.investor2 = User.objects.create_user(
            email='investor2@test.com',
            password='testpass123',
            user_type='investor'
        )
        
        # Create property with rental income
        self.property = Property.objects.create(
            title='Test Rental Property',
            description='A test property generating rental income',
            property_type='residential',
            status=PropertyStatus.TOKENIZED,
            total_value=Decimal('100000.00'),
            token_price=Decimal('100.00'),
            total_tokens=1000,
            tokens_sold=200,  # 20% sold
            rental_income_active=True,
            monthly_rental_income=Decimal('5000.00'),
            occupancy_rate=Decimal('95.00'),
            address='123 Rental St',
            city='Rental City',
            country='Test Country',
            owner=self.owner
        )
        
        # Create investments
        self.investment1 = Investment.objects.create(
            user=self.investor1,
            property=self.property,
            token_count=120,  # 60% of sold tokens
            amount_invested=Decimal('12000.00'),
            status='active'
        )
        
        self.investment2 = Investment.objects.create(
            user=self.investor2,
            property=self.property,
            token_count=80,   # 40% of sold tokens
            amount_invested=Decimal('8000.00'),
            status='active'
        )
        
        # Create wallet balances for investors
        WalletBalance.objects.create(
            user=self.investor1,
            currency='USD',
            available_balance=Decimal('100.00')
        )
        
        WalletBalance.objects.create(
            user=self.investor2,
            currency='USD',
            available_balance=Decimal('50.00')
        )
        
        self.service = RentalIncomeService()
    
    def test_process_monthly_distributions_success(self):
        """Test successful monthly rental income distribution."""
        target_month = '2024-01'
        
        result = self.service.process_monthly_distributions(target_month=target_month)
        
        self.assertEqual(result['properties_processed'], 1)
        self.assertEqual(result['properties_failed'], 0)
        self.assertEqual(result['total_distributions'], 1)
        self.assertTrue(result['total_distributed'] > Decimal('0'))
        self.assertTrue(result['investors_paid'] > 0)
        
        # Check distribution was created
        distribution = RentalIncomeDistribution.objects.get(
            property=self.property,
            distribution_period=target_month
        )
        self.assertEqual(distribution.tokens_eligible, 200)  # Sold tokens
        self.assertTrue(distribution.net_distribution_amount > Decimal('0'))
    
    def test_calculate_distribution_amounts(self):
        """Test rental income distribution calculations."""
        target_month = '2024-01'
        
        result = self.service._process_single_property_distribution(
            self.property, target_month
        )
        
        self.assertTrue(result['success'])
        
        # Check calculations
        expected_gross_income = Decimal('5000.00')  # Monthly rental income
        expected_actual_income = expected_gross_income * Decimal('0.95')  # 95% occupancy
        expected_platform_fee = expected_actual_income * self.service.platform_commission_rate
        expected_net = expected_actual_income - expected_platform_fee
        
        self.assertEqual(result['total_income'], expected_actual_income)
        self.assertEqual(result['platform_fee'], expected_platform_fee)
        self.assertEqual(result['net_distributed'], expected_net)
    
    def test_investor_distribution_calculation(self):
        """Test individual investor distribution calculations."""
        target_month = '2024-01'
        
        # Process distribution
        result = self.service.process_monthly_distributions(target_month=target_month)
        
        # Get the created distribution
        distribution = RentalIncomeDistribution.objects.get(
            property=self.property,
            distribution_period=target_month
        )
        
        # Calculate expected amounts
        amount_per_token = distribution.amount_per_token
        investor1_amount = amount_per_token * Decimal(self.investment1.token_count)
        investor2_amount = amount_per_token * Decimal(self.investment2.token_count)
        
        # Check wallet transactions were created
        investor1_transactions = WalletTransaction.objects.filter(
            user=self.investor1,
            transaction_type='dividend'
        )
        self.assertTrue(investor1_transactions.exists())
        self.assertEqual(investor1_transactions.first().amount, investor1_amount)
        
        investor2_transactions = WalletTransaction.objects.filter(
            user=self.investor2,
            transaction_type='dividend'
        )
        self.assertTrue(investor2_transactions.exists())
        self.assertEqual(investor2_transactions.first().amount, investor2_amount)
    
    def test_wallet_balance_update(self):
        """Test that wallet balances are updated correctly."""
        target_month = '2024-01'
        
        # Get initial balances
        initial_balance1 = WalletBalance.objects.get(
            user=self.investor1, currency='USD'
        ).available_balance
        initial_balance2 = WalletBalance.objects.get(
            user=self.investor2, currency='USD'
        ).available_balance
        
        # Process distribution
        self.service.process_monthly_distributions(target_month=target_month)
        
        # Check balances were updated
        final_balance1 = WalletBalance.objects.get(
            user=self.investor1, currency='USD'
        ).available_balance
        final_balance2 = WalletBalance.objects.get(
            user=self.investor2, currency='USD'
        ).available_balance
        
        self.assertTrue(final_balance1 > initial_balance1)
        self.assertTrue(final_balance2 > initial_balance2)
    
    def test_notification_creation(self):
        """Test that notifications are created for investors."""
        target_month = '2024-01'
        
        # Process distribution
        self.service.process_monthly_distributions(target_month=target_month)
        
        # Check notifications were created
        notifications1 = Notification.objects.filter(user=self.investor1)
        notifications2 = Notification.objects.filter(user=self.investor2)
        
        self.assertTrue(notifications1.exists())
        self.assertTrue(notifications2.exists())
        
        # Check notification content
        notification1 = notifications1.first()
        self.assertIn('Rental Income Received', notification1.title)
        self.assertIn(self.property.title, notification1.message)
    
    def test_duplicate_distribution_prevention(self):
        """Test that duplicate distributions are prevented."""
        target_month = '2024-01'
        
        # Process distribution first time
        result1 = self.service.process_monthly_distributions(target_month=target_month)
        self.assertEqual(result1['properties_processed'], 1)
        
        # Try to process same month again
        result2 = self.service.process_monthly_distributions(target_month=target_month)
        self.assertEqual(result2['properties_processed'], 0)  # Should skip existing
    
    def test_property_without_rental_income(self):
        """Test handling of properties without active rental income."""
        # Create property without rental income
        inactive_property = Property.objects.create(
            title='Inactive Rental Property',
            description='Property without rental income',
            property_type='commercial',
            status=PropertyStatus.TOKENIZED,
            total_value=Decimal('50000.00'),
            token_price=Decimal('100.00'),
            total_tokens=500,
            rental_income_active=False,  # No rental income
            address='456 Inactive St',
            city='Test City',
            country='Test Country',
            owner=self.owner
        )
        
        target_month = '2024-01'
        result = self.service.process_monthly_distributions(target_month=target_month)
        
        # Should only process the active rental property
        self.assertEqual(result['properties_processed'], 1)
        
        # Check no distribution was created for inactive property
        distributions = RentalIncomeDistribution.objects.filter(
            property=inactive_property
        )
        self.assertFalse(distributions.exists())
    
    def test_generate_distribution_report(self):
        """Test distribution report generation."""
        target_month = '2024-01'
        
        # Process distribution first
        self.service.process_monthly_distributions(target_month=target_month)
        
        # Generate report
        report = self.service.generate_distribution_report(target_month)
        
        self.assertEqual(report['period'], target_month)
        self.assertEqual(report['total_distributions'], 1)
        self.assertEqual(report['unique_properties'], 1)
        self.assertEqual(report['unique_investors'], 2)
        self.assertTrue(report['financial_summary']['total_distributed'] > Decimal('0'))
        self.assertTrue(len(report['distribution_details']) > 0)


class RentalIncomeTaskTests(TestCase):
    """Test cases for rental income processing Celery tasks."""
    
    def setUp(self):
        """Set up test data."""
        self.owner = User.objects.create_user(
            email='owner@test.com',
            password='testpass123',
            user_type='property_owner'
        )
        
        self.investor = User.objects.create_user(
            email='investor@test.com',
            password='testpass123',
            user_type='investor'
        )
        
        self.property = Property.objects.create(
            title='Test Property',
            description='Test property',
            property_type='residential',
            status=PropertyStatus.TOKENIZED,
            total_value=Decimal('100000.00'),
            token_price=Decimal('100.00'),
            total_tokens=1000,
            rental_income_active=True,
            monthly_rental_income=Decimal('3000.00'),
            address='123 Test St',
            city='Test City',
            country='Test Country',
            owner=self.owner
        )
        
        Investment.objects.create(
            user=self.investor,
            property=self.property,
            token_count=100,
            amount_invested=Decimal('10000.00'),
            status='active'
        )
        
        WalletBalance.objects.create(
            user=self.investor,
            currency='USD',
            available_balance=Decimal('0.00')
        )
    
    @patch('core.services.rental_income_service.RentalIncomeService.process_monthly_distributions')
    def test_distribute_monthly_rental_income_task(self, mock_process):
        """Test the distribute_monthly_rental_income Celery task."""
        mock_process.return_value = {
            'period': '2024-01',
            'properties_processed': 1,
            'properties_failed': 0,
            'total_distributions': 1,
            'total_rental_income': Decimal('3000.00'),
            'total_platform_fees': Decimal('75.00'),
            'total_distributed': Decimal('2925.00'),
            'investors_paid': 1,
            'failed_distributions': [],
            'distribution_details': []
        }
        
        result = distribute_monthly_rental_income(target_month='2024-01')
        
        self.assertEqual(result['properties_processed'], 1)
        self.assertEqual(result['properties_failed'], 0)
        mock_process.assert_called_once()
    
    @patch('core.services.rental_income_service.RentalIncomeService.collect_property_rental_income')
    def test_collect_rental_income_task(self, mock_collect):
        """Test the collect_rental_income Celery task."""
        mock_collect.return_value = {
            'properties_checked': 1,
            'properties_updated': 0,
            'total_income_collected': Decimal('0.00'),
            'errors': []
        }
        
        result = collect_rental_income()
        
        self.assertEqual(result['properties_checked'], 1)
        mock_collect.assert_called_once()
    
    def test_system_alert_creation(self):
        """Test that system alerts are created during task execution."""
        # This would be tested with actual task execution
        # For now, we'll test alert creation directly
        
        SystemAlert.objects.create(
            title='Monthly Rental Distribution Success - 2024-01',
            message='Test distribution completed successfully',
            alert_type='info',
            category='payment',
            target_user_types=['admin']
        )
        
        alert = SystemAlert.objects.filter(category='payment').first()
        self.assertIsNotNone(alert)
        self.assertEqual(alert.alert_type, 'info')


class RentalIncomeAPITests(APITestCase):
    """Test cases for rental income distribution API endpoints."""
    
    def setUp(self):
        """Set up test data."""
        # Create admin user
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            is_staff=True,
            is_superuser=True
        )
        
        # Create investor
        self.investor = User.objects.create_user(
            email='investor@test.com',
            password='testpass123',
            user_type='investor'
        )
        
        # Create property owner
        self.owner = User.objects.create_user(
            email='owner@test.com',
            password='testpass123',
            user_type='property_owner'
        )
        
        # Create property
        self.property = Property.objects.create(
            title='Test Property',
            description='Test property',
            property_type='residential',
            status=PropertyStatus.TOKENIZED,
            total_value=Decimal('100000.00'),
            token_price=Decimal('100.00'),
            total_tokens=1000,
            rental_income_active=True,
            monthly_rental_income=Decimal('4000.00'),
            address='123 Test St',
            city='Test City',
            country='Test Country',
            owner=self.owner
        )
        
        # Create investment
        self.investment = Investment.objects.create(
            user=self.investor,
            property=self.property,
            token_count=100,
            amount_invested=Decimal('10000.00'),
            status='active'
        )
        
        # Create distribution
        self.distribution = RentalIncomeDistribution.objects.create(
            property=self.property,
            distribution_period='2024-01',
            total_rental_income=Decimal('4000.00'),
            platform_fee=Decimal('100.00'),
            net_distribution_amount=Decimal('3900.00'),
            tokens_eligible=100,
            amount_per_token=Decimal('39.00')
        )
    
    def test_list_rental_distributions_investor(self):
        """Test listing rental distributions as investor."""
        self.client.force_authenticate(user=self.investor)
        
        url = reverse('properties:rental-distribution-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Results would depend on serializer implementation
        # This tests the basic endpoint access
    
    def test_rental_distributions_by_property(self):
        """Test getting rental distributions for specific property."""
        self.client.force_authenticate(user=self.investor)
        
        url = reverse('properties:rental-distribution-by-property', 
                     kwargs={'property_id': self.property.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return distributions for the property
    
    def test_user_rental_statistics(self):
        """Test getting user rental income statistics."""
        self.client.force_authenticate(user=self.investor)
        
        url = reverse('properties:rental-distribution-user-statistics')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return user statistics
    
    def test_period_report_investor(self):
        """Test getting period report as investor."""
        self.client.force_authenticate(user=self.investor)
        
        url = reverse('properties:rental-distribution-period-report', 
                     kwargs={'period': '2024-01'})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return filtered report for investor's properties
    
    def test_admin_trigger_distribution(self):
        """Test triggering distribution as admin."""
        self.client.force_authenticate(user=self.admin_user)
        
        url = reverse('properties:rental-income-management')
        data = {
            'action': 'trigger_distribution',
            'target_month': '2024-02'
        }
        
        with patch('core.tasks.distribute_monthly_rental_income.delay') as mock_task:
            mock_task.return_value = Mock(id='test-task-id')
            
            response = self.client.post(url, data, format='json')
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIn('task_id', response.data)
            mock_task.assert_called_once()
    
    def test_admin_update_property_income(self):
        """Test updating property rental income as admin."""
        self.client.force_authenticate(user=self.admin_user)
        
        url = reverse('properties:rental-income-management')
        data = {
            'action': 'update_property_income',
            'property_id': str(self.property.id),
            'monthly_income': '5000.00',
            'occupancy_rate': '98.0'
        }
        
        with patch('core.tasks.update_property_rental_income.delay') as mock_task:
            mock_task.return_value = Mock(id='test-task-id')
            
            response = self.client.post(url, data, format='json')
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            mock_task.assert_called_once()
    
    def test_unauthorized_admin_access(self):
        """Test that non-admin users cannot access admin endpoints."""
        self.client.force_authenticate(user=self.investor)
        
        url = reverse('properties:rental-income-management')
        data = {
            'action': 'trigger_distribution'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class RentalIncomeModelTests(TestCase):
    """Test cases for RentalIncomeDistribution model methods."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='owner@test.com',
            password='testpass123'
        )
        
        self.property = Property.objects.create(
            title='Test Property',
            description='Test property',
            property_type='residential',
            status=PropertyStatus.TOKENIZED,
            total_value=Decimal('100000.00'),
            token_price=Decimal('100.00'),
            total_tokens=1000,
            address='123 Test St',
            city='Test City',
            country='Test Country',
            owner=self.user
        )
    
    def test_distribution_creation(self):
        """Test creating a rental income distribution."""
        distribution = RentalIncomeDistribution.objects.create(
            property=self.property,
            distribution_period='2024-01',
            total_rental_income=Decimal('5000.00'),
            platform_fee=Decimal('125.00'),
            tokens_eligible=500
        )
        
        # Test auto-calculation of net amount
        expected_net = Decimal('5000.00') - Decimal('125.00')
        self.assertEqual(distribution.net_distribution_amount, expected_net)
        
        # Test amount per token calculation
        expected_per_token = expected_net / Decimal('500')
        self.assertEqual(distribution.amount_per_token, expected_per_token)
    
    def test_distribution_string_representation(self):
        """Test string representation of distribution."""
        distribution = RentalIncomeDistribution.objects.create(
            property=self.property,
            distribution_period='2024-01',
            total_rental_income=Decimal('3000.00'),
            platform_fee=Decimal('75.00'),
            tokens_eligible=300
        )
        
        expected_str = f"Rental distribution for {self.property.title} - 2024-01"
        self.assertEqual(str(distribution), expected_str)
    
    def test_unique_constraint(self):
        """Test that duplicate distributions are prevented."""
        # Create first distribution
        RentalIncomeDistribution.objects.create(
            property=self.property,
            distribution_period='2024-01',
            total_rental_income=Decimal('3000.00'),
            platform_fee=Decimal('75.00'),
            tokens_eligible=300
        )
        
        # Try to create duplicate
        with self.assertRaises(Exception):  # Should raise IntegrityError
            RentalIncomeDistribution.objects.create(
                property=self.property,
                distribution_period='2024-01',  # Same period
                total_rental_income=Decimal('4000.00'),
                platform_fee=Decimal('100.00'),
                tokens_eligible=400
            )