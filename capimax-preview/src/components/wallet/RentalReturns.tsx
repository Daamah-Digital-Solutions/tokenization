import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PurchaseService } from '../../services/purchase/PurchaseService';
import { usePaymentOptions } from '../purchase/PaymentMethodList';
import { uiLocale } from '../../utils/locale';

const money = (v: string | number | null | undefined) =>
  `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Rental income paid to the member (PropShare model): rent, management fee, net — and what can be reinvested. */
export const RentalReturns: React.FC = () => {
  const { t, i18n } = useTranslation('payments');
  const { data } = useQuery({ queryKey: ['rental-returns'], queryFn: () => PurchaseService.returns() });
  const { data: options } = usePaymentOptions();
  const dateLocale = uiLocale(i18n.language, 'en-GB');
  const fmt = (d: string) => new Date(d).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' });
  if (!data || data.items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5" data-testid="rental-returns">
      <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-0.5">{t('rentReturns.title')}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('rentReturns.subtitle')}</p>
      <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
        {([['gross', data.total_gross], ['fee', data.total_management_fee], ['net', data.total_net]] as const).map(([k, v]) => (
          <div key={k} className="rounded-xl bg-slate-50 dark:bg-slate-900/40 p-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">{t(`rentReturns.${k}`)}</div>
            <div className={`font-semibold tabular-nums ${k === 'net' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
              {k === 'fee' ? '−' : ''}{money(v)}
            </div>
          </div>
        ))}
      </div>
      {Number(data.reinvestable) > 0 && (
        <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-3">
          {t('rentReturns.reinvestable', { amount: money(data.reinvestable), pct: Number(options?.fees?.reinvest_discount_pct ?? 5) })}
        </p>
      )}
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {data.items.map((i) => (
          <div key={i.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <div className="font-medium text-slate-900 dark:text-white truncate">{i.property_title}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {fmt(i.period_start)} – {fmt(i.period_end)} · {t('rentReturns.shares', { n: i.shares })}
              </div>
            </div>
            <div className="text-end shrink-0" dir="ltr">
              <div className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{money(i.net_amount)}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {money(i.gross_amount)} − {money(i.management_fee)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RentalReturns;
