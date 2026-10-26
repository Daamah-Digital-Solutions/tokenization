import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PurchaseService, type PaymentOptions } from '../../services/purchase/PurchaseService';
import {
  PAYMENT_METHODS,
  applePayOnThisDevice,
  methodLive,
  type PayMethodId,
} from '../../utils/paymentMethods';
import { cn } from '../../utils/cn';

export function usePaymentOptions() {
  return useQuery<PaymentOptions>({
    queryKey: ['purchase-methods'],
    queryFn: () => PurchaseService.methods(),
    staleTime: 60_000,
  });
}

interface Props {
  value: PayMethodId;
  onChange: (id: PayMethodId) => void;
  /** The wallet balance, shown under the wallet option. */
  walletBalance?: number;
  /** What this purchase costs, to flag a wallet that is short. */
  total?: number;
}

/** The payment methods of a purchase — the same list, in the same order, on every property. */
export const PaymentMethodList: React.FC<Props> = ({ value, onChange, walletBalance, total }) => {
  const { t } = useTranslation('checkout');
  const { data: options } = usePaymentOptions();
  const pronovaPct = Number(options?.fees?.pronova_discount_pct ?? 0);
  const applePay = applePayOnThisDevice();
  const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-2" data-testid="payment-methods">
      {PAYMENT_METHODS.map((method) => {
        const live = methodLive(options?.methods, method);
        const noDevice = method.id === 'apple_pay' && !applePay;
        const disabled = !live || noDevice;
        const selected = value === method.id && !disabled;
        const walletShort =
          method.id === 'wallet' && walletBalance !== undefined && total !== undefined && walletBalance < total;
        const note = !live
          ? t('methods.unavailable')
          : noDevice
            ? t('methods.noDevice')
            : method.id === 'wallet' && walletBalance !== undefined
              ? t(walletShort ? 'methods.walletShort' : 'methods.walletBalance', { amount: money(walletBalance) })
              : null;
        const badge =
          method.id === 'pronova' && pronovaPct > 0
            ? t('methods.off', { pct: pronovaPct })
            : method.id === 'nova_sukuk'
              ? t('methods.financing')
              : null;
        const Icon = method.icon;
        return (
          <button
            key={method.id}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            data-method={method.id}
            onClick={() => !disabled && onChange(method.id)}
            className={cn(
              'w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border text-start transition-colors',
              disabled
                ? 'border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
                : selected
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400',
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-white">{t(`methods.${method.id}.label`)}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {method.id === 'pronova' && pronovaPct > 0
                    ? t('methods.pronova.discount', { pct: pronovaPct })
                    : t(`methods.${method.id}.description`)}
                </div>
                {note && (
                  <div className={cn('text-xs italic', walletShort ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400')}>
                    {note}
                  </div>
                )}
              </div>
            </div>
            {badge && (
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 rounded-full shrink-0">
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default PaymentMethodList;
