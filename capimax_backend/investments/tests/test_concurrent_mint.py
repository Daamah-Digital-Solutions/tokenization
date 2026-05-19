"""
Concurrency tests for the mint pipeline.

These tests target the two race conditions Phase 1 closed:

1. Two `process_pending_mints` dispatchers running in parallel must NOT
   process the same investment twice.
2. Two `process_single_mint` workers running in parallel must NOT both
   succeed in minting the same investment (the Redis lock + tx_hash
   idempotency check guarantees this).

The blockchain layer is mocked so the tests are deterministic and fast.
What we are exercising is the locking/state-machine logic in
`investments.tasks`.
"""

from __future__ import annotations

import threading
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, TransactionTestCase
from django.utils import timezone

from investments.models import Investment, InvestmentStatus
from investments import tasks as mint_tasks


User = get_user_model()


def _make_user(email='inv@example.com'):
    user = User.objects.create_user(
        email=email,
        password='TestPass123!',
        first_name='Test',
        last_name='Investor',
    )
    user.wallet_address = '0x' + 'b' * 40
    user.save(update_fields=['wallet_address'])
    return user


def _make_property(*, owner=None, token_price=Decimal('10.00'),
                   total_tokens=10_000, status='tokenized'):
    """Create a minimal Property suitable for mint tests.

    The schema for Property is large; we only set the fields the mint
    pipeline actually touches and rely on defaults for the rest.
    """
    from properties.models import Property
    if owner is None:
        owner = _make_user(email='owner@example.com')
    return Property.objects.create(
        title='Test Property',
        property_type='residential',
        property_category='ready_property',
        city='Test City',
        country='US',
        address='123 Test St',
        total_value=Decimal('1000000.00'),
        token_price=token_price,
        total_tokens=total_tokens,
        status=status,
        smart_contract_address='0x' + 'a' * 40,
        owner=owner,
    )


def _make_pending_investment(*, user, prop, tokens=100):
    return Investment.objects.create(
        user=user,
        property_investment=prop,
        token_amount=tokens,
        investment_amount=Decimal('1000.00'),
        status=InvestmentStatus.PENDING_MINT,
        mint_scheduled_at=timezone.now() - timezone.timedelta(seconds=1),
    )


# ---------------------------------------------------------------------------
# Dispatcher concurrency
# ---------------------------------------------------------------------------

class ProcessPendingMintsDispatcherTests(TransactionTestCase):
    """`process_pending_mints` must atomically claim each investment."""

    def test_concurrent_dispatchers_claim_each_investment_once(self):
        user = _make_user()
        prop = _make_property()
        invs = [_make_pending_investment(user=user, prop=prop) for _ in range(5)]

        claimed_ids: list[str] = []
        lock = threading.Lock()

        # Patch `process_single_mint.delay` to a no-op so we can observe
        # what would have been queued.
        def fake_delay(inv_id):
            with lock:
                claimed_ids.append(inv_id)

        with patch.object(mint_tasks.process_single_mint, 'delay', side_effect=fake_delay):
            threads = [
                threading.Thread(target=lambda: mint_tasks.process_pending_mints.run())
                for _ in range(4)
            ]
            for t in threads:
                t.start()
            for t in threads:
                t.join()

        # Every investment claimed exactly once
        self.assertEqual(sorted(claimed_ids), sorted(str(i.id) for i in invs))
        self.assertEqual(len(claimed_ids), len(set(claimed_ids)))

        # All investments now MINTING (claimed by exactly one dispatcher)
        for inv in invs:
            inv.refresh_from_db()
            self.assertEqual(inv.status, InvestmentStatus.MINTING)


# ---------------------------------------------------------------------------
# Single mint executor — Redis lock + idempotency
# ---------------------------------------------------------------------------

class ProcessSingleMintLockTests(TransactionTestCase):
    """The distributed lock + tx_hash idempotency must prevent double-mint."""

    def test_double_invocation_does_not_double_mint(self):
        user = _make_user()
        prop = _make_property()
        inv = _make_pending_investment(user=user, prop=prop)

        # Pre-set MINTING since the dispatcher would have done this.
        inv.status = InvestmentStatus.MINTING
        inv.save(update_fields=['status'])

        # Mock the blockchain call to a deterministic success.
        fake_tx_hash = '0x' + 'c' * 64

        call_count = {'n': 0}

        def fake_blockchain_mint(investment):
            call_count['n'] += 1
            return {
                'success': True,
                'transaction_hash': fake_tx_hash,
                'tokens_minted': investment.token_amount,
            }

        with patch.object(mint_tasks, '_execute_blockchain_mint', side_effect=fake_blockchain_mint):
            # First call mints successfully.
            r1 = mint_tasks.process_single_mint.run(str(inv.id))
            # Second call sees the tx_hash and short-circuits.
            r2 = mint_tasks.process_single_mint.run(str(inv.id))

        self.assertEqual(call_count['n'], 1, 'Blockchain mint should only be called once')
        self.assertTrue(r1.get('success'))
        # r2 must have skipped (either lock held or idempotency hit). Either
        # way it must NOT have minted again.
        self.assertTrue(
            r2.get('skipped') or r2.get('reason') in {'already_minted', 'lock_held', 'invalid_status'},
            f'Second call should not have re-minted; got {r2!r}',
        )

        inv.refresh_from_db()
        self.assertEqual(inv.status, InvestmentStatus.COMPLETED)
        self.assertEqual(inv.transaction_hash, fake_tx_hash)
        # Lockup snapshot should be set
        self.assertIsNotNone(inv.lockup_end_date)


class AutoRefundOnTerminalFailureTests(TransactionTestCase):
    """When mint exhausts retries, `auto_refund_failed_mint` is invoked."""

    def test_terminal_failure_triggers_refund_task(self):
        user = _make_user()
        prop = _make_property()
        inv = _make_pending_investment(user=user, prop=prop)
        inv.status = InvestmentStatus.MINTING
        # Pretend this is already the last allowed attempt.
        inv.mint_retry_count = Investment.MAX_MINT_RETRIES - 1
        inv.save(update_fields=['status', 'mint_retry_count'])

        with patch.object(
            mint_tasks, '_execute_blockchain_mint',
            return_value={'success': False, 'error': 'rpc_down'},
        ), patch.object(
            mint_tasks.auto_refund_failed_mint, 'delay',
        ) as fake_refund:
            mint_tasks.process_single_mint.run(str(inv.id))

        inv.refresh_from_db()
        self.assertEqual(inv.status, InvestmentStatus.MINT_FAILED)
        fake_refund.assert_called_once_with(str(inv.id))
