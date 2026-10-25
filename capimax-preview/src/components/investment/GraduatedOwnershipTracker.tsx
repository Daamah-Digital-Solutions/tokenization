import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface OwnershipTier {
  id: string;
  name: string;
  minPaymentPercentage: number;
  maxPaymentPercentage: number;
  ownershipPercentage: number;
  benefits: string[];
  restrictions?: string[];
  dividendRate: number;
  votingRights: boolean;
  transferRights: 'none' | 'limited' | 'full';
  liquidityOptions: string[];
  color: string;
}

export interface OwnershipPosition {
  id: string;
  propertyId: string;
  propertyName: string;
  totalTokens: number;
  ownedTokens: number;
  reservedTokens: number;
  currentTier: OwnershipTier;
  nextTier?: OwnershipTier;
  paymentProgress: number; // 0-100
  totalInvestment: number;
  paidAmount: number;
  remainingAmount: number;
  estimatedCompletion: string;
  lastPaymentDate?: string;
  nextPaymentDue?: string;
  milestones: {
    id: string;
    name: string;
    paymentPercentage: number;
    tokensReleased: number;
    achieved: boolean;
    achievedDate?: string;
    benefits?: string[];
  }[];
  projectedValue: number;
  currentValue: number;
  dividendsEarned: number;
  status: 'active' | 'paused' | 'completed' | 'defaulted';
}

interface GraduatedOwnershipTrackerProps {
  positions: OwnershipPosition[];
  availableTiers: OwnershipTier[];
  onMakePayment: (positionId: string) => void;
  onViewProjection: (positionId: string) => void;
  onUpgradeTier?: (positionId: string, targetTierId: string) => void;
  className?: string;
}

