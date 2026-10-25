import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  PieChart,
  Calculator,
  Info,
  Minus,
  Plus,
  Target,
  Coins
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../design-system/cards/Card';
import { Text } from '../design-system/typography/Text';
import type { InvestmentProperty, InvestmentData } from './types';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';

interface AmountSelectorProps {
  property: InvestmentProperty;
  investmentData: InvestmentData;
  onUpdate: (updates: Partial<InvestmentData>) => void;
  errors: Record<string, string>;
}

const presetTokenCounts = [1, 5, 10, 25, 50, 100];

export const AmountSelector: React.FC<AmountSelectorProps> = ({
  property,
  investmentData,
  onUpdate,
  errors
}) => {
  const { t } = useTranslation('invest');
  const [customTokens, setCustomTokens] = useState(investmentData.tokens.toString());
  const [showAdvanced, setShowAdvanced] = useState(false);

  const availableTokens = property.totalTokens - property.soldTokens;
  const fundingPercentage = Math.round((property.soldTokens / property.totalTokens) * 100);

  useEffect(() => {
    setCustomTokens(investmentData.tokens.toString());
  }, [investmentData.tokens]);

  const handleTokenChange = (newTokens: number) => {
    const clampedTokens = Math.max(1, Math.min(Math.floor(newTokens), availableTokens));
    onUpdate({ tokens: clampedTokens });
  };

  const handleCustomTokenChange = (value: string) => {
    setCustomTokens(value);
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      handleTokenChange(numValue);
    }
    // Real-time validation feedback
    if (value === '' || isNaN(numValue)) return;
    if (numValue < 1) {
      onUpdate({ tokens: numValue });
    } else if (numValue > availableTokens) {
      onUpdate({ tokens: numValue });
    }
  };

  const adjustTokens = (increment: number) => {
    const newTokens = investmentData.tokens + increment;
    handleTokenChange(newTokens);
  };

  const calculateReturns = () => {
    const { amount } = investmentData;
    const { avgAnnualReturn, managementFee, dividendFrequency } = property.investment;

    const grossAnnualReturn = (amount * avgAnnualReturn) / 100;
    const managementFeeAmount = (amount * managementFee) / 100;
    const netAnnualReturn = grossAnnualReturn - managementFeeAmount;

    const paymentsPerYear = dividendFrequency === 'Quarterly' ? 4 :
                           dividendFrequency === 'Monthly' ? 12 :
                           dividendFrequency === 'Semi-annually' ? 2 : 1;

    const dividendPerPayment = netAnnualReturn / paymentsPerYear;

    return {
      grossAnnualReturn,
      netAnnualReturn,
      managementFeeAmount,
      dividendPerPayment,
      paymentsPerYear,
      roi: amount > 0 ? (netAnnualReturn / amount) * 100 : 0
    };
  };

  const returns = calculateReturns();

  return (
    <div className="space-y-8">
      {/* Token Selection Input */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Text variant="h3" weight="semibold">
            {t('amount.title')}
          </Text>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-4 h-4" />
            <Text variant="bodySmall" weight="medium">
              {t('amount.perShare', { price: `$${property.tokenPrice.toLocaleString()}` })}
            </Text>
          </div>
        </div>

        {/* Token Input Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('amount.numberOfShares')}
              </label>
              <div className="relative">
                <Coins className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={customTokens}
                  onChange={(e) => handleCustomTokenChange(e.target.value)}
                  min={1}
                  max={availableTokens}
                  step={1}
                  className={cn(
                    "w-full ps-12 pe-16 py-4 text-xl font-semibold border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-colors",
                    errors.tokens
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 dark:border-gray-600 focus:ring-emerald-500 focus:border-emerald-500"
                  )}
                  placeholder={t('amount.placeholder')}
                />
                <div className="absolute end-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => adjustTokens(-1)}
                    disabled={investmentData.tokens <= 1}
                    className="w-8 h-8 p-0"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => adjustTokens(1)}
                    disabled={investmentData.tokens >= availableTokens}
                    className="w-8 h-8 p-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {errors.tokens && (
                <Text variant="bodySmall" className="text-red-500 mt-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  {errors.tokens}
                </Text>
              )}

              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('amount.available', { available: availableTokens.toLocaleString() })}
              </div>
            </div>

            {/* Total Cost Calculation */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 rounded-xl text-center min-w-[140px]">
              <Text variant="bodySmall" color="muted" className="mb-1">
                {t('amount.totalCost')}
              </Text>
              <Text variant="h2" className="text-emerald-600 dark:text-emerald-400">
                ${investmentData.amount.toLocaleString()}
              </Text>
              <Text variant="bodySmall" color="muted">
                {investmentData.tokens} x ${property.tokenPrice.toLocaleString()}
              </Text>
            </div>
          </div>
        </Card>

        {/* Preset Token Buttons */}
        <div>
          <Text variant="bodyLarge" weight="medium" className="mb-3">
            {t('amount.quickSelect')}
          </Text>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {presetTokenCounts.map((count) => (
              <Button
                key={count}
                variant={investmentData.tokens === count ? "primary" : "secondary"}
                size="md"
                onClick={() => handleTokenChange(count)}
                disabled={count > availableTokens}
                className="text-center"
              >
                {t('common.shareCount', { count })}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Investment Summary */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Text variant="h3" weight="semibold" className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-600" />
            {t('amount.summary')}
          </Text>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-gray-600 dark:text-gray-400"
          >
            {showAdvanced ? t('amount.hideAdvanced') : t('amount.showAdvanced')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Annual Return */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <Text variant="bodySmall" color="muted">{t('amount.annualReturn')}</Text>
            </div>
            <Text variant="h2" className="text-emerald-600 dark:text-emerald-400">
              ${returns.netAnnualReturn.toLocaleString()}
            </Text>
            <Text variant="bodySmall" color="muted">
              {t('amount.roi', { value: returns.roi.toFixed(1) })}
            </Text>
          </div>

          {/* Dividend Payments */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <PieChart className="w-4 h-4 text-blue-600" />
              <Text variant="bodySmall" color="muted">{t('amount.dividend', { frequency: t(`common.frequency.${property.investment.dividendFrequency}`, { defaultValue: property.investment.dividendFrequency }) })}</Text>
            </div>
            <Text variant="h2" className="text-blue-600 dark:text-blue-400">
              ${returns.dividendPerPayment.toLocaleString()}
            </Text>
            <Text variant="bodySmall" color="muted">
              {t('amount.paymentsPerYear', { value: returns.paymentsPerYear })}
            </Text>
          </div>

          {/* Token Ownership */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-purple-600" />
              <Text variant="bodySmall" color="muted">{t('amount.ownershipShare')}</Text>
            </div>
            <Text variant="h2" className="text-purple-600 dark:text-purple-400">
              {((investmentData.tokens / property.totalTokens) * 100).toFixed(3)}%
            </Text>
            <Text variant="bodySmall" color="muted">
              {t('amount.ofTotalProperty')}
            </Text>
          </div>
        </div>

        {/* Advanced Details */}
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Text variant="bodyLarge" weight="semibold" className="mb-3">
                  {t('amount.returnBreakdown')}
                </Text>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('amount.grossAnnualReturn')}</span>
                    <span className="font-medium">${returns.grossAnnualReturn.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('amount.managementFee')}</span>
                    <span className="font-medium text-red-600">-${returns.managementFeeAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-900 dark:text-white font-medium">{t('amount.netAnnualReturn')}</span>
                    <span className="font-semibold text-emerald-600">${returns.netAnnualReturn.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <Text variant="bodyLarge" weight="semibold" className="mb-3">
                  {t('amount.shareDetails')}
                </Text>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('common.pricePerShare')}:</span>
                    <span className="font-medium">${property.tokenPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('amount.sharesSelected')}</span>
                    <span className="font-medium">{investmentData.tokens.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('amount.expectedReturnRate')}</span>
                    <span className="font-medium">{property.investment.avgAnnualReturn}%</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-900 dark:text-white font-medium">{t('amount.totalCost')}:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">${investmentData.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Funding Progress */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <Text variant="bodyLarge" weight="semibold">{t('amount.fundingProgress')}</Text>
                <Text variant="bodyLarge" className="text-emerald-600 dark:text-emerald-400">
                  {t('amount.percentComplete', { value: fundingPercentage })}
                </Text>
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden mb-2">
                <motion.div
                  initial={{ width: `${fundingPercentage}%` }}
                  animate={{
                    width: `${Math.min(100, fundingPercentage + ((investmentData.tokens / property.totalTokens) * 100))}%`
                  }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full relative"
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </motion.div>
              </div>

              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>{t('amount.sold', { value: property.soldTokens.toLocaleString() })}</span>
                <span>{t('amount.yourPurchase', { value: investmentData.tokens.toLocaleString() })}</span>
                <span>{t('amount.totalShares', { value: property.totalTokens.toLocaleString() })}</span>
              </div>
            </div>
          </motion.div>
        )}
      </Card>

      {/* Risk Disclaimer */}
      <Card className="p-4 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <Text variant="bodySmall" weight="semibold" className="text-amber-800 dark:text-amber-200 mb-1">
              {t('amount.riskTitle')}
            </Text>
            <Text variant="bodySmall" className="text-amber-700 dark:text-amber-300 leading-relaxed">
              {t('amount.riskBody')}
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
};
