"""
Broker referral lifecycle tests (client #6a — refer-a-lead).

Covers the loop that used to be dead:
  register with ?ref=CODE  ->  referred_user linked
  first successful investment  ->  referral converted + pending referral commission
"""

from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from accounts.models import User
from accounts.serializers import UserRegistrationSerializer
from broker.models import (
    BrokerProfile, BrokerReferral, BrokerCommission,
    CommissionType, CommissionStatus,
)
from broker.services import attach_referral
from properties.models import Property, PropertyStatus
from investments.models import Investment


class BrokerReferralLifecycleTests(TestCase):
    def setUp(self):
        self.broker_user = User.objects.create_user(
            email='broker@test.com', password='TestPass123!', role='broker',
            first_name='Bro', last_name='Ker',
        )
        self.broker = BrokerProfile.objects.create(
            user=self.broker_user,
            license_number='LIC-1',
            license_state='CA',
            license_expiry=timezone.now().date() + timedelta(days=365),
        )
        self.referral = BrokerReferral.objects.create(
            broker=self.broker, referral_code='REFTEST1',
        )

    def _make_property(self, title='P'):
        return Property.objects.create(
            title=title, description='d', property_type='residential',
            status=PropertyStatus.ACTIVE, total_value=Decimal('100000'),
            token_price=Decimal('100'), total_tokens=1000,
            address='a', city='c', country='US', owner=self.broker_user,
        )

    def test_registration_with_ref_links_user(self):
        """Registering with ?ref=CODE links the new user to the broker."""
        serializer = UserRegistrationSerializer(data={
            'email': 'lead@test.com',
            'password': 'TestPass123!', 'confirm_password': 'TestPass123!',
            'first_name': 'Lead', 'last_name': 'One',
            'country': 'US', 'role': 'investor',
            'referral_code': 'REFTEST1',
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.referral.refresh_from_db()
        self.assertEqual(self.referral.referred_user_id, user.id)

    def test_bad_code_does_not_break_registration(self):
        """An unknown referral code is ignored, registration still succeeds."""
        serializer = UserRegistrationSerializer(data={
            'email': 'noref@test.com',
            'password': 'TestPass123!', 'confirm_password': 'TestPass123!',
            'first_name': 'No', 'last_name': 'Ref',
            'country': 'US', 'role': 'investor',
            'referral_code': 'DOESNOTEXIST',
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()  # must not raise
        self.assertIsNotNone(user.id)

    def test_shared_link_refers_many_users(self):
        """A second signup on an already-claimed code gets its own row."""
        u1 = User.objects.create_user(email='u1@test.com', password='x', role='investor')
        u2 = User.objects.create_user(email='u2@test.com', password='x', role='investor')
        attach_referral(u1, 'REFTEST1')
        attach_referral(u2, 'REFTEST1')

        self.referral.refresh_from_db()
        self.assertEqual(self.referral.referred_user_id, u1.id)
        self.assertTrue(
            BrokerReferral.objects.filter(broker=self.broker, referred_user=u2).exists()
        )

    def test_first_investment_books_referral_commission(self):
        """First successful investment converts the referral + books a commission."""
        lead = User.objects.create_user(email='lead2@test.com', password='x', role='investor')
        attach_referral(lead, 'REFTEST1')
        prop = self._make_property('P1')

        # Creating a completed investment fires the post_save signal.
        Investment.objects.create(
            user=lead, property_investment=prop,
            investment_amount=Decimal('1000.00'), token_amount=10,
            status='completed',
        )

        self.referral.refresh_from_db()
        self.assertTrue(self.referral.is_converted)
        self.assertEqual(self.referral.conversion_amount, Decimal('1000.00'))

        commission = BrokerCommission.objects.filter(
            broker=self.broker, commission_type=CommissionType.REFERRAL,
        ).first()
        self.assertIsNotNone(commission)
        # 1.00% referral rate on $1000 = $10.00
        self.assertEqual(commission.commission_amount, Decimal('10.0000'))
        self.assertEqual(commission.status, CommissionStatus.PENDING)

    def test_conversion_is_idempotent(self):
        """A referred user's later investments don't double-book the commission."""
        lead = User.objects.create_user(email='lead3@test.com', password='x', role='investor')
        attach_referral(lead, 'REFTEST1')
        prop = self._make_property('P2')

        Investment.objects.create(user=lead, property_investment=prop,
                                  investment_amount=Decimal('1000'), token_amount=10, status='completed')
        Investment.objects.create(user=lead, property_investment=prop,
                                  investment_amount=Decimal('2000'), token_amount=20, status='completed')

        self.assertEqual(
            BrokerCommission.objects.filter(
                broker=self.broker, commission_type=CommissionType.REFERRAL,
            ).count(),
            1,
        )

    def test_non_referred_user_books_nothing(self):
        """An investment by a user with no referral books no referral commission."""
        solo = User.objects.create_user(email='solo@test.com', password='x', role='investor')
        prop = self._make_property('P3')
        Investment.objects.create(user=solo, property_investment=prop,
                                  investment_amount=Decimal('500'), token_amount=5, status='completed')
        self.assertEqual(
            BrokerCommission.objects.filter(commission_type=CommissionType.REFERRAL).count(),
            0,
        )
