"""
Admin audit logging.

`AdminAction` records every administrative state change so the platform can
prove who did what and when. Required for institutional / regulatory
compliance. Rows are append-only — never updated, never deleted by app code.
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class AdminActionType(models.TextChoices):
    # User lifecycle
    USER_SUSPEND = 'user.suspend', 'Suspend User'
    USER_UNSUSPEND = 'user.unsuspend', 'Unsuspend User'
    USER_KYC_OVERRIDE = 'user.kyc_override', 'KYC Status Override'
    USER_ROLE_CHANGE = 'user.role_change', 'User Role Change'

    # Property lifecycle
    PROPERTY_APPROVE = 'property.approve', 'Approve Property'
    PROPERTY_REJECT = 'property.reject', 'Reject Property'
    PROPERTY_PRICE_CHANGE = 'property.price_change', 'Property Price Change'
    PROPERTY_STATUS_CHANGE = 'property.status_change', 'Property Status Change'

    # Investments / payments
    INVESTMENT_MANUAL_REFUND = 'investment.manual_refund', 'Manual Refund'
    INVESTMENT_FORCE_COMPLETE = 'investment.force_complete', 'Force Complete Investment'
    PAYMENT_REVERSE = 'payment.reverse', 'Reverse Payment'

    # Marketplace
    ESCROW_OVERRIDE = 'marketplace.escrow_override', 'Escrow Admin Override'
    LISTING_FORCE_CANCEL = 'marketplace.listing_force_cancel', 'Force Cancel Listing'

    # Compliance
    CAP_TABLE_ADJUSTMENT = 'compliance.cap_table_adjustment', 'Cap Table Adjustment'
    COMPLIANCE_OVERRIDE = 'compliance.override', 'Compliance Hit Override'

    # Other
    OTHER = 'other', 'Other'


class AdminAction(models.Model):
    """
    A single administrative action against a target object.

    Generic FK so we can point at any model (User, Property, Investment, etc.).
    The before/after state is JSON-serialised so a future schema change does
    not destroy historical context.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='admin_actions',
        help_text='The admin user who performed this action.',
    )
    action = models.CharField(
        max_length=64,
        choices=AdminActionType.choices,
        help_text='Type of administrative action.',
    )

    # Generic target
    target_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.PROTECT,
        null=True, blank=True,
    )
    target_object_id = models.CharField(max_length=64, blank=True)
    target = GenericForeignKey('target_content_type', 'target_object_id')

    # State delta
    before_state = models.JSONField(default=dict, blank=True)
    after_state = models.JSONField(default=dict, blank=True)

    # Justification
    reason = models.TextField(
        blank=True,
        help_text='Human reason. Required for high-severity actions.',
    )

    # Forensic context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)
    request_id = models.CharField(max_length=64, blank=True)

    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'admin_panel_admin_actions'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['actor', 'timestamp']),
            models.Index(
                fields=['target_content_type', 'target_object_id', 'timestamp']
            ),
            models.Index(fields=['action', 'timestamp']),
        ]
        # Permissions stripped — append-only via app code.
        default_permissions = ('add', 'view')

    def __str__(self) -> str:
        return f'{self.action} by {self.actor_id} at {self.timestamp}'

    def save(self, *args, **kwargs):
        # Append-only at the application layer. The DB user used by the
        # Django app SHOULD also lack UPDATE/DELETE rights on this table
        # in production.
        if self.pk:
            raise RuntimeError(
                "AdminAction is append-only. Create a new row with a "
                "compensating action instead of editing."
            )
        super().save(*args, **kwargs)


# ---------------------------------------------------------------------------
# Helper for application code
# ---------------------------------------------------------------------------

def log_admin_action(
    *,
    actor,
    action: str,
    target=None,
    before_state: dict | None = None,
    after_state: dict | None = None,
    reason: str = '',
    request=None,
) -> AdminAction:
    """
    Record an admin action. Always wrapped in try/except by callers so a
    failure to log NEVER masks the actual operation outcome — but it should
    be loud (Sentry) if it does happen.
    """
    target_ct = ContentType.objects.get_for_model(target) if target else None
    target_id = str(target.pk) if target else ''

    ip = None
    ua = ''
    rid = ''
    if request is not None:
        ip = request.META.get('REMOTE_ADDR') or request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or None
        ua = request.META.get('HTTP_USER_AGENT', '')[:512]
        rid = request.headers.get('X-Request-ID', '')

    return AdminAction.objects.create(
        actor=actor,
        action=action,
        target_content_type=target_ct,
        target_object_id=target_id,
        before_state=before_state or {},
        after_state=after_state or {},
        reason=reason,
        ip_address=ip,
        user_agent=ua,
        request_id=rid,
    )
