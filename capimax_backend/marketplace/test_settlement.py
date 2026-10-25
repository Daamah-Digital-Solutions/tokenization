"""
Client round 3, #14/#21: a secondary-market purchase really settles — the
buyer pays from the wallet, the seller is paid, and the shares move.
"""

from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from core.factories import make_investment, make_property, make_ready_investor
from investments.models import Investment
from marketplace.models import MarketListing, TradeTransaction
from payments.models import WalletBalance


def balance(user):
    return WalletBalance.objects.get(user=user, currency='USD').available_balance


class SecondaryMarketSettlementTests(TestCase):
    def setUp(self):
        self.prop = make_property(token_price=Decimal('10.00'), total_tokens=1000)
        self.seller = make_ready_investor(wallet_balance=Decimal('0.00'))
        self.buyer = make_ready_investor(wallet_balance=Decimal('1000.00'))
        self.holding = make_investment(user=self.seller, prop=self.prop, token_amount=50,
                                       investment_amount=Decimal('500.00'), status='completed',
                                       completed_at=timezone.now())
        self.listing = MarketListing.objects.create(
            property_listing=self.prop, seller=self.seller, listing_type='sell',
            tokens_offered=30, tokens_remaining=30, price_per_token=Decimal('12.00'),
            minimum_order_size=1, expires_at=timezone.now() + timedelta(days=7),
        )
        self.client = APIClient()
        self.client.force_authenticate(self.buyer)

    def _buy(self, tokens):
        return self.client.post('/api/v1/marketplace/orders/', {
            'listing': str(self.listing.id), 'order_type': 'market', 'tokens_requested': tokens,
            'price_per_token': '12.00', 'total_amount': f'{tokens * 12:.2f}',
        }, format='json')

    def test_purchase_moves_money_and_shares(self):
        r = self._buy(10)
        self.assertIn(r.status_code, (200, 201), r.content)

        trade = TradeTransaction.objects.get()
        self.assertEqual(trade.status, 'completed')
        # $120 + half of the 2.5% fee (1.25% = $1.50)
        self.assertEqual(balance(self.buyer), Decimal('1000.00') - Decimal('121.50'))
        self.assertEqual(balance(self.seller), Decimal('118.50'))

        self.holding.refresh_from_db()
        self.assertEqual(self.holding.token_amount, 40)
        self.assertEqual(self.holding.investment_amount, Decimal('400.00'))
        bought = Investment.objects.get(user=self.buyer, property_investment=self.prop)
        self.assertEqual((bought.token_amount, bought.status), (10, 'completed'))
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.tokens_remaining, 20)

    def test_insufficient_balance_rejects_order_and_changes_nothing(self):
        WalletBalance.objects.filter(user=self.buyer).update(available_balance=Decimal('50.00'))
        r = self._buy(10)
        self.assertEqual(r.status_code, 400, r.content)
        self.assertTrue(r.json()['error']['message'].startswith('Insufficient wallet balance'), r.content)
        self.assertFalse(TradeTransaction.objects.exists())
        self.assertEqual(balance(self.buyer), Decimal('50.00'))
        self.holding.refresh_from_db()
        self.assertEqual(self.holding.token_amount, 50)

    def test_selling_everything_marks_holding_transferred(self):
        self.listing.tokens_offered = self.listing.tokens_remaining = 50
        self.listing.save()
        r = self._buy(50)
        self.assertIn(r.status_code, (200, 201), r.content)
        self.holding.refresh_from_db()
        self.assertEqual((self.holding.token_amount, self.holding.status), (50, 'transferred'))
