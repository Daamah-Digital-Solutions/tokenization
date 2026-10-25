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
        'is_fully_funded', 'can_accept_investments', 'created_at', 'updated_at'
    ]

    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'property_type', 'property_category', 'owner')
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
                'installment_first_due_date', 'installment_notes',
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
            'fields': ('smart_contract_address',),
            'classes': ('collapse',),
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
    actions = ['publish_selected', 'unpublish_selected', 'approve_selected']

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
