"""
"Become a partner" (client round 4 follow-up): applying needs an account, each
account sees where its broker / LP application stands, and a rejected
applicant can apply again.
"""

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserRole
from core.factories import make_admin, make_ready_investor
from liquidity_provider.models import LPApplication
from liquidity_provider.test_lp_flow import APPLICATION, pdf

from .models import BrokerApplication
from .onboarding import approve_application, grant_broker_role
from .test_broker_path import FORM

BROKER_MINE = '/api/v1/broker/applications/mine/'
LP_MINE = '/api/v1/liquidity-provider/applications/mine/'


def data(res):
    body = res.json()
    return body.get('data', body)


class PartnerStatusTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_ready_investor()

    def _broker_apply(self):
        return self.client.post('/api/v1/broker/applications/submit/', FORM, format='multipart')

    def _lp_apply(self):
        return self.client.post('/api/v1/liquidity-provider/applications/', {
            **APPLICATION, 'documents': [pdf()], 'document_types': ['certificate_of_incorporation'],
        }, format='multipart')

    def test_applying_needs_an_account(self):
        self.assertEqual(self._broker_apply().status_code, 401)
        self.assertEqual(self._lp_apply().status_code, 401)
        self.assertEqual(self.client.get(BROKER_MINE).status_code, 401)
        self.assertEqual(self.client.get(LP_MINE).status_code, 401)

    def test_status_before_and_after_applying(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(data(self.client.get(BROKER_MINE)), {'has_role': False, 'application': None})
        self.assertEqual(data(self.client.get(LP_MINE)), {'has_role': False, 'application': None})

        self.assertEqual(self._broker_apply().status_code, 201)
        self.assertEqual(self._lp_apply().status_code, 201)
        self.assertEqual(data(self.client.get(BROKER_MINE))['application']['status'], 'pending')
        self.assertEqual(data(self.client.get(LP_MINE))['application']['status'], 'pending')

    def test_open_lp_application_blocks_a_second_one(self):
        self.client.force_authenticate(self.user)
        self._lp_apply()
        res = self._lp_apply()
        self.assertEqual(res.status_code, 400)
        self.assertEqual(LPApplication.objects.count(), 1)

    def test_rejected_broker_sees_the_reason_and_can_apply_again(self):
        self.client.force_authenticate(self.user)
        self._broker_apply()
        BrokerApplication.objects.get().reject(make_admin(), reason='Licence expired')
        app = data(self.client.get(BROKER_MINE))['application']
        self.assertEqual((app['status'], app['rejection_reason']), ('rejected', 'Licence expired'))

        res = self._broker_apply()
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(BrokerApplication.objects.filter(associated_user=self.user).count(), 2)
        self.assertEqual(data(self.client.get(BROKER_MINE))['application']['status'], 'pending')

    def test_approved_broker_has_the_role_and_cannot_apply_again(self):
        self.client.force_authenticate(self.user)
        self._broker_apply()
        approve_application(BrokerApplication.objects.get(), make_admin())
        self.assertTrue(data(self.client.get(BROKER_MINE))['has_role'])
        res = self._broker_apply()
        self.assertEqual((res.status_code, res.json()['code']), (400, 'already_partner'))

    def test_approved_investor_keeps_the_investor_role(self):
        from liquidity_provider.accounts_link import grant_lp_role
        grant_broker_role(self.user)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, UserRole.BROKER)
        self.assertTrue(self.user.has_role(UserRole.INVESTOR))

        other = make_ready_investor()
        grant_lp_role(other)
        other.refresh_from_db()
        self.assertEqual(other.get_available_roles(), [UserRole.INVESTOR, UserRole.LIQUIDITY_PROVIDER])

    def test_broker_role_alone_counts_as_partner(self):
        grant_broker_role(self.user)
        self.client.force_authenticate(self.user)
        self.assertTrue(data(self.client.get(BROKER_MINE))['has_role'])
        self.assertTrue(self.user.has_role(UserRole.BROKER))
