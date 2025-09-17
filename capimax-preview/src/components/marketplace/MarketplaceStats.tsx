import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Clock,
  Activity,
  BarChart3,
  Zap,
  Users
} from 'lucide-react';
import { cn } from '../../utils/cn';
import type { MarketplaceStats as StatsType } from '../../services/marketplace/MarketplaceService';

interface MarketplaceStatsProps {
  stats: StatsType;
  className?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<any>;
  trend?: {
    direction: 'up' | 'down';
    value: string;
  };
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
  className
}) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600'
  };

  const iconColorClasses = {
    blue: 'text-blue-100',
    green: 'text-green-100',
    purple: 'text-purple-100',
    orange: 'text-orange-100',
    red: 'text-red-100'
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br shadow-lg",
        colorClasses[color],
        className
      )}
    >
      <div className="absolute inset-0 bg-black/5" />
      <div className="relative p-6 text-white">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-white/80 text-sm font-medium mb-1">{title}</p>
            <p className="text-2xl font-bold mb-1">{value}</p>
            {subtitle && (
              <p className="text-white/70 text-xs">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            "flex-shrink-0 p-3 rounded-xl bg-white/10 backdrop-blur-sm",
            iconColorClasses[color]
          )}>
            <Icon className="w-6 h-6" />
          </div>
        </div>

        {trend && (
          <div className="flex items-center">
            <TrendingUp className={cn(
              "w-4 h-4 mr-1",
              trend.direction === 'up' ? "text-green-200" : "text-red-200"
            )} />
            <span className={cn(
              "text-sm font-medium",
              trend.direction === 'up' ? "text-green-200" : "text-red-200"
            )}>
              {trend.value}
            </span>
            <span className="text-white/70 text-sm ml-1">vs last 24h</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const MarketplaceStats: React.FC<MarketplaceStatsProps> = ({
  stats,
  className
}) => {
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)}>
      <StatCard
        title="Total Listings"
        value={formatNumber(stats.total_listings)}
        subtitle="Active marketplace listings"
        icon={ShoppingCart}
        color="blue"
      />

      <StatCard
        title="24h Volume"
        value={formatCurrency(stats.total_volume_24h)}
        subtitle="Trading volume today"
        icon={Activity}
        color="green"
        trend={{
          direction: 'up',
          value: '+12.5%'
        }}
      />

      <StatCard
        title="Total Volume"
        value={formatCurrency(stats.total_volume_all_time)}
        subtitle="All-time trading volume"
        icon={BarChart3}
        color="purple"
      />

      <StatCard
        title="Avg. Token Price"
        value={formatCurrency(stats.average_price_per_token)}
        subtitle="Average price per token"
        icon={DollarSign}
        color="orange"
        trend={{
          direction: 'up',
          value: '+2.8%'
        }}
      />

      {/* Additional row for more detailed stats */}
      <StatCard
        title="Total Transactions"
        value={formatNumber(stats.total_transactions)}
        subtitle="Completed trades"
        icon={Zap}
        color="green"
      />

      <StatCard
        title="Active Auctions"
        value={formatNumber(stats.active_auctions)}
        subtitle="Ongoing auction listings"
        icon={Clock}
        color="red"
      />

      {/* Market Health Indicators */}
      <StatCard
        title="Market Activity"
        value="High"
        subtitle="Based on recent trading"
        icon={TrendingUp}
        color="green"
        trend={{
          direction: 'up',
          value: '+15.2%'
        }}
      />

      <StatCard
        title="Avg. Listing Time"
        value="2.3 days"
        subtitle="Time to sale completion"
        icon={Users}
        color="blue"
        trend={{
          direction: 'down',
          value: '-0.5 days'
        }}
      />
    </div>
  );
};