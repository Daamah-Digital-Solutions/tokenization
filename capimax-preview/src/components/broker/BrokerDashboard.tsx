import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import BrokerService from '../../services/broker/BrokerService';
import { ReferralTracker } from './ReferralTracker';
import { CommissionCalculator } from './CommissionCalculator';
import { MarketingMaterials } from './MarketingMaterials';
import { PerformanceAnalytics } from './PerformanceAnalytics';

type TabType = 'overview' | 'commissions' | 'referrals' | 'marketing' | 'analytics';

export const BrokerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['broker', 'dashboard'],
    queryFn: BrokerService.getDashboard,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const { data: commissionSummary } = useQuery({
    queryKey: ['broker', 'commission-summary'],
    queryFn: BrokerService.getCommissionSummary,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          {/* Header Skeleton */}
          <div className="h-8 bg-neutral-200 dark:bg-slate-700 rounded w-1/3"></div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
                <div className="h-4 bg-neutral-200 dark:bg-slate-600 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-neutral-200 dark:bg-slate-600 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <h3 className="text-red-800 dark:text-red-200 font-medium mb-2">Error Loading Dashboard</h3>
          <p className="text-red-600 dark:text-red-300 text-sm">Failed to load broker dashboard data. Please try again.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: '📊' },
    { id: 'commissions' as TabType, label: 'Commissions', icon: '💰' },
    { id: 'referrals' as TabType, label: 'Referrals', icon: '🔗' },
    { id: 'marketing' as TabType, label: 'Marketing', icon: '📢' },
    { id: 'analytics' as TabType, label: 'Analytics', icon: '📈' },
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <p className="text-green-100 text-sm mb-1">Total Earned</p>
          <p className="text-3xl font-bold">{formatCurrency(dashboardData?.total_earned || 0)}</p>
          <p className="text-green-100 text-xs mt-2">All-time earnings</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <p className="text-blue-100 text-sm mb-1">Pending Commission</p>
          <p className="text-3xl font-bold">{formatCurrency(commissionSummary?.pending_amount || 0)}</p>
          <p className="text-blue-100 text-xs mt-2">Awaiting payout</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <p className="text-purple-100 text-sm mb-1">Total Referrals</p>
          <p className="text-3xl font-bold">{dashboardData?.total_referrals || 0}</p>
          <p className="text-purple-100 text-xs mt-2">
            {dashboardData?.successful_referrals || 0} successful
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <p className="text-orange-100 text-sm mb-1">Conversion Rate</p>
          <p className="text-3xl font-bold">{((dashboardData?.conversion_rate || 0) * 100).toFixed(1)}%</p>
          <p className="text-orange-100 text-xs mt-2">Referral to investment</p>
        </div>
      </div>

      {/* Commission Summary */}
      {commissionSummary && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 p-6">
          <h3 className="text-xl font-bold text-neutral-900 dark:text-slate-100 mb-4">
            Commission Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-neutral-600 dark:text-slate-400 mb-1">Total Earned</p>
              <p className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
                {formatCurrency(commissionSummary.total_earned)}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-600 dark:text-slate-400 mb-1">Pending</p>
              <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                {formatCurrency(commissionSummary.pending_amount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-600 dark:text-slate-400 mb-1">Paid Out</p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(commissionSummary.paid_amount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-600 dark:text-slate-400 mb-1">This Month</p>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {formatCurrency(commissionSummary.this_month_earned)}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-600 dark:text-slate-400 mb-1">Last Month</p>
              <p className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
                {formatCurrency(commissionSummary.last_month_earned)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Commissions */}
      {dashboardData?.recent_commissions && dashboardData.recent_commissions.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-slate-100">
              Recent Commissions
            </h3>
            <button
              onClick={() => setActiveTab('commissions')}
              className="text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline"
            >
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {dashboardData.recent_commissions.slice(0, 5).map((commission: any) => (
              <div
                key={commission.id}
                className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-slate-700/50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-neutral-900 dark:text-slate-100">
                    {commission.investment?.property?.title || 'Property Investment'}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-slate-400">
                    {commission.investment?.investor?.full_name || 'Investor'}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-slate-500 mt-1">
                    {formatDate(commission.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(commission.commission_amount)}
                  </p>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      commission.status === 'paid'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : commission.status === 'pending'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {commission.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Referrals */}
      {dashboardData?.recent_referrals && dashboardData.recent_referrals.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-slate-100">
              Recent Referrals
            </h3>
            <button
              onClick={() => setActiveTab('referrals')}
              className="text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline"
            >
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {dashboardData.recent_referrals.slice(0, 5).map((referral: any) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-slate-700/50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-neutral-900 dark:text-slate-100">
                    {referral.referred_user?.full_name || 'New Referral'}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-slate-400">
                    Code: {referral.referral_code}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-slate-500 mt-1">
                    {formatDate(referral.created_at)}
                  </p>
                </div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    referral.status === 'invested'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : referral.status === 'registered'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : referral.status === 'pending'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      : 'bg-neutral-100 dark:bg-slate-600 text-neutral-700 dark:text-slate-400'
                  }`}
                >
                  {referral.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-slate-100">
            Broker Dashboard
          </h1>
          <p className="text-neutral-600 dark:text-slate-400 mt-1">
            Welcome back, {dashboardData?.profile?.user?.full_name || 'Broker'}
          </p>
        </div>
        {dashboardData?.profile && (
          <div className="text-right">
            <p className="text-sm text-neutral-600 dark:text-slate-400">Commission Rate</p>
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {(dashboardData.profile.commission_rate * 100).toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      {/* Profile Status */}
      {dashboardData?.profile && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <p className="font-medium text-neutral-900 dark:text-slate-100">
                  Status:
                  <span
                    className={`ml-2 px-3 py-1 rounded-full text-xs font-medium ${
                      dashboardData.profile.status === 'active'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : dashboardData.profile.status === 'inactive'
                        ? 'bg-neutral-100 dark:bg-slate-600 text-neutral-700 dark:text-slate-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {dashboardData.profile.status}
                  </span>
                </p>
                <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">
                  {dashboardData.profile.specialization} • {dashboardData.profile.years_of_experience} years experience
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-neutral-200 dark:border-slate-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-100'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'commissions' && <CommissionCalculator />}
        {activeTab === 'referrals' && <ReferralTracker />}
        {activeTab === 'marketing' && <MarketingMaterials />}
        {activeTab === 'analytics' && <PerformanceAnalytics />}
      </div>
    </div>
  );
};

export default BrokerDashboard;
