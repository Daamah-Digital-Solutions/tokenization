import React, { useState } from 'react';
import { DashboardStats, ActivityFeed, PerformanceChart, QuickActions } from '../';
import type { StatItem, ActivityItem, ChartDataPoint, QuickAction } from '../';

// Mock data for admin dashboard
const mockAdminStats: StatItem[] = [
  {
    id: 'total-users',
    label: 'Total Users',
    value: '2,847',
    change: '+156',
    changeType: 'positive',
    icon: '👥',
    description: 'Registered users'
  },
  {
    id: 'platform-volume',
    label: 'Platform Volume',
    value: '$12.4M',
    change: '+23.7%',
    changeType: 'positive',
    icon: '💰',
    description: 'Total transaction volume'
  },
  {
    id: 'active-properties',
    label: 'Active Properties',
    value: '89',
    change: '+8',
    changeType: 'positive',
    icon: '🏢',
    description: 'Properties on platform'
  },
  {
    id: 'platform-revenue',
    label: 'Platform Revenue',
    value: '$89,450',
    change: '+18.2%',
    changeType: 'positive',
    icon: '📈',
    description: 'Monthly platform fees'
  }
];

const mockPlatformData: ChartDataPoint[] = [
  { date: '2024-01-01', value: 8200000, label: 'Jan' },
  { date: '2024-02-01', value: 8800000, label: 'Feb' },
  { date: '2024-03-01', value: 9200000, label: 'Mar' },
  { date: '2024-04-01', value: 9800000, label: 'Apr' },
  { date: '2024-05-01', value: 10400000, label: 'May' },
  { date: '2024-06-01', value: 11200000, label: 'Jun' },
  { date: '2024-07-01', value: 11800000, label: 'Jul' },
  { date: '2024-08-01', value: 12400000, label: 'Aug' }
];

const mockUserGrowthData: ChartDataPoint[] = [
  { date: '2024-01-01', value: 1200 },
  { date: '2024-02-01', value: 1350 },
  { date: '2024-03-01', value: 1520 },
  { date: '2024-04-01', value: 1780 },
  { date: '2024-05-01', value: 2000 },
  { date: '2024-06-01', value: 2240 },
  { date: '2024-07-01', value: 2550 },
  { date: '2024-08-01', value: 2847 }
];

const mockAdminActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'system',
    title: 'New Property Approved',
    description: 'Marina Bay Luxury Residences approved for tokenization',
    timestamp: '2024-08-26T11:30:00Z',
    status: 'completed'
  },
  {
    id: '2',
    type: 'system',
    title: 'KYC Verification Completed',
    description: '15 users completed KYC verification process',
    timestamp: '2024-08-26T09:15:00Z',
    status: 'completed'
  },
  {
    id: '3',
    type: 'transaction',
    title: 'Large Transaction Alert',
    description: 'Single investment of $250,000 detected',
    amount: '$250,000',
    timestamp: '2024-08-25T16:45:00Z',
    status: 'completed'
  },
  {
    id: '4',
    type: 'system',
    title: 'Platform Maintenance',
    description: 'Scheduled maintenance completed successfully',
    timestamp: '2024-08-25T02:00:00Z',
    status: 'completed'
  },
  {
    id: '5',
    type: 'system',
    title: 'Security Alert Resolved',
    description: 'Suspicious login attempts blocked',
    timestamp: '2024-08-24T14:30:00Z',
    status: 'completed'
  }
];

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: 'investor' | 'property_owner';
  joinDate: string;
  kycStatus: 'verified' | 'pending' | 'rejected';
  totalInvestment?: number;
  propertiesOwned?: number;
  lastActive: string;
}

