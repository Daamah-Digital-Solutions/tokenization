"""
Admin interface for Payment models.

This module configures the Django admin interface for payment-related models,
providing comprehensive management capabilities for administrators.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta

from .models import (
    NOWPaymentsTransaction,
    Payment, UserPaymentMethod, WalletBalance, WalletTransaction,
    CryptoPayment, Refund, RecurringPayment,
    BankTransfer, NovaSukukPayment, PronovaPayment,
)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """Admin interface for Payment model."""
    
    list_display = [
        'id', 'user_email', 'amount', 'currency', 'payment_method', 
        'status', 'fee_percentage', 'created_at', 'completed_at'
    ]
    list_filter = [
        'status', 'payment_method', 'currency', 'created_at',
        ('completed_at', admin.DateFieldListFilter),
    ]
    search_fields = [
        'id', 'user__email', 'user__first_name', 'user__last_name',
        'external_transaction_id', 'payment_intent_id'
    ]
    readonly_fields = [
        'id', 'created_at', 'updated_at', 'fee_percentage',
        'external_transaction_id', 'payment_intent_id'
    ]
    raw_id_fields = ['user', 'investment']
    
    fieldsets = (
        ('Payment Information', {
            'fields': (
                'id', 'user', 'investment', 'amount', 'currency',
                'payment_method', 'status'
            )
        }),
        ('Transaction Details', {
            'fields': (
                'transaction_hash', 'payment_intent_id', 'external_transaction_id',
                'processing_fee', 'net_amount', 'fee_percentage'
            )
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'completed_at'),
            'classes': ('collapse',)
        })
    )
    
    def user_email(self, obj):
        """Display user email with link to user admin."""
        if obj.user:
            url = reverse('admin:accounts_user_change', args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return 'N/A'
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('user', 'investment')
    
    actions = ['mark_as_completed', 'mark_as_failed', 'export_payments']
    
    def mark_as_completed(self, request, queryset):
        """Mark selected payments as completed."""
        updated = queryset.filter(status='processing').update(
            status='completed',
            completed_at=timezone.now()
        )
        self.message_user(request, f"{updated} payments marked as completed.")
    mark_as_completed.short_description = "Mark selected payments as completed"
    
    def mark_as_failed(self, request, queryset):
        """Mark selected payments as failed."""
        updated = queryset.filter(status__in=['pending', 'processing']).update(
            status='failed'
        )
        self.message_user(request, f"{updated} payments marked as failed.")
    mark_as_failed.short_description = "Mark selected payments as failed"


@admin.register(UserPaymentMethod)
class UserPaymentMethodAdmin(admin.ModelAdmin):
    """Admin interface for UserPaymentMethod model."""
    
    list_display = [
        'id', 'user_email', 'method_type', 'display_name', 'brand',
        'is_default', 'is_verified', 'created_at'
    ]
    list_filter = ['method_type', 'is_default', 'is_verified', 'brand', 'created_at']
    search_fields = [
        'user__email', 'display_name', 'brand', 'last_four', 'external_id'
    ]
    readonly_fields = ['id', 'created_at']
    raw_id_fields = ['user']
    
    fieldsets = (
        ('User Information', {
            'fields': ('id', 'user', 'method_type', 'display_name')
        }),
        ('Payment Method Details', {
            'fields': (
                'last_four', 'expiry_date', 'brand', 'wallet_address', 'network'
            )
        }),
        ('Status & Settings', {
            'fields': ('is_default', 'is_verified', 'external_id')
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at',)
        })
    )
    
    def user_email(self, obj):
        """Display user email with link."""
        if obj.user:
            url = reverse('admin:accounts_user_change', args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return 'N/A'
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'


@admin.register(WalletBalance)
class WalletBalanceAdmin(admin.ModelAdmin):
    """Admin interface for WalletBalance model."""
    
    list_display = [
        'user_email', 'currency', 'available_balance', 'pending_balance',
        'locked_balance', 'total_balance', 'updated_at'
    ]
    list_filter = ['currency', 'updated_at']
    search_fields = ['user__email', 'currency']
    readonly_fields = ['total_balance', 'updated_at']
    raw_id_fields = ['user']
    
    def user_email(self, obj):
        """Display user email with link."""
        url = reverse('admin:accounts_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'
    
    def get_queryset(self, request):
        """Optimize queryset."""
        return super().get_queryset(request).select_related('user')


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    """Admin interface for WalletTransaction model."""
    
    list_display = [
        'id', 'user_email', 'transaction_type', 'amount', 'currency',
        'balance_after', 'created_at'
    ]
    list_filter = ['transaction_type', 'currency', 'created_at']
    search_fields = [
        'id', 'user__email', 'description', 'reference_id'
    ]
    readonly_fields = ['id', 'created_at']
    raw_id_fields = ['user']
    
    fieldsets = (
        ('Transaction Information', {
            'fields': (
                'id', 'user', 'transaction_type', 'amount', 'currency'
            )
        }),
        ('Balance Details', {
            'fields': ('balance_before', 'balance_after')
        }),
        ('Reference & Description', {
            'fields': ('reference_id', 'description')
        }),
        ('Timestamp', {
            'fields': ('created_at',)
        })
    )
    
    def user_email(self, obj):
        """Display user email with link."""
        url = reverse('admin:accounts_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'
    
    def get_queryset(self, request):
        """Optimize queryset."""
        return super().get_queryset(request).select_related('user')


class CryptoPaymentInline(admin.TabularInline):
    """Inline admin for CryptoPayment."""
    model = CryptoPayment
    readonly_fields = ['is_confirmed']
    extra = 0


@admin.register(CryptoPayment)
class CryptoPaymentAdmin(admin.ModelAdmin):
    """Admin interface for CryptoPayment model."""
    
    list_display = [
        'payment_id', 'wallet_address', 'network', 'confirmations',
        'confirmation_blocks_required', 'is_confirmed'
    ]
    list_filter = ['network', 'confirmations', 'confirmation_blocks_required']
    search_fields = ['payment__id', 'wallet_address', 'network']
    readonly_fields = ['is_confirmed']
    raw_id_fields = ['payment']
    
    fieldsets = (
        ('Payment Reference', {
            'fields': ('payment',)
        }),
        ('Blockchain Details', {
            'fields': (
                'wallet_address', 'network', 'gas_limit', 'gas_price'
            )
        }),
        ('Confirmation Status', {
            'fields': (
                'confirmation_blocks_required', 'confirmations', 
                'is_confirmed', 'block_height'
            )
        })
    )
    
    def payment_id(self, obj):
        """Display payment ID with link."""
        url = reverse('admin:payments_payment_change', args=[obj.payment.pk])
        return format_html('<a href="{}">{}</a>', url, str(obj.payment.id))
    payment_id.short_description = 'Payment'


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    """Admin interface for Refund model."""
    
    list_display = [
        'id', 'payment_id', 'amount', 'status', 'reason_short',
        'created_at', 'processed_at'
    ]
    list_filter = ['status', 'created_at', 'processed_at']
    search_fields = [
        'id', 'payment__id', 'reason', 'external_refund_id'
    ]
    readonly_fields = ['id', 'created_at', 'processed_at']
    raw_id_fields = ['payment']
    
    fieldsets = (
        ('Refund Information', {
            'fields': ('id', 'payment', 'amount', 'status')
        }),
        ('Details', {
            'fields': ('reason', 'external_refund_id')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'processed_at')
        })
    )
    
    def payment_id(self, obj):
        """Display payment ID with link."""
        url = reverse('admin:payments_payment_change', args=[obj.payment.pk])
        return format_html('<a href="{}">{}</a>', url, str(obj.payment.id))
    payment_id.short_description = 'Payment'
    
    def reason_short(self, obj):
        """Display truncated reason."""
        return obj.reason[:50] + '...' if len(obj.reason) > 50 else obj.reason
    reason_short.short_description = 'Reason'
    
    actions = ['approve_refunds', 'deny_refunds']
    
    def approve_refunds(self, request, queryset):
        """Approve selected refunds."""
        updated = queryset.filter(status='pending').update(
            status='processing'
        )
        self.message_user(request, f"{updated} refunds approved for processing.")
    approve_refunds.short_description = "Approve selected refunds"
    
    def deny_refunds(self, request, queryset):
        """Deny selected refunds."""
        updated = queryset.filter(status='pending').update(
            status='failed'
        )
        self.message_user(request, f"{updated} refunds denied.")
    deny_refunds.short_description = "Deny selected refunds"


@admin.register(RecurringPayment)
class RecurringPaymentAdmin(admin.ModelAdmin):
    """Admin interface for RecurringPayment model."""
    
    list_display = [
        'id', 'user_email', 'amount', 'currency', 'frequency',
        'status', 'next_payment', 'total_payments', 'total_amount'
    ]
    list_filter = ['frequency', 'status', 'purpose', 'created_at']
    search_fields = ['id', 'user__email']
    readonly_fields = ['id', 'total_payments', 'total_amount', 'created_at']
    raw_id_fields = ['user', 'payment_method', 'investment']
    
    fieldsets = (
        ('Recurring Payment Setup', {
            'fields': (
                'id', 'user', 'amount', 'currency', 'frequency', 'status'
            )
        }),
        ('Payment Details', {
            'fields': ('payment_method', 'purpose', 'investment')
        }),
        ('Schedule', {
            'fields': ('start_date', 'end_date', 'next_payment')
        }),
        ('Statistics', {
            'fields': ('total_payments', 'total_amount'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    )
    
    def user_email(self, obj):
        """Display user email with link."""
        url = reverse('admin:accounts_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'
    
    def get_queryset(self, request):
        """Optimize queryset."""
        return super().get_queryset(request).select_related(
            'user', 'payment_method', 'investment'
        )
    
    actions = ['pause_payments', 'resume_payments', 'cancel_payments']
    
    def pause_payments(self, request, queryset):
        """Pause selected recurring payments."""
        updated = queryset.filter(status='active').update(status='paused')
        self.message_user(request, f"{updated} recurring payments paused.")
    pause_payments.short_description = "Pause selected recurring payments"
    
    def resume_payments(self, request, queryset):
        """Resume selected recurring payments."""
        updated = queryset.filter(status='paused').update(status='active')
        self.message_user(request, f"{updated} recurring payments resumed.")
    resume_payments.short_description = "Resume selected recurring payments"
    
    def cancel_payments(self, request, queryset):
        """Cancel selected recurring payments."""
        updated = queryset.update(status='cancelled')
        self.message_user(request, f"{updated} recurring payments cancelled.")
    cancel_payments.short_description = "Cancel selected recurring payments"


# Add inline to Payment admin
PaymentAdmin.inlines = [CryptoPaymentInline]


@admin.register(NOWPaymentsTransaction)
class NOWPaymentsTransactionAdmin(admin.ModelAdmin):
    """Admin interface for NOWPaymentsTransaction model."""
    
    list_display = [
        'id', 'payment_id', 'nowpayments_payment_id', 'payment_status',
        'pay_currency', 'pay_amount', 'actually_paid', 'is_completed',
        'created_at', 'updated_at'
    ]
    list_filter = ['payment_status', 'pay_currency', 'price_currency', 'created_at']
    search_fields = [
        'id', 'nowpayments_payment_id', 'order_id', 'invoice_id',
        'pay_address', 'transaction_hash', 'payment__id', 'payment__user__email'
    ]
    readonly_fields = [
        'id', 'created_at', 'updated_at', 'is_completed',
        'is_pending', 'is_failed'
    ]
    raw_id_fields = ['payment']
    
    fieldsets = (
        ('NOWPayments Information', {
            'fields': (
                'id', 'payment', 'nowpayments_payment_id', 'order_id', 'payment_status'
            )
        }),
        ('Payment Details', {
            'fields': (
                'pay_address', 'pay_amount', 'pay_currency', 'actually_paid',
                'price_amount', 'price_currency'
            )
        }),
        ('Invoice & URLs', {
            'fields': (
                'invoice_id', 'invoice_url', 'ipn_callback_url'
            ),
            'classes': ('collapse',)
        }),
        ('Transaction Details', {
            'fields': (
                'transaction_hash', 'network_fee', 'outcome_amount',
                'outcome_currency', 'burning_percent'
            ),
            'classes': ('collapse',)
        }),
        ('Status Checks', {
            'fields': (
                'is_completed', 'is_pending', 'is_failed', 'expiration_estimate_date'
            )
        }),
        ('Order Description', {
            'fields': ('order_description',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        })
    )
    
    def payment_id(self, obj):
        """Display payment ID with link."""
        url = reverse('admin:payments_payment_change', args=[obj.payment.pk])
        return format_html('<a href="{}">{}</a>', url, str(obj.payment.id)[:8])
    payment_id.short_description = 'Payment'
    
    def get_queryset(self, request):
        """Optimize queryset."""
        return super().get_queryset(request).select_related('payment', 'payment__user')
    
    actions = ['refresh_payment_status', 'mark_as_failed']
    
    def refresh_payment_status(self, request, queryset):
        """Refresh payment status from NOWPayments API."""
        from .nowpayments_service import NOWPaymentsService
        service = NOWPaymentsService()
        updated = 0
        
        for tx in queryset:
            try:
                status_data = service.get_payment_status(tx.nowpayments_payment_id)
                if status_data:
                    tx.payment_status = status_data.get('payment_status', tx.payment_status)
                    tx.save()
                    updated += 1
            except Exception as e:
                continue
        
        self.message_user(request, f"{updated} NOWPayments transactions refreshed.")
    refresh_payment_status.short_description = "Refresh payment status from NOWPayments"
    
    def mark_as_failed(self, request, queryset):
        """Mark selected transactions as failed."""
        updated = queryset.filter(payment_status__in=['waiting', 'confirming', 'confirmed']).update(
            payment_status='failed'
        )
        self.message_user(request, f"{updated} transactions marked as failed.")
    mark_as_failed.short_description = "Mark selected transactions as failed"


# ---------------------------------------------------------------------------
# Manual-review payment types: BankTransfer + NovaSukukPayment
#
# Both use the same approve/reject workflow — admin verifies the uploaded
# proof, hits "Approve selected", and the action calls into
# InvestmentProcessingService.process_investment which transitions the
# linked Investment to PENDING_MINT and lets the Celery mint task pick it
# up. Rejection marks Payment + Investment failed and notifies the user.
# ---------------------------------------------------------------------------


def _approve_review_payment(modeladmin, request, queryset, kind):
    """Shared body for the approve action on BankTransfer + NovaSukukPayment.

    ``kind`` is 'bank_transfer' or 'nova_sukuk' — used only for the
    summary message.
    """
    from django.utils import timezone
    from investments.services import InvestmentProcessingService
    from notifications.services import NotificationService

    approved, skipped = 0, 0
    for obj in queryset:
        # Look up the linked investment + payment regardless of model.
        payment = getattr(obj, 'payment', None)
        investment = getattr(obj, 'investment', None) or (
            payment.investment if payment else None
        )
        if not investment or not payment:
            skipped += 1
            continue

        # Skip if already approved or terminal.
        existing_status = getattr(obj, 'status', None) or getattr(obj, 'transfer_status', None)
        if existing_status in ('approved', 'completed', 'failed', 'rejected'):
            skipped += 1
            continue

        obj.reviewed_by = request.user
        obj.reviewed_at = timezone.now()
        if hasattr(obj, 'status'):
            obj.status = 'approved'
        if hasattr(obj, 'transfer_status'):
            obj.transfer_status = 'completed'
            obj.completed_at = timezone.now()
        obj.save()

        payment.status = 'completed'
        payment.completed_at = timezone.now()
        payment.save(update_fields=['status', 'completed_at', 'updated_at'])

        try:
            InvestmentProcessingService.process_investment(investment, payment)
        except Exception as exc:
            modeladmin.message_user(
                request,
                f"Approval saved but minting failed for investment "
                f"{investment.id}: {exc}",
                level='ERROR',
            )

        try:
            NotificationService.create_notification(
                user=investment.user,
                title=f"{kind.replace('_', ' ').title()} Approved",
                message=(
                    f"Your {kind.replace('_', ' ')} for "
                    f"{investment.property_investment.title} was approved. "
                    f"Tokens will mint on chain shortly."
                ),
                notification_type='payment',
                priority='high',
                send_email=True,
                send_real_time=True,
            )
        except Exception:
            # Don't fail the admin action on a notification problem.
            pass

        approved += 1

    modeladmin.message_user(
        request,
        f"Approved {approved} {kind} payment(s); skipped {skipped}.",
    )


def _reject_review_payment(modeladmin, request, queryset, kind):
    """Shared body for the reject action."""
    from django.utils import timezone
    from notifications.services import NotificationService

    rejected = 0
    for obj in queryset:
        payment = getattr(obj, 'payment', None)
        investment = getattr(obj, 'investment', None) or (
            payment.investment if payment else None
        )

        obj.reviewed_by = request.user
        obj.reviewed_at = timezone.now()
        if not obj.review_note:
            obj.review_note = (
                'Rejected by admin via Django admin bulk action. '
                'Open the row to add a specific reason if needed.'
            )
        if hasattr(obj, 'status'):
            obj.status = 'rejected'
        if hasattr(obj, 'transfer_status'):
            obj.transfer_status = 'failed'
        obj.save()

        if payment:
            payment.status = 'failed'
            payment.save(update_fields=['status', 'updated_at'])

        if investment:
            investment.status = 'failed'
            investment.save(update_fields=['status', 'updated_at'])
            try:
                NotificationService.create_notification(
                    user=investment.user,
                    title=f"{kind.replace('_', ' ').title()} Rejected",
                    message=(
                        f"Your {kind.replace('_', ' ')} for "
                        f"{investment.property_investment.title} was rejected. "
                        f"Please contact support if you believe this is in error."
                    ),
                    notification_type='payment',
                    priority='high',
                    send_email=True,
                    send_real_time=True,
                )
            except Exception:
                pass

        rejected += 1

    modeladmin.message_user(
        request,
        f"Rejected {rejected} {kind} payment(s).",
    )


@admin.register(BankTransfer)
class BankTransferAdmin(admin.ModelAdmin):
    """Bank-transfer review interface.

    Lists pending bank transfers with the proof image / PDF directly
    linkable from the changelist. Admins click into a row, eyeball the
    proof, then either run the Approve / Reject action.
    """
    list_display = (
        'transfer_reference', 'status_badge', 'investor_email',
        'amount_display', 'bank_name', 'proof_link',
        'initiated_at', 'reviewed_by',
    )
    list_filter = ('transfer_status', 'initiated_at')
    search_fields = (
        'transfer_reference', 'bank_name', 'account_holder_name',
        'payment__user__email',
    )
    readonly_fields = (
        'id', 'payment', 'transfer_reference', 'initiated_at', 'completed_at',
        'reviewed_by', 'reviewed_at',
    )
    raw_id_fields = ('payment',)
    actions = ('approve_transfers', 'reject_transfers')
    list_select_related = ('payment', 'payment__user', 'payment__investment')

    def status_badge(self, obj):
        colours = {
            'completed': '#16a34a', 'pending': '#d97706',
            'initiated': '#2563eb', 'processing': '#2563eb',
            'failed': '#dc2626', 'cancelled': '#6b7280',
        }
        c = colours.get(obj.transfer_status, '#6b7280')
        return format_html(
            '<span style="display:inline-block;padding:2px 8px;border-radius:6px;'
            'background:{};color:white;font-size:11px;">{}</span>',
            c, obj.transfer_status.upper(),
        )
    status_badge.short_description = 'Status'

    def investor_email(self, obj):
        return obj.payment.user.email if obj.payment and obj.payment.user else '-'
    investor_email.short_description = 'Investor'

    def amount_display(self, obj):
        if obj.payment:
            return f"{obj.payment.amount} {obj.payment.currency}"
        return '-'
    amount_display.short_description = 'Amount'

    def proof_link(self, obj):
        if obj.proof_of_transfer:
            return format_html(
                '<a href="{}" target="_blank" rel="noopener">View proof</a>',
                obj.proof_of_transfer.url,
            )
        return format_html('<span style="color:#dc2626;">no proof</span>')
    proof_link.short_description = 'Proof'

    def approve_transfers(self, request, queryset):
        _approve_review_payment(self, request, queryset, 'bank_transfer')
    approve_transfers.short_description = 'Approve — release tokens & mint'

    def reject_transfers(self, request, queryset):
        _reject_review_payment(self, request, queryset, 'bank_transfer')
    reject_transfers.short_description = 'Reject — mark investment failed'


@admin.register(NovaSukukPayment)
class NovaSukukPaymentAdmin(admin.ModelAdmin):
    """Nova Sukuk PDF review interface (same shape as BankTransferAdmin)."""

    list_display = (
        'sukuk_reference_number', 'status_badge', 'investor_email',
        'amount_display', 'pdf_link', 'created_at', 'reviewed_by',
    )
    list_filter = ('status', 'created_at')
    search_fields = (
        'sukuk_reference_number', 'investment__user__email',
    )
    readonly_fields = (
        'id', 'investment', 'payment', 'created_at', 'updated_at',
        'reviewed_by', 'reviewed_at',
    )
    raw_id_fields = ('investment', 'payment')
    actions = ('approve_sukuk', 'reject_sukuk')
    list_select_related = (
        'investment', 'investment__user', 'payment',
    )

    def status_badge(self, obj):
        colours = {
            'approved': '#16a34a', 'pending': '#d97706', 'rejected': '#dc2626',
        }
        c = colours.get(obj.status, '#6b7280')
        return format_html(
            '<span style="display:inline-block;padding:2px 8px;border-radius:6px;'
            'background:{};color:white;font-size:11px;">{}</span>',
            c, obj.status.upper(),
        )
    status_badge.short_description = 'Status'

    def investor_email(self, obj):
        if obj.investment and obj.investment.user:
            return obj.investment.user.email
        return '-'
    investor_email.short_description = 'Investor'

    def amount_display(self, obj):
        if obj.investment:
            return f"${obj.investment.investment_amount}"
        return '-'
    amount_display.short_description = 'Amount'

    def pdf_link(self, obj):
        if obj.sukuk_pdf:
            return format_html(
                '<a href="{}" target="_blank" rel="noopener">View PDF</a>',
                obj.sukuk_pdf.url,
            )
        return format_html('<span style="color:#dc2626;">no document</span>')
    pdf_link.short_description = 'Sukuk PDF'

    def approve_sukuk(self, request, queryset):
        _approve_review_payment(self, request, queryset, 'nova_sukuk')
    approve_sukuk.short_description = 'Approve — release tokens & mint'

    def reject_sukuk(self, request, queryset):
        _reject_review_payment(self, request, queryset, 'nova_sukuk')
    reject_sukuk.short_description = 'Reject — mark investment failed'

