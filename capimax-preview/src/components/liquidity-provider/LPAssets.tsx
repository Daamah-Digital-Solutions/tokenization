import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, MapPin, Award, Eye, Tag, Loader2, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useRouter } from '../../utils/router';
import { baseLanguage } from '../../utils/locale';
import { CreateListingModal } from '../marketplace/CreateListingModal';
import { LiquidityProviderService, type LPAsset } from '../../services/liquidity-provider/LiquidityProviderService';

/**
 * The liquidity provider's own assets, inside the LP dashboard (client voice
 * notes, Nov 2026): the shares bought from investors, what they cost, what
 * they are worth now, the certificate, and selling them on the secondary
 * market. `compact` = the overview card (top 3 + "View all").
 */
export const LPAssets: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { t, i18n } = useTranslation('partners');
  const { navigate } = useRouter();
  const queryClient = useQueryClient();
  const locale = baseLanguage(i18n.language);
  const money = (v: string | number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(v || 0));
  const num = (v: number) => new Intl.NumberFormat(locale).format(v || 0);
  const [selling, setSelling] = useState<string | null>(null);

  const q = useQuery({ queryKey: ['lp', 'assets'], queryFn: LiquidityProviderService.getAssets, retry: 1 });
  const assets = q.data?.assets || [];
  const positions = q.data?.positions || [];
  const totals = q.data?.totals;
  const shown = compact ? assets.slice(0, 3) : assets;
  const gainUp = Number(totals?.gain || 0) >= 0;

  const tiles = totals ? [
    [t('lp.assets.properties'), num(totals.properties)],
    [t('lp.assets.shares'), num(totals.shares)],
    [t('lp.assets.cost'), money(totals.cost)],
    [t('lp.assets.value'), money(totals.value)],
    [t('lp.assets.gain'), `${gainUp ? '+' : ''}${money(totals.gain)} (${gainUp ? '+' : ''}${Number(totals.gain_pct).toFixed(2)}%)`],
  ] : [];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
      <div className="p-5 border-b border-neutral-200 dark:border-slate-700 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">{t('lp.assets.title')}</h3>
          <p className="text-sm text-neutral-500 dark:text-slate-400">{t('lp.assets.desc')}</p>
        </div>
        {compact && assets.length > 0 && (
          <button
            type="button"
            onClick={() => navigate('dashboard', { view: 'lp-assets' })}
            className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 dark:text-cyan-300 hover:underline"
          >
            {t('lp.assets.viewAll')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        )}
      </div>

      {q.isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin mx-auto my-10 text-neutral-400" />
      ) : assets.length === 0 && positions.length === 0 ? (
        <div className="py-10 px-5 text-center">
          <Building2 className="w-8 h-8 mx-auto text-neutral-300" />
          <p className="mt-3 text-sm text-neutral-500 dark:text-slate-400">{t('lp.assets.empty')}</p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {tiles.map(([label, value], i) => (
              <div key={label} className="p-3 rounded-lg bg-neutral-50 dark:bg-slate-900/50">
                <p className="text-xs text-neutral-500 dark:text-slate-400">{label}</p>
                <p className={cn('mt-1 font-semibold text-neutral-900 dark:text-slate-100',
                  i === 4 && (gainUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'))}>
                  {value}
                </p>
              </div>
            ))}
          </div>
          {assets.length > 0 && <div className="space-y-3">
            {shown.map((a) => (
              <AssetRow
                key={a.property_id}
                asset={a}
                money={money}
                num={num}
                onView={() => navigate('property-detail' as any, { id: a.property_id })}
                onCertificate={() => navigate('dashboard', { view: 'certificates' })}
                onSell={() => setSelling(a.property_id)}
              />
            ))}
          </div>}
          {positions.length > 0 && (
            <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h4 className="font-semibold text-neutral-900 dark:text-slate-100">{t('lp.assets.positionsTitle')}</h4>
                <button type="button" onClick={() => navigate('dashboard', { view: 'installments' })}
                  className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:underline">
                  {t('lp.assets.openInstallments')}
                </button>
              </div>
              <p className="text-xs text-neutral-500 dark:text-slate-400 mb-3">{t('lp.assets.positionsDesc')}</p>
              <ul className="divide-y divide-neutral-100 dark:divide-slate-700">
                {positions.map((p) => (
                  <li key={p.plan} className="py-2 flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                    <span className="flex-1 min-w-0 font-medium text-neutral-900 dark:text-slate-100 truncate">
                      {p.title} · {t('plan:positions.sharesCount', { count: p.shares })}
                      {p.listed && <span className="ms-2 text-xs text-amber-700 dark:text-amber-300">{t('lp.assets.positionListed')}</span>}
                    </span>
                    <span className="text-neutral-600 dark:text-slate-300">
                      {t('lp.assets.positionLine', { value: money(p.value), left: money(p.remaining_principal), count: p.remaining_payments })}
                    </span>
                    {p.next_payment_date && (
                      <span className="text-xs text-neutral-500">{t('lp.assets.nextDue', { amount: money(p.next_payment_amount), date: new Date(p.next_payment_date).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) })}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <CreateListingModal
        isOpen={selling !== null}
        preselectPropertyId={selling ?? undefined}
        onClose={() => setSelling(null)}
        onSuccess={() => {
          setSelling(null);
          queryClient.invalidateQueries({ queryKey: ['lp', 'assets'] });
          queryClient.invalidateQueries({ queryKey: ['my-properties-bookkeeping'] });
          queryClient.invalidateQueries({ queryKey: ['user-investments'] });
        }}
      />
    </div>
  );
};

const AssetRow: React.FC<{
  asset: LPAsset;
  money: (v: string | number) => string;
  num: (v: number) => string;
  onView: () => void;
  onCertificate: () => void;
  onSell: () => void;
}> = ({ asset: a, money, num, onView, onCertificate, onSell }) => {
  const { t } = useTranslation('partners');
  const [imageFailed, setImageFailed] = useState(false);
  const up = Number(a.gain) >= 0;
  const Trend = up ? TrendingUp : TrendingDown;
  return (
    <div className="flex flex-col lg:flex-row gap-4 p-3 rounded-xl border border-neutral-200 dark:border-slate-700">
      <div className="w-full lg:w-40 h-28 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-cyan-600/30 to-slate-900/40 flex items-center justify-center">
        {a.image && !imageFailed ? (
          <img src={a.image} alt="" onError={() => setImageFailed(true)} className="w-full h-full object-cover" />
        ) : (
          <Building2 className="w-10 h-10 text-white/50" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-neutral-900 dark:text-slate-100 truncate">{a.title}</h4>
            <p className="flex items-center gap-1 text-xs text-neutral-500 dark:text-slate-400">
              <MapPin className="w-3 h-3" /> {[a.city, a.country].filter(Boolean).join(', ')}
            </p>
          </div>
          {a.certificate && (
            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
              a.certificate.status === 'final'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300')}>
              <Award className="w-3 h-3" /> {t(`lp.assets.cert.${a.certificate.status}`)}
            </span>
          )}
        </div>
        <dl className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-sm">
          <div>
            <dt className="text-xs text-neutral-500 dark:text-slate-400">{t('lp.assets.shares')}</dt>
            <dd className="font-medium text-neutral-900 dark:text-slate-100">
              {num(a.shares)}{a.total_shares > 0 && <span className="text-xs text-neutral-500"> / {num(a.total_shares)}</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500 dark:text-slate-400">{t('lp.assets.cost')}</dt>
            <dd className="font-medium text-neutral-900 dark:text-slate-100">{money(a.cost)}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500 dark:text-slate-400">{t('lp.assets.valueAt', { price: money(a.share_price) })}</dt>
            <dd className="font-medium text-neutral-900 dark:text-slate-100">{money(a.value)}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500 dark:text-slate-400">{t('lp.assets.gain')}</dt>
            <dd className={cn('font-medium inline-flex items-center gap-1', up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
              <Trend className="w-3.5 h-3.5" /> {up ? '+' : ''}{Number(a.gain_pct).toFixed(2)}%
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-neutral-500 dark:text-slate-400">
          {a.bought_from_investors
            ? t('lp.assets.boughtFrom', { shares: num(a.bought_from_investors.shares), deals: a.bought_from_investors.deals, paid: money(a.bought_from_investors.paid) })
            : null}
          {a.listed_shares > 0 && (
            <span className="ms-2 text-amber-700 dark:text-amber-300">
              {t('lp.assets.listed', { listed: num(a.listed_shares), available: num(a.available_shares) })}
            </span>
          )}
        </p>
      </div>
      <div className="flex lg:flex-col gap-2 lg:w-44 shrink-0">
        <button type="button" onClick={onSell} disabled={a.available_shares <= 0}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
          <Tag className="w-4 h-4" /> {t('lp.assets.sell')}
        </button>
        <button type="button" onClick={onCertificate} disabled={!a.certificate}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 dark:border-slate-700 text-sm font-semibold text-neutral-700 dark:text-slate-200 hover:bg-neutral-50 dark:hover:bg-slate-700/50 disabled:opacity-40">
          <Award className="w-4 h-4" /> {t('lp.assets.certificate')}
        </button>
        <button type="button" onClick={onView}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 dark:border-slate-700 text-sm font-semibold text-neutral-700 dark:text-slate-200 hover:bg-neutral-50 dark:hover:bg-slate-700/50">
          <Eye className="w-4 h-4" /> {t('lp.assets.view')}
        </button>
      </div>
    </div>
  );
};

export default LPAssets;
