"""
KYC Admin Interface for Capimax Real Estate Tokenization Platform.

This module provides Django admin interfaces for managing KYC verification,
including document review, status updates, and compliance management.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from django.contrib import messages
from django.http import HttpResponseRedirect, FileResponse, Http404
from django.urls import path
from .models import (
    KYCProfile, KYCDocument, BiometricVerification,
    ComplianceCheck, KYCNote, KYCAuditLog, KYCStatus, DocumentStatus
)

DEFAULT_RESUBMISSION_REASON = (
    "Some documents need to be updated. Please upload clear, valid copies "
    "and resubmit your verification."
)


def document_file_link(document):
    """Admin-only link to a KYC file (identity files are not public media)."""
    if not document.file_path:
        return '-'
    url = reverse('admin:kyc_kycdocument_file', args=[document.pk])
    return format_html('<a href="{}" target="_blank">View document</a>', url)


class KYCDocumentInline(admin.TabularInline):
    """The reviewer sees every document on the profile page itself."""
    model = KYCDocument
    extra = 0
    can_delete = False
    fields = ('document_type', 'status', 'file_link', 'rejection_reason', 'created_at')
    readonly_fields = ('document_type', 'status', 'file_link', 'rejection_reason', 'created_at')
    show_change_link = True

    def file_link(self, obj):
        return document_file_link(obj)
    file_link.short_description = 'File'

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(KYCProfile)
class KYCProfileAdmin(admin.ModelAdmin):
    """
    Admin interface for KYC Profile management with approval workflow.

    Provides comprehensive KYC profile management with filtering, search,
    and bulk actions for efficient review and approval processes.
    """

    list_display = (
        'user_info', 'status_badge', 'verification_level', 'risk_score',
        'submitted_at', 'reviewed_at', 'reviewer', 'investment_limit'
    )
    list_filter = (
        'status', 'verification_level', 'reviewed_at', 'created_at'
    )
    search_fields = (
        'user__email', 'user__first_name', 'user__last_name',
        'user__phone', 'rejection_reason'
    )
    readonly_fields = (
        'created_at', 'updated_at', 'submitted_at', 'last_updated_documents'
    )
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'status', 'verification_level')
        }),
        ('Review Information', {
            'fields': ('reviewed_by', 'reviewed_at', 'rejection_reason', 'internal_notes')
        }),
        ('Risk Assessment', {
            'fields': ('risk_score', 'investment_limit')
        }),
        ('Timeline', {
            'fields': ('submitted_at', 'expires_at', 'last_updated_documents', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    actions = ['approve_kyc', 'reject_kyc', 'request_resubmission']
    inlines = [KYCDocumentInline]

    def save_model(self, request, obj, form, change):
        """
        Changing the status in the form must run the real workflow (documents,
        investment limit, expiry, email + in-app notification) instead of just
        writing the column.
        """
        if not change or 'status' not in form.changed_data:
            return super().save_model(request, obj, form, change)
        new_status = obj.status
        reason = (obj.rejection_reason or '').strip()
        # Persist any other edited fields first, keeping the old status.
        obj.status = form.initial.get('status', obj.status)
        super().save_model(request, obj, form, change)
        if new_status == KYCStatus.APPROVED:
            obj.approve(request.user)
        elif new_status == KYCStatus.REJECTED:
            obj.reject(request.user, reason or 'Your verification could not be approved.')
        elif new_status == KYCStatus.PENDING:
            obj.request_resubmission(request.user, reason or DEFAULT_RESUBMISSION_REASON)
        else:
            obj.status = new_status
            obj.save()

    def user_info(self, obj):
        """Display user information with link."""
        user_url = reverse('admin:accounts_user_change', args=[obj.user.pk])
        return format_html(
            '<a href="{}">{}</a><br><small>{}</small>',
            user_url, obj.user.get_full_name(), obj.user.email
        )
    user_info.short_description = 'User'

    def status_badge(self, obj):
        """Display status with colored badge."""
        colors = {
            'pending': '#f59e0b',      # Yellow
            'in_review': '#3b82f6',    # Blue
            'approved': '#10b981',     # Green
            'rejected': '#ef4444',     # Red
            'expired': '#6b7280',      # Gray
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 12px; font-size: 11px; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'

    def reviewer(self, obj):
        """Display reviewer information."""
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name()
        return '-'
    reviewer.short_description = 'Reviewed By'

    def approve_kyc(self, request, queryset):
        """Bulk action to approve selected KYC profiles."""
        count = 0
        for kyc_profile in queryset.filter(status__in=['pending', 'in_review']):
            kyc_profile.approve(request.user)  # sends the approval email itself
            count += 1

        self.message_user(
            request,
            f'Successfully approved {count} KYC profile(s).',
            messages.SUCCESS
        )
    approve_kyc.short_description = 'Approve selected KYC profiles'

    def reject_kyc(self, request, queryset):
        """Bulk action to reject selected KYC profiles."""
        # This would typically open a form to collect rejection reasons
        # For now, we'll use a default reason
        count = 0
        default_reason = "Documents require additional verification. Please resubmit with clearer images."

        for kyc_profile in queryset.filter(status__in=['pending', 'in_review']):
            kyc_profile.reject(request.user, default_reason)  # sends the rejection email itself
            count += 1

        self.message_user(
            request,
            f'Successfully rejected {count} KYC profile(s).',
            messages.WARNING
        )
    reject_kyc.short_description = 'Reject selected KYC profiles'

    def request_resubmission(self, request, queryset):
        """
        Ask the selected users to update their documents. Uses the model
        method so documents are flagged, the user is emailed + notified, and
        the wizard re-opens for them. (It used to be a bare
        queryset.update(status='pending'): no email, documents untouched.)
        """
        count = 0
        for kyc_profile in queryset.exclude(status=KYCStatus.APPROVED):
            kyc_profile.request_resubmission(
                request.user, kyc_profile.rejection_reason or DEFAULT_RESUBMISSION_REASON
            )
            count += 1
        self.message_user(
            request,
            f'Requested resubmission for {count} KYC profile(s).',
            messages.INFO
        )
    request_resubmission.short_description = 'Request document resubmission'

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('user', 'reviewed_by')


@admin.register(KYCDocument)
class KYCDocumentAdmin(admin.ModelAdmin):
    """
    Admin interface for KYC Document management.

    Provides document review capabilities with image preview and approval actions.
    """

    list_display = (
        'document_info', 'kyc_user', 'status_badge', 'document_type',
        'uploaded_at', 'reviewed_by', 'file_size_mb'
    )
    list_filter = (
        'status', 'document_type', 'created_at', 'reviewed_at'
    )
    search_fields = (
        'kyc_profile__user__email', 'kyc_profile__user__first_name',
        'kyc_profile__user__last_name', 'file_name', 'document_number'
    )
    readonly_fields = (
        'id', 'file_size', 'file_hash', 'created_at', 'updated_at'
    )
    fieldsets = (
        ('Document Information', {
            'fields': ('kyc_profile', 'document_type', 'status', 'file_path', 'file_name')
        }),
        ('Document Details', {
            'fields': ('document_number', 'country_of_issue', 'expiry_date')
        }),
        ('Review Information', {
            'fields': ('reviewed_by', 'reviewed_at', 'rejection_reason')
        }),
        ('Technical Details', {
            'fields': ('file_size', 'file_hash', 'ocr_data', 'verification_checks', 'metadata'),
            'classes': ('collapse',)
        }),
        ('Timeline', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    actions = ['approve_documents', 'reject_documents']

    def get_urls(self):
        custom = [
            path('<uuid:document_id>/file/',
                 self.admin_site.admin_view(self.serve_file),
                 name='kyc_kycdocument_file'),
        ]
        return custom + super().get_urls()

    def serve_file(self, request, document_id):
        document = KYCDocument.objects.filter(pk=document_id).first()
        if document is None or not document.file_path:
            raise Http404
        try:
            return FileResponse(document.file_path.open('rb'),
                                filename=document.file_name or None)
        except FileNotFoundError:
            raise Http404

    def save_model(self, request, obj, form, change):
        """Status changes made in the form run the real approve / reject flow."""
        if not change or 'status' not in form.changed_data:
            return super().save_model(request, obj, form, change)
        new_status = obj.status
        reason = (obj.rejection_reason or '').strip()
        obj.status = form.initial.get('status', obj.status)
        super().save_model(request, obj, form, change)
        if new_status == DocumentStatus.APPROVED:
            obj.approve(request.user)
        elif new_status in (DocumentStatus.REJECTED, DocumentStatus.RESUBMISSION_REQUIRED):
            obj.reject(request.user, reason or 'The document is unclear or not valid.')
            if new_status == DocumentStatus.RESUBMISSION_REQUIRED:
                obj.status = new_status
                obj.save(update_fields=['status', 'updated_at'])
        else:
            obj.status = new_status
            obj.save()

    def document_info(self, obj):
        """Display document information with preview link."""
        if obj.file_path:
            return format_html(
                '<strong>{}</strong><br>{}',
                obj.get_document_type_display(),
                document_file_link(obj),
            )
        return obj.get_document_type_display()
    document_info.short_description = 'Document'

    def kyc_user(self, obj):
        """Display user information."""
        return f"{obj.kyc_profile.user.get_full_name()} ({obj.kyc_profile.user.email})"
    kyc_user.short_description = 'User'

    def status_badge(self, obj):
        """Display status with colored badge."""
        colors = {
            'pending': '#f59e0b',
            'in_review': '#3b82f6',
            'approved': '#10b981',
            'rejected': '#ef4444',
            'expired': '#6b7280',
            'resubmission_required': '#f97316',
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 12px; font-size: 11px; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'

    def uploaded_at(self, obj):
        """Display upload timestamp."""
        return obj.created_at
    uploaded_at.short_description = 'Uploaded At'

    def file_size_mb(self, obj):
        """Display file size in MB."""
        if obj.file_size:
            return f"{obj.file_size / (1024 * 1024):.2f} MB"
        return '-'
    file_size_mb.short_description = 'File Size'

    def approve_documents(self, request, queryset):
        """Approve selected documents."""
        count = 0
        for document in queryset.filter(status__in=['pending', 'in_review']):
            document.approve(request.user)
            count += 1

        self.message_user(
            request,
            f'Successfully approved {count} document(s).',
            messages.SUCCESS
        )
    approve_documents.short_description = 'Approve selected documents'

    def reject_documents(self, request, queryset):
        """Reject selected documents."""
        count = 0
        default_reason = "Document image is unclear or information is not readable."

        for document in queryset.filter(status__in=['pending', 'in_review']):
            document.reject(request.user, default_reason)
            count += 1

        self.message_user(
            request,
            f'Successfully rejected {count} document(s).',
            messages.WARNING
        )
    reject_documents.short_description = 'Reject selected documents'


@admin.register(BiometricVerification)
class BiometricVerificationAdmin(admin.ModelAdmin):
    """Admin interface for Biometric Verification management."""

    list_display = (
        'kyc_user', 'provider', 'status', 'liveness_score',
        'face_match_score', 'attempts', 'created_at'
    )
    list_filter = ('status', 'provider', 'created_at')
    search_fields = (
        'kyc_profile__user__email', 'verification_session_id'
    )
    readonly_fields = ('created_at', 'updated_at')

    def kyc_user(self, obj):
        return f"{obj.kyc_profile.user.get_full_name()} ({obj.kyc_profile.user.email})"
    kyc_user.short_description = 'User'


@admin.register(ComplianceCheck)
class ComplianceCheckAdmin(admin.ModelAdmin):
    """Admin interface for Compliance Check management."""

    list_display = (
        'user_info', 'check_type', 'result_badge', 'confidence_score',
        'provider', 'reviewed_by', 'created_at'
    )
    list_filter = ('check_type', 'result', 'created_at', 'reviewed_by')
    search_fields = (
        'user__email', 'user__first_name', 'user__last_name', 'provider'
    )
    readonly_fields = ('created_at', 'raw_response', 'hits_data')

    def user_info(self, obj):
        return f"{obj.user.get_full_name()} ({obj.user.email})"
    user_info.short_description = 'User'

    def result_badge(self, obj):
        """Display result with colored badge."""
        colors = {
            'clear': '#10b981',
            'hit': '#ef4444',
            'inconclusive': '#f59e0b',
            'error': '#6b7280',
        }
        color = colors.get(obj.result, '#6b7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 12px; font-size: 11px; font-weight: bold;">{}</span>',
            color, obj.get_result_display()
        )
    result_badge.short_description = 'Result'


@admin.register(KYCNote)
class KYCNoteAdmin(admin.ModelAdmin):
    """Admin interface for KYC Notes management."""

    list_display = (
        'kyc_user', 'author', 'note_type', 'is_internal', 'created_at'
    )
    list_filter = ('note_type', 'is_internal', 'created_at')
    search_fields = (
        'kyc_profile__user__email', 'author__email', 'note'
    )
    readonly_fields = ('created_at',)

    def kyc_user(self, obj):
        return f"{obj.kyc_profile.user.get_full_name()}"
    kyc_user.short_description = 'User'


@admin.register(KYCAuditLog)
class KYCAuditLogAdmin(admin.ModelAdmin):
    """Admin interface for KYC Audit Log management."""

    list_display = (
        'kyc_user', 'action', 'actor', 'ip_address', 'created_at'
    )
    list_filter = ('action', 'created_at')
    search_fields = (
        'kyc_profile__user__email', 'action', 'actor__email'
    )
    readonly_fields = ('created_at', 'details', 'user_agent')

    def kyc_user(self, obj):
        return f"{obj.kyc_profile.user.get_full_name()}"
    kyc_user.short_description = 'User'

    def has_add_permission(self, request):
        """Prevent manual creation of audit logs."""
        return False

    def has_change_permission(self, request, obj=None):
        """Prevent modification of audit logs."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of audit logs."""
        return False
