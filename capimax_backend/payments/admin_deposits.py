"""
Django admin registration for the manual bank-deposit (wallet top-up) flow.

Two models:
  - PlatformBankAccount   — the receiving accounts admins advertise to
                            investors. Plain CRUD; toggle ``is_active`` to
                            show/hide an account in the wallet deposit modal.
  - BankDepositRequest    — investor-lodged top-ups. Admin eyeballs the
                            proof, then Approve (credits the wallet via the
                            audited WalletBalance.credit) or Reject.

Kept in its own module; the import side-effect (payments.admin imports it)
runs the @admin.register decorators. Mirrors admin_withdrawals.py.
"""

from django.contrib import admin
from django.db import transaction
from django.utils import timezone
from django.utils.html import format_html

from .models import PlatformBankAccount, BankDepositRequest, WalletBalance


@admin.register(PlatformBankAccount)
class PlatformBankAccountAdmin(admin.ModelAdmin):
    """Admin-managed set of bank accounts investors can wire top-ups to."""

    list_display = (
        'display_name', 'active_badge', 'bank_name', 'currency',
        'account_number_masked', 'updated_at',
    )
    list_filter = ('is_active', 'currency', 'bank_country')
    search_fields = ('label', 'bank_name', 'account_holder_name', 'account_number')
    list_editable = ()
    fieldsets = (
        (None, {'fields': ('label', 'is_active', 'currency')}),
        ('Account details', {
            'fields': (
                'account_holder_name', 'bank_name', 'account_number',
                'routing_number', 'swift_code', 'bank_address', 'bank_country',
            ),
        }),
        ('Investor instructions', {'fields': ('instructions',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )
    readonly_fields = ('created_at', 'updated_at')

    def display_name(self, obj):
        return obj.label or obj.bank_name
    display_name.short_description = 'Account'

    def active_badge(self, obj):
        c = '#16a34a' if obj.is_active else '#6b7280'
        return format_html(
            '<span style="display:inline-block;padding:2px 8px;border-radius:6px;'
            'background:{};color:white;font-size:11px;">{}</span>',
            c, 'ACTIVE' if obj.is_active else 'HIDDEN',
        )
    active_badge.short_description = 'Visible to investors'

    def account_number_masked(self, obj):
        if not obj.account_number:
            return '-'
        return f"…{obj.account_number[-4:]}"
    account_number_masked.short_description = 'Account #'


@admin.register(BankDepositRequest)
class BankDepositRequestAdmin(admin.ModelAdmin):
    """Review interface for investor bank-transfer wallet top-ups.

    Approve credits the investor's wallet (audited); Reject credits nothing.
    Both are idempotent — a request only transitions out of 'pending' once.
    """

    list_display = (
        'id_short', 'status_badge', 'investor_email', 'amount_display',
        'sent_to', 'reference', 'proof_link', 'created_at', 'reviewed_by',
    )
    list_filter = ('status', 'currency', 'created_at')
    search_fields = ('id', 'user__email', 'reference', 'platform_bank_account__bank_name')
    readonly_fields = (
        'id', 'user', 'amount', 'currency', 'platform_bank_account',
        'reference', 'proof_of_transfer', 'notes',
        'reviewed_by', 'reviewed_at', 'completed_at', 'created_at', 'updated_at',
    )
    actions = ('approve_deposits', 'reject_deposits')
    list_select_related = ('user', 'platform_bank_account', 'reviewed_by')

    def id_short(self, obj):
        return str(obj.id)[:8]
    id_short.short_description = 'ID'

    def status_badge(self, obj):
        colours = {
            'pending': '#d97706',
            'approved': '#16a34a',
            'rejected': '#dc2626',
            'cancelled': '#6b7280',
        }
        c = colours.get(obj.status, '#6b7280')
        return format_html(
            '<span style="display:inline-block;padding:2px 8px;border-radius:6px;'
            'background:{};color:white;font-size:11px;">{}</span>',
            c, obj.status.upper(),
        )
    status_badge.short_description = 'Status'

    def investor_email(self, obj):
        return obj.user.email if obj.user else '-'
    investor_email.short_description = 'Investor'

    def amount_display(self, obj):
        return f"{obj.amount} {obj.currency}"
    amount_display.short_description = 'Amount'

    def sent_to(self, obj):
        if obj.platform_bank_account:
            return str(obj.platform_bank_account)
        return '-'
    sent_to.short_description = 'Sent to'

    def proof_link(self, obj):
        if obj.proof_of_transfer:
            return format_html(
                '<a href="{}" target="_blank" rel="noopener">View proof</a>',
                obj.proof_of_transfer.url,
            )
        return format_html('<span style="color:#dc2626;">no proof</span>')
    proof_link.short_description = 'Proof'

    # ----- Actions --------------------------------------------------------

    def approve_deposits(self, request, queryset):
        """Approve — credit the investor's wallet (audited), notify them."""
        from notifications.services import NotificationService
        n = 0
        for obj in queryset:
            if obj.status != 'pending':
                continue
            with transaction.atomic():
                # Re-lock the row and re-check status to stay idempotent under
                # concurrent admin clicks.
                obj = BankDepositRequest.objects.select_for_update().get(pk=obj.pk)
                if obj.status != 'pending':
                    continue
                WalletBalance.credit(
                    obj.user, obj.amount,
                    currency=obj.currency,
                    transaction_type='deposit',
                    description=f"Bank deposit {str(obj.id)[:8]} approved",
                    reference_id=obj.id,
                )
                obj.status = 'approved'
                obj.reviewed_by = request.user
                obj.reviewed_at = timezone.now()
                obj.completed_at = timezone.now()
                obj.save(update_fields=[
                    'status', 'reviewed_by', 'reviewed_at', 'completed_at', 'updated_at',
                ])
            try:
                NotificationService.create_notification(
                    user=obj.user,
                    title="Deposit Credited",
                    message=(
                        f"Your bank transfer of {obj.amount} {obj.currency} has "
                        f"been confirmed and credited to your wallet. It's ready "
                        f"to use now."
                    ),
                    notification_type='payment',
                    priority='high',
                    send_email=True,
                    send_real_time=True,
                )
            except Exception:
                pass
            n += 1
        self.message_user(request, f"Approved & credited {n} deposit(s).")
    approve_deposits.short_description = 'Approve — credit wallet'

    def reject_deposits(self, request, queryset):
        """Reject — credit nothing, notify the investor."""
        from notifications.services import NotificationService
        n = 0
        for obj in queryset:
            if obj.status != 'pending':
                continue
            obj.status = 'rejected'
            obj.reviewed_by = request.user
            obj.reviewed_at = timezone.now()
            if not obj.review_note:
                obj.review_note = 'Rejected by admin via Django admin bulk action.'
            obj.save(update_fields=[
                'status', 'reviewed_by', 'reviewed_at', 'review_note', 'updated_at',
            ])
            try:
                NotificationService.create_notification(
                    user=obj.user,
                    title="Deposit Not Confirmed",
                    message=(
                        f"We couldn't confirm your bank transfer of {obj.amount} "
                        f"{obj.currency}, so your wallet was not credited. Please "
                        f"double-check the transfer and proof, or contact support."
                    ),
                    notification_type='payment',
                    priority='high',
                    send_email=True,
                    send_real_time=True,
                )
            except Exception:
                pass
            n += 1
        self.message_user(request, f"Rejected {n} deposit(s).")
    reject_deposits.short_description = 'Reject — no credit'
