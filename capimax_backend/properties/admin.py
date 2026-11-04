"""
Django admin configuration for Properties app.

The Django admin IS the platform's admin panel (the React admin redirects
here). Client round 3:
  * admin note #1 — adding a property crashed (document `size` was NOT NULL
    but not in the inline) and admin-created properties had no approval
    record, so they never entered the review / publish workflow;
  * #23 — owners must receive the team's messages (review notes, document
    requests, results) → OwnerMessage inline + admin;
  * #24 — only the admin publishes. Review decisions and the publish switch
    run the real workflow in properties/workflow.py.
"""

from django.contrib import admin, messages
from django.utils import timezone
from django.utils.html import format_html

from .models import (
    OwnerMessage, Property, PropertyAnalytics, PropertyApproval, PropertyDocument,
    PropertyImage, PropertyMarketData, PropertyPriceTier, PropertyReview, PropertySubscription,
    PropertyUpdate, PropertyValuation, PropertyViewLog,
    RentDistribution, RentDistributionItem,
)
from . import workflow


def _notify_owner_of_admin_message(message):
    """In-app + email notification for a message written in the admin."""
    try:
        from notifications.services import NotificationService
        NotificationService.create_notification(
            user=message.owner,
            title=message.subject[:255],
            message=message.body[:1000],
            notification_type='property',
            priority='high' if message.category in (
                OwnerMessage.Category.CHANGES_REQUESTED,
                OwnerMessage.Category.DOCUMENT_REQUEST) else 'medium',
            action_url='/dashboard?view=messages',
            action_label='Open messages',
            send_real_time=True,
            send_email=True,
        )
    except Exception:
        import logging
        logging.getLogger(__name__).warning('Owner message notification failed', exc_info=True)


def _apply_review_decision(prop, reviewer, status, notes, required_changes):
    """Route an approval-status change through the workflow."""
    if status == 'approved':
        workflow.approve(prop, reviewer, notes)
    elif status == 'rejected':
        workflow.reject(prop, reviewer, notes or required_changes)
    elif status == 'requires_changes':
        workflow.request_changes(prop, reviewer, required_changes or notes, notes)
    else:
        approval, _ = PropertyApproval.objects.get_or_create(property=prop)
        approval.status = status
        approval.reviewer = reviewer
        approval.review_notes = notes
        approval.save()


class PropertyImageInline(admin.TabularInline):
    """Inline admin for property images."""
    model = PropertyImage
    extra = 1
    fields = ['image', 'caption', 'is_primary', 'order']


class PropertyDocumentInline(admin.TabularInline):
    """Inline admin for property documents (size is computed from the file)."""
    model = PropertyDocument
    extra = 0
    fields = ['name', 'document', 'document_type', 'description',
              'is_public', 'investor_access', 'size', 'uploaded_by']
    readonly_fields = ['size', 'uploaded_by']


class PropertyApprovalInline(admin.StackedInline):
    """Review decision on the property page itself."""
    model = PropertyApproval
    fk_name = 'property'
    can_delete = False
    max_num = 1
    extra = 0
    fields = ['status', 'required_changes', 'review_notes',
              'reviewer', 'submitted_at', 'reviewed_at', 'approved_at']
    readonly_fields = ['reviewer', 'submitted_at', 'reviewed_at', 'approved_at']
    verbose_name = 'Review decision'
    verbose_name_plural = 'Review decision (approve / request changes / reject)'


class OwnerMessageInline(admin.TabularInline):
    """Conversation with the owner about this property; add a row to send."""
    model = OwnerMessage
    fk_name = 'property'
    extra = 1
    fields = ['created_at', 'sender_role', 'category', 'subject', 'body', 'attachment', 'read_by_owner_at']
    readonly_fields = ['created_at', 'sender_role', 'read_by_owner_at']
    ordering = ['-created_at']
    verbose_name = 'Message to the owner'
    verbose_name_plural = 'Messages with the owner (add a row to send a message)'


