"""
Transfers between users (client round 4, extra request #3 — like Capimax BRX).

A user sends property shares or wallet balance to someone by email. The
shares / money are held from the sender at once; they are delivered on the
chosen date if the recipient has an account with verified identity —
otherwise the transfer waits (the recipient is invited) and comes back to the
sender after TRANSFER_CLAIM_DAYS. The sender can cancel until delivery.
"""

import secrets
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models


class TransferAsset(models.TextChoices):
    UNITS = 'units', 'Property shares'
    CASH = 'cash', 'Wallet balance'


class TransferStatus(models.TextChoices):
    SCHEDULED = 'scheduled', 'Scheduled'      # held, delivered on deliver_on
    WAITING = 'waiting', 'Waiting for the recipient'  # recipient has no verified account yet
    DELIVERED = 'delivered', 'Delivered'
    CANCELLED = 'cancelled', 'Cancelled'      # by the sender — hold returned
    EXPIRED = 'expired', 'Returned (not claimed)'  # hold returned
    FAILED = 'failed', 'Failed'               # hold returned


OPEN = (TransferStatus.SCHEDULED, TransferStatus.WAITING)


def _reference() -> str:
    return f'TR-{secrets.token_hex(4).upper()}'


class Transfer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=20, unique=True, default=_reference)
    asset = models.CharField(max_length=10, choices=TransferAsset.choices)
    status = models.CharField(max_length=12, choices=TransferStatus.choices, default=TransferStatus.SCHEDULED,
                              db_index=True)

    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='transfers_sent')
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
                                  related_name='transfers_received')
    recipient_email = models.EmailField()
    recipient_name = models.CharField(max_length=150, blank=True)
    message = models.CharField(max_length=500, blank=True)

    property_ref = models.ForeignKey('properties.Property', on_delete=models.PROTECT, null=True, blank=True,
                                     related_name='transfers')
    units = models.PositiveIntegerField(default=0)
    amount = models.DecimalField(max_digits=16, decimal_places=2, default=Decimal('0.00'),
                                 help_text='Cash sent, or the cost basis of the shares sent.')
    fee_amount = models.DecimalField(max_digits=16, decimal_places=2, default=Decimal('0.00'))

    deliver_on = models.DateField()
    expires_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    close_reason = models.CharField(max_length=300, blank=True)
    reminded_at = models.DateTimeField(null=True, blank=True)

    # On-chain move of delivered shares (marketplace/chain_transfer.py)
    CHAIN_STATUS_CHOICES = [
        ('pending', 'Waiting to be sent'),
        ('submitted', 'Sent, waiting for confirmation'),
        ('confirmed', 'Confirmed on-chain'),
        ('failed', 'Failed — will be retried'),
        ('needs_review', 'Needs staff review'),
        ('not_required', 'Not needed (cash, or property not tokenized)'),
    ]
    chain_status = models.CharField(max_length=20, choices=CHAIN_STATUS_CHOICES, default='not_required',
                                    db_index=True)
    chain_attempts = models.PositiveSmallIntegerField(default=0)
    chain_error = models.TextField(blank=True)
    chain_updated_at = models.DateTimeField(null=True, blank=True)
    transaction_hash = models.CharField(max_length=80, null=True, blank=True)
    blockchain_confirmed = models.BooleanField(default=False)
    gas_fee = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['recipient_email', 'status'])]

    def __str__(self):
        what = f'{self.units} shares' if self.asset == TransferAsset.UNITS else f'${self.amount}'
        return f'{self.reference}: {what} to {self.recipient_email} ({self.status})'

    @property
    def is_open(self) -> bool:
        return self.status in OPEN

    def chain_parts(self) -> dict:
        """For marketplace/chain_transfer: sender -> recipient (delivered share transfers only)."""
        return {
            'seller': self.sender, 'buyer': self.recipient, 'prop': self.property_ref, 'amount': int(self.units),
            'settled': self.status == TransferStatus.DELIVERED and self.asset == TransferAsset.UNITS,
            'holding_key': ('transfer_id', str(self.pk)), 'label': f'transfer {self.reference}',
        }
