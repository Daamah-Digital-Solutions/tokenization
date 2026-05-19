"""
Legal entity, subscription agreement, and cap table models for CapimaxRT.

These models give tokens real legal backing:

- LegalEntity: the SPV that legally owns the property. Replaces the previous
  set of free-text CharFields on Property (spv_company_name, etc.).
- SubscriptionAgreement: per-investment binding agreement, signed digitally.
  Investors cannot complete an investment without one.
- CapTableEntry: append-only ledger of every ownership change. Every mint,
  secondary trade, burn, and early exit writes a row here.
- DistributionAllocation: per-investor allocation snapshot taken at the
  moment a distribution is calculated, so a later cap-table change cannot
  retroactively alter who was owed what for that distribution.
"""

from __future__ import annotations

import uuid
from decimal import Decimal

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.utils import timezone


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class LegalEntityType(models.TextChoices):
    LLC = 'llc', 'Limited Liability Company'
    LP = 'lp', 'Limited Partnership'
    CORP = 'corp', 'Corporation'
    TRUST = 'trust', 'Trust'
    OTHER = 'other', 'Other'


class LegalEntityStatus(models.TextChoices):
    PRE_FORMATION = 'pre_formation', 'Pre-Formation'
    ACTIVE = 'active', 'Active'
    SUSPENDED = 'suspended', 'Suspended'
    DISSOLVED = 'dissolved', 'Dissolved'


class AgreementStatus(models.TextChoices):
    PENDING_SIGNATURE = 'pending_signature', 'Pending Investor Signature'
    SIGNED = 'signed', 'Signed by Investor'
    COUNTERSIGNED = 'countersigned', 'Countersigned by Company'
    VOIDED = 'voided', 'Voided'


class OwnershipEvent(models.TextChoices):
    MINT = 'mint', 'Primary Issuance (Mint)'
    SECONDARY_BUY = 'secondary_buy', 'Secondary Market Purchase'
    SECONDARY_SELL = 'secondary_sell', 'Secondary Market Sale'
    BURN = 'burn', 'Token Burn'
    EARLY_EXIT = 'early_exit', 'Early Exit / Buyback'
    ADJUSTMENT = 'adjustment', 'Manual Adjustment (Admin)'


# ---------------------------------------------------------------------------
# LegalEntity (SPV)
# ---------------------------------------------------------------------------

