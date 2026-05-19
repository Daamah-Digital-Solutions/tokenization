"""
Concurrency + replay-protection tests for the payments app.

These exercise the four Phase 1/2 defences that the platform relies on to
stop double-charges and double-credits:

1. IdempotencyMiddleware
   - POST requests carrying an `Idempotency-Key` header on financial paths
     must return the cached body on a retry rather than triggering the
     view a second time.

2. webhook_event_is_replay()
   - The first call with a given (provider, event_id) returns False and
     records the event; subsequent calls return True so the view can
     short-circuit.

3. WebhookTimestampGuard
   - Events whose `created` timestamp falls outside the 5-minute tolerance
     window are rejected.

4. NOWPayments IPN concurrency
   - Two `finished` IPN deliveries for the same payment must result in
     exactly one wallet credit. This is enforced by the SELECT FOR UPDATE
     on Payment plus the early-exit when status is already COMPLETED.

The cache backend is overridden to LocMemCache because the default test
settings use DummyCache (which would make `cache.add()` lie about
atomicity).
"""

from __future__ import annotations

import json
import time
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.http import JsonResponse
from django.test import (
    Client,
    RequestFactory,
    TestCase,
    TransactionTestCase,
    override_settings,
)

from payments.middleware import (
    IdempotencyMiddleware,
    WebhookTimestampGuard,
    webhook_event_is_replay,
)
from payments.models import (
    NOWPaymentsTransaction,
    Payment,
    PaymentMethod,
    PaymentStatus,
    WalletBalance,
    WalletTransaction,
)

User = get_user_model()


# Force a real (in-memory) cache so `cache.add()` is genuinely atomic and
# `cache.get()` actually returns what was set.
LOCMEM_CACHE = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "test-payments-concurrency",
    }
}


def _make_user(email="ipn@example.com"):
    return User.objects.create_user(
        email=email,
        password="TestPass123!",
        first_name="IPN",
        last_name="Tester",
    )


# ---------------------------------------------------------------------------
# IdempotencyMiddleware
# ---------------------------------------------------------------------------

@override_settings(CACHES=LOCMEM_CACHE)
class IdempotencyMiddlewareTests(TestCase):
    """`IdempotencyMiddleware` must cache 2xx JSON responses on financial
    POST paths keyed by (user_id, Idempotency-Key)."""

    def setUp(self):
        cache.clear()
        self.factory = RequestFactory()
        self.user = _make_user(email="idem@example.com")
        # Counter that lets us prove the inner view was invoked once and
        # only once across the duplicated request.
        self.call_count = {"n": 0}

        def view(request):
            self.call_count["n"] += 1
            return JsonResponse(
                {"success": True, "data": {"call": self.call_count["n"]}},
                status=200,
            )

        self.middleware = IdempotencyMiddleware(view)

    def _build_request(self, key="dup-key-123", path="/api/v1/payments/wallet/deposit/"):
        req = self.factory.post(
            path,
            data=json.dumps({"amount": "100.00"}),
            content_type="application/json",
            HTTP_IDEMPOTENCY_KEY=key,
        )
        req.user = self.user
        return req

    def test_first_request_passes_through_and_is_cached(self):
        req = self._build_request()
        resp = self.middleware(req)

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(self.call_count["n"], 1)
        # No replay marker on the first response.
        self.assertNotIn("X-Idempotent-Replay", resp.headers)

    def test_duplicate_request_returns_cached_response(self):
        req1 = self._build_request()
        resp1 = self.middleware(req1)
        body1 = json.loads(resp1.content)

        req2 = self._build_request()  # same Idempotency-Key
        resp2 = self.middleware(req2)
        body2 = json.loads(resp2.content)

        # View runs only on the first request.
        self.assertEqual(self.call_count["n"], 1)
        # Body matches exactly.
        self.assertEqual(body1, body2)
        # The replay must be flagged so clients can distinguish it.
        self.assertEqual(resp2["X-Idempotent-Replay"], "true")
        self.assertEqual(resp2.status_code, 200)

    def test_different_keys_do_not_collide(self):
        self.middleware(self._build_request(key="k-1"))
        self.middleware(self._build_request(key="k-2"))
        self.assertEqual(self.call_count["n"], 2)

    def test_two_users_with_same_key_do_not_collide(self):
        other_user = _make_user(email="other@example.com")

        req_a = self._build_request(key="shared-key")
        self.middleware(req_a)

        req_b = self._build_request(key="shared-key")
        req_b.user = other_user
        self.middleware(req_b)

        # Same Idempotency-Key but different users — both views run.
        self.assertEqual(self.call_count["n"], 2)

    def test_anonymous_request_is_not_cached(self):
        from django.contrib.auth.models import AnonymousUser

        req = self._build_request()
        req.user = AnonymousUser()
        self.middleware(req)
        # A second anonymous request must re-run the view.
        req2 = self._build_request()
        req2.user = AnonymousUser()
        self.middleware(req2)

        self.assertEqual(self.call_count["n"], 2)

    def test_request_without_key_passes_through(self):
        req = self.factory.post(
            "/api/v1/payments/wallet/deposit/",
            data=json.dumps({"amount": "100.00"}),
            content_type="application/json",
        )
        req.user = self.user
        self.middleware(req)
        self.middleware(req)
        # No Idempotency-Key — both calls hit the view.
        self.assertEqual(self.call_count["n"], 2)

    def test_non_financial_path_is_not_cached(self):
        req1 = self.factory.post(
            "/api/v1/auth/login/",  # outside IDEMPOTENT_PATH_PREFIXES
            data=json.dumps({"email": "x@y.com"}),
            content_type="application/json",
            HTTP_IDEMPOTENCY_KEY="k",
        )
        req1.user = self.user
        self.middleware(req1)
        self.middleware(req1)
        self.assertEqual(self.call_count["n"], 2)

    def test_too_long_key_is_rejected_with_400(self):
        long_key = "x" * 200
        req = self._build_request(key=long_key)
        resp = self.middleware(req)
        self.assertEqual(resp.status_code, 400)
        # Never hit the view.
        self.assertEqual(self.call_count["n"], 0)

    def test_non_2xx_response_is_not_cached(self):
        call_count = {"n": 0}

        def failing_view(request):
            call_count["n"] += 1
            return JsonResponse({"error": "boom"}, status=500)

        mw = IdempotencyMiddleware(failing_view)

        req = self._build_request(key="fail-key")
        mw(req)
        mw(req)

        # 5xx must not be cached — the client is expected to retry.
        self.assertEqual(call_count["n"], 2)


