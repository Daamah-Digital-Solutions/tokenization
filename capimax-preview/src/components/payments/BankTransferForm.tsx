import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Copy, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Download,
  Mail,
  Smartphone
} from 'lucide-react';
import { usePayment } from '../../contexts/PaymentContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatCurrency } from '../../utils/currencyConverter';
import { apiClient } from '../../services/api/ApiClient';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface BankTransferFormProps {
  amount: number;
  /**
   * The property the investor is paying for. Required by the backend
   * `BankTransferCreateSerializer`. If not provided the form will surface a
   * clear error rather than synthesise one.
   */
  propertyId?: string;
  onPaymentComplete?: (transferId: string) => void;
  onCancel?: () => void;
  className?: string;
}

interface BankAccountDetails {
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  accountHolder: string;
  swiftCode: string;
  iban?: string;
}

const COMPANY_BANK_DETAILS: BankAccountDetails = {
  bankName: 'JPMorgan Chase Bank',
  accountNumber: '1234567890',
  routingNumber: '021000021',
  accountHolder: 'Capimax Tokenization LLC',
  swiftCode: 'CHASUS33',
  iban: 'US12345678901234567890',
};

export function BankTransferForm({ amount, propertyId, onPaymentComplete, onCancel, className }: BankTransferFormProps) {
  const { addTransaction } = usePayment();
  const { error: showError } = useNotifications();
  const [step, setStep] = useState<'instructions' | 'confirmation' | 'pending'>('instructions');
  const [transferMethod, setTransferMethod] = useState<'wire' | 'ach'>('wire');
  const [transferId, setTransferId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [senderAccountNumber, setSenderAccountNumber] = useState('');
  const [senderRoutingNumber, setSenderRoutingNumber] = useState('');
  const [senderBankName, setSenderBankName] = useState('');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast notification here
  };

  /**
   * Confirm the bank transfer by registering it with the backend.
   *
   * Previously this generated a client-side fake reference (`bank_<ts>_<rand>`)
   * and called `onPaymentComplete` immediately, creating the illusion of a
   * paid investment with no backend record at all.
   *
   * Now: POST /payments/bank-transfer/create/ — the backend creates a real
   * Payment row in PENDING status, returns the platform-issued reference,
   * and the user uses that reference on their actual wire. We mark the
   * transaction PENDING in the local context (it stays pending until the
   * funds-received reconciliation flips it COMPLETED server-side).
   */
  const handleConfirmTransfer = async () => {
    if (!propertyId) {
      showError(
        'Property required',
        'Bank transfer must be tied to a specific property. Please re-open this payment flow from a property page.'
      );
      return;
    }
    if (!accountHolderName.trim() || !senderAccountNumber.trim() ||
        !senderRoutingNumber.trim() || !senderBankName.trim()) {
      showError(
        'Sender bank details required',
        'Please fill in account holder, account number, routing number, and bank name.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.post<{
        payment_id: string;
        transfer_reference: string;
        status: string;
      }>('/payments/bank-transfer/create/', {
        property_id: propertyId,
        amount,
        currency: 'USD',
        account_holder_name: accountHolderName,
        account_number: senderAccountNumber,
        routing_number: senderRoutingNumber,
        bank_name: senderBankName,
        // Optional but useful for audit trail
        transfer_instructions:
          `Method: ${transferMethod.toUpperCase()}. ` +
          (userEmail ? `Contact: ${userEmail}. ` : '') +
          (userPhone ? `Phone: ${userPhone}.` : ''),
      });

      const realTransferId = response.transfer_reference || response.payment_id;

      addTransaction({
        id: realTransferId,
        type: 'investment' as const,
        status: 'pending' as const,
        amount,
        currency: 'USD',
        paymentMethod: {
          type: 'bank' as const,
          id: realTransferId,
          bankName: senderBankName,
          accountNumber: `****${senderAccountNumber.slice(-4)}`,
        },
        timestamp: new Date(),
        description: `Investment payment of ${formatCurrency(amount, 'USD')} via ${transferMethod.toUpperCase()}`,
        fee: transferMethod === 'wire' ? 25 : 0,
      });

      setTransferId(realTransferId);
      setStep('pending');
      onPaymentComplete?.(realTransferId);
    } catch (err: any) {
      console.error('Bank transfer registration failed:', err);
      showError(
        'Bank transfer failed',
        err?.message || 'Could not register the transfer. Please try again or contact support.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInstructions = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Bank Transfer Payment
        </h3>
        <p className="text-sm text-gray-600">
          Transfer {formatCurrency(amount, 'USD')} to our bank account
        </p>
      </div>

      {/* Transfer Method Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Transfer Method
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card 
            className={`p-4 cursor-pointer transition-all ${
              transferMethod === 'wire'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setTransferMethod('wire')}
          >
            <div className="text-center">
              <Building2 className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
              <h4 className="font-medium text-gray-900">Wire Transfer</h4>
              <p className="text-xs text-gray-600 mt-1">Same day processing</p>
              <p className="text-xs text-red-600 mt-1">$25 fee</p>
            </div>
          </Card>

          <Card 
            className={`p-4 cursor-pointer transition-all ${
              transferMethod === 'ach'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setTransferMethod('ach')}
          >
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <h4 className="font-medium text-gray-900">ACH Transfer</h4>
              <p className="text-xs text-gray-600 mt-1">1-3 business days</p>
              <p className="text-xs text-emerald-600 mt-1">No fee</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Bank Details */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-blue-900">Transfer Details</h4>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const details = `
Bank: ${COMPANY_BANK_DETAILS.bankName}
Account Holder: ${COMPANY_BANK_DETAILS.accountHolder}
Account Number: ${COMPANY_BANK_DETAILS.accountNumber}
Routing Number: ${COMPANY_BANK_DETAILS.routingNumber}
${transferMethod === 'wire' ? `SWIFT Code: ${COMPANY_BANK_DETAILS.swiftCode}` : ''}
Amount: ${formatCurrency(amount, 'USD')}
Reference: INV-${Date.now()}
              `.trim();
              copyToClipboard(details);
            }}
            className="text-xs"
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy All
          </Button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="font-medium text-blue-900">Bank Name:</span>
            <div className="flex items-center gap-2">
              <span className="text-blue-800">{COMPANY_BANK_DETAILS.bankName}</span>
              <button
                onClick={() => copyToClipboard(COMPANY_BANK_DETAILS.bankName)}
                className="p-1 hover:bg-blue-200 rounded"
              >
                <Copy className="h-3 w-3 text-blue-600" />
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="font-medium text-blue-900">Account Holder:</span>
            <div className="flex items-center gap-2">
              <span className="text-blue-800">{COMPANY_BANK_DETAILS.accountHolder}</span>
              <button
                onClick={() => copyToClipboard(COMPANY_BANK_DETAILS.accountHolder)}
                className="p-1 hover:bg-blue-200 rounded"
              >
                <Copy className="h-3 w-3 text-blue-600" />
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="font-medium text-blue-900">Account Number:</span>
            <div className="flex items-center gap-2">
              <span className="text-blue-800 font-mono">{COMPANY_BANK_DETAILS.accountNumber}</span>
              <button
                onClick={() => copyToClipboard(COMPANY_BANK_DETAILS.accountNumber)}
                className="p-1 hover:bg-blue-200 rounded"
              >
                <Copy className="h-3 w-3 text-blue-600" />
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="font-medium text-blue-900">Routing Number:</span>
            <div className="flex items-center gap-2">
              <span className="text-blue-800 font-mono">{COMPANY_BANK_DETAILS.routingNumber}</span>
              <button
                onClick={() => copyToClipboard(COMPANY_BANK_DETAILS.routingNumber)}
                className="p-1 hover:bg-blue-200 rounded"
              >
                <Copy className="h-3 w-3 text-blue-600" />
              </button>
            </div>
          </div>

          {transferMethod === 'wire' && (
            <div className="flex justify-between items-center">
              <span className="font-medium text-blue-900">SWIFT Code:</span>
              <div className="flex items-center gap-2">
                <span className="text-blue-800 font-mono">{COMPANY_BANK_DETAILS.swiftCode}</span>
                <button
                  onClick={() => copyToClipboard(COMPANY_BANK_DETAILS.swiftCode)}
                  className="p-1 hover:bg-blue-200 rounded"
                >
                  <Copy className="h-3 w-3 text-blue-600" />
                </button>
              </div>
            </div>
          )}

          <div className="border-t border-blue-200 pt-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-blue-900">Amount to Transfer:</span>
              <span className="text-lg font-bold text-blue-800">
                {formatCurrency(amount + (transferMethod === 'wire' ? 25 : 0), 'USD')}
              </span>
            </div>
            {transferMethod === 'wire' && (
              <div className="text-xs text-blue-700 mt-1">
                Includes $25 wire transfer fee
              </div>
            )}
          </div>

          <div className="border-t border-blue-200 pt-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-blue-900">Reference:</span>
              <div className="flex items-center gap-2">
                <span className="text-blue-800 font-mono">INV-{Date.now()}</span>
                <button
                  onClick={() => copyToClipboard(`INV-${Date.now()}`)}
                  className="p-1 hover:bg-blue-200 rounded"
                >
                  <Copy className="h-3 w-3 text-blue-600" />
                </button>
              </div>
            </div>
            <div className="text-xs text-blue-700 mt-1">
              Include this reference in your transfer description
            </div>
          </div>
        </div>
      </Card>

      {/* Important Notes */}
      <Card className="p-4 bg-yellow-50 border-yellow-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <div className="font-medium mb-2">Important Instructions:</div>
            <ul className="space-y-1 list-disc list-inside">
              <li>Include the reference number in your transfer description</li>
              <li>Ensure the transfer amount matches exactly</li>
              <li>Transfer from an account in your name for faster processing</li>
              <li>{transferMethod === 'wire' ? 'Wire transfers are typically processed same day' : 'ACH transfers take 1-3 business days'}</li>
              <li>You'll receive confirmation once we receive your transfer</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email for Updates
          </label>
          <div className="relative">
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <div className="relative">
            <input
              type="tel"
              value={userPhone}
              onChange={(e) => setUserPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={() => setStep('confirmation')}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          I've Made the Transfer
        </Button>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Confirm Your Transfer
        </h3>
        <p className="text-sm text-gray-600">
          Tell us which bank you're sending from so we can reconcile your payment.
        </p>
      </div>

      {/* Sender bank details — required by the backend serializer for audit / reconciliation. */}
      <Card className="p-4 bg-white border-gray-200">
        <div className="space-y-3">
          <label className="block text-xs font-medium text-gray-700">
            Account Holder Name
            <input
              type="text"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              placeholder="As shown on your bank account"
              className="mt-1 block w-full rounded border-gray-300 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-gray-700">
            Sending Bank Name
            <input
              type="text"
              value={senderBankName}
              onChange={(e) => setSenderBankName(e.target.value)}
              placeholder="e.g. Bank of America"
              className="mt-1 block w-full rounded border-gray-300 text-sm"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-gray-700">
              Account Number
              <input
                type="text"
                value={senderAccountNumber}
                onChange={(e) => setSenderAccountNumber(e.target.value)}
                placeholder="Last 8-12 digits"
                className="mt-1 block w-full rounded border-gray-300 text-sm font-mono"
              />
            </label>
            <label className="block text-xs font-medium text-gray-700">
              Routing Number
              <input
                type="text"
                value={senderRoutingNumber}
                onChange={(e) => setSenderRoutingNumber(e.target.value)}
                placeholder="9 digits"
                className="mt-1 block w-full rounded border-gray-300 text-sm font-mono"
              />
            </label>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-emerald-50 border-emerald-200">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="font-medium">Transfer Method:</span>
            <span className="capitalize">{transferMethod} Transfer</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Amount:</span>
            <span>{formatCurrency(amount, 'USD')}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Fee:</span>
            <span>{transferMethod === 'wire' ? formatCurrency(25, 'USD') : 'No fee'}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-2">
            <span>Total Transferred:</span>
            <span>{formatCurrency(amount + (transferMethod === 'wire' ? 25 : 0), 'USD')}</span>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">What happens next?</div>
            <ul className="space-y-1">
              <li>• We'll monitor our account for your transfer</li>
              <li>• You'll receive email confirmation once received</li>
              <li>• {transferMethod === 'wire' ? 'Wire transfers typically clear same day' : 'ACH transfers take 1-3 business days'}</li>
              <li>• Your investment will be processed immediately after confirmation</li>
            </ul>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep('instructions')} className="flex-1">
          Back
        </Button>
        <Button
          onClick={handleConfirmTransfer}
          disabled={isSubmitting}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          {isSubmitting ? 'Registering…' : 'Confirm Transfer Made'}
        </Button>
      </div>
    </div>
  );

  const renderPending = () => (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
        <Clock className="h-8 w-8 text-yellow-600" />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Transfer Pending
        </h3>
        <p className="text-sm text-gray-600">
          We're waiting to receive your bank transfer
        </p>
      </div>

      {transferId && (
        <Card className="p-4 bg-yellow-50 border-yellow-200 text-left">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Transfer ID:</span>
              <span className="font-mono text-xs">{transferId}</span>
            </div>
            <div className="flex justify-between">
              <span>Method:</span>
              <span className="capitalize">{transferMethod} Transfer</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span>{formatCurrency(amount, 'USD')}</span>
            </div>
            <div className="flex justify-between">
              <span>Expected Processing:</span>
              <span>{transferMethod === 'wire' ? 'Same day' : '1-3 business days'}</span>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        <div className="text-sm text-gray-600">
          You'll receive updates at: <span className="font-medium">{userEmail || 'your email'}</span>
        </div>
        
        <div className="flex gap-2 justify-center">
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Instructions
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Email Instructions
          </Button>
        </div>
      </div>

      <Card className="p-3 bg-gray-50 border-gray-200">
        <div className="text-xs text-gray-600">
          <div className="font-medium mb-1">Need help?</div>
          <div>Contact our support team if you have any questions about your transfer.</div>
        </div>
      </Card>

      <Button
        onClick={onCancel}
        className="w-full bg-emerald-600 hover:bg-emerald-700"
      >
        Done
      </Button>
    </div>
  );

  return (
    <div className={className}>
      <Card className="max-w-lg mx-auto">
        <div className="p-6">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step === 'instructions' && renderInstructions()}
            {step === 'confirmation' && renderConfirmation()}
            {step === 'pending' && renderPending()}
          </motion.div>
        </div>
      </Card>
    </div>
  );
}

export default BankTransferForm;