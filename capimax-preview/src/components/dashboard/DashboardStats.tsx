import React from 'react';

export interface StatItem {
  id: string;
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: string;
  description?: string;
}

interface DashboardStatsProps {
  stats: StatItem[];
  className?: string;
  loading?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ 
  stats, 
  className = '',
  loading = false,
  isLoading = false,
  error,
  onRefresh
}) => {
  const getChangeColor = (changeType?: 'positive' | 'negative' | 'neutral') => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600 dark:text-green-400';
      case 'negative':
        return 'text-red-600 dark:text-red-400';
      case 'neutral':
      default:
        return 'text-neutral-500 dark:text-slate-400';
    }
  };

  const getChangeIcon = (changeType?: 'positive' | 'negative' | 'neutral') => {
    switch (changeType) {
      case 'positive':
        return '↗️';
      case 'negative':
        return '↘️';
      default:
        return '';
    }
  };

  // Handle error state
  if (error && stats.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <span className="text-2xl mb-2 block">⚠️</span>
          <p className="text-red-800 dark:text-red-200 mb-3">{error}</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading || isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700 animate-pulse"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-4 bg-neutral-200 dark:bg-slate-600 rounded mb-2 w-20"></div>
                <div className="h-8 bg-neutral-200 dark:bg-slate-600 rounded mb-1 w-24"></div>
                <div className="h-4 bg-neutral-200 dark:bg-slate-600 rounded w-16"></div>
              </div>
              <div className="w-8 h-8 bg-neutral-200 dark:bg-slate-600 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {stats.map((stat) => (
        <div
          key={stat.id}
          className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700 hover:shadow-lg transition-all duration-200"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-neutral-500 dark:text-slate-400 mb-2">
                {stat.label}
              </h3>
              <p className="text-2xl font-bold text-neutral-900 dark:text-slate-100 mb-1">
                {stat.value}
              </p>
              {stat.change && (
                <div className="flex items-center space-x-1">
                  <span className={`text-sm font-medium ${getChangeColor(stat.changeType)}`}>
                    {getChangeIcon(stat.changeType)} {stat.change}
                  </span>
                </div>
              )}
              {stat.description && (
                <p className="text-xs text-neutral-400 dark:text-slate-500 mt-2">
                  {stat.description}
                </p>
              )}
            </div>
            {stat.icon && (
              <div className="text-2xl opacity-60">
                {stat.icon}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};