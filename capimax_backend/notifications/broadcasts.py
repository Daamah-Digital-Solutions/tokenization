"""
Admin email broadcasts (client round 4, extra request #4).

recipients(b) resolves the audience; send(b) emails everyone in batches with
the branded notification layout, logs each message (EmailLog) and keeps the
counters on the Broadcast up to date. Runs in Celery (low_priority).
"""

from __future__ import annotations

import logging
import re
import time

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.db.models import Q
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger(__name__)

BATCH = 50
PAUSE_SECONDS = float(getattr(settings, 'BROADCAST_PAUSE_SECONDS', 1.0))  # stay under the mailbox's send limit


def recipients(b):
    from accounts.models import User

    users = User.objects.filter(is_active=True).exclude(email='')
    role = {'investors': 'investor', 'owners': 'property_owner', 'brokers': 'broker',
            'liquidity_providers': 'liquidity_provider'}.get(b.audience)
    if role:
        users = users.filter(Q(role=role) | Q(user_roles__role=role, user_roles__is_active=True))
    elif b.audience == 'kyc_verified':
        users = users.filter(kyc_profile__status='approved')
    elif b.audience == 'holders':
        users = users.filter(investments__status='completed', investments__token_amount__gt=0)
    elif b.audience == 'custom':
        emails = {e.strip().lower() for e in re.split(r'[\s,;]+', b.custom_emails or '') if '@' in e}
        users = users.filter(email__in=emails)
    if b.is_marketing:
        users = users.exclude(notification_preferences__email_notifications_enabled=False)
    return users.distinct().order_by('date_joined')


def _render(b, user) -> tuple[str, str]:
    from core.services.email_service import EmailService

    from .emailing import absolute, site_context
    message = b.message
    if b.is_marketing:
        message += ('\n\nYou receive Capimax RT news because you have an account. To stop, turn off email '
                    'notifications in Settings.')
    html = render_to_string('emails/notification.html', {
        **site_context(), 'title': b.title, 'preheader': b.message[:120], 'message': message,
        'name': (user.get_full_name() or '').strip(),
        'action_url': absolute(b.action_url) if b.action_url else '', 'action_label': b.action_label,
    })
    return html, EmailService._html_to_text(html)


def send_one(b, user, connection=None) -> bool:
    from .models import EmailLog

    html, text = _render(b, user)
    log = EmailLog.objects.create(recipient=user, subject=b.subject, recipient_email=user.email,
                                  sender_email=settings.DEFAULT_FROM_EMAIL, status='queued')
    try:
        msg = EmailMultiAlternatives(subject=b.subject, body=text, from_email=settings.DEFAULT_FROM_EMAIL,
                                     to=[user.email], connection=connection)
        msg.encoding = 'utf-8'
        msg.attach_alternative(html, 'text/html')
        msg.send(fail_silently=False)
    except Exception as exc:  # noqa: BLE001
        log.status, log.failed_at, log.error_message = 'failed', timezone.now(), str(exc)[:2000]
        log.save(update_fields=['status', 'failed_at', 'error_message'])
        return False
    log.status, log.sent_at = 'sent', timezone.now()
    log.save(update_fields=['status', 'sent_at'])
    return True


def send(broadcast_id) -> dict:
    from .models import Broadcast

    b = Broadcast.objects.get(pk=broadcast_id)
    if b.status == 'sent':
        return {'skipped': 'already sent'}
    users = list(recipients(b))
    Broadcast.objects.filter(pk=b.pk).update(status='sending', recipients_count=len(users), sent_count=0,
                                             failed_count=0, last_error='')
    sent = failed = 0
    for start in range(0, len(users), BATCH):
        batch = users[start:start + BATCH]
        try:
            connection = get_connection()
            connection.open()
        except Exception as exc:  # noqa: BLE001
            Broadcast.objects.filter(pk=b.pk).update(status='failed', last_error=f'Mail server: {exc}'[:2000])
            return {'sent': sent, 'failed': failed, 'error': str(exc)}
        try:
            for user in batch:
                if send_one(b, user, connection):
                    sent += 1
                else:
                    failed += 1
                if b.also_in_app:
                    _in_app(b, user)
        finally:
            connection.close()
        Broadcast.objects.filter(pk=b.pk).update(sent_count=sent, failed_count=failed)
        if start + BATCH < len(users):
            time.sleep(PAUSE_SECONDS * BATCH / 10)
    Broadcast.objects.filter(pk=b.pk).update(status='sent', sent_at=timezone.now(),
                                             sent_count=sent, failed_count=failed)
    logger.info('Broadcast %s: %s sent, %s failed', b.pk, sent, failed)
    return {'sent': sent, 'failed': failed}


def _in_app(b, user) -> None:
    try:
        from .services import NotificationService
        NotificationService.create_notification(user=user, title=b.title, message=b.message,
                                                notification_type='info', action_url=b.action_url or None,
                                                action_label=b.action_label or None, send_email=False)
    except Exception:  # noqa: BLE001
        pass
