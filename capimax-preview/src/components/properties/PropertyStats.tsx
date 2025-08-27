import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  PieChart, 
  LineChart, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Building,
  MapPin,
  Calendar,
  Target,
  Award,
  Activity,
  Percent,
  Clock
} from 'lucide-react';
import { Card } from '../design-system/cards/Card';
import { Text } from '../design-system/typography/Text';
import { cn } from '../../utils/cn';

export interface PropertyStatsData {
  totalProperties: number;
  totalValue: number;
  averageReturn: number;
  totalInvestors: number;
  fundedProperties: number;
  averageRating: number;
  propertyTypeDistribution: {
    residential: number;
    commercial: number;
    hospitality: number;
  };
  locationDistribution: {
    name: string;
    count: number;
    percentage: number;
  }[];
  monthlyPerformance: {
    month: string;
    newProperties: number;
    totalInvestment: number;
    averageReturn: number;
  }[];
  topPerformers: {
    id: number;
    name: string;
    return: number;
    funded: number;
    investors: number;
  }[];
}

interface PropertyStatsProps {
  data?: PropertyStatsData;
  timeRange?: '7d' | '30d' | '90d' | '1y' | 'all';
  onTimeRangeChange?: (range: '7d' | '30d' | '90d' | '1y' | 'all') => void;
  className?: string;
}

// Mock data for demonstration
const mockStatsData: PropertyStatsData = {
  totalProperties: 127,
  totalValue: 2850000000, // $2.85B
  averageReturn: 16.8,
  totalInvestors: 24567,
  fundedProperties: 89,
  averageRating: 4.6,
  propertyTypeDistribution: {
    residential: 45,
    commercial: 35,
    hospitality: 20
  },
  locationDistribution: [
    { name: "New York", count: 23, percentage: 18.1 },
    { name: "California", count: 19, percentage: 15.0 },
    { name: "Florida", count: 15, percentage: 11.8 },
    { name: "Texas", count: 12, percentage: 9.4 },
    { name: "Illinois", count: 10, percentage: 7.9 },
    { name: "Other", count: 48, percentage: 37.8 }
  ],
  monthlyPerformance: [
    { month: "Jan", newProperties: 8, totalInvestment: 125000000, averageReturn: 15.2 },
    { month: "Feb", newProperties: 12, totalInvestment: 180000000, averageReturn: 16.1 },
    { month: "Mar", newProperties: 15, totalInvestment: 220000000, averageReturn: 17.3 },
    { month: "Apr", newProperties: 11, totalInvestment: 195000000, averageReturn: 16.8 },
    { month: "May", newProperties: 14, totalInvestment: 205000000, averageReturn: 17.1 },
    { month: "Jun", newProperties: 16, totalInvestment: 235000000, averageReturn: 18.2 }
  ],
  topPerformers: [
    { id: 1, name: "Manhattan Elite Tower", return: 22.4, funded: 85, investors: 847 },
    { id: 2, name: "Silicon Valley Tech Hub", return: 21.8, funded: 78, investors: 1203 },
    { id: 3, name: "Miami Beach Resort", return: 20.9, funded: 92, investors: 892 },
    { id: 4, name: "Austin Tech Campus", return: 20.1, funded: 67, investors: 654 },
    { id: 5, name: "Seattle Modern Loft", return: 19.5, funded: 88, investors: 423 }
  ]
};

