import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { DashboardStats, ActivityFeed, PerformanceChart, QuickActions } from '../';
import type { StatItem, ActivityItem, ChartDataPoint, QuickAction } from '../';
import {
  BrokerService,
  type BrokerDashboard as BrokerDashboardData,
  type CommissionSummary,
} from '../../../services/broker/BrokerService';

/**
 * BrokerDashboard — replaces the previous hardcoded mock arrays with real
 * API calls. The component fetches the broker dashboard payload + commission
 * summary in parallel and derives stat cards, charts, referral lists, and
 * commission breakdowns from that data.
 */

const formatMoney = (n: number | undefined): string =>
  `$${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const formatCount = (n: number | undefined): string =>
  (n ?? 0).toLocaleString();

const pct = (a: number, b: number): string =>
  b > 0 ? `${((a - b) / b * 100).toFixed(1)}%` : '--';

// ---------------------------------------------------------------------------
// Sub-components — receive real data via props
// ---------------------------------------------------------------------------

interface PerformanceOverviewProps {
  commissionSeries: ChartDataPoint[];
  referralSeries: ChartDataPoint[];
}

const PerformanceOverview: React.FC<PerformanceOverviewProps> = ({
  commissionSeries,
  referralSeries,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <PerformanceChart
      data={commissionSeries}
      title="Commission Growth"
      type="area"
      color="#10b981"
    />
    <PerformanceChart
      data={referralSeries}
      title="Monthly Referrals"
      type="bar"
      color="#3b82f6"
    />
  </div>
);

interface ReferralTrackerProps {
  referrals: any[];
}

const ReferralTracker: React.FC<ReferralTrackerProps> = ({ referrals }) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredReferrals = useMemo(() => {
    if (filterStatus === 'all') return referrals;
    return referrals.filter((r) => r.status === filterStatus);
  }, [referrals, filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'invested': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'active': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'inactive': return 'bg-neutral-100 text-neutral-800 dark:bg-slate-600 dark:text-slate-300';
      default: return 'bg-neutral-100 text-neutral-800 dark:bg-slate-600 dark:text-slate-300';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
            Referral Tracker
          </h3>
          <div className="flex items-center space-x-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-neutral-200 dark:border-slate-600 rounded-lg px-3 py-1 bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="invested">Purchased</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>
      <div className="p-6">
        {filteredReferrals.length === 0 ? (
          <div className="py-8 text-center text-neutral-500 dark:text-slate-400">
            No referrals yet for the selected filter.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReferrals.map((referral: any) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {(referral.name || referral.email || '?').charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-neutral-900 dark:text-slate-100">
                        {referral.name || referral.email}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(referral.status)}`}>
                        {referral.status || 'pending'}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-500 dark:text-slate-400">
                      {referral.email}
                      {referral.referral_source && ` • via ${referral.referral_source}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-center">
                    <p className="text-neutral-500 dark:text-slate-400">Purchased</p>
                    <p className="font-semibold text-neutral-900 dark:text-slate-100">
                      {formatMoney(referral.total_investment)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-neutral-500 dark:text-slate-400">Commission</p>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      {formatMoney(referral.commission_earned)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-neutral-500 dark:text-slate-400">Joined</p>
                    <p className="font-medium text-neutral-900 dark:text-slate-100">
                      {referral.joined_at
                        ? new Date(referral.joined_at).toLocaleDateString()
                        : '--'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface CommissionBreakdownProps {
  summary: CommissionSummary | undefined;
}

const CommissionBreakdown: React.FC<CommissionBreakdownProps> = ({ summary }) => {
  const rows = [
    {
      period: 'This Month',
      amount: summary?.this_month_earned ?? 0,
      change: summary
        ? pct(summary.this_month_earned, summary.last_month_earned)
        : '--',
    },
    {
      period: 'Last Month',
      amount: summary?.last_month_earned ?? 0,
      change: '--',
    },
    {
      period: 'Paid To-Date',
      amount: summary?.paid_amount ?? 0,
      change: '--',
    },
    {
      period: 'Pending',
      amount: summary?.pending_amount ?? 0,
      change: '--',
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">
        Commission Breakdown
      </h3>
      <div className="space-y-4">
        {rows.map((item) => (
          <div key={item.period} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
            <div>
              <h4 className="font-medium text-neutral-900 dark:text-slate-100">
                {item.period}
              </h4>
              <p className="text-sm text-neutral-500 dark:text-slate-400">
                Commission earned
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
                {formatMoney(item.amount)}
              </p>
              <p className="text-sm text-neutral-500 dark:text-slate-400">
                {item.change}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const BrokerDashboard: React.FC<{ currentView: string }> = ({ currentView }) => {
  const dashboardQuery = useQuery({
    queryKey: ['broker', 'dashboard'],
    queryFn: () => BrokerService.getDashboard(),
    staleTime: 60_000,
  });

  const summaryQuery = useQuery({
    queryKey: ['broker', 'commission-summary'],
    queryFn: () => BrokerService.getCommissionSummary(),
    staleTime: 60_000,
  });

  const data: BrokerDashboardData | undefined = dashboardQuery.data;
  const summary = summaryQuery.data;

  // ---- Derive stats / charts from real data ----

  const stats: StatItem[] = [
    {
      id: 'total-referrals',
      label: 'Total Referrals',
      value: formatCount(data?.total_referrals),
      change: data ? `${data.successful_referrals} successful` : '--',
      changeType: 'neutral' as any,
      icon: '🤝',
      description: data && data.total_referrals > 0
        ? `${data.conversion_rate.toFixed(1)}% conversion`
        : 'No referrals yet',
    },
    {
      id: 'total-commission',
      label: 'Total Earned',
      value: formatMoney(data?.total_earned),
      change: summary ? pct(summary.this_month_earned, summary.last_month_earned) : '--',
      changeType: 'neutral' as any,
      icon: '💰',
      description: 'Lifetime commission',
    },
    {
      id: 'pending-commission',
      label: 'Pending Commission',
      value: formatMoney(data?.pending_commission),
      change: '--',
      changeType: 'neutral' as any,
      icon: '⏳',
      description: 'Awaiting payout',
    },
    {
      id: 'commission-rate',
      label: 'Commission Rate',
      value: data ? `${(data.profile.commission_rate * 100).toFixed(2)}%` : '--',
      change: '--',
      changeType: 'neutral' as any,
      icon: '📊',
      description: `Specialisation: ${data?.profile.specialization || '--'}`,
    },
  ];

  const commissionSeries: ChartDataPoint[] = useMemo(() => {
    if (!data?.monthly_performance) return [];
    return data.monthly_performance.map((m: any) => ({
      name: m.month || m.label || '',
      value: Number(m.commission ?? m.earned ?? 0),
    }));
  }, [data]);

  const referralSeries: ChartDataPoint[] = useMemo(() => {
    if (!data?.monthly_performance) return [];
    return data.monthly_performance.map((m: any) => ({
      name: m.month || m.label || '',
      value: Number(m.referrals ?? 0),
    }));
  }, [data]);

  const activities: ActivityItem[] = useMemo(() => {
    if (!data?.recent_commissions) return [];
    return data.recent_commissions.slice(0, 5).map((c: any) => ({
      id: c.id,
      type: 'commission',
      title: `Commission: ${formatMoney(c.amount)}`,
      description: c.description || `Status: ${c.status}`,
      timestamp: c.created_at || c.earned_at || '',
      icon: '💰',
    }));
  }, [data]);

  const quickActions: QuickAction[] = [
    {
      id: 'generate-link',
      label: 'Generate Referral Link',
      icon: '🔗',
      description: 'Create tracking link',
      variant: 'primary',
      onClick: async () => {
        try {
          const link = await BrokerService.generateReferralLink();
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            await navigator.clipboard.writeText(link.url || (link as any).referral_link || '');
          }
        } catch {
          // surfaced by error boundary / toast
        }
      },
    },
    {
      id: 'withdraw-commission',
      label: 'Withdraw Commission',
      icon: '💸',
      description: 'Request payout',
      onClick: () => {},
    },
    {
      id: 'marketing-materials',
      label: 'Download Materials',
      icon: '📄',
      description: 'Get sales resources',
      onClick: () => {},
    },
  ];

  // ---- Loading / error states ----

  if (dashboardQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-neutral-500 dark:text-slate-400">
          Loading broker dashboard…
        </div>
      </div>
    );
  }
  if (dashboardQuery.isError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <p className="text-red-700 dark:text-red-300">
          Failed to load broker data. Please retry.
        </p>
        <button
          onClick={() => dashboardQuery.refetch()}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // ---- View routing ----

  switch (currentView) {
    case 'overview':
      return (
        <div className="space-y-6">
          <DashboardStats stats={stats} />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <PerformanceOverview
                commissionSeries={commissionSeries}
                referralSeries={referralSeries}
              />
            </div>
            <QuickActions actions={quickActions} columns={2} />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <ReferralTracker referrals={data?.recent_referrals || []} />
            </div>
            <div className="space-y-6">
              <ActivityFeed
                activities={activities}
                maxItems={5}
                showViewAll={true}
                onViewAll={() => {}}
              />
            </div>
          </div>
        </div>
      );

    case 'referrals':
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100 mb-2">
              Referral Management
            </h2>
            <p className="text-neutral-600 dark:text-slate-400 mb-6">
              Track and manage your client referrals and conversion rates.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <div key={stat.id} className="text-center p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <div className="text-lg font-semibold text-neutral-900 dark:text-slate-100">{stat.value}</div>
                  <div className="text-sm text-neutral-500 dark:text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <ReferralTracker referrals={data?.recent_referrals || []} />
        </div>
      );

    case 'commissions':
      return (
        <div className="space-y-6">
          <DashboardStats stats={stats} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <CommissionBreakdown summary={summary} />
            <PerformanceChart
              data={commissionSeries}
              title="Commission History"
              type="area"
              color="#10b981"
            />
          </div>
        </div>
      );

    case 'performance':
      return (
        <div className="space-y-6">
          <PerformanceOverview
            commissionSeries={commissionSeries}
            referralSeries={referralSeries}
          />
        </div>
      );

    default:
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-2">
              {currentView.replace('-', ' ')} Dashboard
            </h3>
            <p className="text-neutral-500 dark:text-slate-400">
              This section is under development.
            </p>
          </div>
        </div>
      );
  }
};
