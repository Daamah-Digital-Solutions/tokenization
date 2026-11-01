"""The admin writes a property's text in Arabic and French; the API sends it for the reader's language."""

from django.test import Client, TestCase
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from properties.models import Property
from properties.tests.test_payment_plan import make_property


class ContentTranslationTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email='own-tr@example.com', password='x12345678',
                                              role=UserRole.PROPERTY_OWNER)
        self.prop = make_property(self.owner, description='English text', description_ar='نص عربي',
                                  description_fr='Texte français', developer_name='Dev',
                                  developer_description='About', developer_description_fr='À propos',
                                  title_ar='برج')
        self.api = APIClient()

    def test_only_what_was_written_is_sent(self):
        self.assertEqual(self.prop.content_translations, {
            'ar': {'title': 'برج', 'description': 'نص عربي'},
            'fr': {'description': 'Texte français', 'developer_description': 'À propos'},
        })

    def test_the_list_and_the_property_page_send_them(self):
        res = self.api.get('/api/v1/properties/').json()
        res = res.get('data', res)
        rows = res.get('results', res) if isinstance(res, dict) else res
        card = next(r for r in rows if r['id'] == str(self.prop.id))
        self.assertEqual(card['translations']['fr']['description'], 'Texte français')
        self.assertEqual(card['description'], 'English text')
        self.api.force_authenticate(self.owner)
        page = self.api.get(f'/api/v1/properties/{self.prop.id}/').json()
        page = page.get('data', page)
        self.assertEqual(page['translations']['ar']['title'], 'برج')

    def test_no_translation_is_an_empty_dict(self):
        other = make_property(self.owner, title='Other')
        self.assertEqual(other.content_translations, {})

    def test_the_admin_form_has_the_fields(self):
        staff = User.objects.create_superuser(email='super-tr@example.com', password='x12345678')
        client = Client()
        client.force_login(staff)
        html = client.get(f'/admin/properties/property/{self.prop.pk}/change/').content.decode()
        for field in ('description_ar', 'description_fr', 'developer_description_ar', 'developer_description_fr',
                      'title_fr', 'insurance_coverage_fr'):
            self.assertIn(f'name="{field}"', html)

    def test_every_translated_field_exists_in_arabic_and_french(self):
        for field in Property.TRANSLATED_FIELDS:
            Property._meta.get_field(f'{field}_ar')
            Property._meta.get_field(f'{field}_fr')
