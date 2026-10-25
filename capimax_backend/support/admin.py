from django.contrib import admin
from django.utils import timezone

from . import notify
from .models import ContactMessage, SupportTicket, SupportTicketMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ['reference', 'created_at', 'name', 'email', 'topic', 'subject', 'status']
    list_filter = ['status', 'topic', 'language', 'created_at']
    search_fields = ['reference', 'name', 'email', 'subject', 'message']
    readonly_fields = ['reference', 'user', 'name', 'email', 'phone', 'topic', 'subject', 'message',
                       'language', 'ip_address', 'created_at', 'updated_at']
    fields = ['reference', 'status', 'staff_notes', 'name', 'email', 'phone', 'user', 'topic', 'subject',
              'message', 'language', 'ip_address', 'created_at', 'updated_at']
    actions = ['mark_answered']

    @admin.action(description='Mark selected as answered')
    def mark_answered(self, request, queryset):
        queryset.update(status=ContactMessage.Status.ANSWERED, updated_at=timezone.now())


class ReplyInline(admin.StackedInline):
    model = SupportTicketMessage
    extra = 1
    fields = ['body', 'is_staff', 'author', 'created_at']
    readonly_fields = ['is_staff', 'author', 'created_at']
    verbose_name_plural = 'Conversation (add a reply to answer the user — they get an email)'


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ['reference', 'updated_at', 'user', 'subject', 'category', 'priority', 'status']
    list_filter = ['status', 'priority', 'category']
    search_fields = ['reference', 'subject', 'details', 'user__email']
    readonly_fields = ['reference', 'user', 'subject', 'category', 'details', 'created_at', 'updated_at']
    fields = ['reference', 'status', 'priority', 'user', 'subject', 'category', 'details',
              'created_at', 'updated_at']
    inlines = [ReplyInline]

    def save_formset(self, request, form, formset, change):
        replies = formset.save(commit=False)
        ticket = form.instance
        for reply in replies:
            if reply._state.adding:
                reply.author = request.user
                reply.is_staff = True
                reply.save()
                notify.staff_replied(ticket, reply.body)
                # Now waiting on the user, unless the admin resolved it in the same save.
                if ticket.status != SupportTicket.Status.RESOLVED:
                    ticket.status = SupportTicket.Status.PENDING
                    ticket.save(update_fields=['status', 'updated_at'])
            else:
                reply.save()
        for obj in formset.deleted_objects:
            obj.delete()
        formset.save_m2m()
