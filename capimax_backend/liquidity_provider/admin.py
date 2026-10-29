"""
Admin configuration for Liquidity Provider module.
"""

from django.contrib import admin, messages
from django.http import FileResponse, Http404
from django.urls import path
from django.utils.html import format_html
from django.utils import timezone

from core.partner_documents import admin_file_link

from .models import (
    LPApplication, LiquidityProvider, ExitRequest, LiquidityTransaction,
    LPApplicationStatus, LPStatus, ExitRequestStatus, LPApplicationDocument
)


class LPApplicationDocumentInline(admin.TabularInline):
    """Documents the applicant uploaded (client round 4, #14) — private, staff-only download."""

    model = LPApplicationDocument
    extra = 0
    can_delete = False
    fields = ['document_type', 'download', 'size', 'uploaded_at']
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False

    @admin.display(description='File')
    def download(self, obj):
        return admin_file_link('admin:liquidity_provider_lpapplication_document', obj)


@admin.register(LPApplication)
class LPApplicationAdmin(admin.ModelAdmin):
    """Admin for LP Applications. Decisions go through the actions (they create the provider and email)."""

    inlines = [LPApplicationDocumentInline]

    def get_urls(self):
        return [path('document/<uuid:doc_id>/', self.admin_site.admin_view(self.serve_document),
                     name='liquidity_provider_lpapplication_document')] + super().get_urls()

    def serve_document(self, request, doc_id):
        doc = LPApplicationDocument.objects.filter(pk=doc_id).first()
        if doc is None or not doc.file:
            raise Http404
        try:
            return FileResponse(doc.file.open('rb'), filename=doc.original_name or None)
        except FileNotFoundError:
            raise Http404

    list_display = [
        'legal_entity_name', 'entity_type', 'country', 'status_badge',
        'approximate_liquidity_available', 'created_at'
    ]
    list_filter = ['status', 'entity_type', 'country', 'created_at']
    search_fields = ['legal_entity_name', 'official_email', 'registration_number']
    readonly_fields = ['id', 'applicant', 'status', 'reviewed_by', 'created_at', 'updated_at', 'reviewed_at']
    ordering = ['-created_at']

    fieldsets = (
        ('Entity Information', {
            'fields': (
                'id', 'applicant', 'legal_entity_name', 'entity_type', 'country', 'jurisdiction',
                'registration_number', 'website'
            )
        }),
        ('Contact Information', {
            'fields': (
                'contact_person_name', 'contact_position', 'official_email', 'phone_number'
            )
        }),
        ('Financial Information', {
            'fields': (
                'approximate_liquidity_available', 'preferred_currencies', 'average_transaction_size'
            )
        }),
        ('Operating Policy', {
            'fields': (
                'target_ready_properties', 'target_under_construction', 'target_property_portfolios',
                'expected_discount_rate', 'max_per_transaction', 'max_per_month'
            )
        }),
        ('Acknowledgments', {
            'fields': (
                'ack_independent_provider', 'ack_no_exit_guarantee', 'ack_compliance_agreement'
            )
        }),
        ('Review Status', {
            'fields': (
                'status', 'reviewed_by', 'reviewed_at', 'review_notes', 'rejection_reason'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    actions = ['approve_applications', 'reject_applications', 'mark_under_review']

    def status_badge(self, obj):
        colors = {
            'pending': 'orange',
            'under_review': 'blue',
            'approved': 'green',
            'rejected': 'red',
            'withdrawn': 'gray'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'

    @admin.action(description='Approve selected applications (creates the provider, emails the applicant)')
    def approve_applications(self, request, queryset):
        from .notify import application_decided, missing_documents
        count = 0
        for app in queryset.filter(status__in=[LPApplicationStatus.PENDING, LPApplicationStatus.UNDER_REVIEW]):
            missing = missing_documents(app)
            if missing:
                self.message_user(request, f'{app.legal_entity_name}: not approved — missing '
                                           f'{", ".join(missing)}.', messages.WARNING)
                continue
            app.approve(reviewer=request.user, notes='Approved via admin')
            application_decided(app)
            count += 1
        self.message_user(request, f'{count} application(s) approved.')

    @admin.action(description='Reject selected applications (emails the applicant)')
    def reject_applications(self, request, queryset):
        from .notify import application_decided
        count = 0
        for app in queryset.filter(status__in=[LPApplicationStatus.PENDING, LPApplicationStatus.UNDER_REVIEW]):
            app.reject(reviewer=request.user, reason=app.rejection_reason or 'The application does not meet '
                                                                             'our current requirements.')
            application_decided(app)
            count += 1
        self.message_user(request, f'{count} application(s) rejected.')

    @admin.action(description='Mark as under review')
    def mark_under_review(self, request, queryset):
        n = queryset.filter(status=LPApplicationStatus.PENDING).update(status=LPApplicationStatus.UNDER_REVIEW)
        self.message_user(request, f'{n} application(s) marked as under review.')


@admin.register(LiquidityProvider)
class LiquidityProviderAdmin(admin.ModelAdmin):
    """Admin for Liquidity Providers."""

    list_display = [
        'legal_entity_name', 'entity_type', 'country', 'status_badge',
        'liquidity_available', 'discount_rate', 'current_month_total'
    ]
    list_filter = ['status', 'entity_type', 'country', 'created_at']
    search_fields = ['legal_entity_name', 'official_email', 'registration_number']
    readonly_fields = ['id', 'application', 'created_at', 'updated_at', 'approved_at', 'activated_at']
    ordering = ['-created_at']

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'id', 'application', 'user', 'legal_entity_name', 'entity_type',
                'country', 'jurisdiction', 'registration_number', 'website'
            )
        }),
        ('Contact Information', {
            'fields': (
                'contact_person_name', 'contact_position', 'official_email', 'phone_number'
            )
        }),
        ('Financial Settings', {
            'fields': (
                'liquidity_available', 'preferred_currencies', 'discount_rate',
                'max_per_transaction', 'max_per_month'
            )
        }),
        ('Target Assets', {
            'fields': (
                'target_ready_properties', 'target_under_construction', 'target_property_portfolios'
            )
        }),
        ('Monthly Tracking', {
            'fields': ('current_month_total', 'month_reset_date')
        }),
        ('Status', {
            'fields': (
                'status', 'approved_at', 'activated_at', 'suspended_at', 'suspension_reason'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    actions = ['activate_providers', 'suspend_providers', 'deactivate_providers']

    def status_badge(self, obj):
        colors = {
            'pending': 'orange',
            'active': 'green',
            'suspended': 'red',
            'inactive': 'gray'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'

    @admin.action(description='Activate selected providers')
    def activate_providers(self, request, queryset):
        count = queryset.filter(status=LPStatus.PENDING).update(
            status=LPStatus.ACTIVE, activated_at=timezone.now()
        )
        self.message_user(request, f'{count} providers activated.')

    @admin.action(description='Suspend selected providers')
    def suspend_providers(self, request, queryset):
        count = queryset.filter(status=LPStatus.ACTIVE).update(
            status=LPStatus.SUSPENDED, suspended_at=timezone.now()
        )
        self.message_user(request, f'{count} providers suspended.')

    @admin.action(description='Deactivate selected providers')
    def deactivate_providers(self, request, queryset):
        count = queryset.update(status=LPStatus.INACTIVE)
        self.message_user(request, f'{count} providers deactivated.')


@admin.register(ExitRequest)
class ExitRequestAdmin(admin.ModelAdmin):
    """Admin for Exit Requests."""

    list_display = [
        'id_short', 'investor', 'liquidity_provider', 'units_requested',
        'total_requested_amount', 'status_badge', 'created_at'
    ]
    list_filter = ['status', 'created_at', 'liquidity_provider']
    search_fields = ['investor__email', 'liquidity_provider__legal_entity_name']
    readonly_fields = ['id', 'created_at', 'updated_at', 'processed_at']
    ordering = ['-created_at']

    fieldsets = (
        ('Request Information', {
            'fields': (
                'id', 'investor', 'investment', 'liquidity_provider'
            )
        }),
        ('Request Details', {
            'fields': (
                'units_requested', 'requested_price_per_unit', 'total_requested_amount'
            )
        }),
        ('LP Response', {
            'fields': (
                'offered_price_per_unit', 'total_offered_amount', 'lp_notes'
            )
        }),
        ('Status', {
            'fields': (
                'status', 'investor_accepted_offer', 'investor_response_at', 'expires_at'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'processed_at'),
            'classes': ('collapse',)
        }),
    )

    def id_short(self, obj):
        return str(obj.id)[:8] + '...'
    id_short.short_description = 'ID'

    def status_badge(self, obj):
        colors = {
            'pending': 'orange',
            'under_review': 'blue',
            'approved': 'green',
            'rejected': 'red',
            'completed': 'darkgreen',
            'cancelled': 'gray',
            'expired': 'darkgray'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'


@admin.register(LiquidityTransaction)
class LiquidityTransactionAdmin(admin.ModelAdmin):
    """Admin for Liquidity Transactions."""

    list_display = [
        'reference_number', 'liquidity_provider', 'investor',
        'units_purchased', 'total_amount', 'platform_fee', 'chain_status', 'completed_at'
    ]
    list_filter = ['chain_status', 'completed_at', 'liquidity_provider']
    search_fields = ['reference_number', 'investor__email', 'liquidity_provider__legal_entity_name']
    readonly_fields = ['id', 'reference_number', 'completed_at']
    ordering = ['-completed_at']

    fieldsets = (
        ('Transaction Information', {
            'fields': (
                'id', 'reference_number', 'exit_request', 'liquidity_provider', 'investor'
            )
        }),
        ('Transaction Details', {
            'fields': (
                'units_purchased', 'price_per_unit', 'total_amount',
                'platform_fee', 'net_amount_to_investor'
            )
        }),
        ('On-chain transfer (set back to "pending" to retry)', {
            'fields': ('chain_status', 'transaction_hash', 'chain_attempts', 'chain_error', 'chain_updated_at')
        }),
        ('Timestamps', {
            'fields': ('completed_at',)
        }),
    )
