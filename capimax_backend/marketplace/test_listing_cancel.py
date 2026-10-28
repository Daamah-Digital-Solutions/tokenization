"""
Client round 4, #2: a seller cancels their own listing from the market
("My listings"); the market itself only shows listings that can be traded.
"""

from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import UserRole
from core.factories import make_investment, make_property, make_ready_investor
from marketplace.models import MarketListing


class ListingCancelTests(TestCase):
    def setUp(self):
        self.prop = make_property(token_price=Decimal('10.00'), total_tokens=1000)
        self.seller = make_ready_investor()
        make_investment(user=self.seller, prop=self.prop, token_amount=50, investment_amount=Decimal('500.00'),
                        status='completed', completed_at=timezone.now())
        self.listing = MarketListing.objects.create(
            property_listing=self.prop, seller=self.seller, listing_type='sell',
            tokens_offered=30, tokens_remaining=30, price_per_token=Decimal('12.00'),
            minimum_order_size=1, expires_at=timezone.now() + timedelta(days=7))
        self.client = APIClient()

    def _cancel(self, user):
        self.client.force_authenticate(user)
        return self.client.post(f'/api/v1/marketplace/listings/{self.listing.id}/cancel/')

    def test_seller_with_owner_role_can_cancel(self):
        self.seller.role = UserRole.PROPERTY_OWNER
        self.seller.save(update_fields=['role'])
        self.assertEqual(self._cancel(self.seller).status_code, 200)
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.status, 'cancelled')

    def test_someone_else_cannot_cancel(self):
        self.assertIn(self._cancel(make_ready_investor()).status_code, (403, 404))
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.status, 'active')

    def test_market_hides_cancelled_but_my_listings_keeps_it(self):
        self._cancel(self.seller)
        other = make_ready_investor()
        self.client.force_authenticate(other)
        res = self.client.get('/api/v1/marketplace/listings/', {'active_only': 'true'})
        self.assertEqual(res.json()['count'] if 'count' in res.json() else res.json()['data']['count'], 0)
        self.client.force_authenticate(self.seller)
        res = self.client.get('/api/v1/marketplace/listings/', {'my_listings': 'true'}).json()
        rows = res.get('results') or res.get('data', {}).get('results')
        self.assertEqual([r['status'] for r in rows], ['cancelled'])
