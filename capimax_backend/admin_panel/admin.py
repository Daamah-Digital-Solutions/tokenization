from django.contrib import admin

from .models import AdminAction


@admin.register(AdminAction)
class AdminActionAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'actor', 'action', 'target_content_type',
                    'target_object_id', 'reason')
    list_filter = ('action', 'target_content_type', 'timestamp')
    search_fields = ('actor__email', 'reason', 'request_id', 'target_object_id')
    readonly_fields = [f.name for f in AdminAction._meta.fields]

    def has_add_permission(self, request):
        # Only created programmatically via log_admin_action()
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
