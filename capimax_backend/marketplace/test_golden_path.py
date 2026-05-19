"""
Golden-path tests for the marketplace (secondary market) app.

Covers the most important flows:

  1. Create a SELL listing as a verified seller who has a COMPLETED
     investment in the property, with the lockup period elapsed → 201.

  2. Securities-law compliance gate rejects:
     - Sellers with no completed investment in the property.
     - Sellers whose tokens are still in lockup.

  3. Auth boundaries:
     - Anonymous user → 401.
     - Unverified user → 403 (via MarketplacePermissions.is_verified gate).

  4. Browse listings (GET /api/v1/marketplace/listings/) returns the
     active marketplace.

  5. A seller can cancel their own ACTIVE listing.
     Another user cannot cancel someone else's listing.
"""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from core.factories import (
    make_investor,
    make_property,
    make_ready_investor,
)
from investments.models import Investment, InvestmentStatus
from marketplace.models import ListingStatus, ListingType, MarketListing


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_completed_investment(*, user, prop, tokens=100, lockup_offset_days=-30):
    """Investor's COMPLETED investment in `prop` with lockup expired
    `lockup_offset_days` ago (negative = past, positive = future)."""
    return Investment.objects.create(
        user=user,
        property_investment=prop,
        token_amount=tokens,
        investment_amount=Decimal(tokens * 10),
        status=InvestmentStatus.COMPLETED,
        completed_at=timezone.now() - timedelta(days=60),
        lockup_end_date=timezone.now() + timedelta(days=lockup_offset_days),
        transaction_hash='0x' + 'a' * 64,
    )


def _listing_payload(prop, *, listing_type='sell', tokens=50,
                     price_per_token='10.00', expires_in_days=14):
    return {
        'property_listing': str(prop.id),
        'listing_type': listing_type,
        'tokens_offered': tokens,
        'price_per_token': price_per_token,
        'minimum_order_size': 1,
        'expires_at': (timezone.now() + timedelta(days=expires_in_days)).isoformat(),
    }


# ---------------------------------------------------------------------------
# Sell listing — happy path
# ---------------------------------------------------------------------------

class MarketListingSellHappyPathTests(TestCase):
    """A verified, KYC-clean seller with a completed investment and
    elapsed lockup must be able to list their tokens."""

    def setUp(self):
        self.client = APIClient()
        self.seller = make_ready_investor()
        self.client.force_authenticate(user=self.seller)
        self.property = make_property(
            token_price=Decimal('10.00'),
            total_tokens=10_000,
            status='tokenized',
            lockup_months=0,
        )
        _make_completed_investment(
            user=self.seller, prop=self.property, tokens=200,
            lockup_offset_days=-30,  # lockup ended 30 days ago
        )
        self.url = '/api/v1/marketplace/listings/'

    def test_eligible_seller_creates_sell_listing(self):
        resp = self.client.post(
            self.url, _listing_payload(self.property, tokens=50), format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)

        listing = MarketListing.objects.get(seller=self.seller)
        self.assertEqual(listing.listing_type, ListingType.SELL)
        self.assertEqual(listing.tokens_offered, 50)
        self.assertEqual(listing.status, ListingStatus.ACTIVE)
        self.assertEqual(listing.property_listing_id, self.property.id)


# ---------------------------------------------------------------------------
# Sell listing — compliance gate
# ---------------------------------------------------------------------------

