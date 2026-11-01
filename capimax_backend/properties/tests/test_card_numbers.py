"""The property cards (list API) show the same sold shares and owners as the property page."""

from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from core.factories import make_investment
from payments.models import WalletBalance
from properties.tests.test_payment_plan import make_property


class CardNumbersTests(TestCase):
    def setUp(self):
        owner = User.objects.create_user(email='own-card@example.com', password='x12345678',
                                         role=UserRole.PROPERTY_OWNER)
        self.prop = make_property(owner, property_category='ready_property', installment_count=12,
                                  installment_frequency='monthly', total_tokens=1000000, tokens_sold=5)
        self.client = APIClient()

    def _card(self):
        res = self.client.get('/api/v1/properties/')
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()
        data = data.get('data', data)
        rows = data.get('results', data) if isinstance(data, dict) else data
        return next(r for r in rows if r['id'] == str(self.prop.id))

    def test_card_has_the_owners_and_shares(self):
        buyer = User.objects.create_user(email='buy-card@example.com', password='x12345678', role=UserRole.INVESTOR)
        make_investment(user=buyer, prop=self.prop, token_amount=5, status='completed')
        card = self._card()
        self.assertEqual((card['investor_count'], card['shares_taken']), (1, 5))

    def test_a_running_installment_plan_counts_on_the_card(self):
        planner = User.objects.create_user(email='plan-card@example.com', password='x12345678',
                                           role=UserRole.INVESTOR)
        WalletBalance.objects.create(user=planner, currency='USD', available_balance=Decimal('500.00'))
        self.client.force_authenticate(planner)
        res = self.client.post('/api/v1/properties/installments/',
                               {'property_investment': str(self.prop.id), 'token_allocation': 12}, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        card = self._card()
        self.assertEqual((card['investor_count'], card['shares_taken']), (1, 5 + 12))