class PropertyPriceTierInline(admin.TabularInline):
    """Price phases: the share price switches automatically on each start date."""
    model = PropertyPriceTier
    extra = 0
    fields = ['label', 'price_per_token', 'effective_from', 'effective_to', 'notes', 'order']
    verbose_name = 'Price phase'
    verbose_name_plural = 'Price phases (share price changes automatically on each start date)'


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    """Admin interface for Property model."""

    list_display = [
        'title', 'property_type', 'property_category', 'status', 'published_badge',
        'review_status', 'city', 'country', 'total_value', 'token_price',
        'tokens_sold', 'featured', 'created_at'
    ]

    list_filter = [
        'is_published', 'status', 'property_type', 'property_category',
        'featured', 'country', 'created_at'
    ]

    search_fields = ['title', 'description', 'city', 'address', 'owner__email']

    readonly_fields = [
        'id', 'published_at', 'published_by', 'tokens_available', 'funding_percentage',
        'is_fully_funded', 'can_accept_investments', 'created_at', 'updated_at', 'blockchain_panel',
    ]

    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'property_type', 'property_category', 'owner')
        }),
        ('Arabic & French content', {
            'fields': (
                ('title_ar', 'title_fr'),
                'description_ar', 'description_fr',
                ('developer_name_ar', 'developer_name_fr'),
                'developer_description_ar', 'developer_description_fr',
                'returns_notes_ar', 'returns_notes_fr',
                'financial_study_summary_ar', 'financial_study_summary_fr',
                'insurance_coverage_ar', 'insurance_coverage_fr',
                'installment_notes_ar', 'installment_notes_fr',
            ),
            'description': (
                'The same text as the English fields, for readers using the site in Arabic or French. '
                'Whatever you leave empty is shown in English.'
            ),
        }),
        ('Review & publication', {
            'fields': ('status', 'is_published', 'published_at', 'published_by', 'featured'),
            'description': (
                'Owner submissions are never public automatically. Approve the submission '
                'in the "Review decision" section below, complete the listing details, then '
                'tick "Is published" to list it publicly (or use the list actions).'
            ),
        }),
        ('Financial Details', {
            'fields': (
                'total_value', 'token_price', 'total_tokens', 'tokens_sold',
                'expected_return', 'rental_yield', 'minimum_investment'
            )
        }),
        ('Purchase methods & payment plan', {
            'fields': (
                'purchase_methods', 'installment_down_payment_percent', 'installment_count',
                'installment_frequency', 'installment_period_months',
                'installment_first_due_date', 'installment_minimum', 'installment_notes',
            ),
            'description': (
                'Choose how buyers may pay: full cash, installments, or both. The property '
                'page shows only the allowed methods and the full installment schedule. '
                'Leave "Installment count" empty to let the buyer choose 3 / 6 / 12 / up to '
                'the maximum period.'
            ),
        }),
        ('Developer', {
            'fields': (
                'developer_name', 'developer_description', 'developer_website',
                'developer_established_year', 'developer_projects_completed',
                'developer_contact_email', 'developer_contact_phone',
            ),
        }),
        ('Returns', {
            'fields': ('expected_appreciation_rate', 'projected_annual_rental_income', 'returns_notes'),
            'description': 'Expected return and rental yield are in "Financial Details" above.',
        }),
        ('Financial study', {
            'fields': ('financial_study_summary',),
            'description': 'Upload the study files below as documents of type "Financial" (public).',
        }),
        ('Insurance', {
            'fields': (
                'insurance_provider', 'insurance_policy_number', 'insurance_coverage',
                'insurance_coverage_amount', 'insurance_expiry_date',
            ),
            'description': 'Upload the policy below as a document of type "Insurance" (public).',
        }),
        ('Construction', {
            'fields': ('expected_completion_date', 'construction_progress'),
        }),
        ('Rental', {
            'fields': ('rental_income_active', 'monthly_rental_income', 'occupancy_rate'),
        }),
        ('Property Details', {
            'fields': (
                'property_size', 'year_built', 'address', 'city', 'state', 'country',
                'latitude', 'longitude'
            )
        }),
        ('Offering & compliance', {
            'fields': ('spv_entity', 'offering_type', 'requires_accredited_investors', 'lockup_months'),
        }),
        ('SPV (legacy text fields)', {
            'fields': (
                'spv_company_name', 'spv_registration_number',
                'spv_bank_account_number', 'spv_bank_name',
                'spv_establishment_date'
            ),
            'classes': ('collapse',),
        }),
        ('Blockchain', {
            'fields': ('blockchain_panel', 'smart_contract_address'),
            'description': (
                'Register the property on the blockchain with the button below, once it is approved and its '
                'shares, price and owning company (SPV) are filled in. Then download the tokenization report '
                '(Word) for the investors.'
            ),
        }),
        ('Computed Fields', {
            'fields': (
                'tokens_available', 'funding_percentage', 'is_fully_funded',
                'can_accept_investments'
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    inlines = [PropertyApprovalInline, OwnerMessageInline, PropertyPriceTierInline,
               PropertyImageInline, PropertyDocumentInline]
    actions = ['publish_selected', 'unpublish_selected', 'approve_selected', 'register_on_blockchain',
               'download_tokenization_report']

    # ---- Blockchain: register button + Word tokenization report (client, Nov 2026) ------------
    def get_urls(self):
        from django.urls import path
        own = [
            path('<path:object_id>/blockchain/register/', self.admin_site.admin_view(self.blockchain_register_view),
                 name='properties_property_blockchain_register'),
            path('<path:object_id>/blockchain/report/', self.admin_site.admin_view(self.blockchain_report_view),
                 name='properties_property_blockchain_report'),
        ]
        return own + super().get_urls()

    @admin.display(description='Blockchain')
    def blockchain_panel(self, obj):
        from django.urls import reverse
        from django.utils.safestring import mark_safe
        from blockchain import registration as chain
        if obj is None or not obj.pk:
            return 'Save the property first.'
        reg = chain.latest(obj)
        register = reverse('admin:properties_property_blockchain_register', args=[obj.pk])
        report = reverse('admin:properties_property_blockchain_report', args=[obj.pk])
        btn = '<a class="button" style="padding:6px 12px;margin-right:8px;display:inline-block" href="{}">{}</a>'
        parts = []
        if obj.smart_contract_address:
            parts.append(format_html('<p style="margin:0 0 8px"><b style="color:#059669">On the blockchain</b> — '
                                     'token contract <code>{}</code></p>', obj.smart_contract_address))
            parts.append(format_html(btn, report, 'Download tokenization report (Word)'))
        elif reg is not None and reg.status in ('queued', 'sent'):
            tx = (format_html(' Transaction: <a href="{}" target="_blank" rel="noopener">{}</a>',
                              reg.tx_url, reg.tx_hash[:18] + '…') if reg.tx_url else '')
            parts.append(format_html('<p style="margin:0"><b style="color:#2563eb">{}</b> — started {}. '
                                     'Reload this page in a minute.{}</p>', reg.get_status_display(),
                                     reg.created_at.strftime('%d %b %Y %H:%M'), tx))
        else:
            if reg is not None and reg.status == 'failed':
                parts.append(format_html('<p style="margin:0 0 8px;color:#b91c1c"><b>Last attempt failed:</b> {}</p>',
                                         reg.error))
            parts.append(format_html(btn, register, 'Register on the blockchain'))
        return mark_safe(''.join(str(p) for p in parts))

    def blockchain_register_view(self, request, object_id):
        from decimal import Decimal, InvalidOperation
        from django.shortcuts import get_object_or_404, redirect
        from django.template.response import TemplateResponse
        from django.urls import reverse
        from blockchain import registration as chain

        prop = get_object_or_404(Property, pk=object_id)
        back = reverse('admin:properties_property_change', args=[prop.pk])
        if not request.user.is_superuser:
            self.message_user(request, 'Only a full admin can register a property on the blockchain.',
                              level=messages.ERROR)
            return redirect(back)
        nets = chain.networks()
        terms = chain.default_terms(prop)
        network = chain.default_network()
        error = ''
        if request.method == 'POST':
            network = next((n for n in nets if str(n.pk) == request.POST.get('network')), None)
            try:
                terms = chain.Terms(lockup_months=int(request.POST.get('lockup_months') or 0),
                                    early_exit_fee_pct=Decimal(request.POST.get('early_exit_fee_pct') or '0'),
                                    distribution_frequency=int(request.POST.get('distribution_frequency') or 0))
                if network is None:
                    raise chain.RegistrationError('Choose a network.')
                if not request.POST.get('confirm'):
                    raise chain.RegistrationError('Tick the confirmation box: this writes to the blockchain and '
                                                  'cannot be undone.')
                if chain.is_mainnet(network) and request.POST.get('mainnet_confirm') != 'MAINNET':
                    raise chain.RegistrationError('Type MAINNET to confirm registering on the main network.')
                chain.request(prop, network, terms, by=request.user)
            except (ValueError, InvalidOperation):
                error = 'Enter whole months for the lock-up and a number for the fee.'
            except chain.RegistrationError as exc:
                error = exc.message
            else:
                self.message_user(request, f'Registration of "{prop.title}" started on {network.name}. It takes about '
                                           f'a minute; you will get an email when it is done.')
                return redirect(back)
        context = {
            **self.admin_site.each_context(request),
            'opts': self.model._meta, 'original': prop, 'title': f'Register "{prop.title}" on the blockchain',
            'prop': prop, 'networks': nets, 'network': network, 'terms': terms, 'error': error,
            'problems': chain.problems(prop, network), 'warnings': chain.warnings(prop),
            'frequencies': sorted(chain.FREQUENCIES.items()),
            'rental_yield_pct': Decimal(chain.rental_yield_bps(prop)) / 100,
            'is_mainnet': bool(network and chain.is_mainnet(network)),
            'spv': prop.spv_entity if getattr(prop, 'spv_entity_id', None) else None,
            'shares_display': f'{int(prop.total_tokens or 0):,}', 'back': back,
        }
        return TemplateResponse(request, 'admin/blockchain/register_property.html', context)

    def blockchain_report_view(self, request, object_id):
        from django.http import HttpResponse
        from django.shortcuts import get_object_or_404, redirect
        from django.urls import reverse
        from blockchain.tokenization_report import ReportError, build, filename

        prop = get_object_or_404(Property, pk=object_id)
        try:
            data = build(prop)
        except ReportError as exc:
            self.message_user(request, exc.message, level=messages.WARNING)
            return redirect(reverse('admin:properties_property_change', args=[prop.pk]))
        response = HttpResponse(
            data, content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        response['Content-Disposition'] = f'attachment; filename="{filename(prop)}"'
        return response

    @admin.action(description='Register on the blockchain (one property)')
    def register_on_blockchain(self, request, queryset):
        from django.shortcuts import redirect
        from django.urls import reverse
        if queryset.count() != 1:
            self.message_user(request, 'Select exactly one property to register.', level=messages.WARNING)
            return None
        return redirect(reverse('admin:properties_property_blockchain_register', args=[queryset.first().pk]))

    @admin.action(description='Download tokenization report (Word, one property)')
    def download_tokenization_report(self, request, queryset):
        if queryset.count() != 1:
            self.message_user(request, 'Select exactly one property.', level=messages.WARNING)
            return None
        return self.blockchain_report_view(request, str(queryset.first().pk))

    def get_fieldsets(self, request, obj=None):
        """
        The computed fields (tokens available, funding %) divide/subtract
        values that don't exist yet on a new property, so the "Add property"
        page itself crashed with a TypeError (admin note #1). Show them only
        when editing an existing property.
        """
        fieldsets = super().get_fieldsets(request, obj)
        if obj is None:
            fieldsets = [fs for fs in fieldsets if fs[0] != 'Computed Fields']
        return fieldsets

    def get_inlines(self, request, obj):
        # Review decision + messages need an existing property and owner.
        if obj is None:
            return [PropertyPriceTierInline, PropertyImageInline, PropertyDocumentInline]
        return super().get_inlines(request, obj)

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        # A phase that starts today (or already started) applies immediately.
        from .payment_plan import sync_price_tier
        sync_price_tier(form.instance)

    @admin.display(description='Public', boolean=True)
    def published_badge(self, obj):
        return workflow.is_public(obj)

    @admin.display(description='Review')
    def review_status(self, obj):
        approval = getattr(obj, 'approval', None)
        if approval is None:
            return '-'
        colors = {'approved': '#10b981', 'rejected': '#ef4444', 'requires_changes': '#f97316',
                  'pending': '#f59e0b', 'under_review': '#3b82f6'}
        return format_html('<span style="color:{};font-weight:600">{}</span>',
                           colors.get(approval.status, '#6b7280'), approval.get_status_display())

    def save_model(self, request, obj, form, change):
        """
        * New property from the admin = reviewed by that admin (approval
          record created as approved) but still unpublished until published.
        * Ticking / unticking "Is published" runs publish / unpublish.
        """
        publish_changed = 'is_published' in form.changed_data
        wants_published = obj.is_published
        if publish_changed:
            obj.is_published = form.initial.get('is_published', False) if change else False
        super().save_model(request, obj, form, change)

        if not change:
            PropertyAnalytics.objects.get_or_create(property=obj)
            PropertyApproval.objects.get_or_create(
                property=obj,
                defaults={'status': 'approved', 'reviewer': request.user,
                          'reviewed_at': timezone.now(), 'approved_at': timezone.now()},
            )

        if publish_changed:
            try:
                if wants_published:
                    workflow.publish(obj, request.user)
                    self.message_user(request, f'"{obj.title}" is now published.', messages.SUCCESS)
                else:
                    workflow.unpublish(obj, request.user)
                    self.message_user(request, f'"{obj.title}" was unpublished.', messages.INFO)
            except workflow.WorkflowError as exc:
                self.message_user(request, f'Not published: {exc}', messages.ERROR)

    def save_formset(self, request, form, formset, change):
        prop = form.instance
        if formset.model is OwnerMessage:
            instances = formset.save(commit=False)
            for obj in formset.deleted_objects:
                obj.delete()
            for message in instances:
                is_new = message._state.adding
                if is_new:
                    message.owner = prop.owner
                    message.property = prop
                    message.sender = request.user
                    message.sender_role = OwnerMessage.SenderRole.ADMIN
                message.save()
                if is_new:
                    _notify_owner_of_admin_message(message)
            return
        if formset.model is PropertyApproval:
            for f in formset.forms:
                if not f.has_changed() or not f.cleaned_data:
                    continue
                data = f.cleaned_data
                if 'status' in f.changed_data or f.instance._state.adding:
                    _apply_review_decision(prop, request.user, data.get('status'),
                                           data.get('review_notes', ''), data.get('required_changes', ''))
                else:
                    f.save()
            # formset.save() is never called here, and Django's change message
            # reads these afterwards: without them EVERY edit of an existing
            # property crashed and was rolled back (client: "Save gives an error").
            formset.new_objects, formset.changed_objects, formset.deleted_objects = [], [], []
            return
        super().save_formset(request, form, formset, change)

    @admin.action(description='Publish selected properties (list them publicly)')
    def publish_selected(self, request, queryset):
        done, failed = 0, []
        for prop in queryset:
            try:
                workflow.publish(prop, request.user)
                done += 1
            except workflow.WorkflowError:
                failed.append(prop.title)
        self.message_user(request, f'{done} property(ies) published.', messages.SUCCESS)
        if failed:
            self.message_user(request, 'Approve these before publishing: ' + ', '.join(failed),
                              messages.WARNING)

    @admin.action(description='Unpublish selected properties (hide from the public)')
    def unpublish_selected(self, request, queryset):
        for prop in queryset:
            workflow.unpublish(prop, request.user)
        self.message_user(request, f'{queryset.count()} property(ies) unpublished.', messages.INFO)

    @admin.action(description='Approve selected submissions (does not publish)')
    def approve_selected(self, request, queryset):
        for prop in queryset:
            workflow.approve(prop, request.user)
        self.message_user(request, f'{queryset.count()} submission(s) approved.', messages.SUCCESS)


@admin.register(OwnerMessage)
class OwnerMessageAdmin(admin.ModelAdmin):
    """All conversations with owners / developers."""
    list_display = ['subject', 'owner', 'property', 'sender_role', 'category',
                    'created_at', 'read_by_owner_at', 'read_by_admin_at']
    list_filter = ['sender_role', 'category', 'created_at']
    search_fields = ['subject', 'body', 'owner__email', 'property__title']
    autocomplete_fields = ['owner', 'property']
    readonly_fields = ['sender', 'sender_role', 'created_at', 'read_by_owner_at', 'read_by_admin_at']
    fields = ['owner', 'property', 'category', 'subject', 'body', 'subject_ar', 'body_ar',
              'attachment', 'sender', 'sender_role', 'created_at', 'read_by_owner_at',
              'read_by_admin_at']
    actions = ['mark_read_by_admin']

    def save_model(self, request, obj, form, change):
        is_new = not change
        if is_new:
            obj.sender = request.user
            obj.sender_role = OwnerMessage.SenderRole.ADMIN
            if obj.property_id and not obj.owner_id:
                obj.owner = obj.property.owner
        super().save_model(request, obj, form, change)
        if is_new:
            _notify_owner_of_admin_message(obj)

    @admin.action(description='Mark selected as read by the team')
    def mark_read_by_admin(self, request, queryset):
        updated = queryset.filter(read_by_admin_at__isnull=True).update(read_by_admin_at=timezone.now())
        self.message_user(request, f'{updated} message(s) marked read.')


@admin.register(PropertyAnalytics)
class PropertyAnalyticsAdmin(admin.ModelAdmin):
    """Admin interface for PropertyAnalytics model."""

    list_display = [
        'property', 'total_views', 'unique_views', 'total_subscriptions',
        'conversion_rate', 'last_updated'
    ]
    readonly_fields = ['last_updated', 'created_at']
    search_fields = ['property__title']


@admin.register(PropertyApproval)
class PropertyApprovalAdmin(admin.ModelAdmin):
    """Admin interface for PropertyApproval model."""

    list_display = [
        'property', 'status', 'reviewer', 'submitted_at', 'reviewed_at', 'approved_at'
    ]
    list_filter = ['status', 'submitted_at', 'reviewed_at']
    search_fields = ['property__title', 'reviewer__email']
    readonly_fields = ['submitted_at', 'reviewed_at', 'approved_at']
    autocomplete_fields = ['property', 'reviewer']

    actions = ['approve_selected', 'reject_selected', 'mark_under_review']

    def save_model(self, request, obj, form, change):
        """Status changes run the workflow (property status, owner message, email)."""
        if change and 'status' in form.changed_data:
            _apply_review_decision(obj.property, request.user, obj.status,
                                   obj.review_notes, obj.required_changes)
            return
        super().save_model(request, obj, form, change)

    @admin.action(description="Approve selected properties (does not publish)")
    def approve_selected(self, request, queryset):
        approved = 0
        for approval in queryset.exclude(status='approved'):
            workflow.approve(approval.property, request.user, approval.review_notes)
            approved += 1
        self.message_user(request, f"{approved} property approval(s) marked approved.")

    @admin.action(description="Reject selected properties")
    def reject_selected(self, request, queryset):
        rejected = 0
        for approval in queryset.exclude(status='rejected'):
            workflow.reject(approval.property, request.user,
                            approval.review_notes or 'Your submission did not meet the listing requirements.')
            rejected += 1
        self.message_user(request, f"{rejected} property approval(s) marked rejected.")

    @admin.action(description="Mark selected as under review")
    def mark_under_review(self, request, queryset):
        updated = queryset.filter(status__in=['submitted', 'pending']).update(
            status='under_review',
            reviewer=request.user,
            reviewed_at=timezone.now(),
        )
        self.message_user(request, f"{updated} property approval(s) marked under review.")


@admin.register(PropertyValuation)
class PropertyValuationAdmin(admin.ModelAdmin):
    list_display = ['property', 'current_value', 'valuation_date', 'appraiser']
    list_filter = ['valuation_date']
    search_fields = ['property__title', 'appraiser']
    autocomplete_fields = ['property']


@admin.register(PropertyReview)
class PropertyReviewAdmin(admin.ModelAdmin):
    list_display = ['property', 'user', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['property__title', 'user__email']
    autocomplete_fields = ['property', 'user']
    readonly_fields = ['created_at']


@admin.register(PropertyUpdate)
class PropertyUpdateAdmin(admin.ModelAdmin):
    list_display = ['property', 'title', 'update_type', 'created_at']
    list_filter = ['update_type', 'created_at']
    search_fields = ['property__title', 'title', 'content']
    autocomplete_fields = ['property']
    readonly_fields = ['created_at']


@admin.register(PropertyImage)
class PropertyImageAdmin(admin.ModelAdmin):
    list_display = ['property', 'caption', 'is_primary', 'order']
    list_filter = ['is_primary']
    search_fields = ['property__title', 'caption']
    autocomplete_fields = ['property']


@admin.register(PropertyDocument)
class PropertyDocumentAdmin(admin.ModelAdmin):
    list_display = ['property', 'name', 'document_type']
    list_filter = ['document_type']
    search_fields = ['property__title', 'name']
    autocomplete_fields = ['property']


@admin.register(PropertySubscription)
class PropertySubscriptionAdmin(admin.ModelAdmin):
    list_display = ['property', 'user', 'subscribed_at']
    list_filter = ['subscribed_at']
    search_fields = ['property__title', 'user__email']
    autocomplete_fields = ['property', 'user']
    readonly_fields = ['subscribed_at']


class RentDistributionItemInline(admin.TabularInline):
    model = RentDistributionItem
    extra = 0
    can_delete = False
    fields = ('user', 'shares', 'gross_amount', 'management_fee', 'net_amount', 'paid')
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(RentDistribution)
class RentDistributionAdmin(admin.ModelAdmin):
    """
    Rent payouts (PropShare model). Record the rent collected for a property
    and a period, save to see each owner's part (gross, management fee, net),
    then "Pay" to credit the owners' wallets — once.
    """

    list_display = ('property_investment', 'period_start', 'period_end', 'gross_amount',
                    'total_management_fee', 'total_net', 'shares_counted', 'status', 'paid_at')
    list_filter = ('status', 'property_investment')
    search_fields = ('property_investment__title', 'note')
    inlines = [RentDistributionItemInline]
    actions = ('pay_distributions', 'recompute')
    readonly_fields = ('status', 'total_management_fee', 'total_net', 'shares_counted', 'paid_at', 'created_by',
                       'created_at')

    def get_readonly_fields(self, request, obj=None):
        if obj is not None and obj.status == 'paid':
            return [f.name for f in RentDistribution._meta.fields]
        return self.readonly_fields

    def has_delete_permission(self, request, obj=None):
        return obj is None or obj.status != 'paid'

    def get_actions(self, request):
        actions = super().get_actions(request)
        actions.pop('delete_selected', None)  # a paid distribution is never deleted
        return actions

    def save_model(self, request, obj, form, change):
        from .rent_distribution import DistributionError, build
        if obj.created_by_id is None:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
        try:
            build(obj)
            self.message_user(request, f'Split among {obj.items.count()} owner(s): net ${obj.total_net}, '
                                       f'management fee ${obj.total_management_fee}. Use "Pay" to credit wallets.')
        except DistributionError as exc:
            self.message_user(request, exc.message, level=messages.WARNING)

    @admin.action(description='Recompute the owners\' parts (draft only)')
    def recompute(self, request, queryset):
        from .rent_distribution import DistributionError, build
        for dist in queryset.filter(status='draft'):
            try:
                build(dist)
            except DistributionError as exc:
                self.message_user(request, f'{dist}: {exc.message}', level=messages.WARNING)

    @admin.action(description='Pay — credit the owners\' wallets (once)')
    def pay_distributions(self, request, queryset):
        from .rent_distribution import DistributionError, pay
        done = 0
        for dist in queryset:
            try:
                pay(dist, by=request.user)
                done += 1
            except DistributionError as exc:
                self.message_user(request, f'{dist}: {exc.message}', level=messages.WARNING)
        if done:
            self.message_user(request, f'{done} distribution(s) paid; owners were notified.')


from .models import PositionListing, PositionOffer  # noqa: E402


class PositionOfferInline(admin.TabularInline):
    model = PositionOffer
    extra = 0
    can_delete = False
    fields = ['liquidity_provider', 'price_per_share', 'status', 'expires_at', 'created_at']
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(PositionListing)
class PositionListingAdmin(admin.ModelAdmin):
    """Installment plans offered for sale as one position (read-only: sales happen in the app)."""

    list_display = ['plan', 'seller', 'price_per_share', 'status', 'buyer', 'seller_cash', 'sold_via', 'created_at']
    list_filter = ['status', 'sold_via']
    search_fields = ['seller__email', 'buyer__email', 'plan__property_investment__title']
    inlines = [PositionOfferInline]
    readonly_fields = [f.name for f in PositionListing._meta.fields]

    def has_add_permission(self, request):
        return False
