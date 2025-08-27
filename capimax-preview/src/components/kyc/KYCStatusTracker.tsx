import React from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Check, 
  X, 
  AlertTriangle, 
  FileText, 
  Camera, 
  MapPin,
  Shield,
  RefreshCw,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface KYCStatusTrackerProps {
  status: 'not_started' | 'pending' | 'processing' | 'approved' | 'rejected' | 'expired';
  documents?: DocumentStatus[];
  submittedAt?: Date;
  reviewedAt?: Date;
  rejectionReason?: string;
  nextSteps?: string[];
  onRetry?: () => void;
  onContact?: () => void;
  className?: string;
}

export interface DocumentStatus {
  type: 'passport' | 'national_id' | 'utility_bill' | 'bank_statement' | 'selfie';
  name: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  rejectionReason?: string;
  uploadedAt: Date;
}

const STATUS_CONFIG = {
  not_started: {
    title: 'Verification Not Started',
    description: 'Complete your identity verification to access all platform features',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    icon: Shield
  },
  pending: {
    title: 'Documents Uploaded',
    description: 'Your documents have been submitted and are awaiting review',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    icon: Clock
  },
  processing: {
    title: 'Under Review',
    description: 'Our team is currently reviewing your submitted documents',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/20',
    icon: RefreshCw
  },
  approved: {
    title: 'Verification Approved',
    description: 'Your identity has been successfully verified. You now have full access to the platform.',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
    icon: Check
  },
  rejected: {
    title: 'Verification Rejected',
    description: 'Your submission requires attention. Please review the feedback and resubmit.',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    icon: X
  },
  expired: {
    title: 'Verification Expired',
    description: 'Your verification has expired. Please restart the verification process.',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    icon: AlertTriangle
  }
};

const DOCUMENT_TYPES = {
  passport: { name: 'Passport', icon: FileText },
  national_id: { name: 'National ID', icon: FileText },
  utility_bill: { name: 'Utility Bill', icon: MapPin },
  bank_statement: { name: 'Bank Statement', icon: FileText },
  selfie: { name: 'Live Selfie', icon: Camera }
};

export const KYCStatusTracker: React.FC<KYCStatusTrackerProps> = ({
  status,
  documents = [],
  submittedAt,
  reviewedAt,
  rejectionReason,
  nextSteps = [],
  onRetry,
  onContact,
  className
}) => {
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  const getDocumentStatusIcon = (docStatus: DocumentStatus['status']) => {
    switch (docStatus) {
      case 'approved':
        return <Check className="w-4 h-4 text-emerald-500" />;
      case 'rejected':
        return <X className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getDocumentStatusColor = (docStatus: DocumentStatus['status']) => {
    switch (docStatus) {
      case 'approved':
        return 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20';
      case 'rejected':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
      case 'processing':
        return 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20';
      default:
        return 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getEstimatedTime = () => {
    if (!submittedAt) return null;
    
    const now = new Date();
    const submitted = new Date(submittedAt);
    const hoursElapsed = (now.getTime() - submitted.getTime()) / (1000 * 60 * 60);
    
    if (status === 'processing') {
      const remainingHours = Math.max(0, 48 - hoursElapsed);
      if (remainingHours > 24) {
        return `Estimated completion: ${Math.ceil(remainingHours / 24)} days`;
      } else if (remainingHours > 1) {
        return `Estimated completion: ${Math.ceil(remainingHours)} hours`;
      } else {
        return 'Expected to complete soon';
      }
    }
    
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className={cn('p-3 rounded-xl', config.bgColor)}>
          <StatusIcon className={cn('w-6 h-6', config.color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                {config.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                {config.description}
              </p>
            </div>
            
            <div className={cn(
              'px-3 py-1 rounded-full text-sm font-medium',
              config.color,
              config.bgColor
            )}>
              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </div>
          </div>

          {/* Timestamps */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-500 dark:text-slate-400">
            {submittedAt && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Submitted: {formatDate(submittedAt)}
              </div>
            )}
            {reviewedAt && (
              <div className="flex items-center gap-1">
                <Check className="w-4 h-4" />
                Reviewed: {formatDate(reviewedAt)}
              </div>
            )}
          </div>

          {/* Estimated Time */}
          {getEstimatedTime() && (
            <div className="mt-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              {getEstimatedTime()}
            </div>
          )}
        </div>
      </div>

      {/* Documents Status */}
      {documents.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-4">
            Document Status
          </h4>
          
          <div className="grid gap-3">
            {documents.map((doc, index) => {
              const docConfig = DOCUMENT_TYPES[doc.type];
              const DocIcon = docConfig.icon;
              
              return (
                <motion.div
                  key={doc.type}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={cn(
                    'flex items-center gap-3 p-4 border rounded-xl',
                    getDocumentStatusColor(doc.status)
                  )}
                >
                  <DocIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {docConfig.name}
                      </span>
                      {getDocumentStatusIcon(doc.status)}
                    </div>
                    
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      Uploaded: {formatDate(doc.uploadedAt)}
                    </div>
                    
                    {doc.rejectionReason && (
                      <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {doc.rejectionReason}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rejection Reason */}
      {rejectionReason && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-800 dark:text-red-200">
                Rejection Reason
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {rejectionReason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Next Steps */}
      {nextSteps.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
            Next Steps
          </h4>
          <ul className="space-y-2">
            {nextSteps.map((step, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Progress Indicators for Processing */}
      {status === 'processing' && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
            <span>Verification Progress</span>
            <span>Step 2 of 3</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div className="bg-emerald-500 h-2 rounded-full w-2/3 transition-all duration-500" />
          </div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
            <span>Document Review</span>
            <span>Identity Verification</span>
            <span>Final Approval</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {status === 'not_started' && (
          <Button variant="primary" size="lg" className="flex-1 min-w-0">
            Start Verification
          </Button>
        )}
        
        {(status === 'rejected' || status === 'expired') && onRetry && (
          <Button 
            variant="primary" 
            size="lg" 
            onClick={onRetry}
            className="flex-1 min-w-0"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Verification
          </Button>
        )}
        
        {status === 'approved' && (
          <Button variant="ghost" size="lg" className="flex-1 min-w-0">
            <ExternalLink className="w-4 h-4 mr-2" />
            View Certificate
          </Button>
        )}
        
        {onContact && (
          <Button 
            variant={status === 'approved' ? 'primary' : 'ghost'} 
            size="lg" 
            onClick={onContact}
            className={cn(
              status === 'approved' ? 'flex-1 min-w-0' : 'min-w-fit'
            )}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Contact Support
          </Button>
        )}
      </div>

      {/* Help Text */}
      {(status === 'pending' || status === 'processing') && (
        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            💡 <strong>Tip:</strong> Most verifications are completed within 24-48 hours. 
            You'll receive email notifications when your status changes.
          </p>
        </div>
      )}
    </motion.div>
  );
};