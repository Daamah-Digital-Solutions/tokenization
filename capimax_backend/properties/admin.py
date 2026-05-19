"""
Django admin configuration for Properties app.
"""

from django.contrib import admin
from django.utils import timezone

from .models import (
    Property, PropertyImage, PropertyDocument, PropertyUpdate,
    PropertySubscription, PropertyReview, PropertyValuation,
    PropertyAnalytics, PropertyViewLog, PropertyApproval,
    PropertyMarketData
)


class PropertyImageInline(admin.TabularInline):
    """Inline admin for property images."""
    model = PropertyImage
    extra = 1
    fields = ['image', 'caption', 'is_primary', 'order']


class PropertyDocumentInline(admin.TabularInline):
    """Inline admin for property documents."""
    model = PropertyDocument
    extra = 0
    fields = ['name', 'document', 'document_type', 'description']
    readonly_fields = ['size']


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    """Admin interface for Property model."""
    
    list_display = [
        'title', 'property_type', 'status', 'city', 'country',
        'total_value', 'token_price', 'tokens_sold', 'funding_percentage',
        'featured', 'created_at'
    ]
    
    list_filter = [
        'property_type', 'status', 'featured', 'country', 'created_at'
    ]
    
    search_fields = ['title', 'description', 'city', 'address', 'owner__email']
    
    readonly_fields = [
        'id', 'tokens_available', 'funding_percentage', 'is_fully_funded',
        'can_accept_investments', 'created_at', 'updated_at'
    ]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'property_type', 'status', 'owner')
        }),
        ('Financial Details', {
            'fields': (
                'total_value', 'token_price', 'total_tokens', 'tokens_sold',
                'expected_return', 'rental_yield', 'minimum_investment'
            )
        }),
        ('Property Details', {
            'fields': (
                'property_size', 'year_built', 'address', 'city', 'state', 'country',
                'latitude', 'longitude'
            )
        }),
        ('Platform Settings', {
            'fields': ('featured', 'smart_contract_address')
        }),
        ('SPV (Special Purpose Vehicle)', {
            'fields': (
                'spv_company_name', 'spv_registration_number',
                'spv_bank_account_number', 'spv_bank_name',
                'spv_establishment_date'
            ),
            'description': 'Legal entity details for this property. Fill after SPV is legally established.',
        }),
        ('Computed Fields', {
            'fields': (
                'tokens_available', 'funding_percentage', 'is_fully_funded',
                'can_accept_investments'
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [PropertyImageInline, PropertyDocumentInline]


@admin.register(PropertyAnalytics)
class PropertyAnalyticsAdmin(admin.ModelAdmin):
    """Admin interface for PropertyAnalytics model."""
    
    list_display = [
        'property', 'total_views', 'unique_views', 'total_subscriptions',
        'conversion_rate', 'last_updated'
    ]
    readonly_fields = ['last_updated', 'created_at']
    search_fields = ['property__title']


@admin.register(PropertyApproval)
class PropertyApprovalAdmin(admin.ModelAdmin):
    """Admin interface for PropertyApproval model."""

    list_display = [
        'property', 'status', 'reviewer', 'submitted_at', 'reviewed_at', 'approved_at'
    ]
    list_filter = ['status', 'submitted_at', 'reviewed_at']
    search_fields = ['property__title', 'reviewer__email']
    readonly_fields = ['submitted_at', 'reviewed_at', 'approved_at']
    autocomplete_fields = ['property', 'reviewer']

    actions = ['approve_selected', 'reject_selected', 'mark_under_review']

    @admin.action(description="Approve selected properties")
    def approve_selected(self, request, queryset):
        # Walk one-by-one so PropertyApproval.save() can set reviewed_at /
        # approved_at and flip the underlying Property.status as needed.
        approved = 0
        for approval in queryset.exclude(status='approved'):
            approval.status = 'approved'
            approval.reviewer = request.user
            approval.save()
            approved += 1
        self.message_user(request, f"{approved} property approval(s) marked approved.")

    @admin.action(description="Reject selected properties")
    def reject_selected(self, request, queryset):
        rejected = 0
        for approval in queryset.exclude(status='rejected'):
            approval.status = 'rejected'
            approval.reviewer = request.user
            approval.save()
            rejected += 1
        self.message_user(request, f"{rejected} property approval(s) marked rejected.")

    @admin.action(description="Mark selected as under review")
    def mark_under_review(self, request, queryset):
        updated = queryset.filter(status__in=['submitted', 'pending']).update(
            status='under_review',
            reviewer=request.user,
            reviewed_at=timezone.now(),
        )
        self.message_user(request, f"{updated} property approval(s) marked under review.")


@admin.register(PropertyValuation)
class PropertyValuationAdmin(admin.ModelAdmin):
    list_display = ['property', 'current_value', 'valuation_date', 'appraiser']
    list_filter = ['valuation_date']
    search_fields = ['property__title', 'appraiser']
    autocomplete_fields = ['property']


@admin.register(PropertyReview)
class PropertyReviewAdmin(admin.ModelAdmin):
    list_display = ['property', 'user', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['property__title', 'user__email']
    autocomplete_fields = ['property', 'user']
    readonly_fields = ['created_at']


@admin.register(PropertyUpdate)
class PropertyUpdateAdmin(admin.ModelAdmin):
    list_display = ['property', 'title', 'update_type', 'created_at']
    list_filter = ['update_type', 'created_at']
    search_fields = ['property__title', 'title', 'content']
    autocomplete_fields = ['property']
    readonly_fields = ['created_at']


@admin.register(PropertyImage)
class PropertyImageAdmin(admin.ModelAdmin):
    list_display = ['property', 'caption', 'is_primary', 'order']
    list_filter = ['is_primary']
    search_fields = ['property__title', 'caption']
    autocomplete_fields = ['property']


@admin.register(PropertyDocument)
class PropertyDocumentAdmin(admin.ModelAdmin):
    list_display = ['property', 'name', 'document_type']
    list_filter = ['document_type']
    search_fields = ['property__title', 'name']
    autocomplete_fields = ['property']


@admin.register(PropertySubscription)
class PropertySubscriptionAdmin(admin.ModelAdmin):
    list_display = ['property', 'user', 'subscribed_at']
    list_filter = ['subscribed_at']
    search_fields = ['property__title', 'user__email']
    autocomplete_fields = ['property', 'user']
    readonly_fields = ['subscribed_at']
