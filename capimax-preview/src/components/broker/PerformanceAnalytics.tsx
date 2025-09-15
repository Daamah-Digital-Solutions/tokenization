import React, { useState } from 'react';
import { PerformanceChart, type ChartDataPoint } from '../dashboard/PerformanceChart';

export interface PerformanceMetrics {
  totalReferrals: number;
  conversionRate: number;
  averageDealSize: number;
  totalCommission: number;
  monthlyGrowthRate: number;
  clientRetentionRate: number;
  averageTimeToConversion: number;
  lifetimeValue: number;
}

export interface ConversionFunnel {
  stage: string;
  count: number;
  rate: number;
  dropOffRate?: number;
}

export interface SourcePerformance {
  source: string;
  referrals: number;
  conversions: number;
  conversionRate: number;
  totalValue: number;
  averageValue: number;
  roi: number;
}

export interface TimeSeriesData {
  referrals: ChartDataPoint[];
  conversions: ChartDataPoint[];
  commission: ChartDataPoint[];
  dealSize: ChartDataPoint[];
}

interface PerformanceAnalyticsProps {
  metrics: PerformanceMetrics;
  funnelData: ConversionFunnel[];
  sourceData: SourcePerformance[];
  timeSeriesData: TimeSeriesData;
  timeRange: '7d' | '30d' | '90d' | '1y';
  onTimeRangeChange: (range: '7d' | '30d' | '90d' | '1y') => void;
  className?: string;
}

