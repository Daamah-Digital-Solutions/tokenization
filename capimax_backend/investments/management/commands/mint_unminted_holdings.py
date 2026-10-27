"""
Mint on-chain the shares of purchases that were completed on the ledger only.

Before the fix in InvestmentProcessingService.process_investment, only card
purchases were minted: wallet, crypto, bank transfer, Sukuk and reinvest
purchases of tokenized properties were completed with no tokens on-chain.
This hands each such holding — as held NOW (after any secondary-market sale;
shares bought on the market included) — to the mint task, which mints them to
the owner's wallet and completes the investment again.

Market trades whose on-chain transfer could not run because the seller's
tokens were never minted are closed (not_required): the owners now receive
their current holdings directly.

    python manage.py mint_unminted_holdings            # dry run: list what would be minted
    python manage.py mint_unminted_holdings --apply

A failed backfill mint alerts staff and is never auto-refunded.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from investments.models import Investment, InvestmentStatus


class Command(BaseCommand):
    help = 'Mint on-chain the shares of tokenized-property purchases completed on the ledger only.'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true', help='Queue the mints (default: dry run).')

    def handle(self, *args, apply=False, **options):
        from marketplace.models import TradeTransaction

        qs = (Investment.objects
              .filter(status=InvestmentStatus.COMPLETED, token_amount__gt=0,
                      property_investment__status='tokenized')
              .exclude(property_investment__smart_contract_address__isnull=True)
              .exclude(property_investment__smart_contract_address='')
              .filter(Q(transaction_hash__isnull=True) | Q(transaction_hash=''))
              .select_related('user', 'property_investment')
              .order_by('completed_at'))

        rows = list(qs)
        for inv in rows:
            dest = inv.destination_wallet or inv.user.wallet_address or '—'
            kind = (inv.payment_method or {}).get('type', '?')
            self.stdout.write(f'{inv.pk}  {inv.user.email:<34} {inv.token_amount:>6} x {inv.property_investment.title} '
                              f'[{kind}] -> {dest}')
        trades = TradeTransaction.objects.filter(status='completed', chain_status__in=['pending', 'failed', 'needs_review'],
                                                 transaction_hash__isnull=True)
        self.stdout.write(f'\n{len(rows)} holding(s) to mint; {trades.count()} market trade(s) to close without a transfer.')
        if not apply:
            self.stdout.write(self.style.WARNING('Dry run — nothing changed. Re-run with --apply.'))
            return

        with transaction.atomic():
            for inv in rows:
                inv.payment_method = {**(inv.payment_method or {}), 'backfill_mint': True}
                inv.mint_retry_count = 0
                inv.mint_error = None
                inv.save(update_fields=['payment_method', 'mint_retry_count', 'mint_error'])
                inv.mark_payment_confirmed()  # -> PENDING_MINT; the mint task completes it
            closed = trades.update(chain_status='not_required', chain_updated_at=timezone.now(),
                                   chain_error='Closed by mint_unminted_holdings: the owners received their current '
                                               'holdings by mint, so no transfer is needed.')
        self.stdout.write(self.style.SUCCESS(f'{len(rows)} holding(s) queued for minting; {closed} trade(s) closed.'))
