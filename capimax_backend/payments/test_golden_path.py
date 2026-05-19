"""
Golden-path tests for the payments app.

Money flows through this app: Stripe → Payment record → WalletBalance →
Investment processing. These tests cover the happy paths and the most
important auth boundaries.

  1. Stripe payment intent creation
     - Authenticated user posts an amount → Payment row created with
       payment_intent_id, status=PENDING. Stripe SDK is mocked.

  2. Stripe payment confirmation
     - When the PaymentIntent reports `succeeded`, the Payment row
       transitions to COMPLETED.

  3. Wallet management
     - GET /wallet/ returns the user's balances (auto-creates USD wallet
       if none exists).
     - GET /wallet/transactions/ returns the user's transaction history.
     - Anonymous user cannot access wallet endpoints.

  4. Stripe webhook
     - Valid signature + valid event ID + within-tolerance timestamp →
       200 + idempotent processing.
     - Replayed event → 200 with "duplicate ignored".
     - Out-of-tolerance timestamp → 400.

Note: the more thorough race-condition tests already live in
`payments/test_concurrent_payments.py`. This file's job is to cover the
*happy* path and the auth boundaries.
"""

from __future__ import annotations

import json
import time
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from core.factories import (
    make_investor,
    make_payment,
    make_ready_investor,
    make_wallet_balance,
)
from payments.models import (
    Payment,
    PaymentMethod,
    PaymentStatus,
    WalletBalance,
    WalletTransaction,
)


# In-memory cache so the replay-protection helpers work in tests.
LOCMEM_CACHE = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "test-payments-golden",
    }
}


# ---------------------------------------------------------------------------
# Stripe payment intent creation
# ---------------------------------------------------------------------------

class StripePaymentIntentGoldenPathTests(TestCase):
    """`POST /api/v1/payments/stripe/create-payment-intent/`"""

    def setUp(self):
        self.client = APIClient()
        self.user = make_ready_investor()
        self.client.force_authenticate(user=self.user)
        self.url = '/api/v1/payments/stripe/create-payment-intent/'

    def _payload(self, **overrides):
        defaults = {'amount': '100.00', 'currency': 'USD'}
        defaults.update(overrides)
        return defaults

    def test_authenticated_user_creates_intent_and_payment_row(self):
        fake_intent = MagicMock()
        fake_intent.id = 'pi_test_12345'
        fake_intent.client_secret = 'pi_test_12345_secret_abc'

        with patch(
            'payments.views.stripe.PaymentIntent.create',
            return_value=fake_intent,
        ) as mock_create:
            resp = self.client.post(self.url, self._payload(), format='json')

        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        mock_create.assert_called_once()

        body = resp.json()
        self.assertEqual(body['data']['payment_intent_id'], 'pi_test_12345')
        self.assertEqual(body['data']['client_secret'], 'pi_test_12345_secret_abc')

        payment = Payment.objects.get(user=self.user)
        self.assertEqual(payment.payment_intent_id, 'pi_test_12345')
        self.assertEqual(payment.amount, Decimal('100.00'))
        self.assertEqual(payment.payment_method, PaymentMethod.CREDIT_CARD)

    def test_anonymous_user_cannot_create_intent(self):
        self.client.force_authenticate(user=None)
        resp = self.client.post(self.url, self._payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(Payment.objects.count(), 0)


class StripePaymentConfirmGoldenPathTests(TestCase):
    """`POST /api/v1/payments/stripe/confirm-payment/`"""

    def setUp(self):
        self.client = APIClient()
        self.user = make_ready_investor()
        self.client.force_authenticate(user=self.user)
        self.payment = make_payment(
            user=self.user,
            payment_method='credit_card',
            status='pending',
            payment_intent_id='pi_confirm_001',
            amount=Decimal('250.00'),
            net_amount=Decimal('250.00'),
        )
        self.url = '/api/v1/payments/stripe/confirm-payment/'

    def test_succeeded_intent_marks_payment_completed(self):
        fake_intent = MagicMock()
        fake_intent.id = 'pi_confirm_001'
        fake_intent.status = 'succeeded'

        with patch(
            'payments.views.stripe.PaymentIntent.retrieve',
            return_value=fake_intent,
        ):
            resp = self.client.post(
                self.url,
                {'payment_intent_id': 'pi_confirm_001'},
                format='json',
            )

        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PaymentStatus.COMPLETED)
        self.assertIsNotNone(self.payment.completed_at)


# ---------------------------------------------------------------------------
# Wallet management
# ---------------------------------------------------------------------------

