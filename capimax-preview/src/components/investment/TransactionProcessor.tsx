import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Clock,
  Receipt,
  Shield,
  ExternalLink,
  RefreshCw,
  Zap,
  Copy,
  ArrowLeft
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../design-system/cards/Card';
import { Text } from '../design-system/typography/Text';
// WalletConnector removed — crypto goes through NOWPayments now, no
// Web3-wallet handshake required in the SPA.
import { CreditCardForm } from '../payments/CreditCardForm';
import { CryptoPaymentForm } from '../payments/CryptoPaymentForm';
import { BankTransferForm } from '../payments/BankTransferForm';
import { NovaSukukForm } from '../payments/NovaSukukForm';
import { InvestmentService } from '../../services/investment/InvestmentService';
import type { InvestmentProperty, InvestmentData } from './types';
import { cn } from '../../utils/cn';

interface TransactionProcessorProps {
  property: InvestmentProperty;
  investmentData: InvestmentData;
  onComplete: (success: boolean, transactionId?: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  autoStart?: boolean;
  onGoBack?: () => void;
}

interface TransactionStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedTime?: string;
  transactionHash?: string;
}

export const TransactionProcessor: React.FC<TransactionProcessorProps> = ({
  property,
  investmentData,
  onComplete,
  isProcessing,
  setIsProcessing,
  autoStart = false,
  onGoBack
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TransactionStep[]>([]);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // When set, render the Stripe card form for the just-created investment.
  // The full flow:
  //   1) startTransaction() creates a PENDING Investment via /investments/
  //   2) CreditCardForm POSTs /payments/stripe/create-payment-intent/ to mint
  //      a Stripe PaymentIntent linked to that investment
  //   3) User submits card → stripe.confirmCardPayment() → Stripe webhook
  //      flips Payment to COMPLETED → Investment to PENDING_MINT → Celery mints
  // The previous flow created the investment and then immediately reported
  // success without ever charging the card.
  const [pendingCardPayment, setPendingCardPayment] = useState<
    | { investmentId: string; amount: number }
    | null
  >(null);
  // Same idea as pendingCardPayment but for the NOWPayments crypto flow.
  // Set when the investment row exists and we're ready to ask the user to
  // pick a coin and send funds.
  const [pendingCryptoPayment, setPendingCryptoPayment] = useState<
    | { investmentId: string; amount: number }
    | null
  >(null);
  // Bank-transfer and Nova-Sukuk both run the "show an inline form
  // BEFORE the backend creates the investment" pattern, because the
  // form itself owns the upload + InvestmentService call. The flag here
  // gates the steps machine so we don't auto-progress past the form.
  const [showBankTransferForm, setShowBankTransferForm] = useState(false);
  const [showNovaSukukForm, setShowNovaSukukForm] = useState(false);
  // Compliance-gate errors come from the backend with stable phrases; we
  // map them to a CTA so the user has a clear next step instead of just
  // "Try Again" (which won't help when the gate is structural).
  const [complianceCta, setComplianceCta] = useState<{
    label: string;
    href?: string;
    onClick?: () => void;
  } | null>(null);
  const hasAutoStarted = useRef(false);

  function classifyComplianceError(message: string): {
    label: string;
    href?: string;
    onClick?: () => void;
  } | null {
    const m = message.toLowerCase();
    if (m.includes('verified kyc profile')) {
      return { label: 'Complete KYC', href: '/kyc' };
    }
    if (m.includes('unresolved compliance review')) {
      return {
        label: 'Contact support',
        href: 'mailto:support@capimax.com?subject=Compliance%20review',
      };
    }
    if (m.includes('annual limit')) {
      return {
        label: 'Reduce purchase amount',
        onClick: () => onGoBack?.(),
      };
    }
    if (m.includes('accredited investors')) {
      return { label: 'Apply for accredited status', href: '/kyc?upgrade=accredited' };
    }
    if (m.includes('country of residence is not eligible')) {
      return { label: 'Browse eligible properties', href: '/properties' };
    }
    return null;
  }

  // Calculate fees consistently
  const calculateFees = () => {
    const method = investmentData.paymentMethod;
    let paymentFee = 0;

    switch (method) {
      case 'crypto':
        paymentFee = investmentData.amount * 0.005; // 0.5%
        break;
      case 'fiat':
        paymentFee = investmentData.amount * 0.029 + 0.30; // 2.9% + $0.30
        break;
      case 'pronova':
        paymentFee = investmentData.amount * -0.05; // 5% discount
        break;
      case 'bank':
      case 'wallet':
      case 'nova_sukuk':
      default:
        paymentFee = 0;
        break;
    }

    const total = investmentData.amount + paymentFee;
    return { paymentFee, total };
  };

  const fees = calculateFees();

  const getPaymentMethodLabel = () => {
    switch (investmentData.paymentMethod) {
      case 'crypto': return 'Cryptocurrency';
      case 'fiat': return 'Credit/Debit Card';
      case 'bank': return 'Bank Transfer';
      case 'wallet': return 'CapiMax Wallet';
      case 'nova_sukuk': return 'Nova Sukuk';
      case 'pronova': return 'Pronova';
      default: return 'Payment';
    }
  };

  // Map frontend payment method to backend format
  const getBackendPaymentMethod = () => {
    switch (investmentData.paymentMethod) {
      case 'crypto': return 'cryptocurrency';
      case 'fiat': return 'credit_card';
      case 'bank': return 'bank_transfer';
      case 'wallet': return 'wallet';
      case 'nova_sukuk': return 'nova_sukuk';
      case 'pronova': return 'pronova';
      default: return 'credit_card';
    }
  };

  // Initialize transaction steps based on payment method
  useEffect(() => {
    if (investmentData.paymentMethod === 'crypto') {
      // Crypto via NOWPayments: no Web3 wallet connection needed. The user
      // sends funds from any external wallet/exchange to a hosted address
      // we provide. So the step layout matches the fiat flow: validate,
      // process (= create NOWPayments invoice + watch for receipt), then
      // confirm tokens.
      setSteps([
        { id: 'validate', title: 'Validate Purchase', description: 'Verifying availability and limits', status: 'pending', estimatedTime: '10s' },
        { id: 'process', title: 'Process Payment', description: 'Get crypto payment address and await funds', status: 'pending', estimatedTime: '5-30 min' },
        { id: 'tokens', title: 'Confirm Tokens', description: 'Confirming your property tokens', status: 'pending', estimatedTime: '10s' }
      ]);
    } else if (investmentData.paymentMethod === 'nova_sukuk') {
      setSteps([
        { id: 'validate', title: 'Validate Purchase', description: 'Verifying availability and limits', status: 'pending', estimatedTime: '10s' },
        { id: 'process', title: 'Upload Sukuk Document', description: 'Submitting PDF for admin review', status: 'pending', estimatedTime: '15s' },
        { id: 'tokens', title: 'Pending Review', description: 'Admin will review and approve your payment', status: 'pending' }
      ]);
    } else if (investmentData.paymentMethod === 'pronova') {
      setSteps([
        { id: 'validate', title: 'Validate Purchase', description: 'Verifying availability and calculating 5% discount', status: 'pending', estimatedTime: '10s' },
        { id: 'process', title: 'Create Payment', description: 'Setting up Pronova payment with discount', status: 'pending', estimatedTime: '15s' },
        { id: 'tokens', title: 'Awaiting Payment', description: 'Send Pronova to platform wallet to complete', status: 'pending' }
      ]);
    } else {
      setSteps([
        { id: 'validate', title: 'Validate Purchase', description: 'Verifying availability and limits', status: 'pending', estimatedTime: '10s' },
        { id: 'process', title: 'Process Payment', description: `Processing ${getPaymentMethodLabel()} payment`, status: 'pending', estimatedTime: '30s' },
        { id: 'tokens', title: 'Confirm Tokens', description: 'Confirming your property tokens', status: 'pending', estimatedTime: '10s' }
      ]);
    }
  }, [investmentData.paymentMethod]);

  // (handleWalletConnect removed — crypto now uses NOWPayments hosted
  //  checkout, not a Web3 wallet inside the SPA.)

  // Helper to update a step's status
  const updateStepStatus = (stepIndex: number, newStatus: TransactionStep['status'], hash?: string) => {
    setSteps(prev => prev.map((step, index) =>
      index === stepIndex
        ? { ...step, status: newStatus, ...(hash ? { transactionHash: hash } : {}) }
        : step
    ));
  };

  // Auto-start transaction once steps are populated and we're idle.
  // Crypto no longer requires a Web3 wallet connection — NOWPayments
  // collects funds from any external source — so we treat it the same
  // way as fiat / bank / etc. and skip the old wallet-gate.
  useEffect(() => {
    if (!autoStart || hasAutoStarted.current) return;
    if (steps.length > 0 && !isProcessing && !error) {
      hasAutoStarted.current = true;
      const timer = setTimeout(() => startTransaction(), 800);
      return () => clearTimeout(timer);
    }
  }, [autoStart, steps.length, investmentData.paymentMethod]);

  const startTransaction = async () => {
    setIsProcessing(true);
    setError(null);
    // All payment methods now share the same step layout
    // (validate, process, tokens). Crypto used to have a leading
    // "Connect Wallet" step but we route through NOWPayments now and the
    // user no longer connects a Web3 wallet to the SPA.
    const startIdx = 0;
    setCurrentStep(startIdx);

    const propertyId = property.id.toString();

    try {
      // ─── Step 1: Validate Investment ───
      setCurrentStep(startIdx);
      updateStepStatus(startIdx, 'processing');

      try {
        await InvestmentService.calculateInvestment(propertyId, investmentData.tokens);
      } catch (calcError: any) {
        // If calculate endpoint doesn't exist or fails, continue anyway
        // The create endpoint will also validate
        console.warn('Calculate endpoint warning:', calcError?.message);
      }
      updateStepStatus(startIdx, 'completed');

      // ─── Step 2: Create Investment / Process Payment ───
      const processIdx = startIdx + 1;
      setCurrentStep(processIdx);
      updateStepStatus(processIdx, 'processing');

      // For methods that need the user to upload a file inside the
      // payment form itself (bank transfer, nova sukuk), we skip the
      // pre-create call entirely. The respective form owns the
      // multipart POST and creates the Investment + Payment rows in
      // one go. Auto-progression resumes from the form's onSubmitted
      // callback.
      if (investmentData.paymentMethod === 'bank') {
        setShowBankTransferForm(true);
        return;
      }
      if (investmentData.paymentMethod === 'nova_sukuk') {
        setShowNovaSukukForm(true);
        return;
      }

      let investmentResult: any;

      if (investmentData.paymentMethod === 'wallet') {
        // Wallet: all-in-one endpoint (create + debit wallet + confirm)
        investmentResult = await InvestmentService.walletInvest({
          property_id: propertyId,
          token_amount: investmentData.tokens,
          investment_amount: investmentData.amount
        });
      } else if (investmentData.paymentMethod === 'pronova') {
        // Pronova: create investment with 5% discount, get platform wallet
        investmentResult = await InvestmentService.pronovaInvest({
          property_id: propertyId,
          token_amount: investmentData.tokens,
          investment_amount: investmentData.amount
        });
      } else {
        // Other methods: create investment in PENDING status
        investmentResult = await InvestmentService.createInvestment({
          property_id: propertyId,
          token_amount: investmentData.tokens,
          investment_amount: investmentData.amount,
          payment_method: getBackendPaymentMethod()
        });
      }

      // Extract transaction info from result
      const resultId = investmentResult?.id || investmentResult?.investment_id || `INV-${Date.now()}`;
      const resultHash = investmentResult?.transaction_hash || null;

      // ─── Credit-card branch: hand off to Stripe Elements ───
      // The investment row exists (PENDING). Now we need to actually charge
      // the card. The card form is rendered inline below; this function
      // returns early — the rest of the flow continues from the card form's
      // onPaymentComplete callback.
      if (investmentData.paymentMethod === 'fiat') {
        setPendingCardPayment({
          investmentId: resultId,
          amount: investmentData.amount,
        });
        // Keep processing flag on but stop here. The "Process Payment" step
        // stays in `processing` state until the card form resolves.
        return;
      }

      // ─── Crypto branch: hand off to NOWPayments form ───
      // Mirror of the fiat branch. The investment row exists (PENDING) and
      // we now hand off to CryptoPaymentForm, which creates a real
      // NOWPayments invoice and polls until the funds arrive on chain.
      // The form's onPaymentComplete callback finishes the step machine.
      if (investmentData.paymentMethod === 'crypto') {
        setPendingCryptoPayment({
          investmentId: resultId,
          amount: investmentData.amount,
        });
        return;
      }

      if (resultHash) {
        setTransactionHash(resultHash);
        updateStepStatus(processIdx, 'completed', resultHash);
      } else {
        updateStepStatus(processIdx, 'completed');
      }

      // ─── Step 3: Confirm Tokens ───
      const confirmIdx = processIdx + 1;
      setCurrentStep(confirmIdx);
      updateStepStatus(confirmIdx, 'processing');

      // Brief wait for confirmation display
      await new Promise(resolve => setTimeout(resolve, 1200));

      // For wallet payments, tokens are already confirmed
      // For other methods, investment is created in PENDING - tokens will be minted after payment clears
      updateStepStatus(confirmIdx, 'completed');

      // ─── All steps completed ───
      const finalTxId = resultHash || resultId;
      setTransactionHash(finalTxId);
      onComplete(true, finalTxId);

    } catch (err: any) {
      // Extract a useful error message from the backend response
      const errorData = err?.response?.data;
      let errorMessage = 'Transaction failed. Please try again or use a different payment method.';

      if (errorData) {
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (errorData.errors) {
          // Validation errors from serializer
          const firstError = Object.values(errorData.errors)[0];
          if (Array.isArray(firstError)) {
            errorMessage = firstError[0] as string;
          } else if (typeof firstError === 'string') {
            errorMessage = firstError;
          }
        } else if (typeof errorData.message === 'string') {
          errorMessage = errorData.message;
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }

      // Mark current step as failed
      setSteps(prev => prev.map((step, index) => {
        if (step.status === 'processing') {
          return { ...step, status: 'failed' };
        }
        return step;
      }));

      setError(errorMessage);
      setComplianceCta(classifyComplianceError(errorMessage));
      onComplete(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const retryTransaction = () => {
    setError(null);
    setComplianceCta(null);
    setPendingCardPayment(null);
    setPendingCryptoPayment(null);
    hasAutoStarted.current = false;
    setCurrentStep(0);
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending' })));
    startTransaction();
  };

  // -------------------------------------------------------------------
  // Stripe card-form callbacks
  // -------------------------------------------------------------------

  const handleCardPaymentComplete = async (paymentIntentId: string) => {
    // The card actually charged. Mark "Process Payment" complete and walk
    // through the "Confirm Tokens" step so the UI feedback matches the
    // other payment branches.
    //
    // Step layout for fiat (no wallet pre-step):
    //   [0] validate (already completed when card form appeared)
    //   [1] process  (was in 'processing' — finish it now)
    //   [2] tokens   (advance into it for the brief polish wait)
    const processIdx = 1;
    const confirmIdx = 2;
    updateStepStatus(processIdx, 'completed', paymentIntentId);
    setCurrentStep(confirmIdx);
    updateStepStatus(confirmIdx, 'processing');
    // Brief pause for UI polish — actual mint happens server-side once the
    // Stripe webhook fires and Celery picks up the PENDING_MINT investment.
    await new Promise(resolve => setTimeout(resolve, 1200));
    updateStepStatus(confirmIdx, 'completed');
    const finalTxId = paymentIntentId;
    setTransactionHash(finalTxId);
    setPendingCardPayment(null);
    setIsProcessing(false);
    onComplete(true, finalTxId);
  };

  const handleCardPaymentCancel = () => {
    setPendingCardPayment(null);
    setSteps(prev => prev.map(s =>
      s.status === 'processing' ? { ...s, status: 'failed' } : s
    ));
    setError('Card payment was cancelled. You can try again or pick a different method.');
    setIsProcessing(false);
  };

  // -------------------------------------------------------------------
  // NOWPayments crypto-form callbacks (mirror of the card ones)
  // -------------------------------------------------------------------

  const handleCryptoPaymentComplete = async (paymentId: string) => {
    const processIdx = 1;
    const confirmIdx = 2;
    updateStepStatus(processIdx, 'completed', paymentId);
    setCurrentStep(confirmIdx);
    updateStepStatus(confirmIdx, 'processing');
    // Brief pause for UI polish. The actual mint happens server-side
    // once the NOWPayments IPN (or our status-poll fallback) marks the
    // payment finished and Celery picks up the PENDING_MINT investment.
    await new Promise(resolve => setTimeout(resolve, 1200));
    updateStepStatus(confirmIdx, 'completed');
    setTransactionHash(paymentId);
    setPendingCryptoPayment(null);
    setIsProcessing(false);
    onComplete(true, paymentId);
  };

  const handleCryptoPaymentCancel = () => {
    setPendingCryptoPayment(null);
    setSteps(prev => prev.map(s =>
      s.status === 'processing' ? { ...s, status: 'failed' } : s
    ));
    setError(
      'Crypto payment was cancelled. You can retry or pick a different method — ' +
      'if you already sent funds they will still credit, but you may need to refresh.'
    );
    setIsProcessing(false);
  };

  // -------------------------------------------------------------------
  // Bank-transfer / Nova-Sukuk callbacks (both run the same pattern:
  // form submits investment, parent advances to "pending review")
  // -------------------------------------------------------------------

  const handlePendingReviewSubmitted = async (investmentId: string) => {
    const processIdx = 1;
    const confirmIdx = 2;
    updateStepStatus(processIdx, 'completed', investmentId);
    setCurrentStep(confirmIdx);
    updateStepStatus(confirmIdx, 'processing');
    await new Promise(resolve => setTimeout(resolve, 800));
    // "Confirm Tokens" stays as pending-review until the admin approves
    // — but for the immediate UI we mark it completed and surface the
    // "submitted for review" copy on the parent confirmation screen.
    updateStepStatus(confirmIdx, 'completed');
    setTransactionHash(investmentId);
    setShowBankTransferForm(false);
    setShowNovaSukukForm(false);
    setIsProcessing(false);
    onComplete(true, investmentId);
  };

  const handlePendingReviewCancel = () => {
    setShowBankTransferForm(false);
    setShowNovaSukukForm(false);
    setSteps(prev => prev.map(s =>
      s.status === 'processing' ? { ...s, status: 'failed' } : s
    ));
    setError('Submission cancelled. You can retry or pick a different payment method.');
    setIsProcessing(false);
  };

  const copyTransactionHash = async () => {
    if (transactionHash) {
      await navigator.clipboard.writeText(transactionHash);
    }
  };

  return (
    <div className="space-y-6">
      {/* Transaction Summary */}
      <Card className="p-6">
        <Text variant="h4" weight="semibold" className="mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-500" />
          Transaction Summary
        </Text>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Text variant="body">Property Tokens:</Text>
            <Text variant="body" weight="semibold">{investmentData.tokens} {investmentData.tokens === 1 ? 'token' : 'tokens'}</Text>
          </div>

          <div className="flex justify-between items-center">
            <Text variant="body">Token Price:</Text>
            <Text variant="body" weight="semibold">${(investmentData.amount / investmentData.tokens).toLocaleString()} each</Text>
          </div>

          <div className="flex justify-between items-center">
            <Text variant="body">Subtotal:</Text>
            <Text variant="body" weight="semibold">${investmentData.amount.toLocaleString()}</Text>
          </div>

          <div className="flex justify-between items-center">
            <Text variant="body">{getPaymentMethodLabel()} Fee:</Text>
            <Text variant="body" weight="semibold">
              {fees.paymentFee === 0 ? 'Free' : `$${fees.paymentFee.toFixed(2)}`}
            </Text>
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between items-center">
              <Text variant="bodyLarge" weight="semibold">Total:</Text>
              <Text variant="bodyLarge" weight="bold" className="text-emerald-600">
                ${fees.total.toFixed(2)}
              </Text>
            </div>
          </div>
        </div>
      </Card>

      {/* Stripe card form — appears after the investment row is created.
          Collects card details inside Stripe's iframe (PCI-safe), confirms
          the PaymentIntent, and waits for the server-side Stripe webhook
          to finalize the Payment + Investment status. */}
      {pendingCardPayment && (
        <CreditCardForm
          amount={pendingCardPayment.amount}
          investmentId={pendingCardPayment.investmentId}
          onPaymentComplete={handleCardPaymentComplete}
          onCancel={handleCardPaymentCancel}
        />
      )}

      {/* NOWPayments crypto form — appears after the investment row is
          created. Mints a NOWPayments invoice, shows the user a pay
          address + amount, and polls until the funds are detected. The
          IPN webhook on the backend marks the linked Investment paid and
          Celery picks it up to mint the property tokens. */}
      {pendingCryptoPayment && (
        <CryptoPaymentForm
          amount={pendingCryptoPayment.amount}
          investmentId={pendingCryptoPayment.investmentId}
          onPaymentComplete={handleCryptoPaymentComplete}
          onCancel={handleCryptoPaymentCancel}
        />
      )}

      {/* Bank-transfer form — investor uploads proof of wire/ACH and
          the backend creates Investment + Payment + BankTransfer rows
          in `pending`. Admin approves later → mint. */}
      {showBankTransferForm && (
        <BankTransferForm
          amount={investmentData.amount}
          propertyId={property.id.toString()}
          tokenAmount={investmentData.tokens}
          onSubmitted={(investmentId) => handlePendingReviewSubmitted(investmentId)}
          onCancel={handlePendingReviewCancel}
        />
      )}

      {/* Nova Sukuk form — investor uploads signed Sukuk PDF + reference
          number. Backend creates Investment + Payment + NovaSukukPayment
          in `pending`. Admin approves later → mint. */}
      {showNovaSukukForm && (
        <NovaSukukForm
          amount={investmentData.amount}
          propertyId={property.id.toString()}
          tokenAmount={investmentData.tokens}
          onSubmitted={(investmentId) => handlePendingReviewSubmitted(investmentId)}
          onCancel={handlePendingReviewCancel}
        />
      )}

      {/* Transaction Steps */}
      <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <Text variant="h4" weight="semibold" className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Transaction Progress
            </Text>
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-colors",
                  step.status === 'completed' && "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
                  step.status === 'processing' && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
                  step.status === 'failed' && "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
                  step.status === 'pending' && "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                )}
              >
                {/* Step Icon */}
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0",
                  step.status === 'completed' && "bg-emerald-500 text-white",
                  step.status === 'processing' && "bg-blue-500 text-white",
                  step.status === 'failed' && "bg-red-500 text-white",
                  step.status === 'pending' && "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                )}>
                  {step.status === 'processing' && <Loader2 className="w-5 h-5 animate-spin" />}
                  {step.status === 'completed' && <CheckCircle className="w-5 h-5" />}
                  {step.status === 'failed' && <AlertCircle className="w-5 h-5" />}
                  {step.status === 'pending' && <Clock className="w-5 h-5" />}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <Text variant="body" weight="semibold">{step.title}</Text>
                    {step.estimatedTime && step.status === 'processing' && (
                      <Text variant="bodySmall" color="muted">~{step.estimatedTime}</Text>
                    )}
                  </div>
                  <Text variant="bodySmall" color="muted">{step.description}</Text>

                  {/* Transaction Hash */}
                  {step.transactionHash && (
                    <div className="mt-1 flex items-center gap-2">
                      <Text variant="bodySmall" className="font-mono text-gray-500 truncate">
                        {step.transactionHash}
                      </Text>
                      <button onClick={copyTransactionHash} className="text-gray-400 hover:text-gray-600">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Error State with Recovery */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <Text variant="body" weight="medium" className="text-red-800 dark:text-red-200 mb-2">
                    {error}
                  </Text>
                  <div className="flex flex-wrap gap-2">
                    {complianceCta ? (
                      complianceCta.href ? (
                        <a
                          href={complianceCta.href}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700"
                        >
                          {complianceCta.label}
                        </a>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={complianceCta.onClick}
                          className="flex items-center gap-2"
                        >
                          {complianceCta.label}
                        </Button>
                      )
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={retryTransaction}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Try Again
                      </Button>
                    )}
                    {onGoBack && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onGoBack}
                        className="flex items-center gap-2"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        Change Payment Method
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Processing Info */}
          {isProcessing && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
                <Text variant="bodySmall" className="text-blue-700 dark:text-blue-300">
                  Please don't close this window. Your transaction is being processed securely.
                </Text>
              </div>
            </div>
          )}
        </Card>

      {/* Security Notice */}
      <Card className="p-4 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <Text variant="bodySmall" className="text-green-700 dark:text-green-300">
            Your purchase is processed through secure, audited smart contracts. All transactions are recorded on the blockchain.
          </Text>
        </div>
      </Card>
    </div>
  );
};