export const PerformanceAnalytics: React.FC<PerformanceAnalyticsProps> = ({
  metrics,
  funnelData,
  sourceData,
  timeSeriesData,
  timeRange,
  onTimeRangeChange,
  className = ''
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'referrals' | 'conversions' | 'commission' | 'dealSize'>('commission');
  const [compareMode, setCompareMode] = useState<boolean>(false);

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
  const formatPercentage = (percentage: number) => `${percentage.toFixed(1)}%`;
  const formatDays = (days: number) => `${days} days`;

  const getMetricColor = (value: number, isPositive: boolean = true) => {
    if (isPositive) {
      return value > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    } else {
      return value < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    }
  };

  const getSourceRank = (source: SourcePerformance, metric: 'conversions' | 'value' | 'roi') => {
    const sorted = [...sourceData].sort((a, b) => b[metric] - a[metric]);
    return sorted.findIndex(s => s.source === source.source) + 1;
  };

  const totalFunnelLeads = funnelData[0]?.count || 0;
  const overallConversionRate = funnelData.length > 0 
    ? ((funnelData[funnelData.length - 1]?.count || 0) / totalFunnelLeads) * 100 
    : 0;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
              Performance Analytics
            </h2>
            <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">
              Track your referral performance and conversion metrics
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex rounded-lg border border-neutral-200 dark:border-slate-600 overflow-hidden">
              {(['7d', '30d', '90d', '1y'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => onTimeRangeChange(range)}
                  className={`px-3 py-1 text-sm ${
                    timeRange === range
                      ? 'bg-primary-600 text-white'
                      : 'bg-white dark:bg-slate-700 text-neutral-700 dark:text-slate-300'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {metrics.totalReferrals}
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-300 mb-1">Total Referrals</div>
            <div className={`text-xs font-medium ${getMetricColor(metrics.monthlyGrowthRate)}`}>
              {metrics.monthlyGrowthRate > 0 ? '+' : ''}{formatPercentage(metrics.monthlyGrowthRate)} growth
            </div>
          </div>

          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatPercentage(metrics.conversionRate)}
            </div>
            <div className="text-sm text-green-800 dark:text-green-300 mb-1">Conversion Rate</div>
            <div className="text-xs text-neutral-500 dark:text-slate-400">
              Avg: {formatDays(metrics.averageTimeToConversion)}
            </div>
          </div>

          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(metrics.totalCommission)}
            </div>
            <div className="text-sm text-purple-800 dark:text-purple-300 mb-1">Total Commission</div>
            <div className="text-xs text-neutral-500 dark:text-slate-400">
              Avg: {formatCurrency(metrics.averageDealSize)}
            </div>
          </div>

          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatPercentage(metrics.clientRetentionRate)}
            </div>
            <div className="text-sm text-orange-800 dark:text-orange-300 mb-1">Retention Rate</div>
            <div className="text-xs text-neutral-500 dark:text-slate-400">
              LTV: {formatCurrency(metrics.lifetimeValue)}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Performance Charts */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100">
              Performance Trends
            </h3>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={compareMode}
                  onChange={(e) => setCompareMode(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-neutral-600 dark:text-slate-400">Compare metrics</span>
              </label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as any)}
                className="text-sm border border-neutral-200 dark:border-slate-600 rounded-lg px-3 py-1 bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
              >
                <option value="commission">Commission</option>
                <option value="referrals">Referrals</option>
                <option value="conversions">Conversions</option>
                <option value="dealSize">Deal Size</option>
              </select>
            </div>
          </div>

          {compareMode ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PerformanceChart
                data={timeSeriesData.commission}
                title="Commission Trend"
                type="area"
                color="#10b981"
              />
              <PerformanceChart
                data={timeSeriesData.referrals}
                title="Referral Volume"
                type="line"
                color="#3b82f6"
              />
            </div>
          ) : (
            <PerformanceChart
              data={timeSeriesData[selectedMetric]}
              title={
                selectedMetric === 'commission' ? 'Commission Performance' :
                selectedMetric === 'referrals' ? 'Referral Volume' :
                selectedMetric === 'conversions' ? 'Conversion Trends' :
                'Average Deal Size'
              }
              type="area"
              color={
                selectedMetric === 'commission' ? '#10b981' :
                selectedMetric === 'referrals' ? '#3b82f6' :
                selectedMetric === 'conversions' ? '#8b5cf6' :
                '#f59e0b'
              }
            />
          )}
        </div>

        {/* Conversion Funnel */}
        <div>
          <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100 mb-4">
            Conversion Funnel
          </h3>
          <div className="space-y-3">
            {funnelData.map((stage, index) => {
              const widthPercentage = totalFunnelLeads > 0 ? (stage.count / totalFunnelLeads) * 100 : 0;
              const nextStage = funnelData[index + 1];
              const dropOffCount = nextStage ? stage.count - nextStage.count : 0;
              const dropOffRate = stage.count > 0 ? (dropOffCount / stage.count) * 100 : 0;

              return (
                <div key={stage.stage} className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-neutral-900 dark:text-slate-100">
                      {stage.stage}
                    </span>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-neutral-600 dark:text-slate-400">
                        {stage.count.toLocaleString()} ({formatPercentage(stage.rate)})
                      </span>
                      {index > 0 && dropOffRate > 0 && (
                        <span className="text-red-600 dark:text-red-400">
                          -{formatPercentage(dropOffRate)} drop-off
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-slate-700 rounded-full h-8 relative overflow-hidden">
                    <div
                      className={`h-8 rounded-full transition-all duration-500 ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-green-500' :
                        index === 2 ? 'bg-yellow-500' :
                        index === 3 ? 'bg-purple-500' :
                        'bg-orange-500'
                      }`}
                      style={{ width: `${widthPercentage}%` }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center text-white font-medium text-sm">
                      {stage.count.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                {formatPercentage(overallConversionRate)}
              </div>
              <div className="text-sm text-green-800 dark:text-green-300">
                Overall Conversion Rate
              </div>
            </div>
          </div>
        </div>

        {/* Source Performance */}
        <div>
          <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100 mb-4">
            Referral Source Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-medium text-neutral-900 dark:text-slate-100">Source</th>
                  <th className="text-center py-3 px-4 font-medium text-neutral-900 dark:text-slate-100">Referrals</th>
                  <th className="text-center py-3 px-4 font-medium text-neutral-900 dark:text-slate-100">Conversions</th>
                  <th className="text-center py-3 px-4 font-medium text-neutral-900 dark:text-slate-100">Conv. Rate</th>
                  <th className="text-center py-3 px-4 font-medium text-neutral-900 dark:text-slate-100">Total Value</th>
                  <th className="text-center py-3 px-4 font-medium text-neutral-900 dark:text-slate-100">Avg. Value</th>
                  <th className="text-center py-3 px-4 font-medium text-neutral-900 dark:text-slate-100">ROI</th>
                  <th className="text-center py-3 px-4 font-medium text-neutral-900 dark:text-slate-100">Rank</th>
                </tr>
              </thead>
              <tbody>
                {sourceData.map((source, index) => (
                  <tr key={source.source} className="border-b border-neutral-100 dark:border-slate-800">
                    <td className="py-3 px-4">
                      <div className="font-medium text-neutral-900 dark:text-slate-100">
                        {source.source}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-neutral-900 dark:text-slate-100">
                      {source.referrals}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-medium text-neutral-900 dark:text-slate-100">
                        {source.conversions}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-medium ${
                        source.conversionRate >= 20 ? 'text-green-600 dark:text-green-400' :
                        source.conversionRate >= 10 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {formatPercentage(source.conversionRate)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-neutral-900 dark:text-slate-100">
                      {formatCurrency(source.totalValue)}
                    </td>
                    <td className="py-3 px-4 text-center text-neutral-900 dark:text-slate-100">
                      {formatCurrency(source.averageValue)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-medium ${getMetricColor(source.roi)}`}>
                        {source.roi > 0 ? '+' : ''}{formatPercentage(source.roi)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <span className="text-sm font-medium text-neutral-900 dark:text-slate-100">
                          #{getSourceRank(source, 'value')}
                        </span>
                        <div className="w-2 h-2 rounded-full" style={{
                          backgroundColor: 
                            getSourceRank(source, 'value') <= 2 ? '#10b981' :
                            getSourceRank(source, 'value') <= 4 ? '#f59e0b' :
                            '#ef4444'
                        }}></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance Insights */}
        <div>
          <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100 mb-4">
            Performance Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Best Performing Source */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-green-600 dark:text-green-400">🏆</span>
                <h4 className="font-medium text-green-800 dark:text-green-300">Top Source</h4>
              </div>
              <div className="text-sm text-green-700 dark:text-green-400">
                <strong>{sourceData[0]?.source}</strong> with {formatPercentage(sourceData[0]?.conversionRate || 0)} conversion rate
              </div>
            </div>

            {/* Growth Trend */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-blue-600 dark:text-blue-400">📈</span>
                <h4 className="font-medium text-blue-800 dark:text-blue-300">Growth</h4>
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-400">
                {metrics.monthlyGrowthRate > 0 ? 'Growing' : 'Declining'} by {formatPercentage(Math.abs(metrics.monthlyGrowthRate))} monthly
              </div>
            </div>

            {/* Optimization Opportunity */}
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-yellow-600 dark:text-yellow-400">💡</span>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-300">Opportunity</h4>
              </div>
              <div className="text-sm text-yellow-700 dark:text-yellow-400">
                Focus on improving conversion from leads to registered users
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};