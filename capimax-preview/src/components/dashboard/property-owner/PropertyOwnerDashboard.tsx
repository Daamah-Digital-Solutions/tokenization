import React, { useState } from 'react';
import { DashboardStats, ActivityFeed, PerformanceChart, QuickActions } from '../';
import type { StatItem, ActivityItem, ChartDataPoint, QuickAction } from '../';
import PropertyApprovalStatus from '../../property-owner/PropertyApprovalStatus';

// Mock data for property owner dashboard
const mockOwnerStats: StatItem[] = [
  {
    id: 'total-properties',
    label: 'Total Properties',
    value: '4',
    change: '+1',
    changeType: 'positive',
    icon: '🏢',
    description: 'Properties tokenized'
  },
  {
    id: 'total-raised',
    label: 'Capital Raised',
    value: '$2.4M',
    change: '+18.3%',
    changeType: 'positive',
    icon: '💰',
    description: 'From token sales'
  },
  {
    id: 'active-investors',
    label: 'Active Investors',
    value: '127',
    change: '+12',
    changeType: 'positive',
    icon: '👥',
    description: 'Across all properties'
  },
  {
    id: 'monthly-revenue',
    label: 'Monthly Revenue',
    value: '$18,450',
    change: '+7.2%',
    changeType: 'positive',
    icon: '📈',
    description: 'Rental income generated'
  }
];

const mockRevenueData: ChartDataPoint[] = [
  { date: '2024-01-01', value: 15200, label: 'Jan' },
  { date: '2024-02-01', value: 16100, label: 'Feb' },
  { date: '2024-03-01', value: 15800, label: 'Mar' },
  { date: '2024-04-01', value: 17200, label: 'Apr' },
  { date: '2024-05-01', value: 16900, label: 'May' },
  { date: '2024-06-01', value: 17800, label: 'Jun' },
  { date: '2024-07-01', value: 17500, label: 'Jul' },
  { date: '2024-08-01', value: 18450, label: 'Aug' }
];

const mockTokenSalesData: ChartDataPoint[] = [
  { date: '2024-01-01', value: 180000 },
  { date: '2024-02-01', value: 250000 },
  { date: '2024-03-01', value: 320000 },
  { date: '2024-04-01', value: 420000 },
  { date: '2024-05-01', value: 580000 },
  { date: '2024-06-01', value: 750000 },
  { date: '2024-07-01', value: 920000 },
  { date: '2024-08-01', value: 1200000 }
];

const mockOwnerActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'property_update',
    title: 'New Property Listed',
    description: 'Marina Bay Luxury Residences went live',
    timestamp: '2024-08-26T10:30:00Z',
    status: 'completed'
  },
  {
    id: '2',
    type: 'transaction',
    title: 'Token Sale Milestone',
    description: 'Downtown Office reached 75% funding',
    amount: '+$450,000',
    timestamp: '2024-08-25T14:15:00Z',
    status: 'completed'
  },
  {
    id: '3',
    type: 'dividend',
    title: 'Revenue Distribution',
    description: 'Monthly rental income distributed to investors',
    amount: '$12,300',
    timestamp: '2024-08-24T09:00:00Z',
    status: 'completed'
  },
  {
    id: '4',
    type: 'investment',
    title: 'New Investor Onboarded',
    description: '5 new investors joined Tech Campus project',
    timestamp: '2024-08-23T16:45:00Z',
    status: 'completed'
  },
  {
    id: '5',
    type: 'system',
    title: 'Property Valuation Update',
    description: 'Quarterly valuation completed for all properties',
    timestamp: '2024-08-20T11:30:00Z',
    status: 'completed'
  }
];

interface TokenizedProperty {
  id: string;
  name: string;
  location: string;
  totalValue: number;
  tokensIssued: number;
  tokensSold: number;
  fundingProgress: number;
  monthlyRevenue: number;
  investors: number;
  status: 'active' | 'funding' | 'completed' | 'pending';
  image?: string;
}