export const GraduatedOwnershipTracker: React.FC<GraduatedOwnershipTrackerProps> = ({
  positions,
  availableTiers,
  onMakePayment,
  onViewProjection,
  onUpgradeTier,
  className = ''
}) => {
  const { t, i18n } = useTranslation('invest');
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString(i18n.language?.startsWith('ar') ? 'ar-EG' : 'en-US');

  const getTierColor = (tier: OwnershipTier) => tier.color;
  
  const getNextMilestone = (position: OwnershipPosition) => {
    return position.milestones.find(m => !m.achieved);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 dark:text-green-400';
      case 'paused': return 'text-yellow-600 dark:text-yellow-400';
      case 'completed': return 'text-blue-600 dark:text-blue-400';
      case 'defaulted': return 'text-red-600 dark:text-red-400';
      default: return 'text-neutral-600 dark:text-slate-400';
    }
  };

  const getTierProgress = (position: OwnershipPosition) => {
    const currentMin = position.currentTier.minPaymentPercentage;
    const currentMax = position.currentTier.maxPaymentPercentage;
    const progress = position.paymentProgress;
    
    if (progress < currentMin) {
      return ((progress - (availableTiers.find(t => t.maxPaymentPercentage < currentMin)?.maxPaymentPercentage || 0)) / 
              (currentMin - (availableTiers.find(t => t.maxPaymentPercentage < currentMin)?.maxPaymentPercentage || 0))) * 100;
    }
    
    return ((progress - currentMin) / (currentMax - currentMin)) * 100;
  };

  const canUpgradeToNextTier = (position: OwnershipPosition) => {
    return position.nextTier && position.paymentProgress >= position.nextTier.minPaymentPercentage;
  };

  const totalInvested = positions.reduce((sum, pos) => sum + pos.paidAmount, 0);
  const totalValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0);
  const totalDividends = positions.reduce((sum, pos) => sum + pos.dividendsEarned, 0);
  const activePositions = positions.filter(pos => pos.status === 'active').length;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
              {t('graduated.title')}
            </h2>
            <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">
              {t('graduated.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'overview' ? 'detailed' : 'overview')}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              {viewMode === 'overview' ? t('graduated.detailedView') : t('graduated.overview')}
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
            <div className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
              {activePositions}
            </div>
            <div className="text-sm text-neutral-500 dark:text-slate-400">
              {t('graduated.activePositions')}
            </div>
          </div>
          <div className="text-center p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {formatCurrency(totalInvested)}
            </div>
            <div className="text-sm text-neutral-500 dark:text-slate-400">
              {t('graduated.totalPurchased')}
            </div>
          </div>
          <div className="text-center p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
            <div className="text-lg font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(totalValue)}
            </div>
            <div className="text-sm text-neutral-500 dark:text-slate-400">
              {t('graduated.currentValue')}
            </div>
          </div>
          <div className="text-center p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
            <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
              {formatCurrency(totalDividends)}
            </div>
            <div className="text-sm text-neutral-500 dark:text-slate-400">
              {t('graduated.totalDividends')}
            </div>
          </div>
        </div>
      </div>

      {/* Positions */}
      <div className="p-6">
        {positions.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">📊</span>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-2">
              {t('graduated.emptyTitle')}
            </h3>
            <p className="text-neutral-600 dark:text-slate-400">
              {t('graduated.emptyBody')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {positions.map((position) => {
              const nextMilestone = getNextMilestone(position);
              const tierProgress = getTierProgress(position);
              const canUpgrade = canUpgradeToNextTier(position);
              const isExpanded = selectedPosition === position.id;

              return (
                <div
                  key={position.id}
                  className="border border-neutral-200 dark:border-slate-700 rounded-lg overflow-hidden"
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => setSelectedPosition(isExpanded ? null : position.id)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-neutral-900 dark:text-slate-100">
                          {position.propertyName}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-sm font-medium ${getStatusColor(position.status)}`}>
                            {t(`graduated.status.${position.status}`, { defaultValue: position.status.toUpperCase() })}
                          </span>
                          <span className="text-sm text-neutral-600 dark:text-slate-400">
                            {t('graduated.ownedOf', { owned: position.ownedTokens.toLocaleString(), total: position.totalTokens.toLocaleString() })}
                          </span>
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
                          {formatCurrency(position.currentValue)}
                        </div>
                        <div className="text-sm text-neutral-600 dark:text-slate-400">
                          {t('graduated.currentValue')}
                        </div>
                      </div>
                    </div>

                    {/* Current Tier */}
                    <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: `${position.currentTier.color}20` }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: position.currentTier.color }}
                          ></div>
                          <span className="font-medium text-neutral-900 dark:text-slate-100">
                            {position.currentTier.name}
                          </span>
                          <span className="text-sm text-neutral-600 dark:text-slate-400">
                            {t('graduated.perShare', { value: position.currentTier.ownershipPercentage })}
                          </span>
                        </div>
                        {canUpgrade && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium rounded-full">
                            {t('graduated.upgradeAvailable')}
                          </span>
                        )}
                      </div>
                      
                      <div className="w-full bg-neutral-200 dark:bg-slate-700 rounded-full h-2 mb-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${tierProgress}%`,
                            backgroundColor: position.currentTier.color
                          }}
                        ></div>
                      </div>
                      
                      <div className="flex justify-between text-xs text-neutral-600 dark:text-slate-400">
                        <span>{t('graduated.paymentProgress', { value: Math.round(position.paymentProgress) })}</span>
                        {position.nextTier && (
                          <span>{t('graduated.nextTier', { name: position.nextTier.name, value: position.nextTier.minPaymentPercentage })}</span>
                        )}
                      </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-neutral-500 dark:text-slate-400">{t('graduated.paid')}</span>
                        <div className="font-medium text-neutral-900 dark:text-slate-100">
                          {formatCurrency(position.paidAmount)}
                        </div>
                      </div>
                      <div>
                        <span className="text-neutral-500 dark:text-slate-400">{t('graduated.remaining')}</span>
                        <div className="font-medium text-neutral-900 dark:text-slate-100">
                          {formatCurrency(position.remainingAmount)}
                        </div>
                      </div>
                      <div>
                        <span className="text-neutral-500 dark:text-slate-400">{t('graduated.dividendRate')}</span>
                        <div className="font-medium text-green-600 dark:text-green-400">
                          {position.currentTier.dividendRate}%
                        </div>
                      </div>
                      <div>
                        <span className="text-neutral-500 dark:text-slate-400">{t('graduated.dividendsEarned')}</span>
                        <div className="font-medium text-purple-600 dark:text-purple-400">
                          {formatCurrency(position.dividendsEarned)}
                        </div>
                      </div>
                    </div>

                    {/* Next Milestone */}
                    {nextMilestone && (
                      <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-800 dark:text-blue-300">
                            {t('graduated.nextMilestone', { name: nextMilestone.name })}
                          </span>
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                            {t('graduated.sharesAt', { value: nextMilestone.tokensReleased.toLocaleString(), percent: nextMilestone.paymentPercentage })}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Next Payment */}
                    {position.nextPaymentDue && (
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-neutral-600 dark:text-slate-400">
                          {t('reserved.nextPaymentDue', { date: formatDate(position.nextPaymentDue) })}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMakePayment(position.id);
                          }}
                          className="px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded hover:bg-primary-700 transition-colors"
                        >
                          {t('reserved.makePayment')}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-neutral-200 dark:border-slate-700 p-4 bg-neutral-50 dark:bg-slate-900/50">
                      <div className="space-y-6">
                        {/* Tier Benefits */}
                        <div>
                          <h4 className="font-medium text-neutral-900 dark:text-slate-100 mb-3">
                            {t('graduated.tierBenefits')}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">{t('graduated.benefits')}</h5>
                              <ul className="space-y-1">
                                {position.currentTier.benefits.map((benefit, index) => (
                                  <li key={index} className="text-sm text-neutral-600 dark:text-slate-400 flex items-start">
                                    <span className="text-green-500 me-1">✓</span>
                                    {benefit}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">{t('graduated.rights')}</h5>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-neutral-600 dark:text-slate-400">{t('graduated.voting')}</span>
                                  <span className={position.currentTier.votingRights ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                    {position.currentTier.votingRights ? t('graduated.yes') : t('graduated.no')}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-neutral-600 dark:text-slate-400">{t('graduated.transfer')}</span>
                                  <span className="text-neutral-900 dark:text-slate-100 capitalize">
                                    {t(`graduated.transferRights.${position.currentTier.transferRights}`, { defaultValue: position.currentTier.transferRights })}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-neutral-600 dark:text-slate-400">{t('graduated.liquidity')}</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {position.currentTier.liquidityOptions.map((option, index) => (
                                      <span key={index} className="px-2 py-1 bg-neutral-200 dark:bg-slate-600 text-xs rounded">
                                        {option}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Milestones Progress */}
                        <div>
                          <h4 className="font-medium text-neutral-900 dark:text-slate-100 mb-3">
                            {t('graduated.milestoneProgress')}
                          </h4>
                          <div className="space-y-2">
                            {position.milestones.map((milestone) => (
                              <div
                                key={milestone.id}
                                className={`flex items-center justify-between p-2 rounded ${
                                  milestone.achieved 
                                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                                    : 'bg-neutral-50 dark:bg-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={milestone.achieved ? 'text-green-600 dark:text-green-400' : 'text-neutral-400'}>
                                    {milestone.achieved ? '✅' : '⏳'}
                                  </span>
                                  <span className="text-sm font-medium text-neutral-900 dark:text-slate-100">
                                    {milestone.name}
                                  </span>
                                </div>
                                <div className="text-end">
                                  <div className="text-sm font-medium text-neutral-900 dark:text-slate-100">
                                    {t('installment.sharesValue', { value: milestone.tokensReleased.toLocaleString() })}
                                  </div>
                                  <div className="text-xs text-neutral-600 dark:text-slate-400">
                                    {t('graduated.atPayment', { value: milestone.paymentPercentage })}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3">
                          {position.nextPaymentDue && (
                            <button
                              onClick={() => onMakePayment(position.id)}
                              className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded hover:bg-primary-700 transition-colors"
                            >
                              {t('reserved.makePayment')}
                            </button>
                          )}
                          
                          {canUpgrade && onUpgradeTier && position.nextTier && (
                            <button
                              onClick={() => onUpgradeTier!(position.id, position.nextTier!.id)}
                              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
                            >
                              {t('graduated.upgradeTo', { name: position.nextTier.name })}
                            </button>
                          )}

                          <button
                            onClick={() => onViewProjection(position.id)}
                            className="px-4 py-2 bg-neutral-200 text-neutral-700 dark:bg-slate-600 dark:text-slate-300 text-sm font-medium rounded hover:bg-neutral-300 dark:hover:bg-slate-500 transition-colors"
                          >
                            {t('graduated.viewProjections')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tier Legend */}
      {availableTiers.length > 0 && (
        <div className="border-t border-neutral-200 dark:border-slate-700 p-6 bg-neutral-50 dark:bg-slate-900/50">
          <h3 className="font-medium text-neutral-900 dark:text-slate-100 mb-3">
            {t('graduated.availableTiers')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableTiers.map((tier) => (
              <div 
                key={tier.id} 
                className="flex items-center gap-3 p-2 rounded border"
                style={{ borderColor: `${tier.color}40` }}
              >
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: tier.color }}
                ></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-neutral-900 dark:text-slate-100 text-sm">
                    {tier.name}
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-slate-400">
                    {t('graduated.tierLine', { min: tier.minPaymentPercentage, max: tier.maxPaymentPercentage, ownership: tier.ownershipPercentage, dividend: tier.dividendRate })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};