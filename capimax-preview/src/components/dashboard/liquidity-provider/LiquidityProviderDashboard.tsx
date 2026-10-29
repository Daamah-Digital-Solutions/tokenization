import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Droplets, Clock, CheckCircle2, Layers, Wallet, TrendingUp, Gauge, Inbox,
  Loader2, AlertCircle, X,
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { Button } from '../../ui/Button';
import { PayoutsPanel } from '../../wallet/PayoutsPanel';
import { NotificationsContent } from '../investor/InvestorControlPanel';
import {
  LiquidityProviderService,
  type LPExitRequest,
  type LPProfile,
} from '../../../services/liquidity-provider/LiquidityProviderService';

/**
 * Liquidity-provider dashboard (client round 3, #9). LP accounts used to
 * land on the investor dashboard because there was no LP role or screen.
 * Views: overview · exit requests (make an offer / decline) · transactions ·
 * wallet · provider profile & purchase preferences.
 */

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  under_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  expired: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
};

const useFormat = () => {
  const { i18n } = useTranslation();
  const locale = (i18n.language || 'en').startsWith('ar') ? 'ar' : 'en';
  return {
    money: (v: string | number | null | undefined) =>
      new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
        .format(Number(v || 0)),
    num: (v: number | string | null | undefined) => new Intl.NumberFormat(locale).format(Number(v || 0)),
    date: (iso?: string | null) =>
      iso ? new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) : '—',
  };
};

const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700', className)}>
    {children}
  </div>
);

