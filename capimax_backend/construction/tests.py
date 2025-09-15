"""
Tests for Construction app.

Comprehensive tests for construction milestone management functionality.
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
    ConstructionMilestone, MilestoneUpdate, MilestoneImage,
    MilestoneDocument, MilestoneStatus, MilestoneCategory
)
from properties.models import Property, PropertyType, PropertyStatus
from accounts.models import UserRole

User = get_user_model()


class ConstructionMilestoneModelTest(TestCase):
    """Test ConstructionMilestone model functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='constructor@example.com',
            password='testpass123',
            role=UserRole.PROPERTY_OWNER
        )
        
        self.property_obj = Property.objects.create(
            title='Construction Test Property',
            description='Property for construction testing',
            property_type=PropertyType.RESIDENTIAL,
            total_value=Decimal('500000.00'),
            token_price=Decimal('50.00'),
            total_tokens=10000,
            address='123 Construction Street',
            city='Construction City',
            country='USA',
            owner=self.user,
            status=PropertyStatus.UNDER_CONSTRUCTION
        )
        
        self.milestone_data = {
            'property_obj': self.property_obj,
            'title': 'Foundation Work',
            'description': 'Complete foundation and basement',
            'category': MilestoneCategory.FOUNDATION,
            'planned_start_date': date.today(),
            'planned_completion_date': date.today() + timedelta(days=30),
            'estimated_cost': Decimal('50000.00'),
            'contractor': 'ABC Construction Company',
            'order': 1
        }
    
    def test_milestone_creation(self):
        """Test milestone creation with valid data."""
        milestone = ConstructionMilestone.objects.create(**self.milestone_data)
        
        self.assertEqual(milestone.title, 'Foundation Work')
        self.assertEqual(milestone.category, MilestoneCategory.FOUNDATION)
        self.assertEqual(milestone.status, MilestoneStatus.PENDING)
        self.assertEqual(milestone.progress_percentage, Decimal('0.00'))
        self.assertTrue(isinstance(milestone.id, uuid.UUID))
    
    def test_milestone_is_delayed(self):
        """Test milestone delay detection."""
        # Create milestone with past completion date
        past_date = date.today() - timedelta(days=5)
        milestone = ConstructionMilestone.objects.create(
            **self.milestone_data,
            planned_completion_date=past_date
        )
        
        self.assertTrue(milestone.is_delayed)
        self.assertEqual(milestone.days_delayed, 5)
    
    def test_milestone_not_delayed(self):
        """Test milestone not delayed when on time."""
        future_date = date.today() + timedelta(days=10)
        milestone = ConstructionMilestone.objects.create(
            **self.milestone_data,
            planned_completion_date=future_date
        )
        
        self.assertFalse(milestone.is_delayed)
        self.assertEqual(milestone.days_delayed, 0)
    
    def test_milestone_completed_not_delayed(self):
        """Test completed milestone is not considered delayed."""
        past_date = date.today() - timedelta(days=5)
        milestone = ConstructionMilestone.objects.create(
            **self.milestone_data,
            planned_completion_date=past_date,
            actual_completion_date=past_date,
            status=MilestoneStatus.COMPLETED
        )
        
        self.assertFalse(milestone.is_delayed)


class ConstructionProgressTest(TestCase):
    """Test construction progress calculation."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='progress@example.com',
            password='testpass123',
            role=UserRole.PROPERTY_OWNER
        )
        
        self.property_obj = Property.objects.create(
            title='Progress Test Property',
            description='Property for progress testing',
            property_type=PropertyType.MIXED_USE,
            total_value=Decimal('2000000.00'),
            token_price=Decimal('200.00'),
            total_tokens=10000,
            address='123 Progress Street',
            city='Progress City',
            country='USA',
            owner=self.user,
            status=PropertyStatus.UNDER_CONSTRUCTION
        )
        
        # Create multiple milestones with different progress levels
        self.milestone1 = ConstructionMilestone.objects.create(
            property_obj=self.property_obj,
            title='Foundation',
            description='Foundation work',
            category=MilestoneCategory.FOUNDATION,
            planned_start_date=date.today() - timedelta(days=30),
            planned_completion_date=date.today() - timedelta(days=10),
            progress_percentage=Decimal('100.00'),
            status=MilestoneStatus.COMPLETED,
            estimated_cost=Decimal('100000.00'),
            actual_cost=Decimal('95000.00'),
            order=1
        )
        
        self.milestone2 = ConstructionMilestone.objects.create(
            property_obj=self.property_obj,
            title='Structure',
            description='Building structure',
            category=MilestoneCategory.STRUCTURE,
            planned_start_date=date.today() - timedelta(days=20),
            planned_completion_date=date.today() + timedelta(days=10),
            progress_percentage=Decimal('75.00'),
            status=MilestoneStatus.IN_PROGRESS,
            estimated_cost=Decimal('200000.00'),
            order=2
        )
    
    def test_overall_progress_calculation(self):
        """Test overall construction progress calculation."""
        milestones = ConstructionMilestone.objects.filter(property_obj=self.property_obj)
        
        # Calculate overall progress (average of milestone progress)
        total_progress = sum(m.progress_percentage for m in milestones)
        overall_progress = total_progress / milestones.count()
        
        # (100 + 75) / 2 = 87.5
        expected_progress = Decimal('87.50')
        self.assertEqual(overall_progress, expected_progress)
    
    def test_cost_analysis(self):
        """Test construction cost analysis."""
        milestones = ConstructionMilestone.objects.filter(property_obj=self.property_obj)
        
        total_estimated = sum(
            m.estimated_cost for m in milestones if m.estimated_cost
        )
        total_actual = sum(
            m.actual_cost for m in milestones if m.actual_cost
        )
        
        self.assertEqual(total_estimated, Decimal('300000.00'))
        self.assertEqual(total_actual, Decimal('95000.00'))


if __name__ == '__main__':
    import django
    django.setup()
    unittest.main()
