"""
Tests for Investment.destination_wallet auto-population.

Investments must end up with a coherent on-chain destination regardless of
which code path creates them. The model's save() override is the single
chokepoint: fiat-paid → custodial wallet, crypto-paid → external wallet.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from accounts.models import WalletKind
from investments.models import Investment
from properties.models import Property


User = get_user_model()
SEED = 'a' * 64


def _make_property(owner):
    return Property.objects.create(
        title='Test Property',
        description='x',
        property_type='residential',
        property_category='ready_property',
        total_tokens=1000,
        token_price=Decimal('10.00'),
        total_value=Decimal('10000.00'),
        expected_return=Decimal('5.00'),
        city='SF', country='US',
        owner=owner,
        status='approved',
    )


@override_settings(PLATFORM_CUSTODY_MASTER_SEED=SEED)
class FiatRoutesToCustodialTests(TestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            email='owner@example.com', password='x', country='US',
            role='property_owner',
        )
        self.investor = User.objects.create_user(
            email='investor@example.com', password='x', country='US',
        )
        self.property_obj = _make_property(self.owner)

    def _make_inv(self, payment_method):
        return Investment.objects.create(
            user=self.investor,
            property_investment=self.property_obj,
            token_amount=10,
            investment_amount=Decimal('100.00'),
            payment_method=payment_method,
        )

    def test_stripe_payment_routes_to_custodial(self):
        inv = self._make_inv({'type': 'stripe'})
        self.assertEqual(inv.destination_wallet, self.investor.wallet_address)
        self.assertEqual(self.investor.wallet_kind, WalletKind.CUSTODIAL)

    def test_credit_card_payment_routes_to_custodial(self):
        inv = self._make_inv({'method': 'credit_card'})
        self.assertEqual(inv.destination_wallet, self.investor.wallet_address)

    def test_bank_transfer_routes_to_custodial(self):
        inv = self._make_inv({'type': 'bank_transfer'})
        self.assertEqual(inv.destination_wallet, self.investor.wallet_address)

    def test_wallet_balance_routes_to_custodial(self):
        inv = self._make_inv({'type': 'wallet'})
        self.assertEqual(inv.destination_wallet, self.investor.wallet_address)

    def test_unknown_payment_method_defaults_to_custodial(self):
        """Safety: an unrecognized method falls back to the custodial wallet,
        not to the external one. We never route an unverified address to the
        chain by accident."""
        inv = self._make_inv({})
        self.assertEqual(inv.destination_wallet, self.investor.wallet_address)


@override_settings(PLATFORM_CUSTODY_MASTER_SEED=SEED)
class CryptoRoutesToExternalTests(TestCase):

    EXT = '0xabcdef0000000000000000000000000000000001'

    def setUp(self):
        self.owner = User.objects.create_user(
            email='owner2@example.com', password='x', country='US',
            role='property_owner',
        )
        self.property_obj = _make_property(self.owner)

    def _crypto_investor_with_external(self):
        # Investor connected their wallet during crypto checkout — captured
        # as external_wallet_address on the User.
        u = User.objects.create_user(
            email='crypto1@example.com', password='x', country='US',
        )
        u.external_wallet_address = self.EXT
        u.save(update_fields=['external_wallet_address'])
        return u

    def test_crypto_payment_with_external_wallet_routes_externally(self):
        investor = self._crypto_investor_with_external()
        inv = Investment.objects.create(
            user=investor,
            property_investment=self.property_obj,
            token_amount=5,
            investment_amount=Decimal('50.00'),
            payment_method={'type': 'crypto'},
        )
        self.assertEqual(inv.destination_wallet, self.EXT)

    def test_crypto_payment_without_external_falls_back_to_custodial(self):
        """Edge case: user picked crypto but never linked a wallet.
        We fall back to custodial so the mint still succeeds. The frontend
        should prevent this from happening, but the model is defensive."""
        investor = User.objects.create_user(
            email='crypto2@example.com', password='x', country='US',
        )
        inv = Investment.objects.create(
            user=investor,
            property_investment=self.property_obj,
            token_amount=5,
            investment_amount=Decimal('50.00'),
            payment_method={'type': 'crypto'},
        )
        # Falls back to custodial since no external was linked.
        self.assertEqual(inv.destination_wallet, investor.wallet_address)


@override_settings(PLATFORM_CUSTODY_MASTER_SEED=SEED)
class ExplicitOverrideTests(TestCase):
    """If the caller sets destination_wallet explicitly, we don't touch it."""

    def test_explicit_destination_wallet_is_preserved(self):
        owner = User.objects.create_user(
            email='owner3@example.com', password='x', country='US',
            role='property_owner',
        )
        investor = User.objects.create_user(
            email='inv3@example.com', password='x', country='US',
        )
        prop = _make_property(owner)
        explicit = '0xcafe0000000000000000000000000000000000ff'
        inv = Investment.objects.create(
            user=investor,
            property_investment=prop,
            token_amount=1,
            investment_amount=Decimal('10.00'),
            payment_method={'type': 'stripe'},
            destination_wallet=explicit,
        )
        self.assertEqual(inv.destination_wallet, explicit)


@override_settings(PLATFORM_CUSTODY_MASTER_SEED=SEED)
class ImmutabilityTests(TestCase):
    """destination_wallet is captured once at creation. Later saves don't
    rewrite it just because the user's primary wallet changed."""

    def test_changing_user_wallet_does_not_change_existing_investment(self):
        owner = User.objects.create_user(
            email='owner4@example.com', password='x', country='US',
            role='property_owner',
        )
        investor = User.objects.create_user(
            email='inv4@example.com', password='x', country='US',
        )
        prop = _make_property(owner)
        inv = Investment.objects.create(
            user=investor,
            property_investment=prop,
            token_amount=1,
            investment_amount=Decimal('10.00'),
            payment_method={'type': 'stripe'},
        )
        original_dest = inv.destination_wallet
        # Investor links an external wallet later.
        investor.external_wallet_address = '0x' + 'f' * 40
        investor.save(update_fields=['external_wallet_address'])

        inv.refresh_from_db()
        inv.token_amount = 2
        inv.save()
        inv.refresh_from_db()
        self.assertEqual(inv.destination_wallet, original_dest)