const mockUsers: PlatformUser[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@example.com',
    role: 'investor',
    joinDate: '2024-08-20',
    kycStatus: 'pending',
    totalInvestment: 45000,
    lastActive: '2024-08-26T10:30:00Z'
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    role: 'property_owner',
    joinDate: '2024-08-18',
    kycStatus: 'verified',
    propertiesOwned: 2,
    lastActive: '2024-08-26T09:15:00Z'
  },
  {
    id: '3',
    name: 'Michael Chen',
    email: 'michael.chen@example.com',
    role: 'investor',
    joinDate: '2024-08-15',
    kycStatus: 'verified',
    totalInvestment: 82000,
    lastActive: '2024-08-25T18:45:00Z'
  },
  {
    id: '4',
    name: 'Emily Davis',
    email: 'emily.davis@example.com',
    role: 'property_owner',
    joinDate: '2024-08-12',
    kycStatus: 'rejected',
    propertiesOwned: 1,
    lastActive: '2024-08-24T14:20:00Z'
  }
];

interface PlatformProperty {
  id: string;
  name: string;
  owner: string;
  location: string;
  value: number;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed';
  submissionDate: string;
  approvalDate?: string;
  tokensIssued?: number;
  fundingProgress: number;
}

const mockPlatformProperties: PlatformProperty[] = [
  {
    id: '1',
    name: 'Marina Bay Luxury Residences',
    owner: 'Sarah Johnson',
    location: 'San Francisco, CA',
    value: 2400000,
    status: 'pending',
    submissionDate: '2024-08-25',
    tokensIssued: 24000,
    fundingProgress: 0
  },
  {
    id: '2',
    name: 'Downtown Office Complex',
    owner: 'Michael Properties LLC',
    location: 'Austin, TX',
    value: 1800000,
    status: 'active',
    submissionDate: '2024-06-15',
    approvalDate: '2024-06-20',
    tokensIssued: 18000,
    fundingProgress: 100
  },
  {
    id: '3',
    name: 'Tech Campus Mixed-Use',
    owner: 'Emily Davis',
    location: 'Seattle, WA',
    value: 3200000,
    status: 'approved',
    submissionDate: '2024-07-10',
    approvalDate: '2024-07-15',
    tokensIssued: 32000,
    fundingProgress: 85
  }
];

const PlatformMetrics: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PerformanceChart
        data={mockPlatformData}
        title="Platform Transaction Volume"
        type="area"
        color="#3b82f6"
      />
      <PerformanceChart
        data={mockUserGrowthData}
        title="User Growth"
        type="line"
        color="#10b981"
      />
    </div>
  );
};

