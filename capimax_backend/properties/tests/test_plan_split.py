"""
Selling or transferring PART of an installment plan (client, Nov 2026): the plan is split in
proportion, the two plans add up to the original exactly, and each holder pays their own part.
"""

from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.db.models import Sum
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.tests.test_partner_roles import _lp_application
from certificates.models import Certificate
from certificates.services import sync_plan
from core.factories import make_admin, make_ready_investor
from investments.models import TokenReservation
from properties import plan_split
from properties.installment_billing import charge_next
from properties.models import ConstructionInstallment, PositionListing, Property
from properties.tests.test_payment_plan import make_property
from properties.tests.test_positions import balance, body, make_user
from transfers.models import Transfer

URL = '/api/v1/properties/positions/'


def rows_of(plan):
    return [(r['kind'], r['due_date'], r['amount']) for r in plan.schedule_rows()]


@patch('properties.services.InstallmentProcessingService._release_tokens_to_investor', lambda *a, **k: None)
class PlanSplitTests(TestCase):
    def setUp(self):
        self.owner = make_user('own-split@example.com', role='property_owner')
        self.seller = make_ready_investor(wallet_balance=Decimal('50000.00'))
        self.buyer = make_ready_investor(wallet_balance=Decimal('50000.00'))
        self.client = APIClient()

    def as_(self, user):
        self.client.force_authenticate(user)
        return self.client

    def start_plan(self, shares, **prop):
        defaults = dict(installment_down_payment_percent=Decimal('25'), installment_count=3,
                        installment_frequency='monthly', total_tokens=1000)
        defaults.update(prop)
        self.prop = make_property(self.owner, **defaults)
        r = self.as_(self.seller).post('/api/v1/properties/installments/', {
            'property_investment': str(self.prop.id), 'token_allocation': shares}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        plan = ConstructionInstallment.objects.get(investor=self.seller, property_investment=self.prop)
        sync_plan(plan)
        return plan

    # ------------------------------------------------------------------ the split itself
    def test_odd_amounts_split_to_the_cent_and_both_plans_pay_off_exactly(self):
        plan = self.start_plan(7, token_price=Decimal('333.37'), installment_down_payment_percent=Decimal('10'),
                               installment_count=6)
        original = rows_of(plan)
        total, paid = plan.total_investment_amount, plan.total_amount_paid
        part = plan_split.split(plan, 3, self.buyer, reason='test')
        plan.refresh_from_db()

        # Row by row, the two schedules add up to the original, with the same dates
        for (k, d, a), (k1, d1, a1), (k2, d2, a2) in zip(original, rows_of(part), rows_of(plan)):
            self.assertEqual((k1, d1, k2, d2), (k, d, k, d))
            self.assertEqual(a1 + a2, a)
        self.assertEqual(part.total_investment_amount + plan.total_investment_amount, total)
        # The new holder's plan is exactly their share of it (rounded once, not per row)
        self.assertEqual(part.total_investment_amount, (total * 3 / 7).quantize(Decimal('0.01')))
        self.assertTrue(all(abs(a1 - a * 3 / 7) <= Decimal('0.01') for (_, _, a), (_, _, a1) in zip(original, rows_of(part))))
        self.assertEqual(part.total_amount_paid + plan.total_amount_paid, paid)
        self.assertEqual((part.token_allocation, plan.token_allocation), (3, 4))
        self.assertEqual((part.payments_made, part.next_payment_date), (plan.payments_made, plan.next_payment_date))
        self.assertEqual((part.investor, part.split_from), (self.buyer, plan))
        holds = {r.installment_plan_id: (r.user_id, r.token_amount)
                 for r in TokenReservation.objects.filter(property_investment=self.prop, released=False)}
        self.assertEqual(holds, {plan.pk: (self.seller.pk, 4), part.pk: (self.buyer.pk, 3)})

        # Each holder pays their own part to the end; both plans finish exactly
        for p in (plan, part):
            while True:
                p.refresh_from_db()
                if p.status == 'completed':
                    break
                self.assertTrue(charge_next(p)['success'])
            self.assertEqual(p.total_amount_paid, p.total_investment_amount)
        self.prop.refresh_from_db()
        self.assertEqual(self.prop.tokens_sold, 7)

    def test_split_needs_a_valid_count_and_no_payment_due(self):
        plan = self.start_plan(10)
        for bad in (0, 10, 11):
            with self.assertRaises(plan_split.SplitError):
                plan_split.split(plan, bad, self.buyer, reason='x')
        ConstructionInstallment.objects.filter(pk=plan.pk).update(
            next_payment_date=timezone.now().date() - timedelta(days=1))
        plan.refresh_from_db()
        with self.assertRaises(plan_split.SplitError) as ctx:
            plan_split.split(plan, 4, self.buyer, reason='x')
        self.assertEqual(ctx.exception.code, 'PAYMENT_DUE')

    # ------------------------------------------------------------------ secondary market
    def test_buyer_takes_part_of_the_shares_offered(self):
        plan = self.start_plan(100)  # $10,000: $2,500 paid, 3 x $2,500 left
        r = self.as_(self.seller).post(URL, {'plan': str(plan.id), 'price_per_share': '110.00'}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        listing = PositionListing.objects.get()
        row = body(self.as_(self.buyer).get(URL))[0]
        self.assertEqual((row['offered_units'], row['plan_units'], row['partial_allowed']), (100, 100, True))

        quote = body(self.as_(self.buyer).get(f'{URL}{listing.id}/quote/?units=30'))
        # 30 x $110 = $3,300 - their $2,250 still to pay = $1,050 to the seller, + 1% fee
        self.assertEqual((quote['units'], quote['partial'], quote['paid_principal'], quote['remaining_principal'],
                          quote['cash'], quote['fee']), (30, True, '750.00', '2250.00', '1050.00', '10.50'))
        self.assertEqual([s['amount'] for s in quote['schedule']], ['750.00', '750.00', '750.00'])

        seller_before, buyer_before = balance(self.seller), balance(self.buyer)
        with self.captureOnCommitCallbacks(execute=True):
            r = self.as_(self.buyer).post(f'{URL}{listing.id}/buy/', {
                'units': 30, 'expected_cash': '1050.00', 'expected_fee': '10.50'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(balance(self.seller), seller_before + Decimal('1050.00'))
        self.assertEqual(balance(self.buyer), buyer_before - Decimal('1060.50'))

        plan.refresh_from_db()
        part = ConstructionInstallment.objects.get(investor=self.buyer)
        self.assertEqual((plan.token_allocation, plan.amount_due, part.token_allocation, part.amount_due),
                         (70, Decimal('1750.00'), 30, Decimal('750.00')))
        listing.refresh_from_db()
        self.assertEqual((listing.status, listing.units), ('listed', 70))  # the rest stays for sale
        sale = PositionListing.objects.get(parent=listing)
        self.assertEqual((sale.status, sale.plan, sale.buyer, sale.units, sale.seller_cash),
                         ('sold', part, self.buyer, 30, Decimal('1050.00')))
        # Certificates: the seller's is re-issued for 70, the buyer gets one for 30
        live = Certificate.objects.exclude(status='revoked')
        self.assertEqual(sorted(live.values_list('user_id', 'units')),
                         sorted([(self.seller.pk, 70), (self.buyer.pk, 30)]))

        # Another buyer takes the remaining 70 = the seller's whole plan
        other = make_ready_investor(wallet_balance=Decimal('50000.00'))
        row = body(self.as_(other).get(URL))[0]
        self.assertEqual((row['offered_units'], row['partial']), (70, False))
        r = self.as_(other).post(f'{URL}{listing.id}/buy/', {'expected_cash': row['cash'],
                                                              'expected_fee': row['fee']}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        plan.refresh_from_db()
        listing.refresh_from_db()
        self.assertEqual((plan.investor, listing.status), (other, 'sold'))

    def test_seller_offers_part_and_a_provider_offer_takes_it(self):
        plan = self.start_plan(100)
        admin = make_admin()
        lp_user = make_user('lp-split@example.com', '50000.00')
        _lp_application(lp_user.email).approve(admin)
        lp = lp_user.liquidity_provider_profile
        r = self.as_(self.seller).post(URL, {'plan': str(plan.id), 'price_per_share': '110.00', 'units': 40},
                                       format='json')
        self.assertEqual(r.status_code, 201, r.content)
        listing = PositionListing.objects.get()
        self.assertEqual(body(self.as_(lp_user).get(URL))[0]['offered_units'], 40)
        # The seller keeps 60 free shares; listing more than that fails
        pos = body(self.as_(self.seller).get('/api/v1/properties/installments/'))
        pos = (pos.get('results', pos) if isinstance(pos, dict) else pos)[0]['position']
        self.assertEqual(pos['free_units'], 60)

        r = self.as_(lp_user).post(f'{URL}{listing.id}/offer/', {'price_per_share': '100.00'}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        offer = listing.offers.get()
        self.assertEqual(body(r)['units'], 40)
        r = self.as_(self.seller).post(f'{URL}{listing.id}/answer/', {'offer': str(offer.id), 'action': 'accept'},
                                       format='json')
        self.assertEqual(r.status_code, 200, r.content)
        plan.refresh_from_db()
        part = ConstructionInstallment.objects.get(investor=lp_user)
        self.assertEqual((plan.token_allocation, part.token_allocation), (60, 40))
        listing.refresh_from_db()
        self.assertEqual((listing.status, listing.units), ('sold', 0))
        lp.refresh_from_db()
        self.assertEqual(lp.current_month_total, Decimal('1000.00'))  # 40 x $100 - $3,000 left

    def test_part_waits_while_a_payment_is_due_but_the_whole_plan_can_go(self):
        plan = self.start_plan(100)
        r = self.as_(self.seller).post(URL, {'plan': str(plan.id), 'price_per_share': '110.00'}, format='json')
        listing = PositionListing.objects.get()
        ConstructionInstallment.objects.filter(pk=plan.pk).update(
            next_payment_date=timezone.now().date() - timedelta(days=2))
        row = body(self.as_(self.buyer).get(URL))[0]
        self.assertFalse(row['partial_allowed'])
        r = self.as_(self.buyer).post(f'{URL}{listing.id}/buy/', {'units': 10, 'expected_cash': '0',
                                                                  'expected_fee': '0'}, format='json')
        self.assertEqual((r.status_code, r.json()['error']['details']['code']), (400, 'PAYMENT_DUE'))
        r = self.as_(self.buyer).post(f'{URL}{listing.id}/buy/', {'expected_cash': row['cash'],
                                                                  'expected_fee': row['fee']}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        plan.refresh_from_db()
        self.assertEqual((plan.investor, plan.token_allocation), (self.buyer, 100))

    def test_listing_part_while_a_payment_is_due_is_refused(self):
        plan = self.start_plan(100)
        ConstructionInstallment.objects.filter(pk=plan.pk).update(
            next_payment_date=timezone.now().date() - timedelta(days=2))
        r = self.as_(self.seller).post(URL, {'plan': str(plan.id), 'price_per_share': '110.00', 'units': 10},
                                       format='json')
        self.assertEqual((r.status_code, r.json()['error']['details']['code']), (400, 'PAYMENT_DUE'))

    # ------------------------------------------------------------------ transfers
    def _send(self, plan, units, to):
        with self.captureOnCommitCallbacks(execute=True):
            return self.as_(self.seller).post('/api/v1/transfers/', {
                'asset': 'plan', 'plan_id': str(plan.id), 'units': units, 'recipient_email': to.email},
                format='json')

    def test_transfer_part_of_a_plan_the_recipient_accepts(self):
        plan = self.start_plan(100)
        gift = body(self.as_(self.seller).get('/api/v1/transfers/giftable/'))
        self.assertEqual([(p['plan_id'], p['free_units']) for p in gift['plans']], [(str(plan.id), 100)])
        r = self._send(plan, 20, self.buyer)
        self.assertEqual(r.status_code, 201, r.content)
        t = Transfer.objects.get()
        self.assertEqual((t.status, t.asset, t.units, t.amount), ('waiting', 'plan', 20, Decimal('500.00')))
        # Set aside: the seller can list only the other 80
        r = self.as_(self.seller).post(URL, {'plan': str(plan.id), 'price_per_share': '110.00', 'units': 81},
                                       format='json')
        self.assertEqual(r.status_code, 400)

        mine = body(self.as_(self.buyer).get('/api/v1/transfers/'))
        terms = mine[0]['plan_terms']
        self.assertEqual((terms['remaining_principal'], terms['remaining_payments']), ('1500.00', 3))
        with self.captureOnCommitCallbacks(execute=True):
            r = self.as_(self.buyer).post(f'/api/v1/transfers/{t.id}/accept/', {}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        t.refresh_from_db()
        plan.refresh_from_db()
        part = ConstructionInstallment.objects.get(investor=self.buyer)
        self.assertEqual((t.status, plan.token_allocation, part.token_allocation, part.amount_due),
                         ('delivered', 80, 20, Decimal('500.00')))
        before = balance(self.buyer)
        self.assertTrue(charge_next(part)['success'])
        self.assertEqual(balance(self.buyer), before - Decimal('520.00'))  # $500 + 4% fee

    def test_whole_plan_transfer_and_decline(self):
        plan = self.start_plan(100)
        self._send(plan, 100, self.buyer)
        t = Transfer.objects.get()
        r = self.as_(self.buyer).post(f'/api/v1/transfers/{t.id}/decline/', {}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        t.refresh_from_db()
        plan.refresh_from_db()
        self.assertEqual((t.status, plan.investor), ('declined', self.seller))

        self._send(plan, 100, self.buyer)
        t = Transfer.objects.get(status='waiting')
        r = self.as_(self.buyer).post(f'/api/v1/transfers/{t.id}/accept/', {}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        plan.refresh_from_db()
        self.assertEqual((plan.investor, plan.token_allocation, plan.split_from), (self.buyer, 100, None))
        # Only the recipient answers
        self._send_back = None
        r = self.as_(self.seller).post(f'/api/v1/transfers/{t.id}/accept/', {}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_installment_transfers_do_not_touch_ordinary_shares(self):
        from marketplace.share_moves import committed_shares
        plan = self.start_plan(100)
        self._send(plan, 20, self.buyer)
        self.assertEqual(committed_shares(self.seller, Property.objects.get(pk=self.prop.pk)), 0)
        total_held = TokenReservation.objects.filter(property_investment=self.prop, released=False).aggregate(
            n=Sum('token_amount'))['n']
        self.assertEqual(total_held, 100)
