import React, { useState, useMemo } from 'react';
import { Button } from '../ui/Button';
import type { InstallmentPlan } from './InstallmentInvestment';

export interface PaymentScheduleOption extends InstallmentPlan {
  popularity: number; // 0-100, for showing "most popular" badges
  suitableFor: string[];
  constructionMilestones?: {
    milestone: string;
    paymentPercentage: number;
    estimatedDate: string;
  }[];
}

interface PaymentScheduleSelectorProps {
  investmentAmount: number;
  availableOptions: PaymentScheduleOption[];
  selectedPlanId?: string;
  onPlanSelect: (planId: string) => void;
  onCustomPlan?: () => void;
  showComparison?: boolean;
  className?: string;
}

export const PaymentScheduleSelector: React.FC<PaymentScheduleSelectorProps> = ({
  investmentAmount,
  availableOptions,
  selectedPlanId,
  onPlanSelect,
  onCustomPlan,
  showComparison = true,
  className = ''
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [sortBy, setSortBy] = useState<'popular' | 'total_cost' | 'down_payment' | 'apr'>('popular');

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
  const formatPercentage = (percentage: number) => `${percentage}%`;

  const calculatePlanDetails = (plan: PaymentScheduleOption) => {
    const downPayment = (investmentAmount * plan.downPaymentPercentage) / 100;
    const totalInterest = (investmentAmount * plan.totalInterest) / 100;
    const totalCost = investmentAmount + totalInterest;
    const monthlyPayment = plan.installmentAmount;

    return {
      downPayment,
      totalInterest,
      totalCost,
      monthlyPayment,
      savings: investmentAmount - totalCost // negative means additional cost
    };
  };

  const sortedOptions = useMemo(() => {
    return [...availableOptions].sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.popularity - a.popularity;
        case 'total_cost':
          return calculatePlanDetails(a).totalCost - calculatePlanDetails(b).totalCost;
        case 'down_payment':
          return calculatePlanDetails(a).downPayment - calculatePlanDetails(b).downPayment;
        case 'apr':
          return a.effectiveAPR - b.effectiveAPR;
        default:
          return 0;
      }
    });
  }, [availableOptions, investmentAmount, sortBy]);

  const mostPopularPlan = availableOptions.reduce((prev, current) => 
    prev.popularity > current.popularity ? prev : current
  );

  const getBadgeColor = (plan: PaymentScheduleOption) => {
    if (plan.id === mostPopularPlan.id) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
    if (plan.effectiveAPR === Math.min(...availableOptions.map(p => p.effectiveAPR))) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    }
    if (plan.downPaymentPercentage === Math.min(...availableOptions.map(p => p.downPaymentPercentage))) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    }
    return '';
  };

  const getBadgeText = (plan: PaymentScheduleOption) => {
    if (plan.id === mostPopularPlan.id) return 'Most Popular';
    if (plan.effectiveAPR === Math.min(...availableOptions.map(p => p.effectiveAPR))) return 'Lowest Interest';
    if (plan.downPaymentPercentage === Math.min(...availableOptions.map(p => p.downPaymentPercentage))) return 'Lowest Down Payment';
    return '';
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
              Choose Your Payment Schedule
            </h2>
            <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">
              Investment Amount: {formatCurrency(investmentAmount)}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-neutral-200 dark:border-slate-600 rounded-lg px-3 py-1 bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
            >
              <option value="popular">Sort by Popularity</option>
              <option value="total_cost">Sort by Total Cost</option>
              <option value="down_payment">Sort by Down Payment</option>
              <option value="apr">Sort by Interest Rate</option>
            </select>
            <div className="flex rounded-lg border border-neutral-200 dark:border-slate-600 overflow-hidden">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 text-sm ${
                  viewMode === 'cards'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-slate-700 text-neutral-700 dark:text-slate-300'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-sm ${
                  viewMode === 'table'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-slate-700 text-neutral-700 dark:text-slate-300'
                }`}
              >
                Compare
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Options */}
      <div className="p-6">
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedOptions.map((plan) => {
              const details = calculatePlanDetails(plan);
              const isSelected = selectedPlanId === plan.id;
              const badgeColor = getBadgeColor(plan);
              const badgeText = getBadgeText(plan);

              return (
                <div
                  key={plan.id}
                  className={`relative p-6 border rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg'
                      : 'border-neutral-200 dark:border-slate-700 hover:border-primary-300 hover:shadow-md'
                  }`}
                  onClick={() => onPlanSelect(plan.id)}
                >
                  {/* Badge */}
                  {badgeText && (
                    <div className={`absolute -top-2 -right-2 px-2 py-1 text-xs font-medium rounded-full ${badgeColor}`}>
                      {badgeText}
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => onPlanSelect(plan.id)}
                        className="text-primary-600"
                      />
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
                        {plan.name}
                      </h3>
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-slate-400">
                      {plan.description}
                    </p>
                  </div>

                  {/* Key Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-500 dark:text-slate-400">Down Payment</span>
                      <span className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
                        {formatCurrency(details.downPayment)} ({formatPercentage(plan.downPaymentPercentage)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-500 dark:text-slate-400">
                        {plan.paymentFrequency.charAt(0).toUpperCase() + plan.paymentFrequency.slice(1)} Payment
                      </span>
                      <span className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
                        {formatCurrency(details.monthlyPayment)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-500 dark:text-slate-400">Total Payments</span>
                      <span className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
                        {plan.totalPayments}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-neutral-200 dark:border-slate-700 pt-2">
                      <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">Total Cost</span>
                      <span className="text-sm font-bold text-neutral-900 dark:text-slate-100">
                        {formatCurrency(details.totalCost)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-500 dark:text-slate-400">APR</span>
                      <span className={`text-sm font-medium ${
                        plan.effectiveAPR <= 5 ? 'text-green-600 dark:text-green-400' :
                        plan.effectiveAPR <= 10 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {formatPercentage(plan.effectiveAPR)}
                      </span>
                    </div>
                  </div>

                  {/* Token Release Schedule */}
                  <div className="mb-4 p-3 bg-neutral-50 dark:bg-slate-900/50 rounded-lg">
                    <div className="text-xs font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Token Release
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-slate-400">
                      {plan.tokenReleaseSchedule === 'immediate' && 'All tokens released immediately'}
                      {plan.tokenReleaseSchedule === 'partial' && 'Tokens released with each payment'}
                      {plan.tokenReleaseSchedule === 'completion' && 'All tokens released upon completion'}
                    </div>
                  </div>

                  {/* Suitable For */}
                  <div className="mb-4">
                    <div className="text-xs font-medium text-neutral-700 dark:text-slate-300 mb-2">
                      Best For:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {plan.suitableFor.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Benefits */}
                  {plan.benefits && plan.benefits.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-green-700 dark:text-green-400">
                        Benefits:
                      </div>
                      {plan.benefits.slice(0, 2).map((benefit, index) => (
                        <div key={index} className="text-xs text-neutral-600 dark:text-slate-400 flex items-start">
                          <span className="text-green-500 mr-1 flex-shrink-0">✓</span>
                          {benefit}
                        </div>
                      ))}
                      {plan.benefits.length > 2 && (
                        <div className="text-xs text-primary-600 dark:text-primary-400">
                          +{plan.benefits.length - 2} more benefits
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Comparison Table */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-medium text-neutral-900 dark:text-slate-100">Plan</th>
                  <th className="text-center py-3 px-4 font-medium text-neutral-900 dark:text-slate-100">Down Payment</th>
                  <th className="text-center py-3 px-4 font-medium text-neutral-900 dark:text-slate-100">Payments</th>
                  <th className="text-center py-3 px-4 font-medium text-neutral-900 dark:text-slate-100">APR</th>
                  <th className="text-center py-3 px-4 font-medium text-neutral-900 dark:text-slate-100">Total Cost</th>
                  <th className="text-center py-3 px-4 font-medium text-neutral-900 dark:text-slate-100">Token Release</th>
                  <th className="text-center py-3 px-4 font-medium text-neutral-900 dark:text-slate-100">Select</th>
                </tr>
              </thead>
              <tbody>
                {sortedOptions.map((plan) => {
                  const details = calculatePlanDetails(plan);
                  const isSelected = selectedPlanId === plan.id;
                  
                  return (
                    <tr
                      key={plan.id}
                      className={`border-b border-neutral-100 dark:border-slate-800 cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-neutral-50 dark:hover:bg-slate-700'
                      }`}
                      onClick={() => onPlanSelect(plan.id)}
                    >
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium text-neutral-900 dark:text-slate-100">
                            {plan.name}
                          </div>
                          <div className="text-sm text-neutral-600 dark:text-slate-400">
                            {plan.description}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="font-medium text-neutral-900 dark:text-slate-100">
                          {formatCurrency(details.downPayment)}
                        </div>
                        <div className="text-sm text-neutral-600 dark:text-slate-400">
                          {formatPercentage(plan.downPaymentPercentage)}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="font-medium text-neutral-900 dark:text-slate-100">
                          {plan.totalPayments} × {formatCurrency(details.monthlyPayment)}
                        </div>
                        <div className="text-sm text-neutral-600 dark:text-slate-400">
                          {plan.paymentFrequency}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className={`font-medium ${
                          plan.effectiveAPR <= 5 ? 'text-green-600 dark:text-green-400' :
                          plan.effectiveAPR <= 10 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {formatPercentage(plan.effectiveAPR)}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="font-medium text-neutral-900 dark:text-slate-100">
                          {formatCurrency(details.totalCost)}
                        </div>
                        {details.totalInterest > 0 && (
                          <div className="text-sm text-red-600 dark:text-red-400">
                            +{formatCurrency(details.totalInterest)} interest
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="text-sm text-neutral-600 dark:text-slate-400">
                          {plan.tokenReleaseSchedule.charAt(0).toUpperCase() + plan.tokenReleaseSchedule.slice(1)}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <input
                          type="radio"
                          checked={isSelected}
                          onChange={() => onPlanSelect(plan.id)}
                          className="text-primary-600"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Custom Plan Option */}
        {onCustomPlan && (
          <div className="mt-6 p-4 border border-dashed border-neutral-300 dark:border-slate-600 rounded-lg text-center">
            <div className="text-neutral-600 dark:text-slate-400 mb-2">
              Don't see a plan that fits your needs?
            </div>
            <Button
              variant="outline"
              onClick={onCustomPlan}
              className="text-sm"
            >
              Request Custom Payment Plan
            </Button>
          </div>
        )}
      </div>

      {/* Selected Plan Summary */}
      {selectedPlanId && (
        <div className="border-t border-neutral-200 dark:border-slate-700 p-6 bg-neutral-50 dark:bg-slate-900/50">
          {(() => {
            const selectedPlan = sortedOptions.find(plan => plan.id === selectedPlanId);
            if (!selectedPlan) return null;
            
            const details = calculatePlanDetails(selectedPlan);
            
            return (
              <div>
                <h3 className="font-medium text-neutral-900 dark:text-slate-100 mb-3">
                  Selected: {selectedPlan.name}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-neutral-500 dark:text-slate-400">Due Now</span>
                    <div className="font-semibold text-neutral-900 dark:text-slate-100">
                      {formatCurrency(details.downPayment)}
                    </div>
                  </div>
                  <div>
                    <span className="text-neutral-500 dark:text-slate-400">Then</span>
                    <div className="font-semibold text-neutral-900 dark:text-slate-100">
                      {plan.totalPayments} payments of {formatCurrency(details.monthlyPayment)}
                    </div>
                  </div>
                  <div>
                    <span className="text-neutral-500 dark:text-slate-400">Total Cost</span>
                    <div className="font-semibold text-neutral-900 dark:text-slate-100">
                      {formatCurrency(details.totalCost)}
                    </div>
                  </div>
                  <div>
                    <span className="text-neutral-500 dark:text-slate-400">Interest</span>
                    <div className={`font-semibold ${
                      details.totalInterest > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                    }`}>
                      {details.totalInterest > 0 ? `+${formatCurrency(details.totalInterest)}` : 'No Interest'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};