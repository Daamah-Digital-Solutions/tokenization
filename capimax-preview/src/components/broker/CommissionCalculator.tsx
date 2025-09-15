import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../design-system/forms/Input';

export interface CommissionTier {
  id: string;
  name: string;
  minVolume: number;
  maxVolume?: number;
  rate: number;
  bonusRate?: number;
  requirements?: string[];
  benefits?: string[];
}

export interface CommissionStructure {
  baseTiers: CommissionTier[];
  bonusTiers: CommissionTier[];
  specialRates: {
    constructionProperties: number;
    premiumProperties: number;
    referralBonus: number;
    teamOverride?: number;
  };
  payoutSchedule: 'monthly' | 'quarterly' | 'per_transaction';
  minimumPayout: number;
}

interface CommissionCalculatorProps {
  structure: CommissionStructure;
  currentVolume: number;
  currentTier: CommissionTier;
  onCalculate?: (calculation: CommissionCalculation) => void;
  className?: string;
}

export interface CommissionCalculation {
  investmentAmount: number;
  propertyType: string;
  baseRate: number;
  bonusRate: number;
  totalRate: number;
  baseCommission: number;
  bonusCommission: number;
  totalCommission: number;
  tier: CommissionTier;
  nextTier?: CommissionTier;
  volumeToNextTier?: number;
  projectedYearlyCommission: number;
}

