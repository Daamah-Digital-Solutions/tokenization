/**
 * Bank-transfer investment form.
 *
 * Drives the manual-review path: the investor uploads proof of an
 * outgoing wire (screenshot or PDF receipt) plus their sending-bank
 * details, and we create an Investment + Payment + BankTransfer row in
 * `pending` state. An admin then approves on receipt of funds, which
 * marks the payment confirmed and triggers minting (see
 * `admin_panel/views.py:BankTransferReviewView`).
 *
 * No payment provider integration on the SPA side — this is purely an
 * intake form. The previous BankTransferForm in this directory collected
 * routing/account numbers but did NOT collect proof of transfer, so an
 * admin had no evidence to approve against.
 */

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
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

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

interface BankTransferFormProps {
  /** USD amount the investor is sending. */
  amount: number;
  /** Property the investment is being created for. */
  propertyId: string;
  /** Tokens the investor is purchasing. */
  tokenAmount: number;
  /** Called with the investment_id once the row is created (status=pending). */
  onSubmitted?: (investmentId: string, transferReference: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function BankTransferForm({
  amount,
  propertyId,
  tokenAmount,
  onSubmitted,
  onCancel,
  className,
}: BankTransferFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'collect' | 'submitting' | 'done'>('collect');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [swiftCode, setSwiftCode] = useState('');
  const [referenceNote, setReferenceNote] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [transferReference, setTransferReference] = useState<string | null>(null);

  const handleFile = (file: File | null) => {
    if (!file) {
      setProof(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrorMessage('Upload a JPG/PNG/WEBP image or a PDF.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setErrorMessage('File too large (max 10MB).');
      return;
    }
    setErrorMessage(null);
    setProof(file);
  };

  const validate = (): string | null => {
    if (!accountHolderName.trim()) return 'Account holder name is required.';
    if (!bankName.trim()) return 'Bank name is required.';
    if (!accountNumber.trim()) return 'Account number is required.';
    if (!proof) return 'Please upload proof of the transfer.';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setErrorMessage(err);
      return;
    }
    if (!proof) return;
    setErrorMessage(null);
    setStep('submitting');
    try {
      const result = await InvestmentService.bankTransferInvest({
        property_id: propertyId,
        token_amount: tokenAmount,
        investment_amount: amount,
        proof_of_transfer: proof,
        account_holder_name: accountHolderName.trim(),
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        routing_number: routingNumber.trim() || undefined,
        swift_code: swiftCode.trim() || undefined,
        transfer_reference_note: referenceNote.trim() || undefined,
      });
      const investmentId = result?.investment_id;
      const ref = result?.transfer_reference;
      if (!investmentId) {
        throw new Error('Submission accepted but no investment was returned.');
      }
      setTransferReference(ref ?? null);
      setStep('done');
      onSubmitted?.(investmentId, ref ?? '');
    } catch (caught: any) {
      const apiMessage =
        caught?.response?.data?.error?.message ||
        caught?.message ||
        'Failed to submit bank transfer.';
      setErrorMessage(apiMessage);
      setStep('collect');
    }
  };

  const renderCollect = () => (
    <div className="space-y-5">
      <div className="text-center">
        <Building2 className="mx-auto w-10 h-10 text-blue-500" />
        <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
          Bank transfer — submit proof
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Send <strong>${amount.toFixed(2)}</strong> from your bank and upload
          a screenshot or PDF receipt. An admin will verify and release your
          tokens once the funds arrive (typically 1–3 business days).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label="Account holder name"
          value={accountHolderName}
          onChange={(e) => setAccountHolderName(e.target.value)}
          placeholder="As it appears on the account"
        />
        <Input
          label="Bank name"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          placeholder="e.g. HSBC"
        />
        <Input
          label="Account number / IBAN"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          placeholder="Sending account"
        />
        <Input
          label="Routing / sort code"
          value={routingNumber}
          onChange={(e) => setRoutingNumber(e.target.value)}
          placeholder="Optional"
        />
        <Input
          label="SWIFT / BIC"
          value={swiftCode}
          onChange={(e) => setSwiftCode(e.target.value)}
          placeholder="For international wires"
        />
        <Input
          label="Reference / memo"
          value={referenceNote}
          onChange={(e) => setReferenceNote(e.target.value)}
          placeholder="Optional note for the admin"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Proof of transfer
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
          className="w-full rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 px-4 py-6 text-center hover:border-blue-400 transition-colors"
        >
          {proof ? (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <FileText className="w-4 h-4 text-blue-500" />
              {proof.name}
              <span className="text-xs text-gray-400">
                ({(proof.size / 1024).toFixed(0)} KB)
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
              <Upload className="w-5 h-5 text-gray-400" />
              Click to upload JPG, PNG or PDF
              <span className="text-xs text-gray-400">Max 10MB</span>
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
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          disabled={!proof}
        >
          Submit for review
        </Button>
      </div>
    </div>
  );

  const renderSubmitting = () => (
    <div className="text-center space-y-4 py-6">
      <Loader2 className="w-10 h-10 mx-auto animate-spin text-blue-500" />
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Uploading your proof of transfer…
      </p>
    </div>
  );

  const renderDone = () => (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-emerald-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Submitted for review
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Your tokens are reserved. An admin will release them once the funds
        arrive on our end. You&apos;ll get a notification + email when that
        happens.
      </p>
      {transferReference && (
        <Card className="p-3 bg-gray-50 dark:bg-gray-800/40 text-sm">
          Include this reference on your wire memo:&nbsp;
          <span className="font-mono font-semibold">{transferReference}</span>
        </Card>
      )}
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

export default BankTransferForm;
