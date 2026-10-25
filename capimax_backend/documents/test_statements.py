"""Client round 3, #16: statement data for the official PDFs."""

from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from core.factories import make_investment, make_payment, make_property, make_ready_investor
from payments.models import WalletBalance


class StatementTests(TestCase):
    def setUp(self):
        self.user = make_ready_investor(wallet_balance=Decimal('0.00'))
        self.prop = make_property(token_price=Decimal('10.00'), total_tokens=1000)
        WalletBalance.credit(self.user, Decimal('500.00'), description='Card deposit')
        WalletBalance.debit(self.user, Decimal('100.00'), description='Shares')
        make_investment(user=self.user, prop=self.prop, token_amount=10,
                        investment_amount=Decimal('100.00'), status='completed', completed_at=timezone.now())
        make_payment(user=self.user, amount=Decimal('500.00'), status='completed')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def _get(self, kind, **params):
        r = self.client.get(f'/api/v1/documents/statements/{kind}/', params)
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()['data']

    def test_wallet_statement_balances(self):
        data = self._get('wallet')
        self.assertEqual(data['summary']['opening_balance'], '0.00')
        self.assertEqual(data['summary']['closing_balance'], '400.00')
        self.assertEqual(data['summary']['total_in'], '500.00')
        self.assertEqual(data['summary']['total_out'], '100.00')
        self.assertEqual(len(data['rows']), 2)
        self.assertEqual(data['holder']['email'], self.user.email)

    def test_period_filter(self):
        tomorrow = (timezone.localdate() + timedelta(days=1)).isoformat()
        data = self._get('wallet', **{'from': tomorrow, 'to': tomorrow})
        self.assertEqual(data['rows'], [])
        self.assertEqual(data['summary']['opening_balance'], '400.00')

    def test_holdings_and_investments(self):
        h = self._get('holdings')
        self.assertEqual(h['summary']['properties'], 1)
        self.assertEqual(h['rows'][0]['shares'], '10')
        self.assertEqual(h['rows'][0]['ownership'], '1.0000')
        inv = self._get('investments')
        self.assertEqual(inv['summary']['invested'], '100.00')

    def test_transactions_and_csv(self):
        t = self._get('transactions')
        self.assertEqual(t['summary']['deposited'], '500.00')
        r = self.client.get('/api/v1/documents/statements/transactions/export/')
        self.assertEqual(r.status_code, 200)
        self.assertIn('text/csv', r['Content-Type'])
        self.assertIn('deposit', r.content.decode('utf-8-sig'))

    def test_unknown_kind_and_auth(self):
        self.assertEqual(self.client.get('/api/v1/documents/statements/nope/').status_code, 404)
        self.assertIn(APIClient().get('/api/v1/documents/statements/wallet/').status_code, (401, 403))
