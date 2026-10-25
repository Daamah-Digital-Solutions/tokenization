"""
Support center and Contact Us (client round 3, #12 #13).

  * ContactMessage — the public Contact Us form (no account needed). It used
    to be a fake form that only waited a second and showed "sent".
  * SupportTicket / SupportTicketMessage — signed-in users open tickets and
    follow the conversation with the support team (the same model as the
    other Capimax platforms).
"""

import uuid

from django.conf import settings
from django.db import models


def _next_reference(model, prefix: str) -> str:
    n = model.objects.count() + 1
    ref = f'{prefix}-{n:05d}'
    while model.objects.filter(reference=ref).exists():
        n += 1
        ref = f'{prefix}-{n:05d}'
    return ref


class ContactMessage(models.Model):
    class Topic(models.TextChoices):
        GENERAL = 'general', 'General question'
        INVESTMENT = 'investment', 'Owning property shares'
        ACCOUNT = 'account', 'Account & verification'
        PAYMENTS = 'payments', 'Payments & wallet'
        LISTING = 'listing', 'Listing a property'
        PARTNERSHIP = 'partnership', 'Partnerships & brokers'
        MEDIA = 'media', 'Press & media'
        OTHER = 'other', 'Other'

    class Status(models.TextChoices):
        NEW = 'new', 'New'
        ANSWERED = 'answered', 'Answered'
        CLOSED = 'closed', 'Closed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=16, unique=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                             related_name='contact_messages')
    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=40, blank=True)
    topic = models.CharField(max_length=20, choices=Topic.choices, default=Topic.GENERAL)
    subject = models.CharField(max_length=200)
    message = models.TextField(max_length=5000)
    language = models.CharField(max_length=5, default='en')
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.NEW, db_index=True)
    staff_notes = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)
        verbose_name = 'Contact message'

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = _next_reference(ContactMessage, 'MSG')
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.reference} · {self.email} · {self.subject}'


class SupportTicket(models.Model):
    class Category(models.TextChoices):
        INVESTMENT = 'investment', 'Owning property shares'
        PAYMENTS = 'payments', 'Payments & wallet'
        ACCOUNT = 'account', 'Account & verification'
        TECHNICAL = 'technical', 'Technical problem'
        OTHER = 'other', 'Other'

    class Priority(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        PENDING = 'pending', 'Awaiting the user'
        RESOLVED = 'resolved', 'Resolved'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=16, unique=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='support_tickets')
    subject = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.LOW)
    details = models.TextField(max_length=5000)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-updated_at',)
        verbose_name = 'Support ticket'

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = _next_reference(SupportTicket, 'TKT')
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.reference} [{self.status}] {self.subject}'


class SupportTicketMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='messages')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                               related_name='+')
    is_staff = models.BooleanField(default=False)
    body = models.TextField(max_length=5000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('created_at',)
        verbose_name = 'Reply'

    def __str__(self):
        return f'{self.ticket.reference} reply'
