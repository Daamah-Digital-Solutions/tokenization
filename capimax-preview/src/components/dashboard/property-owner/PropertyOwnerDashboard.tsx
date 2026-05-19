import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardStats, ActivityFeed, PerformanceChart, QuickActions } from '../';
import type { StatItem, ActivityItem, ChartDataPoint, QuickAction } from '../';
import PropertyApprovalStatus from '../../property-owner/PropertyApprovalStatus';
import PropertyOwnerService from '../../../services/property-owner/PropertyOwnerService';
import type { Property } from '../../../services/api/types';

// Loading and Error Components
const LoadingStats = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700 animate-pulse">
        <div className="h-4 bg-neutral-200 dark:bg-slate-600 rounded mb-4"></div>
        <div className="h-8 bg-neutral-200 dark:bg-slate-600 rounded mb-2"></div>
        <div className="h-3 bg-neutral-200 dark:bg-slate-600 rounded w-2/3"></div>
      </div>
    ))}
  </div>
);

const LoadingChart = ({ title }: { title: string }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
    <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">{title}</h3>
    <div className="h-48 bg-neutral-100 dark:bg-slate-700 rounded animate-pulse"></div>
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-red-800 dark:text-red-200 font-medium">Error Loading Data</h3>
        <p className="text-red-600 dark:text-red-300 text-sm mt-1">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Retry
      </button>
    </div>
  </div>
);
// Utility functions for data formatting
const formatCurrency = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toLocaleString()}`;
};

const formatChangeType = (change: string): 'positive' | 'negative' | 'neutral' => {
  if (change.startsWith('+')) return 'positive';
  if (change.startsWith('-')) return 'negative';
  return 'neutral';
};






const PropertyOverview: React.FC = () => {
  const {
    data: properties = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['properties', 'owner'],
    queryFn: PropertyOwnerService.getOwnedProperties,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
        <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
            Property Portfolio
          </h3>
        </div>
        <div className="p-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg animate-pulse">
              <div className="h-4 bg-neutral-200 dark:bg-slate-600 rounded mb-3"></div>
              <div className="grid grid-cols-5 gap-4">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="h-8 bg-neutral-200 dark:bg-slate-600 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
        <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
            Property Portfolio
          </h3>
        </div>
        <div className="p-6">
          <ErrorState
            message="Failed to load your properties"
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
        <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
            Property Portfolio
          </h3>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">🏢</span>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-2">
              No Properties Yet
            </h3>
            <p className="text-neutral-500 dark:text-slate-400 mb-4">
              Start tokenizing your first property to see it here
            </p>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              Add Your First Property
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
          Property Portfolio
        </h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {properties.map((property: Property) => (
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
                      {property.title}
                    </h4>
                    <p className="text-sm text-neutral-500 dark:text-slate-400">
                      {property.city}, {property.state || property.country}
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
                    {formatCurrency(property.total_value)}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500 dark:text-slate-400">Funding</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-neutral-200 dark:bg-slate-600 rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full"
                        style={{ width: `${property.funding_percentage || 0}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium">{property.funding_percentage || 0}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-neutral-500 dark:text-slate-400">Monthly Revenue</p>
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(property.monthly_rental_income || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500 dark:text-slate-400">Investors</p>
                  <p className="font-semibold text-neutral-900 dark:text-slate-100">
                    {/* This would need to be calculated or provided by the API */}
                    {property.tokens_sold > 0 ? Math.ceil(property.tokens_sold / 100) : 0}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500 dark:text-slate-400">Tokens Sold</p>
                  <p className="font-semibold text-neutral-900 dark:text-slate-100">
                    {property.tokens_sold?.toLocaleString() || 0}/{property.total_tokens?.toLocaleString() || 0}
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
  const {
    data: tokenizationData = [],
    isLoading: tokenizationLoading,
    error: tokenizationError,
    refetch: refetchTokenization
  } = useQuery({
    queryKey: ['tokenization-analytics'],
    queryFn: () => PropertyOwnerService.getTokenizationAnalytics('month'),
    staleTime: 5 * 60 * 1000
  });

  const {
    data: revenueData = [],
    isLoading: revenueLoading,
    error: revenueError,
    refetch: refetchRevenue
  } = useQuery({
    queryKey: ['revenue-analytics'],
    queryFn: () => PropertyOwnerService.getRevenueAnalytics('month'),
    staleTime: 5 * 60 * 1000
  });

  const formatChartData = (data: any[]): ChartDataPoint[] => {
    return data.map(item => ({
      date: item.date,
      value: item.value,
      label: item.label || new Date(item.date).toLocaleDateString('en-US', { month: 'short' })
    }));
  };

  if (tokenizationLoading || revenueLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LoadingChart title="Token Sales Progress" />
        <LoadingChart title="Revenue Performance" />
      </div>
    );
  }

  if (tokenizationError || revenueError) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tokenizationError ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">Token Sales Progress</h3>
            <ErrorState
              message="Failed to load tokenization data"
              onRetry={() => refetchTokenization()}
            />
          </div>
        ) : (
          <PerformanceChart
            data={formatChartData(tokenizationData)}
            title="Token Sales Progress"
            type="area"
            color="#3b82f6"
          />
        )}
        {revenueError ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">Revenue Performance</h3>
            <ErrorState
              message="Failed to load revenue data"
              onRetry={() => refetchRevenue()}
            />
          </div>
        ) : (
          <PerformanceChart
            data={formatChartData(revenueData)}
            title="Revenue Performance"
            type="line"
            color="#10b981"
          />
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PerformanceChart
        data={formatChartData(tokenizationData)}
        title="Token Sales Progress"
        type="area"
        color="#3b82f6"
      />
      <PerformanceChart
        data={formatChartData(revenueData)}
        title="Revenue Performance"
        type="line"
        color="#10b981"
      />
    </div>
  );
};

