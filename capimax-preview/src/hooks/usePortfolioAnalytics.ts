import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PortfolioAnalyticsService, {
  PortfolioGrowthData,
  PortfolioMetrics,
  PortfolioAnalytics
} from '../services/analytics/PortfolioAnalyticsService';

export interface UsePortfolioAnalyticsOptions {
  period?: 'week' | 'month' | 'quarter' | 'year';
  refetchInterval?: number;
  enabled?: boolean;
}

export interface UsePortfolioAnalyticsReturn {
  // Data
  growth: PortfolioGrowthData | undefined;
  metrics: PortfolioMetrics | undefined;
  analytics: PortfolioAnalytics | undefined;

  // Loading states
  isLoading: boolean;
  isGrowthLoading: boolean;
  isMetricsLoading: boolean;
  isAnalyticsLoading: boolean;

  // Error states
  error: Error | null;
  growthError: Error | null;
  metricsError: Error | null;
  analyticsError: Error | null;

  // Actions
  refetch: () => void;
  refetchGrowth: () => void;
  refetchMetrics: () => void;
  refetchAnalytics: () => void;

  // Utilities
  formatGrowthPercentage: (percentage: number) => string;
  getGrowthTrend: (percentage: number) => 'positive' | 'negative' | 'neutral';
  getGrowthPeriodLabel: (period: string) => string;
  isDataStale: (lastUpdated: Date) => boolean;
}

export function usePortfolioAnalytics(
  options: UsePortfolioAnalyticsOptions = {}
): UsePortfolioAnalyticsReturn {
  const {
    period = 'month',
    refetchInterval = 5 * 60 * 1000, // 5 minutes
    enabled = true
  } = options;

  const queryClient = useQueryClient();

  // Portfolio growth query
  const {
    data: growth,
    isLoading: isGrowthLoading,
    error: growthError,
    refetch: refetchGrowth
  } = useQuery({
    queryKey: ['portfolio', 'growth', period],
    queryFn: () => PortfolioAnalyticsService.getPortfolioGrowth(period),
    refetchInterval,
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      console.error('Portfolio growth query failed:', error);
    }
  });

  // Portfolio metrics query
  const {
    data: metrics,
    isLoading: isMetricsLoading,
    error: metricsError,
    refetch: refetchMetrics
  } = useQuery({
    queryKey: ['portfolio', 'metrics'],
    queryFn: () => PortfolioAnalyticsService.getPortfolioMetrics(),
    refetchInterval,
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      console.error('Portfolio metrics query failed:', error);
    }
  });

  // Complete portfolio analytics query (optional, heavier payload)
  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useQuery({
    queryKey: ['portfolio', 'analytics', 'complete'],
    queryFn: () => PortfolioAnalyticsService.getPortfolioAnalytics(),
    refetchInterval: refetchInterval * 2, // Less frequent refresh
    enabled: false, // Only fetch when explicitly requested
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      console.error('Portfolio analytics query failed:', error);
    }
  });

  // Combined loading state
  const isLoading = isGrowthLoading || isMetricsLoading;

  // Combined error state (prioritize growth and metrics errors)
  const error = growthError || metricsError || analyticsError || null;

  // Refetch all data
  const refetch = useCallback(() => {
    refetchGrowth();
    refetchMetrics();
    if (analytics) {
      refetchAnalytics();
    }
  }, [refetchGrowth, refetchMetrics, refetchAnalytics, analytics]);

  // Utility functions
  const formatGrowthPercentage = useCallback(
    (percentage: number) => PortfolioAnalyticsService.formatGrowthPercentage(percentage),
    []
  );

  const getGrowthTrend = useCallback(
    (percentage: number) => PortfolioAnalyticsService.getGrowthTrend(percentage),
    []
  );

  const getGrowthPeriodLabel = useCallback(
    (period: string) => PortfolioAnalyticsService.getGrowthPeriodLabel(period),
    []
  );

  const isDataStale = useCallback(
    (lastUpdated: Date) => PortfolioAnalyticsService.isDataStale(lastUpdated),
    []
  );

  // Auto-refresh data when it becomes stale
  useEffect(() => {
    if (growth && PortfolioAnalyticsService.isDataStale(growth.last_updated, 10)) {
      refetchGrowth();
    }
  }, [growth, refetchGrowth]);

  // Invalidate cache when user makes new investments
  useEffect(() => {
    const handleInvestmentUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    };

    // Listen for investment-related events
    window.addEventListener('investment-created', handleInvestmentUpdate);
    window.addEventListener('investment-updated', handleInvestmentUpdate);
    window.addEventListener('portfolio-updated', handleInvestmentUpdate);

    return () => {
      window.removeEventListener('investment-created', handleInvestmentUpdate);
      window.removeEventListener('investment-updated', handleInvestmentUpdate);
      window.removeEventListener('portfolio-updated', handleInvestmentUpdate);
    };
  }, [queryClient]);

  return {
    // Data
    growth,
    metrics,
    analytics,

    // Loading states
    isLoading,
    isGrowthLoading,
    isMetricsLoading,
    isAnalyticsLoading,

    // Error states
    error,
    growthError,
    metricsError,
    analyticsError,

    // Actions
    refetch,
    refetchGrowth,
    refetchMetrics,
    refetchAnalytics,

    // Utilities
    formatGrowthPercentage,
    getGrowthTrend,
    getGrowthPeriodLabel,
    isDataStale
  };
}

export default usePortfolioAnalytics;