from django.contrib import admin
from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'download_link', 'uploaded_by', 'created_at')
    search_fields = ('title',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    list_filter = ('created_at',)

    def save_model(self, request, obj, form, change):
        if not change:
            obj.uploaded_by = request.user
        super().save_model(request, obj, form, change)
