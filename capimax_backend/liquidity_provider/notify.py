"""
Emails and in-app notices for the liquidity-provider journey (client round 4,
#13 / #16): application received / decided, and every step of a sale to an LP.
A notice failing never fails the action that triggered it.
"""

from __future__ import annotations

import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def _site() -> str:
    return getattr(settings, 'FRONTEND_URL', '').rstrip('/')


def _mail(to: str, subject: str, body: str) -> None:
    from support.notify import _send
    if to:
        _send(to, subject, body)


def _notice(user, title: str, message: str, url: str = '/dashboard') -> None:
    if user is None:
        return
    try:
        from notifications.services import NotificationService
        NotificationService.create_notification(user=user, title=title, message=message,
                                                notification_type='investment', action_url=url,
                                                action_label='Open', send_email=True)
    except Exception:  # noqa: BLE001
        logger.warning('LP notice failed: %s', title, exc_info=True)


def missing_documents(application) -> list[str]:
    from .models import REQUIRED_LP_DOCUMENTS, LPDocumentType

    have = set(application.documents.values_list('document_type', flat=True))
    return [LPDocumentType(t).label for t in REQUIRED_LP_DOCUMENTS if t not in have]


def application_received(application) -> None:
    from support.notify import support_inbox

    to = application.applicant.email if application.applicant_id else application.official_email
    _mail(to, 'Liquidity provider application received — Capimax RT',
          f'Dear {application.contact_person_name},\n\n'
          f'We received the liquidity provider application of {application.legal_entity_name} '
          f'with {application.documents.count()} document(s). Our team reviews applications within '
          f'2–3 business days and will email you the decision.\n\nCapimax RT')
    _mail(support_inbox(), f'[LP application] {application.legal_entity_name}',
          f'New liquidity provider application from {application.legal_entity_name} '
          f'({application.official_email}), {application.documents.count()} document(s).\n'
          f'Review it in the admin: Liquidity provider applications.')


def application_decided(application) -> None:
    to = application.applicant.email if application.applicant_id else application.official_email
    if application.status == 'approved':
        _mail(to, 'Your liquidity provider application is approved — Capimax RT',
              f'Dear {application.contact_person_name},\n\n'
              f'{application.legal_entity_name} is now an active liquidity provider on Capimax RT.\n'
              f'Sign in with {to} to open your liquidity provider dashboard: {_site()}/dashboard\n'
              f'(If you do not have an account yet, register with this email and it will be linked '
              f'automatically.)\n\nCapimax RT')
    else:
        _mail(to, 'Your liquidity provider application — Capimax RT',
              f'Dear {application.contact_person_name},\n\n'
              f'After review we cannot approve the application of {application.legal_entity_name} at this time.'
              + (f'\nReason: {application.rejection_reason}' if application.rejection_reason else '')
              + '\n\nYou are welcome to apply again once the points above are addressed.\n\nCapimax RT')


def _prop(er) -> str:
    return er.investment.property_investment.title


def exit_requested(er) -> None:
    _notice(er.liquidity_provider.user, 'New exit request',
            f'An investor asks you to buy {er.units_requested} shares of {_prop(er)} at '
            f'${er.requested_price_per_unit:,.2f} per share. Review it in your dashboard.',
            '/dashboard?view=requests')


def offer_made(er) -> None:
    _notice(er.investor, 'Offer received for your shares',
            f'{er.liquidity_provider.legal_entity_name} offers ${er.offered_price_per_unit:,.2f} per share '
            f'(${er.total_offered_amount:,.2f} in total) for {er.units_requested} shares of {_prop(er)}. '
            f'Accept or decline within 48 hours.', '/dashboard?view=my-properties')


def request_declined(er) -> None:
    _notice(er.investor, 'Exit request declined',
            f'{er.liquidity_provider.legal_entity_name} declined your request to sell {er.units_requested} '
            f'shares of {_prop(er)}.' + (f' Note: {er.lp_notes}' if er.lp_notes else '')
            + ' Your shares are free again.', '/dashboard?view=my-properties')


def investor_withdrew(er, declined: bool) -> None:
    _notice(er.liquidity_provider.user, 'Offer declined' if declined else 'Exit request withdrawn',
            f'The investor {"declined your offer" if declined else "withdrew the request"} for '
            f'{er.units_requested} shares of {_prop(er)}.', '/dashboard?view=requests')
