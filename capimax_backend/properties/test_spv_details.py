"""
Client round 4, #6: the property page shows the real owning company and sends
the look-up to the Wyoming Secretary of State — nothing invented.
"""

from datetime import date
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from core.factories import make_property, make_ready_investor
from legal.models import LegalEntity
from properties.spv import WYOMING_BUSINESS_SEARCH, spv_details


class SpvDetailsTests(TestCase):
    def setUp(self):
        self.prop = make_property(token_price=Decimal('10.00'), total_tokens=1000)

    def test_no_company_means_no_made_up_data(self):
        self.assertIsNone(spv_details(self.prop))

    def test_legal_entity_is_used_and_wyoming_links_to_the_registry(self):
        self.prop.spv_entity = LegalEntity.objects.create(
            name='Capimax Property 042, LLC', jurisdiction='Wyoming, USA', registration_number='2026-001234567',
            formation_date=date(2026, 1, 15), status='active')
        self.prop.save(update_fields=['spv_entity'])
        client = APIClient()
        client.force_authenticate(make_ready_investor())
        res = client.get(f'/api/v1/properties/{self.prop.pk}/')
        body = res.json()
        spv = (body.get('data') or body)['spv']
        self.assertEqual(spv['name'], 'Capimax Property 042, LLC')
        self.assertEqual(spv['registration_number'], '2026-001234567')
        self.assertEqual(spv['registry_url'], WYOMING_BUSINESS_SEARCH)

    def test_other_jurisdiction_gets_no_wyoming_link(self):
        self.prop.spv_entity = LegalEntity.objects.create(
            name='DIFC Holdings Ltd', jurisdiction='DIFC', registration_number='CL1234', formation_date=date(2025, 5, 1))
        self.prop.save(update_fields=['spv_entity'])
        self.assertIsNone(spv_details(self.prop)['registry_url'])

    def test_legacy_fields_fallback(self):
        self.prop.spv_company_name, self.prop.spv_registration_number = 'Old SPV LLC', 'WY-77'
        self.assertEqual(spv_details(self.prop)['registration_number'], 'WY-77')
