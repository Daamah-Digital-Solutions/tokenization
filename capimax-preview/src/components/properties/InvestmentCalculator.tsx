import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Target, 
  PieChart,
  BarChart3,
  Info,
  AlertTriangle,
  CheckCircle,
  Percent,
  Clock,
  Users,
  Shield
} from 'lucide-react';
import { Card } from '../design-system/cards/Card';
import { Button } from '../ui/Button';
import { Text } from '../design-system/typography/Text';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';

export interface InvestmentCalculatorProps {
  propertyTitle?: string;
  tokenPrice: number;
  totalTokens: number;
  soldTokens: number;
  expectedReturn: number;
  minInvestment: number;
  managementFee: number;
  dividendFrequency: 'monthly' | 'quarterly' | 'yearly';
  onInvest?: (amount: number, tokens: number) => void;
  className?: string;
}

interface CalculationResults {
  tokens: number;
  annualReturn: number;
  monthlyDividend: number;
  quarterlyDividend: number;
  yearlyDividend: number;
  totalReturn5Years: number;
  netReturn: number;
  breakEvenMonths: number;
  compoundReturn5Years: number;
  managementFeeCost: number;
}

export const InvestmentCalculator: React.FC<InvestmentCalculatorProps> = ({
  propertyTitle,
  tokenPrice,
  totalTokens,
  soldTokens,
  expectedReturn,
  minInvestment,
  managementFee = 2.5,
  dividendFrequency = 'quarterly',
  onInvest,
  className
}) => {
  const { t } = useTranslation(['propui', 'plan']);
  const remainingTokens = totalTokens - soldTokens;
  const [tokenCount, setTokenCount] = useState(1);
  const [investmentTerm, setInvestmentTerm] = useState(5); // years
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');

  const investmentAmount = tokenCount * tokenPrice;

  // Calculate investment results with zero-division guards
  const calculations: CalculationResults = useMemo(() => {
    const tokens = tokenCount;
    const amount = tokens * tokenPrice;
    const grossAnnualReturn = (amount * expectedReturn) / 100;
    const managementFeeCost = (amount * managementFee) / 100;
    const netAnnualReturn = grossAnnualReturn - managementFeeCost;

    const monthlyDividend = netAnnualReturn / 12;
    const quarterlyDividend = netAnnualReturn / 4;
    const yearlyDividend = netAnnualReturn;

    const totalReturn5Years = netAnnualReturn * investmentTerm;
    const compoundRate = (expectedReturn - managementFee) / 100;
    const compoundReturn5Years = amount * (Math.pow(1 + compoundRate, investmentTerm) - 1);

    // Guard against division by zero for breakEvenMonths
    const breakEvenMonths = monthlyDividend > 0 ? amount / monthlyDividend : 0;

    return {
      tokens,
      annualReturn: grossAnnualReturn,
      monthlyDividend,
      quarterlyDividend,
      yearlyDividend,
      totalReturn5Years,
      netReturn: netAnnualReturn,
      breakEvenMonths: Number.isFinite(breakEvenMonths) ? breakEvenMonths : 0,
      compoundReturn5Years,
      managementFeeCost
    };
  }, [tokenCount, tokenPrice, expectedReturn, managementFee, investmentTerm]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'high': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const handleTokenCountChange = (value: string) => {
    const numValue = parseInt(value, 10) || 1;
    const clampedValue = Math.max(1, Math.min(Math.floor(numValue), remainingTokens));
    setTokenCount(clampedValue);
  };

  const handleInvest = () => {
    if (tokenCount > 0) {
      onInvest?.(investmentAmount, tokenCount);
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header */}
      <div className="p-6 bg-gradient-to-r rtl:bg-gradient-to-l from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
            <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('calculator.title')}
            </h3>
            <Text variant="caption" color="muted">
              {t('calculator.subtitle', { title: propertyTitle || t('calculator.thisProperty') })}
            </Text>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Token Count Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('calculator.numberOfShares')}
            </label>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {t('calculator.perShare', { price: formatCurrency(tokenPrice) })}
            </span>
          </div>

          <input
            type="number"
            value={tokenCount}
            onChange={(e) => handleTokenCountChange(e.target.value)}
            min={1}
            max={remainingTokens}
            step={1}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg font-semibold text-center"
          />

          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>{t('calculator.minOne')}</span>
            <span>{t('calculator.available', { n: remainingTokens.toLocaleString() })}</span>
          </div>

          {/* Quick Token Buttons */}
          <div className="flex gap-2 flex-wrap">
            {[1, 5, 10, 25, 50].filter(count => count <= remainingTokens).map((count) => (
              <button
                key={count}
                onClick={() => setTokenCount(count)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-lg border transition-all",
                  tokenCount === count
                    ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750"
                )}
              >
                {t('calculator.shareCount', { count })}
              </button>
            ))}
          </div>
        </div>

        {/* Ownership Term */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Calendar className="w-4 h-4 text-emerald-600" />
            {t('calculator.term')}
          </label>
          
          <div className="flex gap-2">
            {[1, 3, 5, 10].map((years) => (
              <button
                key={years}
                onClick={() => setInvestmentTerm(years)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                  investmentTerm === years
                    ? "bg-emerald-500 text-white shadow-lg"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                {t('calculator.years', { count: years })}
              </button>
            ))}
          </div>
        </div>

        {/* Key Results */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-4 space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">{t('calculator.yourOwnership')}</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('calculator.shares')}</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {tokenCount}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('calculator.totalCost')}</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(investmentAmount)}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-emerald-200 dark:border-emerald-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t(`calculator.frequencyReturn.${dividendFrequency}`)}
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                {dividendFrequency === 'monthly' && formatCurrency(calculations.monthlyDividend)}
                {dividendFrequency === 'quarterly' && formatCurrency(calculations.quarterlyDividend)}
                {dividendFrequency === 'yearly' && formatCurrency(calculations.yearlyDividend)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('calculator.termTotalReturn', { count: investmentTerm })}
              </span>
              <span className="font-bold text-gray-900 dark:text-white text-lg">
                {formatCurrency(calculations.compoundReturn5Years)}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Toggle */}
        <Button
          variant="ghost"
          onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
          className="w-full flex items-center justify-center gap-2"
        >
          <BarChart3 className="w-4 h-4" />
          {showDetailedBreakdown ? t('calculator.hideBreakdown') : t('calculator.showBreakdown')}
        </Button>

        {/* Detailed Breakdown */}
        {showDetailedBreakdown && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">{t('calculator.returnBreakdown')}</h4>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('calculator.grossAnnual', { percent: formatPercent(expectedReturn) })}</span>
                  <span className="font-medium">{formatCurrency(calculations.annualReturn)}</span>
                </div>
                <div className="flex justify-between text-red-600 dark:text-red-400">
                  <span>{t('calculator.managementFee', { percent: formatPercent(managementFee) })}</span>
                  <span>-{formatCurrency(calculations.managementFeeCost)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span>{t('calculator.netAnnual')}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(calculations.netReturn)}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">{t('calculator.metrics')}</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('calculator.breakEven')}</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {t('calculator.months', { count: Math.round(calculations.breakEvenMonths) })}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('calculator.roiAfter', { count: investmentTerm })}</span>
                  </div>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {formatPercent(investmentAmount > 0 ? (calculations.compoundReturn5Years / investmentAmount) * 100 : 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('calculator.effectiveRate')}</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatPercent(expectedReturn - managementFee)}
                  </span>
                </div>
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">{t('calculator.riskAssessment')}</h4>
              
              <div className="space-y-3">
                <div className={cn("flex items-center gap-2", getRiskLevelColor(riskLevel))}>
                  {riskLevel === 'low' && <CheckCircle className="w-4 h-4" />}
                  {riskLevel === 'medium' && <Info className="w-4 h-4" />}
                  {riskLevel === 'high' && <AlertTriangle className="w-4 h-4" />}
                  <span className="text-sm font-medium">
                    {t(`calculator.riskLevel.${riskLevel}`)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Shield className="w-3 h-3" />
                    <span>{t('calculator.secCompliant')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Users className="w-3 h-3" />
                    <span>{t('calculator.diversified')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-3 h-3" />
                    <span>{t('calculator.insured')}</span>
                  </div>
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <strong>{t('calculator.disclaimerLabel')}</strong> {t('calculator.disclaimer')}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Investment CTA */}
        <div className="space-y-3">
          <Button
            variant="primary"
            size="lg"
            onClick={handleInvest}
            disabled={tokenCount === 0}
            className="w-full font-semibold"
          >
            {t('plan:buy.cash', { count: tokenCount, total: formatCurrency(investmentAmount) })}
          </Button>

          <div className="text-center">
            <Text variant="caption" color="muted">
              {t('calculator.equation', { shares: t('calculator.shareCount', { count: tokenCount }), price: formatCurrency(tokenPrice), total: formatCurrency(investmentAmount) })}
            </Text>
          </div>
        </div>
      </div>
    </Card>
  );
};