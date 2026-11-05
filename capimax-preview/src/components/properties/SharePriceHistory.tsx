/**
 * A property's share price history (client, Nov 2026 — as on Capimax BRX "Unit prices"):
 * launch price, current price, change since launch, a step chart and every change with
 * its phase and note. Data: GET /properties/<id>/prices/ (properties/pricing.price_summary).
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { apiClient } from '../../services/api/ApiClient';
import { formatMoney, formatPlanDate } from '../../utils/paymentPlan';
import { cn } from '../../utils/cn';

export interface PricePoint {
  date: string | null;
  price: string;
  previous_price: string | null;
  label: string;
  note: string;
  change_pct: string | null;
}

export interface PriceSummary {
  launch_price: string;
  current_price: string;
  change_pct: string | null;
  label: string;
  updated_at: string | null;
  changes: number;
  points: PricePoint[];
}

export const fetchPriceSummary = (propertyId: string) =>
  apiClient.get<PriceSummary>(`/properties/${propertyId}/prices/`) as Promise<PriceSummary>;

const pctClass = (pct: number) =>
  pct > 0 ? 'text-emerald-600 dark:text-emerald-400' : pct < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500';

const signed = (pct: number) => `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`;

export const SharePriceHistory: React.FC<{
  propertyId: string;
  avgCost?: number | null;
  compact?: boolean;
  className?: string;
}> = ({ propertyId, avgCost, compact, className }) => {
  const { t, i18n } = useTranslation('plan');
  const lang = i18n.language || 'en';
  const { data } = useQuery({
    queryKey: ['property-prices', propertyId],
    queryFn: () => fetchPriceSummary(propertyId),
    enabled: !!propertyId,
    staleTime: 60_000,
  });
  if (!data) return null;

  const pct = Number(data.change_pct || 0);
  const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  // The step line runs to today
  const series = data.points.filter((p) => p.date).map((p) => ({ t: new Date(p.date as string).getTime(), price: Number(p.price) }));
  if (series.length) series.push({ t: Date.now(), price: Number(data.current_price) });
  const changes = data.points.slice(1).reverse();

  const tiles = [
    { k: t('prices.launch'), v: formatMoney(data.launch_price) },
    { k: t('prices.current'), v: formatMoney(data.current_price) },
    { k: t('prices.sinceLaunch'), v: data.changes ? signed(pct) : '—', cls: data.changes ? pctClass(pct) : '' },
    {
      k: data.label ? t('prices.phase') : t('prices.lastUpdate'),
      v: data.label || (data.updated_at ? formatPlanDate(data.updated_at, lang) : t('prices.noChange')),
    },
  ];

  return (
    <div className={cn('rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8', className)}>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Icon className={cn('w-5 h-5', data.changes ? pctClass(pct) : 'text-gray-400')} />
            {t('prices.title')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('prices.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {tiles.map((tile) => (
          <div key={tile.k} className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">{tile.k}</div>
            <div className={cn('mt-1 font-semibold text-gray-900 dark:text-white', tile.cls)}>
              <bdi dir="ltr">{tile.v}</bdi>
            </div>
          </div>
        ))}
      </div>

      {data.changes > 0 && series.length > 1 && (
        <div className="h-56 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
              <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']}
                     tickFormatter={(v) => formatPlanDate(new Date(v), lang)} tick={{ fontSize: 11 }} minTickGap={40} />
              <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} width={56} domain={['auto', 'auto']} />
              <Tooltip
                labelFormatter={(v) => formatPlanDate(new Date(Number(v)), lang)}
                formatter={(v: number) => [formatMoney(v), t('prices.sharePrice')]}
              />
              {avgCost ? (
                <ReferenceLine y={avgCost} stroke="#6366f1" strokeDasharray="5 4"
                               label={{ value: t('prices.yourAvgCost'), position: 'insideTopLeft', fontSize: 11, fill: '#6366f1' }} />
              ) : null}
              <Line type="stepAfter" dataKey="price" stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {!compact && changes.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 text-start font-medium">{t('prices.date')}</th>
                <th className="py-2 text-start font-medium">{t('prices.price')}</th>
                <th className="py-2 text-start font-medium">{t('prices.change')}</th>
                <th className="py-2 text-start font-medium">{t('prices.phaseNote')}</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((p, i) => {
                const c = Number(p.change_pct || 0);
                return (
                  <tr key={`${p.date}-${i}`} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <td className="py-2 whitespace-nowrap">{formatPlanDate(p.date, lang)}</td>
                    <td className="py-2 whitespace-nowrap" dir="ltr">{formatMoney(p.previous_price)} → <b>{formatMoney(p.price)}</b></td>
                    <td className={cn('py-2 whitespace-nowrap font-medium', pctClass(c))} dir="ltr">{p.change_pct ? signed(c) : '—'}</td>
                    <td className="py-2 text-gray-600 dark:text-gray-300">{[p.label, p.note].filter(Boolean).join(' — ') || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data.changes === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">{t('prices.noChangeLong')}</p>}
      <p className="mt-4 text-xs text-gray-400">{t('prices.disclaimer')}</p>
    </div>
  );
};

export default SharePriceHistory;
