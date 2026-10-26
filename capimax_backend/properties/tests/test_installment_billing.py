"""Installments the PropShare way: 4% fee, shares held, down payment at start, hourly autopay, reminders."""

from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from investments.purchase import available_shares
from payments.models import PlatformFeeSettings, WalletBalance, WalletTransaction
from properties.installment_billing import run_due
from properties.models import ConstructionInstallment
from properties.tests.test_payment_plan import make_property


def balance(user):
    return WalletBalance.objects.get(user=user, currency='USD').available_balance


@patch('properties.services.InstallmentProcessingService._release_tokens_to_investor', lambda *a, **k: None)
class InstallmentBillingTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email='own-ib@example.com', password='x12345678',
                                              role=UserRole.PROPERTY_OWNER)
        self.buyer = User.objects.create_user(email='buy-ib@example.com', password='x12345678',
                                              role=UserRole.INVESTOR)
        WalletBalance.objects.create(user=self.buyer, currency='USD', available_balance=Decimal('20000.00'))
        self.client = APIClient()
        self.client.force_authenticate(self.buyer)
        # 100 shares x $100 = $10,000: down payment 25% + 3 monthly installments of $2,500
        self.prop = make_property(self.owner, installment_down_payment_percent=Decimal('25'),
                                  installment_count=3, installment_frequency='monthly', total_tokens=1000)

    def _create(self, tokens=100):
        return self.client.post('/api/v1/properties/installments/', {
            'property_investment': str(self.prop.id), 'token_allocation': tokens}, format='json')

    def test_start_charges_down_payment_with_fee_and_holds_shares(self):
        r = self._create()
        self.assertEqual(r.status_code, 201, r.content)
        plan = ConstructionInstallment.objects.get(investor=self.buyer)
        self.assertEqual(plan.fee_rate, Decimal('4.00'))
        self.assertEqual(plan.payments_made, 1)
        self.assertEqual(plan.fees_paid, Decimal('100.00'))
        self.assertEqual(balance(self.buyer), Decimal('20000.00') - Decimal('2600.00'))  # 2,500 + 4%
        fee = WalletTransaction.objects.get(user=self.buyer, transaction_type='fee')
        self.assertEqual(fee.amount, Decimal('-100.00'))
        self.assertEqual(available_shares(self.prop), 900)

    def test_short_wallet_creates_nothing(self):
        WalletBalance.objects.filter(user=self.buyer).update(available_balance=Decimal('2599.99'))
        r = self._create()
        self.assertEqual(r.status_code, 409, r.content)
        self.assertEqual(r.data['code'], 'INSUFFICIENT_FUNDS')
        self.assertFalse(ConstructionInstallment.objects.exists())
        self.assertEqual(available_shares(self.prop), 1000)

    def test_fee_rate_is_fixed_when_the_plan_starts(self):
        self._create()
        PlatformFeeSettings.objects.filter(pk=1).update(installment_fee_pct=Decimal('10.00'))
        plan = ConstructionInstallment.objects.get(investor=self.buyer)
        self.assertEqual(plan.fee_due, Decimal('100.00'))

    def test_pay_ahead_and_complete_converts_hold_to_sold(self):
        self._create()
        plan = ConstructionInstallment.objects.get(investor=self.buyer)
        for _ in range(3):  # not due yet: paying ahead is allowed
            r = self.client.post(f'/api/v1/properties/installments/{plan.id}/process-payment/', {}, format='json')
            self.assertEqual(r.status_code, 200, r.content)
        plan.refresh_from_db()
        self.assertEqual(plan.status, 'completed')
        self.assertEqual(plan.fees_paid, Decimal('400.00'))
        self.prop.refresh_from_db()
        self.assertEqual(self.prop.tokens_sold, 100)
        self.assertEqual(available_shares(self.prop), 900)  # sold, not held twice
        self.assertEqual(balance(self.buyer), Decimal('20000.00') - Decimal('10400.00'))

    def test_cancel_sells_what_was_paid_and_frees_the_rest(self):
        self._create()
        plan = ConstructionInstallment.objects.get(investor=self.buyer)
        self.client.post(f'/api/v1/properties/installments/{plan.id}/cancel/', {}, format='json')
        plan.refresh_from_db()
        self.prop.refresh_from_db()
        self.assertEqual(self.prop.tokens_sold, plan.tokens_released)
        self.assertEqual(available_shares(self.prop), 1000 - plan.tokens_released)

    def test_hourly_run_charges_due_retries_and_notifies_once(self):
        self._create()
        plan = ConstructionInstallment.objects.get(investor=self.buyer)
        due = plan.next_payment_date
        WalletBalance.objects.filter(user=self.buyer).update(available_balance=Decimal('100.00'))
        with patch('properties.installment_billing._notify') as notify:
            self.assertEqual(run_due(today=due)['missed'], 1)
            self.assertEqual(run_due(today=due)['missed'], 0)  # one notice per payment
            self.assertEqual(notify.call_count, 1)
        WalletBalance.objects.filter(user=self.buyer).update(available_balance=Decimal('5000.00'))
        self.assertEqual(run_due(today=due + timedelta(days=5))['charged'], 1)  # overdue, retried
        plan.refresh_from_db()
        self.assertEqual(plan.payments_made, 2)
        self.assertEqual(plan.late_payment_fee, Decimal('0.00'))

    def test_reminder_three_days_before_once(self):
        self._create()
        plan = ConstructionInstallment.objects.get(investor=self.buyer)
        with patch('properties.installment_billing._notify') as notify:
            self.assertEqual(run_due(today=plan.next_payment_date - timedelta(days=3))['reminded'], 1)
            self.assertEqual(run_due(today=plan.next_payment_date - timedelta(days=2))['reminded'], 0)
            self.assertEqual(run_due(today=plan.next_payment_date - timedelta(days=5))['reminded'], 0)
        self.assertIn('$2,600.00', notify.call_args.args[2])

    def test_members_cannot_change_status(self):
        self._create()
        plan = ConstructionInstallment.objects.get(investor=self.buyer)
        self.client.patch(f'/api/v1/properties/installments/{plan.id}/', {'status': 'completed'}, format='json')
        plan.refresh_from_db()
        self.assertEqual(plan.status, 'pending')

    def test_plans_without_auto_debit_are_reminded_not_charged(self):
        self._create()
        plan = ConstructionInstallment.objects.get(investor=self.buyer)
        ConstructionInstallment.objects.filter(pk=plan.pk).update(auto_debit=False)
        with patch('properties.installment_billing._notify') as notify:
            self.assertEqual(run_due(today=plan.next_payment_date - timedelta(days=1))['reminded'], 1)
            self.assertIn('Dashboard', notify.call_args.args[2])
            self.assertEqual(run_due(today=plan.next_payment_date + timedelta(days=3))['charged'], 0)
