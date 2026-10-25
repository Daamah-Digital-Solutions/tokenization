/**
 * Nova Sukuk investment form.
 *
 * Investor uploads the signed Sukuk PDF + reference number; we create
 * Investment + Payment + NovaSukukPayment rows in `pending` state. An
 * admin then reviews the PDF and either approves (triggers
 * `mark_payment_confirmed` → mint) or rejects.
 *
 * The backend endpoint (`/investments/nova_sukuk_invest/`) already
 * existed but no frontend form drove it — the InvestmentFlow expected
 * `investmentData.sukukPdf` to magically appear, so the method always
 * failed with "Please upload the Sukuk PDF". This component fills that
 * gap by collecting the file inline in TransactionProcessor.
 */

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation, Trans } from 'react-i18next';
import {
  ScrollText,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react';

import { InvestmentService } from '../../services/investment/InvestmentService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../design-system/forms/Input';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

interface NovaSukukFormProps {
  amount: number;
  propertyId: string;
  tokenAmount: number;
  onSubmitted?: (investmentId: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function NovaSukukForm({
  amount,
  propertyId,
  tokenAmount,
  onSubmitted,
  onCancel,
  className,
}: NovaSukukFormProps) {
  const { t } = useTranslation('payments');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'collect' | 'submitting' | 'done'>('collect');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [sukukPdf, setSukukPdf] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFile = (file: File | null) => {
    if (!file) {
      setSukukPdf(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrorMessage(t('nova.errors.fileType'));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setErrorMessage(t('shared.fileTooLarge'));
      return;
    }
    setErrorMessage(null);
    setSukukPdf(file);
  };

  const handleSubmit = async () => {
    if (!sukukPdf) {
      setErrorMessage(t('nova.errors.fileRequired'));
      return;
    }
    if (!referenceNumber.trim()) {
      setErrorMessage(t('nova.errors.referenceRequired'));
      return;
    }
    setErrorMessage(null);
    setStep('submitting');
    try {
      const result = await InvestmentService.novaSukukInvest({
        property_id: propertyId,
        token_amount: tokenAmount,
        investment_amount: amount,
        sukuk_pdf: sukukPdf,
        sukuk_reference_number: referenceNumber.trim(),
      });
      const investmentId = result?.investment_id;
      if (!investmentId) {
        throw new Error(t('shared.noInvestmentReturned'));
      }
      setStep('done');
      onSubmitted?.(investmentId);
    } catch (caught: any) {
      const apiMessage =
        caught?.response?.data?.error?.message ||
        caught?.message ||
        t('nova.errors.submitFailed');
      setErrorMessage(apiMessage);
      setStep('collect');
    }
  };

  const renderCollect = () => (
    <div className="space-y-5">
      <div className="text-center">
        <ScrollText className="mx-auto w-10 h-10 text-indigo-500" />
        <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
          {t('nova.title')}
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          <Trans
            t={t}
            i18nKey="nova.intro"
            values={{ amount: `$${amount.toFixed(2)}` }}
            components={{ b: <strong /> }}
          />
        </p>
      </div>

      <Input
        label={t('nova.referenceLabel')}
        value={referenceNumber}
        onChange={(e) => setReferenceNumber(e.target.value)}
        placeholder={t('nova.referencePlaceholder')}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('nova.documentLabel')}
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 px-4 py-6 text-center hover:border-indigo-400 transition-colors"
        >
          {sukukPdf ? (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <FileText className="w-4 h-4 text-indigo-500" />
              {sukukPdf.name}
              <span className="text-xs text-gray-400">
                ({(sukukPdf.size / 1024).toFixed(0)} KB)
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
              <Upload className="w-5 h-5 text-gray-400" />
              {t('nova.uploadPrompt')}
              <span className="text-xs text-gray-400">{t('shared.max10mb')}</span>
            </div>
          )}
        </button>
      </div>

      {errorMessage && (
        <Card className="p-3 bg-red-50 border-red-200 text-red-800 text-sm">
          <div className="flex gap-2 items-start">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>{errorMessage}</div>
          </div>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          {t('shared.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
          disabled={!sukukPdf || !referenceNumber.trim()}
        >
          {t('shared.submitForReview')}
        </Button>
      </div>
    </div>
  );

  const renderSubmitting = () => (
    <div className="text-center space-y-4 py-6">
      <Loader2 className="w-10 h-10 mx-auto animate-spin text-indigo-500" />
      <p className="text-sm text-gray-600 dark:text-gray-300">
        {t('nova.uploading')}
      </p>
    </div>
  );

  const renderDone = () => (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-emerald-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {t('shared.submittedForReview')}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        {t('nova.doneBody')}
      </p>
    </div>
  );

  return (
    <div className={className}>
      <Card className="max-w-xl mx-auto">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="p-6"
        >
          {step === 'collect' && renderCollect()}
          {step === 'submitting' && renderSubmitting()}
          {step === 'done' && renderDone()}
        </motion.div>
      </Card>
    </div>
  );
}

export default NovaSukukForm;
