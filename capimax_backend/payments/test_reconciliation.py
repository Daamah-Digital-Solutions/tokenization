"""Reconciliation checks report what does not add up."""

from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from core.factories import make_admin, make_ready_investor
from payments.models import Payment, WalletBalance
from payments.reconciliation import run_checks, stuck_payments, wallets_match_ledger


class ReconciliationTests(TestCase):
    def test_wallet_changed_outside_the_ledger_is_reported(self):
        user = make_ready_investor(wallet_balance=Decimal('0.00'))
        WalletBalance.credit(user, Decimal('50'), description='x')
        self.assertEqual(wallets_match_ledger(), [])
        WalletBalance.objects.filter(user=user).update(available_balance=Decimal('70'))
        self.assertEqual(len(wallets_match_ledger()), 1)

    def test_stuck_card_payment(self):
        user = make_ready_investor()
        p = Payment.objects.create(user=user, amount=Decimal('10'), net_amount=Decimal('10'), currency='USD',
                                   payment_method='credit_card', status='pending')
        Payment.objects.filter(pk=p.pk).update(created_at=timezone.now() - timedelta(days=2))
        self.assertEqual(len(stuck_payments()), 1)

    def test_admin_page(self):
        c = APIClient()
        c.force_login(make_admin())
        r = c.get('/admin/payments/platformfeesettings/reconciliation/')
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, 'Rent payouts add up')
        self.assertEqual(len(run_checks()), 6)
