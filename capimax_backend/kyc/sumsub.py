"""
Sumsub integration (hosted KYC: document capture + selfie/liveness).

Dormant until SUMSUB_APP_TOKEN and SUMSUB_SECRET_KEY are configured. When
enabled, the KYC page launches the Sumsub WebSDK instead of the in-house
upload wizard, and Sumsub's webhook drives the KYCProfile status:

    applicantPending              → IN_REVIEW
    applicantReviewed GREEN       → APPROVED
    applicantReviewed RED + RETRY → PENDING (user asked to fix and resubmit)
    applicantReviewed RED + FINAL → REJECTED

API reference: https://docs.sumsub.com/reference/authentication
Webhooks:      https://docs.sumsub.com/docs/user-verification-webhooks
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time
from typing import Optional
from urllib.parse import urlencode

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# One Sumsub account can serve several Capimax platforms, so applicant ids
# carry a platform prefix to keep them from colliding.
EXTERNAL_ID_PREFIX = 'capimax-rt-'

_DIGEST_ALGORITHMS = {
    'HMAC_SHA1_HEX': hashlib.sha1,
    'HMAC_SHA256_HEX': hashlib.sha256,
    'HMAC_SHA512_HEX': hashlib.sha512,
}


class SumsubError(Exception):
    """Raised when the Sumsub API rejects a request."""


def sumsub_enabled() -> bool:
    return bool(getattr(settings, 'SUMSUB_APP_TOKEN', '')
                and getattr(settings, 'SUMSUB_SECRET_KEY', ''))


def external_user_id(user) -> str:
    return f'{EXTERNAL_ID_PREFIX}{user.pk}'


def user_pk_from_external_id(external_id: str) -> Optional[str]:
    if external_id and external_id.startswith(EXTERNAL_ID_PREFIX):
        return external_id[len(EXTERNAL_ID_PREFIX):]
    return None


def _signed_request(method: str, path_with_query: str, body: bytes = b'') -> dict:
    """Call the Sumsub API with the X-App-Access-* HMAC signature."""
    ts = str(int(time.time()))
    to_sign = ts.encode() + method.upper().encode() + path_with_query.encode() + body
    signature = hmac.new(
        settings.SUMSUB_SECRET_KEY.encode(), to_sign, hashlib.sha256
    ).hexdigest()
    headers = {
        'X-App-Token': settings.SUMSUB_APP_TOKEN,
        'X-App-Access-Ts': ts,
        'X-App-Access-Sig': signature,
        'Accept': 'application/json',
    }
    if body:
        headers['Content-Type'] = 'application/json'
    url = settings.SUMSUB_BASE_URL.rstrip('/') + path_with_query
    response = requests.request(method, url, data=body or None, headers=headers, timeout=20)
    if response.status_code >= 400:
        logger.error('Sumsub %s %s failed: %s %s', method, path_with_query,
                     response.status_code, response.text[:500])
        raise SumsubError(f'Sumsub API error {response.status_code}')
    return response.json()


def create_access_token(user, ttl_seconds: int = 1800) -> str:
    """
    WebSDK access token for this user. Sumsub creates the applicant on first
    use of a token for a new external user id.
    """
    query = urlencode({
        'userId': external_user_id(user),
        'levelName': settings.SUMSUB_LEVEL_NAME,
        'ttlInSecs': ttl_seconds,
    })
    data = _signed_request('POST', f'/resources/accessTokens?{query}')
    token = data.get('token')
    if not token:
        raise SumsubError('Sumsub returned no access token')
    return token


def verify_webhook_signature(raw_body: bytes, digest: str, algorithm: str) -> bool:
    secret = getattr(settings, 'SUMSUB_WEBHOOK_SECRET', '')
    if not secret or not digest:
        return False
    hash_fn = _DIGEST_ALGORITHMS.get((algorithm or 'HMAC_SHA256_HEX').upper())
    if hash_fn is None:
        return False
    expected = hmac.new(secret.encode(), raw_body, hash_fn).hexdigest()
    return hmac.compare_digest(expected, digest.lower())


def _review_reason(review_result: dict) -> str:
    """Human-readable reason from a RED review."""
    parts = []
    comment = review_result.get('moderationComment') or review_result.get('clientComment')
    if comment:
        parts.append(comment.strip())
    labels = review_result.get('rejectLabels') or []
    if labels:
        parts.append('(' + ', '.join(str(l).replace('_', ' ').lower() for l in labels) + ')')
    return ' '.join(parts) or 'The verification provider could not verify your documents.'


def process_webhook(payload: dict) -> str:
    """
    Apply a Sumsub webhook to the matching KYCProfile. Returns a short
    outcome string for logging / the HTTP response.
    """
    from .models import KYCAuditLog, KYCProfile, KYCStatus

    pk = user_pk_from_external_id(payload.get('externalUserId', ''))
    if not pk:
        return 'ignored: not a Capimax RT applicant'
    profile = KYCProfile.objects.select_related('user').filter(user__pk=pk).first()
    if profile is None:
        return 'ignored: unknown user'

    event = payload.get('type', '')
    profile.verification_provider = 'sumsub'
    profile.provider_applicant_id = payload.get('applicantId', '') or profile.provider_applicant_id
    profile.provider_payload = payload
    profile.save(update_fields=['verification_provider', 'provider_applicant_id',
                                'provider_payload', 'updated_at'])

    outcome = f'noop: {event}'
    if event == 'applicantPending':
        if profile.status not in (KYCStatus.IN_REVIEW, KYCStatus.APPROVED):
            profile.submit_for_review()
            outcome = 'in_review'
    elif event == 'applicantReviewed':
        result = payload.get('reviewResult') or {}
        answer = (result.get('reviewAnswer') or '').upper()
        profile.provider_review_answer = answer
        profile.save(update_fields=['provider_review_answer', 'updated_at'])
        if answer == 'GREEN':
            if profile.status != KYCStatus.APPROVED:
                profile.approve(None)
            outcome = 'approved'
        elif answer == 'RED':
            reason = _review_reason(result)
            if (result.get('reviewRejectType') or '').upper() == 'RETRY':
                profile.request_resubmission(None, reason)
                outcome = 'resubmission_requested'
            else:
                profile.reject(None, reason)
                outcome = 'rejected'
    elif event == 'applicantReset':
        profile.status = KYCStatus.PENDING
        profile.save(update_fields=['status', 'updated_at'])
        outcome = 'reset'

    KYCAuditLog.objects.create(
        kyc_profile=profile,
        action=f'Sumsub webhook: {event}',
        actor=None,
        details={'outcome': outcome, 'applicant_id': payload.get('applicantId'),
                 'review_answer': (payload.get('reviewResult') or {}).get('reviewAnswer')},
    )
    return outcome


def parse_webhook_body(raw_body: bytes) -> dict:
    return json.loads(raw_body.decode('utf-8') or '{}')
