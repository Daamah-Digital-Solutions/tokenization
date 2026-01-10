/**
 * Broker Components
 *
 * This module exports all components related to broker functionality
 * including application, dashboard, commissions, referrals, and marketing.
 */

// Main Broker Components
export { default as BrokerApplicationForm } from './BrokerApplicationForm';
export { default as BrokerDashboard } from './BrokerDashboard';

// Broker Dashboard Sub-Components
export { ReferralTracker } from './ReferralTracker';
export type { ReferralClient, ReferralMetrics } from './ReferralTracker';
export { CommissionCalculator } from './CommissionCalculator';
export type { CommissionTier, CommissionStructure, CommissionCalculation } from './CommissionCalculator';
export { MarketingMaterials } from './MarketingMaterials';
export type { MarketingMaterial } from './MarketingMaterials';
export { PerformanceAnalytics } from './PerformanceAnalytics';
export type { PerformanceMetrics, ConversionFunnel, SourcePerformance, TimeSeriesData } from './PerformanceAnalytics';