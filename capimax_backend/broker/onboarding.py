"""
Broker application approval (client round 3, #8: "the broker account opens
the investor dashboard").

Approval used to call ``create_user(email=application.email, role='broker')``.
Applicants almost always already have an account (the application page is
login-only), so that raised an IntegrityError, the API returned a generic
500, and the applicant stayed an `investor`. The Django-admin bulk action
only flipped the status and never touched the account at all.

``approve_application`` attaches the broker role + BrokerProfile to the
existing account, or creates the account if there is none.
"""

from __future__ import annotations

import logging
import secrets
import string
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from .models import BrokerApplicationStatus, BrokerProfile, BrokerVerificationStatus

logger = logging.getLogger(__name__)


def grant_broker_role(user) -> None:
    from accounts.models import UserRole, UserRoleAssignment

    assignment, _ = UserRoleAssignment.objects.get_or_create(
        user=user, role=UserRole.BROKER, defaults={'is_active': True, 'is_primary': False},
    )
    if not assignment.is_active:
        assignment.is_active = True
        assignment.save(update_fields=['is_active'])
    # A plain investor account becomes a broker account; an owner / LP keeps
    # their primary role and can switch to "broker" from the role switcher.
    if user.role in (UserRole.INVESTOR, '', None):
        UserRoleAssignment.objects.filter(user=user, is_primary=True).exclude(
            pk=assignment.pk).update(is_primary=False)
        if not assignment.is_primary:
            assignment.is_primary = True
            assignment.save(update_fields=['is_primary'])
        user.role = UserRole.BROKER
        user.save(update_fields=['role'])


def _experience_years(level: str) -> int:
    return {'0-1': 0, '2-5': 3, '5-10': 7}.get(level or '', 10)


@transaction.atomic
def approve_application(application, reviewer):
    """
    Approve a pending application. Returns ``(user, profile, temp_password)``;
    ``temp_password`` is set only when a new account had to be created.
    """
    if application.application_status not in (BrokerApplicationStatus.PENDING,
                                               BrokerApplicationStatus.APPROVED):
        raise ValueError('Application is not pending.')

    User = get_user_model()
    user = application.associated_user or User.objects.filter(
        email__iexact=(application.email or '').strip()).first()
    temp_password = None
    if user is None:
        temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
        user = User.objects.create_user(
            email=application.email.strip().lower(),
            first_name=application.first_name,
            last_name=application.last_name,
            password=temp_password,
            role='broker',
            is_verified=False,
        )

    grant_broker_role(user)

    profile, _ = BrokerProfile.objects.get_or_create(
        user=user,
        defaults={
            'license_number': application.license_number or f'PENDING-{user.id}',
            'license_state': 'TBD',
            'license_expiry': timezone.now().date() + timedelta(days=365),
            'company_name': application.current_company or '',
            'bio': application.referral_strategy,
            'experience_years': _experience_years(application.experience_level),
            'verification_status': BrokerVerificationStatus.PENDING,
        },
    )

    if application.application_status == BrokerApplicationStatus.PENDING:
        application.approve(reviewer)
    application.associated_user = user
    application.save()
    logger.info('Broker application %s approved -> user %s', application.pk, user.pk)
    return user, profile, temp_password
