import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Upload,
  FileText,
  Eye,
  RefreshCw,
  Calendar,
  User,
  MessageSquare
} from 'lucide-react';

import PropertyApprovalService from '../../services/admin/PropertyApprovalService';
import type { PropertyApproval } from '../../services/admin/PropertyApprovalService';
import { Card } from '../design-system/cards/Card';
import { Text } from '../design-system/typography/Text';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface PropertyApprovalStatusProps {
  propertyId: string;
  className?: string;
}

export const PropertyApprovalStatus: React.FC<PropertyApprovalStatusProps> = ({
  propertyId,
  className
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');

  const queryClient = useQueryClient();

  // Fetch approval status
  const {
    data: approval,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['property-approval-status', propertyId],
    queryFn: () => PropertyApprovalService.getOwnerApprovalStatus(propertyId),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Submit for approval mutation
  const submitForApprovalMutation = useMutation({
    mutationFn: () => PropertyApprovalService.submitForApproval(propertyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-approval-status', propertyId] });
    },
  });

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: ({ file, type, description }: { file: File; type: string; description?: string }) =>
      PropertyApprovalService.uploadVerificationDocument(propertyId, file, type, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-approval-status', propertyId] });
      setShowUploadModal(false);
      setUploadFile(null);
      setDocumentType('');
      setDocumentDescription('');
    },
  });

  const getStatusInfo = (status?: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="w-6 h-6 text-orange-500" />,
          title: 'Pending Review',
          description: 'Your property submission is waiting for admin review.',
          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
          bgColor: 'bg-orange-50 dark:bg-orange-900/10'
        };
      case 'under_review':
        return {
          icon: <Eye className="w-6 h-6 text-blue-500" />,
          title: 'Under Review',
          description: 'Our team is currently reviewing your property submission.',
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
          bgColor: 'bg-blue-50 dark:bg-blue-900/10'
        };
      case 'approved':
        return {
          icon: <CheckCircle className="w-6 h-6 text-emerald-500" />,
          title: 'Approved',
          description: 'Congratulations! Your property has been approved for tokenization.',
          color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
          bgColor: 'bg-emerald-50 dark:bg-emerald-900/10'
        };
      case 'rejected':
        return {
          icon: <XCircle className="w-6 h-6 text-red-500" />,
          title: 'Rejected',
          description: 'Your property submission was not approved. Please review the feedback.',
          color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
          bgColor: 'bg-red-50 dark:bg-red-900/10'
        };
      case 'requires_changes':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
          title: 'Changes Required',
          description: 'Please make the requested changes and resubmit your property.',
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/10'
        };
      default:
        return {
          icon: <FileText className="w-6 h-6 text-slate-500" />,
          title: 'Not Submitted',
          description: 'Your property has not been submitted for approval yet.',
          color: 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-300',
          bgColor: 'bg-slate-50 dark:bg-slate-900/10'
        };
    }
  };

  const handleFileUpload = () => {
    if (!uploadFile || !documentType) return;

    uploadDocumentMutation.mutate({
      file: uploadFile,
      type: documentType,
      description: documentDescription
    });
  };

  const statusInfo = getStatusInfo(approval?.status);

  if (isLoading) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
          <div className="h-4 bg-slate-200 rounded w-full"></div>
          <div className="h-4 bg-slate-200 rounded w-2/3"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Main Status Card */}
      <Card className={cn('p-6', statusInfo.bgColor)}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {statusInfo.icon}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Text variant="h3" weight="bold">
                  {statusInfo.title}
                </Text>
                <div className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium",
                  statusInfo.color
                )}>
                  {approval?.status?.replace('_', ' ').toUpperCase() || 'NOT SUBMITTED'}
                </div>
              </div>

              <Text variant="body" color="muted" className="mb-4">
                {statusInfo.description}
              </Text>

              {/* Timeline Information */}
              {approval && (
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Submitted: {approval.submitted_at.toLocaleDateString()}
                    </span>
                  </div>

                  {approval.reviewer && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>
                        Reviewer: {approval.reviewer.first_name} {approval.reviewer.last_name}
                      </span>
                    </div>
                  )}

                  {approval.reviewed_at && (
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      <span>
                        Reviewed: {approval.reviewed_at.toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {approval.approved_at && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        Approved: {approval.approved_at.toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>

            {!approval && (
              <Button
                variant="primary"
                onClick={() => submitForApprovalMutation.mutate()}
                disabled={submitForApprovalMutation.isPending}
              >
                Submit for Approval
              </Button>
            )}

            {(approval?.status === 'requires_changes' || approval?.status === 'under_review') && (
              <Button
                variant="outline"
                onClick={() => setShowUploadModal(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Review Notes */}
      {approval?.review_notes && (
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-blue-500 flex-shrink-0 mt-1" />
            <div>
              <Text variant="h4" weight="semibold" className="mb-2">
                Review Notes
              </Text>
              <Text variant="body" className="whitespace-pre-wrap">
                {approval.review_notes}
              </Text>
            </div>
          </div>
        </Card>
      )}

      {/* Required Changes */}
      {approval?.required_changes && (
        <Card className="p-6 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <Text variant="h4" weight="semibold" className="mb-2 text-yellow-800 dark:text-yellow-300">
                Required Changes
              </Text>
              <Text variant="body" className="whitespace-pre-wrap text-yellow-700 dark:text-yellow-200">
                {approval.required_changes}
              </Text>
            </div>
          </div>
        </Card>
      )}

      {/* Approval Process Steps */}
      <Card className="p-6">
        <Text variant="h4" weight="semibold" className="mb-4">
          Approval Process
        </Text>

        <div className="space-y-4">
          {[
            {
              step: 1,
              title: 'Submit Property',
              description: 'Upload all required documents and property information',
              completed: !!approval,
              active: !approval
            },
            {
              step: 2,
              title: 'Initial Review',
              description: 'Our team reviews your submission for completeness',
              completed: approval?.status && ['under_review', 'approved', 'rejected'].includes(approval.status),
              active: approval?.status === 'pending'
            },
            {
              step: 3,
              title: 'Due Diligence',
              description: 'Detailed verification of property and documentation',
              completed: approval?.status && ['approved', 'rejected'].includes(approval.status),
              active: approval?.status === 'under_review'
            },
            {
              step: 4,
              title: 'Final Decision',
              description: 'Property approved or feedback provided for changes',
              completed: approval?.status === 'approved',
              active: false
            }
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-4">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                item.completed
                  ? "bg-emerald-500 text-white"
                  : item.active
                  ? "bg-blue-500 text-white"
                  : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
              )}>
                {item.completed ? '✓' : item.step}
              </div>

              <div className="flex-1">
                <Text variant="body" weight="medium">
                  {item.title}
                </Text>
                <Text variant="caption" color="muted">
                  {item.description}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Document Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <Text variant="h3" weight="bold">
                  Upload Additional Document
                </Text>
                <Text variant="body" color="muted" className="mt-1">
                  Upload additional documentation to support your property approval
                </Text>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Document Type
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800"
                    required
                  >
                    <option value="">Select document type...</option>
                    <option value="property_deed">Property Deed</option>
                    <option value="financial_statement">Financial Statement</option>
                    <option value="valuation_report">Valuation Report</option>
                    <option value="legal_document">Legal Document</option>
                    <option value="compliance_certificate">Compliance Certificate</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    File Upload
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    required
                  />
                  <Text variant="caption" color="muted" className="mt-1">
                    Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                  </Text>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={documentDescription}
                    onChange={(e) => setDocumentDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800"
                    placeholder="Brief description of the document..."
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploadDocumentMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleFileUpload}
                  disabled={!uploadFile || !documentType || uploadDocumentMutation.isPending}
                >
                  {uploadDocumentMutation.isPending ? 'Uploading...' : 'Upload Document'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PropertyApprovalStatus;