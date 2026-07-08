import React, { useState } from 'react';
import { apiClient } from '../../services/api/ApiClient';
import { Button } from '../ui/Button';
import { Text } from '../design-system/typography/Text';
import { cn } from '../../utils/cn';

export const WithdrawModal: React.FC<{
  availableBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ availableBalance, onClose, onSuccess }) => {
  const [method, setMethod] = useState<'bank' | 'crypto'>('bank');
  const [amount, setAmount] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [swiftCode, setSwiftCode] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [bankCountry, setBankCountry] = useState('');
  const [cryptoAsset, setCryptoAsset] = useState('USDT');
  const [cryptoNetwork, setCryptoNetwork] = useState('TRC20');
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [cryptoMemo, setCryptoMemo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const amountValue = parseFloat(amount);
  const amountValid =
    !isNaN(amountValue) && amountValue >= 10 && amountValue <= availableBalance;
  const detailsValid =
    method === 'bank'
      ? !!(accountHolderName.trim() && bankName.trim() && accountNumber.trim())
      : !!(cryptoAsset.trim() && cryptoNetwork.trim() && cryptoAddress.trim());
  const isValid = amountValid && detailsValid;

  const handleSubmit = async () => {
    if (!amountValid) {
      setError(
        amountValue > availableBalance
          ? `Amount exceeds your available balance of $${availableBalance.toLocaleString()}.`
          : 'Enter an amount of at least $10.',
      );
      return;
    }
    if (!detailsValid) {
      setError(
        method === 'bank'
          ? 'Account holder name, bank name, and account number are required.'
          : 'Asset, network, and wallet address are required.',
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload =
        method === 'bank'
          ? {
              amount: amountValue,
              currency: 'USD',
              withdrawal_method: 'bank',
              account_holder_name: accountHolderName.trim(),
              bank_name: bankName.trim(),
              account_number: accountNumber.trim(),
              routing_number: routingNumber.trim(),
              swift_code: swiftCode.trim(),
              bank_country: bankCountry.trim().toUpperCase(),
              notes: notes.trim(),
            }
          : {
              amount: amountValue,
              currency: 'USD',
              withdrawal_method: 'crypto',
              crypto_asset: cryptoAsset.trim(),
              crypto_network: cryptoNetwork.trim(),
              crypto_address: cryptoAddress.trim(),
              crypto_memo: cryptoMemo.trim(),
              notes: notes.trim(),
            };
      const result: any = await apiClient.post(
        '/payments/wallet/withdraw-request/',
        payload,
      );
      const refId = result?.id;
      const dest = method === 'bank' ? bankName : `${cryptoAsset} (${cryptoNetwork})`;
      const verb = method === 'bank' ? 'wire' : 'send';
      setSuccess(
        `Withdrawal request submitted. Compliance will review and ${verb} ` +
          `$${amountValue.toFixed(2)} to ${dest} within 48 hours. ` +
          (refId ? `Reference: ${refId.slice(0, 8)}.` : ''),
      );
      setTimeout(() => onSuccess(), 2500);
    } catch (e: any) {
      const msg = e?.message || 'Failed to submit the withdrawal request.';
      const details = e?.details;
      if (details && typeof details === 'object') {
        const flat = Object.entries(details)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' · ');
        setError(`${msg} (${flat})`);
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <Text variant="h3" weight="bold" className="mb-1">Withdraw Funds</Text>
        <Text variant="caption" color="muted" className="mb-5 block">
          Available balance: <strong>${availableBalance.toLocaleString()}</strong>
        </Text>

        {success ? (
          <>
            <div className="p-4 mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">
              {success}
            </div>
            <Button onClick={onClose} className="w-full">Close</Button>
          </>
        ) : (
          <>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Amount (USD)</label>
            <input
              type="number"
              min={10}
              max={availableBalance}
              step="0.01"
              placeholder="100.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm mb-4"
            />

            {/* Bank | Crypto method toggle */}
            <div className="flex gap-2 mb-4 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
              {(['bank', 'crypto'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMethod(m); setError(null); }}
                  className={cn(
                    'flex-1 py-2 rounded-md text-sm font-medium transition-colors',
                    method === m
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400',
                  )}
                >
                  {m === 'bank' ? 'Bank transfer' : 'Crypto'}
                </button>
              ))}
            </div>

            {method === 'bank' && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Account holder name *</label>
                <input
                  type="text"
                  placeholder="As shown on the account"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Bank name *</label>
                <input
                  type="text"
                  placeholder="e.g. HSBC"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Account number / IBAN *</label>
                <input
                  type="text"
                  placeholder="Receiving account"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">SWIFT / BIC</label>
                <input
                  type="text"
                  placeholder="For international wires"
                  value={swiftCode}
                  onChange={(e) => setSwiftCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Routing / sort code</label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Bank country (ISO-2)</label>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="US, GB, AE…"
                  value={bankCountry}
                  onChange={(e) => setBankCountry(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm uppercase"
                />
              </div>
            </div>
            )}

            {method === 'crypto' && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Asset *</label>
                <select
                  value={cryptoAsset}
                  onChange={(e) => setCryptoAsset(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                >
                  <option value="USDT">USDT</option>
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Network *</label>
                <select
                  value={cryptoNetwork}
                  onChange={(e) => setCryptoNetwork(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                >
                  <option value="TRC20">TRC20 (Tron)</option>
                  <option value="BEP20">BEP20 (BNB Smart Chain)</option>
                  <option value="ERC20">ERC20 (Ethereum)</option>
                  <option value="BTC">BTC (Bitcoin)</option>
                  <option value="ETH">ETH (Ethereum)</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Wallet address *</label>
                <input
                  type="text"
                  placeholder="Destination wallet address"
                  value={cryptoAddress}
                  onChange={(e) => setCryptoAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm font-mono"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Memo / tag (optional)</label>
                <input
                  type="text"
                  placeholder="Only if your exchange/chain requires it"
                  value={cryptoMemo}
                  onChange={(e) => setCryptoMemo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                />
              </div>
            </div>
            )}

            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Note for compliance (optional)</label>
              <textarea
                rows={2}
                placeholder="E.g. urgency, preferred reference, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
              />
            </div>

            <div className="p-3 mb-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-900 dark:text-amber-200">
              Compliance reviews each request. Funds are locked from your available balance the moment the request is submitted, then {method === 'bank' ? 'wired to your bank account' : 'sent to your wallet address'} within 48 hours of approval. You&apos;ll receive an email at each step.
            </div>

            {error && (
              <div className="p-3 mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1" disabled={submitting}>Cancel</Button>
              <Button onClick={handleSubmit} className="flex-1" disabled={submitting || !isValid}>
                {submitting ? 'Submitting…' : `Withdraw $${amountValid ? amountValue.toFixed(2) : '0.00'}`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
