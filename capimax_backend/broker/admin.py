"""
Django Admin Configuration for Broker App.

This module configures the Django admin interface for broker management,
commission tracking, referrals, and marketing materials.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import (
    BrokerProfile, BrokerCommission, BrokerReferral,
    MarketingMaterial, BrokerPerformanceMetrics, BrokerApplication
)


@admin.register(BrokerProfile)
class BrokerProfileAdmin(admin.ModelAdmin):
    """Admin interface for broker profiles."""
    
    list_display = [
        'user_name', 'user_email', 'license_number', 'verification_status',
        'is_premium', 'total_sales', 'commission_rate', 'created_at'
    ]
    list_filter = [
        'verification_status', 'is_premium', 'license_state', 
        'created_at', 'license_expiry'
    ]
    search_fields = [
        'user__email', 'user__first_name', 'user__last_name',
        'license_number', 'company_name'
    ]
    readonly_fields = [
        'id', 'total_sales', 'total_commissions_earned',
        'active_referrals_count', 'created_at', 'updated_at'
    ]
    fieldsets = [
        ('User Information', {
            'fields': ['user', 'id']
        }),
        ('License Information', {
            'fields': [
                'license_number', 'license_state', 'license_expiry',
                'verification_status'
            ]
        }),
        ('Commission Settings', {
            'fields': ['commission_rate', 'referral_commission_rate']
        }),
        ('Company Information', {
            'fields': [
                'company_name', 'company_address', 'website', 'bio',
                'experience_years', 'specializations', 'languages_spoken',
                'profile_image'
            ]
        }),
        ('Premium Features', {
            'fields': ['is_premium', 'premium_expires_at']
        }),
        ('Performance Metrics', {
            'fields': [
                'total_sales', 'total_commissions_earned',
                'active_referrals_count'
            ]
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at']
        })
    ]
    
    def user_name(self, obj):
        """Display user's full name."""
        return obj.user.get_full_name()
    user_name.short_description = 'Name'
    
    def user_email(self, obj):
        """Display user's email with link to user admin."""
        url = reverse('admin:accounts_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_email.short_description = 'Email'
    
    actions = ['approve_brokers', 'suspend_brokers', 'activate_premium']
    
    def approve_brokers(self, request, queryset):
        """Bulk approve broker verification."""
        updated = queryset.update(verification_status='verified')
        self.message_user(request, f'{updated} brokers approved.')
    approve_brokers.short_description = 'Approve selected brokers'
    
    def suspend_brokers(self, request, queryset):
        """Bulk suspend brokers."""
        updated = queryset.update(verification_status='suspended')
        self.message_user(request, f'{updated} brokers suspended.')
    suspend_brokers.short_description = 'Suspend selected brokers'


@admin.register(BrokerCommission)
class BrokerCommissionAdmin(admin.ModelAdmin):
    """Admin interface for broker commissions."""
    
    list_display = [
        'broker_name', 'commission_type', 'commission_amount',
        'status', 'earned_at', 'approved_at', 'paid_at'
    ]
    list_filter = [
        'status', 'commission_type', 'earned_at', 'approved_at', 'paid_at'
    ]
    search_fields = [
        'broker__user__email', 'broker__user__first_name',
        'broker__user__last_name', 'payment_reference'
    ]
    readonly_fields = [
        'id', 'commission_amount', 'earned_at', 'approved_at',
        'paid_at', 'created_at', 'updated_at'
    ]
    fieldsets = [
        ('Commission Details', {
            'fields': [
                'id', 'broker', 'investment', 'referral', 'commission_type'
            ]
        }),
        ('Amount Calculation', {
            'fields': [
                'base_amount', 'commission_rate', 'commission_amount'
            ]
        }),
        ('Status Tracking', {
            'fields': [
                'status', 'earned_at', 'approved_at', 'paid_at',
                'payment_reference'
            ]
        }),
        ('Additional Information', {
            'fields': ['notes']
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at']
        })
    ]
    
    def broker_name(self, obj):
        """Display broker's name with link."""
        url = reverse('admin:broker_brokerprofile_change', args=[obj.broker.pk])
        return format_html('<a href="{}">{}</a>', url, obj.broker.user.get_full_name())
    broker_name.short_description = 'Broker'
    
    actions = ['approve_commissions', 'mark_as_paid']
    
    def approve_commissions(self, request, queryset):
        """Bulk approve commissions."""
        updated = 0
        for commission in queryset:
            if commission.status == 'pending':
                commission.approve()
                updated += 1
        self.message_user(request, f'{updated} commissions approved.')
    approve_commissions.short_description = 'Approve selected commissions'
    
    def mark_as_paid(self, request, queryset):
        """Bulk mark commissions as paid."""
        updated = 0
        for commission in queryset:
            if commission.status == 'approved':
                commission.mark_paid()
                updated += 1
        self.message_user(request, f'{updated} commissions marked as paid.')
    mark_as_paid.short_description = 'Mark selected commissions as paid'


@admin.register(BrokerReferral)
class BrokerReferralAdmin(admin.ModelAdmin):
    """Admin interface for broker referrals."""
    
    list_display = [
        'referral_code', 'broker_name', 'referred_user_email',
        'is_converted', 'conversion_amount', 'commission_earned',
        'is_active', 'created_at'
    ]
    list_filter = [
        'is_converted', 'is_active', 'broker__verification_status',
        'created_at', 'first_investment_at'
    ]
    search_fields = [
        'referral_code', 'broker__user__email', 'referred_user__email',
        'referred_email'
    ]
    readonly_fields = [
        'id', 'referral_code', 'is_converted', 'conversion_amount',
        'commission_earned', 'first_investment_at', 'last_activity_at',
        'created_at', 'updated_at'
    ]
    fieldsets = [
        ('Referral Information', {
            'fields': [
                'id', 'broker', 'referral_code', 'referred_user', 'referred_email'
            ]
        }),
        ('Conversion Tracking', {
            'fields': [
                'is_converted', 'conversion_amount', 'commission_earned',
                'first_investment_at'
            ]
        }),
        ('Status and Expiry', {
            'fields': [
                'is_active', 'expires_at', 'last_activity_at'
            ]
        }),
        ('Notes', {
            'fields': ['notes']
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at']
        })
    ]
    
    def broker_name(self, obj):
        """Display broker's name."""
        return obj.broker.user.get_full_name()
    broker_name.short_description = 'Broker'
    
    def referred_user_email(self, obj):
        """Display referred user's email."""
        return obj.referred_user.email if obj.referred_user else obj.referred_email
    referred_user_email.short_description = 'Referred User'


@admin.register(MarketingMaterial)
class MarketingMaterialAdmin(admin.ModelAdmin):
    """Admin interface for marketing materials."""
    
    list_display = [
        'title', 'material_type', 'file_format', 'file_size_mb',
        'is_active', 'is_premium_only', 'download_count', 'created_at'
    ]
    list_filter = [
        'material_type', 'file_format', 'is_active',
        'is_premium_only', 'created_at'
    ]
    search_fields = ['title', 'description', 'tags']
    readonly_fields = [
        'id', 'file_size', 'file_format', 'download_count',
        'created_at', 'updated_at'
    ]
    fieldsets = [
        ('Material Information', {
            'fields': ['title', 'description', 'material_type', 'tags']
        }),
        ('File Information', {
            'fields': ['file', 'thumbnail', 'file_size', 'file_format', 'version']
        }),
        ('Access Control', {
            'fields': ['is_active', 'is_premium_only']
        }),
        ('Statistics', {
            'fields': ['download_count', 'created_by']
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at']
        })
    ]
    
    def file_size_mb(self, obj):
        """Display file size in MB."""
        return f"{obj.file_size / (1024 * 1024):.2f} MB"
    file_size_mb.short_description = 'File Size'


@admin.register(BrokerPerformanceMetrics)
class BrokerPerformanceMetricsAdmin(admin.ModelAdmin):
    """Admin interface for broker performance metrics."""
    
    list_display = [
        'broker_name', 'month', 'total_sales', 'total_commissions',
        'investment_count', 'referral_conversion_rate', 'performance_rank'
    ]
    list_filter = [
        'month', 'broker__verification_status', 'performance_rank'
    ]
    search_fields = ['broker__user__email', 'broker__user__first_name', 'broker__user__last_name']
    readonly_fields = [
        'id', 'created_at', 'updated_at'
    ]
    fieldsets = [
        ('Broker and Period', {
            'fields': ['broker', 'month']
        }),
        ('Sales Metrics', {
            'fields': [
                'total_sales', 'total_commissions', 'investment_count',
                'avg_investment_size'
            ]
        }),
        ('Referral Metrics', {
            'fields': [
                'new_referrals', 'converted_referrals', 'referral_conversion_rate'
            ]
        }),
        ('Client Metrics', {
            'fields': [
                'unique_investors', 'repeat_investors', 'client_retention_rate'
            ]
        }),
        ('Marketing and Ranking', {
            'fields': [
                'marketing_materials_downloaded', 'performance_rank'
            ]
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at']
        })
    ]
    
    def broker_name(self, obj):
        """Display broker's name."""
        return obj.broker.user.get_full_name()
    broker_name.short_description = 'Broker'



@admin.register(BrokerApplication)
class BrokerApplicationAdmin(admin.ModelAdmin):
    """Admin interface for broker applications."""

    list_display = [
        'full_name', 'email', 'application_status', 'experience_level',
        'country', 'terms_accepted', 'created_at', 'reviewed_at'
    ]
    list_filter = [
        'application_status', 'experience_level', 'country',
        'terms_accepted', 'created_at', 'reviewed_at'
    ]
    search_fields = [
        'first_name', 'last_name', 'email', 'phone_number',
        'current_company', 'license_number'
    ]
    readonly_fields = [
        'id', 'created_at', 'updated_at', 'reviewed_at'
    ]
    fieldsets = [
        ('Application Information', {
            'fields': ['id', 'application_status', 'created_at', 'updated_at']
        }),
        ('Personal Information', {
            'fields': [
                'first_name', 'last_name', 'email', 'phone_number',
                'country', 'city_address'
            ]
        }),
        ('Professional Credentials', {
            'fields': [
                'license_number', 'experience_level', 'current_company',
                'referral_strategy', 'supporting_documents'
            ]
        }),
        ('Agreements', {
            'fields': ['terms_accepted']
        }),
        ('Review Information', {
            'fields': [
                'reviewed_by', 'reviewed_at', 'rejection_reason',
                'admin_notes', 'associated_user'
            ]
        })
    ]

    def full_name(self, obj):
        """Display applicant's full name."""
        return obj.get_full_name()
    full_name.short_description = 'Name'

    # Custom actions for bulk operations
    actions = ['approve_applications', 'reject_applications', 'mark_under_review']

    def approve_applications(self, request, queryset):
        """Bulk approve applications (manual process - creates user accounts)."""
        from django.utils import timezone
        pending_apps = queryset.filter(application_status='pending')
        if pending_apps.exists():
            # This would normally integrate with the approve_broker_application view
            # For now, just mark as approved for manual processing
            updated = pending_apps.update(
                application_status='approved',
                reviewed_by=request.user,
                reviewed_at=timezone.now()
            )
            self.message_user(
                request,
                f'{updated} applications marked as approved. '
                'Please use the API endpoints to complete user account creation.'
            )
        else:
            self.message_user(request, 'No pending applications selected.')
    approve_applications.short_description = 'Approve selected applications'

    def reject_applications(self, request, queryset):
        """Bulk reject applications."""
        from django.utils import timezone
        pending_apps = queryset.filter(application_status='pending')
        updated = pending_apps.update(
            application_status='rejected',
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
            rejection_reason='Bulk rejection via admin panel'
        )
        self.message_user(request, f'{updated} applications rejected.')
    reject_applications.short_description = 'Reject selected applications'

    def mark_under_review(self, request, queryset):
        """Mark applications as under review."""
        pending_apps = queryset.filter(application_status='pending')
        updated = pending_apps.update(application_status='under_review')
        self.message_user(request, f'{updated} applications marked as under review.')
    mark_under_review.short_description = 'Mark as under review'

    def get_queryset(self, request):
        """Optimize queryset with related objects."""
        return super().get_queryset(request).select_related(
            'reviewed_by', 'associated_user'
        )

