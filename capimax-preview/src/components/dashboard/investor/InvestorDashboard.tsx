import React, { useState } from 'react';
import { DashboardStats, ActivityFeed, PerformanceChart, QuickActions } from '../';
import type { StatItem, ActivityItem, ChartDataPoint, QuickAction } from '../';

// Mock data for investor dashboard
const mockInvestorStats: StatItem[] = [
  {
    id: 'total-investment',
    label: 'Total Investment',
    value: '$125,450',
    change: '+12.5%',
    changeType: 'positive',
    icon: '💰',
    description: 'Amount invested this month'
  },
  {
    id: 'portfolio-value',
    label: 'Portfolio Value',
    value: '$138,920',
    change: '+10.7%',
    changeType: 'positive',
    icon: '📊',
    description: 'Current market value'
  },
  {
    id: 'properties',
    label: 'Properties',
    value: '7',
    change: '+2',
    changeType: 'positive',
    icon: '🏢',
    description: 'Active investments'
  },
  {
    id: 'monthly-income',
    label: 'Monthly Income',
    value: '$2,340',
    change: '+5.2%',
    changeType: 'positive',
    icon: '💵',
    description: 'Rental income this month'
  }
];

const mockPortfolioData: ChartDataPoint[] = [
  { date: '2024-01-01', value: 100000, label: 'Jan' },
  { date: '2024-02-01', value: 105000, label: 'Feb' },
  { date: '2024-03-01', value: 110000, label: 'Mar' },
  { date: '2024-04-01', value: 108000, label: 'Apr' },
  { date: '2024-05-01', value: 115000, label: 'May' },
  { date: '2024-06-01', value: 122000, label: 'Jun' },
  { date: '2024-07-01', value: 125000, label: 'Jul' },
  { date: '2024-08-01', value: 138920, label: 'Aug' }
];

const mockIncomeData: ChartDataPoint[] = [
  { date: '2024-01-01', value: 1800 },
  { date: '2024-02-01', value: 1950 },
  { date: '2024-03-01', value: 2100 },
  { date: '2024-04-01', value: 2050 },
  { date: '2024-05-01', value: 2200 },
  { date: '2024-06-01', value: 2150 },
  { date: '2024-07-01', value: 2300 },
  { date: '2024-08-01', value: 2340 }
];

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'investment',
    title: 'Investment in Luxury Apartment Complex',
    description: 'Downtown Austin residential property',
    amount: '+$15,000',
    timestamp: '2024-08-26T10:30:00Z',
    status: 'completed'
  },
  {
    id: '2',
    type: 'dividend',
    title: 'Monthly Dividend Payment',
    description: 'Riverside Office Building',
    amount: '+$780',
    timestamp: '2024-08-25T09:15:00Z',
    status: 'completed'
  },
  {
    id: '3',
    type: 'property_update',
    title: 'Property Valuation Update',
    description: 'Marina Bay Condos increased 3.2%',
    timestamp: '2024-08-24T14:20:00Z',
    status: 'completed'
  },
  {
    id: '4',
    type: 'dividend',
    title: 'Quarterly Dividend',
    description: 'Tech District Office Complex',
    amount: '+$1,240',
    timestamp: '2024-08-20T11:00:00Z',
    status: 'completed'
  },
  {
    id: '5',
    type: 'transaction',
    title: 'Withdrawal Request',
    description: 'Partial withdrawal to wallet',
    amount: '-$5,000',
    timestamp: '2024-08-18T16:45:00Z',
    status: 'pending'
  }
];

interface PropertyHolding {
  id: string;
  name: string;
  location: string;
  investment: number;
  currentValue: number;
  tokens: number;
  yield: number;
  change: number;
  image?: string;
}

const mockHoldings: PropertyHolding[] = [
  {
    id: '1',
    name: 'Luxury Apartment Complex',
    location: 'Downtown Austin, TX',
    investment: 25000,
    currentValue: 27800,
    tokens: 250,
    yield: 8.2,
    change: 11.2
  },
  {
    id: '2',
    name: 'Riverside Office Building',
    location: 'Seattle, WA',
    investment: 30000,
    currentValue: 32500,
    tokens: 300,
    yield: 7.5,
    change: 8.3
  },
  {
    id: '3',
    name: 'Marina Bay Condos',
    location: 'San Francisco, CA',
    investment: 40000,
    currentValue: 45200,
    tokens: 400,
    yield: 6.8,
    change: 13.0
  },
  {
    id: '4',
    name: 'Tech District Office',
    location: 'Austin, TX',
    investment: 20000,
    currentValue: 21900,
    tokens: 200,
    yield: 9.1,
    change: 9.5
  }
];

const PortfolioOverview: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PerformanceChart
        data={mockPortfolioData}
        title="Portfolio Performance"
        type="area"
        color="#10b981"
      />
      <PerformanceChart
        data={mockIncomeData}
        title="Monthly Income Trend"
        type="line"
        color="#3b82f6"
      />
    </div>
  );
};

