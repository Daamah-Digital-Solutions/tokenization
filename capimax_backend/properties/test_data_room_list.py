"""
Client round 4, #1: the property Documents tab crashed on every property
because the data room answered with a page object instead of a list.
"""

from decimal import Decimal

from django.core.files.base import ContentFile
from django.test import TestCase
from rest_framework.test import APIClient

from core.factories import make_investment, make_property, make_ready_investor
from properties.models import PropertyDocument


class DataRoomListTests(TestCase):
    def setUp(self):
        self.prop = make_property(token_price=Decimal('10.00'), total_tokens=1000)
        for name, public, investors in (('Brochure', True, True), ('Title deed', False, True),
                                        ('Owner ID', False, False)):
            doc = PropertyDocument(property=self.prop, name=name, document_type='ownership',
                                   is_public=public, investor_access=investors)
            doc.document.save(f'{name}.pdf', ContentFile(b'%PDF-1.4'), save=False)
            doc.save()
        self.client = APIClient()

    def _names(self):
        res = self.client.get(f'/api/v1/properties/{self.prop.pk}/data-room/')
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIsInstance(body, list)  # a plain list, not {count, results}
        self.assertTrue(all(d['document_url'] and d['document_type'] for d in body))
        return sorted(d['name'] for d in body)

    def test_visitor_sees_public_documents(self):
        self.assertEqual(self._names(), ['Brochure'])

    def test_holder_sees_investor_documents_but_not_a_cancelled_buyer(self):
        holder, cancelled = make_ready_investor(), make_ready_investor()
        make_investment(user=holder, prop=self.prop, token_amount=5, investment_amount=Decimal('50'),
                        status='completed')
        make_investment(user=cancelled, prop=self.prop, token_amount=5, investment_amount=Decimal('50'),
                        status='cancelled')
        self.client.force_authenticate(holder)
        self.assertEqual(self._names(), ['Brochure', 'Title deed'])
        self.client.force_authenticate(cancelled)
        self.assertEqual(self._names(), ['Brochure'])
