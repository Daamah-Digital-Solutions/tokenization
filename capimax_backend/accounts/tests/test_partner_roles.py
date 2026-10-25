"""
Client round 3, #8 / #9: broker and liquidity-provider accounts used to land
on the investor dashboard. They now carry their own role.
"""

from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User, UserRole, UserRoleAssignment
from broker.models import BrokerApplication, BrokerProfile


def _lp_application(email, reg='REG-1'):
    from liquidity_provider.models import LPApplication
    return LPApplication.objects.create(
        legal_entity_name=f'LP {reg}', country='US', jurisdiction='DE', entity_type='company',
        registration_number=reg, contact_person_name='Lina', contact_position='Director',
        official_email=email, phone_number='+1 205 350 8771',
        approximate_liquidity_available=Decimal('1000000'), preferred_currencies=['USD'],
        average_transaction_size=Decimal('10000'), expected_discount_rate=Decimal('5'),
        max_per_transaction=Decimal('50000'), max_per_month=Decimal('200000'),
        ack_independent_provider=True, ack_no_exit_guarantee=True, ack_compliance_agreement=True,
    )


class LiquidityProviderRoleTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(email='admin-lp@example.com', password='x12345678',
                                              role=UserRole.ADMIN)

    def test_approving_application_links_existing_account(self):
        user = User.objects.create_user(email='Fund@Example.com', password='x12345678')
        lp = _lp_application('fund@example.com').approve(self.admin)
        user.refresh_from_db()
        self.assertEqual(lp.user_id, user.pk)
        self.assertEqual(user.role, UserRole.LIQUIDITY_PROVIDER)
        self.assertEqual(lp.status, 'active')
        self.assertTrue(UserRoleAssignment.objects.filter(
            user=user, role=UserRole.LIQUIDITY_PROVIDER, is_primary=True).exists())

    def test_account_registered_after_approval_is_linked(self):
        lp = _lp_application('later@example.com', reg='REG-2').approve(self.admin)
        self.assertIsNone(lp.user_id)
        user = User.objects.create_user(email='later@example.com', password='x12345678')
        lp.refresh_from_db()
        user.refresh_from_db()
        self.assertEqual(lp.user_id, user.pk)
        self.assertEqual(user.role, UserRole.LIQUIDITY_PROVIDER)

    def test_profile_exposes_lp_flag_and_lp_cannot_edit_another_lp(self):
        a = User.objects.create_user(email='a@example.com', password='x12345678')
        b = User.objects.create_user(email='b@example.com', password='x12345678')
        lp_a = _lp_application('a@example.com', reg='A').approve(self.admin)
        lp_b = _lp_application('b@example.com', reg='B').approve(self.admin)
        a.refresh_from_db()
        client = APIClient()
        client.force_authenticate(a)
        profile = client.get('/api/v1/auth/profile/').data
        data = profile.get('data', profile)
        self.assertTrue(data['is_liquidity_provider'])
        self.assertEqual(data['role'], UserRole.LIQUIDITY_PROVIDER)
        own = client.patch(f'/api/v1/liquidity-provider/providers/{lp_a.pk}/',
                           {'discount_rate': '6.00'}, format='json')
        self.assertEqual(own.status_code, 200, own.content)
        other = client.patch(f'/api/v1/liquidity-provider/providers/{lp_b.pk}/',
                             {'discount_rate': '1.00'}, format='json')
        self.assertEqual(other.status_code, 403)


class BrokerApprovalTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(email='admin-br@example.com', password='x12345678',
                                              role=UserRole.ADMIN)

    def _application(self, email):
        return BrokerApplication.objects.create(
            first_name='Bob', last_name='Broker', email=email, phone_number='+201000000000',
            country='EG', city_address='Cairo', experience_level='2-5',
            referral_strategy='Network', terms_accepted=True,
        )

    def test_approval_converts_existing_investor_account(self):
        from broker.onboarding import approve_application
        user = User.objects.create_user(email='existing@example.com', password='x12345678')
        app = self._application('Existing@example.com')
        approved_user, profile, temp_password = approve_application(app, self.admin)
        user.refresh_from_db()
        self.assertEqual(approved_user.pk, user.pk)
        self.assertIsNone(temp_password)
        self.assertEqual(user.role, UserRole.BROKER)
        self.assertTrue(BrokerProfile.objects.filter(user=user).exists())

    def test_broker_dashboard_payload_is_complete(self):
        from broker.onboarding import approve_application
        user = User.objects.create_user(email='dash@example.com', password='x12345678', is_verified=True)
        approve_application(self._application('dash@example.com'), self.admin)
        user.refresh_from_db()
        client = APIClient()
        client.force_authenticate(user)
        data = client.get('/api/v1/broker/dashboard/').data
        for key in ('profile', 'total_earned', 'pending_commission', 'total_referrals',
                    'recent_commissions', 'recent_referrals', 'monthly_performance'):
            self.assertIn(key, data)
        self.assertEqual(len(data['monthly_performance']), 6)
