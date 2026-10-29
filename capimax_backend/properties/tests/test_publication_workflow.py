"""
Client round 3, #23/#24 + admin note #1: submitting a property must never
publish it; only an admin publishes, after approval; the owner is told
every decision through their Messages inbox.
"""

from decimal import Decimal

from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory, TestCase
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from properties import workflow
from properties.admin import PropertyAdmin
from properties.models import (
    OwnerMessage, Property, PropertyApproval, PropertyDocument, PropertyStatus,
)

SUBMISSION = {
    'title': 'Nile View Residences',
    'description': 'A new residential building on the Nile.',
    'property_type': 'residential',
    'property_category': 'ready_property',
    'total_value': '1000000.00',
    'token_price': '100.00',
    'total_tokens': 10000,
    'address': '1 Corniche St',
    'city': 'Cairo',
    'country': 'EG',
}


class PublicationWorkflowTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email='owner-wf@example.com', password='x12345678', role=UserRole.PROPERTY_OWNER)
        self.admin = User.objects.create_user(
            email='admin-wf@example.com', password='x12345678', role=UserRole.ADMIN)
        self.stranger = User.objects.create_user(
            email='buyer-wf@example.com', password='x12345678', role=UserRole.INVESTOR)
        self.owner_client = APIClient()
        self.owner_client.force_authenticate(self.owner)

    def _submit(self, **overrides):
        payload = {**SUBMISSION, **overrides}
        response = self.owner_client.post('/api/v1/properties/', payload, format='json')
        self.assertEqual(response.status_code, 201, response.content)
        return Property.objects.get(pk=response.data['id'])

    def _public_ids(self, client=None):
        client = client or APIClient()
        response = client.get('/api/v1/properties/')
        self.assertEqual(response.status_code, 200)
        body = response.data
        results = body.get('results') or body.get('data', {}).get('results') or []
        return {r['id'] for r in results}

    def test_submission_is_hidden_from_everyone(self):
        prop = self._submit()
        self.assertEqual(prop.status, PropertyStatus.PENDING_APPROVAL)
        self.assertFalse(prop.is_published)
        # Not in public listings — anonymous, another user, the owner, or staff.
        for user in (None, self.stranger, self.owner, self.admin):
            client = APIClient()
            if user:
                client.force_authenticate(user)
            self.assertNotIn(str(prop.pk), self._public_ids(client))
        # Detail page: 404 for the public, visible to the owner.
        self.assertEqual(APIClient().get(f'/api/v1/properties/{prop.pk}/').status_code, 404)
        self.assertEqual(self.owner_client.get(f'/api/v1/properties/{prop.pk}/').status_code, 200)

    def test_owner_cannot_publish_or_feature(self):
        prop = self._submit(featured=True)
        self.assertFalse(prop.featured)
        self.owner_client.patch(f'/api/v1/properties/{prop.pk}/',
                                {'is_published': True, 'status': 'active', 'featured': True},
                                format='json')
        prop.refresh_from_db()
        self.assertFalse(prop.is_published)
        self.assertEqual(prop.status, PropertyStatus.PENDING_APPROVAL)
        self.assertFalse(prop.featured)

    def test_approval_does_not_publish_admin_publish_does(self):
        prop = self._submit()
        workflow.approve(prop, self.admin, 'Looks good')
        prop.refresh_from_db()
        self.assertEqual(prop.status, PropertyStatus.APPROVED)
        self.assertNotIn(str(prop.pk), self._public_ids())

        workflow.publish(prop, self.admin)
        prop.refresh_from_db()
        self.assertTrue(prop.is_published)
        self.assertEqual(prop.status, PropertyStatus.ACTIVE)
        self.assertIn(str(prop.pk), self._public_ids())

        workflow.unpublish(prop, self.admin, 'Updating documents')
        self.assertNotIn(str(prop.pk), self._public_ids())

    def test_cannot_publish_before_approval(self):
        prop = self._submit()
        with self.assertRaises(workflow.WorkflowError):
            workflow.publish(prop, self.admin)

    def test_owner_edits_locked_after_approval(self):
        prop = self._submit()
        ok = self.owner_client.patch(f'/api/v1/properties/{prop.pk}/', {'title': 'Edited'}, format='json')
        self.assertEqual(ok.status_code, 200)
        workflow.approve(prop, self.admin)
        locked = self.owner_client.patch(f'/api/v1/properties/{prop.pk}/', {'title': 'Again'}, format='json')
        self.assertEqual(locked.status_code, 403)

    def test_request_changes_messages_owner_and_resubmit(self):
        prop = self._submit()
        workflow.request_changes(prop, self.admin, 'Please upload the title deed.')
        prop.refresh_from_db()
        self.assertEqual(prop.status, PropertyStatus.DRAFT)

        inbox = self.owner_client.get('/api/v1/properties/owner/messages/').data
        subjects = [m['subject'] for m in inbox['results']]
        self.assertTrue(any('Changes requested' in s for s in subjects))
        self.assertGreaterEqual(inbox['unread_count'], 1)

        # Owner replies, then resubmits — still hidden.
        reply = self.owner_client.post('/api/v1/properties/owner/messages/',
                                       {'property': str(prop.pk), 'body': 'Deed uploaded.'}, format='json')
        self.assertEqual(reply.status_code, 201)
        resubmit = self.owner_client.post(f'/api/v1/properties/{prop.pk}/submit-for-approval/')
        self.assertEqual(resubmit.status_code, 200)
        prop.refresh_from_db()
        self.assertEqual(prop.status, PropertyStatus.PENDING_APPROVAL)
        self.assertFalse(prop.is_published)

        self.owner_client.post('/api/v1/properties/owner/messages/read/', {}, format='json')
        self.assertEqual(self.owner_client.get('/api/v1/properties/owner/messages/').data['unread_count'], 0)

    def test_owner_cannot_message_about_someone_elses_property(self):
        prop = self._submit()
        other = APIClient()
        other.force_authenticate(self.stranger)
        response = other.post('/api/v1/properties/owner/messages/',
                              {'property': str(prop.pk), 'body': 'hi'}, format='json')
        self.assertEqual(response.status_code, 404)

    def test_owner_documents_are_private_and_hidden_from_public_detail(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        prop = self._submit()
        upload = self.owner_client.post(
            f'/api/v1/properties/{prop.pk}/documents/',
            {'document': SimpleUploadedFile('deed.pdf', b'%PDF-1.4 deed', content_type='application/pdf'),
             'name': 'Title deed', 'document_type': 'ownership'},
            format='multipart')
        self.assertEqual(upload.status_code, 201, upload.content)
        doc = PropertyDocument.objects.get(property=prop)
        self.assertFalse(doc.is_public)
        self.assertFalse(doc.investor_access)
        self.assertGreater(doc.size, 0)

        workflow.approve(prop, self.admin)
        workflow.publish(prop, self.admin)
        public_detail = APIClient().get(f'/api/v1/properties/{prop.pk}/').data
        self.assertEqual(public_detail['documents'], [])

    def test_cannot_buy_unpublished_property(self):
        prop = self._submit()
        self.assertFalse(prop.can_accept_investments)


class AdminAddPropertyTests(TestCase):
    """Admin note #1: adding a property from the admin failed."""

    def setUp(self):
        self.admin_user = User.objects.create_user(
            email='admin-add@example.com', password='x12345678', role=UserRole.ADMIN)
        self.owner = User.objects.create_user(
            email='owner-add@example.com', password='x12345678', role=UserRole.PROPERTY_OWNER)

    def test_document_without_size_saves(self):
        from django.core.files.base import ContentFile
        prop = Property.objects.create(owner=self.owner, title='T', description='D',
                                       property_type='residential', total_value=Decimal('100'),
                                       token_price=Decimal('1'), total_tokens=100,
                                       address='A', city='C', country='EG')
        doc = PropertyDocument(property=prop, name='Deed', document_type='ownership')
        doc.document.save('deed.pdf', ContentFile(b'%PDF-1.4 x'), save=False)
        doc.save()
        self.assertGreater(doc.size, 0)

    def test_admin_add_form_with_document_succeeds(self):
        """POST the real Django-admin "Add property" form with a document."""
        from django.core.files.uploadedfile import SimpleUploadedFile
        from django.test import Client
        staff = User.objects.create_superuser(email='super-add@example.com', password='x12345678')
        client = Client()
        client.force_login(staff)
        self.assertEqual(client.get('/admin/properties/property/add/').status_code, 200)
        data = {
            'title': 'Admin Tower', 'description': 'Added from admin',
            'property_type': 'residential', 'property_category': 'ready_property',
            'owner': str(self.owner.pk), 'status': 'approved',
            'total_value': '100000', 'token_price': '100', 'total_tokens': '1000',
            'tokens_sold': '0', 'construction_progress': '0', 'occupancy_rate': '100',
            'address': '1 Admin St', 'city': 'Cairo', 'country': 'EG',
            'offering_type': 'private', 'lockup_months': '12',
            'purchase_methods': 'both', 'installment_down_payment_percent': '10',
            'installment_frequency': 'quarterly',
            'price_tiers-TOTAL_FORMS': '0', 'price_tiers-INITIAL_FORMS': '0',
            'price_tiers-MIN_NUM_FORMS': '0', 'price_tiers-MAX_NUM_FORMS': '1000',
            'images-TOTAL_FORMS': '0', 'images-INITIAL_FORMS': '0',
            'images-MIN_NUM_FORMS': '0', 'images-MAX_NUM_FORMS': '1000',
            'documents-TOTAL_FORMS': '1', 'documents-INITIAL_FORMS': '0',
            'documents-MIN_NUM_FORMS': '0', 'documents-MAX_NUM_FORMS': '1000',
            'documents-0-name': 'Title deed',
            'documents-0-document': SimpleUploadedFile('deed.pdf', b'%PDF-1.4 deed', content_type='application/pdf'),
            'documents-0-document_type': 'ownership',
            'documents-0-description': '',
            'documents-0-investor_access': 'on',
        }
        response = client.post('/admin/properties/property/add/', data)
        self.assertEqual(response.status_code, 302, response.content[:2000])
        prop = Property.objects.get(title='Admin Tower')
        self.assertEqual(prop.documents.count(), 1)
        self.assertGreater(prop.documents.first().size, 0)
        self.assertEqual(PropertyApproval.objects.get(property=prop).status, 'approved')
        self.assertFalse(prop.is_published)
        self.assertEqual(prop.purchase_methods, 'both')
        self.assertTrue(prop.supports_installments)

    def test_admin_change_form_saves(self):
        """
        Editing an existing property in the admin (client: "Save gives an error",
        e.g. cash + installments -> cash only). The review inline never ran
        formset.save(), so Django's change message crashed and rolled back.
        """
        from django.core.files.uploadedfile import SimpleUploadedFile
        from django.test import Client
        staff = User.objects.create_superuser(email='super-edit@example.com', password='x12345678')
        client = Client()
        client.force_login(staff)
        base = {
            'title': 'Mayfair Crown', 'description': 'Edited from admin',
            'property_type': 'residential', 'property_category': 'ready_property',
            'owner': str(self.owner.pk), 'status': 'approved',
            'total_value': '100000', 'token_price': '100', 'total_tokens': '1000',
            'tokens_sold': '0', 'construction_progress': '0', 'occupancy_rate': '100',
            'address': '350A Mayfair', 'city': 'London', 'country': 'GB',
            'offering_type': 'private', 'lockup_months': '12',
            'purchase_methods': 'both', 'installment_down_payment_percent': '10',
            'installment_frequency': 'monthly', 'installment_period_months': '12',
        }

        def forms(prefix, total, initial=0):
            return {f'{prefix}-TOTAL_FORMS': str(total), f'{prefix}-INITIAL_FORMS': str(initial),
                    f'{prefix}-MIN_NUM_FORMS': '0', f'{prefix}-MAX_NUM_FORMS': '1000'}

        client.post('/admin/properties/property/add/', {
            **base, **forms('price_tiers', 0), **forms('images', 0), **forms('documents', 1),
            'documents-0-name': 'valuation Report', 'documents-0-document_type': 'valuation',
            'documents-0-document': SimpleUploadedFile('v.pdf', b'%PDF-1.4 v', content_type='application/pdf'),
            'documents-0-investor_access': 'on',
        })
        prop = Property.objects.get(title='Mayfair Crown')
        approval = PropertyApproval.objects.get(property=prop)
        doc = prop.documents.get()
        url = f'/admin/properties/property/{prop.pk}/change/'
        self.assertEqual(client.get(url).status_code, 200)

        response = client.post(url, {
            **base, 'purchase_methods': 'cash',
            **forms('price_tiers', 0), **forms('images', 0), **forms('owner_messages', 0),
            **forms('approval', 1, 1), 'approval-0-id': str(approval.pk),
            'approval-0-property': str(prop.pk), 'approval-0-status': approval.status,
            **forms('documents', 1, 1), 'documents-0-id': str(doc.pk), 'documents-0-property': str(prop.pk),
            'documents-0-name': 'valuation Report', 'documents-0-document_type': 'valuation',
            'documents-0-investor_access': 'on',
        })
        self.assertEqual(response.status_code, 302, response.content[:3000])
        prop.refresh_from_db()
        self.assertEqual(prop.purchase_methods, 'cash')
        self.assertFalse(prop.supports_installments)
        self.assertEqual(prop.documents.count(), 1)

    def test_admin_created_property_is_approved_but_unpublished(self):
        site = AdminSite()
        model_admin = PropertyAdmin(Property, site)
        request = RequestFactory().post('/admin/')
        request.user = self.admin_user
        prop = Property(owner=self.owner, title='Admin listing', description='D',
                        property_type='residential', total_value=Decimal('100'),
                        token_price=Decimal('1'), total_tokens=100,
                        address='A', city='C', country='EG', status=PropertyStatus.APPROVED)

        class FakeForm:
            changed_data = []
            initial = {}
        model_admin.save_model(request, prop, FakeForm(), change=False)
        approval = PropertyApproval.objects.get(property=prop)
        self.assertEqual(approval.status, 'approved')
        self.assertFalse(prop.is_published)
        workflow.publish(prop, self.admin_user)
        prop.refresh_from_db()
        self.assertTrue(prop.is_published)
        self.assertTrue(OwnerMessage.objects.filter(owner=self.owner,
                                                    category=OwnerMessage.Category.PUBLICATION).exists())
