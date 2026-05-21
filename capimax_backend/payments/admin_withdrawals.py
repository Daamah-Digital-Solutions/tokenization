"""
Django admin registration for BankWithdrawalRequest.

Kept in its own module so the bulk-action helpers stay readable; the
import side-effect (when payments.admin imports this) registers it.
"""

from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html

from .models import BankWithdrawalRequest, WalletBalance


@admin.register(BankWithdrawalRequest)
class BankWithdrawalRequestAdmin(admin.ModelAdmin):
    """Review interface for outgoing bank withdrawals.

    The investor lodges a request (status=pending) and the platform
    atomically locks that amount in their wallet. From here an admin
    either:

      - Approve   -> status=approved, funds stay locked. Operator
                     executes the wire out-of-band. Once it lands, mark
                     Complete.
      - Complete  -> status=completed, the locked balance is consumed
                     (locked_balance debited; no refund to available).
      - Reject    -> status=rejected, the locked balance is unlocked
                     back to the user's available_balance and the user
                     is notified.
    """

    list_display = (
        'id_short', 'status_badge', 'investor_email', 'amount_display',
        'bank_name', 'account_number_last4', 'created_at', 'reviewed_by',
    )
    list_filter = ('status', 'currency', 'bank_country', 'created_at')
    search_fields = (
        'id', 'user__email', 'account_holder_name', 'bank_name',
        'account_number', 'routing_number', 'swift_code',
    )
    readonly_fields = (
        'id', 'user', 'amount', 'currency',
        'account_holder_name', 'bank_name', 'account_number',
        'routing_number', 'swift_code', 'bank_country',
        'notes', 'reviewed_by', 'reviewed_at', 'completed_at',
        'created_at', 'updated_at',
    )
    actions = ('approve_withdrawals', 'mark_completed', 'reject_withdrawals')
    list_select_related = ('user', 'reviewed_by')

    def id_short(self, obj):
        return str(obj.id)[:8]
    id_short.short_description = 'ID'

    def status_badge(self, obj):
        colours = {
            'pending': '#d97706',
            'approved': '#2563eb',
            'processing': '#2563eb',
            'completed': '#16a34a',
            'rejected': '#dc2626',
            'cancelled': '#6b7280',
        }
        c = colours.get(obj.status, '#6b7280')
        return format_html(
            '<span style="display:inline-block;padding:2px 8px;'
            'border-radius:6px;background:{};color:white;'
            'font-size:11px;">{}</span>',
            c, obj.status.upper(),
        )
    status_badge.short_description = 'Status'

    def investor_email(self, obj):
        return obj.user.email if obj.user else '-'
    investor_email.short_description = 'Investor'

    def amount_display(self, obj):
        return f"{obj.amount} {obj.currency}"
    amount_display.short_description = 'Amount'

    def account_number_last4(self, obj):
        if not obj.account_number:
            return '-'
        return f"...{obj.account_number[-4:]}"
    account_number_last4.short_description = 'Account'

    # ----- Actions ----------------------------------------------------

    def approve_withdrawals(self, request, queryset):
        """Mark approved — funds stay locked, ready for the wire."""
        from notifications.services import NotificationService
        n = 0
        for obj in queryset:
            if obj.status != 'pending':
                continue
            obj.status = 'approved'
            obj.reviewed_by = request.user
            obj.reviewed_at = timezone.now()
            obj.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])
            try:
                NotificationService.create_notification(
                    user=obj.user,
                    title="Withdrawal Approved",
                    message=(
                        f"Your withdrawal of {obj.amount} {obj.currency} has "
                        f"been approved. Funds will land in your bank account "
                        f"within 48 hours."
                    ),
                    notification_type='payment',
                    priority='high',
                    send_email=True,
                    send_real_time=True,
                )
            except Exception:
                pass
            n += 1
        self.message_user(request, f"Approved {n} withdrawal(s).")
    approve_withdrawals.short_description = 'Approve — funds clear in 48h'

    def mark_completed(self, request, queryset):
        """Mark completed — debit locked_balance (the wire has executed)."""
        n = 0
        for obj in queryset:
            if obj.status not in ('approved', 'processing'):
                continue
            try:
                wb = WalletBalance.objects.select_for_update().get(
                    user=obj.user, currency=obj.currency,
                )
                wb.locked_balance = max(wb.locked_balance - obj.amount, 0)
                wb.save(update_fields=['locked_balance', 'updated_at'])
            except WalletBalance.DoesNotExist:
                pass

            obj.status = 'completed'
            obj.completed_at = timezone.now()
            obj.save(update_fields=['status', 'completed_at', 'updated_at'])
            n += 1
        self.message_user(request, f"Marked {n} withdrawal(s) completed.")
    mark_completed.short_description = 'Mark completed — wire has landed'

    def reject_withdrawals(self, request, queryset):
        """Reject — unlock funds back to available_balance, notify user."""
        from notifications.services import NotificationService
        n = 0
        for obj in queryset:
            if obj.status in ('completed', 'rejected', 'cancelled'):
                continue
            try:
                wb = WalletBalance.objects.select_for_update().get(
                    user=obj.user, currency=obj.currency,
                )
                wb.locked_balance = max(wb.locked_balance - obj.amount, 0)
                wb.available_balance += obj.amount
                wb.save(update_fields=[
                    'locked_balance', 'available_balance', 'updated_at',
                ])
            except WalletBalance.DoesNotExist:
                pass

            obj.status = 'rejected'
            obj.reviewed_by = request.user
            obj.reviewed_at = timezone.now()
            if not obj.review_note:
                obj.review_note = (
                    'Rejected by admin via Django admin bulk action.'
                )
            obj.save(update_fields=[
                'status', 'reviewed_by', 'reviewed_at', 'review_note', 'updated_at',
            ])
            try:
                NotificationService.create_notification(
                    user=obj.user,
                    title="Withdrawal Rejected",
                    message=(
                        f"Your withdrawal of {obj.amount} {obj.currency} was "
                        f"rejected. Funds have been returned to your wallet "
                        f"balance. Contact support if you believe this is in "
                        f"error."
                    ),
                    notification_type='payment',
                    priority='high',
                    send_email=True,
                    send_real_time=True,
                )
            except Exception:
                pass
            n += 1
        self.message_user(request, f"Rejected {n} withdrawal(s).")
    reject_withdrawals.short_description = 'Reject — unlock funds'
