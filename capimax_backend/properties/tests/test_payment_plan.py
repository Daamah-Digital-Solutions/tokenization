"""
Client round 3, #18 #19 #20 and admin note #2: purchase methods per
property, the published installment schedule, a buyer's plan following it
(with per-installment status), and automatic price phases.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from properties.models import ConstructionInstallment, Property, PropertyPriceTier
from properties.payment_plan import build_schedule, count_options, sync_price_tier


def make_property(owner, **overrides):
    data = dict(
        title='Plan Tower', description='d', property_type='residential',
        property_category='under_construction', total_value=Decimal('1000000.00'),
        token_price=Decimal('100.00'), total_tokens=10000, address='1 St', city='Cairo',
        country='EG', owner=owner, status='active', is_published=True,
        purchase_methods='both',
    )
    data.update(overrides)
    return Property.objects.create(**data)


class BuildScheduleTests(TestCase):
    def test_down_payment_then_equal_installments_adding_up_to_total(self):
        start = date(2026, 1, 31)
        rows = build_schedule(Decimal('10000'), down_payment_percent=Decimal('20'), count=3,
                              frequency='monthly', start_date=start)
        self.assertEqual([r['kind'] for r in rows], ['down_payment', 'installment', 'installment', 'installment'])
        self.assertEqual(rows[0]['amount'], Decimal('2000.00'))
        self.assertEqual(rows[0]['due_date'], start)
        self.assertEqual(rows[1]['due_date'], date(2026, 2, 28))  # month-end safe
        self.assertEqual(sum(r['amount'] for r in rows), Decimal('10000.00'))

    def test_rounding_goes_to_last_installment(self):
        rows = build_schedule(Decimal('1000'), down_payment_percent=0, count=3,
                              start_date=date(2026, 1, 1))
        self.assertEqual([r['amount'] for r in rows], [Decimal('333.33'), Decimal('333.33'), Decimal('333.34')])
        self.assertEqual(rows[0]['due_date'], date(2026, 1, 1))

    def test_quarterly_from_fixed_first_date(self):
        rows = build_schedule(Decimal('4000'), down_payment_percent=Decimal('10'), count=2,
                              frequency='quarterly', start_date=date(2026, 1, 1),
                              first_due_date=date(2026, 6, 1))
        self.assertEqual([r['due_date'] for r in rows], [date(2026, 1, 1), date(2026, 6, 1), date(2026, 9, 1)])


class PurchaseMethodTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email='own-pp@example.com', password='x12345678',
                                              role=UserRole.PROPERTY_OWNER)
        self.buyer = User.objects.create_user(email='buy-pp@example.com', password='x12345678',
                                              role=UserRole.INVESTOR)
        self.client = APIClient()
        self.client.force_authenticate(self.buyer)

    def test_supports_installments_follows_purchase_methods(self):
        prop = make_property(self.owner, purchase_methods='cash', supports_installments=True)
        self.assertFalse(prop.supports_installments)
        prop.purchase_methods = 'installments'
        prop.save(update_fields=['purchase_methods'])
        prop.refresh_from_db()
        self.assertTrue(prop.supports_installments)

    def test_cash_only_property_rejects_installment_plan(self):
        prop = make_property(self.owner, purchase_methods='cash')
        r = self.client.post('/api/v1/properties/installments/', {
            'property_investment': str(prop.id), 'token_allocation': 50, 'total_installments': 6,
        }, format='json')
        self.assertEqual(r.status_code, 400, r.content)

    def test_installments_only_property_rejects_cash_purchase(self):
        from investments.serializers import InvestmentCreateSerializer
        prop = make_property(self.owner, purchase_methods='installments')
        field = InvestmentCreateSerializer().fields.get('property_id')
        serializer = InvestmentCreateSerializer(data={'property_id': str(prop.id), 'token_amount': 1})
        self.assertFalse(serializer.is_valid())
        if field is not None:
            self.assertIn('installments only', str(serializer.errors))

    def test_count_options(self):
        prop = make_property(self.owner, installment_period_months=24)
        self.assertEqual(count_options(prop), [3, 6, 12, 24])
        prop.installment_frequency = 'quarterly'
        self.assertEqual(count_options(prop), [3, 6, 8])
        prop.installment_count = 10
        self.assertEqual(count_options(prop), [10])


class BuyerPlanTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email='own-bp@example.com', password='x12345678',
                                              role=UserRole.PROPERTY_OWNER)
        self.buyer = User.objects.create_user(email='buy-bp@example.com', password='x12345678',
                                              role=UserRole.INVESTOR)
        # The down payment (+ installment fee) is charged from the wallet at start.
        from payments.models import WalletBalance
        WalletBalance.objects.create(user=self.buyer, currency='USD', available_balance=Decimal('50000.00'))
        self.client = APIClient()
        self.client.force_authenticate(self.buyer)
        self.prop = make_property(self.owner, installment_down_payment_percent=Decimal('25'),
                                  installment_count=3, installment_frequency='monthly')

    def _create_plan(self, tokens=100):
        r = self.client.post('/api/v1/properties/installments/', {
            'property_investment': str(self.prop.id), 'token_allocation': tokens,
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        return ConstructionInstallment.objects.get(investor=self.buyer)

    def test_plan_follows_property_schedule(self):
        plan = self._create_plan()  # 100 shares x $100 = $10,000
        self.assertEqual(plan.total_investment_amount, Decimal('10000.00'))
        self.assertEqual(plan.total_installments, 4)
        self.assertEqual(plan.down_payment_amount, Decimal('2500.00'))
        self.assertEqual(plan.amount_due, Decimal('2500.00'))
        rows = plan.schedule_rows()
        self.assertEqual(rows[0]['due_date'], timezone.now().date())
        self.assertEqual(plan.payments_made, 1)  # the down payment, charged at start
        self.assertEqual(plan.next_payment_date, rows[1]['due_date'])
        self.assertEqual([r['amount'] for r in rows],
                         [Decimal('2500.00'), Decimal('2500.00'), Decimal('2500.00'), Decimal('2500.00')])

    def test_schedule_endpoint_lists_every_installment_with_status(self):
        plan = self._create_plan()
        r = self.client.get(f'/api/v1/properties/installments/{plan.id}/')
        self.assertEqual(r.status_code, 200, r.content)
        body = r.data.get('data', r.data) if isinstance(r.data, dict) else r.data
        schedule = body['schedule']
        self.assertEqual(len(schedule), 4)
        self.assertEqual(schedule[0]['status'], 'paid')
        self.assertEqual(schedule[0]['kind'], 'down_payment')
        self.assertEqual(Decimal(str(schedule[1]['total'])), Decimal('2600.00'))  # + 4% fee
        self.assertEqual({s['status'] for s in schedule[1:]}, {'upcoming'})

    def test_payment_requires_scheduled_amount(self):
        plan = self._create_plan()
        ok, message, _ = plan.process_payment(Decimal('100.00'))
        self.assertFalse(ok)
        self.assertIn('2500', message)


class PriceTierTests(TestCase):
    def setUp(self):
        owner = User.objects.create_user(email='own-pt@example.com', password='x12345678',
                                         role=UserRole.PROPERTY_OWNER)
        self.prop = make_property(owner)
        today = timezone.now().date()
        PropertyPriceTier.objects.create(property=self.prop, label='Launch', price_per_token=Decimal('90'),
                                         effective_from=today - timedelta(days=30),
                                         effective_to=today - timedelta(days=1))
        PropertyPriceTier.objects.create(property=self.prop, label='Phase 2', price_per_token=Decimal('110'),
                                         effective_from=today)
        PropertyPriceTier.objects.create(property=self.prop, label='Phase 3', price_per_token=Decimal('125'),
                                         effective_from=today + timedelta(days=60))

    def test_active_phase_price_is_applied(self):
        self.assertTrue(sync_price_tier(self.prop))
        self.prop.refresh_from_db()
        self.assertEqual(self.prop.token_price, Decimal('110.00'))
        self.assertFalse(sync_price_tier(self.prop))

    def test_public_page_shows_phases_and_next_change(self):
        r = APIClient().get(f'/api/v1/properties/{self.prop.id}/')
        self.assertEqual(r.status_code, 200, r.content)
        body = r.data.get('data', r.data)
        details = body['listing_details']
        self.assertEqual(Decimal(str(body['token_price'])), Decimal('110.00'))
        self.assertEqual(len(details['price_tiers']), 3)
        self.assertEqual([t['is_current'] for t in details['price_tiers']], [False, True, False])
        self.assertEqual(details['next_price_change']['label'], 'Phase 3')
        self.assertTrue(details['payment_plan']['allows_installments'])
