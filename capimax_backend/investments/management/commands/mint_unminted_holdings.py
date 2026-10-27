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

--unlanded fixes owners whose on-chain balance is short of the platform (old
seed / demo rows): every recorded transaction is read on the network for the
shares it actually delivered to the owner. A hash that never landed sends the
holding back to the mint queue; a transaction that delivered less (or to
another wallet) gets the missing shares minted now. An owner is only fixed when
the missing shares add up exactly to the shortfall; anything else is listed for
a look. Custody records are reset to the on-chain balance first so the new
mints are not counted twice.

A failed backfill mint alerts staff and is never auto-refunded.
"""

from django.core.management.base import BaseCommand, CommandError
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
        from blockchain.models import TokenBalance
        from investments.chain_holdings import compare, delivered

        cache: dict = {}
        plan = []
        for row in compare():
            gap = row['platform'] - row['on_chain']
            if gap == 0:
                continue
            user, prop = row['user'], row['property']
            invs = (Investment.objects.filter(user=user, property_investment=prop,
                                              status=InvestmentStatus.COMPLETED, token_amount__gt=0)
                    .exclude(transaction_hash__isnull=True).exclude(transaction_hash=''))
            fixes = []  # (investment, shares missing, did its transaction land?)
            for inv in invs:
                got = delivered(row['contract'], inv.transaction_hash, row['addresses'], cache)
                missing = inv.token_amount - (got or 0)
                if missing > 0:
                    fixes.append((inv, missing, got is not None))
            missing_total = sum(m for _, m, _ in fixes)
            head = f'{user.email} {prop.title}: platform {row["platform"]}, on-chain {row["on_chain"]}'
            if gap < 0 or missing_total != gap:
                self.stdout.write(self.style.WARNING(
                    f'NEEDS A LOOK  {head} — recorded transactions are short {missing_total}, shortfall {gap}'))
                continue
            self.stdout.write(f'FIX  {head} — ' + '; '.join(
                f'{inv.transaction_hash[:12]}… recorded {inv.token_amount}, '
                + (f'delivered {inv.token_amount - m} -> mint {m}' if landed else f'never landed -> re-mint {m}')
                for inv, m, landed in fixes))
            plan.append((row, fixes))

        self.stdout.write(f'\n{len(plan)} owner(s) to fix.')
        if not apply:
            self.stdout.write(self.style.WARNING('Dry run — nothing changed. Re-run with --apply.'))
            return

        for row, fixes in plan:
            with transaction.atomic():
                # custody records follow the chain, so the new mints are not counted twice
                token = self._token(row['contract'], cache)
                for tb in TokenBalance.objects.select_for_update().filter(
                        user=row['user'], property_reference=row['property'], contract=row['contract']):
                    actual = self._balance(token, tb.wallet_address)
                    if tb.balance != actual:
                        tb.balance = actual
                        tb.save(update_fields=['balance'])
                for inv, _, landed in fixes:
                    if not landed:  # the whole holding goes back to the mint queue
                        inv.payment_method = {**(inv.payment_method or {}), 'backfill_mint': True,
                                              'unlanded_hash': inv.transaction_hash}
                        inv.transaction_hash = None
                        inv.mint_retry_count = 0
                        inv.mint_error = None
                        inv.save(update_fields=['payment_method', 'transaction_hash', 'mint_retry_count',
                                                'mint_error'])
                        inv.mark_payment_confirmed()
            for inv, missing, landed in fixes:
                if landed:
                    self._mint_missing(row['contract'], inv, missing)
        self.stdout.write(self.style.SUCCESS(f'{len(plan)} owner(s) fixed or queued.'))

    @staticmethod
    def _token(contract, cache):
        from web3 import Web3

        from investments.chain_holdings import _web3
        w3, _ = _web3(contract, cache)
        return w3.eth.contract(address=Web3.to_checksum_address(contract.contract_address), abi=contract.abi)

    @staticmethod
    def _balance(token, address) -> int:
        from web3 import Web3

        from investments.chain_holdings import TOKEN_ID
        return int(token.functions.balanceOf(Web3.to_checksum_address(address), TOKEN_ID).call()) if address else 0

    def _mint_missing(self, contract, inv, amount):
        """Mint the shares a recorded transaction did not deliver; the investment keeps its original hash."""
        from blockchain.models import TokenBalance, TokenTransaction
        from blockchain.services.web3_service import Web3Service

        dest = inv.destination_wallet or inv.user.wallet_address
        svc = Web3Service()
        if not svc.initialize_network(str(contract.network_id)):
            raise CommandError('Could not connect to the blockchain network.')
        result = svc.call_contract_function(contract_address=contract.contract_address, abi=contract.abi,
                                            function_name='mintTokens', args=[0, dest, amount, False, 0],
                                            gas_settings={'gas_limit': 500000, 'gas_price': None})
        if not (result and result.get('status') == 1):
            raise CommandError(f'Mint of {amount} for {inv.pk} failed: {(result or {}).get("error")}')
        with transaction.atomic():
            TokenTransaction.objects.create(
                contract=contract, property_reference=inv.property_investment, user=inv.user,
                investment_reference=inv, transaction_type='mint', transaction_hash=result['transaction_hash'],
                from_address=svc.account.address if svc.account else '', to_address=dest, token_amount=amount,
                status='submitted', block_number=result.get('block_number'), gas_used=result.get('gas_used'))
            tb, _ = TokenBalance.objects.select_for_update().get_or_create(
                contract=contract, user=inv.user, property_reference=inv.property_investment, token_id=0,
                wallet_address=dest, defaults={'balance': 0})
            tb.balance = (tb.balance or 0) + amount
            tb.save(update_fields=['balance'])
            top_ups = [*(inv.payment_method or {}).get('top_up_mints', []),
                       {'hash': result['transaction_hash'], 'amount': amount}]
            inv.payment_method = {**(inv.payment_method or {}), 'top_up_mints': top_ups}
            inv.save(update_fields=['payment_method'])
        self.stdout.write(f'  minted {amount} for {inv.pk} -> {result["transaction_hash"]}')
