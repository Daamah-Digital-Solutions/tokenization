"""Rent payouts the PropShare way: split by shares, 1% yearly management fee for the period, paid once."""

from datetime import date
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from core.factories import make_admin, make_property, make_ready_investor
from investments.models import Investment
from investments.purchase import reinvestable_returns
from payments.models import WalletBalance, WalletTransaction
from properties.models import RentDistribution
from properties.rent_distribution import DistributionError, _split_cents, pay


def own(user, prop, shares, value, rate=Decimal('1.000')):
    return Investment.objects.create(user=user, property_investment=prop, token_amount=shares,
                                     investment_amount=Decimal(value), status='completed',
                                     management_fee_rate=rate)


def balance(user):
    return WalletBalance.objects.get(user=user, currency='USD').available_balance


class RentDistributionTests(TestCase):
    def setUp(self):
        self.prop = make_property(token_price=Decimal('100.00'), total_tokens=1000, is_published=True,
                                  status='active')
        self.a = make_ready_investor(wallet_balance=Decimal('0.00'))
        self.b = make_ready_investor(wallet_balance=Decimal('0.00'))
        own(self.a, self.prop, 300, '30000')   # 1% a year of $30,000 = $300 a year
        own(self.b, self.prop, 100, '10000')

    def _dist(self, gross='1000.00', start=date(2026, 1, 1), end=date(2026, 3, 31)):
        return RentDistribution.objects.create(property_investment=self.prop, period_start=start, period_end=end,
                                               gross_amount=Decimal(gross))

    def test_split_adds_up_to_the_cent(self):
        parts = _split_cents(Decimal('100.00'), {'x': 1, 'y': 1, 'z': 1})
        self.assertEqual(sum(parts.values()), Decimal('100.00'))
        self.assertEqual(sorted(parts.values()), [Decimal('33.33'), Decimal('33.33'), Decimal('33.34')])

    def test_pay_splits_by_shares_and_takes_the_fee_for_the_period(self):
        dist = pay(self._dist())  # 90 days
        a = dist.items.get(user=self.a)
        self.assertEqual(a.gross_amount, Decimal('750.00'))
        self.assertEqual(a.management_fee, Decimal('73.97'))  # 300 x 90 / 365
        self.assertEqual(balance(self.a), Decimal('676.03'))
        b = dist.items.get(user=self.b)
        self.assertEqual((b.gross_amount, b.management_fee), (Decimal('250.00'), Decimal('24.66')))
        self.assertEqual(dist.total_net + dist.total_management_fee, Decimal('1000.00'))
        self.assertEqual(WalletTransaction.objects.get(user=self.a).transaction_type, 'dividend')
        # rental returns can be reinvested at the discount
        self.assertEqual(reinvestable_returns(self.a), Decimal('676.03'))

    def test_paid_once(self):
        dist = pay(self._dist())
        with self.assertRaises(DistributionError):
            pay(dist)
        self.assertEqual(balance(self.b), Decimal('225.34'))

    def test_fee_never_exceeds_the_part(self):
        dist = pay(self._dist(gross='10.00'))
        a = dist.items.get(user=self.a)
        self.assertEqual((a.management_fee, a.net_amount), (Decimal('7.50'), Decimal('0.00')))

    def test_completed_installment_plans_and_sellers(self):
        from properties.models import ConstructionInstallment
        c = make_ready_investor(wallet_balance=Decimal('0.00'))
        ConstructionInstallment.objects.create(
            property_investment=self.prop, investor=c, total_investment_amount=Decimal('10000'),
            token_allocation=100, installment_amount=Decimal('2500'), total_installments=4,
            payments_made=4, total_amount_paid=Decimal('10000'), tokens_released=100, status='completed',
            next_payment_date=date(2026, 1, 1), start_date=date(2025, 1, 1))
        Investment.objects.filter(user=self.b).update(status='transferred')  # sold on the market
        dist = pay(self._dist())
        self.assertEqual(set(dist.items.values_list('user_id', flat=True)), {self.a.id, c.id})

    def test_admin_pay_action_and_member_returns(self):
        dist = self._dist()
        admin = make_admin()
        c = APIClient()
        c.force_login(admin)
        c.post('/admin/properties/rentdistribution/', {'action': 'pay_distributions', '_selected_action': [str(dist.pk)]})
        dist.refresh_from_db()
        self.assertEqual(dist.status, 'paid')
        member = APIClient()
        member.force_authenticate(self.a)
        data = member.get('/api/v1/purchases/returns/').json()['data']
        self.assertEqual((data['total_gross'], data['total_management_fee'], data['total_net']),
                         ('750.00', '73.97', '676.03'))