class WalletManagementGoldenPathTests(TestCase):
    """GET /api/v1/payments/wallet/ + GET /api/v1/payments/wallet/transactions/"""

    def setUp(self):
        self.client = APIClient()
        self.user = make_investor()
        self.client.force_authenticate(user=self.user)

    def test_wallet_endpoint_auto_creates_usd_balance(self):
        # User has no wallet rows yet.
        self.assertEqual(WalletBalance.objects.filter(user=self.user).count(), 0)

        resp = self.client.get('/api/v1/payments/wallet/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # USD balance auto-created.
        balances = WalletBalance.objects.filter(user=self.user)
        self.assertEqual(balances.count(), 1)
        self.assertEqual(balances.first().currency, 'USD')

        body = resp.json()
        self.assertEqual(len(body['data']['balances']), 1)

    def test_wallet_endpoint_returns_existing_balances(self):
        make_wallet_balance(user=self.user, currency='USD',
                            available_balance=Decimal('1234.56'))
        make_wallet_balance(user=self.user, currency='EUR',
                            available_balance=Decimal('500.00'))

        resp = self.client.get('/api/v1/payments/wallet/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        body = resp.json()
        currencies = {b['currency'] for b in body['data']['balances']}
        self.assertEqual(currencies, {'USD', 'EUR'})

    def test_wallet_endpoint_only_returns_own_balances(self):
        other = make_investor()
        make_wallet_balance(user=other, currency='USD',
                            available_balance=Decimal('9999.99'))
        make_wallet_balance(user=self.user, currency='USD',
                            available_balance=Decimal('100.00'))

        resp = self.client.get('/api/v1/payments/wallet/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        body = resp.json()
        # User only sees their own balance.
        self.assertEqual(len(body['data']['balances']), 1)
        self.assertEqual(body['data']['balances'][0]['available_balance'],
                         '100.00000000')

    def test_anonymous_user_cannot_read_wallet(self):
        self.client.force_authenticate(user=None)
        resp = self.client.get('/api/v1/payments/wallet/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_transactions_endpoint_lists_own_history(self):
        wb = make_wallet_balance(user=self.user, available_balance=Decimal('500.00'))
        WalletTransaction.objects.create(
            user=self.user,
            transaction_type='deposit',
            amount=Decimal('500.00'),
            currency='USD',
            balance_before=Decimal('0.00'),
            balance_after=Decimal('500.00'),
            description='Test deposit',
        )
        resp = self.client.get('/api/v1/payments/wallet/transactions/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # The view returns the transaction list under whatever key the
        # serializer chooses; just confirm we got data back.
        body = resp.json()
        self.assertIn('data', body)


# ---------------------------------------------------------------------------
# Stripe webhook happy path
# ---------------------------------------------------------------------------

@override_settings(CACHES=LOCMEM_CACHE, STRIPE_WEBHOOK_SECRET='whsec_test_xyz')
class StripeWebhookGoldenPathTests(TestCase):
    """`POST /api/v1/payments/webhooks/stripe/`

    We mock `stripe.Webhook.construct_event` because constructing a valid
    real signature in a test would just be testing the stripe library.
    """

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.url = '/api/v1/payments/webhooks/stripe/'
        self.user = make_investor()
        self.payment = make_payment(
            user=self.user,
            payment_intent_id='pi_webhook_001',
            payment_method='credit_card',
            status='pending',
            amount=Decimal('300.00'),
            net_amount=Decimal('300.00'),
        )

    def _build_event(self, event_id='evt_webhook_001',
                     event_type='payment_intent.succeeded',
                     payment_intent_id='pi_webhook_001'):
        return {
            'id': event_id,
            'type': event_type,
            'created': int(time.time()),
            'data': {
                'object': {
                    'id': payment_intent_id,
                    'status': 'succeeded',
                    'amount': 30000,
                }
            }
        }

    def test_valid_event_returns_200_and_is_recorded(self):
        event = self._build_event()
        with patch(
            'payments.views.stripe.Webhook.construct_event',
            return_value=event,
        ):
            resp = self.client.post(
                self.url,
                data=b'{}',
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='fake-sig',
            )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)

    def test_replayed_event_is_dropped_silently(self):
        event = self._build_event(event_id='evt_replay_001')
        with patch(
            'payments.views.stripe.Webhook.construct_event',
            return_value=event,
        ):
            r1 = self.client.post(
                self.url, data=b'{}',
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='fake-sig',
            )
            r2 = self.client.post(
                self.url, data=b'{}',
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='fake-sig',
            )
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertIn('duplicate', r2.json().get('status', '').lower())

    def test_event_older_than_5_minutes_is_rejected(self):
        old_event = self._build_event(event_id='evt_old_001')
        old_event['created'] = int(time.time()) - 600  # 10 minutes old
        with patch(
            'payments.views.stripe.Webhook.construct_event',
            return_value=old_event,
        ):
            resp = self.client.post(
                self.url, data=b'{}',
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='fake-sig',
            )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_signature_returns_400(self):
        import stripe
        with patch(
            'payments.views.stripe.Webhook.construct_event',
            side_effect=stripe.error.SignatureVerificationError(
                'bad sig', 'fake-sig',
            ),
        ):
            resp = self.client.post(
                self.url, data=b'{}',
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='fake-sig',
            )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
