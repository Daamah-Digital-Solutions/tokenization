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

--unlanded also re-mints holdings whose recorded transaction hash never landed
on-chain (old seed / demo rows), for owners whose on-chain balance is short of
the platform. Every hash is checked on the network first, and an owner is only
fixed when the rows that did not land add up exactly to the shortfall; anything
else is listed for a look. Their custody records are reset to the on-chain
balance so the new mint is not counted twice.

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
        parser.add_argument('--unlanded', action='store_true',
                            help='Re-mint holdings whose recorded transaction never landed on-chain.')

    def handle(self, *args, apply=False, unlanded=False, **options):
        if unlanded:
            return self._unlanded(apply)
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

    def _unlanded(self, apply):
        from web3 import Web3

        from blockchain.models import TokenBalance
        from investments.chain_holdings import TOKEN_ID, _web3, compare, tx_landed

        cache: dict = {}
        plan = []
        for row in compare():
            gap = row['platform'] - row['on_chain']
            if gap == 0:
                continue
            user, prop = row['user'], row['property']
            invs = list(Investment.objects.filter(user=user, property_investment=prop,
                                                  status=InvestmentStatus.COMPLETED, token_amount__gt=0)
                        .exclude(transaction_hash__isnull=True).exclude(transaction_hash=''))
            lost = [inv for inv in invs if not tx_landed(row['contract'], inv.transaction_hash, cache)]
            lost_total = sum(inv.token_amount for inv in lost)
            head = f'{user.email} {prop.title}: platform {row["platform"]}, on-chain {row["on_chain"]}'
            if gap < 0 or lost_total != gap:
                self.stdout.write(self.style.WARNING(
                    f'NEEDS A LOOK  {head} — {len(lost)} row(s) not on-chain hold {lost_total}, shortfall {gap}'))
                continue
            self.stdout.write(f'FIX  {head} — re-mint {len(lost)} row(s): '
                              + ', '.join(f'{inv.token_amount} ({inv.transaction_hash[:14]}…)' for inv in lost))
            plan.append((row, lost))

        self.stdout.write(f'\n{len(plan)} owner(s) to fix.')
        if not apply:
            self.stdout.write(self.style.WARNING('Dry run — nothing changed. Re-run with --apply.'))
            return

        with transaction.atomic():
            for row, lost in plan:
                # custody records follow the chain, so the new mint is not counted twice
                w3, _ = _web3(row['contract'], cache)
                token = w3.eth.contract(address=Web3.to_checksum_address(row['contract'].contract_address),
                                        abi=row['contract'].abi)
                for tb in TokenBalance.objects.select_for_update().filter(
                        user=row['user'], property_reference=row['property'], contract=row['contract']):
                    actual = int(token.functions.balanceOf(Web3.to_checksum_address(tb.wallet_address),
                                                           TOKEN_ID).call()) if tb.wallet_address else 0
                    if tb.balance != actual:
                        tb.balance = actual
                        tb.save(update_fields=['balance'])
                for inv in lost:
                    inv.payment_method = {**(inv.payment_method or {}), 'backfill_mint': True,
                                          'unlanded_hash': inv.transaction_hash}
                    inv.transaction_hash = None
                    inv.mint_retry_count = 0
                    inv.mint_error = None
                    inv.save(update_fields=['payment_method', 'transaction_hash', 'mint_retry_count', 'mint_error'])
                    inv.mark_payment_confirmed()
        self.stdout.write(self.style.SUCCESS(f'{sum(len(lost) for _, lost in plan)} holding(s) queued for minting.'))