class LegalEntity(models.Model):
    """
    The Special Purpose Vehicle that legally owns the property and issues
    membership interests / shares to investors via tokenization.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # ---- Identity ----
    name = models.CharField(
        max_length=255,
        help_text='Legal name of the SPV (e.g., "Capimax Property 042, LLC")',
    )
    entity_type = models.CharField(
        max_length=20,
        choices=LegalEntityType.choices,
        default=LegalEntityType.LLC,
    )
    jurisdiction = models.CharField(
        max_length=100,
        help_text='Formation jurisdiction (e.g., "Delaware, USA", "BVI", "DIFC")',
    )
    registration_number = models.CharField(
        max_length=100,
        help_text='Registration/file number assigned by the formation authority',
    )
    formation_date = models.DateField()

    # ---- Banking ----
    bank_name = models.CharField(max_length=255, blank=True)
    bank_account_number = models.CharField(max_length=255, blank=True)

    # ---- Governance ----
    registered_agent_name = models.CharField(max_length=255, blank=True)
    registered_agent_address = models.TextField(blank=True)

    # ---- Compliance posture ----
    allowed_investor_jurisdictions = models.JSONField(
        default=list,
        blank=True,
        help_text='ISO country codes whose residents may invest. Empty = all.',
    )
    requires_accredited_investors = models.BooleanField(
        default=False,
        help_text='If True, only KYC-accredited investors may hold tokens.',
    )

    # ---- Operating agreement / offering doc references ----
    operating_agreement_document = models.ForeignKey(
        'properties.PropertyDocument',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='operating_agreement_for_entities',
    )
    offering_memorandum_document = models.ForeignKey(
        'properties.PropertyDocument',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='offering_memorandum_for_entities',
    )

    # ---- Status & timestamps ----
    status = models.CharField(
        max_length=20,
        choices=LegalEntityStatus.choices,
        default=LegalEntityStatus.PRE_FORMATION,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'legal_entities'
        verbose_name = 'Legal Entity (SPV)'
        verbose_name_plural = 'Legal Entities (SPVs)'
        constraints = [
            models.UniqueConstraint(
                fields=['jurisdiction', 'registration_number'],
                name='uniq_legal_entity_jurisdiction_regnum',
            ),
        ]
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['jurisdiction']),
        ]

    def __str__(self) -> str:
        return f'{self.name} ({self.jurisdiction}/{self.registration_number})'

    def jurisdiction_allowed(self, country_code: str) -> bool:
        """Return True if the given country may invest in this SPV."""
        if not self.allowed_investor_jurisdictions:
            return True  # unrestricted
        return country_code.upper() in [c.upper() for c in self.allowed_investor_jurisdictions]


# ---------------------------------------------------------------------------
# SubscriptionAgreement
# ---------------------------------------------------------------------------

class SubscriptionAgreement(models.Model):
    """
    The binding investment agreement between investor and SPV.

    Investors cannot complete an investment without one. The agreement snapshots
    the key economic terms at the moment of signing so future changes to fees,
    lockup policy, or pricing do not retroactively bind earlier investors.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # ---- Links ----
    investment = models.OneToOneField(
        'investments.Investment',
        on_delete=models.PROTECT,
        related_name='subscription_agreement',
    )
    legal_entity = models.ForeignKey(
        LegalEntity,
        on_delete=models.PROTECT,
        related_name='subscription_agreements',
    )

    # ---- Snapshot of terms at signing ----
    token_amount = models.PositiveIntegerField()
    investment_amount = models.DecimalField(max_digits=20, decimal_places=2)
    token_price = models.DecimalField(max_digits=20, decimal_places=8)
    lockup_months = models.PositiveIntegerField(default=12)
    expected_return_pct = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    fee_schedule = models.JSONField(
        default=dict, blank=True,
        help_text='Snapshot of the fee structure at signing.',
    )

    # ---- Document ----
    pdf_document = models.FileField(
        upload_to='subscription_agreements/%Y/%m/',
        null=True,
        blank=True,
        help_text='Generated PDF of the signed agreement',
    )
    signature_hash = models.CharField(
        max_length=64,
        blank=True,
        help_text='SHA-256 hash of the PDF at signing time',
    )

    # ---- Signature evidence ----
    investor_signed_at = models.DateTimeField(null=True, blank=True)
    investor_signed_ip = models.GenericIPAddressField(null=True, blank=True)
    investor_signed_user_agent = models.CharField(max_length=512, blank=True)
    investor_typed_name = models.CharField(max_length=255, blank=True)

    company_signed_at = models.DateTimeField(null=True, blank=True)
    company_signed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='countersigned_agreements',
    )

    # ---- Status & timestamps ----
    status = models.CharField(
        max_length=20,
        choices=AgreementStatus.choices,
        default=AgreementStatus.PENDING_SIGNATURE,
    )
    terms_version = models.CharField(max_length=20, default='1.0')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'legal_subscription_agreements'
        indexes = [
            models.Index(fields=['legal_entity', 'status']),
            models.Index(fields=['investor_signed_at']),
        ]

    def __str__(self) -> str:
        return f'SubscriptionAgreement {self.id} ({self.status})'

    @property
    def is_complete(self) -> bool:
        return self.status == AgreementStatus.COUNTERSIGNED

    def mark_signed_by_investor(self, *, typed_name: str, ip: str, user_agent: str) -> None:
        self.investor_typed_name = typed_name
        self.investor_signed_ip = ip
        self.investor_signed_user_agent = user_agent[:512]
        self.investor_signed_at = timezone.now()
        self.status = AgreementStatus.SIGNED
        self.save(update_fields=[
            'investor_typed_name', 'investor_signed_ip',
            'investor_signed_user_agent', 'investor_signed_at',
            'status', 'updated_at',
        ])

    def countersign(self, by_user) -> None:
        self.company_signed_at = timezone.now()
        self.company_signed_by = by_user
        self.status = AgreementStatus.COUNTERSIGNED
        self.save(update_fields=[
            'company_signed_at', 'company_signed_by', 'status', 'updated_at',
        ])


