/**
 * InstallmentsPanel — the investor dashboard's "Installments" section
 * (client edit #3b: "a dedicated place to pay installments").
 *
 * Lists the investor's construction-installment plans and pays the next due
 * installment from the wallet (InstallmentService -> /properties/installments/).
 * On an insufficient balance it surfaces the existing Add Funds modal so the
 * fund-then-pay loop stays inside this panel.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Coins,
  Plus,
} from 'lucide-react';
import { InstallmentService, InstallmentPlan } from '../../../services/installments/InstallmentService';
import { PaymentService } from '../../../services/payment/PaymentService';
import { AddFundsModal } from '../../wallet/AddFundsModal';

const money = (n: number | string | undefined): string => {
  const v = Number(n);
  return `$${(isFinite(v) ? v : 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const fmtDate = (s?: string | null): string =>
  s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const isDue = (s?: string | null): boolean => {
  if (!s) return false;
  const due = new Date(s);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return due.getTime() <= today.getTime();
};

const statusStyle = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'cancelled':
    case 'refunded':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    case 'processing':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  }
};

export const InstallmentsPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const {
    data: plans = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<InstallmentPlan[]>({
    queryKey: ['my-installments'],
    queryFn: InstallmentService.getMyInstallments,
    refetchInterval: 60000,
  });

  const { data: walletData } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => PaymentService.getWalletBalance(),
    refetchInterval: 30000,
  });

  const walletBalance =
    walletData?.total_value_usd ||
    walletData?.balances?.reduce(
      (sum: number, b: any) => sum + (parseFloat(b.available_balance) || 0),
      0,
    ) ||
    0;

  const payMutation = useMutation({
    mutationFn: (id: string) => InstallmentService.payInstallment(id),
    onSuccess: (res) => {
      setConfirmingId(null);
      setFeedback({ type: 'success', msg: res?.message || 'Installment paid successfully.' });
      queryClient.invalidateQueries({ queryKey: ['my-installments'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['investor-portfolio'] });
    },
    onError: (err: any) => {
      setConfirmingId(null);
      const msg = err?.message || 'Payment could not be completed.';
      if (/insufficient/i.test(msg)) {
        setFeedback({
          type: 'error',
          msg: 'Not enough wallet balance for this installment. Add funds and try again.',
        });
        setShowAddFunds(true);
      } else {
        setFeedback({ type: 'error', msg });
      }
    },
  });

  const activePlans = plans.filter((p) => p.status !== 'cancelled');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Installments</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pay your under-construction property instalments from your wallet.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <Wallet className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{money(walletBalance)}</span>
          </div>
          <button
            onClick={() => setShowAddFunds(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-3 py-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Funds
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Body */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-300 mb-3">Couldn't load your installment plans.</p>
          <button onClick={() => refetch()} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
            Try again
          </button>
        </div>
      ) : activePlans.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
          <CalendarClock className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">No installment plans yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            When you buy an under-construction property in instalments, your plan and its
            payment schedule will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activePlans.map((plan) => {
            const pct = Math.min(100, Math.round(Number(plan.completion_percentage) || 0));
            const due = plan.is_active && isDue(plan.next_payment_date) && plan.remaining_payments > 0;
            const paying = payMutation.isPending && payMutation.variables === plan.id;
            const confirming = confirmingId === plan.id;

            return (
              <div
                key={plan.id}
                className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {plan.property_title || 'Property'}
                    </h3>
                    {plan.property_address && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{plan.property_address}</p>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusStyle(plan.status)}`}>
                    {plan.status}
                  </span>
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>
                      {plan.payments_made}/{plan.total_installments} payments · {pct}%
                    </span>
                    <span className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-emerald-500" />
                      {plan.tokens_released}/{plan.token_allocation} tokens
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Figures */}
                <div className="grid grid-cols-3 gap-2 text-sm mb-4">
                  <div>
                    <div className="text-xs text-gray-400">Per payment</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{money(plan.installment_amount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Remaining</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{money(plan.remaining_amount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">{plan.is_completed ? 'Completed' : 'Next due'}</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {plan.is_completed ? '✓' : fmtDate(plan.next_payment_date)}
                    </div>
                  </div>
                </div>

                {/* Action */}
                {plan.is_completed ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Fully paid — all tokens released
                  </div>
                ) : confirming ? (
                  <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-sm text-emerald-800 dark:text-emerald-300">
                      Pay {money(plan.installment_amount)} from your wallet?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfirmingId(null)}
                        disabled={paying}
                        className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => payMutation.mutate(plan.id)}
                        disabled={paying}
                        className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50"
                      >
                        {paying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Confirm
                      </button>
                    </div>
                  </div>
                ) : due ? (
                  <button
                    onClick={() => {
                      setFeedback(null);
                      setConfirmingId(plan.id);
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 transition-colors"
                  >
                    <Wallet className="w-4 h-4" />
                    Pay {money(plan.installment_amount)} now
                  </button>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Next payment due {fmtDate(plan.next_payment_date)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAddFunds && (
        <AddFundsModal
          onClose={() => setShowAddFunds(false)}
          onSuccess={() => {
            setShowAddFunds(false);
            queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
          }}
        />
      )}
    </div>
  );
};

export default InstallmentsPanel;
