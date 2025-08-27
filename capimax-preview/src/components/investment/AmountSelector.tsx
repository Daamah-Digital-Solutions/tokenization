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
  Target
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../design-system/cards/Card';
import { Text } from '../design-system/typography/Text';
import { Input } from '../design-system/forms/Input';
import { Property, InvestmentData } from './InvestmentFlow';
import { cn } from '../../utils/cn';

interface AmountSelectorProps {
  property: Property;
  investmentData: InvestmentData;
  onUpdate: (updates: Partial<InvestmentData>) => void;
  errors: Record<string, string>;
}

const presetAmounts = [1000, 5000, 10000, 25000, 50000];

export const AmountSelector: React.FC<AmountSelectorProps> = ({
  property,
  investmentData,
  onUpdate,
  errors
}) => {
  const [customAmount, setCustomAmount] = useState(investmentData.amount.toString());
  const [showAdvanced, setShowAdvanced] = useState(false);

  const maxAvailableInvestment = (property.totalTokens - property.soldTokens) * property.tokenPrice;
  const fundingPercentage = Math.round((property.soldTokens / property.totalTokens) * 100);

  useEffect(() => {
    setCustomAmount(investmentData.amount.toString());
  }, [investmentData.amount]);

  const handleAmountChange = (newAmount: number) => {
    const clampedAmount = Math.max(property.investment.minInvestment, Math.min(newAmount, maxAvailableInvestment));
    onUpdate({ amount: clampedAmount });
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      handleAmountChange(numValue);
    }
  };

  const adjustAmount = (increment: number) => {
    const newAmount = investmentData.amount + increment;
    handleAmountChange(newAmount);
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
      roi: (netAnnualReturn / amount) * 100
    };
  };

  const returns = calculateReturns();

  return (
    <div className="space-y-8">
      {/* Investment Amount Input */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Text variant="h3" weight="semibold">
            Choose Your Investment Amount
          </Text>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Target className="w-4 h-4" />
            <Text variant="bodySmall" weight="medium">
              Min: ${property.investment.minInvestment.toLocaleString()}
            </Text>
          </div>
        </div>

        {/* Custom Amount Input */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Investment Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  min={property.investment.minInvestment}
                  max={maxAvailableInvestment}
                  step={100}
                  className={cn(
                    "w-full pl-12 pr-16 py-4 text-xl font-semibold border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-colors",
                    errors.amount
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 dark:border-gray-600 focus:ring-emerald-500 focus:border-emerald-500"
                  )}
                  placeholder="Enter amount"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => adjustAmount(-1000)}
                    disabled={investmentData.amount <= property.investment.minInvestment}
                    className="w-8 h-8 p-0"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => adjustAmount(1000)}
                    disabled={investmentData.amount >= maxAvailableInvestment}
                    className="w-8 h-8 p-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {errors.amount && (
                <Text variant="bodySmall" className="text-red-500 mt-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  {errors.amount}
                </Text>
              )}
              
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Available for investment: ${maxAvailableInvestment.toLocaleString()}
              </div>
            </div>

            {/* Token Calculation */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 rounded-xl text-center min-w-[120px]">
              <Text variant="bodySmall" color="muted" className="mb-1">
                You'll receive
              </Text>
              <Text variant="h2" className="text-emerald-600 dark:text-emerald-400">
                {investmentData.tokens}
              </Text>
              <Text variant="bodySmall" color="muted">
                tokens
              </Text>
            </div>
          </div>
        </Card>

        {/* Preset Amount Buttons */}
        <div>
          <Text variant="bodyLarge" weight="medium" className="mb-3">
            Quick Select
          </Text>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {presetAmounts.map((amount) => (
              <Button
                key={amount}
                variant={investmentData.amount === amount ? "primary" : "secondary"}
                size="md"
                onClick={() => handleAmountChange(amount)}
                disabled={amount > maxAvailableInvestment}
                className="text-center"
              >
                ${amount.toLocaleString()}
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
            Investment Summary
          </Text>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-gray-600 dark:text-gray-400"
          >
            {showAdvanced ? 'Hide' : 'Show'} Details
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Annual Return */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <Text variant="bodySmall" color="muted">Annual Return</Text>
            </div>
            <Text variant="h2" className="text-emerald-600 dark:text-emerald-400">
              ${returns.netAnnualReturn.toLocaleString()}
            </Text>
            <Text variant="bodySmall" color="muted">
              {returns.roi.toFixed(1)}% ROI
            </Text>
          </div>

          {/* Dividend Payments */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <PieChart className="w-4 h-4 text-blue-600" />
              <Text variant="bodySmall" color="muted">{property.investment.dividendFrequency} Dividend</Text>
            </div>
            <Text variant="h2" className="text-blue-600 dark:text-blue-400">
              ${returns.dividendPerPayment.toLocaleString()}
            </Text>
            <Text variant="bodySmall" color="muted">
              {returns.paymentsPerYear} payments/year
            </Text>
          </div>

          {/* Token Ownership */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-purple-600" />
              <Text variant="bodySmall" color="muted">Ownership Share</Text>
            </div>
            <Text variant="h2" className="text-purple-600 dark:text-purple-400">
              {((investmentData.tokens / property.totalTokens) * 100).toFixed(3)}%
            </Text>
            <Text variant="bodySmall" color="muted">
              of total property
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
                  Return Breakdown
                </Text>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Gross Annual Return:</span>
                    <span className="font-medium">${returns.grossAnnualReturn.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Management Fee:</span>
                    <span className="font-medium text-red-600">-${returns.managementFeeAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-900 dark:text-white font-medium">Net Annual Return:</span>
                    <span className="font-semibold text-emerald-600">${returns.netAnnualReturn.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <Text variant="bodyLarge" weight="semibold" className="mb-3">
                  Investment Details
                </Text>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Token Price:</span>
                    <span className="font-medium">${property.tokenPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Tokens Purchased:</span>
                    <span className="font-medium">{investmentData.tokens.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Expected Return Rate:</span>
                    <span className="font-medium">{property.investment.avgAnnualReturn}%</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-900 dark:text-white font-medium">Total Investment:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">${investmentData.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Funding Progress */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <Text variant="bodyLarge" weight="semibold">Property Funding Progress</Text>
                <Text variant="bodyLarge" className="text-emerald-600 dark:text-emerald-400">
                  {fundingPercentage}% Complete
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
                <span>{property.soldTokens.toLocaleString()} sold</span>
                <span>+{investmentData.tokens.toLocaleString()} your purchase</span>
                <span>{property.totalTokens.toLocaleString()} total</span>
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
              Investment Risk Disclosure
            </Text>
            <Text variant="bodySmall" className="text-amber-700 dark:text-amber-300 leading-relaxed">
              Real estate investments involve risk including potential loss of principal. Past performance does not guarantee future results. 
              Returns are projections based on current market conditions and are not guaranteed.
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
};