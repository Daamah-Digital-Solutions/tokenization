from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
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


class StatementView(APIView):
    """
    GET /api/v1/documents/statements/<kind>/?from=YYYY-MM-DD&to=YYYY-MM-DD

    The data for the official PDF statements (client round 3, #16):
    wallet, transactions, investments, holdings (owned properties).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, kind):
        from .statements import KINDS, build_statement

        if kind not in KINDS:
            return Response(create_error_response('Unknown statement type.', status_code=404), status=404)
        data = build_statement(request.user, kind, request.query_params.get('from'),
                               request.query_params.get('to'))
        return Response(create_success_response(data=data))


class TransactionsCsvView(APIView):
    """GET /api/v1/documents/statements/transactions/export/ — the same rows as CSV."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        import csv
        from django.http import HttpResponse
        from .statements import build_statement

        data = build_statement(request.user, 'transactions', request.query_params.get('from'),
                               request.query_params.get('to'))
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="capimax-rt-transactions.csv"'
        response.write('﻿')  # Excel opens UTF-8 (Arabic names) correctly
        writer = csv.writer(response)
        writer.writerow(['Date', 'Type', 'Description', 'Method', 'Amount (USD)', 'Status', 'Reference'])
        for r in data['rows']:
            writer.writerow([r['date'], r['type'], r['description'], r['method'], r['amount'],
                             r['status'], r['reference']])
        return response
