import React from 'react';

export interface ActivityItem {
  id: string;
  type: 'investment' | 'withdrawal' | 'dividend' | 'property_update' | 'system' | 'transaction';
  title: string;
  description: string;
  amount?: string;
  timestamp: string;
  icon?: string;
  status?: 'completed' | 'pending' | 'failed';
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  title?: string;
  maxItems?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  className?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  title = 'Recent Activity',
  maxItems = 10,
  showViewAll = false,
  onViewAll,
  className = ''
}) => {
  const getActivityIcon = (type: ActivityItem['type'], customIcon?: string) => {
    if (customIcon) return customIcon;
    
    switch (type) {
      case 'investment':
        return '💰';
      case 'withdrawal':
        return '💸';
      case 'dividend':
        return '💵';
      case 'property_update':
        return '🏢';
      case 'transaction':
        return '💳';
      case 'system':
      default:
        return '📱';
    }
  };

  const getStatusColor = (status?: ActivityItem['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-neutral-100 text-neutral-800 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const displayedActivities = activities.slice(0, maxItems);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 ${className}`}>
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
            {title}
          </h3>
          {showViewAll && onViewAll && (
            <button
              onClick={onViewAll}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              View All
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {displayedActivities.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block opacity-50">📋</span>
            <p className="text-neutral-500 dark:text-slate-400">
              No recent activity to display
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start space-x-4 p-4 rounded-lg hover:bg-neutral-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                {/* Activity Icon */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                    <span className="text-lg">
                      {getActivityIcon(activity.type, activity.icon)}
                    </span>
                  </div>
                </div>

                {/* Activity Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-neutral-900 dark:text-slate-100 mb-1">
                        {activity.title}
                      </h4>
                      <p className="text-sm text-neutral-600 dark:text-slate-400 mb-2">
                        {activity.description}
                      </p>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-neutral-400 dark:text-slate-500">
                          {formatTimestamp(activity.timestamp)}
                        </span>
                        {activity.status && (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(activity.status)}`}>
                            {activity.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    {activity.amount && (
                      <div className="flex-shrink-0 text-right">
                        <span className={`text-sm font-semibold ${
                          activity.type === 'investment' || activity.type === 'dividend' 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-neutral-900 dark:text-slate-100'
                        }`}>
                          {activity.amount}
                        </span>
                      </div>
                    )}
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