const mockProperties: TokenizedProperty[] = [
  {
    id: '1',
    name: 'Marina Bay Luxury Residences',
    location: 'San Francisco, CA',
    totalValue: 2400000,
    tokensIssued: 24000,
    tokensSold: 18000,
    fundingProgress: 75,
    monthlyRevenue: 8200,
    investors: 45,
    status: 'funding'
  },
  {
    id: '2',
    name: 'Downtown Office Complex',
    location: 'Austin, TX',
    totalValue: 1800000,
    tokensIssued: 18000,
    tokensSold: 18000,
    fundingProgress: 100,
    monthlyRevenue: 6500,
    investors: 52,
    status: 'active'
  },
  {
    id: '3',
    name: 'Tech Campus Mixed-Use',
    location: 'Seattle, WA',
    totalValue: 3200000,
    tokensIssued: 32000,
    tokensSold: 28800,
    fundingProgress: 90,
    monthlyRevenue: 11200,
    investors: 38,
    status: 'funding'
  },
  {
    id: '4',
    name: 'Riverside Retail Center',
    location: 'Portland, OR',
    totalValue: 1500000,
    tokensIssued: 15000,
    tokensSold: 15000,
    fundingProgress: 100,
    monthlyRevenue: 4800,
    investors: 29,
    status: 'active'
  }
];

