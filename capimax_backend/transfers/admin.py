from django.contrib import admin, messages

from .models import OPEN, Transfer


@admin.register(Transfer)
class TransferAdmin(admin.ModelAdmin):
    """Transfers between users. Read-only, except the on-chain status (set back to "pending" to retry)."""

    list_display = ['reference', 'asset', 'status', 'sender', 'recipient_email', 'units', 'amount',
                    'deliver_on', 'chain_status', 'created_at']
    list_filter = ['status', 'asset', 'chain_status']
    search_fields = ['reference', 'sender__email', 'recipient_email', 'transaction_hash']
    readonly_fields = [f.name for f in Transfer._meta.fields if f.name != 'chain_status']
    actions = ['cancel_selected']

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.action(description='Cancel (return to the sender)')
    def cancel_selected(self, request, queryset):
        from django.db import transaction

        from .services import _close
        n = 0
        for t in queryset.filter(status__in=OPEN):
            with transaction.atomic():
                _close(Transfer.objects.select_for_update().get(pk=t.pk), 'cancelled',
                       f'Cancelled by Capimax RT support ({request.user.email})')
            n += 1
        self.message_user(request, f'{n} transfer(s) cancelled and returned.', messages.SUCCESS)