# ---------------------------------------------------------------------------
# webhook_event_is_replay
# ---------------------------------------------------------------------------

@override_settings(CACHES=LOCMEM_CACHE)
class WebhookReplayProtectionTests(TestCase):
    """`webhook_event_is_replay` is the single chokepoint that prevents
    duplicate webhook deliveries from being processed twice."""

    def setUp(self):
        cache.clear()

    def test_first_call_returns_false_and_records(self):
        self.assertFalse(webhook_event_is_replay("stripe", "evt_test_001"))

    def test_second_call_with_same_id_returns_true(self):
        webhook_event_is_replay("stripe", "evt_test_002")
        self.assertTrue(webhook_event_is_replay("stripe", "evt_test_002"))

    def test_different_event_ids_dont_collide(self):
        self.assertFalse(webhook_event_is_replay("stripe", "evt_a"))
        self.assertFalse(webhook_event_is_replay("stripe", "evt_b"))

    def test_same_id_different_providers_dont_collide(self):
        self.assertFalse(webhook_event_is_replay("stripe", "id_xyz"))
        # Same id but different provider — must be treated as new.
        self.assertFalse(webhook_event_is_replay("nowpayments", "id_xyz"))

    def test_empty_event_id_is_not_replay(self):
        # Empty IDs cannot be tracked — caller is expected to drop them
        # via signature verification before reaching this guard.
        self.assertFalse(webhook_event_is_replay("stripe", ""))


# ---------------------------------------------------------------------------
# WebhookTimestampGuard
# ---------------------------------------------------------------------------

class WebhookTimestampGuardTests(TestCase):
    """Reject webhooks whose `created` timestamp is older than 5 minutes
    or implausibly in the future — these usually indicate replay attacks
    or skewed server clocks."""

    def test_now_is_within_tolerance(self):
        self.assertTrue(WebhookTimestampGuard.within_tolerance(int(time.time())))

    def test_30s_old_is_within_tolerance(self):
        self.assertTrue(
            WebhookTimestampGuard.within_tolerance(int(time.time()) - 30)
        )

    def test_10_minutes_old_is_rejected(self):
        self.assertFalse(
            WebhookTimestampGuard.within_tolerance(int(time.time()) - 600)
        )

    def test_10_minutes_in_future_is_rejected(self):
        self.assertFalse(
            WebhookTimestampGuard.within_tolerance(int(time.time()) + 600)
        )

    def test_custom_tolerance_window(self):
        # With a 1-second tolerance, anything older than 1 second is out.
        self.assertFalse(
            WebhookTimestampGuard.within_tolerance(
                int(time.time()) - 10, tolerance=1
            )
        )


# ---------------------------------------------------------------------------
# NOWPayments IPN — duplicate-delivery test
# ---------------------------------------------------------------------------

