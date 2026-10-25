import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PropertyService } from '../../services';

interface PropertyDocumentUploadProps {
  propertyId: string;
  onUploadComplete?: () => void;
}

interface DocumentFile {
  file: File;
  name: string;
  document_type: string;
  description: string;
  uploading: boolean;
  progress: number;
  error?: string;
}

// Labels are resolved at render time from `ownerui:documentUpload.types.<value>`.
const DOCUMENT_TYPES = [
  { value: 'title_deed', icon: '📜' },
  { value: 'valuation_report', icon: '📊' },
  { value: 'legal_certificate', icon: '⚖️' },
  { value: 'construction_permit', icon: '🏗️' },
  { value: 'insurance', icon: '🛡️' },
  { value: 'tax_certificate', icon: '💰' },
  { value: 'floor_plan', icon: '📐' },
  { value: 'other', icon: '📄' },
];

export const PropertyDocumentUpload: React.FC<PropertyDocumentUploadProps> = ({
  propertyId,
  onUploadComplete,
}) => {
  const { t } = useTranslation('ownerui');
  const queryClient = useQueryClient();
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async ({ document, formData }: { document: DocumentFile; formData: FormData }) => {
      return PropertyService.uploadPropertyDocument(propertyId, formData);
    },
    onSuccess: (_, { document }) => {
      setDocuments(prev => prev.filter(doc => doc.file !== document.file));
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      onUploadComplete?.();
    },
    onError: (error: any, { document }) => {
      setDocuments(prev =>
        prev.map(doc =>
          doc.file === document.file
            ? { ...doc, uploading: false, error: error.message || t('documentUpload.uploadFailed') }
            : doc
        )
      );
    },
  });

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newDocuments: DocumentFile[] = [];
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];

    Array.from(files).forEach(file => {
      if (!allowedTypes.includes(file.type)) {
        alert(t('documentUpload.invalidFormat', { name: file.name }));
        return;
      }

      if (file.size > maxSize) {
        alert(t('documentUpload.tooLarge', { name: file.name }));
        return;
      }

      newDocuments.push({
        file,
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        document_type: 'other',
        description: '',
        uploading: false,
        progress: 0,
      });
    });

    setDocuments(prev => [...prev, ...newDocuments]);
  }, [t]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  }, [handleFileSelect]);

  const updateDocument = (index: number, updates: Partial<DocumentFile>) => {
    setDocuments(prev =>
      prev.map((doc, i) => (i === index ? { ...doc, ...updates } : doc))
    );
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocument = async (document: DocumentFile, index: number) => {
    if (!document.name.trim()) {
      updateDocument(index, { error: t('documentUpload.nameRequired') });
      return;
    }

    if (!document.document_type) {
      updateDocument(index, { error: t('documentUpload.typeRequired') });
      return;
    }

    const formData = new FormData();
    formData.append('document', document.file);
    formData.append('name', document.name);
    formData.append('document_type', document.document_type);
    formData.append('description', document.description);

    updateDocument(index, { uploading: true, progress: 0, error: undefined });

    try {
      await uploadMutation.mutateAsync({ document, formData });
    } catch (error) {
      // Error handling is done in mutation
    }
  };

  const uploadAllDocuments = async () => {
    const documentsToUpload = documents.filter(doc => !doc.uploading && !doc.error);

    for (let i = 0; i < documentsToUpload.length; i++) {
      await uploadDocument(documentsToUpload[i], i);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return '📕';
      case 'doc':
      case 'docx':
        return '📘';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return '🖼️';
      default:
        return '📄';
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all
          ${isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-neutral-300 dark:border-slate-600 hover:border-primary-400 dark:hover:border-primary-500'
          }
        `}
      >
        <input
          type="file"
          id="document-upload"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <label
          htmlFor="document-upload"
          className="cursor-pointer"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-neutral-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-neutral-900 dark:text-slate-100">
                {t('documentUpload.dropzone')}
              </p>
              <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">
                {t('documentUpload.supports')}
              </p>
            </div>
          </div>
        </label>
      </div>

      {/* Document List */}
      {documents.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
              {t('documentUpload.selected', { count: documents.length })}
            </h3>
            <button
              onClick={uploadAllDocuments}
              disabled={documents.some(doc => doc.uploading) || documents.length === 0}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-neutral-400 disabled:cursor-not-allowed transition-colors"
            >
              {t('documentUpload.uploadAll')}
            </button>
          </div>

          <div className="space-y-3">
            {documents.map((document, index) => (
              <div
                key={index}
                className="bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-lg p-4"
              >
                <div className="flex items-start gap-4">
                  {/* File Icon */}
                  <div className="flex-shrink-0 w-12 h-12 bg-neutral-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-2xl">
                    {getFileIcon(document.file.name)}
                  </div>

                  {/* Document Details */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-neutral-900 dark:text-slate-100">
                          {document.file.name}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-slate-400">
                          {formatFileSize(document.file.size)}
                        </p>
                      </div>

                      {/* Remove Button */}
                      {!document.uploading && (
                        <button
                          onClick={() => removeDocument(index)}
                          aria-label={t('documentUpload.remove')}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-slate-300 mb-1">
                          {t('documentUpload.name')} *
                        </label>
                        <input
                          type="text"
                          value={document.name}
                          onChange={(e) => updateDocument(index, { name: e.target.value })}
                          disabled={document.uploading}
                          placeholder={t('documentUpload.namePlaceholder')}
                          className="w-full px-3 py-1.5 text-sm border border-neutral-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100 disabled:bg-neutral-100 dark:disabled:bg-slate-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-slate-300 mb-1">
                          {t('documentUpload.type')} *
                        </label>
                        <select
                          value={document.document_type}
                          onChange={(e) => updateDocument(index, { document_type: e.target.value })}
                          disabled={document.uploading}
                          className="w-full px-3 py-1.5 text-sm border border-neutral-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100 disabled:bg-neutral-100 dark:disabled:bg-slate-600"
                        >
                          {DOCUMENT_TYPES.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.icon} {t(`documentUpload.types.${type.value}`)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        {t('documentUpload.description')}
                      </label>
                      <textarea
                        value={document.description}
                        onChange={(e) => updateDocument(index, { description: e.target.value })}
                        disabled={document.uploading}
                        rows={2}
                        placeholder={t('documentUpload.descriptionPlaceholder')}
                        className="w-full px-3 py-1.5 text-sm border border-neutral-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100 disabled:bg-neutral-100 dark:disabled:bg-slate-600"
                      />
                    </div>

                    {/* Upload Progress */}
                    {document.uploading && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-neutral-600 dark:text-slate-400">{t('approvalStatus.modal.uploading')}</span>
                          <span className="text-neutral-600 dark:text-slate-400">{document.progress}%</span>
                        </div>
                        <div className="h-2 bg-neutral-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-600 transition-all duration-300"
                            style={{ width: `${document.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {document.error && (
                      <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {document.error}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    {!document.uploading && !document.error && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => uploadDocument(document, index)}
                          className="px-4 py-1.5 text-sm font-medium bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                        >
                          {t('approvalStatus.uploadDocument')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">📂 {t('documentUpload.tips.title')}</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• <strong>{t('documentUpload.tips.requiredLabel')}</strong> {t('documentUpload.tips.required')}</li>
          <li>• <strong>{t('documentUpload.tips.recommendedLabel')}</strong> {t('documentUpload.tips.recommended')}</li>
          <li>• {t('documentUpload.tips.clear')}</li>
          <li>• {t('documentUpload.tips.reviewed')}</li>
          <li>• {t('documentUpload.tips.redacted')}</li>
        </ul>
      </div>
    </div>
  );
};

export default PropertyDocumentUpload;
