"""
Property submission → review → publication workflow (client round 3, #23/#24).

Submitting a property and listing it publicly are now two separate steps:

    owner submits ─▶ PENDING_APPROVAL (hidden) ─▶ admin approves ─▶ APPROVED (hidden)
                                │                                       │
                                ├─▶ admin requests changes ─▶ DRAFT ─┐   └─▶ admin PUBLISHES ─▶ listed
                                │        (owner fixes + resubmits) ◀─┘
                                └─▶ admin rejects ─▶ DELISTED

Only an admin can publish (`is_published=True`); nothing an owner or
developer does — creating, saving, editing, resubmitting — can make a
property public. Every decision is also written to the owner's Messages
inbox (OwnerMessage) and sent as a notification.
"""

from __future__ import annotations

import logging

from django.db.models import Q
from django.utils import timezone

from .models import OwnerMessage, Property, PropertyApproval, PropertyStatus

logger = logging.getLogger(__name__)

# Statuses that are never public, even if the publish flag were set.
HIDDEN_STATUSES = [PropertyStatus.DRAFT, PropertyStatus.PENDING_APPROVAL, PropertyStatus.DELISTED]
# Statuses an owner may still edit (before an admin approves it).
OWNER_EDITABLE_STATUSES = [PropertyStatus.DRAFT, PropertyStatus.PENDING_APPROVAL]


class WorkflowError(Exception):
    """A transition that isn't allowed from the property's current state."""


# --------------------------------------------------------------------------
# Visibility
# --------------------------------------------------------------------------

def public_q() -> Q:
    return Q(is_published=True) & ~Q(status__in=HIDDEN_STATUSES)


def public_properties(queryset=None):
    """Properties anyone may see (listings, search, home page, detail)."""
    qs = queryset if queryset is not None else Property.objects.all()
    return qs.filter(public_q())


def visible_properties_for(user, queryset=None):
    """Public properties + the user's own (any state) + everything for staff."""
    qs = queryset if queryset is not None else Property.objects.all()
    if user is not None and user.is_authenticated:
        if user.is_staff or user.is_superuser:
            return qs
        return qs.filter(public_q() | Q(owner=user))
    return qs.filter(public_q())


def is_public(prop: Property) -> bool:
    return bool(prop.is_published) and prop.status not in HIDDEN_STATUSES


def owner_can_edit(prop: Property) -> bool:
    return not prop.is_published and prop.status in OWNER_EDITABLE_STATUSES


# --------------------------------------------------------------------------
# Messages + notifications
# --------------------------------------------------------------------------

def send_owner_message(prop: Property | None, owner, subject: str, body: str,
                       category: str = OwnerMessage.Category.GENERAL,
                       sender=None, email: bool = True,
                       subject_ar: str = '', body_ar: str = '') -> OwnerMessage:
    """Write to the owner's inbox and notify them (in-app, optionally email)."""
    message = OwnerMessage.objects.create(
        owner=owner,
        property=prop,
        sender=sender,
        sender_role=OwnerMessage.SenderRole.ADMIN if sender else OwnerMessage.SenderRole.SYSTEM,
        category=category,
        subject=subject[:255],
        body=body,
        subject_ar=subject_ar[:255],
        body_ar=body_ar,
    )
    try:
        from notifications.services import NotificationService
        NotificationService.create_notification(
            user=owner,
            title=subject[:255],
            message=body[:1000],
            notification_type='property',
            priority='high' if category in (OwnerMessage.Category.CHANGES_REQUESTED,
                                            OwnerMessage.Category.DOCUMENT_REQUEST) else 'medium',
            action_url='/dashboard?view=messages',
            action_label='Open messages',
            send_real_time=True,
            send_email=email,
        )
    except Exception:
        logger.warning('Owner notification failed for message %s', message.pk, exc_info=True)
    return message


def notify_reviewers(prop: Property, title: str, body: str) -> None:
    """In-app heads-up to staff (e.g. a new submission or an owner reply)."""
    try:
        from accounts.models import User
        from notifications.services import NotificationService
        for reviewer in User.objects.filter(is_staff=True, is_active=True)[:20]:
            NotificationService.create_notification(
                user=reviewer,
                title=title[:255],
                message=body[:1000],
                notification_type='property',
                priority='medium',
                action_url=f'/admin/properties/property/{prop.pk}/change/',
                action_label='Review',
                send_real_time=True,
                send_email=False,
            )
    except Exception:
        logger.warning('Reviewer notification failed for property %s', prop.pk, exc_info=True)


# --------------------------------------------------------------------------
# Transitions
# --------------------------------------------------------------------------

def _approval(prop: Property) -> PropertyApproval:
    approval, _ = PropertyApproval.objects.get_or_create(property=prop)
    return approval


def submit_for_review(prop: Property, owner) -> Property:
    """Owner (re)submits a property. It stays hidden from the public."""
    if prop.is_published:
        raise WorkflowError('This property is already published. Contact the platform team to change it.')
    if prop.status not in OWNER_EDITABLE_STATUSES:
        raise WorkflowError('Only draft properties can be submitted for review.')
    approval = _approval(prop)
    approval.status = 'pending'
    approval.submitted_at = timezone.now()
    approval.save()
    prop.status = PropertyStatus.PENDING_APPROVAL
    prop.save(update_fields=['status', 'updated_at'])
    notify_reviewers(prop, 'Property submitted for review',
                     f'"{prop.title}" by {owner.get_full_name() or owner.email} is waiting for review.')
    return prop