const InvestorManagement: React.FC = () => {
  const {
    data: investors = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['top-investors'],
    queryFn: () => PropertyOwnerService.getTopInvestors(10),
    staleTime: 5 * 60 * 1000
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
        <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
            Top Investors
          </h3>
        </div>
        <div className="p-6 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-neutral-200 dark:bg-slate-600 rounded-full"></div>
                <div className="space-y-1">
                  <div className="h-4 w-24 bg-neutral-200 dark:bg-slate-600 rounded"></div>
                  <div className="h-3 w-16 bg-neutral-200 dark:bg-slate-600 rounded"></div>
                </div>
              </div>
              <div className="flex space-x-6">
                <div className="h-8 w-16 bg-neutral-200 dark:bg-slate-600 rounded"></div>
                <div className="h-8 w-12 bg-neutral-200 dark:bg-slate-600 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
        <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
            Top Investors
          </h3>
        </div>
        <div className="p-6">
          <ErrorState
            message="Failed to load investor data"
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }

  if (investors.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
        <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
            Top Investors
          </h3>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">👥</span>
            <p className="text-neutral-500 dark:text-slate-400">
              No investors yet. Start promoting your properties to attract investors.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
          {investors.map((investor) => (
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
                    Joined {new Date(investor.join_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-6 text-sm">
                <div className="text-right">
                  <p className="text-neutral-500 dark:text-slate-400">Investment</p>
                  <p className="font-semibold text-neutral-900 dark:text-slate-100">
                    {formatCurrency(investor.total_investment)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-neutral-500 dark:text-slate-400">Properties</p>
                  <p className="font-semibold text-neutral-900 dark:text-slate-100">
                    {investor.properties_count}
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
  const {
    data: documents = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['property-documents'],
    queryFn: () => PropertyOwnerService.getPropertyDocuments(20),
    staleTime: 5 * 60 * 1000
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
        <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
            Recent Documents
          </h3>
        </div>
        <div className="p-6 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-neutral-200 dark:bg-slate-600 rounded-lg"></div>
                <div className="space-y-1">
                  <div className="h-4 w-32 bg-neutral-200 dark:bg-slate-600 rounded"></div>
                  <div className="h-3 w-24 bg-neutral-200 dark:bg-slate-600 rounded"></div>
                </div>
              </div>
              <div className="flex space-x-2">
                <div className="w-8 h-8 bg-neutral-200 dark:bg-slate-600 rounded"></div>
                <div className="w-8 h-8 bg-neutral-200 dark:bg-slate-600 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
        <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
            Recent Documents
          </h3>
        </div>
        <div className="p-6">
          <ErrorState
            message="Failed to load documents"
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }

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
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">📄</span>
            <p className="text-neutral-500 dark:text-slate-400">
              No documents uploaded yet. Start by uploading property documentation.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
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
                      {doc.document_type} • {formatFileSize(doc.file_size)} • {new Date(doc.uploaded_at).toLocaleDateString()}
                      {doc.property_name && ` • ${doc.property_name}`}
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
        )}
      </div>
    </div>
  );
};

// Main dashboard overview component with all stats and charts
const PropertyOwnerOverview: React.FC = () => {
  const {
    data: ownerStats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['owner-stats'],
    queryFn: PropertyOwnerService.getOwnerStats,
    staleTime: 5 * 60 * 1000
  });

  const {
    data: activities = [],
    isLoading: activitiesLoading,
    error: activitiesError,
    refetch: refetchActivities
  } = useQuery({
    queryKey: ['owner-activities'],
    queryFn: () => PropertyOwnerService.getActivities(10),
    staleTime: 2 * 60 * 1000
  });

  // Convert API stats to StatItem format
  const formatStatsData = (stats: any): StatItem[] => {
    if (!stats) return [];

    return [
      {
        id: 'total-properties',
        label: 'Total Properties',
        value: stats.total_properties?.toString() || '0',
        change: stats.total_properties_change || '+0',
        changeType: formatChangeType(stats.total_properties_change || '+0'),
        icon: '🏢',
        description: 'Properties tokenized'
      },
      {
        id: 'capital-raised',
        label: 'Capital Raised',
        value: formatCurrency(stats.capital_raised || 0),
        change: stats.capital_raised_change || '+0%',
        changeType: formatChangeType(stats.capital_raised_change || '+0%'),
        icon: '💰',
        description: 'From token sales'
      },
      {
        id: 'active-investors',
        label: 'Active Investors',
        value: stats.active_investors?.toString() || '0',
        change: stats.active_investors_change || '+0',
        changeType: formatChangeType(stats.active_investors_change || '+0'),
        icon: '👥',
        description: 'Across all properties'
      },
      {
        id: 'monthly-revenue',
        label: 'Monthly Revenue',
        value: formatCurrency(stats.monthly_revenue || 0),
        change: stats.monthly_revenue_change || '+0%',
        changeType: formatChangeType(stats.monthly_revenue_change || '+0%'),
        icon: '📈',
        description: 'Rental income generated'
      }
    ];
  };

  // Convert API activities to ActivityItem format
  const formatActivitiesData = (activities: any[]): ActivityItem[] => {
    return activities.map(activity => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      amount: activity.amount,
      timestamp: activity.timestamp,
      status: activity.status || 'completed'
    }));
  };

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

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <LoadingStats />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LoadingChart title="Token Sales Progress" />
              <LoadingChart title="Revenue Performance" />
            </div>
          </div>
          <QuickActions actions={quickActions} columns={2} />
        </div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="space-y-6">
        <ErrorState
          message="Failed to load dashboard data"
          onRetry={() => refetchStats()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardStats stats={formatStatsData(ownerStats)} />
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
          activities={formatActivitiesData(activities)}
          maxItems={5}
          showViewAll={true}
          onViewAll={() => console.log('View all activities')}
          loading={activitiesLoading}
        />
      </div>
    </div>
  );
};

// Revenue view component with revenue analytics
const RevenueView: React.FC = () => {
  const {
    data: revenueStats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['revenue-stats'],
    queryFn: PropertyOwnerService.getRevenueStats,
    staleTime: 5 * 60 * 1000
  });

  const {
    data: revenueData = [],
    isLoading: chartLoading,
    error: chartError,
    refetch: refetchChart
  } = useQuery({
    queryKey: ['revenue-analytics', 'history'],
    queryFn: () => PropertyOwnerService.getRevenueAnalytics('month'),
    staleTime: 5 * 60 * 1000
  });

  const formatRevenueStats = (stats: any): StatItem[] => {
    if (!stats) return [];

    return [
      {
        id: 'total-revenue',
        label: 'Total Revenue',
        value: formatCurrency(stats.total_revenue || 0),
        change: stats.total_revenue_change || '+0%',
        changeType: formatChangeType(stats.total_revenue_change || '+0%'),
        icon: '💰'
      },
      {
        id: 'pending-distributions',
        label: 'Pending Distributions',
        value: formatCurrency(stats.pending_distributions || 0),
        description: 'To be processed',
        icon: '⏳'
      },
      {
        id: 'next-distribution',
        label: 'Next Distribution',
        value: stats.next_distribution_date ? new Date(stats.next_distribution_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD',
        description: `Estimated ${formatCurrency(stats.next_distribution_amount || 0)}`,
        icon: '📅'
      },
      {
        id: 'distribution-rate',
        label: 'Distribution Rate',
        value: `${stats.distribution_rate || 0}%`,
        change: stats.distribution_rate_change || '+0%',
        changeType: formatChangeType(stats.distribution_rate_change || '+0%'),
        icon: '📊'
      }
    ];
  };

  const formatChartData = (data: any[]): ChartDataPoint[] => {
    return data.map(item => ({
      date: item.date,
      value: item.value,
      label: item.label || new Date(item.date).toLocaleDateString('en-US', { month: 'short' })
    }));
  };

  if (statsLoading || chartLoading) {
    return (
      <div className="space-y-6">
        <LoadingStats />
        <LoadingChart title="Revenue Distribution History" />
      </div>
    );
  }

  if (statsError || chartError) {
    return (
      <div className="space-y-6">
        <ErrorState
          message="Failed to load revenue data"
          onRetry={() => {
            refetchStats();
            refetchChart();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardStats stats={formatRevenueStats(revenueStats)} />
      <PerformanceChart
        data={formatChartData(revenueData)}
        title="Revenue Distribution History"
        type="bar"
        color="#10b981"
      />
    </div>
  );
};

// Investors view component with investor analytics
const InvestorsView: React.FC = () => {
  const {
    data: investorAnalytics,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useQuery({
    queryKey: ['investor-analytics'],
    queryFn: PropertyOwnerService.getInvestorAnalytics,
    staleTime: 5 * 60 * 1000
  });

  const {
    data: investmentMetrics,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics
  } = useQuery({
    queryKey: ['investment-metrics'],
    queryFn: PropertyOwnerService.getInvestmentMetrics,
    staleTime: 5 * 60 * 1000
  });

  const isLoading = analyticsLoading || metricsLoading;
  const hasError = analyticsError || metricsError;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <InvestorManagement />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700 animate-pulse">
            <div className="h-6 bg-neutral-200 dark:bg-slate-600 rounded mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-2">
                    <div className="h-4 w-24 bg-neutral-200 dark:bg-slate-600 rounded"></div>
                    <div className="h-4 w-16 bg-neutral-200 dark:bg-slate-600 rounded"></div>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-slate-600 rounded-full h-2"></div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700 animate-pulse">
            <div className="h-6 bg-neutral-200 dark:bg-slate-600 rounded mb-4"></div>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-32 bg-neutral-200 dark:bg-slate-600 rounded"></div>
                  <div className="h-4 w-16 bg-neutral-200 dark:bg-slate-600 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="space-y-6">
        <InvestorManagement />
        <ErrorState
          message="Failed to load investor analytics"
          onRetry={() => {
            refetchAnalytics();
            refetchMetrics();
          }}
        />
      </div>
    );
  }

  const distributionSegments = investorAnalytics ? [
    {
      label: 'Retail Investors',
      percentage: investorAnalytics.retail_investors?.percentage || 0,
      count: investorAnalytics.retail_investors?.count || 0
    },
    {
      label: 'Institutional',
      percentage: investorAnalytics.institutional_investors?.percentage || 0,
      count: investorAnalytics.institutional_investors?.count || 0
    },
    {
      label: 'High Net Worth',
      percentage: investorAnalytics.high_net_worth?.percentage || 0,
      count: investorAnalytics.high_net_worth?.count || 0
    }
  ] : [];

  const metrics = investmentMetrics ? [
    { label: 'Average Investment', value: formatCurrency(investmentMetrics.average_investment || 0) },
    { label: 'Total Capital Raised', value: formatCurrency(investmentMetrics.total_capital_raised || 0) },
    { label: 'Investor Retention', value: `${investmentMetrics.investor_retention_rate || 0}%` },
    { label: 'New Investors (30d)', value: (investmentMetrics.new_investors_30d || 0).toString() }
  ] : [];

  return (
    <div className="space-y-6">
      <InvestorManagement />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">
            Investor Distribution
          </h3>
          {distributionSegments.length > 0 ? (
            <div className="space-y-3">
              {distributionSegments.map((segment) => (
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
          ) : (
            <div className="text-center py-4">
              <p className="text-neutral-500 dark:text-slate-400">
                No investor distribution data available
              </p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">
            Investment Metrics
          </h3>
          {metrics.length > 0 ? (
            <div className="space-y-4">
              {metrics.map((metric) => (
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
          ) : (
            <div className="text-center py-4">
              <p className="text-neutral-500 dark:text-slate-400">
                No investment metrics available
              </p>
            </div>
          )}
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
      return <PropertyOwnerOverview />;

    case 'properties':
    case 'my-properties':
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
      return <RevenueView />;

    case 'investors':
      return <InvestorsView />;

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