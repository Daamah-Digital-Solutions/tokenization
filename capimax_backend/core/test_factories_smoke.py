"""Smoke tests for `core.factories`. If these pass, every other golden-path
test in this codebase can rely on the factories to produce valid instances."""

from __future__ import annotations

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from core.factories import (
    make_admin,
    make_broker,
    make_investment,
    make_investor,
    make_legal_entity,
    make_payment,
    make_pending_mint_investment,
    make_property,
    make_property_owner,
    make_ready_investor,
    make_tokenized_property,
    make_user,
    make_wallet_balance,
)

User = get_user_model()


class FactorySmokeTests(TestCase):
    def test_make_user_default_is_verified_investor(self):
        u = make_user()
        self.assertTrue(u.id)
        self.assertEqual(u.role, 'investor')
        self.assertTrue(u.is_verified)
        self.assertTrue(u.wallet_address.startswith('0x'))

    def test_role_factories_set_correct_role(self):
        self.assertEqual(make_investor().role, 'investor')
        self.assertEqual(make_property_owner().role, 'property_owner')
        self.assertEqual(make_broker().role, 'broker')
        admin = make_admin()
        self.assertEqual(admin.role, 'admin')
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)

    def test_unique_emails_per_call(self):
        a, b = make_user(), make_user()
        self.assertNotEqual(a.email, b.email)

    def test_make_property_assigns_owner_and_contract(self):
        p = make_property()
        self.assertEqual(p.owner.role, 'property_owner')
        self.assertTrue(p.smart_contract_address.startswith('0x'))
        self.assertEqual(p.status, 'tokenized')
        self.assertEqual(p.lockup_months, 0)

    def test_make_legal_entity_has_unique_regnum(self):
        a = make_legal_entity()
        b = make_legal_entity()
        self.assertEqual(a.status, 'active')
        self.assertNotEqual(a.registration_number, b.registration_number)

    def test_make_investment_links_user_property(self):
        inv = make_investment()
        self.assertEqual(inv.status, 'pending')
        self.assertEqual(inv.token_amount, 100)
        self.assertEqual(inv.investment_amount, Decimal('1000.00'))
        self.assertEqual(inv.user.role, 'investor')

    def test_make_pending_mint_investment_is_dispatcher_ready(self):
        inv = make_pending_mint_investment()
        self.assertEqual(inv.status, 'pending_mint')
        self.assertIsNotNone(inv.mint_scheduled_at)

    def test_make_payment_defaults_to_pending(self):
        p = make_payment()
        self.assertEqual(p.status, 'pending')
        self.assertEqual(p.amount, Decimal('1000.00'))
        self.assertEqual(p.net_amount, Decimal('1000.00'))

    def test_make_wallet_balance_credits_correct_amount(self):
        wb = make_wallet_balance(available_balance=Decimal('5000.00'))
        self.assertEqual(wb.available_balance, Decimal('5000.00'))
        self.assertEqual(wb.currency, 'USD')

    def test_make_ready_investor_has_funded_wallet(self):
        from payments.models import WalletBalance
        inv = make_ready_investor()
        wb = WalletBalance.objects.get(user=inv, currency='USD')
        self.assertEqual(wb.available_balance, Decimal('10000.00'))

    def test_make_tokenized_property_with_spv_links_entity(self):
        p = make_tokenized_property(with_spv=True)
        self.assertIsNotNone(p.spv_entity)
        self.assertEqual(p.spv_entity.status, 'active')
