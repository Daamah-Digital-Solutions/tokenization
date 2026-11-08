from rest_framework import serializers

from .models import Transfer


class TransferSerializer(serializers.ModelSerializer):
    direction = serializers.SerializerMethodField()
    property_id = serializers.UUIDField(source='property_ref_id', read_only=True)
    property_title = serializers.CharField(source='property_ref.title', read_only=True, default=None)
    sender_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    plan_id = serializers.UUIDField(read_only=True)
    plan_terms = serializers.SerializerMethodField()

    class Meta:
        model = Transfer
        fields = ['id', 'reference', 'asset', 'status', 'status_display', 'direction', 'sender_name',
                  'recipient_email', 'recipient_name', 'message', 'property_id', 'property_title', 'units',
                  'amount', 'fee_amount', 'deliver_on', 'expires_at', 'delivered_at', 'closed_at',
                  'close_reason', 'chain_status', 'transaction_hash', 'created_at', 'plan_id', 'accepted_at',
                  'plan_terms']

    def get_direction(self, obj):
        return 'sent' if obj.sender_id == self.context['request'].user.pk else 'received'

    def get_plan_terms(self, obj):
        """Installment shares still open: what the recipient takes over if they accept."""
        if obj.asset != 'plan' or obj.status not in ('scheduled', 'waiting'):
            return None
        from .services import plan_terms
        return plan_terms(obj)

    def get_sender_name(self, obj):
        return obj.sender.get_full_name() or obj.sender.email


class TransferCreateSerializer(serializers.Serializer):
    asset = serializers.ChoiceField(choices=['units', 'cash', 'plan'])
    recipient_email = serializers.EmailField()
    recipient_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    message = serializers.CharField(max_length=500, required=False, allow_blank=True)
    deliver_on = serializers.DateField(required=False)
    property_id = serializers.UUIDField(required=False)
    units = serializers.IntegerField(required=False, min_value=1)
    plan_id = serializers.UUIDField(required=False)
    amount = serializers.DecimalField(max_digits=16, decimal_places=2, required=False, min_value=0)
