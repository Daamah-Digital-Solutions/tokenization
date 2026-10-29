"""
Link a LiquidityProvider record to a platform user account (client round 3,
#9: "the liquidity provider account opens the investor dashboard").

There was no LP role: approving an application created a LiquidityProvider
but never linked a user, so an LP who signed in was just an `investor`.
Now the LP account is linked (on approval, when the user registers later, or
when an admin sets the user in Django admin) and gets the
`liquidity_provider` role, which the frontend routes to the LP dashboard.
"""

from __future__ import annotations

import logging

from django.db import transaction

logger = logging.getLogger(__name__)


def grant_lp_role(user) -> None:
    """Give the user the liquidity_provider role (primary unless they have another business role)."""
    from accounts.models import UserRole, UserRoleAssignment

    make_primary = user.role in (UserRole.INVESTOR, '', None)
    with transaction.atomic():
        assignment, created = UserRoleAssignment.objects.get_or_create(
            user=user, role=UserRole.LIQUIDITY_PROVIDER,
            defaults={'is_active': True, 'is_primary': False},
        )
        if not assignment.is_active:
            assignment.is_active = True
            assignment.save(update_fields=['is_active'])
        if make_primary:
            from broker.onboarding import keep_current_role
            keep_current_role(user)  # an approved investor stays an investor too
            UserRoleAssignment.objects.filter(user=user, is_primary=True).exclude(
                pk=assignment.pk).update(is_primary=False)
            if not assignment.is_primary:
                assignment.is_primary = True
                assignment.save(update_fields=['is_primary'])
            if user.role != UserRole.LIQUIDITY_PROVIDER:
                user.role = UserRole.LIQUIDITY_PROVIDER
                user.save(update_fields=['role'])


def link_provider_to_user(lp, user) -> None:
    if lp.user_id and lp.user_id != user.pk:
        logger.warning('LP %s already linked to another user; not relinking', lp.pk)
        return
    if lp.user_id != user.pk:
        lp.user = user
        lp.save(update_fields=['user'])
    grant_lp_role(user)


def link_provider_by_email(lp) -> bool:
    """Link the LP to an existing account with its official email, if any."""
    from accounts.models import User

    if lp.user_id:
        grant_lp_role(lp.user)
        return True
    user = User.objects.filter(email__iexact=(lp.official_email or '').strip()).first()
    if user is None:
        return False
    link_provider_to_user(lp, user)
    return True
