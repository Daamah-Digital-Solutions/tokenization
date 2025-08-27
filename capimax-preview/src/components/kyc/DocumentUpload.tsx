import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Check, 
  X, 
  AlertCircle, 
  Camera, 
  Scan,
  FileImage,
  Eye,
  RotateCcw,
  Download
} from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface DocumentUploadProps {
  documentType: 'passport' | 'id' | 'utility_bill' | 'bank_statement' | 'selfie';
  title: string;
  description: string;
  requirements: string[];
  maxFileSize?: number; // in MB
  acceptedFormats?: string[];
  onUpload?: (file: File) => void;
  onRemove?: () => void;
  loading?: boolean;
  error?: string;
  uploadedFile?: UploadedFile;
  className?: string;
}

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadDate: Date;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  rejectionReason?: string;
}

const DOCUMENT_ICONS = {
  passport: FileText,
  id: FileText,
  utility_bill: FileText,
  bank_statement: FileText,
  selfie: Camera
};

const DOCUMENT_COLORS = {
  passport: 'text-blue-500 dark:text-blue-400',
  id: 'text-green-500 dark:text-green-400',
  utility_bill: 'text-orange-500 dark:text-orange-400',
  bank_statement: 'text-purple-500 dark:text-purple-400',
  selfie: 'text-pink-500 dark:text-pink-400'
};

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  documentType,
  title,
  description,
  requirements,
  maxFileSize = 10,
  acceptedFormats = ['image/jpeg', 'image/png', 'application/pdf'],
  onUpload,
  onRemove,
  loading = false,
  error,
  uploadedFile,
  className
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const Icon = DOCUMENT_ICONS[documentType];
  const iconColor = DOCUMENT_COLORS[documentType];

  const validateFile = (file: File): string | null => {
    if (!acceptedFormats.includes(file.type)) {
      return `Please upload a file in one of these formats: ${acceptedFormats.join(', ')}`;
    }
    
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size must be less than ${maxFileSize}MB`;
    }
    
    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      console.error(validationError);
      return;
    }

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    onUpload?.(file);
  }, [maxFileSize, acceptedFormats, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleRemove = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onRemove?.();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending':
        return 'text-amber-500 bg-amber-100 dark:bg-amber-900/20';
      case 'processing':
        return 'text-blue-500 bg-blue-100 dark:bg-blue-900/20';
      case 'approved':
        return 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/20';
      case 'rejected':
        return 'text-red-500 bg-red-100 dark:bg-red-900/20';
      default:
        return 'text-slate-500 bg-slate-100 dark:bg-slate-800';
    }
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending':
        return <Upload className="w-4 h-4" />;
      case 'processing':
        return <Scan className="w-4 h-4" />;
      case 'approved':
        return <Check className="w-4 h-4" />;
      case 'rejected':
        return <X className="w-4 h-4" />;
      default:
        return <Upload className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('space-y-4', className)}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={cn('p-3 rounded-xl bg-slate-100 dark:bg-slate-800', iconColor)}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {description}
          </p>
        </div>
      </div>

      {/* Requirements */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
        <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2">
          Document Requirements:
        </h4>
        <ul className="space-y-1">
          {requirements.map((requirement, index) => (
            <li key={index} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Check className="w-3 h-3 text-emerald-500" />
              {requirement}
            </li>
          ))}
        </ul>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
        >
          <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
          <span className="text-sm text-red-600 dark:text-red-400">
            {error}
          </span>
        </motion.div>
      )}

      {/* Upload Area or File Display */}
      <AnimatePresence mode="wait">
        {uploadedFile ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-2 border-slate-200 dark:border-slate-700 rounded-xl p-6"
          >
            <div className="flex items-start gap-4">
              {/* File Icon/Preview */}
              <div className="flex-shrink-0">
                {previewUrl || uploadedFile.url ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img 
                      src={previewUrl || uploadedFile.url} 
                      alt="Document preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                    <FileImage className="w-8 h-8 text-slate-400" />
                  </div>
                )}
              </div>

              {/* File Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="font-medium text-slate-900 dark:text-white truncate">
                      {uploadedFile.name}
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatFileSize(uploadedFile.size)} • {uploadedFile.type}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Uploaded on {uploadedFile.uploadDate.toLocaleDateString()}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5',
                    getStatusColor(uploadedFile.status)
                  )}>
                    {getStatusIcon(uploadedFile.status)}
                    {uploadedFile.status.charAt(0).toUpperCase() + uploadedFile.status.slice(1)}
                  </div>
                </div>

                {/* Rejection Reason */}
                {uploadedFile.status === 'rejected' && uploadedFile.rejectionReason && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      <strong>Rejection Reason:</strong> {uploadedFile.rejectionReason}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4">
                  {uploadedFile.url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(uploadedFile.url, '_blank')}
                      className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  )}
                  
                  {uploadedFile.status === 'rejected' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reupload
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemove}
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer',
              isDragOver
                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10'
            )}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                <Upload className={cn(
                  'w-8 h-8 transition-colors',
                  isDragOver ? 'text-emerald-500' : 'text-slate-400'
                )} />
              </div>
              
              <div>
                <h4 className="text-lg font-medium text-slate-900 dark:text-white">
                  {isDragOver ? 'Drop your file here' : 'Upload Document'}
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Drag and drop your file here, or click to browse
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  Max file size: {maxFileSize}MB • Supported: {acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}
                </p>
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">Uploading...</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />
    </motion.div>
  );
};