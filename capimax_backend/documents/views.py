from rest_framework import generics, permissions
from rest_framework.response import Response
from core.utils import create_success_response, create_error_response
from .models import Document
from .serializers import DocumentSerializer, DocumentAdminSerializer


class DocumentListView(generics.ListAPIView):
    """Public endpoint to list all documents."""
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(create_success_response(
            data=serializer.data,
            message="Documents retrieved successfully"
        ))


class DocumentAdminView(generics.ListCreateAPIView):
    """Admin endpoint to list and create documents."""
    queryset = Document.objects.all()
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DocumentAdminSerializer
        return DocumentSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(create_success_response(
            data=serializer.data,
            message="Documents retrieved successfully"
        ))

    def create(self, request, *args, **kwargs):
        serializer = DocumentAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(uploaded_by=request.user)
        return Response(
            create_success_response(
                data=serializer.data,
                message="Document created successfully",
                status_code=201
            ),
            status=201
        )


class DocumentAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin endpoint to update or delete a document."""
    queryset = Document.objects.all()
    serializer_class = DocumentAdminSerializer
    permission_classes = [permissions.IsAdminUser]

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(create_success_response(
            data=serializer.data,
            message="Document updated successfully"
        ))

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(create_success_response(
            message="Document deleted successfully"
        ))
