import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Coins,
  CreditCard,
  Wallet,
  Receipt,
  X,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../design-system/cards/Card';
import { Container } from '../design-system/layout/Container';
import { Text } from '../design-system/typography/Text';
import { AmountSelector } from './AmountSelector';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { TransactionProcessor } from './TransactionProcessor';
import { TransactionConfirmation } from './TransactionConfirmation';
import { cn } from '../../utils/cn';
import type { InvestmentProperty, InvestmentData, InvestmentFlowProps } from './types';

const steps = [
  {
    id: 'amount',
    title: 'Select Tokens',
    description: 'Choose how many tokens to purchase',
    icon: Coins
  },
  {
    id: 'payment',
    title: 'Payment Method',
    description: 'Select how you want to pay',
    icon: CreditCard
  },
  {
    id: 'process',
    title: 'Processing',
    description: 'Your transaction is being processed',
    icon: Wallet
  },
  {
    id: 'confirmation',
    title: 'Confirmation',
    description: 'Your investment is complete',
    icon: CheckCircle
  }
];

export const InvestmentFlow: React.FC<InvestmentFlowProps> = ({
  property,
  isOpen,
  onClose,
  onComplete,
  onGoToPortfolio,
  initialTokens
}) => {
  // If tokens were pre-selected from sidebar, start on Step 1 (payment) instead of Step 0
  const startStep = (initialTokens && initialTokens > 1) ? 1 : 0;
  const startTokens = initialTokens || 1;

  const [currentStep, setCurrentStep] = useState(startStep);
  const [investmentData, setInvestmentData] = useState<InvestmentData>({
    tokens: startTokens,
    amount: startTokens * property.tokenPrice,
    paymentMethod: null
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const currentStepData = steps[currentStep];

  const updateInvestmentData = useCallback((updates: Partial<InvestmentData>) => {
    setInvestmentData(prev => {
      const newData = { ...prev, ...updates };

      // Recalculate amount when tokens change (tokens drive the price)
      if (updates.tokens !== undefined) {
        newData.amount = updates.tokens * property.tokenPrice;
      }

      return newData;
    });

    // Clear errors when data is updated
    setErrors({});
  }, [property.tokenPrice]);

  const validateStep = (stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};
    const availableTokens = property.totalTokens - property.soldTokens;

    switch (stepIndex) {
      case 0: // Token validation
        if (investmentData.tokens < 1) {
          newErrors.tokens = 'You must purchase at least 1 token';
        }
        if (investmentData.tokens > availableTokens) {
          newErrors.tokens = `Only ${availableTokens.toLocaleString()} tokens available`;
        }
        break;

      case 1: // Payment method validation
        if (!investmentData.paymentMethod) {
          newErrors.paymentMethod = 'Please select a payment method';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;

    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Handle closing — warn user if mid-flow
  const handleCloseAttempt = () => {
    // On confirmation step, safe to close
    if (currentStep === 3) {
      handleClose();
      return;
    }
    // During processing, don't allow close
    if (currentStep === 2 && isProcessing) {
      return;
    }
    // On steps 0-1, if data entered, confirm
    if (currentStep > 0 || investmentData.tokens > 1 || investmentData.paymentMethod) {
      setShowCloseConfirm(true);
      return;
    }
    // Default: close directly
    handleClose();
  };

  const handleClose = () => {
    if (currentStep === 3) {
      onComplete?.(investmentData);
    }

    setCurrentStep(0);
    setInvestmentData({
      tokens: 1,
      amount: property.tokenPrice,
      paymentMethod: null
    });
    setErrors({});
    setIsProcessing(false);
    setShowCloseConfirm(false);
    onClose();
  };

  const handleTransactionComplete = (success: boolean, transactionId?: string) => {
    if (success && transactionId) {
      setCurrentStep(3); // Move to confirmation step
    }
    setIsProcessing(false);
  };

  // Handle going back to payment from processing (error recovery)
  const handleGoBackToPayment = () => {
    setCurrentStep(1);
    setIsProcessing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleCloseAttempt}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl mx-auto z-[61]"
        >
          <Card className="overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Invest in {property.title}
                  </h2>
                  <Text variant="body" color="muted" className="mt-1">
                    {currentStepData.description}
                  </Text>
                </div>
                {/* Hide close button during processing */}
                {!(currentStep === 2 && isProcessing) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseAttempt}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                )}
              </div>

              {/* Progress Steps */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center">
                      <div className="flex items-center">
                        <div
                          className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                            index < currentStep && "bg-emerald-500 border-emerald-500 text-white",
                            index === currentStep && "border-emerald-500 text-emerald-600 dark:text-emerald-400",
                            index > currentStep && "border-gray-300 dark:border-gray-600 text-gray-400"
                          )}
                        >
                          {index < currentStep ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <step.icon className="w-5 h-5" />
                          )}
                        </div>
                        <div className="ml-3 hidden sm:block">
                          <Text
                            variant="bodySmall"
                            weight="semibold"
                            className={cn(
                              index <= currentStep ? "text-gray-900 dark:text-white" : "text-gray-500"
                            )}
                          >
                            {step.title}
                          </Text>
                        </div>
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={cn(
                            "w-16 sm:w-24 h-0.5 mx-4 transition-colors",
                            index < currentStep ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                          )}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="min-h-[400px]"
                >
                  {currentStep === 0 && (
                    <AmountSelector
                      property={property}
                      investmentData={investmentData}
                      onUpdate={updateInvestmentData}
                      errors={errors}
                    />
                  )}

                  {currentStep === 1 && (
                    <PaymentMethodSelector
                      investmentData={investmentData}
                      onUpdate={updateInvestmentData}
                      errors={errors}
                    />
                  )}

                  {currentStep === 2 && (
                    <TransactionProcessor
                      property={property}
                      investmentData={investmentData}
                      onComplete={handleTransactionComplete}
                      isProcessing={isProcessing}
                      setIsProcessing={setIsProcessing}
                      autoStart={true}
                      onGoBack={handleGoBackToPayment}
                    />
                  )}

                  {currentStep === 3 && (
                    <TransactionConfirmation
                      property={property}
                      investmentData={investmentData}
                      onClose={handleClose}
                      onGoToPortfolio={() => {
                        onComplete?.(investmentData);
                        onGoToPortfolio?.();
                      }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer — visible on Steps 0 and 1 only */}
            {currentStep < 2 && (
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={currentStep === 0 ? handleCloseAttempt : handlePrevious}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {currentStep === 0 ? 'Cancel' : 'Back'}
                  </Button>

                  <div className="flex items-center gap-4">
                    {/* Summary chip */}
                    <div className="text-right hidden sm:block">
                      <Text variant="bodySmall" color="muted">
                        {investmentData.tokens} {investmentData.tokens === 1 ? 'token' : 'tokens'}
                      </Text>
                      <Text variant="bodyLarge" weight="semibold">
                        ${investmentData.amount.toLocaleString()}
                      </Text>
                    </div>

                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleNext}
                      className="flex items-center gap-2"
                    >
                      {currentStep === 0 ? 'Choose Payment' : 'Confirm & Pay'}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Close Confirmation Dialog */}
          <AnimatePresence>
            {showCloseConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center z-10"
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 mx-4 max-w-sm shadow-xl"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <Text variant="bodyLarge" weight="semibold">Cancel Investment?</Text>
                      <Text variant="bodySmall" color="muted">Your progress will be lost</Text>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowCloseConfirm(false)}
                      className="flex-1"
                    >
                      Continue Investing
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClose}
                      className="flex-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Yes, Cancel
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};
