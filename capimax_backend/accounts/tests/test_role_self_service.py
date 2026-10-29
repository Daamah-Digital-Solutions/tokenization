"""
Nobody can give themselves admin, broker or LP: those come from staff or an
approved application. Sign-up and "add role" only offer investor / owner.
"""

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User, UserRole


def _signup(client, **extra):
    return client.post('/api/v1/auth/register/', {
        'email': 'new@example.com', 'password': 'Str0ng!Pass99', 'confirm_password': 'Str0ng!Pass99',
        'first_name': 'New', 'last_name': 'User', 'country': 'US', **extra}, format='json')


class RoleSelfServiceTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_signup_cannot_claim_admin_or_partner_roles(self):
        for payload in ({'roles': ['admin']}, {'role': 'admin'}, {'roles': ['investor', 'broker']},
                        {'role': 'liquidity_provider'}):
            res = _signup(self.client, **payload)
            self.assertEqual(res.status_code, 400, payload)
        self.assertFalse(User.objects.filter(email='new@example.com').exists())

    def test_signup_as_owner_still_works(self):
        res = _signup(self.client, roles=['property_owner'])
        self.assertIn(res.status_code, (200, 201), res.content)
        self.assertTrue(User.objects.get(email='new@example.com').has_role(UserRole.PROPERTY_OWNER))

    def test_add_role_only_offers_investor_and_owner(self):
        user = User.objects.create_user(email='inv@example.com', password='x12345678', is_verified=True)
        self.client.force_authenticate(user)
        for role in ('admin', 'broker', 'liquidity_provider'):
            self.assertEqual(self.client.post('/api/v1/auth/roles/add/', {'role': role}).status_code, 403, role)
            self.assertFalse(user.has_role(role))
        self.assertEqual(self.client.post('/api/v1/auth/roles/add/', {'role': 'property_owner'}).status_code, 200)