class MarketListingComplianceGateTests(TestCase):
    """Securities-law gate on `_validate_sell_listing_compliance`."""

    def setUp(self):
        self.client = APIClient()
        self.url = '/api/v1/marketplace/listings/'

    def test_seller_without_completed_investment_is_rejected(self):
        seller = make_ready_investor()
        self.client.force_authenticate(user=seller)
        prop = make_property(status='tokenized')
        # No Investment row for this seller in this property.

        resp = self.client.post(
            self.url, _listing_payload(prop), format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(MarketListing.objects.count(), 0)
        # Helpful error mentions the missing investment.
        self.assertIn(
            'completed investment',
            resp.content.decode().lower(),
        )

    def test_seller_with_active_lockup_is_rejected(self):
        seller = make_ready_investor()
        self.client.force_authenticate(user=seller)
        prop = make_property(status='tokenized', lockup_months=12)
        # Investment is completed, but lockup ends in 90 days.
        _make_completed_investment(
            user=seller, prop=prop, lockup_offset_days=90,
        )

        resp = self.client.post(
            self.url, _listing_payload(prop), format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(MarketListing.objects.count(), 0)


# ---------------------------------------------------------------------------
# Auth boundaries
# ---------------------------------------------------------------------------

class MarketplaceAuthTests(TestCase):
    """Anonymous + unverified users cannot list."""

    def setUp(self):
        self.client = APIClient()
        self.property = make_property(status='tokenized')
        self.url = '/api/v1/marketplace/listings/'

    def test_anonymous_user_cannot_create_listing(self):
        resp = self.client.post(
            self.url, _listing_payload(self.property), format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(MarketListing.objects.count(), 0)

    def test_unverified_user_cannot_create_listing(self):
        unverified = make_investor(is_verified=False)
        self.client.force_authenticate(user=unverified)

        resp = self.client.post(
            self.url, _listing_payload(self.property), format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# Listings read access
# ---------------------------------------------------------------------------

class MarketplaceListingsReadTests(TestCase):
    """Anyone verified can browse the marketplace."""

    def setUp(self):
        self.client = APIClient()
        seller = make_ready_investor()
        self.property = make_property(status='tokenized', lockup_months=0)
        _make_completed_investment(
            user=seller, prop=self.property, lockup_offset_days=-30,
        )
        # Create a listing directly to avoid the compliance gate detour.
        self.listing = MarketListing.objects.create(
            seller=seller,
            property_listing=self.property,
            listing_type=ListingType.SELL,
            tokens_offered=50,
            tokens_remaining=50,
            price_per_token=Decimal('10.00'),
            total_price=Decimal('500.00'),
            expires_at=timezone.now() + timedelta(days=14),
        )

    def test_verified_user_can_list_marketplace(self):
        viewer = make_ready_investor()
        self.client.force_authenticate(user=viewer)

        resp = self.client.get('/api/v1/marketplace/listings/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)

    def test_verified_user_can_retrieve_single_listing(self):
        viewer = make_ready_investor()
        self.client.force_authenticate(user=viewer)

        resp = self.client.get(f'/api/v1/marketplace/listings/{self.listing.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)


# ---------------------------------------------------------------------------
# Cancel listing
# ---------------------------------------------------------------------------

class MarketplaceCancelListingTests(TestCase):
    """Sellers can cancel their own active listings; others cannot."""

    def setUp(self):
        self.client = APIClient()
        self.seller = make_ready_investor()
        self.property = make_property(status='tokenized', lockup_months=0)
        _make_completed_investment(
            user=self.seller, prop=self.property, lockup_offset_days=-30,
        )
        self.listing = MarketListing.objects.create(
            seller=self.seller,
            property_listing=self.property,
            listing_type=ListingType.SELL,
            tokens_offered=50,
            tokens_remaining=50,
            price_per_token=Decimal('10.00'),
            total_price=Decimal('500.00'),
            expires_at=timezone.now() + timedelta(days=14),
        )

    def _cancel_url(self):
        return f'/api/v1/marketplace/listings/{self.listing.id}/cancel/'

    def test_seller_can_cancel_own_listing(self):
        self.client.force_authenticate(user=self.seller)
        resp = self.client.post(self._cancel_url(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)

        self.listing.refresh_from_db()
        self.assertEqual(self.listing.status, ListingStatus.CANCELLED)

    def test_other_user_cannot_cancel_listing(self):
        other = make_ready_investor()
        self.client.force_authenticate(user=other)

        resp = self.client.post(self._cancel_url(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        self.listing.refresh_from_db()
        self.assertEqual(self.listing.status, ListingStatus.ACTIVE)
