import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../design-system/forms/Input';
import { useTranslation } from 'react-i18next';

export interface InstallmentPlan {
  id: string;
  name: string;
  description: string;
  totalPayments: number;
  paymentFrequency: 'monthly' | 'quarterly' | 'milestone-based';
  downPaymentPercentage: number;
  installmentAmount: number;
  totalInterest: number;
  effectiveAPR: number;
  tokenReleaseSchedule: 'immediate' | 'partial' | 'completion';
  benefits: string[];
  restrictions?: string[];
  minimumInvestment?: number;
  maximumInvestment?: number;
}

export interface PropertyInvestment {
  propertyId: string;
  propertyName: string;
  tokenPrice: number;
  minimumTokens: number;
  maximumTokens?: number;
  availableTokens: number;
  constructionStatus: string;
  expectedCompletion: string;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedYield: number;
  installmentPlans: InstallmentPlan[];
}

interface InstallmentInvestmentProps {
  property: PropertyInvestment;
  onInvestmentSubmit: (investment: {
    propertyId: string;
    tokens: number;
    planId: string;
    totalAmount: number;
    downPayment: number;
    paymentMethod: string;
  }) => void;
  onCancel: () => void;
  className?: string;
}

export const InstallmentInvestment: React.FC<InstallmentInvestmentProps> = ({
  property,
  onInvestmentSubmit,
  onCancel,
  className = ''
}) => {
  const { t, i18n } = useTranslation('invest');
  const dateLocale = i18n.language?.startsWith('ar') ? 'ar-EG' : 'en-US';
  const [currentStep, setCurrentStep] = useState<'amount' | 'plan' | 'payment' | 'review'>('amount');
  const [selectedTokens, setSelectedTokens] = useState<number>(property.minimumTokens);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedPlan = property.installmentPlans.find(plan => plan.id === selectedPlanId);
  const totalInvestment = selectedTokens * property.tokenPrice;
  const downPayment = selectedPlan ? (totalInvestment * selectedPlan.downPaymentPercentage) / 100 : 0;
  const installmentAmount = selectedPlan ? selectedPlan.installmentAmount * selectedTokens : 0;
  const totalWithInterest = selectedPlan ? totalInvestment + (totalInvestment * selectedPlan.totalInterest / 100) : totalInvestment;

  useEffect(() => {
    setErrors({});
  }, [currentStep]);

  const validateAmount = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (selectedTokens < property.minimumTokens) {
      newErrors.tokens = t('installment.errors.min', { value: property.minimumTokens });
    }

    if (property.maximumTokens && selectedTokens > property.maximumTokens) {
      newErrors.tokens = t('installment.errors.max', { value: property.maximumTokens });
    }

    if (selectedTokens > property.availableTokens) {
      newErrors.tokens = t('flow.errors.maxTokens', { available: property.availableTokens });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePlan = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedPlanId) {
      newErrors.plan = t('installment.errors.plan');
    }

    if (selectedPlan?.minimumInvestment && totalInvestment < selectedPlan.minimumInvestment) {
      newErrors.plan = t('installment.errors.planMin', { amount: `$${selectedPlan.minimumInvestment.toLocaleString()}` });
    }

    if (selectedPlan?.maximumInvestment && totalInvestment > selectedPlan.maximumInvestment) {
      newErrors.plan = t('installment.errors.planMax', { amount: `$${selectedPlan.maximumInvestment.toLocaleString()}` });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePayment = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!paymentMethod) {
      newErrors.paymentMethod = t('flow.errors.paymentMethod');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    let isValid = false;

    switch (currentStep) {
      case 'amount':
        isValid = validateAmount();
        if (isValid) setCurrentStep('plan');
        break;
      case 'plan':
        isValid = validatePlan();
        if (isValid) setCurrentStep('payment');
        break;
      case 'payment':
        isValid = validatePayment();
        if (isValid) setCurrentStep('review');
        break;
      case 'review':
        handleSubmit();
        break;
    }
  };

  const handlePrevious = () => {
    switch (currentStep) {
      case 'plan':
        setCurrentStep('amount');
        break;
      case 'payment':
        setCurrentStep('plan');
        break;
      case 'review':
        setCurrentStep('payment');
        break;
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlan) return;

    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      onInvestmentSubmit({
        propertyId: property.propertyId,
        tokens: selectedTokens,
        planId: selectedPlanId,
        totalAmount: totalInvestment,
        downPayment,
        paymentMethod
      });
    } catch (error) {
      console.error('Investment submission failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStepProgress = () => {
    const steps = ['amount', 'plan', 'payment', 'review'];
    return ((steps.indexOf(currentStep) + 1) / steps.length) * 100;
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString()}`;
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
              {t('installment.title')}
            </h2>
            <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">
              {property.propertyName}
            </p>
          </div>
          <div className="text-end">
            <div className="text-sm text-neutral-500 dark:text-slate-400">{t('common.pricePerShare')}</div>
            <div className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
              {formatCurrency(property.tokenPrice)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-neutral-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getStepProgress()}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-neutral-500 dark:text-slate-400">
          <span className={currentStep === 'amount' ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}>{t('installment.steps.amount')}</span>
          <span className={currentStep === 'plan' ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}>{t('installment.steps.plan')}</span>
          <span className={currentStep === 'payment' ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}>{t('installment.steps.payment')}</span>
          <span className={currentStep === 'review' ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}>{t('installment.steps.review')}</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        {/* Step 1: Amount Selection */}
        {currentStep === 'amount' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100 mb-4">
                {t('installment.chooseAmount')}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                    {t('amount.numberOfShares')}
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      value={selectedTokens}
                      onChange={(e) => setSelectedTokens(parseInt(e.target.value) || 0)}
                      min={property.minimumTokens}
                      max={property.maximumTokens || property.availableTokens}
                      className="flex-1"
                      error={errors.tokens}
                    />
                    <div className="text-end">
                      <div className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
                        {formatCurrency(totalInvestment)}
                      </div>
                      <div className="text-sm text-neutral-500 dark:text-slate-400">
                        {t('installment.totalPurchase')}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-neutral-500 dark:text-slate-400 mt-1">
                    <span>{t('installment.minShares', { value: property.minimumTokens.toLocaleString() })}</span>
                    <span>{t('amount.available', { available: property.availableTokens.toLocaleString() })}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                  <div>
                    <div className="text-sm text-neutral-500 dark:text-slate-400">{t('installment.riskLevel')}</div>
                    <div className={`font-medium ${
                      property.riskLevel === 'low' ? 'text-green-600 dark:text-green-400' :
                      property.riskLevel === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {t(`installment.risk.${property.riskLevel}`, { defaultValue: property.riskLevel.toUpperCase() })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-neutral-500 dark:text-slate-400">{t('installment.estYield')}</div>
                    <div className="font-medium text-green-600 dark:text-green-400">
                      {property.estimatedYield}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-neutral-500 dark:text-slate-400">{t('installment.status')}</div>
                    <div className="font-medium text-neutral-900 dark:text-slate-100">
                      {property.constructionStatus}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-neutral-500 dark:text-slate-400">{t('installment.completion')}</div>
                    <div className="font-medium text-neutral-900 dark:text-slate-100">
                      {new Date(property.expectedCompletion).toLocaleDateString(dateLocale)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Plan Selection */}
        {currentStep === 'plan' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100 mb-4">
                {t('installment.selectPlan')}
              </h3>
              
              <div className="space-y-4">
                {property.installmentPlans.map((plan) => {
                  const planDownPayment = (totalInvestment * plan.downPaymentPercentage) / 100;
                  const planInstallment = plan.installmentAmount * selectedTokens;
                  const planTotalWithInterest = totalInvestment + (totalInvestment * plan.totalInterest / 100);
                  
                  return (
                    <div
                      key={plan.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedPlanId === plan.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-neutral-200 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-700'
                      }`}
                      onClick={() => setSelectedPlanId(plan.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="radio"
                              checked={selectedPlanId === plan.id}
                              onChange={() => setSelectedPlanId(plan.id)}
                              className="text-primary-600"
                            />
                            <h4 className="font-semibold text-neutral-900 dark:text-slate-100">
                              {plan.name}
                            </h4>
                          </div>
                          <p className="text-sm text-neutral-600 dark:text-slate-400 mb-3">
                            {plan.description}
                          </p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-neutral-500 dark:text-slate-400">{t('schedule.downPayment')}</span>
                              <div className="font-medium text-neutral-900 dark:text-slate-100">
                                {formatCurrency(planDownPayment)} ({plan.downPaymentPercentage}%)
                              </div>
                            </div>
                            <div>
                              <span className="text-neutral-500 dark:text-slate-400">{t('installment.installments')}</span>
                              <div className="font-medium text-neutral-900 dark:text-slate-100">
                                {plan.totalPayments} × {formatCurrency(planInstallment)}
                              </div>
                            </div>
                            <div>
                              <span className="text-neutral-500 dark:text-slate-400">{t('schedule.totalCost')}</span>
                              <div className="font-medium text-neutral-900 dark:text-slate-100">
                                {formatCurrency(planTotalWithInterest)}
                              </div>
                            </div>
                            <div>
                              <span className="text-neutral-500 dark:text-slate-400">{t('schedule.apr')}</span>
                              <div className="font-medium text-neutral-900 dark:text-slate-100">
                                {plan.effectiveAPR}%
                              </div>
                            </div>
                          </div>

                          {plan.benefits && plan.benefits.length > 0 && (
                            <div className="mt-3">
                              <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">{t('schedule.benefits')}</div>
                              <ul className="text-sm text-neutral-600 dark:text-slate-400 space-y-1">
                                {plan.benefits.map((benefit, index) => (
                                  <li key={index} className="flex items-start">
                                    <span className="text-green-500 me-1">•</span>
                                    {benefit}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {errors.plan && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">{errors.plan}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Payment Method */}
        {currentStep === 'payment' && selectedPlan && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100 mb-4">
                {t('installment.downPaymentMethod')}
              </h3>
              
              <div className="space-y-3">
                {[
                  { id: 'credit_card', name: t('installment.methods.credit_card.name'), description: t('installment.methods.credit_card.description'), icon: '💳' },
                  { id: 'bank_transfer', name: t('installment.methods.bank_transfer.name'), description: t('installment.methods.bank_transfer.description'), icon: '🏦' },
                  { id: 'crypto', name: t('installment.methods.crypto.name'), description: t('installment.methods.crypto.description'), icon: '₿' },
                  { id: 'wire', name: t('installment.methods.wire.name'), description: t('installment.methods.wire.description'), icon: '📄' }
                ].map((method) => (
                  <div
                    key={method.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      paymentMethod === method.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-neutral-200 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => setPaymentMethod(method.id)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        checked={paymentMethod === method.id}
                        onChange={() => setPaymentMethod(method.id)}
                        className="text-primary-600"
                      />
                      <span className="text-xl">{method.icon}</span>
                      <div>
                        <div className="font-medium text-neutral-900 dark:text-slate-100">
                          {method.name}
                        </div>
                        <div className="text-sm text-neutral-600 dark:text-slate-400">
                          {method.description}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {errors.paymentMethod && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">{errors.paymentMethod}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 'review' && selectedPlan && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100 mb-4">
                {t('installment.review')}
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-neutral-50 dark:bg-slate-700 rounded-lg">
                  <h4 className="font-medium text-neutral-900 dark:text-slate-100 mb-3">
                    {t('amount.summary')}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-neutral-500 dark:text-slate-400">{t('confirmation.copy.property')}</span>
                      <div className="font-medium text-neutral-900 dark:text-slate-100">
                        {property.propertyName}
                      </div>
                    </div>
                    <div>
                      <span className="text-neutral-500 dark:text-slate-400">{t('common.shares')}</span>
                      <div className="font-medium text-neutral-900 dark:text-slate-100">
                        {t('installment.sharesValue', { value: selectedTokens.toLocaleString() })}
                      </div>
                    </div>
                    <div>
                      <span className="text-neutral-500 dark:text-slate-400">{t('installment.totalPurchase')}</span>
                      <div className="font-medium text-neutral-900 dark:text-slate-100">
                        {formatCurrency(totalInvestment)}
                      </div>
                    </div>
                    <div>
                      <span className="text-neutral-500 dark:text-slate-400">{t('schedule.table.plan')}</span>
                      <div className="font-medium text-neutral-900 dark:text-slate-100">
                        {selectedPlan.name}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-3">
                    {t('installment.breakdown')}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-600 dark:text-blue-400">{t('installment.downDueNow')}</span>
                      <span className="font-medium text-blue-800 dark:text-blue-300">
                        {formatCurrency(downPayment)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600 dark:text-blue-400">
                        {t('installment.installmentsOf', { value: selectedPlan.totalPayments })}
                      </span>
                      <span className="font-medium text-blue-800 dark:text-blue-300">
                        {formatCurrency(installmentAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-blue-200 dark:border-blue-700 pt-2">
                      <span className="text-blue-600 dark:text-blue-400">{t('installment.totalWithInterest')}</span>
                      <span className="font-semibold text-blue-800 dark:text-blue-300">
                        {formatCurrency(totalWithInterest)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-neutral-500 dark:text-slate-400">
                  <p className="mb-2">
                    {t('installment.terms')}
                  </p>
                  <p>
                    {t('installment.firstDue')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
            >
              {t('common.cancel')}
            </Button>
            {currentStep !== 'amount' && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isProcessing}
              >
                {t('installment.previous')}
              </Button>
            )}
          </div>
          
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={isProcessing}
            className="min-w-32"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{t('installment.processing')}</span>
              </div>
            ) : currentStep === 'review' ? (
              t('installment.complete')
            ) : (
              t('installment.next')
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};