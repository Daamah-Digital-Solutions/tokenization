import React, { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Calendar, CreditCard, Info } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ScheduleTable } from '../properties/PaymentPlanSection';
import { PaymentMethodList, usePaymentOptions } from '../purchase/PaymentMethodList';
import { PaymentService } from '../../services/payment/PaymentService';
import type { PayMethodId } from '../../utils/paymentMethods';

// The first payment of a plan: the wallet, or the provider's page (no bank / Sukuk route)
const FIRST_PAYMENT_METHODS: PayMethodId[] = ['wallet', 'card', 'apple_pay', 'google_pay', 'crypto', 'pronova'];
import { buildSchedule, fallbackPlan, formatMoney, formatPlanDate, parseDate } from '../../utils/paymentPlan';
import type { InvestmentData, InvestmentProperty } from './types';

interface PaymentScheduleStepProps {
  property: InvestmentProperty;
  investmentData: InvestmentData;
  onUpdate: (updates: Partial<InvestmentData>) => void;
  error?: string;
}

/**
 * Shown when the admin offers installments for the property (client round
 * 3, #20). The buyer picks full payment (if allowed) or installments; the
 * installment option shows the property's down payment, the allowed
 * installment counts and the full schedule — the same plan the backend
 * creates (properties/payment_plan.build_schedule). Tokens are reserved on
 * the property contract and released as each installment is paid.
 */
export const PaymentScheduleStep: React.FC<PaymentScheduleStepProps> = ({
  property,
  investmentData,
  onUpdate,
  error,
}) => {
  const { t, i18n } = useTranslation('plan');
  const lang = i18n.language || 'en';
  const plan = property.paymentPlan ?? fallbackPlan(property);
  const options = plan.installment_count
    ? [plan.installment_count]
    : plan.count_options?.length
      ? plan.count_options
      : [3, 6, 12];
  const isInstallment = !!investmentData.is_installment_purchase;
  const count = plan.installment_count || investmentData.total_installments || options[options.length - 1];
  const minimum = Number(plan.minimum_installment) || 100;

  const rows = useMemo(
    () =>
      buildSchedule(investmentData.amount, {
        downPaymentPercent: Number(plan.down_payment_percent) || 0,
        count,
        frequency: plan.frequency,
        firstDueDate: parseDate(plan.first_due_date),
      }),
    [investmentData.amount, plan.down_payment_percent, count, plan.frequency, plan.first_due_date],
  );
  const regular = rows.filter((r) => r.kind === 'installment');
  const down = rows[0]?.kind === 'down_payment' ? rows[0].amount : 0;
  // PropShare model: every payment carries the installment fee (admin setting, 4% by default).
  const { data: feeOptions } = usePaymentOptions();
  const installmentFeePct = Number(feeOptions?.fees?.installment_fee_pct ?? 4);
  const per = regular[0]?.amount || 0;
  const perLabel = t(`per.${plan.frequency}`);

  // What the first payment costs now, and whether the wallet can pay it
  const payWith = (investmentData.installmentPayMethod || 'wallet') as PayMethodId;
  const dueNow = Math.round((Number(rows[0]?.amount) || 0) * (1 + installmentFeePct / 100) * 100) / 100;
  const pronovaPct = Number(feeOptions?.fees?.pronova_discount_pct ?? 0);
  const dueWith = payWith === 'pronova' ? Math.round(dueNow * (100 - pronovaPct)) / 100 : dueNow;
  const { data: walletData } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => PaymentService.getWalletBalance(),
    enabled: isInstallment,
  });
  const walletBalance = walletData
    ? Number(walletData.total_value_usd) ||
      (walletData.balances || []).reduce((s: number, b: any) => s + (Number(b.available_balance) || 0), 0)
    : undefined;
  const walletShort = walletBalance !== undefined && walletBalance < dueNow;
  useEffect(() => {
    if (!isInstallment) return;
    if (investmentData.dueNow !== dueNow || investmentData.walletShort !== walletShort) {
      onUpdate({ dueNow, walletShort });
    }
  }, [isInstallment, dueNow, walletShort]);

  const handleUpfront = () => {
    if (!plan.allows_cash) return;
    onUpdate({ is_installment_purchase: false, total_installments: undefined, paymentMethod: null });
  };

  const handleInstallment = (n: number) => {
    // Installments are funded from the wallet (paid in Dashboard →
    // Installments), so nothing is charged at checkout.
    onUpdate({ is_installment_purchase: true, total_installments: n, paymentMethod: 'wallet' });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('checkout.title')}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {plan.allows_cash ? t('checkout.subtitle') : t('checkout.mustChooseInstallments')}
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Upfront option — only where the admin allows full payment */}
      {plan.allows_cash && (
        <button
          type="button"
          onClick={handleUpfront}
          className={cn(
            'w-full text-start p-4 rounded-xl border-2 transition-colors',
            !isInstallment
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
          )}
        >
          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 mt-1 text-primary-600 dark:text-primary-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-gray-100">{t('checkout.upfront')}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {t('checkout.upfrontHint', { total: formatMoney(investmentData.amount) })}
              </div>
            </div>
          </div>
        </button>
      )}

      {/* Installment option */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !isInstallment && handleInstallment(count)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isInstallment) handleInstallment(count);
        }}
        className={cn(
          'w-full text-start p-4 rounded-xl border-2 transition-colors cursor-pointer',
          isInstallment
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
        )}
      >
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 mt-1 text-primary-600 dark:text-primary-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 dark:text-gray-100">{t('checkout.installments')}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {down > 0
                ? t('checkout.installmentsHint', {
                    down: `${t('calculator.downPayment')} ${formatMoney(down)}`,
                    count: regular.length,
                    amount: formatMoney(per),
                    per: perLabel,
                  })
                : t('checkout.installmentsHintNoDown', { count: regular.length, amount: formatMoney(per), per: perLabel })}
            </div>

            {isInstallment && (
              <div className="mt-3 space-y-3">
                {options.length > 1 && (
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                      {t('calculator.count')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {options.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInstallment(n);
                          }}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                            n === count
                              ? 'bg-primary-600 text-white'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('checkout.firstPayment')}</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                      {formatMoney(rows[0]?.amount)} · {formatPlanDate(rows[0]?.dueDate, lang)}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('checkout.perPayment')}</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                      {formatMoney(per)} {perLabel}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('checkout.totalCommitment')}</div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                      {formatMoney(investmentData.amount)}
                    </div>
                  </div>
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  <ScheduleTable rows={rows} lang={lang} maxHeightClass="max-h-56" />
                </div>

                {per > 0 && per < minimum && (
                  <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{t('schedule.minimumWarning', { amount: formatMoney(minimum, 0) })}</span>
                  </div>
                )}

                {/* How the first payment is paid (client, additional fixes #2) */}
                <div onClick={(e) => e.stopPropagation()} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('checkout.payFirstWith')}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t('checkout.dueNow')} <strong className="text-gray-900 dark:text-white">{formatMoney(dueWith)}</strong>
                    </span>
                  </div>
                  <PaymentMethodList
                    value={payWith}
                    onChange={(id) => onUpdate({ installmentPayMethod: id })}
                    walletBalance={walletBalance}
                    total={dueNow}
                    only={FIRST_PAYMENT_METHODS}
                  />
                </div>

                <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
                  <span>
                    {t('checkout.firstPaymentNote', {
                      pct: installmentFeePct,
                      first: formatMoney(dueNow),
                    })}
                    {property.expected_completion_date
                      ? ` ${t('checkout.completion', { date: formatPlanDate(property.expected_completion_date, lang) })}`
                      : ''}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
