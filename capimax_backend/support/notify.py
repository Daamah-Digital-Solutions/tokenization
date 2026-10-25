"""Emails and in-app notifications for contact messages and tickets."""

import logging

from django.conf import settings

logger = logging.getLogger(__name__)

SITE = 'https://capimaxrt.tech'


def support_inbox() -> str:
    return getattr(settings, 'SUPPORT_INBOX_EMAIL', 'tech@capimaxholding.com')


def _send(to: str, subject: str, body: str) -> None:
    from core.services.email_service import EmailService
    try:
        EmailService.send_email(to_email=to, subject=subject, message=body)
    except Exception:  # noqa: BLE001 — a mail failure never loses the record
        logger.warning('Support email to %s failed', to, exc_info=True)


def contact_received(msg) -> None:
    phone = f' · {msg.phone}' if msg.phone else ''
    account = msg.user.email if msg.user_id else '—'
    _send(
        support_inbox(),
        f'[Contact {msg.reference}] {msg.subject}',
        f'New Contact Us message {msg.reference}\n\n'
        f'From: {msg.name} <{msg.email}>{phone}\n'
        f'Topic: {msg.get_topic_display()}\nLanguage: {msg.language}\n'
        f'Account: {account}\n\n{msg.message}\n',
    )
    if msg.language.startswith('ar'):
        subject = f'استلمنا رسالتك ({msg.reference}) — كابي مكس RT'
        body = (f'مرحبًا {msg.name}،\n\nشكرًا لتواصلك مع كابي مكس RT. استلمنا رسالتك بعنوان «{msg.subject}» '
                f'وسيرد فريقنا عليك قريبًا عبر البريد الإلكتروني.\n\nالرقم المرجعي: {msg.reference}\n\n'
                f'فريق كابي مكس RT\n{SITE}')
    else:
        subject = f'We received your message ({msg.reference}) — Capimax RT'
        body = (f'Hello {msg.name},\n\nThank you for contacting Capimax RT. We received your message '
                f'"{msg.subject}" and our team will reply to you by email shortly.\n\n'
                f'Reference: {msg.reference}\n\nThe Capimax RT team\n{SITE}')
    _send(msg.email, subject, body)


def ticket_opened(ticket) -> None:
    _send(
        support_inbox(),
        f'[Ticket {ticket.reference}] {ticket.subject}',
        f'{ticket.user.email} opened a {ticket.get_priority_display()}-priority ticket '
        f'({ticket.get_category_display()}).\n\n{ticket.details}\n',
    )


def user_replied(ticket, body: str) -> None:
    _send(support_inbox(), f'[Ticket {ticket.reference}] New reply from {ticket.user.email}', body)


def staff_replied(ticket, body: str) -> None:
    """Tell the user — email + in-app notification."""
    _send(
        ticket.user.email,
        f'Reply to your support ticket {ticket.reference} — Capimax RT',
        f'Hello,\n\nOur support team replied to your ticket "{ticket.subject}":\n\n{body}\n\n'
        f'Read and answer it in the Support center: {SITE}/support\n\nThe Capimax RT team',
    )
    try:
        from notifications.services import NotificationService
        NotificationService.create_notification(
            user=ticket.user,
            title=f'Support replied — {ticket.reference}',
            message=body[:240],
            notification_type='info',
            action_url='/support',
            action_label='Open',
        )
    except Exception:  # noqa: BLE001
        logger.warning('Ticket notification failed for %s', ticket.reference, exc_info=True)