export const CommissionCalculator: React.FC<CommissionCalculatorProps> = ({
  structure,
  currentVolume,
  currentTier,
  onCalculate,
  className = ''
}) => {
  const [investmentAmount, setInvestmentAmount] = useState<number>(50000);
  const [propertyType, setPropertyType] = useState<string>('standard');
  const [referralCount, setReferralCount] = useState<number>(0);
  const [calculation, setCalculation] = useState<CommissionCalculation | null>(null);
  const [projectionMode, setProjectionMode] = useState<'single' | 'monthly'>('single');

  const calculateCommission = () => {
    let baseRate = currentTier.rate;
    let bonusRate = currentTier.bonusRate || 0;
    
    // Apply special rates based on property type
    if (propertyType === 'construction') {
      baseRate += structure.specialRates.constructionProperties;
    } else if (propertyType === 'premium') {
      baseRate += structure.specialRates.premiumProperties;
    }

    // Add referral bonuses
    const referralBonus = referralCount * structure.specialRates.referralBonus;
    bonusRate += referralBonus;

    const totalRate = baseRate + bonusRate;
    const baseCommission = (investmentAmount * baseRate) / 100;
    const bonusCommission = (investmentAmount * bonusRate) / 100;
    const totalCommission = baseCommission + bonusCommission;

    // Find next tier
    const nextTier = structure.baseTiers.find(tier => tier.minVolume > currentVolume);
    const volumeToNextTier = nextTier ? nextTier.minVolume - currentVolume : 0;

    // Project yearly commission based on current calculation
    const projectedYearlyCommission = projectionMode === 'monthly' 
      ? totalCommission * 12 
      : totalCommission * 4; // Assuming quarterly investments

    const result: CommissionCalculation = {
      investmentAmount,
      propertyType,
      baseRate,
      bonusRate,
      totalRate,
      baseCommission,
      bonusCommission,
      totalCommission,
      tier: currentTier,
      nextTier,
      volumeToNextTier,
      projectedYearlyCommission
    };

    setCalculation(result);
    onCalculate?.(result);
  };

  useEffect(() => {
    calculateCommission();
  }, [investmentAmount, propertyType, referralCount, projectionMode]);

  const getTierColor = (tier: CommissionTier) => {
    if (tier.rate >= 5) return 'text-purple-600 dark:text-purple-400';
    if (tier.rate >= 4) return 'text-green-600 dark:text-green-400';
    if (tier.rate >= 3) return 'text-blue-600 dark:text-blue-400';
    return 'text-yellow-600 dark:text-yellow-400';
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
            Commission Calculator
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setProjectionMode(projectionMode === 'single' ? 'monthly' : 'single')}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              {projectionMode === 'single' ? 'Show Monthly Projection' : 'Show Single Transaction'}
            </button>
          </div>
        </div>

        {/* Current Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {currentTier.name}
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-300">Current Tier</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-lg font-semibold text-green-600 dark:text-green-400">
              {currentTier.rate}%
            </div>
            <div className="text-sm text-green-800 dark:text-green-300">Base Rate</div>
          </div>
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
              ${currentVolume.toLocaleString()}
            </div>
            <div className="text-sm text-purple-800 dark:text-purple-300">Total Volume</div>
          </div>
          <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
              {structure.payoutSchedule.charAt(0).toUpperCase() + structure.payoutSchedule.slice(1)}
            </div>
            <div className="text-sm text-orange-800 dark:text-orange-300">Payout Schedule</div>
          </div>
        </div>
      </div>

      {/* Calculator Form */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100">
              Investment Details
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                Investment Amount
              </label>
              <Input
                type="number"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(parseInt(e.target.value) || 0)}
                min={1000}
                step={1000}
                className="w-full"
              />
              <div className="mt-1 flex space-x-2">
                {[25000, 50000, 100000, 250000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setInvestmentAmount(amount)}
                    className="px-2 py-1 text-xs bg-neutral-100 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 rounded hover:bg-neutral-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    ${amount.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                Property Type
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full border border-neutral-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
              >
                <option value="standard">Standard Property</option>
                <option value="construction">Construction Property (+{structure.specialRates.constructionProperties}%)</option>
                <option value="premium">Premium Property (+{structure.specialRates.premiumProperties}%)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                Additional Referrals This Month
              </label>
              <Input
                type="number"
                value={referralCount}
                onChange={(e) => setReferralCount(parseInt(e.target.value) || 0)}
                min={0}
                className="w-full"
              />
              <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
                +{structure.specialRates.referralBonus}% per referral
              </p>
            </div>
          </div>

          {/* Results Section */}
          {calculation && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100">
                Commission Breakdown
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                  <span className="text-sm text-neutral-600 dark:text-slate-400">Investment Amount</span>
                  <span className="font-semibold text-neutral-900 dark:text-slate-100">
                    ${calculation.investmentAmount.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm text-blue-600 dark:text-blue-400">Base Commission ({calculation.baseRate}%)</span>
                  <span className="font-semibold text-blue-800 dark:text-blue-300">
                    ${calculation.baseCommission.toLocaleString()}
                  </span>
                </div>

                {calculation.bonusCommission > 0 && (
                  <div className="flex justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-sm text-green-600 dark:text-green-400">Bonus Commission ({calculation.bonusRate}%)</span>
                    <span className="font-semibold text-green-800 dark:text-green-300">
                      ${calculation.bonusCommission.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                  <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">Total Commission ({calculation.totalRate}%)</span>
                  <span className="text-lg font-bold text-purple-800 dark:text-purple-300">
                    ${calculation.totalCommission.toLocaleString()}
                  </span>
                </div>

                {projectionMode === 'monthly' && (
                  <div className="flex justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <span className="text-sm text-orange-600 dark:text-orange-400">Yearly Projection</span>
                    <span className="font-semibold text-orange-800 dark:text-orange-300">
                      ${calculation.projectedYearlyCommission.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Next Tier Info */}
              {calculation.nextTier && calculation.volumeToNextTier && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                      Next Tier: {calculation.nextTier.name}
                    </span>
                    <span className="text-sm text-yellow-600 dark:text-yellow-400">
                      {calculation.nextTier.rate}% rate
                    </span>
                  </div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400">
                    ${calculation.volumeToNextTier.toLocaleString()} more volume needed
                  </div>
                  <div className="mt-2 w-full bg-yellow-200 dark:bg-yellow-800 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ 
                        width: `${Math.min((currentVolume / calculation.nextTier.minVolume) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Commission Structure */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100 mb-4">
            Commission Structure
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Base Tiers */}
            <div>
              <h4 className="font-medium text-neutral-900 dark:text-slate-100 mb-3">
                Base Commission Tiers
              </h4>
              <div className="space-y-2">
                {structure.baseTiers.map((tier) => (
                  <div
                    key={tier.id}
                    className={`p-3 rounded-lg border-2 ${
                      tier.id === currentTier.id
                        ? 'border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/20'
                        : 'border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-neutral-900 dark:text-slate-100">
                          {tier.name}
                        </span>
                        <p className="text-xs text-neutral-600 dark:text-slate-400">
                          ${tier.minVolume.toLocaleString()}{tier.maxVolume ? ` - $${tier.maxVolume.toLocaleString()}` : '+'}
                        </p>
                      </div>
                      <span className={`font-bold ${getTierColor(tier)}`}>
                        {tier.rate}%
                      </span>
                    </div>
                    {tier.requirements && tier.requirements.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-neutral-500 dark:text-slate-400">
                          Requirements: {tier.requirements.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Special Rates */}
            <div>
              <h4 className="font-medium text-neutral-900 dark:text-slate-100 mb-3">
                Special Rates & Bonuses
              </h4>
              <div className="space-y-3">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-sm text-green-800 dark:text-green-300">Construction Properties</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      +{structure.specialRates.constructionProperties}%
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-sm text-purple-800 dark:text-purple-300">Premium Properties</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      +{structure.specialRates.premiumProperties}%
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-800 dark:text-blue-300">Referral Bonus</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {structure.specialRates.referralBonus}% per referral
                    </span>
                  </div>
                </div>
                {structure.specialRates.teamOverride && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-sm text-orange-800 dark:text-orange-300">Team Override</span>
                      <span className="font-semibold text-orange-600 dark:text-orange-400">
                        {structure.specialRates.teamOverride}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                <div className="text-xs text-neutral-600 dark:text-slate-400 space-y-1">
                  <p><strong>Minimum Payout:</strong> ${structure.minimumPayout.toLocaleString()}</p>
                  <p><strong>Payout Schedule:</strong> {structure.payoutSchedule.replace('_', ' ').charAt(0).toUpperCase() + structure.payoutSchedule.replace('_', ' ').slice(1)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {calculation && (
          <div className="mt-6 flex items-center space-x-3">
            <Button
              variant="primary"
              onClick={calculateCommission}
            >
              Recalculate
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const calculationText = `
Commission Calculation:
Investment: $${calculation.investmentAmount.toLocaleString()}
Property Type: ${calculation.propertyType}
Total Rate: ${calculation.totalRate}%
Total Commission: $${calculation.totalCommission.toLocaleString()}
                `.trim();
                navigator.clipboard.writeText(calculationText);
              }}
            >
              Copy Results
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};