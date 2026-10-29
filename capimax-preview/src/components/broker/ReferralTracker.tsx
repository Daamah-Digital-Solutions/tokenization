import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';
import { uiLocale } from '../../utils/locale';

export interface ReferralClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  joinDate: string;
  status: 'lead' | 'registered' | 'kyc_pending' | 'active' | 'invested' | 'inactive';
  referralSource: string;
  totalInvestment: number;
  commissionEarned: number;
  lastActivity: string;
  investmentCount: number;
  conversionDate?: string;
  notes?: string;
  tags: string[];
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  lifetime_value: number;
}

export interface ReferralMetrics {
  totalReferrals: number;
  activeReferrals: number;
  convertedReferrals: number;
  conversionRate: number;
  totalCommission: number;
  pendingCommission: number;
  averageInvestmentSize: number;
  lifetimeValue: number;
}

interface ReferralTrackerProps {
  referrals: ReferralClient[];
  metrics: ReferralMetrics;
  onContactClient: (clientId: string) => void;
  onAddNote: (clientId: string, note: string) => void;
  onUpdateStatus: (clientId: string, status: ReferralClient['status']) => void;
  onGenerateLink: () => void;
  onExportData: () => void;
  className?: string;
}

export const ReferralTracker: React.FC<ReferralTrackerProps> = ({
  referrals,
  metrics,
  onContactClient,
  onAddNote,
  onUpdateStatus,
  onGenerateLink,
  onExportData,
  className = ''
}) => {
  const { t, i18n } = useTranslation('brokerui');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('joinDate');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'lead': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'registered': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'kyc_pending': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'invested': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'inactive': return 'bg-neutral-100 text-neutral-800 dark:bg-slate-600 dark:text-slate-300';
      default: return 'bg-neutral-100 text-neutral-800 dark:bg-slate-600 dark:text-slate-300';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'text-amber-600 dark:text-amber-400';
      case 'silver': return 'text-neutral-600 dark:text-neutral-400';
      case 'gold': return 'text-yellow-600 dark:text-yellow-400';
      case 'platinum': return 'text-purple-600 dark:text-purple-400';
      default: return 'text-neutral-600 dark:text-slate-400';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'bronze': return '🥉';
      case 'silver': return '🥈';
      case 'gold': return '🥇';
      case 'platinum': return '💎';
      default: return '⭐';
    }
  };

  const filteredReferrals = referrals
    .filter(client => filterStatus === 'all' || client.status === filterStatus)
    .filter(client => filterTier === 'all' || client.tier === filterTier)
    .sort((a, b) => {
      switch (sortBy) {
        case 'joinDate':
          return new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime();
        case 'investment':
          return b.totalInvestment - a.totalInvestment;
        case 'commission':
          return b.commissionEarned - a.commissionEarned;
        case 'activity':
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
        default:
          return 0;
      }
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(uiLocale(i18n.language), {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 ${className}`}>
      {/* Header & Metrics */}
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
            {t('referrals.title')}
          </h2>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={onExportData}>
              {t('referrals.exportData')}
            </Button>
            <Button size="sm" variant="primary" onClick={onGenerateLink}>
              {t('referrals.generateLink')}
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {metrics.totalReferrals}
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-300">{t('referrals.totalReferrals')}</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {Math.round(metrics.conversionRate)}%
            </div>
            <div className="text-sm text-green-800 dark:text-green-300">{t('referrals.conversionRate')}</div>
          </div>
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              ${metrics.totalCommission.toLocaleString()}
            </div>
            <div className="text-sm text-purple-800 dark:text-purple-300">{t('referrals.totalCommission')}</div>
          </div>
          <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              ${metrics.averageInvestmentSize.toLocaleString()}
            </div>
            <div className="text-sm text-orange-800 dark:text-orange-300">{t('referrals.avgPurchase')}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-neutral-200 dark:border-slate-600 rounded-lg px-3 py-1 bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
          >
            <option value="all">{t('referrals.allStatus')}</option>
            <option value="lead">{t('referrals.status.leads')}</option>
            <option value="registered">{t('referrals.status.registered')}</option>
            <option value="kyc_pending">{t('referrals.status.kyc_pending')}</option>
            <option value="active">{t('referrals.status.active')}</option>
            <option value="invested">{t('referrals.status.owners')}</option>
            <option value="inactive">{t('referrals.status.inactive')}</option>
          </select>

          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="text-sm border border-neutral-200 dark:border-slate-600 rounded-lg px-3 py-1 bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
          >
            <option value="all">{t('referrals.allTiers')}</option>
            <option value="bronze">{t('referrals.tier.bronze')}</option>
            <option value="silver">{t('referrals.tier.silver')}</option>
            <option value="gold">{t('referrals.tier.gold')}</option>
            <option value="platinum">{t('referrals.tier.platinum')}</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm border border-neutral-200 dark:border-slate-600 rounded-lg px-3 py-1 bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
          >
            <option value="joinDate">{t('referrals.sortJoin')}</option>
            <option value="investment">{t('referrals.sortPurchase')}</option>
            <option value="commission">{t('referrals.sortCommission')}</option>
            <option value="activity">{t('referrals.sortActivity')}</option>
          </select>
        </div>
      </div>

      {/* Referrals List */}
      <div className="p-6">
        {filteredReferrals.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">🎯</span>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-2">
              {t('referrals.noReferrals')}
            </h3>
            <p className="text-neutral-600 dark:text-slate-400 mb-4">
              {referrals.length === 0 
                ? t('referrals.noReferralsYet')
                : t('referrals.noMatch')
              }
            </p>
            <Button variant="primary" onClick={onGenerateLink}>
              {t('referrals.generateReferralLink')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReferrals.map((client) => {
              const isExpanded = selectedClient === client.id;
              const daysSinceActivity = getDaysSince(client.lastActivity);
              
              return (
                <div
                  key={client.id}
                  className={`border border-neutral-200 dark:border-slate-700 rounded-lg transition-all ${
                    isExpanded ? 'shadow-md' : 'hover:shadow-sm'
                  }`}
                >
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setSelectedClient(isExpanded ? null : client.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {client.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-neutral-900 dark:text-slate-100">
                              {client.name}
                            </h4>
                            <span className={getTierColor(client.tier)}>
                              {getTierIcon(client.tier)}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(client.status)}`}>
                              {t(`referrals.status.${client.status}`, { defaultValue: client.status.replace('_', ' ').toUpperCase() })}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-neutral-600 dark:text-slate-400">
                            <span>{client.email}</span>
                            <span>{t('referrals.via', { source: client.referralSource })}</span>
                            <span>{t('referrals.joined', { date: formatDate(client.joinDate) })}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-end">
                          <div className="text-sm text-neutral-500 dark:text-slate-400">{t('referrals.purchase')}</div>
                          <div className="font-semibold text-neutral-900 dark:text-slate-100">
                            ${client.totalInvestment.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="text-sm text-neutral-500 dark:text-slate-400">{t('referrals.commission')}</div>
                          <div className="font-semibold text-green-600 dark:text-green-400">
                            ${client.commissionEarned.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="text-sm text-neutral-500 dark:text-slate-400">{t('referrals.lastActivity')}</div>
                          <div className={`font-medium ${
                            daysSinceActivity > 30 ? 'text-red-600 dark:text-red-400' :
                            daysSinceActivity > 7 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-green-600 dark:text-green-400'
                          }`}>
                            {daysSinceActivity === 0 ? t('referrals.today') : t('referrals.daysAgo', { value: daysSinceActivity })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onContactClient(client.id);
                            }}
                          >
                            {t('referrals.contact')}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    {client.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {client.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-neutral-100 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-neutral-200 dark:border-slate-700 p-4 bg-neutral-50 dark:bg-slate-900/50">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                        <div>
                          <span className="text-neutral-500 dark:text-slate-400">{t('referrals.phone')}</span>
                          <div className="font-medium text-neutral-900 dark:text-slate-100">
                            {client.phone || t('referrals.notProvided')}
                          </div>
                        </div>
                        <div>
                          <span className="text-neutral-500 dark:text-slate-400">{t('referrals.purchaseCount')}</span>
                          <div className="font-medium text-neutral-900 dark:text-slate-100">
                            {client.investmentCount}
                          </div>
                        </div>
                        <div>
                          <span className="text-neutral-500 dark:text-slate-400">{t('referrals.lifetimeValue')}</span>
                          <div className="font-medium text-purple-600 dark:text-purple-400">
                            ${client.lifetime_value.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-neutral-500 dark:text-slate-400">{t('referrals.conversionDate')}</span>
                          <div className="font-medium text-neutral-900 dark:text-slate-100">
                            {client.conversionDate ? formatDate(client.conversionDate) : t('referrals.notConverted')}
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-neutral-900 dark:text-slate-100 mb-2">
                          {t('referrals.notes')}
                        </h5>
                        {client.notes ? (
                          <p className="text-sm text-neutral-600 dark:text-slate-400 mb-2">
                            {client.notes}
                          </p>
                        ) : (
                          <p className="text-sm text-neutral-500 dark:text-slate-400 italic mb-2">
                            {t('referrals.noNotes')}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder={t('referrals.addNotePh')}
                            className="flex-1 text-sm border border-neutral-200 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              if (newNote.trim()) {
                                onAddNote(client.id, newNote);
                                setNewNote('');
                              }
                            }}
                          >
                            {t('referrals.addNote')}
                          </Button>
                        </div>
                      </div>

                      {/* Status Update */}
                      <div className="flex items-center gap-3">
                        <select
                          value={client.status}
                          onChange={(e) => onUpdateStatus(client.id, e.target.value as ReferralClient['status'])}
                          className="text-sm border border-neutral-200 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
                        >
                          <option value="lead">{t('referrals.status.lead')}</option>
                          <option value="registered">{t('referrals.status.registered')}</option>
                          <option value="kyc_pending">{t('referrals.status.kyc_pending')}</option>
                          <option value="active">{t('referrals.status.active')}</option>
                          <option value="invested">{t('referrals.status.invested')}</option>
                          <option value="inactive">{t('referrals.status.inactive')}</option>
                        </select>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => onContactClient(client.id)}
                        >
                          {t('referrals.sendMessage')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};