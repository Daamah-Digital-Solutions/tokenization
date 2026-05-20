"""
Tests for wallet info + external-wallet link/unlink endpoints.

Verifies:
- GET /auth/wallet/ returns both slots
- Linking requires a valid signature from the address being linked
- A signature from a DIFFERENT wallet is rejected
- A reused / expired nonce is rejected
- Unlink clears only the external slot (custodial address remains)
"""

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase


User = get_user_model()
SEED = 'a' * 64


def _make_signer():
    """Return (address, private_key_hex) for an arbitrary throwaway wallet."""
    from eth_account import Account
    import secrets
    pk = secrets.token_hex(32)
    return Account.from_key(pk).address, pk


def _sign(private_key_hex: str, message: str) -> str:
    from eth_account import Account
    from eth_account.messages import encode_defunct
    signed = Account.sign_message(
        encode_defunct(text=message),
        private_key=private_key_hex,
    )
    return signed.signature.hex()


@override_settings(PLATFORM_CUSTODY_MASTER_SEED=SEED)
class WalletInfoEndpointTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            email='alice@example.com', password='x', country='US',
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_returns_primary_and_external_slots(self):
        resp = self.client.get('/api/v1/auth/wallet/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()['data']
        self.assertEqual(data['primary_wallet'], self.user.wallet_address)
        self.assertEqual(data['primary_kind'], 'custodial')
        self.assertIsNone(data['external_wallet'])
        self.assertFalse(data['has_external'])

    def test_after_linking_reports_external(self):
        ext = '0xDeadBeef00000000000000000000000000000001'
        self.user.external_wallet_address = ext
        self.user.save(update_fields=['external_wallet_address'])
        resp = self.client.get('/api/v1/auth/wallet/')
        data = resp.json()['data']
        self.assertEqual(data['external_wallet'], ext)
        self.assertTrue(data['has_external'])


@override_settings(
    PLATFORM_CUSTODY_MASTER_SEED=SEED,
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'wallet-link-tests',
        }
    },
)
class LinkExternalWalletTests(APITestCase):

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            email='bob@example.com', password='x', country='US',
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.address, self.pk = _make_signer()

    def _request_challenge(self, address):
        return self.client.post(
            '/api/v1/auth/wallet/link-external/',
            data={'address': address},
            format='json',
        )

    def _submit_signature(self, address, signature):
        return self.client.post(
            '/api/v1/auth/wallet/link-external/',
            data={'address': address, 'signature': signature},
            format='json',
        )

    def test_step_1_returns_message_to_sign(self):
        resp = self._request_challenge(self.address)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()['data']
        self.assertEqual(data['step'], 'sign_message')
        self.assertIn(self.address, data['message_to_sign'])
        self.assertIn(self.user.email, data['message_to_sign'])
        self.assertIn(data['nonce'], data['message_to_sign'])

    def test_step_2_with_valid_signature_links(self):
        # Step 1
        challenge = self._request_challenge(self.address).json()['data']
        # Step 2
        sig = _sign(self.pk, challenge['message_to_sign'])
        resp = self._submit_signature(self.address, sig)
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.json())
        self.user.refresh_from_db()
        self.assertEqual(
            self.user.external_wallet_address.lower(), self.address.lower(),
        )

    def test_signature_from_wrong_wallet_is_rejected(self):
        challenge = self._request_challenge(self.address).json()['data']
        other_addr, other_pk = _make_signer()
        sig = _sign(other_pk, challenge['message_to_sign'])
        resp = self._submit_signature(self.address, sig)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertIsNone(self.user.external_wallet_address)

    def test_nonce_is_single_use(self):
        challenge = self._request_challenge(self.address).json()['data']
        sig = _sign(self.pk, challenge['message_to_sign'])
        # Burn the nonce by linking once successfully.
        first = self._submit_signature(self.address, sig)
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        # Second submission with the same signature must fail.
        second = self._submit_signature(self.address, sig)
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_address_rejected(self):
        resp = self.client.post(
            '/api/v1/auth/wallet/link-external/',
            data={'address': 'not-an-address'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_cannot_link(self):
        client = APIClient()
        resp = client.post(
            '/api/v1/auth/wallet/link-external/',
            data={'address': self.address}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


@override_settings(PLATFORM_CUSTODY_MASTER_SEED=SEED)
class UnlinkExternalWalletTests(APITestCase):

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            email='carol@example.com', password='x', country='US',
            external_wallet_address='0xC0FFEE0000000000000000000000000000000001',
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_unlink_clears_external_but_keeps_custodial(self):
        custodial_before = self.user.wallet_address
        resp = self.client.post('/api/v1/auth/wallet/unlink-external/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertIsNone(self.user.external_wallet_address)
        self.assertEqual(self.user.wallet_address, custodial_before)

    def test_unlinking_when_none_linked_is_400(self):
        self.user.external_wallet_address = None
        self.user.save(update_fields=['external_wallet_address'])
        resp = self.client.post('/api/v1/auth/wallet/unlink-external/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