const PropertyOverview: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
          Property Portfolio
        </h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {mockProperties.map((property) => (
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
                      {property.location}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    property.status === 'active' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : property.status === 'funding'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-neutral-100 text-neutral-800 dark:bg-slate-600 dark:text-slate-300'
                  }`}>
                    {property.status}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-neutral-500 dark:text-slate-400">Total Value</p>
                  <p className="font-semibold text-neutral-900 dark:text-slate-100">
                    ${property.totalValue.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500 dark:text-slate-400">Funding</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-neutral-200 dark:bg-slate-600 rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full"
                        style={{ width: `${property.fundingProgress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium">{property.fundingProgress}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-neutral-500 dark:text-slate-400">Monthly Revenue</p>
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    ${property.monthlyRevenue.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500 dark:text-slate-400">Investors</p>
                  <p className="font-semibold text-neutral-900 dark:text-slate-100">
                    {property.investors}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500 dark:text-slate-400">Tokens Sold</p>
                  <p className="font-semibold text-neutral-900 dark:text-slate-100">
                    {property.tokensSold.toLocaleString()}/{property.tokensIssued.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TokenizationProgress: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PerformanceChart
        data={mockTokenSalesData}
        title="Token Sales Progress"
        type="area"
        color="#3b82f6"
      />
      <PerformanceChart
        data={mockRevenueData}
        title="Revenue Performance"
        type="line"
        color="#10b981"
      />
    </div>
  );
};

const InvestorManagement: React.FC = () => {
  const mockInvestors = [
    { id: '1', name: 'John Smith', investment: 45000, properties: 3, joinDate: '2024-01-15' },
    { id: '2', name: 'Sarah Johnson', investment: 32000, properties: 2, joinDate: '2024-02-20' },
    { id: '3', name: 'Michael Chen', investment: 28000, properties: 4, joinDate: '2024-03-10' },
    { id: '4', name: 'Emily Davis', investment: 52000, properties: 2, joinDate: '2024-04-05' }
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
            Top Investors
          </h3>
          <button className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">
            View All
          </button>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          {mockInvestors.map((investor) => (
            <div
              key={investor.id}
              className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {investor.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h4 className="font-medium text-neutral-900 dark:text-slate-100">
                    {investor.name}
                  </h4>
                  <p className="text-sm text-neutral-500 dark:text-slate-400">
                    Joined {new Date(investor.joinDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-right">
                  <p className="text-neutral-500 dark:text-slate-400">Investment</p>
                  <p className="font-semibold text-neutral-900 dark:text-slate-100">
                    ${investor.investment.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-neutral-500 dark:text-slate-400">Properties</p>
                  <p className="font-semibold text-neutral-900 dark:text-slate-100">
                    {investor.properties}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PropertyDocuments: React.FC = () => {
  const mockDocuments = [
    { id: '1', name: 'Property Deed - Marina Bay', type: 'Legal', uploadDate: '2024-08-15', size: '2.4 MB' },
    { id: '2', name: 'Financial Report Q2 2024', type: 'Financial', uploadDate: '2024-07-30', size: '1.8 MB' },
    { id: '3', name: 'Insurance Policy - Downtown Office', type: 'Insurance', uploadDate: '2024-08-10', size: '3.2 MB' },
    { id: '4', name: 'Compliance Certificate', type: 'Legal', uploadDate: '2024-08-05', size: '1.1 MB' }
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
            Recent Documents
          </h3>
          <button className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
            Upload Document
          </button>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          {mockDocuments.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-lg">📄</span>
                </div>
                <div>
                  <h4 className="font-medium text-neutral-900 dark:text-slate-100">
                    {doc.name}
                  </h4>
                  <p className="text-sm text-neutral-500 dark:text-slate-400">
                    {doc.type} • {doc.size} • {new Date(doc.uploadDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-300 transition-colors">
                  <span className="text-lg">📥</span>
                </button>
                <button className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-300 transition-colors">
                  <span className="text-lg">👁️</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const PropertyOwnerDashboard: React.FC<{ currentView: string }> = ({ currentView }) => {
  const quickActions: QuickAction[] = [
    {
      id: 'add-property',
      label: 'Add Property',
      icon: '🏢',
      description: 'Tokenize new property',
      variant: 'primary',
      onClick: () => console.log('Navigate to property tokenization')
    },
    {
      id: 'manage-investors',
      label: 'Manage Investors',
      icon: '👥',
      description: 'View investor details',
      onClick: () => console.log('Navigate to investor management')
    },
    {
      id: 'distribute-revenue',
      label: 'Distribute Revenue',
      icon: '💰',
      description: 'Process payments',
      variant: 'success',
      onClick: () => console.log('Navigate to revenue distribution')
    },
    {
      id: 'upload-documents',
      label: 'Upload Documents',
      icon: '📄',
      description: 'Add legal documents',
      onClick: () => console.log('Navigate to document upload')
    }
  ];

  switch (currentView) {
    case 'overview':
      return (
        <div className="space-y-6">
          <DashboardStats stats={mockOwnerStats} />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <TokenizationProgress />
            </div>
            <QuickActions actions={quickActions} columns={2} />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <PropertyOverview />
            </div>
            <ActivityFeed 
              activities={mockOwnerActivities} 
              maxItems={5}
              showViewAll={true}
              onViewAll={() => console.log('View all activities')}
            />
          </div>
        </div>
      );

    case 'properties':
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
                  My Properties
                </h2>
                <p className="text-neutral-600 dark:text-slate-400 mt-1">
                  Manage your tokenized real estate portfolio
                </p>
              </div>
              <button className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors">
                Add New Property
              </button>
            </div>
          </div>

          {/* Property Approval Status - Example with a property ID */}
          <PropertyApprovalStatus
            propertyId="example-property-id"
            className="mb-6"
          />

          <PropertyOverview />
          <TokenizationProgress />
        </div>
      );

    case 'tokenization':
      return (
        <div className="space-y-6">
          <TokenizationProgress />
          <PropertyOverview />
        </div>
      );

    case 'revenue':
      return (
        <div className="space-y-6">
          <DashboardStats 
            stats={[
              {
                id: 'total-revenue',
                label: 'Total Revenue',
                value: '$142,850',
                change: '+12.3%',
                changeType: 'positive',
                icon: '💰'
              },
              {
                id: 'pending-distributions',
                label: 'Pending Distributions',
                value: '$8,920',
                description: 'To be processed',
                icon: '⏳'
              },
              {
                id: 'next-distribution',
                label: 'Next Distribution',
                value: 'Sep 1',
                description: 'Estimated $15,200',
                icon: '📅'
              },
              {
                id: 'distribution-rate',
                label: 'Distribution Rate',
                value: '85%',
                change: '+2%',
                changeType: 'positive',
                icon: '📊'
              }
            ]}
          />
          <PerformanceChart
            data={mockRevenueData}
            title="Revenue Distribution History"
            type="bar"
            color="#10b981"
          />
        </div>
      );

    case 'investors':
      return (
        <div className="space-y-6">
          <InvestorManagement />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">
                Investor Distribution
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Retail Investors', percentage: 65, count: 82 },
                  { label: 'Institutional', percentage: 25, count: 18 },
                  { label: 'High Net Worth', percentage: 10, count: 12 }
                ].map((segment) => (
                  <div key={segment.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">
                        {segment.label}
                      </span>
                      <span className="text-sm text-neutral-500 dark:text-slate-400">
                        {segment.count} investors
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
                Investment Metrics
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'Average Investment', value: '$28,500' },
                  { label: 'Total Capital Raised', value: '$2.4M' },
                  { label: 'Investor Retention', value: '94%' },
                  { label: 'New Investors (30d)', value: '23' }
                ].map((metric) => (
                  <div key={metric.label} className="flex justify-between">
                    <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">
                      {metric.label}
                    </span>
                    <span className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
                      {metric.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );

    case 'documents':
      return (
        <div className="space-y-6">
          <PropertyDocuments />
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