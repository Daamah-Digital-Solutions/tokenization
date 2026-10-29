from django.contrib import admin, messages
from django.utils.html import format_html

from .models import Certificate, CertificateStatus


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ('certificate_id', 'status', 'investor_name', 'user', 'property_name', 'units',
                    'investment_amount', 'issue_date', 'verify_link')
    list_filter = ('status', 'acquisition', 'issue_date')
    search_fields = ('certificate_id', 'verification_code', 'user__email', 'investor_name', 'property_name',
                     'holder_wallet', 'contract_address')
    readonly_fields = [f.name for f in Certificate._meta.fields] + ['verify_link']
    actions = ['revoke_selected', 'resync_selected']

    def has_add_permission(self, request):
        return False  # issued automatically from purchases / installment plans

    def has_delete_permission(self, request, obj=None):
        return False  # a certificate is revoked, never deleted

    @admin.display(description='Verification page')
    def verify_link(self, obj):
        return format_html('<a href="{}" target="_blank" rel="noopener">{}</a>', obj.verification_url, 'Open')

    @admin.action(description='Revoke the selected certificates')
    def revoke_selected(self, request, queryset):
        from .services import revoke
        n = 0
        for cert in queryset.exclude(status=CertificateStatus.REVOKED):
            revoke(cert, f'Revoked by {request.user.email}.')
            n += 1
        self.message_user(request, f'{n} certificate(s) revoked.', messages.SUCCESS)

    @admin.action(description='Re-sync from the holding (re-issue if it changed)')
    def resync_selected(self, request, queryset):
        from .services import sync_investment, sync_plan
        for cert in queryset.select_related('investment', 'installment_plan'):
            if cert.investment_id:
                sync_investment(cert.investment, notify=False)
            elif cert.installment_plan_id:
                sync_plan(cert.installment_plan, notify=False)
        self.message_user(request, 'Certificates re-synced.', messages.SUCCESS)
