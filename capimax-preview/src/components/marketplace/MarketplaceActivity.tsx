import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Plus,
  ShoppingCart,
  Gavel,
  CheckCircle,
  Clock,
  User,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';
import type { MarketplaceActivity as ActivityType } from '../../services/marketplace/MarketplaceService';

interface MarketplaceActivityProps {
  activities: ActivityType[];
  className?: string;
}

interface ActivityItemProps {
  activity: ActivityType;
  isFirst?: boolean;
  isLast?: boolean;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, isFirst, isLast }) => {
  const getActivityConfig = (type: ActivityType['type']) => {
    switch (type) {
      case 'LISTING_CREATED':
        return {
          icon: Plus,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          title: 'New Listing',
          description: 'Property listed for sale'
        };
      case 'LISTING_SOLD':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          title: 'Listing Sold',
          description: 'Property sale completed'
        };
      case 'BID_PLACED':
        return {
          icon: Gavel,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          title: 'Bid Placed',
          description: 'New auction bid'
        };
      case 'AUCTION_ENDED':
        return {
          icon: Clock,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          title: 'Auction Ended',
          description: 'Auction completed'
        };
      default:
        return {
          icon: Activity,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          title: 'Activity',
          description: 'Marketplace activity'
        };
    }
  };

  const config = getActivityConfig(activity.type);
  const Icon = config.icon;

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative flex items-start gap-3 pb-4"
    >
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-4 top-8 w-px h-full bg-gray-200" />
      )}

      {/* Activity Icon */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center relative z-10",
        config.bgColor
      )}>
        <Icon className={cn("w-4 h-4", config.color)} />
      </div>

      {/* Activity Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {config.title}
          </p>
          <span className="text-xs text-gray-500 flex-shrink-0">
            {timeAgo(activity.created_at)}
          </span>
        </div>

        <p className="text-xs text-gray-600 mb-2">
          {config.description}
        </p>

        {/* Property Info */}
        <div className="bg-gray-50 rounded-lg p-2 mb-2">
          <div className="flex items-center gap-2 mb-1">
            {activity.property.image_url && (
              <img
                src={activity.property.image_url}
                alt={activity.property.name}
                className="w-6 h-6 rounded object-cover"
              />
            )}
            <span className="text-xs font-medium text-gray-900 truncate">
              {activity.property.name}
            </span>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Amount:</span>
            <span className="font-medium text-gray-900">
              ${activity.amount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Tokens:</span>
            <span className="font-medium text-gray-900">
              {activity.tokens.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Price/Token:</span>
            <span className="font-medium text-green-600">
              ${activity.price_per_token.toFixed(2)}
            </span>
          </div>
        </div>

        {/* User Info */}
        {activity.user && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
            {activity.user.avatar_url ? (
              <img
                src={activity.user.avatar_url}
                alt={activity.user.username}
                className="w-4 h-4 rounded-full"
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center">
                <User className="w-2 h-2 text-gray-600" />
              </div>
            )}
            <span className="text-xs text-gray-600">
              {activity.user.username}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const MarketplaceActivity: React.FC<MarketplaceActivityProps> = ({
  activities,
  className
}) => {
  if (activities.length === 0) {
    return (
      <div className={cn(
        "bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg p-6",
        className
      )}>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg",
        className
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {activities.length} items
          </Badge>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Latest marketplace transactions and listings
        </p>
      </div>

      {/* Activity List */}
      <div className="p-6">
        <div className="space-y-0">
          {activities.map((activity, index) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              isFirst={index === 0}
              isLast={index === activities.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Live updates</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Last 24 hours</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};