from rest_framework import serializers
from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    """Public read serializer for documents."""

    class Meta:
        model = Document
        fields = ['id', 'title', 'download_link', 'created_at']
        read_only_fields = fields


class DocumentAdminSerializer(serializers.ModelSerializer):
    """Admin serializer for creating/updating documents."""

    class Meta:
        model = Document
        fields = ['id', 'title', 'download_link', 'uploaded_by', 'created_at', 'updated_at']
        read_only_fields = ['id', 'uploaded_by', 'created_at', 'updated_at']
