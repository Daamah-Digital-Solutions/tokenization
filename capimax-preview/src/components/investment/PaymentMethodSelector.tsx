import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Wallet, 
  Building2,
  Bitcoin,
  Coins,
  Shield,
  Clock,
  CheckCircle,
  Info,
  AlertCircle,
  Star
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../design-system/cards/Card';
import { Text } from '../design-system/typography/Text';
import { Input } from '../design-system/forms/Input';
import { InvestmentData } from './InvestmentFlow';
import { cn } from '../../utils/cn';
import { EnhancedPaymentMethodSelector } from '../payments';

interface PaymentMethodSelectorProps {
  investmentData: InvestmentData;
  onUpdate: (updates: Partial<InvestmentData>) => void;
  errors: Record<string, string>;
  onPaymentComplete?: (paymentId: string, method: string) => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  investmentData,
  onUpdate,
  errors,
  onPaymentComplete
}) => {
  const handlePaymentSuccess = (paymentId: string, method: string) => {
    // Update investment data with payment information
    onUpdate({ 
      paymentId,
      paymentMethod: method,
      paymentStatus: 'completed'
    });
    
    // Call the completion callback if provided
    if (onPaymentComplete) {
      onPaymentComplete(paymentId, method);
    }
  };

  const handlePaymentCancel = () => {
    // Reset payment method selection
    onUpdate({ 
      paymentMethod: undefined,
      paymentId: undefined,
      paymentStatus: undefined
    });
  };

  // If no amount is specified, show placeholder
  if (!investmentData.amount || investmentData.amount <= 0) {
    return (
      <Card className="p-8 text-center">
        <Coins className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <Text variant="h4" className="text-gray-600 mb-2">
          Investment Amount Required
        </Text>
        <Text variant="bodySmall" className="text-gray-500">
          Please select an investment amount to proceed with payment options
        </Text>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Payment Method Selector */}
      <EnhancedPaymentMethodSelector
        amount={investmentData.amount}
        onPaymentComplete={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
      />

      {/* Error Display */}
      {errors.paymentMethod && (
        <Card className="p-4 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <Text variant="bodySmall">{errors.paymentMethod}</Text>
          </div>
        </Card>
      )}

      {/* Success State */}
      {investmentData.paymentStatus === 'completed' && investmentData.paymentId && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-6 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <Text variant="bodyLarge" weight="semibold" className="text-emerald-800 dark:text-emerald-200 mb-1">
                  Payment Successful!
                </Text>
                <Text variant="bodySmall" className="text-emerald-700 dark:text-emerald-300 mb-3">
                  Your payment of ${investmentData.amount?.toLocaleString()} has been processed successfully.
                </Text>
                <div className="text-xs text-emerald-600 dark:text-emerald-400">
                  Payment ID: {investmentData.paymentId}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
};