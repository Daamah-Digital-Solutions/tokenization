/**
 * InstallmentsPanel — the investor dashboard's "Installments" section
 * (client edit #3b, round 3 #19).
 *
 * For every installment plan: the property (with a link to it), progress,
 * the full schedule with each installment's status (paid / due / overdue /
 * upcoming), paying the amount due from the wallet, and downloads — the
 * plan statement and a receipt for each paid installment. On an
 * insufficient balance it opens the Add Funds modal so the fund-then-pay
 * loop stays inside this panel.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  Download,
  ExternalLink,
  Loader2,
  Plus,
  Wallet,
} from 'lucide-react';
import { InstallmentService, InstallmentPlan } from '../../../services/installments/InstallmentService';
import { PaymentService } from '../../../services/payment/PaymentService';
import { AddFundsModal } from '../../wallet/AddFundsModal';
import { ScheduleTable } from '../../properties/PaymentPlanSection';
import { useRouter } from '../../../utils/router';
import { useAuth } from '../../../contexts/AuthContext';
import { formatMoney, formatPlanDate, rowsFromPlanSchedule, type ScheduleRow } from '../../../utils/paymentPlan';
import {
  downloadInstallmentReceiptPdf,
  downloadInstallmentSchedulePdf,
} from '../../../utils/installmentSchedulePdf';

const statusStyle = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'cancelled':
    case 'refunded':
    case 'failed':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    case 'overdue':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'processing':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  }
};

const FREQ_EN: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-annual',
  annual: 'Annual',
};

export const InstallmentsPanel: React.FC = () => {
  const { t, i18n } = useTranslation('plan');
  const lang = i18n.language || 'en';
  const queryClient = useQueryClient();
  const { navigate } = useRouter();
  const { state } = useAuth();
  const user: any = state?.user;
  const investorName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || undefined;

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { data: plans = [], isLoading, isError, refetch } = useQuery<InstallmentPlan[]>({
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
    walletData?.balances?.reduce((sum: number, b: any) => sum + (parseFloat(b.available_balance) || 0), 0) ||
    0;

  const payMutation = useMutation({
    mutationFn: (id: string) => InstallmentService.payInstallment(id),
    onSuccess: () => {
      setConfirmingId(null);
      setFeedback({ type: 'success', msg: t('dashboard.paidSuccess') });
      queryClient.invalidateQueries({ queryKey: ['my-installments'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['investor-portfolio'] });
    },
    onError: (err: any) => {
      setConfirmingId(null);
      const msg = err?.message || '';
      if (/insufficient/i.test(msg)) {
        setFeedback({ type: 'error', msg: t('dashboard.insufficient') });
        setShowAddFunds(true);
      } else {
        setFeedback({ type: 'error', msg: msg || t('dashboard.payFailed') });
      }
    },
  });

  const activePlans = plans.filter((p) => p.status !== 'cancelled');

  const location = (plan: InstallmentPlan) =>
    [plan.property_city, plan.property_country].filter(Boolean).join(', ') || plan.property_address || undefined;

  const downloadStatement = (plan: InstallmentPlan, rows: ScheduleRow[]) =>
    downloadInstallmentSchedulePdf({
      propertyName: plan.property_title || 'Property',
      location: location(plan),
      investorName: investorName || user?.email,
      investorEmail: user?.email,
      planReference: plan.id,
      tokens: plan.token_allocation,
      tokenPrice: Number(plan.token_price) || 0,
      totalAmount: Number(plan.total_investment_amount) || 0,
      paidAmount: Number(plan.total_amount_paid) || 0,
      frequencyLabel: FREQ_EN[plan.frequency] || 'Monthly',
      frequency: plan.frequency,
      downPayment: Number(plan.down_payment_amount) || 0,
      rows,
    }).catch((e) => console.error('Statement PDF failed:', e));

  const downloadReceipt = (plan: InstallmentPlan, rows: ScheduleRow[], row: ScheduleRow) => {
    const installmentNo = rows.filter((r) => r.kind === 'installment' && r.number <= row.number).length;
    downloadInstallmentReceiptPdf({
      propertyName: plan.property_title || 'Property',
      location: location(plan),
      investorName,
      investorEmail: user?.email,
      planReference: plan.id,
      paymentReference: row.paymentId,
      label: row.kind === 'down_payment' ? 'Down payment' : `Installment ${installmentNo}`,
      kind: row.kind,
      installmentNumber: row.kind === 'installment' ? installmentNo : undefined,
      number: row.number,
      totalPayments: rows.length,
      amount: row.amount,
      dueDate: row.dueDate,
      paidAt: row.paidAt ? new Date(row.paidAt) : row.dueDate,
      remainingAfter: row.remaining,
    }).catch((e) => console.error('Receipt PDF failed:', e));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <Wallet className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatMoney(walletBalance)}</span>
          </div>
          <button
            onClick={() => setShowAddFunds(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-3 py-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('dashboard.addFunds')}
          </button>
        </div>
      </div>

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

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-300 mb-3">{t('dashboard.loadError')}</p>
          <button onClick={() => refetch()} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
            {t('dashboard.retry')}
          </button>
        </div>
      ) : activePlans.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
          <CalendarClock className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('dashboard.emptyTitle')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">{t('dashboard.emptyBody')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activePlans.map((plan) => {
            const total = Number(plan.total_investment_amount) || 0;
            const rows = rowsFromPlanSchedule(plan.schedule, total);
            const pct = Math.min(100, Math.round(Number(plan.completion_percentage) || 0));
            const nextRow = rows.find((r) => r.status === 'due' || r.status === 'overdue' || r.status === 'upcoming');
            const dueRow = rows.find((r) => r.status === 'due' || r.status === 'overdue');
            const amountDue = Number(plan.amount_due ?? plan.installment_amount) || 0;
            const isOverdue = rows.some((r) => r.status === 'overdue');
            const paying = payMutation.isPending && payMutation.variables === plan.id;
            const confirming = confirmingId === plan.id;
            const open = openId === plan.id || (openId === null && activePlans.length === 1);
            const planStatus = isOverdue && !plan.is_completed ? 'overdue' : plan.status;

            return (
              <div key={plan.id} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <button
                      onClick={() => navigate('property-detail' as any, { id: plan.property_investment })}
                      className="group inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 text-start"
                    >
                      {plan.property_title || 'Property'}
                      <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                    </button>
                    {location(plan) && <p className="text-xs text-gray-500 dark:text-gray-400">{location(plan)}</p>}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusStyle(planStatus)}`}>
                    {t(`dashboard.planStatus.${planStatus}`, { defaultValue: planStatus })}
                  </span>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1 gap-2 flex-wrap">
                    <span>{t('dashboard.progress', { paid: plan.payments_made, total: plan.total_installments, percent: pct })}</span>
                    <span className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-emerald-500" />
                      {t('dashboard.shares', { released: plan.tokens_released, total: plan.token_allocation })}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Figures */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                  <div>
                    <div className="text-xs text-gray-400">{t('calculator.total')}</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{formatMoney(total)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">{t('dashboard.paid')}</div>
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400">{formatMoney(plan.total_amount_paid)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">{t('dashboard.remaining')}</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{formatMoney(plan.remaining_amount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">{plan.is_completed ? t('dashboard.completed') : t('dashboard.nextDue')}</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {plan.is_completed ? '✓' : formatPlanDate(nextRow?.dueDate || plan.next_payment_date, lang)}
                    </div>
                  </div>
                </div>

                {/* Action */}
                {plan.is_completed ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    {t('dashboard.fullyPaid')}
                  </div>
                ) : confirming ? (
                  <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-sm text-emerald-800 dark:text-emerald-300">
                      {t('dashboard.confirmPay', { amount: formatMoney(amountDue) })}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfirmingId(null)}
                        disabled={paying}
                        className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                      >
                        {t('dashboard.cancel')}
                      </button>
                      <button
                        onClick={() => payMutation.mutate(plan.id)}
                        disabled={paying}
                        className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50"
                      >
                        {paying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {t('dashboard.confirm')}
                      </button>
                    </div>
                  </div>
                ) : dueRow && plan.is_active ? (
                  <button
                    onClick={() => {
                      setFeedback(null);
                      setConfirmingId(plan.id);
                    }}
                    className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl text-white text-sm font-medium px-4 py-2.5 transition-colors ${
                      isOverdue ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700'
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                    {t('dashboard.payNow', { amount: formatMoney(amountDue) })}
                  </button>
                ) : nextRow ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {t('dashboard.nextPayment', { amount: formatMoney(nextRow.amount), date: formatPlanDate(nextRow.dueDate, lang) })}
                  </div>
                ) : null}

                {/* Schedule + downloads */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2">
                  <button
                    onClick={() => setOpenId(open ? '' : plan.id)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-emerald-600"
                  >
                    {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {open ? t('dashboard.hideSchedule') : t('dashboard.showSchedule')}
                  </button>
                  {rows.length > 0 && (
                    <button
                      onClick={() => downloadStatement(plan, rows)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      <Download className="w-4 h-4" />
                      {t('dashboard.downloadStatement')}
                    </button>
                  )}
                </div>
                {open && rows.length > 0 && (
                  <div className="mt-3">
                    <ScheduleTable
                      rows={rows}
                      lang={lang}
                      withStatus
                      maxHeightClass="max-h-96"
                      onReceipt={(row) => downloadReceipt(plan, rows, row)}
                    />
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
