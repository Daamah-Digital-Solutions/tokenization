"""
Payment-related middleware: idempotency and webhook replay protection.

These middlewares protect the platform from two concrete classes of bug:

1. IdempotencyMiddleware
   Prevents duplicate charges when a client retries a payment-creating POST
   due to a network error. The client sends an `Idempotency-Key` header
   (recommended for any POST that creates or mutates money). The first
   response is cached in Redis for 24 hours; subsequent requests with the
   same key return the cached response instead of creating a duplicate.

2. WebhookReplayProtectionMiddleware
   Stores the IDs of recently-processed webhook events (Stripe `event.id`,
   NOWPayments `ipn_id`) in Redis with a 7-day TTL. A repeat event with a
   known ID is rejected. This stops duplicate webhook deliveries from
   crediting wallets twice and provides a defence in depth on top of
   provider-side idempotency.
"""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Optional

from django.core.cache import cache
from django.http import JsonResponse

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Payment idempotency
# ---------------------------------------------------------------------------

IDEMPOTENCY_CACHE_PREFIX = "idem:"
IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60  # 24 hours
IDEMPOTENCY_MAX_KEY_LENGTH = 128

IDEMPOTENT_PATH_PREFIXES = (
    "/api/v1/payments/",
    "/api/v1/investments/",
    "/api/v1/marketplace/",
)


def _is_idempotent_target(request) -> bool:
    """Should this request be subject to idempotency caching?"""
    if request.method != "POST":
        return False
    path = request.path or ""
    return any(path.startswith(prefix) for prefix in IDEMPOTENT_PATH_PREFIXES)


def _idempotency_cache_key(user_id: str, idem_key: str) -> str:
    """Cache key scoped to the user so two users can't collide."""
    digest = hashlib.sha256(idem_key.encode("utf-8")).hexdigest()
    return f"{IDEMPOTENCY_CACHE_PREFIX}{user_id}:{digest}"


class IdempotencyMiddleware:
    """Cache POST responses keyed by `Idempotency-Key`.

    Notes:
    - Only POST requests to financial paths are affected.
    - Only successful (2xx) responses are cached; clients should retry on 5xx.
    - The cache stores the JSON body and status code; non-JSON responses
      are not cached.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not _is_idempotent_target(request):
            return self.get_response(request)

        idem_key: Optional[str] = request.headers.get("Idempotency-Key")
        if not idem_key:
            return self.get_response(request)

        if len(idem_key) > IDEMPOTENCY_MAX_KEY_LENGTH:
            return JsonResponse(
                {"error": {"code": "invalid_idempotency_key",
                           "message": "Idempotency-Key too long"}},
                status=400,
            )

        user = getattr(request, "user", None)
        if not (user and user.is_authenticated):
            # Anonymous requests don't get idempotency caching — they cannot
            # be safely scoped.
            return self.get_response(request)

        cache_key = _idempotency_cache_key(str(user.pk), idem_key)
        cached = cache.get(cache_key)
        if cached is not None:
            logger.info(
                "Idempotency cache hit",
                extra={"user_id": user.pk, "path": request.path, "key": idem_key},
            )
            return JsonResponse(
                cached["body"],
                status=cached["status"],
                headers={"X-Idempotent-Replay": "true"},
            )

        response = self.get_response(request)

        # Only cache successful JSON responses
        if 200 <= response.status_code < 300:
            content_type = response.get("Content-Type", "")
            if "application/json" in content_type:
                try:
                    body = json.loads(response.content.decode("utf-8") or "null")
                    cache.set(
                        cache_key,
                        {"body": body, "status": response.status_code},
                        timeout=IDEMPOTENCY_TTL_SECONDS,
                    )
                except (json.JSONDecodeError, UnicodeDecodeError):
                    logger.warning(
                        "Idempotent response was not valid JSON; skipping cache",
                        extra={"path": request.path},
                    )

        return response


# ---------------------------------------------------------------------------
# Webhook replay protection
# ---------------------------------------------------------------------------

WEBHOOK_CACHE_PREFIX = "webhook:"
WEBHOOK_TTL_SECONDS = 7 * 24 * 60 * 60  # 7 days


def webhook_event_is_replay(provider: str, event_id: str) -> bool:
    """Return True if this provider+event has already been processed.

    Atomically marks the event as processed if it is new. Callers must
    react accordingly (drop the duplicate, return 200 to the provider).
    """
    if not event_id:
        return False
    key = f"{WEBHOOK_CACHE_PREFIX}{provider}:{event_id}"
    # `cache.add` is atomic: succeeds only if the key is absent.
    is_new = cache.add(key, "1", timeout=WEBHOOK_TTL_SECONDS)
    if not is_new:
        logger.warning(
            "Webhook replay rejected",
            extra={"provider": provider, "event_id": event_id},
        )
    return not is_new


class WebhookTimestampGuard:
    """Helper to reject webhooks whose timestamp is too old or in the future.

    Not a middleware — call from webhook views explicitly because each
    provider exposes the timestamp differently (Stripe via the signature
    header, NOWPayments via the body, etc.).
    """

    DEFAULT_TOLERANCE_SECONDS = 300  # 5 minutes

    @classmethod
    def within_tolerance(cls, ts_epoch: int,
                         tolerance: int = DEFAULT_TOLERANCE_SECONDS) -> bool:
        import time
        delta = abs(time.time() - ts_epoch)
        return delta <= tolerance
