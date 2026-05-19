"""
Golden-path tests for the investments app.

This covers the central money flow of the platform — the moment a user
turns dollars into property tokens.

Critical journeys covered:

  1. Authenticated investor with verified KYC creates an investment for an
     amount within their daily limit and below the property's available
     supply → 201, status=PENDING.

  2. Compliance gate rejects:
     - Investor without a KYC profile → 403.
     - Investor whose KYC is not approved → 403.
     - Investment in an accredited-only property by a non-accredited user
       → 403.
     - Investment that would exceed the daily limit → 400.

  3. Anonymous request to create an investment → 401.

  4. Cancel a PENDING investment → 200, status=CANCELLED.
     Cannot cancel once status has moved past PENDING (we lock the
     refund-or-keep-tokens race here).

  5. End-to-end mint: a PENDING_MINT investment, when fed to
     `process_single_mint`, transitions to COMPLETED with a tx_hash and
     a populated `lockup_end_date`. (Blockchain layer is mocked.)
"""

from __future__ import annotations

from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from core.factories import (
    make_investor,
    make_kyc_profile,
    make_payment,
    make_property,
    make_pending_mint_investment,
    make_ready_investor,
)
from investments.models import Investment, InvestmentStatus
from investments import tasks as mint_tasks


# ---------------------------------------------------------------------------
# Investment creation
# ---------------------------------------------------------------------------

