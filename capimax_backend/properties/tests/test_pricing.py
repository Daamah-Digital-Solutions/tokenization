"""
Share price changes (client, Nov 2026 — as on Capimax BRX "Unit prices"): the admin sets a
new price, it is kept in the history, values follow it and every owner is told.
"""

from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from core.factories import make_admin, make_investment, make_user
from notifications.models import Notification
from properties import pricing
from properties.models import (
    ConstructionInstallment, Property, PropertyPriceChange, PropertyPriceTier, PropertyValuation,
)
from properties.tests.test_payment_plan import make_property


def body(res):
    data = res.json()
    return data.get('data', data)


class SharePriceTests(TestCase):
    def setUp(self):
        self.owner = make_user(email='own-price@example.com', role='property_owner')
        # 10,000 shares x $100 = $1,000,000; minimum investment = 5 shares
        self.prop = make_property(self.owner, tokens_sold=150, minimum_investment=Decimal('500.00'))
        self.holder = make_user(email='holder-price@example.com')
        make_investment(user=self.holder, prop=self.prop, token_amount=100,
                        investment_amount=Decimal('10000.00'), status='completed')
        self.planner = make_user(email='plan-price@example.com')
        ConstructionInstallment.objects.create(
            investor=self.planner, property_investment=self.prop, token_allocation=50,
            total_investment_amount=Decimal('5000.00'), installment_amount=Decimal('1000.00'),
            total_installments=5,
            next_payment_date=timezone.now().date() + timedelta(days=30), status='processing')
        self.stranger = make_user(email='stranger-price@example.com')
        self.admin = make_admin(email='admin-price@example.com')

    def _record(self, price, **kw):
        with self.captureOnCommitCallbacks(execute=True):
            return pricing.record_price(self.prop, price, by=self.admin, **kw)

    def test_new_price_is_recorded_values_follow_and_owners_are_told(self):
        change = self._record('112.50', label='Phase 2', note='Structure completed.')
        self.prop.refresh_from_db()
        self.assertEqual(self.prop.token_price, Decimal('112.50'))
        self.assertEqual(self.prop.launch_price, Decimal('100.00'))
        self.assertEqual(self.prop.total_value, Decimal('1125000.00'))
        self.assertEqual(self.prop.minimum_investment, Decimal('562.50'))  # still 5 shares
        self.assertEqual((change.previous_price, change.price, change.change_pct), (Decimal('100.00'),
                                                                                  Decimal('112.50'), Decimal('12.50')))
        # The holder's position is valued at the new price (latest valuation)
        inv = self.holder.investments.get()
        self.assertEqual(inv.current_value, Decimal('11250.00'))
        self.assertEqual(PropertyValuation.objects.filter(property=self.prop).count(), 1)
        # Holder and installment buyer are told; nobody else
        told = set(Notification.objects.filter(title__startswith='New share price').values_list('user__email',
                                                                                               flat=True))
        self.assertEqual(told, {'holder-price@example.com', 'plan-price@example.com'})
        msg = Notification.objects.filter(user=self.holder).latest('created_at').message
        self.assertIn('from $100.00 to $112.50 (+12.50%) — Phase 2', msg)
        self.assertIn('Structure completed.', msg)
        change.refresh_from_db()
        self.assertEqual(change.owners_notified, 2)

    def test_history_is_append_only(self):
        change = self._record('110.00')
        change.note = 'edited'
        with self.assertRaises(ValueError):
            change.save()
        with self.assertRaises(ValueError):
            change.delete()

    def test_validation(self):
        with self.assertRaises(pricing.PriceError) as e:
            pricing.validate_new_price(self.prop, '100')
        self.assertEqual(e.exception.code, 'same_price')
        with self.assertRaises(pricing.PriceError) as e:
            pricing.validate_new_price(self.prop, '0')
        self.assertEqual(e.exception.code, 'invalid')
        with self.assertRaises(pricing.PriceError) as e:
            pricing.validate_new_price(self.prop, '130')
        self.assertEqual(e.exception.code, 'large_change')
        self.assertEqual(pricing.validate_new_price(self.prop, '130', confirm_large=True), Decimal('130.00'))
        with self.assertRaises(pricing.PriceError):
            self._record('130', source='admin', confirm_large=False)
        self.assertFalse(PropertyPriceChange.objects.exists())

    def test_draft_property_gets_the_price_silently(self):
        draft = make_property(self.owner, title='Draft', is_published=False, tokens_sold=0)
        with self.captureOnCommitCallbacks(execute=True):
            self.assertIsNone(pricing.record_price(draft, '120', by=self.admin))
        draft.refresh_from_db()
        self.assertEqual((draft.token_price, draft.launch_price), (Decimal('120.00'), None))
        self.assertFalse(draft.price_history.exists())

    def test_price_phase_goes_through_the_history(self):
        PropertyPriceTier.objects.create(property=self.prop, label='Phase 2', price_per_token=Decimal('140.00'),
                                         effective_from=timezone.now().date())
        from properties.payment_plan import sync_price_tier
        with self.captureOnCommitCallbacks(execute=True):
            self.assertTrue(sync_price_tier(self.prop))
        change = self.prop.price_history.get()
        self.assertEqual((change.source, change.label, change.price), ('phase', 'Phase 2', Decimal('140.00')))
        self.assertTrue(Notification.objects.filter(user=self.holder, title__startswith='New share price').exists())

    def test_public_history_endpoint(self):
        self._record('105.00', label='Phase 2')
        self._record('99.00')
        res = APIClient().get(f'/api/v1/properties/{self.prop.id}/prices/')
        self.assertEqual(res.status_code, 200, res.content)
        data = body(res)
        self.assertEqual((data['launch_price'], data['current_price'], data['change_pct'], data['changes']),
                         ('100.00', '99.00', '-1.00', 2))
        self.assertEqual([p['price'] for p in data['points']], ['100.00', '105.00', '99.00'])
        self.assertEqual(data['points'][1]['label'], 'Phase 2')

    def test_admin_page_changes_the_price(self):
        c = self.client
        c.force_login(self.admin)
        url = f'/admin/properties/propertytokenprice/{self.prop.pk}/change/'
        page = c.get(url)
        self.assertContains(page, 'Set a new share price')
        self.assertContains(page, 'Owners who will be told')
        r = c.post(url, {'new_price': '150'})
        self.assertContains(r, 'Tick')  # more than 25% needs the confirmation
        with self.captureOnCommitCallbacks(execute=True):
            r = c.post(url, {'new_price': '150', 'label': 'Handover', 'confirm_large': 'on'})
        self.assertEqual(r.status_code, 302)
        self.prop.refresh_from_db()
        self.assertEqual(self.prop.token_price, Decimal('150.00'))
        self.assertEqual(self.prop.price_history.get().created_by, self.admin)
        # The property form now shows the price read-only, with the button to this page
        form = c.get(f'/admin/properties/property/{self.prop.pk}/change/')
        self.assertContains(form, 'Change the share price')
        self.assertNotContains(form, 'name="token_price"')
        self.assertEqual(c.get('/admin/properties/propertytokenprice/').status_code, 200)

    def test_staff_who_is_not_superuser_cannot_change(self):
        staff = make_user(email='staff-price@example.com', role='admin', is_staff=True, is_superuser=False)
        from django.contrib.auth.models import Permission
        staff.user_permissions.add(*Permission.objects.filter(codename__in=['view_propertytokenprice']))
        self.client.force_login(staff)
        url = f'/admin/properties/propertytokenprice/{self.prop.pk}/change/'
        self.assertContains(self.client.get(url), 'Only a full admin')
        self.assertEqual(self.client.post(url, {'new_price': '110'}).status_code, 403)
        self.prop.refresh_from_db()
        self.assertEqual(self.prop.token_price, Decimal('100.00'))
