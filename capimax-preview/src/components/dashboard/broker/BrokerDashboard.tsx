import React, { useState } from 'react';
import { DashboardStats, ActivityFeed, PerformanceChart, QuickActions } from '../';
import type { StatItem, ActivityItem, ChartDataPoint, QuickAction } from '../';

// Mock data for broker dashboard
const mockBrokerStats: StatItem[] = [
  {
    id: 'total-referrals',
    label: 'Total Referrals',
    value: '127',
    change: '+23',
    changeType: 'positive',
    icon: '🤝',
    description: 'Referred clients this month'
  },
  {
    id: 'total-commission',
    label: 'Total Commission',
    value: '$24,680',
    change: '+15.4%',
    changeType: 'positive',
    icon: '💰',
    description: 'Total commission earned'
  },
  {
    id: 'active-clients',
    label: 'Active Clients',
    value: '89',
    change: '+12',
    changeType: 'positive',
    icon: '👥',
    description: 'Currently active referrals'
  },
  {
    id: 'monthly-commission',
    label: 'Monthly Commission',
    value: '$3,450',
    change: '+18.7%',
    changeType: 'positive',
    icon: '📈',
    description: 'This month\'s earnings'
  }
];

const mockCommissionData: ChartDataPoint[] = [
  { date: '2024-01-01', value: 1200, label: 'Jan' },
  { date: '2024-02-01', value: 1450, label: 'Feb' },
  { date: '2024-03-01', value: 1800, label: 'Mar' },
  { date: '2024-04-01', value: 2100, label: 'Apr' },
  { date: '2024-05-01', value: 2400, label: 'May' },
  { date: '2024-06-01', value: 2800, label: 'Jun' },
  { date: '2024-07-01', value: 3100, label: 'Jul' },
  { date: '2024-08-01', value: 3450, label: 'Aug' }
];

const mockReferralData: ChartDataPoint[] = [
  { date: '2024-01-01', value: 8 },
  { date: '2024-02-01', value: 12 },
  { date: '2024-03-01', value: 15 },
  { date: '2024-04-01', value: 18 },
  { date: '2024-05-01', value: 22 },
  { date: '2024-06-01', value: 19 },
  { date: '2024-07-01', value: 25 },
  { date: '2024-08-01', value: 23 }
];

const mockBrokerActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'referral',
    title: 'New Client Referral',
    description: 'John Smith referred for Luxury Apartment Complex',
    amount: '+$500',
    timestamp: '2024-08-26T10:30:00Z',
    status: 'completed'
  },
  {
    id: '2',
    type: 'commission',
    title: 'Commission Payment',
    description: 'Monthly commission for Q2 referrals',
    amount: '+$2,340',
    timestamp: '2024-08-25T09:15:00Z',
    status: 'completed'
  },
  {
    id: '3',
    type: 'referral_success',
    title: 'Referral Investment',
    description: 'Sarah Johnson completed $25k investment',
    amount: '+$750',
    timestamp: '2024-08-24T14:20:00Z',
    status: 'completed'
  },
  {
    id: '4',
    type: 'milestone',
    title: 'Performance Milestone',
    description: 'Reached 100 total referrals milestone',
    timestamp: '2024-08-20T11:00:00Z',
    status: 'completed'
  },
  {
    id: '5',
    type: 'commission',
    title: 'Pending Commission',
    description: 'Commission for recent referrals pending',
    amount: '+$1,250',
    timestamp: '2024-08-18T16:45:00Z',
    status: 'pending'
  }
];

interface ReferralClient {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  status: 'active' | 'invested' | 'pending' | 'inactive';
  totalInvestment: number;
  commissionEarned: number;
  lastActivity: string;
  referralSource: string;
}

const mockReferrals: ReferralClient[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@example.com',
    joinDate: '2024-08-20',
    status: 'invested',
    totalInvestment: 45000,
    commissionEarned: 1350,
    lastActivity: '2024-08-26T10:30:00Z',
    referralSource: 'LinkedIn'
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    joinDate: '2024-08-18',
    status: 'active',
    totalInvestment: 0,
    commissionEarned: 0,
    lastActivity: '2024-08-26T09:15:00Z',
    referralSource: 'Direct Contact'
  },
  {
    id: '3',
    name: 'Michael Chen',
    email: 'michael.chen@example.com',
    joinDate: '2024-08-15',
    status: 'invested',
    totalInvestment: 82000,
    commissionEarned: 2460,
    lastActivity: '2024-08-25T18:45:00Z',
    referralSource: 'Website'
  },
  {
    id: '4',
    name: 'Emily Davis',
    email: 'emily.davis@example.com',
    joinDate: '2024-08-12',
    status: 'pending',
    totalInvestment: 0,
    commissionEarned: 0,
    lastActivity: '2024-08-24T14:20:00Z',
    referralSource: 'Social Media'
  }
];

