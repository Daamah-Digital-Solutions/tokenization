"""
Investment Admin for Capimax Real Estate Tokenization Platform.

This module contains admin interfaces for investment management models.
"""

from django.contrib import admin, messages
from django.utils.html import format_html
from django.utils import timezone
from django.urls import reverse
from django.db.models import Sum
from decimal import Decimal

from .models import (
    Investment, InstallmentPayment, TokenReservation,
    InvestmentWithdrawal, AutoInvestment, DividendPayment,
    InvestmentStatus
)


@admin.register(Investment)
class InvestmentAdmin(admin.ModelAdmin):
    """Admin interface for Investment model."""

    list_display = [
        'id', 'user_email', 'property_title', 'token_amount',
        'investment_amount', 'status', 'mint_status_display',
        'tokens_minted', 'ownership_percentage_display',
        'created_at', 'completed_at'
    ]

    list_filter = [
        'status', 'blockchain_confirmed', 'created_at',
        'property_investment__property_type',
        'property_investment__city',
        'mint_retry_count'
    ]

    search_fields = [
        'user__email', 'user__first_name', 'user__last_name',
        'property_investment__title', 'transaction_hash', 'idempotency_key'
    ]

    readonly_fields = [
        'id', 'created_at', 'updated_at', 'ownership_percentage_display',
        'current_value_display', 'user_link', 'property_link',
        'mint_status_display', 'mint_error_display'
    ]

    fieldsets = (
        ('Investment Details', {
            'fields': (
                'id', 'user_link', 'property_link', 'token_amount',
                'investment_amount', 'ownership_percentage_display'
            )
        }),
        ('Status & Processing', {
            'fields': (
                'status', 'payment_method', 'transaction_hash',
                'blockchain_confirmed', 'confirmation_blocks'
            )
        }),
        ('Token Minting Status', {
            'fields': (
                'mint_status_display', 'tokens_minted', 'mint_retry_count',
                'mint_last_attempt', 'mint_scheduled_at', 'mint_error_display',
                'idempotency_key'
            ),
            'classes': ('collapse',),
            'description': 'Token minting tracking for deferred minting flow'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'completed_at')
        }),
        ('Calculated Values', {
            'fields': ('current_value_display',)
        })
    )

    actions = [
        'mark_as_completed', 'mark_as_failed',
        'retry_failed_mints', 'mark_for_refund', 'reset_mint_status'
    ]
    
    def user_email(self, obj):
        """Display user email."""
        return obj.user.email
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'
    
    def property_title(self, obj):
        """Display property title."""
        return obj.property_investment.title[:50]
    property_title.short_description = 'Property'
    property_title.admin_order_field = 'property_investment__title'
    
    def ownership_percentage_display(self, obj):
        """Display ownership percentage."""
        return f"{obj.ownership_percentage}%"
    ownership_percentage_display.short_description = 'Ownership %'
    
    def current_value_display(self, obj):
        """Display current investment value."""
        return f"${obj.current_value:,.2f}"
    current_value_display.short_description = 'Current Value'
    
    def user_link(self, obj):
        """Link to user admin page."""
        url = reverse('admin:accounts_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'User'
    
    def property_link(self, obj):
        """Link to property admin page."""
        url = reverse('admin:properties_property_change', args=[obj.property_investment.id])
        return format_html('<a href="{}">{}</a>', url, obj.property_investment.title)
    property_link.short_description = 'Property'
    
    def mark_as_completed(self, request, queryset):
        """Mark selected investments as completed."""
        updated = queryset.filter(status='processing').update(
            status='completed',
            completed_at=timezone.now()
        )
        self.message_user(request, f'{updated} investments marked as completed.')
    mark_as_completed.short_description = 'Mark selected investments as completed'
    
    def mark_as_failed(self, request, queryset):
        """Mark selected investments as failed."""
        updated = queryset.filter(status='processing').update(status='failed')
        self.message_user(request, f'{updated} investments marked as failed.')
    mark_as_failed.short_description = 'Mark selected investments as failed'

    def mint_status_display(self, obj):
        """Display mint status with color coding."""
        status_colors = {
            InvestmentStatus.PENDING_MINT: 'orange',
            InvestmentStatus.MINTING: 'blue',
            InvestmentStatus.COMPLETED: 'green',
            InvestmentStatus.MINT_FAILED: 'red',
        }
        color = status_colors.get(obj.status, 'gray')

        if obj.status == InvestmentStatus.MINT_FAILED:
            return format_html(
                '<span style="color: {}; font-weight: bold;">{}</span> '
                '<br><small>Retries: {}/{}</small>',
                color, obj.get_status_display(),
                obj.mint_retry_count, obj.MAX_MINT_RETRIES
            )
        elif obj.status == InvestmentStatus.PENDING_MINT:
            scheduled = obj.mint_scheduled_at.strftime('%H:%M:%S') if obj.mint_scheduled_at else 'Now'
            return format_html(
                '<span style="color: {};">{}</span>'
                '<br><small>Scheduled: {}</small>',
                color, obj.get_status_display(), scheduled
            )
        else:
            return format_html(
                '<span style="color: {};">{}</span>',
                color, obj.get_status_display()
            )
    mint_status_display.short_description = 'Mint Status'

    def mint_error_display(self, obj):
        """Display mint error message."""
        if obj.mint_error:
            return format_html(
                '<pre style="white-space: pre-wrap; max-width: 400px;">{}</pre>',
                obj.mint_error[:500]
            )
        return '-'
    mint_error_display.short_description = 'Last Mint Error'

    def retry_failed_mints(self, request, queryset):
        """Retry minting for failed investments."""
        from .tasks import retry_failed_mint

        eligible = queryset.filter(
            status__in=[InvestmentStatus.MINT_FAILED, InvestmentStatus.PENDING_MINT]
        )

        retried = 0
        for investment in eligible:
            try:
                # Reset and queue for retry
                investment.mint_retry_count = 0
                investment.mint_error = None
                investment.status = InvestmentStatus.PENDING_MINT
                investment.mint_scheduled_at = timezone.now()
                investment.save()

                # Trigger async task
                retry_failed_mint.delay(str(investment.id))
                retried += 1
            except Exception as e:
                self.message_user(
                    request,
                    f'Failed to retry investment {investment.id}: {str(e)}',
                    messages.ERROR
                )

        if retried > 0:
            self.message_user(
                request,
                f'{retried} investment(s) queued for mint retry.',
                messages.SUCCESS
            )
    retry_failed_mints.short_description = 'Retry token minting for selected'

    def mark_for_refund(self, request, queryset):
        """Mark investments for refund (manual process)."""
        eligible = queryset.filter(
            status__in=[InvestmentStatus.MINT_FAILED, InvestmentStatus.FAILED]
        )

        updated = eligible.update(status=InvestmentStatus.REFUNDED)

        if updated > 0:
            self.message_user(
                request,
                f'{updated} investment(s) marked for refund. '
                f'Please process refunds manually via Stripe dashboard.',
                messages.WARNING
            )
        else:
            self.message_user(
                request,
                'No eligible investments found. Only FAILED or MINT_FAILED can be refunded.',
                messages.ERROR
            )
    mark_for_refund.short_description = 'Mark for refund (manual)'

    def reset_mint_status(self, request, queryset):
        """Reset mint status for stuck investments (admin emergency action)."""
        updated = queryset.update(
            status=InvestmentStatus.PENDING_MINT,
            mint_retry_count=0,
            mint_error=None,
            mint_scheduled_at=timezone.now()
        )
        self.message_user(
            request,
            f'{updated} investment(s) reset to PENDING_MINT.',
            messages.SUCCESS
        )
    reset_mint_status.short_description = 'Reset mint status (emergency)'


@admin.register(InstallmentPayment)
class InstallmentPaymentAdmin(admin.ModelAdmin):
    """Admin interface for InstallmentPayment model."""
    
    list_display = [
        'id', 'user_email', 'property_title', 'installment_number',
        'amount', 'status', 'due_date', 'paid_at'
    ]
    
    list_filter = ['status', 'due_date', 'paid_at']
    
    search_fields = [
        'user__email', 'property_investment__title'
    ]
    
    readonly_fields = ['id', 'created_at', 'is_overdue_display']
    
    def user_email(self, obj):
        """Display user email."""
        return obj.user.email
    user_email.short_description = 'User'
    
    def property_title(self, obj):
        """Display property title."""
        return obj.property_investment.title[:30]
    property_title.short_description = 'Property'
    
    def is_overdue_display(self, obj):
        """Display if installment is overdue."""
        return 'Yes' if obj.is_overdue else 'No'
    is_overdue_display.short_description = 'Overdue'
    is_overdue_display.boolean = True


@admin.register(TokenReservation)
class TokenReservationAdmin(admin.ModelAdmin):
    """Admin interface for TokenReservation model."""
    
    list_display = [
        'id', 'user_email', 'property_title', 'token_amount',
        'reserved_at', 'expires_at', 'released', 'is_expired_display'
    ]
    
    list_filter = ['released', 'expires_at', 'reserved_at']
    
    search_fields = [
        'user__email', 'property_investment__title'
    ]
    
    readonly_fields = ['id', 'reserved_at', 'is_expired_display']
    
    actions = ['release_tokens']
    
    def user_email(self, obj):
        """Display user email."""
        return obj.user.email
    user_email.short_description = 'User'
    
    def property_title(self, obj):
        """Display property title."""
        return obj.property_investment.title[:30]
    property_title.short_description = 'Property'
    
    def is_expired_display(self, obj):
        """Display if reservation is expired."""
        return 'Yes' if obj.is_expired else 'No'
    is_expired_display.short_description = 'Expired'
    is_expired_display.boolean = True
    
    def release_tokens(self, request, queryset):
        """Release selected token reservations."""
        updated = queryset.filter(released=False).update(released=True)
        self.message_user(request, f'{updated} token reservations released.')
    release_tokens.short_description = 'Release selected token reservations'


@admin.register(InvestmentWithdrawal)
class InvestmentWithdrawalAdmin(admin.ModelAdmin):
    """Admin interface for InvestmentWithdrawal model."""
    
    list_display = [
        'id', 'investment_user', 'property_title', 'token_amount',
        'estimated_amount', 'processing_fee', 'net_amount_display',
        'status', 'requested_at'
    ]
    
    list_filter = ['status', 'requested_at', 'estimated_completion']
    
    search_fields = [
        'investment__user__email',
        'investment__property_investment__title'
    ]
    
    readonly_fields = [
        'id', 'requested_at', 'net_amount_display',
        'investment_link', 'user_link'
    ]
    
    actions = ['approve_withdrawals', 'reject_withdrawals']
    
    def investment_user(self, obj):
        """Display investment user email."""
        return obj.investment.user.email
    investment_user.short_description = 'User'
    
    def property_title(self, obj):
        """Display property title."""
        return obj.investment.property_investment.title[:30]
    property_title.short_description = 'Property'
    
    def net_amount_display(self, obj):
        """Display net withdrawal amount."""
        return f"${obj.net_amount:,.2f}"
    net_amount_display.short_description = 'Net Amount'
    
    def investment_link(self, obj):
        """Link to investment admin page."""
        url = reverse('admin:investments_investment_change', args=[obj.investment.id])
        return format_html('<a href="{}">{}</a>', url, str(obj.investment.id)[:8])
    investment_link.short_description = 'Investment'
    
    def user_link(self, obj):
        """Link to user admin page."""
        url = reverse('admin:accounts_user_change', args=[obj.investment.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.investment.user.email)
    user_link.short_description = 'User'
    
    def approve_withdrawals(self, request, queryset):
        """Approve selected withdrawal requests."""
        updated = queryset.filter(status='pending').update(status='processing')
        self.message_user(request, f'{updated} withdrawal requests approved.')
    approve_withdrawals.short_description = 'Approve selected withdrawal requests'
    
    def reject_withdrawals(self, request, queryset):
        """Reject selected withdrawal requests."""
        updated = queryset.filter(status='pending').update(status='cancelled')
        self.message_user(request, f'{updated} withdrawal requests rejected.')
    reject_withdrawals.short_description = 'Reject selected withdrawal requests'


@admin.register(AutoInvestment)
class AutoInvestmentAdmin(admin.ModelAdmin):
    """Admin interface for AutoInvestment model."""
    
    list_display = [
        'id', 'user_email', 'property_title', 'amount',
        'frequency', 'total_invested', 'status', 'next_execution'
    ]
    
    list_filter = ['status', 'frequency', 'next_execution', 'created_at']
    
    search_fields = [
        'user__email', 'property_investment__title'
    ]
    
    readonly_fields = ['id', 'created_at', 'total_invested']
    
    actions = ['activate_plans', 'pause_plans']
    
    def user_email(self, obj):
        """Display user email."""
        return obj.user.email
    user_email.short_description = 'User'
    
    def property_title(self, obj):
        """Display property title."""
        return obj.property_investment.title[:30]
    property_title.short_description = 'Property'
    
    def activate_plans(self, request, queryset):
        """Activate selected auto investment plans."""
        updated = queryset.exclude(status='active').update(status='active')
        self.message_user(request, f'{updated} auto investment plans activated.')
    activate_plans.short_description = 'Activate selected auto investment plans'
    
    def pause_plans(self, request, queryset):
        """Pause selected auto investment plans."""
        updated = queryset.filter(status='active').update(status='paused')
        self.message_user(request, f'{updated} auto investment plans paused.')
    pause_plans.short_description = 'Pause selected auto investment plans'


@admin.register(DividendPayment)
class DividendPaymentAdmin(admin.ModelAdmin):
    """Admin interface for DividendPayment model."""
    
    list_display = [
        'id', 'investor_email', 'property_title', 'amount',
        'currency', 'payment_date', 'status', 'annual_yield_display'
    ]
    
    list_filter = ['status', 'payment_date', 'currency', 'created_at']
    
    search_fields = [
        'investment__user__email',
        'investment__property_investment__title'
    ]
    
    readonly_fields = [
        'id', 'created_at', 'annual_yield_display',
        'investment_link', 'user_link'
    ]
    
    actions = ['mark_as_paid', 'cancel_dividends']
    
    def investor_email(self, obj):
        """Display investor email."""
        return obj.investment.user.email
    investor_email.short_description = 'Investor'
    
    def property_title(self, obj):
        """Display property title."""
        return obj.investment.property_investment.title[:30]
    property_title.short_description = 'Property'
    
    def annual_yield_display(self, obj):
        """Display annualized yield."""
        return f"{obj.annual_yield}%"
    annual_yield_display.short_description = 'Annual Yield'
    
    def investment_link(self, obj):
        """Link to investment admin page."""
        url = reverse('admin:investments_investment_change', args=[obj.investment.id])
        return format_html('<a href="{}">{}</a>', url, str(obj.investment.id)[:8])
    investment_link.short_description = 'Investment'
    
    def user_link(self, obj):
        """Link to user admin page."""
        url = reverse('admin:accounts_user_change', args=[obj.investment.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.investment.user.email)
    user_link.short_description = 'User'
    
    def mark_as_paid(self, request, queryset):
        """Mark selected dividends as paid."""
        updated = queryset.filter(status='pending').update(status='paid')
        self.message_user(request, f'{updated} dividends marked as paid.')
    mark_as_paid.short_description = 'Mark selected dividends as paid'
    
    def cancel_dividends(self, request, queryset):
        """Cancel selected dividends."""
        updated = queryset.filter(status='pending').update(status='cancelled')
        self.message_user(request, f'{updated} dividends cancelled.')
    cancel_dividends.short_description = 'Cancel selected dividends'


# Custom admin site customizations
admin.site.site_header = 'Capimax Investment Management'
admin.site.site_title = 'Capimax Admin'
admin.site.index_title = 'Investment Platform Administration'
