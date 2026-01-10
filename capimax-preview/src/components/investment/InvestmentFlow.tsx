import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  DollarSign,
  CreditCard,
  Wallet,
  Receipt,
  X
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
    title: 'Investment Amount', 
    description: 'Choose your investment amount',
    icon: DollarSign 
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
    description: 'Complete your transaction',
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
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [investmentData, setInvestmentData] = useState<InvestmentData>({
    amount: property.investment.minInvestment,
    tokens: Math.floor(property.investment.minInvestment / property.tokenPrice),
    paymentMethod: null
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Debug logging for currentStep changes
  useEffect(() => {
    console.log('📍 CURRENT STEP CHANGED TO:', currentStep);
    console.log('📍 Step name:', steps[currentStep]?.title);
  }, [currentStep]);

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const updateInvestmentData = useCallback((updates: Partial<InvestmentData>) => {
    setInvestmentData(prev => {
      const newData = { ...prev, ...updates };
      
      // Recalculate tokens when amount changes
      if (updates.amount) {
        newData.tokens = Math.floor(updates.amount / property.tokenPrice);
      }
      
      return newData;
    });
    
    // Clear errors when data is updated
    setErrors({});
  }, [property.tokenPrice]);

  const validateStep = (stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (stepIndex) {
      case 0: // Amount validation
        if (investmentData.amount < property.investment.minInvestment) {
          newErrors.amount = `Minimum investment is $${property.investment.minInvestment.toLocaleString()}`;
        }
        if (investmentData.amount > (property.totalTokens - property.soldTokens) * property.tokenPrice) {
          newErrors.amount = 'Investment amount exceeds available tokens';
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

  const handleAdvanceToProcessing = () => {
    console.log('🎯 HANDLE ADVANCE TO PROCESSING CALLED!');
    console.log('🎯 Current step before:', currentStep);
    setCurrentStep(2); // Move to processing step
    console.log('🎯 setCurrentStep(2) called - should advance to processing step');
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleClose = () => {
    // If we're on the confirmation step, call onComplete
    if (currentStep === 3) {
      console.log('✅ Investment flow completed successfully!');
      onComplete?.(investmentData);
    }

    setCurrentStep(0);
    setInvestmentData({
      amount: property.investment.minInvestment,
      tokens: Math.floor(property.investment.minInvestment / property.tokenPrice),
      paymentMethod: null
    });
    setErrors({});
    setIsProcessing(false);
    onClose();
  };

  const handleTransactionComplete = (success: boolean, transactionId?: string) => {
    if (success && transactionId) {
      console.log('🎯 Transaction complete, moving to confirmation step');
      setCurrentStep(3); // Move to confirmation step
      // DON'T call onComplete here - wait for user to close confirmation!
    }
    setIsProcessing(false);
  };

  const calculateReturns = () => {
    const annualReturn = (investmentData.amount * property.investment.avgAnnualReturn) / 100;
    const quarterlyDividend = annualReturn / 4;
    return { annualReturn, quarterlyDividend };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl mx-auto"
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </Button>
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
                      onAdvanceToProcessing={handleAdvanceToProcessing}
                    />
                  )}

                  {currentStep === 2 && (
                    <TransactionProcessor
                      property={property}
                      investmentData={investmentData}
                      onComplete={handleTransactionComplete}
                      isProcessing={isProcessing}
                      setIsProcessing={setIsProcessing}
                    />
                  )}

                  {currentStep === 3 && (
                    <TransactionConfirmation
                      property={property}
                      investmentData={investmentData}
                      onClose={handleClose}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            {currentStep < 2 && (
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={handlePrevious}
                    disabled={isFirstStep}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-4">
                    {currentStep === 0 && (
                      <div className="text-right">
                        <Text variant="bodySmall" color="muted">
                          Investment Summary
                        </Text>
                        <Text variant="bodyLarge" weight="semibold">
                          ${investmentData.amount.toLocaleString()} • {investmentData.tokens} tokens
                        </Text>
                      </div>
                    )}

                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleNext}
                      className="flex items-center gap-2"
                    >
                      {isLastStep ? 'Complete Investment' : 'Continue'}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
};