const UserManagement: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
            User Management
          </h3>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-medium rounded-full">
              4 Pending KYC
            </span>
            <button className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">
              View All
            </button>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {mockUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-neutral-900 dark:text-slate-100">
                      {user.name}
                    </h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.kycStatus === 'verified'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : user.kycStatus === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {user.kycStatus}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-slate-400">
                    {user.email} • {user.role.replace('_', ' ')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-right">
                  <p className="text-neutral-500 dark:text-slate-400">Joined</p>
                  <p className="font-medium text-neutral-900 dark:text-slate-100">
                    {new Date(user.joinDate).toLocaleDateString()}
                  </p>
                </div>
                {user.totalInvestment && (
                  <div className="text-right">
                    <p className="text-neutral-500 dark:text-slate-400">Investment</p>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      ${user.totalInvestment.toLocaleString()}
                    </p>
                  </div>
                )}
                {user.propertiesOwned && (
                  <div className="text-right">
                    <p className="text-neutral-500 dark:text-slate-400">Properties</p>
                    <p className="font-semibold text-neutral-900 dark:text-slate-100">
                      {user.propertiesOwned}
                    </p>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <button className="px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded hover:bg-primary-700 transition-colors">
                    Review
                  </button>
                  <button className="px-3 py-1 bg-neutral-200 text-neutral-700 dark:bg-slate-600 dark:text-slate-300 text-xs font-medium rounded hover:bg-neutral-300 dark:hover:bg-slate-500 transition-colors">
                    Message
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

const PropertyApproval: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
            Property Approval Queue
          </h3>
          <span className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-medium rounded-full">
            2 Pending Review
          </span>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {mockPlatformProperties.map((property) => (
            <div
              key={property.id}
              className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-lg">🏢</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-slate-100">
                      {property.name}
                    </h4>
                    <p className="text-sm text-neutral-500 dark:text-slate-400">
                      {property.location} • by {property.owner}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    property.status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : property.status === 'approved'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      : property.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {property.status}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <p className="text-neutral-500 dark:text-slate-400">Property Value</p>
                  <p className="font-semibold text-neutral-900 dark:text-slate-100">
                    ${property.value.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500 dark:text-slate-400">Submitted</p>
                  <p className="font-medium text-neutral-900 dark:text-slate-100">
                    {new Date(property.submissionDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500 dark:text-slate-400">Tokens</p>
                  <p className="font-medium text-neutral-900 dark:text-slate-100">
                    {property.tokensIssued?.toLocaleString() || 'TBD'}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500 dark:text-slate-400">Funding</p>
                  <p className="font-medium text-neutral-900 dark:text-slate-100">
                    {property.fundingProgress}%
                  </p>
                </div>
              </div>

              {property.status === 'pending' && (
                <div className="flex items-center space-x-2">
                  <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors">
                    Approve
                  </button>
                  <button className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors">
                    Reject
                  </button>
                  <button className="px-4 py-2 bg-neutral-200 text-neutral-700 dark:bg-slate-600 dark:text-slate-300 text-sm font-medium rounded hover:bg-neutral-300 dark:hover:bg-slate-500 transition-colors">
                    Review Details
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TransactionMonitoring: React.FC = () => {
  const recentTransactions = [
    { id: '1', type: 'Investment', user: 'John Smith', property: 'Marina Bay Condos', amount: 25000, timestamp: '2024-08-26T10:30:00Z', status: 'completed' },
    { id: '2', type: 'Withdrawal', user: 'Sarah Johnson', property: 'Downtown Office', amount: 5000, timestamp: '2024-08-25T16:45:00Z', status: 'pending' },
    { id: '3', type: 'Dividend', user: 'Michael Chen', property: 'Tech Campus', amount: 1200, timestamp: '2024-08-25T09:15:00Z', status: 'completed' },
    { id: '4', type: 'Investment', user: 'Emily Davis', property: 'Retail Center', amount: 45000, timestamp: '2024-08-24T14:20:00Z', status: 'completed' }
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
          Recent Transactions
        </h3>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          {recentTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                  <span className="text-sm">
                    {transaction.type === 'Investment' ? '📈' : transaction.type === 'Withdrawal' ? '📉' : '💰'}
                  </span>
                </div>
                <div>
                  <h4 className="font-medium text-neutral-900 dark:text-slate-100">
                    {transaction.type} - {transaction.property}
                  </h4>
                  <p className="text-sm text-neutral-500 dark:text-slate-400">
                    {transaction.user} • {new Date(transaction.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className="font-semibold text-neutral-900 dark:text-slate-100">
                  ${transaction.amount.toLocaleString()}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  transaction.status === 'completed'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                  {transaction.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SystemHealth: React.FC = () => {
  const systemMetrics = [
    { label: 'API Response Time', value: '245ms', status: 'good', target: '<500ms' },
    { label: 'System Uptime', value: '99.98%', status: 'excellent', target: '>99.9%' },
    { label: 'Database Performance', value: '1.2s', status: 'warning', target: '<1s' },
    { label: 'Active Connections', value: '1,247', status: 'good', target: '<2000' },
    { label: 'Error Rate', value: '0.02%', status: 'excellent', target: '<0.1%' },
    { label: 'Storage Usage', value: '67%', status: 'good', target: '<80%' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'good': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-neutral-100 text-neutral-800 dark:bg-slate-600 dark:text-slate-300';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
          System Health
        </h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemMetrics.map((metric) => (
            <div key={metric.label} className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-neutral-700 dark:text-slate-300">
                  {metric.label}
                </h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(metric.status)}`}>
                  {metric.status}
                </span>
              </div>
              <p className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-1">
                {metric.value}
              </p>
              <p className="text-xs text-neutral-500 dark:text-slate-400">
                Target: {metric.target}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AdminDashboard: React.FC<{ currentView: string }> = ({ currentView }) => {
  const quickActions: QuickAction[] = [
    {
      id: 'approve-users',
      label: 'Review KYC',
      icon: '✅',
      description: '4 pending approvals',
      variant: 'warning',
      onClick: () => console.log('Navigate to user approvals')
    },
    {
      id: 'review-properties',
      label: 'Review Properties',
      icon: '🏢',
      description: '2 pending reviews',
      variant: 'primary',
      onClick: () => console.log('Navigate to property reviews')
    },
    {
      id: 'system-alerts',
      label: 'System Alerts',
      icon: '⚠️',
      description: 'View system status',
      onClick: () => console.log('View system alerts')
    },
    {
      id: 'generate-report',
      label: 'Generate Report',
      icon: '📊',
      description: 'Platform analytics',
      onClick: () => console.log('Generate platform report')
    }
  ];

  switch (currentView) {
    case 'overview':
      return (
        <div className="space-y-6">
          <DashboardStats stats={mockAdminStats} />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <PlatformMetrics />
            </div>
            <QuickActions actions={quickActions} columns={2} />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <TransactionMonitoring />
            </div>
            <ActivityFeed 
              activities={mockAdminActivities} 
              maxItems={5}
              showViewAll={true}
              onViewAll={() => console.log('View all activities')}
            />
          </div>
        </div>
      );

    case 'users':
      return (
        <div className="space-y-6">
          <UserManagement />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">
                User Statistics
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Total Users', value: '2,847', change: '+156' },
                  { label: 'Verified Users', value: '2,234', change: '+98' },
                  { label: 'Pending KYC', value: '234', change: '+12' },
                  { label: 'Active This Month', value: '1,892', change: '+245' }
                ].map((stat) => (
                  <div key={stat.label} className="flex justify-between">
                    <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">
                      {stat.label}
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
                        {stat.value}
                      </span>
                      <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                        {stat.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">
                User Types
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Investors', percentage: 78, count: 2219 },
                  { label: 'Property Owners', percentage: 22, count: 628 }
                ].map((segment) => (
                  <div key={segment.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">
                        {segment.label}
                      </span>
                      <span className="text-sm text-neutral-500 dark:text-slate-400">
                        {segment.count}
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-slate-600 rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full"
                        style={{ width: `${segment.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">
                Geographic Distribution
              </h3>
              <div className="space-y-2">
                {[
                  { region: 'North America', percentage: 45 },
                  { region: 'Europe', percentage: 28 },
                  { region: 'Asia', percentage: 18 },
                  { region: 'Others', percentage: 9 }
                ].map((region) => (
                  <div key={region.region} className="flex justify-between">
                    <span className="text-sm text-neutral-600 dark:text-slate-400">
                      {region.region}
                    </span>
                    <span className="text-sm font-medium text-neutral-900 dark:text-slate-100">
                      {region.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );

    case 'properties-admin':
      return (
        <div className="space-y-6">
          <PropertyApproval />
        </div>
      );

    case 'transactions-admin':
      return (
        <div className="space-y-6">
          <TransactionMonitoring />
          <PlatformMetrics />
        </div>
      );

    case 'platform':
      return (
        <div className="space-y-6">
          <PlatformMetrics />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Daily Active Users', value: '1,247', change: '+5.2%' },
              { label: 'Transaction Volume', value: '$458K', change: '+12.8%' },
              { label: 'Platform Fees', value: '$12.4K', change: '+18.3%' },
              { label: 'Success Rate', value: '99.2%', change: '+0.1%' }
            ].map((metric) => (
              <div key={metric.label} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-neutral-500 dark:text-slate-400 mb-2">
                  {metric.label}
                </h3>
                <p className="text-2xl font-bold text-neutral-900 dark:text-slate-100">
                  {metric.value}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  {metric.change}
                </p>
              </div>
            ))}
          </div>
        </div>
      );

    case 'system':
      return (
        <div className="space-y-6">
          <SystemHealth />
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