def approve(prop: Property, reviewer, notes: str = '') -> Property:
    """Approve the submission. Does NOT publish — publishing is a separate admin step."""
    approval = _approval(prop)
    approval.status = 'approved'
    approval.reviewer = reviewer
    approval.review_notes = notes or approval.review_notes
    approval.reviewed_at = timezone.now()
    approval.save()  # emails the owner on status change
    if prop.status in HIDDEN_STATUSES:
        prop.status = PropertyStatus.APPROVED
        prop.save(update_fields=['status', 'updated_at'])
    send_owner_message(
        prop, prop.owner,
        f'Your property "{prop.title}" was approved',
        (notes + '\n\n' if notes else '') +
        'Our team approved your submission. The platform team will now complete the '
        'listing details and publish the property. You will be notified when it goes live.',
        category=OwnerMessage.Category.APPROVAL_RESULT, sender=reviewer, email=False,
        subject_ar=f'تم اعتماد عقارك "{prop.title}"',
        body_ar=(notes + '\n\n' if notes else '') +
        'اعتمد فريقنا طلبك. سيستكمل فريق المنصة بيانات الإدراج ثم ينشر العقار، '
        'وسنُعلمك فور نشره.',
    )
    return prop


def request_changes(prop: Property, reviewer, required_changes: str, notes: str = '') -> Property:
    """Send the submission back to the owner with what to fix."""
    approval = _approval(prop)
    approval.status = 'requires_changes'
    approval.reviewer = reviewer
    approval.required_changes = required_changes
    approval.review_notes = notes or approval.review_notes
    approval.reviewed_at = timezone.now()
    approval.save()
    prop.status = PropertyStatus.DRAFT
    prop.is_published = False
    prop.save(update_fields=['status', 'is_published', 'updated_at'])
    send_owner_message(
        prop, prop.owner,
        f'Changes requested for "{prop.title}"',
        f'{required_changes}' + (f'\n\n{notes}' if notes else '') +
        '\n\nPlease update your property details or documents and resubmit it for review.',
        category=OwnerMessage.Category.CHANGES_REQUESTED, sender=reviewer, email=False,
        subject_ar=f'مطلوب تعديلات على "{prop.title}"',
        body_ar=f'{required_changes}' + (f'\n\n{notes}' if notes else '') +
        '\n\nيُرجى تحديث بيانات العقار أو مستنداته ثم إعادة تقديمه للمراجعة.',
    )
    return prop


def reject(prop: Property, reviewer, reason: str) -> Property:
    approval = _approval(prop)
    approval.status = 'rejected'
    approval.reviewer = reviewer
    approval.review_notes = reason
    approval.reviewed_at = timezone.now()
    approval.save()
    prop.status = PropertyStatus.DELISTED
    prop.is_published = False
    prop.save(update_fields=['status', 'is_published', 'updated_at'])
    send_owner_message(
        prop, prop.owner,
        f'Your property "{prop.title}" was not approved',
        reason or 'Your submission did not meet the listing requirements.',
        category=OwnerMessage.Category.APPROVAL_RESULT, sender=reviewer, email=False,
        subject_ar=f'لم يتم اعتماد عقارك "{prop.title}"',
        body_ar=reason or 'لم يستوفِ طلبك متطلبات الإدراج.',
    )
    return prop


def publish(prop: Property, admin) -> Property:
    """List the property publicly. Admin-only; requires an approved review."""
    approval = PropertyApproval.objects.filter(property=prop).first()
    if approval is None or approval.status != 'approved':
        raise WorkflowError('Approve the property before publishing it.')
    if prop.status in HIDDEN_STATUSES or prop.status == PropertyStatus.APPROVED:
        prop.status = PropertyStatus.ACTIVE
    prop.is_published = True
    prop.published_at = timezone.now()
    prop.published_by = admin
    prop.save(update_fields=['status', 'is_published', 'published_at', 'published_by', 'updated_at'])
    send_owner_message(
        prop, prop.owner,
        f'"{prop.title}" is now live on Capimax RT',
        'Your property has been published and is now visible to buyers on the platform.',
        category=OwnerMessage.Category.PUBLICATION, sender=admin, email=True,
        subject_ar=f'"{prop.title}" أصبح متاحًا الآن على كابي مكس RT',
        body_ar='تم نشر عقارك وأصبح ظاهرًا للمشترين على المنصة.',
    )
    return prop


def unpublish(prop: Property, admin, reason: str = '') -> Property:
    prop.is_published = False
    prop.save(update_fields=['is_published', 'updated_at'])
    send_owner_message(
        prop, prop.owner,
        f'"{prop.title}" was taken off the public listings',
        reason or 'The platform team has temporarily removed your property from the public listings.',
        category=OwnerMessage.Category.PUBLICATION, sender=admin, email=True,
        subject_ar=f'تم إيقاف عرض "{prop.title}" من القوائم العامة',
        body_ar=reason or 'أوقف فريق المنصة عرض عقارك مؤقتًا من القوائم العامة.',
    )
    return prop
