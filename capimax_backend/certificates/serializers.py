from rest_framework import serializers

from .models import Certificate

PUBLIC_FIELDS = (
    'certificate_id', 'status', 'issue_date', 'subscription_date', 'finalized_at',
    'investor_name', 'investor_id_masked',
    'spv_name', 'spv_registration_ref', 'spv_jurisdiction', 'spv_registry_url',
    'property_name', 'property_location',
    'units', 'total_units', 'unit_price', 'investment_amount', 'ownership_percentage', 'acquisition',
    'holder_wallet', 'contract_address', 'token_standard', 'token_id', 'network_name', 'chain_id',
    'contract_explorer_url', 'mint_tx_hash', 'mint_tx_url',
    'authorized_signatory', 'digital_signature_hash', 'verification_code', 'verification_url',
    'revoked_at', 'revocation_reason', 'replaced_by_certificate_id',
)


class CertificatePublicSerializer(serializers.ModelSerializer):
    """What anyone holding the QR / code may see — no email, no account ids, no internal keys."""

    verification_url = serializers.CharField(read_only=True)
    spv_registry_url = serializers.SerializerMethodField()
    replaced_by_certificate_id = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = PUBLIC_FIELDS

    def get_spv_registry_url(self, obj):
        from properties.spv import WYOMING, WYOMING_BUSINESS_SEARCH
        if not obj.spv_name:
            return None
        return WYOMING_BUSINESS_SEARCH if (not obj.spv_jurisdiction or WYOMING.search(obj.spv_jurisdiction)) else None

    def get_replaced_by_certificate_id(self, obj):
        return obj.replaced_by.certificate_id if obj.replaced_by_id else None


class CertificateSerializer(CertificatePublicSerializer):
    """The holder's own view."""

    property_id = serializers.UUIDField(source='property_ref_id', read_only=True)
    investment_id = serializers.UUIDField(read_only=True)
    installment_plan_id = serializers.UUIDField(read_only=True)

    class Meta(CertificatePublicSerializer.Meta):
        fields = ('id', 'property_id', 'investment_id', 'installment_plan_id', *PUBLIC_FIELDS)
