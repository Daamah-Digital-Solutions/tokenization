"""
Tests for the hybrid custodial wallet system.

What we care about:
1. Derivation is deterministic — the same user_id + master_seed always yields
   the same address, so a custody key is never "lost" if the DB drops the
   address column.
2. Different users yield different addresses (uncorrelated).
3. The signal auto-assigns a custodial wallet at user creation when the
   master seed is configured.
4. The signal degrades gracefully (no exception) when the master seed is
   missing.
5. The ``User.objects.lookup_by_wallet`` manager method matches either the
   primary or the external wallet.
"""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from accounts.custody import (
    CustodyConfigurationError,
    derive_custodial_wallet,
    is_custody_configured,
    sign_transaction,
)
from accounts.models import WalletKind


User = get_user_model()


SEED_A = 'a' * 64  # 32 bytes of 0xAA
SEED_B = 'b' * 64  # 32 bytes of 0xBB


@override_settings(PLATFORM_CUSTODY_MASTER_SEED=SEED_A)
class DerivationTests(TestCase):
    """The derivation primitive itself — pure function, no DB."""

    def test_derivation_is_deterministic(self):
        a = derive_custodial_wallet('user-1')
        b = derive_custodial_wallet('user-1')
        self.assertEqual(a.address, b.address)
        self.assertEqual(a.private_key_hex, b.private_key_hex)

    def test_different_users_get_different_addresses(self):
        a = derive_custodial_wallet('user-1')
        b = derive_custodial_wallet('user-2')
        self.assertNotEqual(a.address, b.address)
        self.assertNotEqual(a.private_key_hex, b.private_key_hex)

    def test_changing_seed_changes_addresses(self):
        a = derive_custodial_wallet('user-1')
        with override_settings(PLATFORM_CUSTODY_MASTER_SEED=SEED_B):
            b = derive_custodial_wallet('user-1')
        self.assertNotEqual(a.address, b.address)

    def test_address_is_checksummed_ethereum_format(self):
        derived = derive_custodial_wallet('user-1')
        self.assertTrue(derived.address.startswith('0x'))
        self.assertEqual(len(derived.address), 42)
        # Checksum check: at least one upper and one lower in the hex part
        # (statistically certain for a randomly-derived address).
        hex_part = derived.address[2:]
        self.assertTrue(any(c.isupper() for c in hex_part))

    def test_signing_a_tx_uses_the_user_key(self):
        derived = derive_custodial_wallet('user-42')
        tx = {
            'to': '0x0000000000000000000000000000000000000001',
            'value': 0,
            'gas': 21000,
            'gasPrice': 1_000_000_000,
            'nonce': 0,
            'chainId': 97,
        }
        signed = sign_transaction('user-42', tx)
        # eth_account.Account.recover_transaction returns the sender of the
        # signed transaction — must match the derived address.
        from eth_account import Account
        recovered = Account.recover_transaction(signed.raw_transaction)
        self.assertEqual(recovered.lower(), derived.address.lower())


class ConfigurationGuardTests(TestCase):
    """Misconfiguration must fail loudly, not silently produce zeros."""

    @override_settings(PLATFORM_CUSTODY_MASTER_SEED='')
    def test_missing_seed_raises(self):
        with self.assertRaises(CustodyConfigurationError):
            derive_custodial_wallet('user-1')

    @override_settings(PLATFORM_CUSTODY_MASTER_SEED='ab')
    def test_short_seed_raises(self):
        with self.assertRaises(CustodyConfigurationError):
            derive_custodial_wallet('user-1')

    @override_settings(PLATFORM_CUSTODY_MASTER_SEED='nothex' * 12)
    def test_non_hex_seed_raises(self):
        with self.assertRaises(CustodyConfigurationError):
            derive_custodial_wallet('user-1')

    @override_settings(PLATFORM_CUSTODY_MASTER_SEED=SEED_A)
    def test_is_custody_configured_true(self):
        self.assertTrue(is_custody_configured())

    @override_settings(PLATFORM_CUSTODY_MASTER_SEED='')
    def test_is_custody_configured_false(self):
        self.assertFalse(is_custody_configured())


@override_settings(PLATFORM_CUSTODY_MASTER_SEED=SEED_A)
class AutoAssignmentSignalTests(TestCase):
    """post_save signal must populate wallet_address for new users."""

    def test_new_user_gets_custodial_wallet_assigned(self):
        u = User.objects.create_user(
            email='fiat@example.com', password='x', country='US',
        )
        u.refresh_from_db()
        self.assertTrue(u.wallet_address)
        self.assertTrue(u.wallet_address.startswith('0x'))
        self.assertEqual(u.wallet_kind, WalletKind.CUSTODIAL)

    def test_assigned_address_matches_derivation(self):
        u = User.objects.create_user(
            email='match@example.com', password='x', country='US',
        )
        u.refresh_from_db()
        expected = derive_custodial_wallet(u.pk).address
        self.assertEqual(u.wallet_address, expected)

    def test_user_with_explicit_external_wallet_not_overwritten(self):
        # Crypto-native signup: caller passes wallet_kind=EXTERNAL.
        u = User.objects.create_user(
            email='crypto@example.com', password='x', country='US',
            wallet_kind=WalletKind.EXTERNAL,
            external_wallet_address='0x1234567890123456789012345678901234567890',
        )
        u.refresh_from_db()
        self.assertEqual(u.wallet_kind, WalletKind.EXTERNAL)
        # We don't auto-assign a custodial address for explicit externals.
        self.assertFalse(u.wallet_address)


class SignalDegradesWithoutSeedTests(TestCase):
    """When the seed is missing, signup must still work; mint will fail later."""

    @override_settings(PLATFORM_CUSTODY_MASTER_SEED='')
    def test_signup_succeeds_without_master_seed(self):
        u = User.objects.create_user(
            email='no-seed@example.com', password='x', country='US',
        )
        u.refresh_from_db()
        self.assertIsNone(u.wallet_address)


@override_settings(PLATFORM_CUSTODY_MASTER_SEED=SEED_A)
class LookupByWalletTests(TestCase):
    """Reverse lookup from on-chain address → User."""

    def setUp(self):
        self.alice = User.objects.create_user(
            email='alice@example.com', password='x', country='US',
        )
        self.bob = User.objects.create_user(
            email='bob@example.com', password='x', country='US',
        )
        self.bob.external_wallet_address = '0xDEADBEEF00000000000000000000000000000001'
        self.bob.save(update_fields=['external_wallet_address'])

    def test_lookup_by_primary_wallet_finds_user(self):
        alice = User.objects.lookup_by_wallet(self.alice.wallet_address)
        self.assertEqual(alice, self.alice)

    def test_lookup_by_external_wallet_finds_user(self):
        bob = User.objects.lookup_by_wallet(
            '0xDEADBEEF00000000000000000000000000000001',
        )
        self.assertEqual(bob, self.bob)

    def test_lookup_is_case_insensitive(self):
        bob = User.objects.lookup_by_wallet(
            '0xdeadbeef00000000000000000000000000000001',
        )
        self.assertEqual(bob, self.bob)

    def test_lookup_unknown_address_returns_none(self):
        ghost = User.objects.lookup_by_wallet(
            '0x0000000000000000000000000000000000000000',
        )
        self.assertIsNone(ghost)

    def test_lookup_empty_returns_none(self):
        self.assertIsNone(User.objects.lookup_by_wallet(''))
        self.assertIsNone(User.objects.lookup_by_wallet(None))
