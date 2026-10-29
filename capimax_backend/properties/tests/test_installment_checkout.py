"""
Client (additional fixes #2): "installment payment does not go through".
The first payment could only come from the wallet, so a buyer with an empty
wallet always failed. Now it can also be paid by card, Pronova or crypto on
the provider's page (PropShare model) — the plan starts when it is confirmed.
"""

from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from investments.purchase import available_shares
from payments.checkout import fail_payment
from payments.models import Payment, PlatformFeeSettings, WalletBalance
from payments.settlement import settle_payment
from properties.installment_billing import expire_unpaid_plans
from properties.models import ConstructionInstallment
from properties.tests.test_payment_plan import make_property

URL = '/api/v1/properties/installments/'


def balance(user):
    return WalletBalance.objects.get(user=user, currency='USD').available_balance


@patch('properties.services.InstallmentProcessingService._release_tokens_to_investor', lambda *a, **k: None)
@patch('payments.providers.stripe_configured', lambda: True)
@patch('payments.checkout._stripe_session', lambda payment, s, c: ('https://checkout.stripe.test/s', 'cs_test_1'))
class InstallmentCheckoutTests(TestCase):
    def setUp(self):
        owner = User.objects.create_user(email='own-ic@example.com', password='x12345678',
                                         role=UserRole.PROPERTY_OWNER)
        self.buyer = User.objects.create_user(email='buy-ic@example.com', password='x12345678',
                                              role=UserRole.INVESTOR)
        WalletBalance.objects.create(user=self.buyer, currency='USD', available_balance=Decimal('0.00'))
        self.client = APIClient()
        self.client.force_authenticate(self.buyer)
        # The client's case: a READY property, $100 share, 12 monthly installments, no down payment
        self.prop = make_property(owner, property_category='ready_property', installment_count=12,
                                  installment_frequency='monthly', total_tokens=1000)

    def _create(self, method, tokens=12):
        return self.client.post(URL, {'property_investment': str(self.prop.id), 'token_allocation': tokens,
                                      'payment_method': method}, format='json')

    def test_empty_wallet_is_a_clear_409_not_a_silent_failure(self):
        r = self._create('wallet')
        self.assertEqual((r.status_code, r.data['code']), (409, 'INSUFFICIENT_FUNDS'))
        self.assertFalse(ConstructionInstallment.objects.exists())

    def test_card_opens_the_checkout_and_holds_the_shares(self):
        r = self._create('card')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.data['checkout_url'], 'https://checkout.stripe.test/s')
        plan = ConstructionInstallment.objects.get()
        self.assertEqual((plan.status, plan.payments_made), ('awaiting_payment', 0))
        payment = Payment.objects.get(pk=r.data['payment_id'])
        self.assertEqual((payment.status, payment.amount, payment.payment_method), ('pending', Decimal('104.00'),
                                                                                    'credit_card'))
        self.assertEqual(available_shares(self.prop), 1000 - 12)

    def test_confirmed_card_payment_starts_the_plan_without_touching_the_wallet(self):
        r = self._create('card')
        settle_payment(r.data['payment_id'], external_id='pi_1', source='test')
        plan = ConstructionInstallment.objects.get()
        self.assertEqual((plan.status, plan.payments_made, plan.fees_paid), ('pending', 1, Decimal('4.00')))
        self.assertEqual(plan.total_amount_paid, Decimal('100.00'))
        self.assertFalse(plan.reservations.filter(released=False, expires_at__isnull=False).exists())
        self.assertEqual(balance(self.buyer), Decimal('0.00'))
        self.assertEqual(available_shares(self.prop), 1000 - 12)
        # webhook + lookup both arriving: applied once
        self.assertFalse(settle_payment(r.data['payment_id'], source='again'))

    def test_pronova_takes_the_discount_off_the_first_payment(self):
        pct = PlatformFeeSettings.current().pronova_discount_pct
        r = self._create('pronova')
        expected = (Decimal('104.00') * (100 - Decimal(pct)) / 100).quantize(Decimal('0.01'))
        self.assertEqual(Payment.objects.get(pk=r.data['payment_id']).amount, expected)

    def test_failed_checkout_puts_the_shares_back_on_sale(self):
        r = self._create('card')
        fail_payment(Payment.objects.get(pk=r.data['payment_id']), reason='Checkout expired')
        self.assertEqual(ConstructionInstallment.objects.get().status, 'cancelled')
        self.assertEqual(available_shares(self.prop), 1000)

    def test_unpaid_plan_expires_and_a_late_payment_still_starts_it_when_shares_are_free(self):
        r = self._create('card')
        later = timezone.now() + timedelta(minutes=31)
        self.assertEqual(expire_unpaid_plans(now=later), 1)
        self.assertEqual(available_shares(self.prop), 1000)
        Payment.objects.filter(pk=r.data['payment_id']).update(status='pending')
        settle_payment(r.data['payment_id'], source='late')
        plan = ConstructionInstallment.objects.get()
        self.assertEqual((plan.status, plan.payments_made), ('pending', 1))
        self.assertEqual(available_shares(self.prop), 1000 - 12)

    def test_late_payment_for_taken_shares_is_refunded_to_the_wallet(self):
        r = self._create('card')
        self.prop.tokens_sold = 995
        self.prop.save(update_fields=['tokens_sold'])
        expire_unpaid_plans(now=timezone.now() + timedelta(minutes=31))
        Payment.objects.filter(pk=r.data['payment_id']).update(status='pending')
        settle_payment(r.data['payment_id'], source='late')
        self.assertEqual(ConstructionInstallment.objects.get().status, 'cancelled')
        self.assertEqual(balance(self.buyer), Decimal('104.00'))

    def test_a_new_attempt_replaces_a_plan_left_on_the_payment_page(self):
        self._create('card')
        r = self._create('card')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(list(ConstructionInstallment.objects.values_list('status', flat=True).order_by('created_at')),
                         ['cancelled', 'awaiting_payment'])
        self.assertEqual(available_shares(self.prop), 1000 - 12)

    def test_wallet_still_works_when_it_has_the_money(self):
        WalletBalance.objects.filter(user=self.buyer).update(available_balance=Decimal('104.00'))
        r = self._create('wallet')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(ConstructionInstallment.objects.get().payments_made, 1)
        self.assertEqual(balance(self.buyer), Decimal('0.00'))
