import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  FileText,
  Download,
  User,
  Calendar,
  Building,
  DollarSign,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';

import PropertyApprovalService from '../../services/admin/PropertyApprovalService';
import type {
  PropertyApproval,
  ApprovalAction,
  ApprovalStats
} from '../../services/admin/PropertyApprovalService';
import { Card } from '../design-system/cards/Card';
import { StatsCard } from '../design-system/cards/StatsCard';
import { Text } from '../design-system/typography/Text';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

import { RichText } from '../ui/RichText';
import { uiLocale } from '../../utils/locale';
interface PropertyApprovalDashboardProps {
  className?: string;
}

type ApprovalFilter = 'all' | 'pending' | 'under_review' | 'approved' | 'rejected' | 'requires_changes';

const dateLocale = (lng?: string) => (uiLocale(lng));

export const PropertyApprovalDashboard: React.FC<PropertyApprovalDashboardProps> = ({
  className
}) => {
  const { t, i18n } = useTranslation('admin');
  const locale = dateLocale(i18n.language);
  const [currentFilter, setCurrentFilter] = useState<ApprovalFilter>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApproval, setSelectedApproval] = useState<PropertyApproval | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch approval statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['approval-stats'],
    queryFn: PropertyApprovalService.getApprovalStats,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch approvals based on current filter
  const {
    data: approvalsData,
    isLoading: approvalsLoading,
    refetch: refetchApprovals
  } = useQuery({
    queryKey: ['property-approvals', currentFilter, searchTerm],
    queryFn: () => PropertyApprovalService.getAllApprovals(
      1,
      20,
      currentFilter === 'all' ? undefined : currentFilter,
      searchTerm || undefined
    ),
    refetchInterval: 15000, // Refetch every 15 seconds for real-time updates
  });

  // Process approval mutation
  const processApprovalMutation = useMutation({
    mutationFn: ({ propertyId, action }: { propertyId: string; action: ApprovalAction }) =>
      PropertyApprovalService.processApproval(propertyId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-stats'] });
      setShowDetailModal(false);
      setSelectedApproval(null);
    },
    onError: (error) => {
      console.error('Failed to process approval:', error);
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'under_review':
        return <Eye className="w-5 h-5 text-blue-500" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'requires_changes':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'under_review':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'approved':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'requires_changes':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-300';
    }
  };

  const handleApprovalAction = (action: ApprovalAction) => {
    if (!selectedApproval) return;

    processApprovalMutation.mutate({
      propertyId: selectedApproval.property_id,
      action
    });
  };

  const downloadDocument = async (documentId: string, fileName: string) => {
    try {
      const blob = await PropertyApprovalService.downloadDocument(documentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  const filterButtons: { key: ApprovalFilter; label: string; count?: number }[] = [
    { key: 'pending', label: t('approval.filters.pending'), count: stats?.total_pending },
    { key: 'under_review', label: t('approval.filters.under_review'), count: stats?.total_under_review },
    { key: 'approved', label: t('approval.filters.approved') },
    { key: 'rejected', label: t('approval.filters.rejected') },
    { key: 'requires_changes', label: t('approval.filters.requires_changes') },
    { key: 'all', label: t('approval.filters.all') }
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Text variant="h2" weight="bold">
            {t('approval.title')}
          </Text>
          <Text variant="body" color="muted" className="mt-1">
            {t('approval.subtitle')}
          </Text>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchApprovals()}
          disabled={approvalsLoading}
        >
          <RefreshCw className={cn("w-4 h-4 me-2", approvalsLoading && "animate-spin")} />
          {t('shared.refresh')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={t('approval.stats.pendingReview')}
          value={statsLoading ? '...' : stats?.total_pending?.toString() || '0'}
          subtitle={t('approval.stats.overdue', { count: stats?.pending_overdue || 0 })}
          icon={Clock}
          variant="warning"
          trend={stats?.pending_overdue ? 'negative' : 'neutral'}
        />
        <StatsCard
          title={t('approval.stats.underReview')}
          value={statsLoading ? '...' : stats?.total_under_review?.toString() || '0'}
          subtitle={t('approval.stats.underReviewSub')}
          icon={Eye}
          variant="info"
        />
        <StatsCard
          title={t('approval.stats.approvedThisMonth')}
          value={statsLoading ? '...' : stats?.total_approved_this_month?.toString() || '0'}
          subtitle={t('approval.stats.approvedSub')}
          icon={CheckCircle}
          variant="success"
        />
        <StatsCard
          title={t('approval.stats.avgReviewTime')}
          value={statsLoading ? '...' : t('approval.stats.daysShort', { value: stats?.average_review_time_days || 0 })}
          subtitle={t('approval.stats.avgSub')}
          icon={Calendar}
          variant="neutral"
        />
      </div>

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder={t('approval.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full ps-10 pe-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {filterButtons.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setCurrentFilter(filter.key)}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200",
                  currentFilter === filter.key
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                )}
              >
                {filter.label}
                {filter.count !== undefined && (
                  <span className="ms-2 px-2 py-0.5 rounded-full bg-white/20 text-xs">
                    {filter.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Approvals List */}
      <div className="grid grid-cols-1 gap-4">
        {approvalsLoading ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-2/3"></div>
              </div>
            </Card>
          ))
        ) : approvalsData?.approvals.length === 0 ? (
          <Card className="p-8 text-center">
            <Text variant="body" color="muted">
              {t('approval.empty')}
            </Text>
          </Card>
        ) : (
          approvalsData?.approvals.map((approval) => (
            <motion.div
              key={approval.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Property Header */}
                    <div className="flex items-center gap-3 mb-3">
                      {approval.property.images?.[0] ? (
                        <img
                          src={approval.property.images[0].image}
                          alt={approval.property.images[0].alt_text}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Building className="w-8 h-8 text-slate-400" />
                        </div>
                      )}

                      <div className="flex-1">
                        <Text variant="h3" weight="semibold" className="mb-1">
                          {approval.property.title}
                        </Text>
                        <Text variant="body" color="muted" className="mb-2">
                          {approval.property.city}, {approval.property.country}
                        </Text>
                        <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            ${approval.property.total_value.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {approval.property.owner.first_name} {approval.property.owner.last_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {approval.submitted_at.toLocaleDateString(locale)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status and Notes */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
                        getStatusColor(approval.status)
                      )}>
                        {getStatusIcon(approval.status)}
                        {t(`shared.status.${approval.status}`, { defaultValue: approval.status.replace('_', ' ').toUpperCase() })}
                      </div>

                      {approval.reviewer && (
                        <Text variant="caption" color="muted">
                          {t('approval.reviewer', { name: `${approval.reviewer.first_name} ${approval.reviewer.last_name}` })}
                        </Text>
                      )}
                    </div>

                    {/* Review Notes */}
                    {approval.review_notes && (
                      <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <Text variant="caption" weight="medium" className="mb-1">
                          {t('approval.reviewNotesLabel')}
                        </Text>
                        <Text variant="body" color="muted">
                          {approval.review_notes}
                        </Text>
                      </div>
                    )}

                    {/* Required Changes */}
                    {approval.required_changes && (
                      <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <Text variant="caption" weight="medium" className="mb-1 text-yellow-800 dark:text-yellow-300">
                          {t('approval.requiredChangesLabel')}
                        </Text>
                        <Text variant="body" className="text-yellow-700 dark:text-yellow-300">
                          {approval.required_changes}
                        </Text>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ms-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedApproval(approval);
                        setShowDetailModal(true);
                      }}
                    >
                      <Eye className="w-4 h-4 me-2" />
                      {t('dashboard.users.review')}
                    </Button>

                    {approval.status === 'pending' && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApprovalAction({ action: 'approve' })}
                          disabled={processApprovalMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4 me-2" />
                          {t('shared.approve')}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleApprovalAction({ action: 'reject' })}
                          disabled={processApprovalMutation.isPending}
                        >
                          <XCircle className="w-4 h-4 me-2" />
                          {t('shared.reject')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedApproval && (
          <PropertyApprovalDetailModal
            approval={selectedApproval}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedApproval(null);
            }}
            onAction={handleApprovalAction}
            onDownloadDocument={downloadDocument}
            isProcessing={processApprovalMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Property Approval Detail Modal Component
interface PropertyApprovalDetailModalProps {
  approval: PropertyApproval;
  onClose: () => void;
  onAction: (action: ApprovalAction) => void;
  onDownloadDocument: (documentId: string, fileName: string) => void;
  isProcessing: boolean;
}

const PropertyApprovalDetailModal: React.FC<PropertyApprovalDetailModalProps> = ({
  approval,
  onClose,
  onAction,
  onDownloadDocument,
  isProcessing
}) => {
  const { t, i18n } = useTranslation(['admin', 'owner']);
  const locale = dateLocale(i18n.language);
  const [reviewNotes, setReviewNotes] = useState(approval.review_notes || '');
  const [requiredChanges, setRequiredChanges] = useState(approval.required_changes || '');
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'request_changes' | null>(null);

  const handleAction = () => {
    if (!actionType) return;

    onAction({
      action: actionType,
      review_notes: reviewNotes || undefined,
      required_changes: actionType === 'request_changes' ? requiredChanges : undefined
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <Text variant="h3" weight="bold">
                {t('approval.modal.title')}
              </Text>
              <Text variant="body" color="muted" className="mt-1">
                {approval.property.title}
              </Text>
            </div>
            <button
              onClick={onClose}
              aria-label={t('shared.close')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Property Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div>
              <Text variant="h4" weight="semibold" className="mb-3">
                {t('transactions.detail.propertyInfo')}
              </Text>
              <div className="space-y-3">
                <div>
                  <Text variant="caption" color="muted">{t('transactions.fields.type')}</Text>
                  <Text variant="body">{t(`shared.propertyTypes.${approval.property.property_type}`, { defaultValue: approval.property.property_type })}</Text>
                </div>
                <div>
                  <Text variant="caption" color="muted">{t('propertyModal.fields.location')}</Text>
                  <Text variant="body">
                    {approval.property.city}, {approval.property.country}
                  </Text>
                </div>
                <div>
                  <Text variant="caption" color="muted">{t('approval.modal.totalValue')}</Text>
                  <Text variant="body" weight="semibold">
                    ${approval.property.total_value.toLocaleString()}
                  </Text>
                </div>
                <div>
                  <Text variant="caption" color="muted">{t('approval.modal.sharePrice')}</Text>
                  <Text variant="body">
                    {t('approval.modal.perShare', { price: `$${approval.property.token_price}` })}
                  </Text>
                </div>
                <div>
                  <Text variant="caption" color="muted">{t('approval.modal.totalShares')}</Text>
                  <Text variant="body">
                    {t('approval.modal.sharesCount', { count: approval.property.total_tokens, value: approval.property.total_tokens.toLocaleString() })}
                  </Text>
                </div>
              </div>
            </div>

            {/* Owner Info */}
            <div>
              <Text variant="h4" weight="semibold" className="mb-3">
                {t('shared.roles.property_owner')}
              </Text>
              <div className="space-y-3">
                <div>
                  <Text variant="caption" color="muted">{t('propertyModal.fields.name')}</Text>
                  <Text variant="body">
                    {approval.property.owner.first_name} {approval.property.owner.last_name}
                  </Text>
                </div>
                <div>
                  <Text variant="caption" color="muted">{t('users.fields.email')}</Text>
                  <Text variant="body">{approval.property.owner.email}</Text>
                </div>
                <div>
                  <Text variant="caption" color="muted">{t('dashboard.approval.submitted')}</Text>
                  <Text variant="body">
                    {t('approval.modal.dateAtTime', {
                      date: approval.submitted_at.toLocaleDateString(locale),
                      time: approval.submitted_at.toLocaleTimeString(locale)
                    })}
                  </Text>
                </div>
              </div>
            </div>
          </div>

          {/* Property Description */}
          <div>
            <Text variant="h4" weight="semibold" className="mb-3">
              {t('propertyModal.fields.description')}
            </Text>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <RichText text={approval.property.description} />
            </div>
          </div>

          {/* Documents */}
          {approval.property.documents && approval.property.documents.length > 0 && (
            <div>
              <Text variant="h4" weight="semibold" className="mb-3">
                {t('approval.modal.documents')}
              </Text>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {approval.property.documents.map((doc) => (
                  <Card key={doc.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <div>
                          <Text variant="body" weight="medium">
                            {doc.name}
                          </Text>
                          <Text variant="caption" color="muted">
                            {t(`owner:submit.documents.types.${doc.document_type}`, { defaultValue: doc.document_type })} • {new Date(doc.upload_date).toLocaleDateString(locale)}
                          </Text>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDownloadDocument(doc.id, doc.name)}
                        aria-label={t('approval.modal.download')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Review Section */}
          <div className="space-y-4">
            <Text variant="h4" weight="semibold">
              {t('approval.modal.reviewDecision')}
            </Text>

            {/* Review Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('approval.modal.reviewNotes')}
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800"
                placeholder={t('approval.modal.reviewNotesPlaceholder')}
              />
            </div>

            {/* Required Changes (if rejecting or requesting changes) */}
            {(actionType === 'reject' || actionType === 'request_changes') && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {actionType === 'reject' ? t('propertyModal.rejectionReason') : t('approval.modal.requiredChanges')}
                </label>
                <textarea
                  value={requiredChanges}
                  onChange={(e) => setRequiredChanges(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800"
                  placeholder={
                    actionType === 'reject'
                      ? t('approval.modal.rejectPlaceholder')
                      : t('approval.modal.changesPlaceholder')
                  }
                  required
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={onClose}>
              {t('shared.cancel')}
            </Button>

            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={() => {
                  setActionType('reject');
                  setTimeout(handleAction, 100);
                }}
                disabled={isProcessing}
              >
                <XCircle className="w-4 h-4 me-2" />
                {t('shared.reject')}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setActionType('request_changes');
                  setTimeout(handleAction, 100);
                }}
                disabled={isProcessing}
              >
                <AlertTriangle className="w-4 h-4 me-2" />
                {t('approval.modal.requestChanges')}
              </Button>

              <Button
                variant="primary"
                onClick={() => {
                  setActionType('approve');
                  setTimeout(handleAction, 100);
                }}
                disabled={isProcessing}
              >
                <CheckCircle className="w-4 h-4 me-2" />
                {t('propertyModal.approve')}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PropertyApprovalDashboard;