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
    Payment, UserPaymentMethod, WalletBalance, WalletTransaction,
    CryptoPayment, Refund, RecurringPayment
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
