/**
 * PaymentPlanSection — the property page's payment plan (client round 3,
 * #18 #20, admin note #2).
 *
 * Shows the purchase methods the admin allows for this property (full
 * payment / installments), and — when installments are offered — the full
 * schedule for the chosen number of shares: down payment, every installment
 * with its due date and amount, and a PDF download. The schedule is built
 * with the same rules the backend uses to create the buyer's plan
 * (utils/paymentPlan.buildSchedule), so what the buyer sees here is what
 * they get at checkout.
 */

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, CheckCircle2, CreditCard, Download, Info, Layers, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  buildSchedule,
  formatMoney,
  formatPlanDate,
  parseDate,
  type PaymentPlanConfig,
  type PriceTier,
} from '../../utils/paymentPlan';
import { downloadInstallmentSchedulePdf } from '../../utils/installmentSchedulePdf';

interface PlanProperty {
  title: string;
  city?: string;
  country?: string;
  token_price: number | string;
  total_tokens?: number;
  tokens_sold?: number;
}

interface PaymentPlanSectionProps {
  property: PlanProperty;
  plan: PaymentPlanConfig;
  initialShares?: number;
  onBuy?: (shares: number, method: 'cash' | 'installments', count?: number) => void;
  className?: string;
}

export const PaymentPlanSection: React.FC<PaymentPlanSectionProps> = ({
  property,
  plan,
  initialShares,
  onBuy,
  className = '',
}) => {
  const { t, i18n } = useTranslation('plan');
  const lang = i18n.language || 'en';
  const tokenPrice = Math.max(0, Number(property.token_price) || 0);
  const available = Math.max(0, (Number(property.total_tokens) || 0) - (Number(property.tokens_sold) || 0));
  const minimum = Number(plan.minimum_installment) || 100;
  const downPct = Number(plan.down_payment_percent) || 0;
  const options = plan.count_options?.length ? plan.count_options : [12];

  const defaultCount = plan.installment_count || options[options.length - 1];
  const defaultShares = useMemo(() => {
    // Enough shares for the default plan's installment to clear the minimum.
    if (!tokenPrice) return 1;
    const needed = Math.ceil((minimum * defaultCount) / (tokenPrice * (1 - downPct / 100) || 1));
    const n = Math.max(initialShares || 1, needed, 10);
    return Math.max(1, available > 0 ? Math.min(n, available) : n);
  }, [initialShares, tokenPrice, defaultCount, minimum, downPct, available]);

  const [shares, setShares] = useState<number>(defaultShares);
  const [count, setCount] = useState<number>(defaultCount);
  const [downloading, setDownloading] = useState(false);

  const total = shares * tokenPrice;
  const rows = useMemo(
    () =>
      buildSchedule(total, {
        downPaymentPercent: downPct,
        count,
        frequency: plan.frequency,
        firstDueDate: parseDate(plan.first_due_date),
      }),
    [total, downPct, count, plan.frequency, plan.first_due_date],
  );
  const regular = rows.filter((r) => r.kind === 'installment');
  const down = rows[0]?.kind === 'down_payment' ? rows[0].amount : 0;
  const per = regular[0]?.amount || 0;
  const tooSmall = per > 0 && per < minimum;
  const freqLabel = t(`frequency.${plan.frequency}`);
  const perLabel = t(`per.${plan.frequency}`);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadInstallmentSchedulePdf({
        propertyName: property.title,
        location: [property.city, property.country].filter(Boolean).join(', ') || undefined,
        tokens: shares,
        tokenPrice,
        totalAmount: total,
        frequencyLabel: t(`frequency.${plan.frequency}`, { lng: 'en' }),
        downPayment: down,
        rows,
        notes: plan.notes || undefined,
      });
    } catch (e) {
      console.error('Installment PDF generation failed:', e);
    } finally {
      setDownloading(false);
    }
  };

  if (tokenPrice <= 0) return null;

  const MethodCard = ({ allowed, icon: Icon, title, hint }: { allowed: boolean; icon: any; title: string; hint: string }) => (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4',
        allowed
          ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-900/10'
          : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 opacity-70',
      )}
    >
      <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', allowed ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400')} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-gray-900 dark:text-white">{title}</span>
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-semibold',
              allowed ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500',
            )}
          >
            {allowed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {allowed ? t('methods.available') : t('methods.notAvailable')}
          </span>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{hint}</p>
      </div>
    </div>
  );

  return (
    <div
      id="payment-plan"
      className={cn('rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8', className)}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
          <CalendarClock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{t('section.title')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('section.subtitle')}</p>
        </div>
      </div>

      {/* Purchase methods */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <MethodCard allowed={plan.allows_cash} icon={CreditCard} title={t('methods.cash')} hint={t('methods.cashHint')} />
        <MethodCard
          allowed={plan.allows_installments}
          icon={Layers}
          title={t('methods.installments')}
          hint={t('methods.installmentsHint')}
        />
      </div>

      {plan.allows_installments && (
        <>
          {/* Calculator */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t('calculator.shares')}
              </label>
              <input
                type="number"
                min={1}
                max={available || undefined}
                step={1}
                value={shares}
                onChange={(e) => {
                  const v = Math.max(1, Math.floor(Number(e.target.value) || 1));
                  setShares(available > 0 ? Math.min(v, available) : v);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-400 mt-1">
                {t('calculator.sharesHint', { total: formatMoney(total, 0), price: formatMoney(tokenPrice, 0) })}
                {available > 0 && shares >= available ? ` · ${t('calculator.maxAvailable')}` : ''}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t('calculator.count')}
              </label>
              {plan.installment_count ? (
                <div className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-sm text-gray-900 dark:text-white">
                  {t('calculator.countFixed', { count: plan.installment_count })}
                </div>
              ) : (
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                >
                  {options.map((n) => (
                    <option key={n} value={n}>
                      {t('calculator.countOption', { count: n })}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {freqLabel} · {downPct > 0 ? t('calculator.downPaymentPercent', { percent: downPct }) : t('calculator.noDownPayment')}
              </p>
            </div>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: t('calculator.downPayment'), value: down > 0 ? formatMoney(down) : t('calculator.noDownPayment') },
              { label: `${t('calculator.installment')} ${perLabel}`, value: formatMoney(per), strong: true },
              { label: t('calculator.firstDue'), value: formatPlanDate(regular[0]?.dueDate, lang) },
              { label: t('calculator.lastDue'), value: formatPlanDate(regular[regular.length - 1]?.dueDate, lang) },
            ].map((c) => (
              <div
                key={c.label}
                className={cn(
                  'rounded-xl p-3 border',
                  c.strong
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/40'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800',
                )}
              >
                <div className="text-[11px] text-gray-500 dark:text-gray-400">{c.label}</div>
                <div className={cn('font-bold mt-0.5', c.strong ? 'text-emerald-600 dark:text-emerald-400 text-lg' : 'text-gray-900 dark:text-white')}>
                  {c.value}
                </div>
              </div>
            ))}
          </div>

          {tooSmall && (
            <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 mb-4">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{t('schedule.minimumWarning', { amount: formatMoney(minimum, 0) })}</span>
            </div>
          )}

          {/* Schedule */}
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">{t('schedule.title')}</h4>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('calculator.summary', { count: rows.length, total: formatMoney(total, 0) })}
            </span>
          </div>
          <ScheduleTable rows={rows} lang={lang} />

          {plan.notes && (
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <span className="font-semibold">{t('schedule.notes')}: </span>
              <span className="whitespace-pre-line">{plan.notes}</span>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between flex-wrap gap-3">
            <p className="flex items-start gap-1.5 text-xs text-gray-400 max-w-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
              {t('schedule.estimateNote')}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium px-4 py-2.5 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {downloading ? t('schedule.preparing') : t('schedule.download')}
              </button>
              {onBuy && (
                <button
                  onClick={() => onBuy(shares, 'installments', count)}
                  disabled={tooSmall}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 transition-colors disabled:opacity-50"
                >
                  <Layers className="w-4 h-4" />
                  {t('buy.installments', { amount: formatMoney(per), per: perLabel })}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {!plan.allows_installments && (
        <p className="text-sm text-gray-600 dark:text-gray-300">{t('methods.cashOnly')}</p>
      )}
    </div>
  );
};

/** The schedule table, shared by the property page and the dashboard. */
export const ScheduleTable: React.FC<{
  rows: ReturnType<typeof buildSchedule>;
  lang: string;
  withStatus?: boolean;
  onReceipt?: (row: ReturnType<typeof buildSchedule>[number]) => void;
  maxHeightClass?: string;
}> = ({ rows, lang, withStatus = false, onReceipt, maxHeightClass = 'max-h-72' }) => {
  const { t } = useTranslation('plan');
  let n = 0;
  const statusClass: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    due: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    upcoming: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  };
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className={cn('overflow-auto', maxHeightClass)}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2 text-start font-semibold">{t('schedule.number')}</th>
              <th className="px-3 py-2 text-start font-semibold">{t('schedule.payment')}</th>
              <th className="px-3 py-2 text-start font-semibold">{t('schedule.dueDate')}</th>
              <th className="px-3 py-2 text-end font-semibold">{t('schedule.amount')}</th>
              {withStatus ? (
                <th className="px-3 py-2 text-start font-semibold">{t('schedule.status')}</th>
              ) : (
                <th className="px-3 py-2 text-end font-semibold hidden sm:table-cell">{t('schedule.percent')}</th>
              )}
              <th className="px-3 py-2 text-end font-semibold hidden sm:table-cell">{t('schedule.remaining')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r) => {
              if (r.kind === 'installment') n += 1;
              return (
                <tr key={r.number} className={cn(r.status === 'due' || r.status === 'overdue' ? 'bg-amber-50/50 dark:bg-amber-900/10' : '')}>
                  <td className="px-3 py-2 text-gray-400">{r.number}</td>
                  <td className="px-3 py-2 text-gray-800 dark:text-gray-200">
                    {r.kind === 'down_payment' ? t('schedule.downPayment') : t('schedule.installment', { n })}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatPlanDate(r.dueDate, lang)}</td>
                  <td className="px-3 py-2 text-end font-medium text-gray-900 dark:text-white whitespace-nowrap">{formatMoney(r.amount)}</td>
                  {withStatus ? (
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', statusClass[r.status || 'upcoming'])}>
                          {t(`status.${r.status || 'upcoming'}`)}
                        </span>
                        {r.status === 'paid' && r.paidAt && (
                          <span className="text-[11px] text-gray-400">{t('schedule.paidOn', { date: formatPlanDate(r.paidAt, lang) })}</span>
                        )}
                        {r.status === 'paid' && onReceipt && (
                          <button
                            onClick={() => onReceipt(r)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700"
                          >
                            <Download className="w-3 h-3" />
                            {t('dashboard.receipt')}
                          </button>
                        )}
                      </div>
                    </td>
                  ) : (
                    <td className="px-3 py-2 text-end text-gray-500 dark:text-gray-400 hidden sm:table-cell">{r.percent}%</td>
                  )}
                  <td className="px-3 py-2 text-end text-gray-500 dark:text-gray-400 whitespace-nowrap hidden sm:table-cell">{formatMoney(r.remaining)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/** Price phases — current, past and upcoming share prices with their dates. */
export const PriceTiersCard: React.FC<{ tiers: PriceTier[]; className?: string }> = ({ tiers, className = '' }) => {
  const { t, i18n } = useTranslation('plan');
  const lang = i18n.language || 'en';
  if (!tiers?.length) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    <div className={cn('rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8', className)}>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('tiers.title')}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t('tiers.subtitle')}</p>
      <ol className="relative border-s border-gray-200 dark:border-gray-700 ms-2 space-y-5">
        {tiers.map((tier, i) => {
          const end = parseDate(tier.effective_to);
          const past = !tier.is_current && !!end && end < today;
          return (
            <li key={`${tier.label}-${i}`} className="ms-5">
              <span
                className={cn(
                  'absolute -start-[7px] mt-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900',
                  tier.is_current ? 'bg-emerald-500' : past ? 'bg-gray-300 dark:bg-gray-600' : 'bg-blue-500',
                )}
              />
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className={cn('font-semibold', past ? 'text-gray-400' : 'text-gray-900 dark:text-white')}>{tier.label}</span>
                  {tier.is_current && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {t('tiers.current')}
                    </span>
                  )}
                  {tier.is_upcoming && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {t('tiers.next')}
                    </span>
                  )}
                  {past && <span className="text-[11px] text-gray-400">{t('tiers.past')}</span>}
                </div>
                <div className={cn('font-bold', past ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white')}>
                  {formatMoney(tier.price_per_token, 2)} <span className="text-xs font-normal text-gray-500">{t('tiers.perShare')}</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t('tiers.from', { date: formatPlanDate(tier.effective_from, lang) })}
                {tier.effective_to ? ` ${t('tiers.until', { date: formatPlanDate(tier.effective_to, lang) })}` : ''}
                {tier.notes ? ` · ${tier.notes}` : ''}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default PaymentPlanSection;
