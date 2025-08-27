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
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ 
  stats, 
  className = '' 
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