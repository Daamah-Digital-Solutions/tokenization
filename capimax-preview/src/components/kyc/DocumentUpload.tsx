import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, Check, X, AlertCircle, Eye, RotateCcw, Loader2, Clock, Lock } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import type { KYCDocumentStatus, KYCServerDocument } from '../../services/user/KYCService';
import { baseLanguage } from '../../utils/locale';

/**
 * One KYC document slot. The status shown is the SERVER's status for the
 * stored document (client round 3, item 5): the old card showed an
 * optimistic "Processing" that looked like acceptance even when the upload
 * had failed or the document was later rejected.
 */

/** Legacy shape kept for the components barrel export. */
export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadDate: Date;
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'error';
  rejectionReason?: string;
}

interface DocumentUploadProps {
  title: string;
  description: string;
  requirements?: string[];
  document?: KYCServerDocument;
  uploading?: boolean;
  /** Upload/transport error for this slot (already translated). */
  error?: string | null;
  /** Under review / approved — no changes allowed. */
  locked?: boolean;
  maxFileSizeMb?: number;
  acceptedFormats?: string[];
  onUpload: (file: File) => void;
  onRemove?: () => void;
  className?: string;
}

const DEFAULT_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const STATUS_STYLE: Record<KYCDocumentStatus, string> = {
  pending: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30',
  in_review: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30',
  approved: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30',
  rejected: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30',
  resubmission_required: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30',
  expired: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30',
};

const NEEDS_REPLACEMENT: KYCDocumentStatus[] = ['rejected', 'resubmission_required', 'expired'];

const isImageName = (name?: string) => !!name && /\.(jpe?g|png|webp|gif)$/i.test(name);

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  title,
  description,
  requirements = [],
  document,
  uploading = false,
  error,
  locked = false,
  maxFileSizeMb = 10,
  acceptedFormats = DEFAULT_FORMATS,
  onUpload,
  onRemove,
  className,
}) => {
  const { t, i18n } = useTranslation('kyc');
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatsLabel = acceptedFormats
    .map((f) => (f === 'application/pdf' ? 'PDF' : f.split('/')[1].toUpperCase()))
    .join(', ');

  const handleFile = useCallback(
    (file: File) => {
      setLocalError(null);
      if (!acceptedFormats.includes(file.type)) {
        setLocalError(t('upload.invalidType', { formats: formatsLabel }));
        return;
      }
      if (file.size > maxFileSizeMb * 1024 * 1024) {
        setLocalError(t('upload.tooLarge', { size: maxFileSizeMb }));
        return;
      }
      setLocalPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      });
      onUpload(file);
    },
    [acceptedFormats, formatsLabel, maxFileSizeMb, onUpload, t],
  );

  const openPicker = () => {
    if (!locked && !uploading) inputRef.current?.click();
  };

  const shownError = localError || error;
  const needsReplacement = document && NEEDS_REPLACEMENT.includes(document.status);
  const canChange = !locked && !uploading && document?.status !== 'approved';
  const previewSrc = localPreview || (document && isImageName(document.file_name) ? document.file_url : null);
  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleDateString(baseLanguage(i18n.language), {
      year: 'numeric', month: 'short', day: 'numeric',
    });

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400">
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{description}</p>
        </div>
      </div>

      {requirements.length > 0 && !document && (
        <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
          {requirements.map((r) => (
            <li key={r} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Check className="w-3 h-3 text-emerald-500 shrink-0" />
              {r}
            </li>
          ))}
        </ul>
      )}

      {shownError && (
        <div role="alert" className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>{t('upload.errorTitle')}</strong> {shownError}
          </p>
        </div>
      )}

      {document || uploading ? (
        <div
          className={cn(
            'border-2 rounded-xl p-4',
            needsReplacement ? 'border-red-200 dark:border-red-900' : 'border-slate-200 dark:border-slate-700',
          )}
        >
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              {previewSrc ? (
                <img src={previewSrc} alt={title} className="w-full h-full object-cover" />
              ) : (
                <FileText className="w-7 h-7 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-sm text-slate-900 dark:text-white truncate max-w-[14rem]">
                  {document?.file_name || '—'}
                </p>
                {uploading ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-slate-700 bg-slate-100 dark:text-slate-200 dark:bg-slate-800">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t('docStatus.uploading')}
                  </span>
                ) : document ? (
                  <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', STATUS_STYLE[document.status])}>
                    {document.status === 'approved' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : needsReplacement ? (
                      <X className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    {t(`docStatus.${document.status}`)}
                  </span>
                ) : null}
              </div>
              {document && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('upload.uploadedOn', { date: dateFmt(document.created_at) })}
                </p>
              )}

              {needsReplacement && document?.rejection_reason && (
                <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    <strong>{t('upload.rejectedReason')}</strong> {document.rejection_reason}
                  </p>
                </div>
              )}

              {!uploading && document && (
                <div className="flex flex-wrap items-center gap-1 mt-2">
                  {document.file_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(document.file_url as string, '_blank', 'noopener')}
                      className="text-emerald-700 dark:text-emerald-400"
                    >
                      <Eye className="w-4 h-4 me-1" />
                      {t('upload.view')}
                    </Button>
                  )}
                  {canChange && (
                    <Button variant="ghost" size="sm" onClick={openPicker} className="text-blue-700 dark:text-blue-400">
                      <RotateCcw className="w-4 h-4 me-1" />
                      {t('upload.replace')}
                    </Button>
                  )}
                  {canChange && onRemove && (
                    <Button variant="ghost" size="sm" onClick={onRemove} className="text-red-600 dark:text-red-400">
                      <X className="w-4 h-4 me-1" />
                      {t('upload.remove')}
                    </Button>
                  )}
                  {locked && document.status !== 'approved' && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Lock className="w-3.5 h-3.5" />
                      {t('upload.locked')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openPicker()}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          className={cn(
            'border-2 border-dashed rounded-xl p-6 text-center transition-colors',
            locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
            isDragOver
              ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
              : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10',
          )}
        >
          <div className="w-12 h-12 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
            <Upload className={cn('w-6 h-6', isDragOver ? 'text-emerald-500' : 'text-slate-400')} />
          </div>
          <p className="mt-3 font-medium text-slate-900 dark:text-white">
            {isDragOver ? t('upload.dropHere') : t('upload.dropTitle')}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('upload.dropHint')}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            {t('upload.formats', { size: maxFileSizeMb, formats: formatsLabel })}
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) handleFile(file);
        }}
      />
    </div>
  );
};

export default DocumentUpload;
