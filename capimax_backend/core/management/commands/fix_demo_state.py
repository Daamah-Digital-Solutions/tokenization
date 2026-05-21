"""
One-shot data fix for staging demo accounts.

Run after seed_demo_data + smoke_test_mint to:
  1. Reset every user's wallet_address to the deterministic custodial
     wallet derived from PLATFORM_CUSTODY_MASTER_SEED. Earlier versions of
     smoke_test_mint overwrote investor wallets with the platform signer,
     which contaminated demo accounts.
  2. Deduplicate (user, property) Investment rows that piled up from UI
     testing. Keeps the most realistic-looking row (highest investment_amount,
     ties broken by oldest created_at) and deletes the rest.

Safe to re-run — the second invocation finds nothing to fix.

Usage:
    python manage.py fix_demo_state
    python manage.py fix_demo_state --dry-run
"""

from collections import defaultdict
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count

from accounts.custody import derive_custodial_wallet
from accounts.models import User
from investments.models import Investment


class Command(BaseCommand):
    help = "Reset demo user wallets to custodial and dedupe duplicate investments."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Print actions without modifying the database.",
        )

    def handle(self, *args, **opts):
        dry = opts['dry_run']
        self.stdout.write(self.style.MIGRATE_HEADING(
            f"fix_demo_state ({'dry-run' if dry else 'live'})"
        ))

        self._fix_wallets(dry)
        self._dedupe_investments(dry)

        self.stdout.write(self.style.SUCCESS("\nDone."))

    # ----- 1. Reset wallets -------------------------------------------------
    def _fix_wallets(self, dry):
        self.stdout.write("\n[1/2] Reset wallet_address to custodial derivation")
        mismatches = []
        for user in User.objects.all().order_by('email'):
            derived = derive_custodial_wallet(user.pk).address
            current = (user.wallet_address or '').strip()
            if current.lower() != derived.lower():
                mismatches.append((user, current, derived))

        if not mismatches:
            self.stdout.write("  All wallets already custodial.")
            return

        for user, current, derived in mismatches:
            self.stdout.write(
                f"  {user.email}: {current or '(empty)'} → {derived}"
            )
            if not dry:
                user.wallet_address = derived
                user.save(update_fields=['wallet_address'])

        verb = 'Would reset' if dry else 'Reset'
        self.stdout.write(self.style.SUCCESS(
            f"  {verb} {len(mismatches)} wallets."
        ))

    # ----- 2. Dedupe investments --------------------------------------------
    def _dedupe_investments(self, dry):
        self.stdout.write("\n[2/2] Deduplicate (user, property) investments")

        groups = defaultdict(list)
        for inv in Investment.objects.select_related(
            'user', 'property_investment'
        ).order_by('created_at'):
            groups[(inv.user_id, inv.property_investment_id)].append(inv)

        total_deleted = 0
        for key, invs in groups.items():
            if len(invs) <= 1:
                continue
            # Pick the "best" survivor:
            #   - prefer rows that already have a real (non-demo) tx hash
            #   - then highest investment_amount
            #   - then oldest (most realistic-looking seed)
            def score(i):
                has_real_hash = bool(
                    i.transaction_hash
                    and i.transaction_hash.startswith('0x')
                    and not i.transaction_hash.startswith('0xdemo')
                    and 'demo' not in (i.transaction_hash or '').lower()
                )
                return (
                    1 if has_real_hash else 0,
                    float(i.investment_amount or 0),
                    -i.created_at.timestamp(),
                )

            invs_sorted = sorted(invs, key=score, reverse=True)
            keep = invs_sorted[0]
            drop = invs_sorted[1:]
            email = keep.user.email if keep.user else '(no user)'
            title = (keep.property_investment.title
                     if keep.property_investment else '(no property)')
            self.stdout.write(
                f"  {email} | {title}: keeping "
                f"tokens={keep.token_amount} amt={keep.investment_amount} "
                f"status={keep.status} hash={(keep.transaction_hash or '')[:18]}; "
                f"dropping {len(drop)} dup(s)"
            )
            if not dry:
                drop_ids = [d.id for d in drop]
                with transaction.atomic():
                    # Cascade-delete protected children first.
                    # SubscriptionAgreement uses on_delete=PROTECT on
                    # `investment`, so plain queryset.delete() refuses.
                    self._cascade_delete_dependents(drop_ids)
                    Investment.objects.filter(id__in=drop_ids).delete()
            total_deleted += len(drop)

        if total_deleted == 0:
            self.stdout.write("  No duplicates found.")
        else:
            verb = 'Would delete' if dry else 'Deleted'
            self.stdout.write(self.style.SUCCESS(
                f"  {verb} {total_deleted} duplicate investments."
            ))

    def _cascade_delete_dependents(self, investment_ids):
        """Delete child rows that block Investment deletion via PROTECT.

        SubscriptionAgreement is the only currently-known protected child
        of Investment (`investments/agreements.py`). Add more here if other
        protected FKs get introduced.
        """
        try:
            from legal.models import SubscriptionAgreement
        except ImportError:
            return
        deleted, _ = SubscriptionAgreement.objects.filter(
            investment_id__in=investment_ids
        ).delete()
        if deleted:
            self.stdout.write(
                f"    cascade: removed {deleted} SubscriptionAgreement row(s)"
            )
