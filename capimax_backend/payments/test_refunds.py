"""Refunds made in Stripe reach the platform; members cannot trigger a refund themselves."""

from decimal import Decimal
from unittest.mock import patch
from uuid import uuid4

from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.factories import make_admin, make_ready_investor

from .models import Payment, PaymentStatus, Refund, WalletBalance
from .refunds import apply_provider_refund
from .settlement import settle_payment


def balance(user):
    return WalletBalance.objects.get(user=user, currency='USD').available_balance


def charge(payment_intent='pi_1', refunded=1000, **extra):
    return {'id': 'ch_1', 'payment_intent': payment_intent, 'amount_refunded': refunded, **extra}


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
                   SUPPORT_INBOX_EMAIL='team@example.com')
class ProviderRefundTests(TestCase):
    def setUp(self):
        self.user = make_ready_investor()
        WalletBalance.objects.filter(user=self.user).update(available_balance=Decimal('0.00'))

    def _deposit(self, amount='10.00', intent='pi_1'):
        payment = Payment.objects.create(user=self.user, amount=Decimal(amount), net_amount=Decimal(amount),
                                         currency='USD', payment_method='credit_card', status='pending',
                                         metadata={'purpose': 'deposit'})
        settle_payment(payment, external_id=intent, source='test')
        payment.refresh_from_db()
        return payment

    def _refund(self, *args, **kwargs):
        with self.captureOnCommitCallbacks(execute=True):
            return apply_provider_refund(charge(*args, **kwargs))

    def test_full_refund_takes_the_deposit_back_from_the_wallet(self):
        payment = self._deposit()
        self.assertEqual(balance(self.user), Decimal('10.00'))
        self.assertEqual(self._refund(), 'wallet')
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentStatus.REFUNDED)
        self.assertEqual(balance(self.user), Decimal('0.00'))

    def test_the_same_event_twice_counts_once(self):
        self._deposit('20.00')
        self.assertEqual(self._refund(), 'wallet')
        self.assertEqual(self._refund(), 'duplicate')
        self.assertEqual(balance(self.user), Decimal('10.00'))

    def test_partial_then_full_refund_take_only_the_difference(self):
        payment = self._deposit('20.00')
        self._refund(refunded=500)
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentStatus.COMPLETED)
        self.assertEqual(balance(self.user), Decimal('15.00'))
        self._refund(refunded=2000)
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentStatus.REFUNDED)
        self.assertEqual(balance(self.user), Decimal('0.00'))

    def test_money_already_spent_alerts_the_team(self):
        self._deposit()
        WalletBalance.objects.filter(user=self.user).update(available_balance=Decimal('4.00'))
        mail.outbox.clear()
        self.assertEqual(self._refund(), 'review')
        self.assertEqual(balance(self.user), Decimal('0.00'))
        self.assertTrue(any('owes $6.00' in m.subject and 'team@example.com' in m.to for m in mail.outbox))

    def test_a_charge_of_another_capimax_platform_is_ignored(self):
        self._deposit()
        self.assertEqual(self._refund(payment_intent='pi_other_platform'), 'ignored')
        self.assertEqual(self._refund(payment_intent=None, metadata={'payment_id': 'not-a-uuid'}), 'ignored')
        self.assertEqual(self._refund(payment_intent=None, metadata={'payment_id': str(uuid4())}), 'ignored')
        self.assertEqual(balance(self.user), Decimal('10.00'))

    def test_found_through_the_charge_metadata_too(self):
        payment = self._deposit()
        self.assertEqual(self._refund(payment_intent=None, metadata={'payment_id': str(payment.pk)}), 'wallet')

    def test_shares_are_left_for_the_team_to_review(self):
        from core.factories import make_investment, make_property
        prop = make_property()
        investment = make_investment(user=self.user, prop=prop)
        payment = Payment.objects.create(user=self.user, investment=investment, amount=Decimal('10.00'),
                                         net_amount=Decimal('10.00'), currency='USD', payment_method='credit_card',
                                         status='completed', external_transaction_id='pi_1',
                                         metadata={'purpose': 'investment'})
        before = WalletBalance.objects.filter(user=self.user).first()
        mail.outbox.clear()
        self.assertEqual(self._refund(), 'review')
        investment.refresh_from_db()
        payment.refresh_from_db()
        self.assertEqual((investment.status, payment.status), ('refunded', PaymentStatus.REFUNDED))
        self.assertTrue(any('Shares to review' in m.subject for m in mail.outbox))
        after = WalletBalance.objects.filter(user=self.user).first()
        self.assertEqual(getattr(before, 'available_balance', None), getattr(after, 'available_balance', None))


class RefundApiPermissionTests(TestCase):
    """POST /refunds/ called Stripe at once, for any signed-in user and any payment."""

    URL = '/api/v1/payments/refunds/'

    def setUp(self):
        self.user = make_ready_investor()
        self.client = APIClient()
        self.payment = Payment.objects.create(user=self.user, amount=Decimal('10.00'), net_amount=Decimal('10.00'),
                                              currency='USD', payment_method='credit_card', status='completed',
                                              payment_intent_id='pi_real')

    @patch('stripe.Refund.create')
    def test_a_member_cannot_refund_their_own_payment(self, stripe_refund):
        self.client.force_authenticate(self.user)
        res = self.client.post(self.URL, {'payment': str(self.payment.pk), 'amount': '10.00', 'reason': 'x'},
                               format='json')
        self.assertEqual(res.status_code, 403, res.content)
        stripe_refund.assert_not_called()
        self.assertFalse(Refund.objects.exists())

    def test_a_member_cannot_change_a_refund(self):
        refund = Refund.objects.create(payment=self.payment, amount=Decimal('1.00'), reason='x', status='pending')
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.patch(f'{self.URL}{refund.pk}/', {'amount': '9.00'}, format='json').status_code, 403)
        self.assertEqual(self.client.delete(f'{self.URL}{refund.pk}/').status_code, 403)

    def test_a_member_still_sees_their_refunds(self):
        Refund.objects.create(payment=self.payment, amount=Decimal('1.00'), reason='x', status='pending')
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get(self.URL).status_code, 200)

    @patch('stripe.Refund.create')
    def test_staff_can_still_refund(self, stripe_refund):
        stripe_refund.return_value.id = 're_1'
        self.client.force_authenticate(make_admin())
        res = self.client.post(self.URL, {'payment': str(self.payment.pk), 'amount': '10.00', 'reason': 'x'},
                               format='json')
        self.assertEqual(res.status_code, 201, res.content)
        stripe_refund.assert_called_once()
