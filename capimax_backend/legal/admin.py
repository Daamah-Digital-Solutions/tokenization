"""Django admin registration for legal models."""

from django.contrib import admin

from .models import (
    CapTableEntry,
    DistributionAllocation,
    LegalEntity,
    SubscriptionAgreement,
)


@admin.register(LegalEntity)
class LegalEntityAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'entity_type', 'jurisdiction', 'registration_number',
        'status', 'formation_date',
    )
    list_filter = ('status', 'entity_type', 'jurisdiction', 'requires_accredited_investors')
    search_fields = ('name', 'registration_number')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(SubscriptionAgreement)
class SubscriptionAgreementAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'legal_entity', 'investment',
        'status', 'investor_signed_at', 'company_signed_at',
    )
    list_filter = ('status', 'legal_entity')
    search_fields = ('id', 'investor_typed_name', 'signature_hash')
    readonly_fields = (
        'id', 'signature_hash', 'investor_signed_at', 'investor_signed_ip',
        'investor_signed_user_agent', 'company_signed_at', 'created_at',
        'updated_at',
    )


@admin.register(CapTableEntry)
class CapTableEntryAdmin(admin.ModelAdmin):
    list_display = (
        'timestamp', 'legal_entity', 'holder',
        'event_type', 'tokens_delta', 'tokens_balance_after',
    )
    list_filter = ('event_type', 'legal_entity', 'timestamp')
    search_fields = ('holder__email', 'blockchain_tx_hash')
    readonly_fields = [f.name for f in CapTableEntry._meta.fields]

    def has_change_permission(self, request, obj=None):
        # Append-only — never editable via admin.
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(DistributionAllocation)
class DistributionAllocationAdmin(admin.ModelAdmin):
    list_display = (
        'distribution', 'holder', 'shares_at_snapshot',
        'allocated_amount', 'currency', 'paid_at',
    )
    list_filter = ('currency', 'paid_at')
    search_fields = ('holder__email', 'payment_tx_hash')
    readonly_fields = ('id', 'created_at')
