"""
Legal services: subscription agreement generation, cap table queries,
distribution snapshotting.

These helpers wrap common operations the rest of the platform performs
against legal entities and cap tables. They are written to be idempotent
and safe under concurrent calls.
"""

from __future__ import annotations

import hashlib
import io
import logging
from decimal import Decimal
from typing import Iterable, Optional

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from .models import (
    AgreementStatus,
    CapTableEntry,
    DistributionAllocation,
    LegalEntity,
    OwnershipEvent,
    SubscriptionAgreement,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Subscription agreement generation & signing
# ---------------------------------------------------------------------------

class SubscriptionAgreementService:
    """Create, render, and sign subscription agreements."""

    @staticmethod
    @transaction.atomic
    def create_for_investment(investment) -> SubscriptionAgreement:
        """
        Create a `pending_signature` SubscriptionAgreement for a new investment.

        Idempotent: returns the existing agreement if one already exists for
        this investment.
        """
        existing = getattr(investment, 'subscription_agreement', None)
        if existing:
            return existing

        legal_entity = getattr(investment.property_investment, 'spv_entity', None)
        if not legal_entity:
            raise RuntimeError(
                f"Property {investment.property_investment_id} has no linked "
                "LegalEntity. Cannot create a SubscriptionAgreement."
            )

        lockup_months = getattr(
            investment.property_investment, 'lockup_months', 12
        )

        agreement = SubscriptionAgreement.objects.create(
            investment=investment,
            legal_entity=legal_entity,
            token_amount=investment.token_amount,
            investment_amount=investment.investment_amount,
            token_price=investment.property_investment.token_price,
            lockup_months=lockup_months,
            expected_return_pct=getattr(
                investment.property_investment, 'expected_return', None
            ),
            terms_version='1.0',
        )
        return agreement

    @staticmethod
    @transaction.atomic
    def sign_by_investor(
        agreement: SubscriptionAgreement,
        *,
        typed_name: str,
        ip: str,
        user_agent: str,
    ) -> SubscriptionAgreement:
        """Investor signs the agreement and we generate the PDF."""
        if agreement.status != AgreementStatus.PENDING_SIGNATURE:
            raise ValueError(
                f"Cannot sign agreement in status {agreement.status}"
            )

        agreement.mark_signed_by_investor(
            typed_name=typed_name, ip=ip, user_agent=user_agent
        )

        # Generate PDF if PDF rendering is available. If weasyprint is missing
        # in this environment we still mark the agreement signed — operations
        # team can regenerate the PDF asynchronously.
        try:
            pdf_bytes = _render_agreement_pdf(agreement)
            agreement.signature_hash = hashlib.sha256(pdf_bytes).hexdigest()
            from django.core.files.base import ContentFile
            agreement.pdf_document.save(
                f'subscription_{agreement.id}.pdf',
                ContentFile(pdf_bytes),
                save=False,
            )
            agreement.save(update_fields=['pdf_document', 'signature_hash'])
        except Exception:
            logger.exception(
                'Failed to render subscription agreement PDF',
                extra={'agreement_id': str(agreement.id)},
            )

        return agreement

    @staticmethod
    @transaction.atomic
    def countersign(agreement: SubscriptionAgreement, by_user) -> SubscriptionAgreement:
        """Company countersigns the agreement."""
        if agreement.status != AgreementStatus.SIGNED:
            raise ValueError(
                f"Cannot countersign agreement in status {agreement.status}"
            )
        agreement.countersign(by_user=by_user)
        return agreement


def _render_agreement_pdf(agreement: SubscriptionAgreement) -> bytes:
    """Render the subscription agreement to PDF bytes via weasyprint."""
    from django.template.loader import render_to_string

    html = render_to_string(
        'legal/subscription_agreement.html',
        {'agreement': agreement},
    )
    try:
        from weasyprint import HTML
    except ImportError:
        # Fallback: store the HTML as the "PDF" so we don't lose evidence
        return html.encode('utf-8')

    buf = io.BytesIO()
    HTML(string=html).write_pdf(buf)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Cap table writers
# ---------------------------------------------------------------------------

class CapTableService:
    """All writes to the cap table go through here."""

    @staticmethod
    @transaction.atomic
    def record(
        *,
        legal_entity: LegalEntity,
        holder,
        tokens_delta: int,
        event_type: str,
        investment=None,
        trade_transaction=None,
        blockchain_tx_hash: str = '',
        notes: str = '',
        initiated_by=None,
    ) -> CapTableEntry:
        """
        Append a new cap table entry for a holder.

        Computes `tokens_balance_after` by looking up the holder's most
        recent entry for the same legal entity under a row lock.
        """
        last = (
            CapTableEntry.objects
            .select_for_update()
            .filter(legal_entity=legal_entity, holder=holder)
            .order_by('-timestamp')
            .first()
        )
        prev_balance = last.tokens_balance_after if last else 0
        new_balance = prev_balance + tokens_delta
        if new_balance < 0:
            raise ValueError(
                f"Cap table entry would produce negative balance for "
                f"holder {holder.pk} in entity {legal_entity.pk}: "
                f"{prev_balance} + {tokens_delta} = {new_balance}"
            )
        return CapTableEntry.objects.create(
            legal_entity=legal_entity,
            holder=holder,
            tokens_delta=tokens_delta,
            tokens_balance_after=new_balance,
            event_type=event_type,
            investment=investment,
            trade_transaction=trade_transaction,
            blockchain_tx_hash=blockchain_tx_hash,
            notes=notes,
            initiated_by=initiated_by,
        )

    @staticmethod
    def current_balance(legal_entity: LegalEntity, holder) -> int:
        """Return the holder's current token balance in this entity."""
        last = (
            CapTableEntry.objects
            .filter(legal_entity=legal_entity, holder=holder)
            .order_by('-timestamp')
            .first()
        )
        return last.tokens_balance_after if last else 0

    @staticmethod
    def cap_table_snapshot(legal_entity: LegalEntity, as_of=None) -> dict[int, int]:
        """
        Return {holder_id: balance} as of `as_of` (defaults to now).

        Uses the latest entry per (entity, holder) up to the cut-off.
        """
        qs = CapTableEntry.objects.filter(legal_entity=legal_entity)
        if as_of is not None:
            qs = qs.filter(timestamp__lte=as_of)
        latest_per_holder = (
            qs.order_by('holder_id', '-timestamp')
            .distinct('holder_id')
            .values_list('holder_id', 'tokens_balance_after')
        )
        return {hid: bal for hid, bal in latest_per_holder if bal > 0}


# ---------------------------------------------------------------------------
# Distribution snapshot
# ---------------------------------------------------------------------------

class DistributionAllocationService:
    """Snapshot the cap table at distribution time and write allocations."""

    @staticmethod
    @transaction.atomic
    def snapshot(distribution, *, currency: str = 'USD') -> int:
        """
        Take a cap-table snapshot for this distribution and create one
        `DistributionAllocation` per eligible holder.

        Returns the number of allocations created. Idempotent: if allocations
        already exist for this distribution, returns 0 and does nothing.
        """
        if distribution.allocations.exists():
            return 0

        property_obj = getattr(distribution, 'property', None) or distribution.property_investment
        legal_entity = getattr(property_obj, 'spv_entity', None)
        if not legal_entity:
            raise RuntimeError(
                f'Property {property_obj.pk} has no linked LegalEntity; '
                'cannot allocate distribution.'
            )

        snapshot = CapTableService.cap_table_snapshot(
            legal_entity=legal_entity,
            as_of=getattr(distribution, 'distribution_date', None) or timezone.now(),
        )
        total_shares = sum(snapshot.values())
        if total_shares <= 0:
            return 0

        net_amount = Decimal(str(distribution.net_distribution_amount))
        allocations = []
        for holder_id, shares in snapshot.items():
            allocated = (net_amount * Decimal(shares)) / Decimal(total_shares)
            allocations.append(DistributionAllocation(
                distribution=distribution,
                legal_entity=legal_entity,
                holder_id=holder_id,
                shares_at_snapshot=shares,
                allocated_amount=allocated,
                currency=currency,
            ))
        DistributionAllocation.objects.bulk_create(allocations)
        return len(allocations)