# ---------------------------------------------------------------------------
# CapTableEntry
# ---------------------------------------------------------------------------

class CapTableEntry(models.Model):
    """
    Append-only ledger of every ownership change in an SPV.

    Each row is a delta: `tokens_delta` is the change, `tokens_balance_after`
    is the holder's running balance for this entity after the change. The
    table is queried both by holder (to render portfolios) and by entity
    (to compute distributions and cap tables).

    Never updated. Errors are corrected by writing an ADJUSTMENT entry.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    legal_entity = models.ForeignKey(
        LegalEntity,
        on_delete=models.PROTECT,
        related_name='cap_table_entries',
    )
    holder = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='cap_table_entries',
    )

    # Delta and resulting running balance for this (entity, holder)
    tokens_delta = models.BigIntegerField()
    tokens_balance_after = models.PositiveBigIntegerField()

    event_type = models.CharField(max_length=24, choices=OwnershipEvent.choices)

    # Origin documents — at most one of these should be set per row
    investment = models.ForeignKey(
        'investments.Investment',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='cap_table_entries',
    )
    trade_transaction = models.ForeignKey(
        'marketplace.TradeTransaction',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='cap_table_entries',
    )
    blockchain_tx_hash = models.CharField(max_length=66, blank=True)
    notes = models.TextField(blank=True)

    # The admin who initiated an ADJUSTMENT, if applicable
    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='initiated_cap_table_entries',
    )

    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'legal_cap_table_entries'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['legal_entity', 'holder', 'timestamp']),
            models.Index(fields=['blockchain_tx_hash']),
            models.Index(fields=['event_type', 'timestamp']),
        ]

    def __str__(self) -> str:
        sign = '+' if self.tokens_delta >= 0 else ''
        return (
            f'CapTable[{self.event_type}] {self.holder_id} '
            f'{sign}{self.tokens_delta} → {self.tokens_balance_after}'
        )

    def save(self, *args, **kwargs):
        # Enforce append-only semantics in code (the DB layer can be locked
        # down further via permissions in production).
        #
        # NB: UUID primary keys are populated at __init__ time (via
        # `default=uuid.uuid4`), so checking `self.pk` would block the
        # very first insert. Use `_state.adding` which is True iff the
        # instance has not yet been persisted.
        force_update = kwargs.pop('_force_update', False)
        if not self._state.adding and not force_update:
            raise RuntimeError(
                "CapTableEntry is append-only. Create a new ADJUSTMENT entry "
                "to correct an erroneous row, do not edit existing entries."
            )
        super().save(*args, **kwargs)


# ---------------------------------------------------------------------------
# DistributionAllocation — frozen per-investor share of a distribution
# ---------------------------------------------------------------------------

class DistributionAllocation(models.Model):
    """
    A per-investor allocation for a specific rental income distribution.

    Written when a distribution is initiated, using the cap table as it
    stood at the snapshot timestamp. The allocation is paid out (`paid_at`
    set, `payment_tx_hash` recorded) via the blockchain distribution flow.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    distribution = models.ForeignKey(
        'properties.RentalIncomeDistribution',
        on_delete=models.CASCADE,
        related_name='allocations',
    )
    legal_entity = models.ForeignKey(
        LegalEntity,
        on_delete=models.PROTECT,
        related_name='distribution_allocations',
    )
    holder = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='distribution_allocations',
    )

    shares_at_snapshot = models.PositiveBigIntegerField()
    allocated_amount = models.DecimalField(max_digits=20, decimal_places=8)
    currency = models.CharField(max_length=10, default='USD')

    paid_at = models.DateTimeField(null=True, blank=True)
    payment_tx_hash = models.CharField(max_length=66, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'legal_distribution_allocations'
        constraints = [
            models.UniqueConstraint(
                fields=['distribution', 'holder'],
                name='uniq_allocation_distribution_holder',
            ),
        ]
        indexes = [
            models.Index(fields=['holder', 'paid_at']),
            models.Index(fields=['distribution', 'paid_at']),
        ]

    def __str__(self) -> str:
        paid = 'paid' if self.paid_at else 'unpaid'
        return f'Allocation {self.allocated_amount} {self.currency} to {self.holder_id} [{paid}]'
