"""
Ownership certificates (client round 4, #5 — modelled on Capimax BRX).

One certificate per holding: a purchase (investments.Investment) or an
installment plan (properties.ConstructionInstallment). Its data is a snapshot
of real records — investor, SPV, property, shares, price, token contract and
the holder's wallet — and it carries a public verification code: the QR on the
PDF opens {FRONTEND_URL}/verify/<code>, which shows this record.

provisional — paid, shares not yet final (mint pending / plan still being paid)
final       — shares delivered (minted) / plan fully paid
revoked     — the holding changed or ended (sold, transferred, refunded); a new
              certificate is issued for whatever the holder still owns
"""

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class CertificateStatus(models.TextChoices):
    PROVISIONAL = 'provisional', 'Provisional'
    FINAL = 'final', 'Final'
    REVOKED = 'revoked', 'Revoked'


class Certificate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='certificates')
    investment = models.ForeignKey('investments.Investment', on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='certificates')
    installment_plan = models.ForeignKey('properties.ConstructionInstallment', on_delete=models.SET_NULL,
                                         null=True, blank=True, related_name='certificates')
    property_ref = models.ForeignKey('properties.Property', on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name='certificates')

    certificate_id = models.CharField(max_length=40, unique=True)  # CERT-2026-SKYL-A1B2C3
    verification_code = models.CharField(max_length=64, unique=True, db_index=True)
    status = models.CharField(max_length=12, choices=CertificateStatus.choices, default=CertificateStatus.PROVISIONAL)
    issue_date = models.DateField(default=timezone.localdate)
    subscription_date = models.DateField(null=True, blank=True)
    finalized_at = models.DateTimeField(null=True, blank=True)

    investor_name = models.CharField(max_length=200, blank=True)
    investor_id_masked = models.CharField(max_length=32, blank=True)

    spv_name = models.CharField(max_length=255, blank=True)
    spv_registration_ref = models.CharField(max_length=120, blank=True)
    spv_jurisdiction = models.CharField(max_length=120, blank=True)

    property_name = models.CharField(max_length=255, blank=True)
    property_location = models.CharField(max_length=255, blank=True)

    units = models.PositiveIntegerField(default=0)
    total_units = models.PositiveIntegerField(default=0)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    investment_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    ownership_percentage = models.DecimalField(max_digits=12, decimal_places=6, default=0)
    acquisition = models.CharField(max_length=40, blank=True)  # purchase / market / installments / …

    # On-chain record
    holder_wallet = models.CharField(max_length=64, blank=True)
    contract_address = models.CharField(max_length=64, blank=True)
    token_standard = models.CharField(max_length=20, blank=True, default='ERC-1155')
    token_id = models.CharField(max_length=40, blank=True, default='0')
    network_name = models.CharField(max_length=80, blank=True)
    chain_id = models.PositiveIntegerField(null=True, blank=True)
    contract_explorer_url = models.CharField(max_length=300, blank=True)
    mint_tx_hash = models.CharField(max_length=80, blank=True)
    mint_tx_url = models.CharField(max_length=300, blank=True)

    authorized_signatory = models.CharField(max_length=200, blank=True)
    digital_signature_hash = models.CharField(max_length=64, blank=True)

    revoked_at = models.DateTimeField(null=True, blank=True)
    revocation_reason = models.CharField(max_length=300, blank=True)
    replaced_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-issue_date', '-created_at')
        indexes = [models.Index(fields=['user', 'status'])]

    def __str__(self):
        return f'{self.certificate_id} ({self.status})'

    @property
    def verification_url(self) -> str:
        return f"{getattr(settings, 'FRONTEND_URL', '').rstrip('/')}/verify/{self.verification_code}"