export const PropertyStats: React.FC<PropertyStatsProps> = ({
  data = mockStatsData,
  timeRange = '30d',
  onTimeRangeChange,
  className
}) => {
  const [activeChart, setActiveChart] = useState<'overview' | 'performance' | 'distribution'>('overview');

  const timeRanges = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' },
    { value: 'all', label: 'All Time' }
  ] as const;

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(2)}B`;
    }
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    change, 
    changeType, 
    color = "emerald"
  }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'increase' | 'decrease' | 'neutral';
    color?: 'emerald' | 'blue' | 'purple' | 'orange';
  }) => {
    const colorClasses = {
      emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
      blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
      purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
      orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
    };

    return (
      <Card className="p-6 hover:shadow-lg transition-shadow duration-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", colorClasses[color])}>
              <Icon className="w-5 h-5" />
            </div>
            <Text variant="caption" color="muted" className="mb-1">
              {title}
            </Text>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {typeof value === 'number' && title.toLowerCase().includes('value') 
                ? formatCurrency(value)
                : value
              }
            </div>
            {change && (
              <div className={cn(
                "flex items-center gap-1 text-sm",
                changeType === 'increase' && "text-emerald-600 dark:text-emerald-400",
                changeType === 'decrease' && "text-red-600 dark:text-red-400",
                changeType === 'neutral' && "text-gray-600 dark:text-gray-400"
              )}>
                {changeType === 'increase' && <TrendingUp className="w-3 h-3" />}
                {changeType === 'decrease' && <TrendingDown className="w-3 h-3" />}
                {changeType === 'neutral' && <Activity className="w-3 h-3" />}
                {change}
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Property Analytics
          </h2>
          <Text variant="body" color="muted">
            Comprehensive insights into your property portfolio
          </Text>
        </div>
        
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {timeRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => onTimeRangeChange?.(range.value)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                timeRange === range.value
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Building}
          title="Total Properties"
          value={data.totalProperties}
          change="+12 this month"
          changeType="increase"
          color="emerald"
        />
        <StatCard
          icon={DollarSign}
          title="Total Value"
          value={data.totalValue}
          change="+8.5% vs last month"
          changeType="increase"
          color="blue"
        />
        <StatCard
          icon={TrendingUp}
          title="Average Return"
          value={`${data.averageReturn}%`}
          change="+1.2% vs last month"
          changeType="increase"
          color="purple"
        />
        <StatCard
          icon={Users}
          title="Total Investors"
          value={data.totalInvestors.toLocaleString()}
          change="+567 this month"
          changeType="increase"
          color="orange"
        />
      </div>

      {/* Chart Tabs */}
      <Card>
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'performance', label: 'Performance', icon: LineChart },
              { id: 'distribution', label: 'Distribution', icon: PieChart }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveChart(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                  activeChart === tab.id
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeChart === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Additional Key Metrics */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Key Performance Indicators</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Funded Properties</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Successfully funded</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900 dark:text-white">{data.fundedProperties}</div>
                      <div className="text-sm text-emerald-600 dark:text-emerald-400">
                        {Math.round((data.fundedProperties / data.totalProperties) * 100)}% success rate
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                        <Award className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Average Rating</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Property quality score</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900 dark:text-white">{data.averageRating}/5.0</div>
                      <div className="text-sm text-yellow-600 dark:text-yellow-400">Excellent</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Performers */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Performing Properties</h3>
                <div className="space-y-3">
                  {data.topPerformers.slice(0, 5).map((property, index) => (
                    <motion.div
                      key={property.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          #{index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {property.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {property.funded}% funded • {property.investors} investors
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          {property.return}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">return</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeChart === 'performance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Performance Trends</h3>
              
              {/* Simplified Chart Visualization */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                <div className="flex items-end justify-between gap-2 h-48">
                  {data.monthlyPerformance.map((month, index) => (
                    <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                      <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        {month.averageReturn}%
                      </div>
                      <div 
                        className="bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg w-full transition-all duration-1000"
                        style={{ 
                          height: `${(month.averageReturn / 20) * 100}%`,
                          minHeight: '20px'
                        }}
                      />
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {month.month}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-center mt-4 text-sm text-gray-600 dark:text-gray-400">
                  Average Monthly Returns (%)
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-emerald-50 dark:bg-emerald-900/20">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Best Month</div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">June - 18.2%</div>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Investment</div>
                      <div className="font-bold text-blue-600 dark:text-blue-400">$1.16B</div>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4 bg-purple-50 dark:bg-purple-900/20">
                  <div className="flex items-center gap-3">
                    <Building className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">New Properties</div>
                      <div className="font-bold text-purple-600 dark:text-purple-400">76 this year</div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeChart === 'distribution' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Property Type Distribution */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Property Type Distribution</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-emerald-500 rounded-sm" />
                      <span className="text-gray-700 dark:text-gray-300">Residential</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-900 dark:text-white font-medium">
                        {data.propertyTypeDistribution.residential}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${data.propertyTypeDistribution.residential}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-blue-500 rounded-sm" />
                      <span className="text-gray-700 dark:text-gray-300">Commercial</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-900 dark:text-white font-medium">
                        {data.propertyTypeDistribution.commercial}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${data.propertyTypeDistribution.commercial}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-purple-500 rounded-sm" />
                      <span className="text-gray-700 dark:text-gray-300">Hospitality</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-900 dark:text-white font-medium">
                        {data.propertyTypeDistribution.hospitality}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${data.propertyTypeDistribution.hospitality}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Location Distribution */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Geographic Distribution</h3>
                <div className="space-y-3">
                  {data.locationDistribution.map((location, index) => (
                    <motion.div
                      key={location.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {location.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {location.count} properties
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {location.percentage}%
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};