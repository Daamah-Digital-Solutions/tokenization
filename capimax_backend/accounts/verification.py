"""
Email verification codes (client round 3, #2: "the verification code does
not reach Gmail in some cases").

The delivery itself works (capimaxholding.com has SPF + DKIM + DMARC); the
failures were in the code path around it:
  * the "resend code" endpoint required a login that an unverified user
    cannot get, so a delayed / spam-filtered first email could never be
    replaced;
  * logging in with an unverified account just said "Authentication failed";
  * codes were looked up with a case-sensitive email ("Name@gmail.com");
  * duplicate token rows could crash the registration/resend path;
  * the plain-text part of the email didn't contain the code;
  * codes expired after 15 minutes while greylisted mail can take longer.

Everything that issues a code goes through ``issue_verification_code``.
"""

from __future__ import annotations

import logging
from datetime import timedelta

from django.utils import timezone

from core.services.email_service import EmailService

from .models import EmailVerificationToken

logger = logging.getLogger(__name__)

CODE_TTL_MINUTES = 30
RESEND_COOLDOWN_SECONDS = 60


def seconds_until_resend(user) -> int:
    """How long before another code may be sent (anti-spam cooldown)."""
    latest = (EmailVerificationToken.objects
              .filter(user=user, verified=False, code__isnull=False)
              .order_by('-created_at').first())
    if not latest:
        return 0
    elapsed = (timezone.now() - latest.created_at).total_seconds()
    return max(0, int(RESEND_COOLDOWN_SECONDS - elapsed))


def issue_verification_code(user, *, respect_cooldown: bool = False) -> tuple[bool, int]:
    """
    Replace the user's pending code with a fresh one and email it.

    Returns ``(sent, retry_after_seconds)``. ``sent`` is False when the
    cooldown applies (``retry_after`` > 0) or the email could not be sent.
    """
    if respect_cooldown:
        wait = seconds_until_resend(user)
        if wait:
            return False, wait

    # One pending code per user — older ones are invalidated.
    EmailVerificationToken.objects.filter(user=user, verified=False).delete()
    code = EmailVerificationToken.generate_code()
    EmailVerificationToken.objects.create(
        user=user,
        code=code,
        expires_at=timezone.now() + timedelta(minutes=CODE_TTL_MINUTES),
    )
    sent = EmailService.send_welcome_verification_email(
        user=user, verification_url='', verification_code=code,
    )
    if not sent:
        logger.error('Verification code email could not be sent to user %s', user.pk)
    return sent, 0


def find_valid_token(email: str, code: str):
    """The pending token for this email + code, matching the email case-insensitively."""
    return (EmailVerificationToken.objects
            .filter(user__email__iexact=(email or '').strip(), code=(code or '').strip(),
                    verified=False, expires_at__gt=timezone.now())
            .select_related('user')
            .order_by('-created_at').first())
