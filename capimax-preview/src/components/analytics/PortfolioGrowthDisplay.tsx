import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, BarChart3, RefreshCw, AlertCircle } from 'lucide-react';
import { usePortfolioAnalytics } from '../../hooks/usePortfolioAnalytics';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface PortfolioGrowthDisplayProps {
  period?: 'week' | 'month' | 'quarter' | 'year';
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export const PortfolioGrowthDisplay = ({
  period = 'month',
  showDetails = true,
  compact = false,
  className = ''
}: PortfolioGrowthDisplayProps) => {
  const {
    growth,
    metrics,
    isLoading,
    error,
    refetchGrowth,
    formatGrowthPercentage,
    getGrowthTrend,
    getGrowthPeriodLabel
  } = usePortfolioAnalytics({ period });

  if (error) {
    return (
      <Card className={`p-4 border-orange-200 bg-orange-50 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <div>
              <h3 className="text-sm font-medium text-orange-800">
                Portfolio Growth Unavailable
              </h3>
              <p className="text-xs text-orange-600 mt-1">
                Unable to load portfolio performance data
              </p>
            </div>
          </div>
          <Button
            onClick={refetchGrowth}
            size="sm"
            variant="outline"
            className="border-orange-200 text-orange-700 hover:bg-orange-100"
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              'Retry'
            )}
          </Button>
        </div>
      </Card>
    );
  }

  const growthPercentage = growth?.return_percentage || 0;
  const growthAmount = growth?.return_amount || 0;
  const currentValue = growth?.current_value || metrics?.current_value || 0;
  const investedAmount = growth?.invested_amount || metrics?.total_invested || 0;

  const isPositiveGrowth = growthPercentage >= 0;
  const growthTrend = getGrowthTrend(growthPercentage);
  const periodLabel = getGrowthPeriodLabel(period);

  const trendIcon = isPositiveGrowth ? TrendingUp : TrendingDown;
  const TrendIcon = trendIcon;

  const trendColor = growthTrend === 'positive'
    ? 'text-emerald-600'
    : growthTrend === 'negative'
    ? 'text-red-600'
    : 'text-gray-600';

  const bgColor = growthTrend === 'positive'
    ? 'bg-emerald-50 border-emerald-200'
    : growthTrend === 'negative'
    ? 'bg-red-50 border-red-200'
    : 'bg-gray-50 border-gray-200';

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {isLoading ? (
          <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
        ) : (
          <TrendIcon className={`h-4 w-4 ${trendColor}`} />
        )}
        <span className={`text-sm font-medium ${trendColor}`}>
          {isLoading ? 'Loading...' : formatGrowthPercentage(growthPercentage)}
        </span>
        <span className="text-sm text-gray-500">{periodLabel}</span>
      </div>
    );
  }

  return (
    <Card className={`p-6 ${bgColor} ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className={`h-5 w-5 ${trendColor}`} />
          <h3 className="text-lg font-semibold text-gray-900">
            Portfolio Performance
          </h3>
        </div>
        {isLoading && (
          <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      <div className="space-y-4">
        {/* Main Growth Display */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <TrendIcon className={`h-6 w-6 ${trendColor}`} />
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${trendColor}`}>
                {isLoading ? '...' : formatGrowthPercentage(growthPercentage)}
              </span>
              <span className="text-sm text-gray-500 font-medium">
                {periodLabel}
              </span>
            </div>
            {showDetails && growthAmount !== 0 && !isLoading && (
              <div className={`text-sm ${trendColor} mt-1`}>
                {isPositiveGrowth ? '+' : ''}${Math.abs(growthAmount).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} {isPositiveGrowth ? 'gain' : 'loss'}
              </div>
            )}
          </div>
        </motion.div>

        {/* Portfolio Value Details */}
        {showDetails && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200"
          >
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Current Value
              </p>
              <p className="text-lg font-semibold text-gray-900">
                ${currentValue.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Purchased Amount
              </p>
              <p className="text-lg font-semibold text-gray-900">
                ${investedAmount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-8"
          >
            <div className="text-center">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-300 rounded w-32 mx-auto"></div>
                <div className="h-3 bg-gray-200 rounded w-24 mx-auto"></div>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Loading portfolio performance...
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </Card>
  );
}

export default PortfolioGrowthDisplay;