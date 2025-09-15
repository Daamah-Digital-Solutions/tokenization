"""
Tests for Properties app.

Comprehensive tests for property management functionality including
CRUD operations, analytics, approval workflow, and permissions.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from decimal import Decimal
from datetime import date, timedelta
import uuid
import unittest

from .models import (
    Property, PropertyImage, PropertyDocument, PropertyUpdate,
    PropertySubscription, PropertyReview, PropertyValuation,
    PropertyAnalytics, PropertyViewLog, PropertyApproval,
    PropertyMarketData, PropertyStatus, PropertyType
)
from construction.models import ConstructionMilestone
from accounts.models import UserRole

User = get_user_model()


class PropertyModelTest(TestCase):
    """Test Property model functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='testowner@example.com',
            password='testpass123',
            role=UserRole.PROPERTY_OWNER
        )
        
        self.property_data = {
            'title': 'Test Property',
            'description': 'A test property for testing',
            'property_type': PropertyType.RESIDENTIAL,
            'total_value': Decimal('1000000.00'),
            'token_price': Decimal('100.00'),
            'total_tokens': 10000,
            'expected_return': Decimal('8.5'),
            'rental_yield': Decimal('4.2'),
            'property_size': Decimal('2500.00'),
            'year_built': 2020,
            'address': '123 Test Street',
            'city': 'Test City',
            'country': 'USA',
            'owner': self.user
        }
    
    def test_property_creation(self):
        """Test property creation with valid data."""
        property_obj = Property.objects.create(**self.property_data)
        
        self.assertEqual(property_obj.title, 'Test Property')
        self.assertEqual(property_obj.total_value, Decimal('1000000.00'))
        self.assertEqual(property_obj.tokens_sold, 0)
        self.assertEqual(property_obj.status, PropertyStatus.DRAFT)
        self.assertTrue(isinstance(property_obj.id, uuid.UUID))
    
    def test_property_computed_fields(self):
        """Test property computed properties."""
        property_obj = Property.objects.create(**self.property_data)
        
        # Test tokens_available
        self.assertEqual(property_obj.tokens_available, 10000)
        
        # Test funding_percentage
        self.assertEqual(property_obj.funding_percentage, Decimal('0.00'))
        
        # Test is_fully_funded
        self.assertFalse(property_obj.is_fully_funded)
        
        # Test can_accept_investments (should be False for DRAFT status)
        self.assertFalse(property_obj.can_accept_investments)
        
        # Update tokens_sold and test again
        property_obj.tokens_sold = 5000
        property_obj.save()
        
        self.assertEqual(property_obj.tokens_available, 5000)
        self.assertEqual(property_obj.funding_percentage, Decimal('50.00'))
        self.assertFalse(property_obj.is_fully_funded)
    
    def test_calculate_investment_amount(self):
        """Test investment amount calculation."""
        property_obj = Property.objects.create(**self.property_data)
        
        amount = property_obj.calculate_investment_amount(100)
        self.assertEqual(amount, Decimal('10000.00'))


class PropertyAnalyticsTest(TestCase):
    """Test property analytics functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='analytics@example.com',
            password='testpass123',
            role=UserRole.PROPERTY_OWNER
        )
        
        self.property_obj = Property.objects.create(
            title='Analytics Test Property',
            description='Property for analytics testing',
            property_type=PropertyType.RESIDENTIAL,
            total_value=Decimal('600000.00'),
            token_price=Decimal('60.00'),
            total_tokens=10000,
            address='123 Analytics Street',
            city='Analytics City',
            country='USA',
            owner=self.user
        )
        
        self.analytics = PropertyAnalytics.objects.create(
            property=self.property_obj,
            total_views=100,
            unique_views=80,
            total_subscriptions=15,
            conversion_rate=Decimal('2.5'),
            funding_velocity=Decimal('50.0')
        )
    
    def test_analytics_creation(self):
        """Test analytics record creation."""
        self.assertEqual(self.analytics.property, self.property_obj)
        self.assertEqual(self.analytics.total_views, 100)
        self.assertEqual(self.analytics.conversion_rate, Decimal('2.5'))
    
    def test_view_log_creation(self):
        """Test view log creation."""
        view_log = PropertyViewLog.objects.create(
            property=self.property_obj,
            user=self.user,
            ip_address='192.168.1.1',
            user_agent='Test Browser',
            session_key='test-session-key'
        )
        
        self.assertEqual(view_log.property, self.property_obj)
        self.assertEqual(view_log.user, self.user)
        self.assertEqual(view_log.ip_address, '192.168.1.1')


class PropertyApprovalTest(TestCase):
    """Test property approval workflow."""
    
    def setUp(self):
        """Set up test data."""
        self.owner = User.objects.create_user(
            email='approval@example.com',
            password='testpass123',
            role=UserRole.PROPERTY_OWNER
        )
        
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            role=UserRole.ADMIN,
            is_staff=True
        )
        
        self.property_obj = Property.objects.create(
            title='Approval Test Property',
            description='Property for approval testing',
            property_type=PropertyType.RESIDENTIAL,
            total_value=Decimal('400000.00'),
            token_price=Decimal('40.00'),
            total_tokens=10000,
            address='123 Approval Street',
            city='Approval City',
            country='USA',
            owner=self.owner,
            status=PropertyStatus.PENDING_APPROVAL
        )
    
    def test_approval_record_creation(self):
        """Test approval record creation."""
        approval = PropertyApproval.objects.create(
            property=self.property_obj,
            status='pending',
            reviewer=self.admin,
            review_notes='Initial review'
        )
        
        self.assertEqual(approval.property, self.property_obj)
        self.assertEqual(approval.status, 'pending')
        self.assertEqual(approval.reviewer, self.admin)
    
    def test_approval_workflow(self):
        """Test complete approval workflow."""
        # Create approval record
        approval = PropertyApproval.objects.create(
            property=self.property_obj,
            status='pending'
        )
        
        # Approve the property
        approval.status = 'approved'
        approval.reviewer = self.admin
        approval.review_notes = 'Property approved after review'
        approval.save()
        
        # Update property status
        self.property_obj.status = PropertyStatus.APPROVED
        self.property_obj.save()
        
        self.assertEqual(approval.status, 'approved')
        self.assertEqual(self.property_obj.status, PropertyStatus.APPROVED)


if __name__ == '__main__':
    import django
    django.setup()
    unittest.main()
