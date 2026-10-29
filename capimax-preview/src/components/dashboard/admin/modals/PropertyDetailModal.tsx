import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminService, type AdminProperty } from '../../../../services';
import { useAdminActions } from '../../../../hooks/useAdminDashboard';

import { RichText } from '../../../ui/RichText';
import { uiLocale } from '../../../../utils/locale';
interface PropertyDetailModalProps {
  property: AdminProperty;
  isOpen: boolean;
  onClose: () => void;
  onPropertyUpdated: () => void;
}

type TabType = 'overview' | 'documents' | 'investors' | 'financial' | 'history';

const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  isOpen,
  onClose,
  onPropertyUpdated
}) => {
  const { t, i18n } = useTranslation('admin');
  const locale = uiLocale(i18n.language);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const {
    loading: actionLoading,
    error: actionError,
    clearError,
    approveProperty,
    rejectProperty
  } = useAdminActions();

  const handleApprove = async () => {
    if (window.confirm(t('propertyModal.approveConfirm'))) {
      await approveProperty(property.id);
      onPropertyUpdated();
      onClose();
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert(t('propertyModal.reasonRequired'));
      return;
    }

    await rejectProperty(property.id, rejectionReason);
    onPropertyUpdated();
    onClose();
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'overview', label: t('propertyModal.tabs.overview'), icon: '🏢' },
    { id: 'documents', label: t('propertyModal.tabs.documents'), icon: '📄' },
    { id: 'investors', label: t('propertyModal.tabs.owners'), icon: '👥' },
    { id: 'financial', label: t('propertyModal.tabs.financial'), icon: '💰' },
    { id: 'history', label: t('propertyModal.tabs.history'), icon: '📈' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-neutral-100 text-neutral-800 dark:bg-slate-600 dark:text-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
          onClick={onClose}
        />
        
        <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🏢</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
                  {property.title}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-slate-400">
                  {property.location} • {t('dashboard.approval.byOwner', { name: property.ownerName })}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(property.status)}`}>
                    {t(`shared.status.${property.status}`, { defaultValue: property.status.replace('_', ' ').toUpperCase() })}
                  </span>
                  <span className="text-sm text-neutral-600 dark:text-slate-400">
                    {t(`shared.propertyTypes.${property.propertyType}`, { defaultValue: property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1) })}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label={t('shared.close')}
              className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-300 transition-colors"
            >
              <span className="text-xl">×</span>
            </button>
          </div>

          {/* Action Buttons */}
          {property.status === 'pending_approval' && (
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {t('propertyModal.approve')}
                  </button>
                  <button
                    onClick={() => setShowRejectForm(!showRejectForm)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {t('propertyModal.reject')}
                  </button>
                </div>
                
                {actionError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>
                )}
              </div>

              {showRejectForm && (
                <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-neutral-200 dark:border-slate-600">
                  <h4 className="font-medium text-neutral-900 dark:text-slate-100 mb-2">
                    {t('propertyModal.rejectionReason')}
                  </h4>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder={t('propertyModal.rejectionPlaceholder')}
                    rows={3}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
                  />
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={handleReject}
                      disabled={!rejectionReason.trim() || actionLoading}
                      className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {t('propertyModal.confirmRejection')}
                    </button>
                    <button
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectionReason('');
                      }}
                      className="px-4 py-2 bg-neutral-200 text-neutral-700 dark:bg-slate-600 dark:text-slate-300 text-sm rounded hover:bg-neutral-300 dark:hover:bg-slate-500 transition-colors"
                    >
                      {t('shared.cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="px-6 border-b border-neutral-200 dark:border-slate-700">
            <nav className="flex gap-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-slate-300'
                  }`}
                >
                  <span className="me-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6 max-h-[50vh] overflow-y-auto">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Property Details */}
                  <div>
                    <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100 mb-4">
                      {t('propertyModal.propertyDetails')}
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('propertyModal.fields.title')}</label>
                        <p className="text-neutral-900 dark:text-slate-100">{property.title}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('propertyModal.fields.description')}</label>
                        <RichText text={property.description} className="text-sm" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('propertyModal.fields.location')}</label>
                        <p className="text-neutral-900 dark:text-slate-100">{property.location}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('propertyModal.fields.propertyType')}</label>
                        <p className="text-neutral-900 dark:text-slate-100 capitalize">{t(`shared.propertyTypes.${property.propertyType}`, { defaultValue: property.propertyType })}</p>
                      </div>
                    </div>
                  </div>

                  {/* Financial Information */}
                  <div>
                    <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100 mb-4">
                      {t('propertyModal.financialInfo')}
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('dashboard.approval.targetAmount')}</label>
                        <p className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
                          ${property.targetAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('propertyModal.fields.raisedAmount')}</label>
                        <p className="text-lg font-medium text-green-600 dark:text-green-400">
                          ${property.raisedAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('propertyModal.fields.minPurchase')}</label>
                        <p className="text-neutral-900 dark:text-slate-100">
                          ${property.minInvestment.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('propertyModal.fields.expectedReturn')}</label>
                        <p className="text-neutral-900 dark:text-slate-100">
                          {t('propertyModal.fields.annually', { value: property.expectedReturn })}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('propertyModal.fields.fundingProgress')}</label>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-neutral-200 dark:bg-slate-600 rounded-full h-2">
                            <div
                              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(property.fundingProgress, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-neutral-900 dark:text-slate-100">
                            {property.fundingProgress}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Owner Information */}
                <div>
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100 mb-4">
                    {t('propertyModal.ownerInfo')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('propertyModal.fields.name')}</label>
                      <p className="text-neutral-900 dark:text-slate-100">{property.ownerName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('users.fields.email')}</label>
                      <p className="text-neutral-900 dark:text-slate-100">{property.ownerEmail}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('propertyModal.fields.ownerId')}</label>
                      <p className="text-neutral-500 dark:text-slate-400 font-mono text-sm">{property.ownerId}</p>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100 mb-4">
                    {t('propertyModal.timeline')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('dashboard.approval.submitted')}</label>
                      <p className="text-neutral-900 dark:text-slate-100">
                        {new Date(property.createdAt).toLocaleDateString(locale)}
                      </p>
                    </div>
                    {property.approvedAt && (
                      <div>
                        <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('propertyModal.fields.approvedAt')}</label>
                        <p className="text-neutral-900 dark:text-slate-100">
                          {new Date(property.approvedAt).toLocaleDateString(locale)}
                        </p>
                      </div>
                    )}
                    {property.fundingDeadline && (
                      <div>
                        <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">{t('propertyModal.fields.fundingDeadline')}</label>
                        <p className="text-neutral-900 dark:text-slate-100">
                          {new Date(property.fundingDeadline).toLocaleDateString(locale)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rejection Reason */}
                {property.status === 'rejected' && property.rejectionReason && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-red-900 dark:text-red-100 mb-2">
                      {t('propertyModal.rejectionReason')}
                    </h3>
                    <p className="text-red-800 dark:text-red-200">{property.rejectionReason}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100">
                  {t('propertyModal.documents')}
                </h3>
                {property.documents && property.documents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {property.documents.map((document, index) => (
                      <div key={index} className="border border-neutral-200 dark:border-slate-600 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">📄</span>
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-slate-100">
                              {t('propertyModal.documentN', { n: index + 1 })}
                            </p>
                            <p className="text-sm text-neutral-500 dark:text-slate-400">
                              {document.split('/').pop()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => window.open(document, '_blank')}
                          className="mt-3 px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition-colors"
                        >
                          {t('propertyModal.viewDocument')}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-500 dark:text-slate-400">{t('propertyModal.noDocuments')}</p>
                )}

                <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100 mt-8">
                  {t('propertyModal.images')}
                </h3>
                {property.images && property.images.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {property.images.map((image, index) => (
                      <div key={index} className="aspect-video bg-neutral-100 dark:bg-slate-700 rounded-lg overflow-hidden">
                        <img
                          src={image}
                          alt={t('propertyModal.imageAlt', { n: index + 1 })}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04MCA2MEgxMjBWMTQwSDgwVjYwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-500 dark:text-slate-400">{t('propertyModal.noImages')}</p>
                )}
              </div>
            )}

            {activeTab === 'investors' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100">
                    {t('propertyModal.tabs.owners')}
                  </h3>
                  <span className="px-3 py-1 bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400 rounded-full text-sm font-medium">
                    {t('propertyModal.ownersTotal', { count: property.investors })}
                  </span>
                </div>
                <div className="text-center text-neutral-500 dark:text-slate-400 py-8">
                  <p>{t('propertyModal.ownersSoon')}</p>
                  <p className="text-sm mt-1">{t('users.modal.comingSoon')}</p>
                </div>
              </div>
            )}

            {activeTab === 'financial' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100">
                  {t('propertyModal.financialOverview')}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: t('dashboard.approval.targetAmount'), value: `$${property.targetAmount.toLocaleString()}`, color: 'text-blue-600 dark:text-blue-400' },
                    { label: t('propertyModal.fields.raisedAmount'), value: `$${property.raisedAmount.toLocaleString()}`, color: 'text-green-600 dark:text-green-400' },
                    { label: t('propertyModal.fields.sharesIssued'), value: property.tokensIssued.toLocaleString(), color: 'text-purple-600 dark:text-purple-400' },
                    { label: t('propertyModal.tabs.owners'), value: property.investors.toString(), color: 'text-orange-600 dark:text-orange-400' }
                  ].map((metric) => (
                    <div key={metric.label} className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4">
                      <p className="text-sm text-neutral-600 dark:text-slate-400 mb-1">{metric.label}</p>
                      <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
                    </div>
                  ))}
                </div>

                <div className="text-center text-neutral-500 dark:text-slate-400 py-4">
                  <p>{t('propertyModal.financialSoon')}</p>
                  <p className="text-sm mt-1">{t('users.modal.comingSoon')}</p>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100">
                  {t('propertyModal.history')}
                </h3>
                <div className="text-center text-neutral-500 dark:text-slate-400 py-8">
                  <p>{t('propertyModal.historySoon')}</p>
                  <p className="text-sm mt-1">{t('users.modal.comingSoon')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailModal;