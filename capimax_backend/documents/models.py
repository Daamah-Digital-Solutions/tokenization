import re
import uuid
from django.db import models
from django.conf import settings


class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    download_link = models.URLField(max_length=500)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_center_documents'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        db_table = 'documents_document'

    def save(self, *args, **kwargs):
        self.download_link = self._convert_drive_link(self.download_link)
        super().save(*args, **kwargs)

    @staticmethod
    def _convert_drive_link(url):
        """Convert Google Drive share links to direct download links."""
        match = re.match(r'https?://drive\.google\.com/file/d/([^/]+)', url)
        if match:
            file_id = match.group(1)
            return f'https://drive.usercontent.google.com/download?id={file_id}&export=download'
        return url

    def __str__(self):
        return self.title