const PropertyHoldings: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
          Property Holdings
        </h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {mockHoldings.map((property) => (
            <div
              key={property.id}
              className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600 transition-colors"
            >
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
              
              <div className="flex items-center space-x-8 text-sm">
                <div className="text-center">
                  <p className="text-neutral-500 dark:text-slate-400">Investment</p>
                  <p className="font-semibold text-neutral-900 dark:text-slate-100">
                    ${property.investment.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-neutral-500 dark:text-slate-400">Current Value</p>
                  <p className="font-semibold text-neutral-900 dark:text-slate-100">
                    ${property.currentValue.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-neutral-500 dark:text-slate-400">Yield</p>
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    {property.yield}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-neutral-500 dark:text-slate-400">Change</p>
                  <p className={`font-semibold ${
                    property.change > 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {property.change > 0 ? '+' : ''}{property.change}%
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

const InvestorAnalytics: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Asset Allocation */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">
          Asset Allocation
        </h3>
        <div className="space-y-3">
          {[
            { label: 'Residential', percentage: 45, color: 'bg-blue-500' },
            { label: 'Commercial', percentage: 35, color: 'bg-green-500' },
            { label: 'Mixed-Use', percentage: 20, color: 'bg-purple-500' }
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

      {/* Performance Metrics */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">
          Key Metrics
        </h3>
        <div className="space-y-4">
          {[
            { label: 'Average ROI', value: '10.7%', change: '+2.3%' },
            { label: 'Total Yield', value: '7.8%', change: '+0.5%' },
            { label: 'Diversification Score', value: '8.4/10', change: '+0.2' },
            { label: 'Risk Level', value: 'Moderate', change: null }
          ].map((metric) => (
            <div key={metric.label} className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">
                {metric.label}
              </span>
              <div className="text-right">
                <span className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
                  {metric.value}
                </span>
                {metric.change && (
                  <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                    {metric.change}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const InvestorDashboard: React.FC<{ currentView: string }> = ({ currentView }) => {
  const quickActions: QuickAction[] = [
    {
      id: 'invest-more',
      label: 'Invest More',
      icon: '💰',
      description: 'Add funds to portfolio',
      variant: 'primary',
      onClick: () => console.log('Navigate to investment flow')
    },
    {
      id: 'browse-properties',
      label: 'Browse Properties',
      icon: '🏢',
      description: 'Find new opportunities',
      onClick: () => console.log('Navigate to properties')
    },
    {
      id: 'withdraw',
      label: 'Withdraw',
      icon: '💸',
      description: 'Withdraw to wallet',
      onClick: () => console.log('Navigate to withdrawal')
    },
    {
      id: 'analytics',
      label: 'View Analytics',
      icon: '📊',
      description: 'Detailed performance',
      onClick: () => console.log('Show analytics')
    }
  ];

  switch (currentView) {
    case 'overview':
      return (
        <div className="space-y-6">
          <DashboardStats stats={mockInvestorStats} />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <PortfolioOverview />
            </div>
            <QuickActions actions={quickActions} columns={2} />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <PropertyHoldings />
            </div>
            <ActivityFeed 
              activities={mockActivities} 
              maxItems={5}
              showViewAll={true}
              onViewAll={() => console.log('View all activities')}
            />
          </div>
        </div>
      );

    case 'portfolio':
      return (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100 mb-2">
              Portfolio Overview
            </h2>
            <p className="text-neutral-600 dark:text-slate-400 mb-6">
              Track your real estate investments and performance metrics
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {mockInvestorStats.map((stat) => (
                <div key={stat.id} className="text-center p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <div className="text-lg font-semibold text-neutral-900 dark:text-slate-100">{stat.value}</div>
                  <div className="text-sm text-neutral-500 dark:text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <PortfolioOverview />
          <PropertyHoldings />
          <InvestorAnalytics />
        </div>
      );

    case 'investments':
      return (
        <div className="space-y-6">
          <PropertyHoldings />
          <InvestorAnalytics />
        </div>
      );

    case 'transactions':
      return (
        <div className="space-y-6">
          <ActivityFeed 
            activities={mockActivities} 
            title="Transaction History"
            maxItems={20}
            showViewAll={false}
          />
        </div>
      );

    case 'income':
      return (
        <div className="space-y-6">
          <DashboardStats 
            stats={[
              {
                id: 'total-income',
                label: 'Total Income',
                value: '$18,720',
                change: '+15.2%',
                changeType: 'positive',
                icon: '💰'
              },
              {
                id: 'monthly-average',
                label: 'Monthly Average',
                value: '$2,340',
                change: '+8.1%',
                changeType: 'positive',
                icon: '📊'
              },
              {
                id: 'yield-rate',
                label: 'Average Yield',
                value: '7.8%',
                change: '+0.3%',
                changeType: 'positive',
                icon: '📈'
              },
              {
                id: 'next-payment',
                label: 'Next Payment',
                value: 'Sep 1',
                description: 'Estimated $2,450',
                icon: '📅'
              }
            ]}
          />
          <PerformanceChart
            data={mockIncomeData}
            title="Income History"
            type="bar"
            color="#10b981"
          />
        </div>
      );

    case 'analytics':
      return (
        <div className="space-y-6">
          <PortfolioOverview />
          <InvestorAnalytics />
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