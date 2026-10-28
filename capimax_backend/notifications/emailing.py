"""
Notification emails (client round 4, #16).

Every in-app notification created with send_email=True becomes the same
branded HTML email (templates/emails/notification.html) with a plain-text
part. It is sent after the database transaction commits, in the background
(Celery, low_priority queue), never inside a purchase or a sale — and every
attempt is written to EmailLog, so failures are retried by the
process_pending_emails beat task (3 attempts).
"""

from __future__ import annotations

import logging
from urllib.parse import urlparse

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 3


def site_context() -> dict:
    site = getattr(settings, 'FRONTEND_URL', '').rstrip('/') or 'https://capimaxrt.tech'
    return {
        'site_url': site,
        'site_host': urlparse(site).netloc or site,
        'support_email': getattr(settings, 'SUPPORT_EMAIL', None) or getattr(settings, 'SUPPORT_INBOX_EMAIL', ''),
        'company_line': 'Capimax Real Estate Technologies · 8 The Green, Ste R, Dover, DE 19901, United States',
    }


def absolute(url: str | None) -> str:
    if not url:
        return ''
    if url.startswith(('http://', 'https://', 'mailto:')):
        return url
    return f"{site_context()['site_url']}/{url.lstrip('/')}"


def render(notification) -> tuple[str, str, str]:
    from core.services.email_service import EmailService

    user = notification.user
    ctx = {
        **site_context(),
        'title': notification.title,
        'preheader': (notification.message or '')[:120],
        'message': notification.message,
        'name': (user.get_full_name() or '').strip(),
        'action_url': absolute(notification.action_url) or site_context()['site_url'] + '/dashboard',
        'action_label': notification.action_label or 'Open Capimax RT',
    }
    html = render_to_string('emails/notification.html', ctx)
    return f'{notification.title} — Capimax RT', html, EmailService._html_to_text(html)


def deliver(notification, email_log=None) -> bool:
    """Send one notification email now. Reuses `email_log` on a retry."""
    from .models import EmailLog, NotificationChannel

    user = notification.user
    prefs = getattr(user, 'notification_preferences', None)
    if prefs and not prefs.email_notifications_enabled:
        return False
    subject, html, text = render(notification)
    if email_log is None:
        email_log = EmailLog.objects.create(
            recipient=user, notification=notification, subject=subject, recipient_email=user.email,
            sender_email=settings.DEFAULT_FROM_EMAIL, status='queued')
    try:
        msg = EmailMultiAlternatives(subject=subject, body=text, from_email=settings.DEFAULT_FROM_EMAIL,
                                     to=[user.email])
        msg.encoding = 'utf-8'
        msg.attach_alternative(html, 'text/html')
        msg.send(fail_silently=False)
    except Exception as exc:  # noqa: BLE001 — logged and retried by the beat task
        email_log.status = 'failed'
        email_log.failed_at = timezone.now()
        email_log.error_message = str(exc)[:2000]
        email_log.retry_count = (email_log.retry_count or 0) + 1
        email_log.save(update_fields=['status', 'failed_at', 'error_message', 'retry_count'])
        logger.warning('Notification email to %s failed: %s', user.email, exc)
        return False
    email_log.status = 'sent'
    email_log.sent_at = timezone.now()
    email_log.subject = subject
    email_log.save(update_fields=['status', 'sent_at', 'subject'])
    type(notification).objects.filter(pk=notification.pk).update(is_sent_via_email=True)
    NotificationChannel.objects.filter(notification=notification, channel='email').update(
        status='sent', sent_at=timezone.now())
    logger.info('Sent notification email to %s: %s', user.email, subject)
    return True


def _dispatch(notification_id) -> None:
    try:
        from .tasks import deliver_notification_email
        deliver_notification_email.delay(str(notification_id))
    except Exception:  # noqa: BLE001 — no broker: send in-process
        from .models import Notification
        n = Notification.objects.select_related('user').filter(pk=notification_id).first()
        if n is not None:
            deliver(n)


def queue(notification) -> None:
    """Send after the surrounding transaction commits (immediately when there is none)."""
    transaction.on_commit(lambda: _dispatch(notification.pk))


def retry_failed(limit: int = 50) -> dict:
    """Beat task body: resend failed emails (and ones stuck in 'queued') up to MAX_ATTEMPTS."""
    from datetime import timedelta

    from django.db.models import Q

    from .models import EmailLog

    stale = timezone.now() - timedelta(minutes=10)
    rows = (EmailLog.objects.filter(notification__isnull=False, retry_count__lt=MAX_ATTEMPTS)
            .filter(Q(status='failed') | Q(status='queued', created_at__lt=stale))
            .select_related('notification__user').order_by('created_at')[:limit])
    stats = {'sent': 0, 'failed': 0}
    for row in rows:
        stats['sent' if deliver(row.notification, email_log=row) else 'failed'] += 1
    return stats
