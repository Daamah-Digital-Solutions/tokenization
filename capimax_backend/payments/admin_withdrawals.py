"""
Django admin for withdrawals — the Withdrawals desk (PropShare model).

A member asks for a withdrawal to one of their saved accounts; the amount is
already held in their wallet. The team pays it by hand and closes it on the
request's desk page:

  - Mark as processing — the transfer has started (member is told);
  - Mark as PAID       — with the bank transfer number / transaction hash;
  - Mark as FAILED     — with the reason; the amount goes back to the
                          member's wallet, once, with its ledger row.

The status only moves through these actions (payments/withdrawals.py).
"""

from django.contrib import admin, messages
from django.shortcuts import get_object_or_404, redirect
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils.html import format_html

from .models import BankWithdrawalRequest, PayoutAccount, WalletTransaction
from .withdrawals import WithdrawalError, mark_failed, mark_paid, mark_processing

STATUS_COLOURS = {
    'pending': '#d97706',
    'approved': '#2563eb',
    'processing': '#2563eb',
    'completed': '#16a34a',
    'rejected': '#dc2626',
    'cancelled': '#6b7280',
}
STATUS_LABELS = {
    'pending': 'Pending',
    'approved': 'Approved',
    'processing': 'Processing',
    'completed': 'Paid',
    'rejected': 'Failed (returned)',
    'cancelled': 'Cancelled',
}
DEST_FIELDS = (
    ('account_holder_name', 'Account holder'),
    ('bank_name', 'Bank'),
    ('account_number', 'IBAN / account number'),
    ('swift_code', 'SWIFT / BIC'),
    ('routing_number', 'Routing number'),
    ('bank_country', 'Country'),
    ('currency', 'Currency'),
    ('crypto_asset', 'Asset'),
    ('crypto_network', 'Network'),
    ('crypto_address', 'Wallet address'),
    ('crypto_memo', 'Memo / tag'),
)


@admin.register(BankWithdrawalRequest)
class BankWithdrawalRequestAdmin(admin.ModelAdmin):
    list_display = (
        'reference_link', 'status_badge', 'investor_email', 'amount_display',
        'withdrawal_method', 'destination', 'created_at', 'reviewed_by',
    )
    list_filter = ('status', 'withdrawal_method', 'currency', 'created_at')
    search_fields = (
        'reference', 'id', 'user__email', 'account_holder_name', 'bank_name',
        'account_number', 'crypto_address', 'transfer_reference',
    )
    readonly_fields = [f.name for f in BankWithdrawalRequest._meta.fields]
    actions = ('mark_processing_action',)
    list_select_related = ('user', 'reviewed_by')

    def has_add_permission(self, request):
        return False  # members ask from the site; the hold happens there

    def has_delete_permission(self, request, obj=None):
        return False  # money was held for it: close it on the desk instead

    def get_urls(self):
        return [
            path('<uuid:pk>/desk/', self.admin_site.admin_view(self.desk_view), name='payments_withdrawal_desk'),
        ] + super().get_urls()

    # ----- list -------------------------------------------------------------

    def reference_link(self, obj):
        url = reverse('admin:payments_withdrawal_desk', args=[obj.pk])
        return format_html('<a href="{}"><b>{}</b></a>', url, obj.reference or str(obj.pk)[:8])
    reference_link.short_description = 'Reference (open desk)'

    def status_badge(self, obj):
        return format_html(
            '<span style="display:inline-block;padding:2px 8px;border-radius:6px;background:{};'
            'color:white;font-size:11px;">{}</span>',
            STATUS_COLOURS.get(obj.status, '#6b7280'), STATUS_LABELS.get(obj.status, obj.status).upper(),
        )
    status_badge.short_description = 'Status'

    def investor_email(self, obj):
        return obj.user.email if obj.user else '-'
    investor_email.short_description = 'Investor'

    def amount_display(self, obj):
        return f'{obj.amount} {obj.currency}'
    amount_display.short_description = 'Amount'

    def destination(self, obj):
        if obj.destination_label:
            return obj.destination_label
        if obj.withdrawal_method == 'crypto':
            return f'{obj.crypto_asset} · {obj.crypto_network} · {obj.crypto_address}'
        return obj.bank_name or '-'
    destination.short_description = 'Pay to'

    def mark_processing_action(self, request, queryset):
        n = 0
        for obj in queryset:
            try:
                mark_processing(obj, by=request.user)
                n += 1
            except WithdrawalError:
                continue
        self.message_user(request, f'{n} withdrawal(s) marked as processing. Close each one on its desk page.')
    mark_processing_action.short_description = 'Mark as processing (transfer started)'

    # ----- desk -------------------------------------------------------------

    def desk_view(self, request, pk):
        wd = get_object_or_404(BankWithdrawalRequest.objects.select_related('user', 'reviewed_by'), pk=pk)
        if request.method == 'POST':
            if not self.has_change_permission(request, wd):
                messages.error(request, 'You cannot change withdrawals.')
                return redirect(request.path)
            action = request.POST.get('action')
            try:
                if action == 'processing':
                    mark_processing(wd, by=request.user)
                    messages.success(request, f'{wd.reference} marked as processing; the member was told.')
                elif action == 'paid':
                    mark_paid(wd, request.POST.get('transfer_reference', ''), by=request.user)
                    messages.success(request, f'{wd.reference} marked as PAID; the member was told.')
                elif action == 'failed':
                    mark_failed(wd, request.POST.get('reason', ''), by=request.user)
                    messages.success(request, f'{wd.reference} marked as FAILED; ${wd.amount} went back to the wallet.')
            except WithdrawalError as exc:
                messages.error(request, exc.message)
            return redirect(request.path)

        dest = dict(wd.destination or {})
        if not dest:  # requests from before saved accounts
            dest = {k: getattr(wd, k, '') for k, _ in DEST_FIELDS}
        open_ = wd.status in ('pending', 'approved', 'processing')
        context = {
            **self.admin_site.each_context(request),
            'title': f'Withdrawal {wd.reference or str(wd.pk)[:8]}',
            'opts': self.model._meta,
            'wd': wd,
            'status_label': STATUS_LABELS.get(wd.status, wd.status),
            'status_colour': STATUS_COLOURS.get(wd.status, '#6b7280'),
            'dest_rows': [(label, dest.get(k)) for k, label in DEST_FIELDS if dest.get(k)],
            'can_processing': wd.status in ('pending', 'approved'),
            'can_close': open_,
            'ledger': WalletTransaction.objects.filter(user=wd.user, reference_id=wd.pk).order_by('created_at'),
        }
        return TemplateResponse(request, 'admin/payments/withdrawal_desk.html', context)


@admin.register(PayoutAccount)
class PayoutAccountAdmin(admin.ModelAdmin):
    list_display = ('user', 'kind', 'label_text', 'is_default', 'created_at')
    list_filter = ('kind',)
    search_fields = ('user__email', 'bank_name', 'account_number', 'crypto_address')
    readonly_fields = [f.name for f in PayoutAccount._meta.fields]

    def has_add_permission(self, request):
        return False