@override_settings(CACHES=LOCMEM_CACHE)
class NOWPaymentsIpnDuplicateDeliveryTests(TransactionTestCase):
    """A `finished` IPN delivered twice for the same payment must credit
    the user's wallet exactly once.

    The defence has two layers:
      a) Replay protection at the cache layer (ipn_id seen → drop).
      b) Even if (a) is bypassed, the SELECT FOR UPDATE on Payment plus
         the `status == COMPLETED` check prevents a second credit.

    We test both: first call goes through and credits, second call is
    rejected by the replay guard. We then clear the replay marker and
    retry to confirm that the DB-level guard *also* protects us.
    """

    def setUp(self):
        cache.clear()
        self.user = _make_user(email="crypto@example.com")
        self.payment = Payment.objects.create(
            user=self.user,
            amount=Decimal("500.00"),
            currency="USD",
            payment_method=PaymentMethod.CRYPTOCURRENCY,
            status=PaymentStatus.PENDING,
            net_amount=Decimal("500.00"),
        )
        self.nowpayments_tx = NOWPaymentsTransaction.objects.create(
            payment=self.payment,
            nowpayments_payment_id="np_test_12345",
            order_id=str(self.payment.id),
            payment_status="waiting",
            pay_address="bc1qtest",
            pay_amount=Decimal("0.01"),
            pay_currency="BTC",
            price_amount=Decimal("500.00"),
            price_currency="USD",
        )
        self.client = Client(enforce_csrf_checks=False)
        self.url = "/api/v1/payments/nowpayments/ipn/"

    def _ipn_body(self, ipn_id="ipn-event-1"):
        return {
            "payment_id": "np_test_12345",
            "payment_status": "finished",
            "order_id": str(self.payment.id),
            "actually_paid": "0.01",
            "outcome_amount": "500.00",
            "outcome_currency": "USD",
            "ipn_id": ipn_id,
            "tx_hash": "0x" + "f" * 64,
        }

    def _post_ipn(self, body):
        return self.client.post(
            self.url,
            data=json.dumps(body),
            content_type="application/json",
            HTTP_X_NOWPAYMENTS_SIG="fake-but-mock-accepted",
        )

    def test_duplicate_ipn_credits_wallet_only_once(self):
        body = self._ipn_body()

        with patch(
            "payments.nowpayments_views.NOWPaymentsService.verify_ipn_signature",
            return_value=True,
        ):
            # First IPN — should credit wallet.
            r1 = self._post_ipn(body)
            self.assertEqual(r1.status_code, 200)

            # Second IPN with the same ipn_id — must be caught by the
            # webhook replay guard and silently acknowledged.
            r2 = self._post_ipn(body)
            self.assertEqual(r2.status_code, 200)

        # Exactly one deposit transaction recorded.
        deposits = WalletTransaction.objects.filter(
            user=self.user, transaction_type="deposit"
        )
        self.assertEqual(
            deposits.count(),
            1,
            "Wallet must not be credited twice for the same IPN",
        )

        # Wallet balance equals exactly the payment's net_amount.
        wallet = WalletBalance.objects.get(user=self.user, currency="USD")
        self.assertEqual(wallet.available_balance, self.payment.net_amount)

        # Payment is COMPLETED.
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PaymentStatus.COMPLETED)

    def test_db_guard_alone_prevents_double_credit(self):
        """If the replay cache is cleared between deliveries (e.g. cache
        flush or different `ipn_id`s), the DB-level guard must still
        prevent a second credit.
        """
        body_a = self._ipn_body(ipn_id="ipn-a")
        body_b = self._ipn_body(ipn_id="ipn-b")  # different replay id

        with patch(
            "payments.nowpayments_views.NOWPaymentsService.verify_ipn_signature",
            return_value=True,
        ):
            r1 = self._post_ipn(body_a)
            self.assertEqual(r1.status_code, 200)
            # Different ipn_id → replay guard would let this through, so
            # we rely entirely on the COMPLETED-status check.
            r2 = self._post_ipn(body_b)
            self.assertEqual(r2.status_code, 200)

        deposits = WalletTransaction.objects.filter(
            user=self.user, transaction_type="deposit"
        )
        self.assertEqual(
            deposits.count(),
            1,
            "DB-level guard (status=COMPLETED) must block second credit",
        )

    def test_invalid_signature_rejected(self):
        with patch(
            "payments.nowpayments_views.NOWPaymentsService.verify_ipn_signature",
            return_value=False,
        ):
            r = self._post_ipn(self._ipn_body())

        self.assertEqual(r.status_code, 403)
        # Nothing was credited.
        self.assertEqual(
            WalletTransaction.objects.filter(user=self.user).count(), 0
        )
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PaymentStatus.PENDING)


# ---------------------------------------------------------------------------
# Stripe webhook timestamp guard — wiring sanity check
# ---------------------------------------------------------------------------

class StripeWebhookTimestampWiringTests(TestCase):
    """Light wiring test: the timestamp guard must be invoked from the
    Stripe webhook view path. We assert the constant we depend on rather
    than POSTing a fully-signed payload, because constructing a valid
    Stripe signature inside a test would just exercise the stripe library.
    """

    def test_tolerance_default_is_five_minutes(self):
        self.assertEqual(
            WebhookTimestampGuard.DEFAULT_TOLERANCE_SECONDS, 300
        )

    def test_stripe_view_imports_replay_guards(self):
        # Importing the module must not error. The view body calls
        # `webhook_event_is_replay('stripe', ...)` and
        # `WebhookTimestampGuard.within_tolerance(...)`.
        from payments import views as payment_views

        src = payment_views.__file__
        with open(src, "r", encoding="utf-8") as f:
            contents = f.read()

        # If these strings disappear, the protection has been removed.
        self.assertIn("webhook_event_is_replay('stripe'", contents)
        self.assertIn("WebhookTimestampGuard.within_tolerance", contents)
