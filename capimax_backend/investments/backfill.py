"""
Mint the shares already bought on the platform once a property goes on the blockchain.

A property's shares can be sold before it is registered on-chain: those purchases complete on
the platform ledger only. When the property is registered (blockchain/registration.py) each such
holding is handed to the mint task, which mints it to the owner's wallet — the same step as
`manage.py mint_unminted_holdings --apply` for one property.
"""

from __future__ import annotations

from django.db import transaction
from django.db.models import Q

from .models import Investment, InvestmentStatus


def unminted_holdings(prop=None):
    qs = (Investment.objects
          .filter(status=InvestmentStatus.COMPLETED, token_amount__gt=0, property_investment__status='tokenized')
          .exclude(property_investment__smart_contract_address__isnull=True)
          .exclude(property_investment__smart_contract_address='')
          .filter(Q(transaction_hash__isnull=True) | Q(transaction_hash='')))
    if prop is not None:
        qs = qs.filter(property_investment=prop)
    return qs.select_related('user', 'property_investment').order_by('completed_at')


def queue(rows) -> int:
    with transaction.atomic():
        for inv in rows:
            inv.payment_method = {**(inv.payment_method or {}), 'backfill_mint': True}
            inv.mint_retry_count = 0
            inv.mint_error = None
            inv.save(update_fields=['payment_method', 'mint_retry_count', 'mint_error'])
            inv.mark_payment_confirmed()  # -> PENDING_MINT; the mint task completes it
    return len(rows)


def queue_unminted_holdings(prop) -> int:
    return queue(list(unminted_holdings(prop)))