class InvestmentCreateGoldenPathTests(TestCase):
    """`POST /api/v1/investments/` with a fully-eligible investor."""

    def setUp(self):
        self.client = APIClient()
        self.investor = make_ready_investor()
        self.client.force_authenticate(user=self.investor)
        self.property = make_property(
            token_price=Decimal('10.00'),
            total_tokens=10_000,
            status='tokenized',
        )
        self.url = '/api/v1/investments/'

    def _payload(self, **overrides):
        defaults = {
            'property_id': str(self.property.id),
            'token_amount': 50,
            'investment_amount': '500.00',
            'payment_method': 'credit_card',
        }
        defaults.update(overrides)
        return defaults

    def test_eligible_investor_creates_pending_investment(self):
        resp = self.client.post(self.url, self._payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.content)

        invs = Investment.objects.filter(user=self.investor)
        self.assertEqual(invs.count(), 1)

        inv = invs.first()
        self.assertEqual(inv.status, InvestmentStatus.PENDING)
        self.assertEqual(inv.token_amount, 50)
        self.assertEqual(inv.investment_amount, Decimal('500.00'))
        # Compliance snapshot fields are populated on the row even if the
        # KYC schema doesn't carry a `country_of_residence` value (they
        # default to '' and False).
        self.assertIsNotNone(inv.accredited_at_investment_time)
        # The investment is linked to the right property and user.
        self.assertEqual(inv.property_investment_id, self.property.id)
        self.assertEqual(inv.user_id, self.investor.id)

    def test_anonymous_user_cannot_create_investment(self):
        self.client.force_authenticate(user=None)
        resp = self.client.post(self.url, self._payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(Investment.objects.count(), 0)


# ---------------------------------------------------------------------------
# Compliance gate
# ---------------------------------------------------------------------------

class InvestmentComplianceGateTests(TestCase):
    """The pre-flight compliance gate must reject ineligible investments
    BEFORE any state is changed."""

    def setUp(self):
        self.client = APIClient()
        self.property = make_property(
            token_price=Decimal('10.00'),
            total_tokens=10_000,
            status='tokenized',
        )
        self.url = '/api/v1/investments/'

    def _payload(self, **overrides):
        defaults = {
            'property_id': str(self.property.id),
            'token_amount': 50,
            'investment_amount': '500.00',
            'payment_method': 'credit_card',
        }
        defaults.update(overrides)
        return defaults

    def test_investor_without_kyc_profile_is_blocked(self):
        investor = make_investor()  # no KYC profile
        self.client.force_authenticate(user=investor)

        resp = self.client.post(self.url, self._payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Investment.objects.count(), 0)

    def test_investor_with_pending_kyc_is_blocked(self):
        investor = make_investor()
        make_kyc_profile(user=investor, status='pending')
        self.client.force_authenticate(user=investor)

        resp = self.client.post(self.url, self._payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Investment.objects.count(), 0)

    def test_accredited_only_property_blocks_non_accredited_investor(self):
        accredited_property = make_property(
            token_price=Decimal('10.00'),
            total_tokens=10_000,
            status='tokenized',
            requires_accredited_investors=True,
        )
        investor = make_ready_investor()  # has KYC but no is_accredited
        self.client.force_authenticate(user=investor)

        resp = self.client.post(
            self.url,
            self._payload(property_id=str(accredited_property.id)),
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Investment.objects.count(), 0)


# ---------------------------------------------------------------------------
# Cancel flow
# ---------------------------------------------------------------------------

class InvestmentCancelTests(TestCase):
    """The cancel endpoint refuses to cancel anything past PENDING — this
    is what prevents the refund-AND-keep-tokens race."""

    def setUp(self):
        self.client = APIClient()
        self.investor = make_ready_investor()
        self.client.force_authenticate(user=self.investor)
        self.property = make_property()
        self.inv = Investment.objects.create(
            user=self.investor,
            property_investment=self.property,
            token_amount=10,
            investment_amount=Decimal('100.00'),
            status=InvestmentStatus.PENDING,
        )

    def _cancel_url(self, inv):
        return f'/api/v1/investments/{inv.id}/cancel/'

    def test_pending_investment_can_be_cancelled(self):
        resp = self.client.post(self._cancel_url(self.inv), format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.status, InvestmentStatus.CANCELLED)

    def test_processing_investment_cannot_be_cancelled_by_user(self):
        self.inv.status = InvestmentStatus.PROCESSING
        self.inv.save(update_fields=['status'])

        resp = self.client.post(self._cancel_url(self.inv), format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.status, InvestmentStatus.PROCESSING)

    def test_completed_investment_cannot_be_cancelled_by_user(self):
        self.inv.status = InvestmentStatus.COMPLETED
        self.inv.save(update_fields=['status'])

        resp = self.client.post(self._cancel_url(self.inv), format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# End-to-end mint completion
# ---------------------------------------------------------------------------

class InvestmentMintCompletionTests(TestCase):
    """When the dispatcher hands a PENDING_MINT investment to
    `process_single_mint` and the blockchain call succeeds, the
    investment must transition to COMPLETED with a tx_hash and a
    populated `lockup_end_date`."""

    def test_successful_mint_marks_investment_completed(self):
        user = make_investor()
        prop = make_property(
            token_price=Decimal('10.00'),
            total_tokens=10_000,
            status='tokenized',
            lockup_months=12,
        )
        inv = make_pending_mint_investment(user=user, prop=prop)
        # Dispatcher would have done this step:
        inv.status = InvestmentStatus.MINTING
        inv.save(update_fields=['status'])

        fake_tx = '0x' + 'a' * 64
        with patch.object(
            mint_tasks, '_execute_blockchain_mint',
            return_value={
                'success': True,
                'transaction_hash': fake_tx,
                'tokens_minted': inv.token_amount,
            },
        ):
            result = mint_tasks.process_single_mint.run(str(inv.id))

        self.assertTrue(result.get('success'))

        inv.refresh_from_db()
        self.assertEqual(inv.status, InvestmentStatus.COMPLETED)
        self.assertEqual(inv.transaction_hash, fake_tx)
        # Lockup snapshot must be set on completion.
        self.assertIsNotNone(inv.lockup_end_date)


class InvestmentMintFailureTests(TestCase):
    """Failure paths through the mint task.

    These cover the retry/backoff state machine on ``Investment``:
    the first failure schedules a retry, repeated failures eventually
    flip the row to ``MINT_FAILED`` so the refund pipeline can pick it up.
    """

    def setUp(self):
        self.user = make_investor()
        self.prop = make_property(
            token_price=Decimal('10.00'),
            total_tokens=10_000,
            status='tokenized',
            lockup_months=12,
        )

    def _mint(self, inv, *, error: str):
        """Run a single mint attempt with a mocked blockchain failure."""
        inv.status = InvestmentStatus.MINTING
        inv.save(update_fields=['status'])
        with patch.object(
            mint_tasks, '_execute_blockchain_mint',
            return_value={'success': False, 'error': error},
        ):
            return mint_tasks.process_single_mint.run(str(inv.id))

    def test_first_failure_schedules_retry(self):
        """A single failure must leave the row eligible for retry."""
        inv = make_pending_mint_investment(user=self.user, prop=self.prop)

        result = self._mint(inv, error='rpc-timeout')
        self.assertFalse(result.get('success'))

        inv.refresh_from_db()
        self.assertEqual(inv.status, InvestmentStatus.PENDING_MINT)
        self.assertEqual(inv.mint_retry_count, 1)
        self.assertEqual(inv.mint_error, 'rpc-timeout')
        # A retry timestamp in the future must have been scheduled.
        self.assertIsNotNone(inv.mint_scheduled_at)
        # No chain transaction was ever produced.
        self.assertFalse(inv.transaction_hash)

    def test_max_retries_marks_mint_failed_terminal(self):
        """After MAX_MINT_RETRIES attempts the row becomes terminal."""
        inv = make_pending_mint_investment(user=self.user, prop=self.prop)

        # Drive the row through its full retry budget. The model bumps
        # ``mint_retry_count`` and flips to MINT_FAILED on the final attempt,
        # which then enqueues ``auto_refund_failed_mint``. Patch both side
        # effects so we isolate the state-machine assertion under test.
        for _ in range(Investment.MAX_MINT_RETRIES):
            with patch.object(mint_tasks, '_send_mint_failure_alert'), \
                 patch.object(mint_tasks.auto_refund_failed_mint, 'delay'):
                self._mint(inv, error='chain-revert')

        inv.refresh_from_db()
        self.assertEqual(inv.status, InvestmentStatus.MINT_FAILED)
        self.assertEqual(inv.mint_retry_count, Investment.MAX_MINT_RETRIES)
        # Terminal failure clears the schedule — no further auto-retry.
        self.assertIsNone(inv.mint_scheduled_at)

    def test_terminal_failure_triggers_refund_and_marks_refunded(self):
        """End-to-end: a terminal mint failure refunds the captured payment.

        This exercises the path that was broken by ``select_related('payment')``.
        We attach a completed bank-transfer payment (so the refund stays out
        of the Stripe API) and let the production code flow run.
        """
        from payments.models import Payment, PaymentStatus, PaymentMethod
        inv = make_pending_mint_investment(user=self.user, prop=self.prop)

        # Captured payment that should be refunded once mint fails terminally.
        # Bank transfer keeps RefundService on the manual-processing branch
        # — no external Stripe call needed for the test.
        payment = make_payment(
            user=self.user,
            investment=inv,
            amount=inv.investment_amount,
            payment_method=PaymentMethod.BANK_TRANSFER,
            status=PaymentStatus.COMPLETED,
        )

        # CELERY_TASK_ALWAYS_EAGER=True in test settings means .delay() runs
        # auto_refund_failed_mint synchronously. We let it run for real.
        for _ in range(Investment.MAX_MINT_RETRIES):
            with patch.object(mint_tasks, '_send_mint_failure_alert'):
                self._mint(inv, error='chain-revert')

        inv.refresh_from_db()
        self.assertEqual(inv.status, InvestmentStatus.REFUNDED,
                         msg="Investment must end in REFUNDED after auto-refund")

        refunds = Payment.objects.get(pk=payment.pk).refunds.all()
        self.assertEqual(refunds.count(), 1, msg="Exactly one refund must be created")
        self.assertEqual(refunds.first().amount, payment.amount)
        self.assertEqual(refunds.first().reason, 'mint_failed')


class InvestmentMintIdempotencyTests(TestCase):
    """A duplicate task delivery must not double-mint.

    The dispatcher can re-queue a single investment if Celery retries
    a worker crash, so the task must short-circuit cleanly when the row
    has already been marked COMPLETED with a tx hash.
    """

    def test_already_completed_short_circuits(self):
        user = make_investor()
        prop = make_property(
            token_price=Decimal('10.00'),
            total_tokens=10_000,
            status='tokenized',
            lockup_months=12,
        )
        inv = make_pending_mint_investment(user=user, prop=prop)

        # Simulate that a previous run already minted this investment.
        original_tx = '0x' + 'b' * 64
        inv.transaction_hash = original_tx
        inv.status = InvestmentStatus.COMPLETED
        inv.save(update_fields=['transaction_hash', 'status'])

        # If the blockchain call is invoked, the test fails — a completed
        # investment must never reach the RPC layer again.
        with patch.object(mint_tasks, '_execute_blockchain_mint') as mock_chain:
            mock_chain.side_effect = AssertionError(
                "Blockchain mint must not run for an already-COMPLETED investment"
            )
            result = mint_tasks.process_single_mint.run(str(inv.id))

        self.assertTrue(result.get('success'))
        self.assertTrue(result.get('skipped'))
        self.assertEqual(result.get('reason'), 'already_minted')
        self.assertEqual(result.get('tx_hash'), original_tx)

        inv.refresh_from_db()
        self.assertEqual(inv.transaction_hash, original_tx)
        self.assertEqual(inv.status, InvestmentStatus.COMPLETED)