// --------------------------------------------------------------------------
// Offer / decline dialog
// --------------------------------------------------------------------------
const DecisionDialog: React.FC<{ request: LPExitRequest; onClose: () => void; onDone: (msg: string) => void }> = ({
  request, onClose, onDone,
}) => {
  const { t } = useTranslation('partners');
  const f = useFormat();
  const [price, setPrice] = useState(String(Number(request.requested_price_per_unit)));
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const priceNum = Number(price);
  const requested = Number(request.requested_price_per_unit);
  const discount = requested > 0 && priceNum > 0 ? ((requested - priceNum) / requested) * 100 : 0;

  const act = async (action: 'approve' | 'reject') => {
    setBusy(action);
    setError(null);
    try {
      await LiquidityProviderService.decide(request.id, action, priceNum, notes);
      onDone(action === 'approve' ? t('lp.requests.approved') : t('lp.requests.rejected'));
    } catch {
      setError(t('lp.requests.failed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">{request.property_name}</h3>
            <p className="text-sm text-neutral-500 dark:text-slate-400">{t('lp.requests.investor')}: {request.investor_name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('lp.requests.cancel')} className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-neutral-500">{t('lp.requests.units')}</dt><dd className="font-semibold">{f.num(request.units_requested)}</dd></div>
          <div><dt className="text-neutral-500">{t('lp.requests.requestedPrice')}</dt><dd className="font-semibold">{f.money(request.requested_price_per_unit)}</dd></div>
          <div className="col-span-2"><dt className="text-neutral-500">{t('lp.requests.total')}</dt><dd className="font-semibold">{f.money(request.total_requested_amount)}</dd></div>
        </dl>
        <div className="mt-5 space-y-3">
          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300">
            {t('lp.requests.offerPrice')}
            <input
              type="number" min="0.01" step="0.01" value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            />
          </label>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">{t('lp.requests.offerTotal')}</span>
            <span className="font-semibold">{f.money(priceNum * request.units_requested)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">{t('lp.requests.discount')}</span>
            <span className="font-semibold">{discount.toFixed(2)}%</span>
          </div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300">
            {t('lp.requests.notes')}
            <textarea
              rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder={t('lp.requests.notesPlaceholder')}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-900"
            />
          </label>
          {error && <p role="alert" className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</p>}
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => act('reject')} disabled={!!busy}>
            {busy === 'reject' ? t('lp.requests.submitting') : t('lp.requests.reject')}
          </Button>
          <Button variant="primary" className="flex-1" onClick={() => act('approve')} disabled={!!busy || !(priceNum > 0)}>
            {busy === 'approve' ? t('lp.requests.submitting') : t('lp.requests.approve')}
          </Button>
        </div>
      </div>
    </div>
  );
};

// --------------------------------------------------------------------------
// Requests table
// --------------------------------------------------------------------------
const RequestsTable: React.FC<{ requests: LPExitRequest[]; onReview: (r: LPExitRequest) => void }> = ({ requests, onReview }) => {
  const { t } = useTranslation('partners');
  const f = useFormat();
  if (!requests.length) {
    return <p className="py-10 text-center text-sm text-neutral-500 dark:text-slate-400">{t('lp.requests.empty')}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-start text-neutral-500 dark:text-slate-400 border-b border-neutral-200 dark:border-slate-700">
            {['property', 'investor', 'units', 'requestedPrice', 'total', 'status', 'created'].map((k) => (
              <th key={k} className="py-2 px-3 font-medium text-start whitespace-nowrap">{t(`lp.requests.${k}`)}</th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id} className="border-b border-neutral-100 dark:border-slate-700/60">
              <td className="py-3 px-3 font-medium text-neutral-900 dark:text-slate-100">{r.property_name}</td>
              <td className="py-3 px-3">{r.investor_name}</td>
              <td className="py-3 px-3">{f.num(r.units_requested)}</td>
              <td className="py-3 px-3">{f.money(r.requested_price_per_unit)}</td>
              <td className="py-3 px-3">{f.money(r.total_requested_amount)}</td>
              <td className="py-3 px-3">
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', STATUS_STYLE[r.status])}>
                  {t(`lp.requestStatus.${r.status}`)}
                </span>
              </td>
              <td className="py-3 px-3 whitespace-nowrap">{f.date(r.created_at)}</td>
              <td className="py-3 px-3 text-end">
                {(r.status === 'pending' || r.status === 'under_review') && (
                  <Button size="sm" variant="primary" onClick={() => onReview(r)}>{t('lp.requests.review')}</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --------------------------------------------------------------------------
// Preferences form
// --------------------------------------------------------------------------
const PreferencesForm: React.FC<{ profile: LPProfile }> = ({ profile }) => {
  const { t } = useTranslation('partners');
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    liquidity_available: profile.liquidity_available,
    discount_rate: profile.discount_rate,
    max_per_transaction: profile.max_per_transaction,
    max_per_month: profile.max_per_month,
    target_ready_properties: profile.target_ready_properties,
    target_under_construction: profile.target_under_construction,
    target_property_portfolios: profile.target_property_portfolios,
  });
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');

  useEffect(() => setState('idle'), [form]);

  const save = async () => {
    setState('saving');
    try {
      await LiquidityProviderService.updatePreferences(profile.id, form as any);
      setState('saved');
      queryClient.invalidateQueries({ queryKey: ['lp'] });
    } catch {
      setState('failed');
    }
  };

  const numberField = (key: 'liquidity_available' | 'discount_rate' | 'max_per_transaction' | 'max_per_month', label: string) => (
    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300">
      {label}
      <input
        type="number" min="0" step="0.01" value={form[key]}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-900"
      />
    </label>
  );
  const check = (key: 'target_ready_properties' | 'target_under_construction' | 'target_property_portfolios', label: string) => (
    <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-slate-300">
      <input type="checkbox" checked={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))} className="rounded" />
      {label}
    </label>
  );

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">{t('lp.settings.title')}</h3>
      <p className="text-sm text-neutral-500 dark:text-slate-400 mb-4">{t('lp.settings.desc')}</p>
      <div className="grid sm:grid-cols-2 gap-4">
        {numberField('liquidity_available', t('lp.fields.liquidity'))}
        {numberField('discount_rate', t('lp.fields.discount'))}
        {numberField('max_per_transaction', t('lp.fields.maxTx'))}
        {numberField('max_per_month', t('lp.fields.maxMonth'))}
      </div>
      <p className="mt-4 mb-2 text-sm font-medium text-neutral-700 dark:text-slate-300">{t('lp.fields.targets')}</p>
      <div className="flex flex-wrap gap-4">
        {check('target_ready_properties', t('lp.fields.ready'))}
        {check('target_under_construction', t('lp.fields.construction'))}
        {check('target_property_portfolios', t('lp.fields.portfolios'))}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <Button variant="primary" onClick={save} disabled={state === 'saving'}>
          {state === 'saving' ? t('lp.settings.saving') : t('lp.settings.save')}
        </Button>
        {state === 'saved' && <span className="text-sm text-emerald-600">{t('lp.settings.saved')}</span>}
        {state === 'failed' && <span className="text-sm text-red-600">{t('lp.settings.failed')}</span>}
      </div>
    </Card>
  );
};

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------
export const LiquidityProviderDashboard: React.FC<{ currentView: string }> = ({ currentView }) => {
  const { t, i18n } = useTranslation('partners');
  const isAr = (i18n.language || 'en').startsWith('ar');
  const f = useFormat();
  const queryClient = useQueryClient();
  const [reviewing, setReviewing] = useState<LPExitRequest | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const profileQ = useQuery({ queryKey: ['lp', 'profile'], queryFn: LiquidityProviderService.getProfile, retry: 1 });
  const statsQ = useQuery({ queryKey: ['lp', 'stats'], queryFn: LiquidityProviderService.getStats, retry: 1 });
  const requestsQ = useQuery({ queryKey: ['lp', 'requests'], queryFn: LiquidityProviderService.getExitRequests, retry: 1 });
  const txQ = useQuery({ queryKey: ['lp', 'transactions'], queryFn: LiquidityProviderService.getTransactions, retry: 1 });

  const pending = useMemo(
    () => (requestsQ.data || []).filter((r) => r.status === 'pending' || r.status === 'under_review'),
    [requestsQ.data],
  );

  if (profileQ.isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-neutral-500">
        <Loader2 className="w-5 h-5 animate-spin" /> {t('common.loading')}
      </div>
    );
  }
  if (profileQ.isError || !profileQ.data) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="w-8 h-8 mx-auto text-amber-500" />
        <p className="mt-3 text-neutral-700 dark:text-slate-300">{t('lp.notLinked')}</p>
        <Button variant="outline" className="mt-4" onClick={() => profileQ.refetch()}>{t('common.retry')}</Button>
      </Card>
    );
  }

  const profile = profileQ.data;
  const stats = statsQ.data;

  const statCards = [
    { icon: Inbox, label: t('lp.stats.total'), value: f.num(stats?.total_exit_requests) },
    { icon: Clock, label: t('lp.stats.pending'), value: f.num(stats?.pending_requests) },
    { icon: CheckCircle2, label: t('lp.stats.completed'), value: f.num(stats?.completed_requests) },
    { icon: Layers, label: t('lp.stats.units'), value: f.num(stats?.total_units_purchased) },
    { icon: Wallet, label: t('lp.stats.spent'), value: f.money(stats?.total_amount_spent) },
    { icon: TrendingUp, label: t('lp.stats.monthVolume'), value: f.money(stats?.current_month_volume) },
    { icon: Gauge, label: t('lp.stats.capacity'), value: f.money(stats?.remaining_monthly_capacity ?? profile.remaining_monthly_capacity) },
  ];

  const profileCard = (
    <Card className="p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
          <Droplets className="w-6 h-6 text-cyan-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-neutral-500">{t('lp.profileTitle')}</p>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 truncate">{profile.legal_entity_name}</h2>
        </div>
        <span className={cn('px-3 py-1 rounded-full text-xs font-semibold',
          profile.status === 'active' ? STATUS_STYLE.approved : STATUS_STYLE.pending)}>
          {t(`lp.status.${profile.status}`)}
        </span>
      </div>
      <dl className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        {[
          [t('lp.fields.registration'), profile.registration_number],
          [t('lp.fields.jurisdiction'), `${profile.jurisdiction}, ${profile.country}`],
          [t('lp.fields.contact'), profile.contact_person_name],
          [t('lp.fields.email'), profile.official_email],
          [t('lp.fields.liquidity'), f.money(profile.liquidity_available)],
          [t('lp.fields.discount'), `${Number(profile.discount_rate)}%`],
          [t('lp.fields.maxTx'), f.money(profile.max_per_transaction)],
          [t('lp.fields.remaining'), f.money(profile.remaining_monthly_capacity)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-neutral-500 dark:text-slate-400">{label}</dt>
            <dd className="font-medium text-neutral-900 dark:text-slate-100 break-words">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );

  const statsGrid = (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      {statCards.map(({ icon: Icon, label, value }) => (
        <Card key={label} className="p-4">
          <Icon className="w-5 h-5 text-cyan-600" />
          <p className="mt-2 text-lg font-semibold text-neutral-900 dark:text-slate-100">{value}</p>
          <p className="text-xs text-neutral-500 dark:text-slate-400">{label}</p>
        </Card>
      ))}
    </div>
  );

  const requestsCard = (rows: LPExitRequest[], title: string) => (
    <Card>
      <div className="p-5 border-b border-neutral-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">{title}</h3>
        <p className="text-sm text-neutral-500 dark:text-slate-400">{t('lp.requests.desc')}</p>
      </div>
      <div className="p-2 sm:p-4">
        {requestsQ.isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto my-8 text-neutral-400" />
          : <RequestsTable requests={rows} onReview={setReviewing} />}
      </div>
    </Card>
  );

  const transactionsCard = (
    <Card>
      <div className="p-5 border-b border-neutral-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">{t('lp.transactions.title')}</h3>
      </div>
      <div className="p-2 sm:p-4 overflow-x-auto">
        {(txQ.data || []).length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-500 dark:text-slate-400">{t('lp.transactions.empty')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-neutral-500 border-b border-neutral-200 dark:border-slate-700">
                {['ref', 'property', 'investor', 'units', 'price', 'total', 'fee', 'date'].map((k) => (
                  <th key={k} className="py-2 px-3 font-medium text-start whitespace-nowrap">{t(`lp.transactions.${k}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(txQ.data || []).map((tx) => (
                <tr key={tx.id} className="border-b border-neutral-100 dark:border-slate-700/60">
                  <td className="py-3 px-3 font-mono text-xs">{tx.reference_number}</td>
                  <td className="py-3 px-3">{tx.property_name}</td>
                  <td className="py-3 px-3">{tx.investor_name}</td>
                  <td className="py-3 px-3">{f.num(tx.units_purchased)}</td>
                  <td className="py-3 px-3">{f.money(tx.price_per_unit)}</td>
                  <td className="py-3 px-3 font-semibold">{f.money(tx.total_amount)}</td>
                  <td className="py-3 px-3">{f.money(tx.platform_fee)}</td>
                  <td className="py-3 px-3 whitespace-nowrap">{f.date(tx.completed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );

  let body: React.ReactNode;
  switch (currentView) {
    case 'requests':
      body = requestsCard(requestsQ.data || [], t('lp.requests.title'));
      break;
    case 'transactions':
      body = transactionsCard;
      break;
    case 'wallet':
      body = <PayoutsPanel title={t('nav.wallet')} />;
      break;
    case 'notifications': // the header bell (client round 4, #13)
      body = <NotificationsContent />;
      break;
    case 'lp-profile':
      body = (
        <div className="space-y-6">
          {profileCard}
          <PreferencesForm profile={profile} />
        </div>
      );
      break;
    default:
      body = (
        <div className="space-y-6">
          {profileCard}
          {statsGrid}
          {requestsCard(pending, t('lp.requests.pendingTitle'))}
          {transactionsCard}
        </div>
      );
  }

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="space-y-6">
      {toast && (
        <div role="status" className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-800 dark:text-emerald-200">
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{toast}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="×"><X className="w-4 h-4" /></button>
        </div>
      )}
      {body}
      {reviewing && (
        <DecisionDialog
          request={reviewing}
          onClose={() => setReviewing(null)}
          onDone={(msg) => {
            setReviewing(null);
            setToast(msg);
            queryClient.invalidateQueries({ queryKey: ['lp'] });
          }}
        />
      )}
    </div>
  );
};

export default LiquidityProviderDashboard;
