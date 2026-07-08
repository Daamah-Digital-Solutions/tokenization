/**
 * Reusable wallet / payouts surface.
 *
 * Shows the current user's available wallet balance, a Withdraw action
 * (bank | crypto, admin-reviewed) and their withdrawal-request history.
 * Used by the developer (property_owner) and broker dashboards so they get
 * the same crypto-capable withdrawal flow as investors, without duplicating
 * the modal/history components (client edits #5, #6b).
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import { PaymentService } from '../../services/payment/PaymentService';
import { WithdrawModal } from './WithdrawModal';
import { WithdrawalRequestsSection } from './WithdrawalRequestsSection';

interface PayoutsPanelProps {
  title?: string;
  subtitle?: string;
  balanceLabel?: string;
  balanceHint?: string;
}

export const PayoutsPanel: React.FC<PayoutsPanelProps> = ({
  title = 'Wallet & Payouts',
  subtitle = 'Your available balance and withdrawal history.',
  balanceLabel = 'Available balance',
  balanceHint,
}) => {
  const queryClient = useQueryClient();
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const { data: walletData, isLoading } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => PaymentService.getWalletBalance(),
    refetchInterval: 30000,
  });

  const balance =
    (walletData as any)?.total_value_usd ||
    (walletData as any)?.balances?.reduce(
      (sum: number, b: any) => sum + (parseFloat(b.available_balance) || 0),
      0,
    ) ||
    0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setWithdrawOpen(true)}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 transition-colors shrink-0"
        >
          Withdraw
        </button>
      </div>

      {/* Balance card */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-white/20">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-white/90">{balanceLabel}</span>
        </div>
        <div className="text-3xl font-bold">
          {isLoading ? '—' : `$${Number(balance).toLocaleString()}`}
        </div>
        {balanceHint && <p className="text-xs text-white/80 mt-2">{balanceHint}</p>}
      </div>

      <WithdrawalRequestsSection />

      {withdrawOpen && (
        <WithdrawModal
          availableBalance={Number(balance)}
          onClose={() => setWithdrawOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
            queryClient.invalidateQueries({ queryKey: ['wallet'] });
            setWithdrawOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default PayoutsPanel;