const PerformanceOverview: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PerformanceChart
        data={mockCommissionData}
        title="Commission Growth"
        type="area"
        color="#10b981"
      />
      <PerformanceChart
        data={mockReferralData}
        title="Monthly Referrals"
        type="bar"
        color="#3b82f6"
      />
    </div>
  );
};

const ReferralTracker: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredReferrals = filterStatus === 'all' 
    ? mockReferrals 
    : mockReferrals.filter(referral => referral.status === filterStatus);

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
              <option value="invested">Invested</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
            <button className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">
              Generate Link
            </button>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {filteredReferrals.map((referral) => (
            <div
              key={referral.id}
              className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {referral.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-neutral-900 dark:text-slate-100">
                      {referral.name}
                    </h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(referral.status)}`}>
                      {referral.status}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-slate-400">
                    {referral.email} • via {referral.referralSource}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <p className="text-neutral-500 dark:text-slate-400">Investment</p>
                  <p className="font-semibold text-neutral-900 dark:text-slate-100">
                    ${referral.totalInvestment.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-neutral-500 dark:text-slate-400">Commission</p>
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    ${referral.commissionEarned.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-neutral-500 dark:text-slate-400">Joined</p>
                  <p className="font-medium text-neutral-900 dark:text-slate-100">
                    {new Date(referral.joinDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded hover:bg-primary-700 transition-colors">
                    Contact
                  </button>
                  <button className="px-3 py-1 bg-neutral-200 text-neutral-700 dark:bg-slate-600 dark:text-slate-300 text-xs font-medium rounded hover:bg-neutral-300 dark:hover:bg-slate-500 transition-colors">
                    Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CommissionBreakdown: React.FC = () => {
  const commissionBreakdown = [
    { period: 'This Month', amount: 3450, change: '+18.7%', color: 'text-green-600' },
    { period: 'Last Month', amount: 2910, change: '+12.4%', color: 'text-green-600' },
    { period: 'Q3 Total', amount: 8760, change: '+25.2%', color: 'text-green-600' },
    { period: 'Year to Date', amount: 24680, change: '+31.8%', color: 'text-green-600' }
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">
        Commission Breakdown
      </h3>
      <div className="space-y-4">
        {commissionBreakdown.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
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
                ${item.amount.toLocaleString()}
              </p>
              <p className={`text-sm ${item.color} dark:text-green-400`}>
                {item.change}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MarketingMaterials: React.FC = () => {
  const materials = [
    { id: 1, name: 'Investment Overview Brochure', type: 'PDF', size: '2.4MB', downloads: 45 },
    { id: 2, name: 'Platform Demo Video', type: 'MP4', size: '25.6MB', downloads: 78 },
    { id: 3, name: 'ROI Calculator Spreadsheet', type: 'XLSX', size: '1.2MB', downloads: 32 },
    { id: 4, name: 'Property Portfolio Images', type: 'ZIP', size: '15.8MB', downloads: 23 },
    { id: 5, name: 'Tokenization Guide', type: 'PDF', size: '3.1MB', downloads: 67 }
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
            Marketing Materials
          </h3>
          <button className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">
            Request New Material
          </button>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          {materials.map((material) => (
            <div
              key={material.id}
              className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-sm">📄</span>
                </div>
                <div>
                  <h4 className="font-medium text-neutral-900 dark:text-slate-100">
                    {material.name}
                  </h4>
                  <p className="text-sm text-neutral-500 dark:text-slate-400">
                    {material.type} • {material.size} • {material.downloads} downloads
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded hover:bg-primary-700 transition-colors">
                  Download
                </button>
                <button className="px-3 py-1 bg-neutral-200 text-neutral-700 dark:bg-slate-600 dark:text-slate-300 text-xs font-medium rounded hover:bg-neutral-300 dark:hover:bg-slate-500 transition-colors">
                  Share
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PerformanceAnalytics: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Conversion Metrics */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">
          Conversion Metrics
        </h3>
        <div className="space-y-3">
          {[
            { label: 'Lead to Signup', percentage: 68, color: 'bg-blue-500' },
            { label: 'Signup to Investment', percentage: 42, color: 'bg-green-500' },
            { label: 'Overall Conversion', percentage: 29, color: 'bg-purple-500' }
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded ${item.color}`}></div>
                <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">
                  {item.label}
                </span>
              </div>
              <span className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
                {item.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performing Sources */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">
          Top Referral Sources
        </h3>
        <div className="space-y-4">
          {[
            { source: 'LinkedIn', referrals: 34, commission: 8420 },
            { source: 'Direct Contact', referrals: 28, commission: 6780 },
            { source: 'Website', referrals: 22, commission: 5340 },
            { source: 'Social Media', referrals: 18, commission: 4120 }
          ].map((item) => (
            <div key={item.source} className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">
                  {item.source}
                </span>
                <p className="text-xs text-neutral-500 dark:text-slate-400">
                  {item.referrals} referrals
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
                  ${item.commission.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const BrokerDashboard: React.FC<{ currentView: string }> = ({ currentView }) => {
  const quickActions: QuickAction[] = [
    {
      id: 'generate-link',
      label: 'Generate Referral Link',
      icon: '🔗',
      description: 'Create tracking link',
      variant: 'primary',
      onClick: () => console.log('Generate referral link')
    },
    {
      id: 'contact-leads',
      label: 'Contact Leads',
      icon: '📞',
      description: 'Follow up with prospects',
      onClick: () => console.log('Contact leads')
    },
    {
      id: 'withdraw-commission',
      label: 'Withdraw Commission',
      icon: '💸',
      description: 'Request payout',
      onClick: () => console.log('Withdraw commission')
    },
    {
      id: 'marketing-materials',
      label: 'Download Materials',
      icon: '📄',
      description: 'Get sales resources',
      onClick: () => console.log('Download marketing materials')
    }
  ];

  switch (currentView) {
    case 'overview':
      return (
        <div className="space-y-6">
          <DashboardStats stats={mockBrokerStats} />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <PerformanceOverview />
            </div>
            <QuickActions actions={quickActions} columns={2} />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <ReferralTracker />
            </div>
            <div className="space-y-6">
              <ActivityFeed 
                activities={mockBrokerActivities} 
                maxItems={5}
                showViewAll={true}
                onViewAll={() => console.log('View all activities')}
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
              Track and manage your client referrals and conversion rates
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {mockBrokerStats.map((stat) => (
                <div key={stat.id} className="text-center p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <div className="text-lg font-semibold text-neutral-900 dark:text-slate-100">{stat.value}</div>
                  <div className="text-sm text-neutral-500 dark:text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <ReferralTracker />
          <PerformanceAnalytics />
        </div>
      );

    case 'commissions':
      return (
        <div className="space-y-6">
          <DashboardStats 
            stats={[
              {
                id: 'pending-commission',
                label: 'Pending Commission',
                value: '$2,480',
                description: 'Awaiting payout',
                icon: '⏳'
              },
              {
                id: 'paid-commission',
                label: 'Paid This Month',
                value: '$3,450',
                change: '+18.7%',
                changeType: 'positive',
                icon: '💰'
              },
              {
                id: 'commission-rate',
                label: 'Commission Rate',
                value: '3.5%',
                description: 'Current tier rate',
                icon: '📊'
              },
              {
                id: 'next-payout',
                label: 'Next Payout',
                value: 'Sep 1',
                description: 'Estimated $2,480',
                icon: '📅'
              }
            ]}
          />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <CommissionBreakdown />
            <PerformanceChart
              data={mockCommissionData}
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
          <PerformanceOverview />
          <PerformanceAnalytics />
        </div>
      );

    case 'marketing-materials':
      return (
        <div className="space-y-6">
          <MarketingMaterials />
        </div>
      );

    default:
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <span className="text-4xl mb-4 block">🚧</span>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-2">
              {currentView.replace('-', ' ')} Dashboard
            </h3>
            <p className="text-neutral-500 dark:text-slate-400">
              This section is under development
            </p>
          </div>
        </div>
      );
  }
};