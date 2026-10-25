import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Building2, Copy, Check, Link2, BookOpen, Loader2, UserRound } from 'lucide-react';

import { DashboardStats, PerformanceChart, QuickActions } from '../';
import { ReferClientPanel } from './ReferClientPanel';
import type { StatItem, ChartDataPoint, QuickAction } from '../';
import { PayoutsPanel } from '../../wallet/PayoutsPanel';
import { BrokerService } from '../../../services/broker/BrokerService';
import { useRouter } from '../../../utils/router';
import { cn } from '../../../utils/cn';

/**
 * Broker dashboard (client round 3, #8: "brokers must land on their own
 * dashboard with their details, services and transactions").
 *
 * Two problems fixed: (1) the dashboard overview rendered the INVESTOR
 * overview for every role (DashboardPage), and (2) this component read
 * fields the API never returned, so figures showed "--" and the commission
 * rate rendered as 250%. The API now returns one complete payload
 * (broker/views.py _broker_dashboard_details) and every label is translated.
 */

interface BrokerDashboardPayload {
  profile: {
    user_name: string;
    user_email: string;
    company_name: string | null;
    license_number: string;
    license_expiry: string | null;
    verification_status: string;
    commission_rate: string;
    referral_commission_rate: string;
    commission_tier: string;
    experience_years: number;
  };
  conversion_rate: string;
  total_earned: string;
  total_paid: string;
  pending_commission: string;
  this_month_earned: string;
  last_month_earned: string;
  total_referrals: number;
  converted_referrals: number;
  recent_commissions: Array<{
    id: string; amount: string; base_amount: string; status: string;
    property_title: string | null; earned_at: string;
  }>;
  recent_referrals: Array<{
    id: string; name: string; email: string; status: string;
    total_investment: string; commission_earned: string; joined_at: string;
  }>;
  monthly_performance: Array<{ month: string; commission: string; referrals: number }>;
}

const STATUS_STYLE: Record<string, string> = {
  invested: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  inactive: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  disputed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
};

const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700', className)}>
    {children}
  </div>
);

export const BrokerDashboard: React.FC<{ currentView: string }> = ({ currentView }) => {
  const { t, i18n } = useTranslation('partners');
  const isAr = (i18n.language || 'en').startsWith('ar');
  const locale = isAr ? 'ar' : 'en';
  const { navigate } = useRouter();
  const [referralFilter, setReferralFilter] = useState('all');
  const [link, setLink] = useState<string | null>(null);
  const [linkState, setLinkState] = useState<'idle' | 'loading' | 'copied' | 'failed'>('idle');

  const query = useQuery({
    queryKey: ['broker', 'dashboard'],
    queryFn: () => BrokerService.getDashboard() as unknown as Promise<BrokerDashboardPayload>,
    staleTime: 60_000,
  });
  const data = query.data;

  const money = (v: string | number | null | undefined) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(v || 0));
  const num = (v: number | undefined) => new Intl.NumberFormat(locale).format(v || 0);
  const date = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  const monthLabel = (ym: string) =>
    new Date(`${ym}-01T00:00:00`).toLocaleDateString(locale, { month: 'short', year: '2-digit' });

  const generateLink = async () => {
    setLinkState('loading');
    try {
      const res: any = await BrokerService.generateReferralLink();
      const url = res?.referral_url || res?.referral_link || res?.url
        || (res?.referral_code ? `${window.location.origin}/register?ref=${encodeURIComponent(res.referral_code)}` : '');
      if (!url) throw new Error('no link');
      setLink(url);
      await navigator.clipboard?.writeText(url).catch(() => undefined);
      setLinkState('copied');
    } catch {
      setLinkState('failed');
    }
  };

  const commissionSeries: ChartDataPoint[] = useMemo(
    () => (data?.monthly_performance || []).map((m) => ({ date: monthLabel(m.month), value: Number(m.commission || 0) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, locale],
  );
  const referralSeries: ChartDataPoint[] = useMemo(
    () => (data?.monthly_performance || []).map((m) => ({ date: monthLabel(m.month), value: Number(m.referrals || 0) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, locale],
  );

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-neutral-500">
        <Loader2 className="w-5 h-5 animate-spin" /> {t('common.loading')}
      </div>
    );
  }
  if (query.isError || !data) {
    return (
      <Card className="p-6 text-center border-red-200 dark:border-red-800">
        <p className="text-red-700 dark:text-red-300">{t('common.loadError')}</p>
        <button onClick={() => query.refetch()} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
          {t('common.retry')}
        </button>
      </Card>
    );
  }

  const conversion = Number(data.conversion_rate || 0);
  const stats: StatItem[] = [
    {
      id: 'referrals', label: t('broker.stats.totalReferrals'), value: num(data.total_referrals), icon: '🤝',
      change: t('broker.stats.converted', { count: data.converted_referrals }), changeType: 'neutral',
      description: data.total_referrals ? t('broker.stats.conversion', { rate: conversion.toFixed(1) }) : t('broker.stats.noReferrals'),
    },
    {
      id: 'earned', label: t('broker.stats.totalEarned'), value: money(data.total_earned), icon: '💰',
      change: `${t('broker.stats.thisMonth')}: ${money(data.this_month_earned)}`, changeType: 'neutral',
      description: t('broker.stats.lifetime'),
    },
    {
      id: 'pending', label: t('broker.stats.pending'), value: money(data.pending_commission), icon: '⏳',
      changeType: 'neutral', description: t('broker.stats.awaitingPayout'),
    },
    {
      id: 'rate', label: t('broker.fields.commissionRate'), value: `${Number(data.profile.commission_rate || 0)}%`, icon: '📊',
      changeType: 'neutral', description: `${t('broker.fields.referralRate')}: ${Number(data.profile.referral_commission_rate || 0)}%`,
    },
  ];

  const quickActions: QuickAction[] = [
    { id: 'link', label: t('broker.actions.generateLink'), icon: '🔗', description: t('broker.actions.generateLinkDesc'), variant: 'primary', onClick: generateLink },
    { id: 'withdraw', label: t('broker.actions.withdraw'), icon: '💸', description: t('broker.actions.withdrawDesc'), onClick: () => navigate('dashboard', { view: 'wallet' }) },
    { id: 'refer', label: t('broker.actions.refer'), icon: '👤', description: t('broker.actions.referDesc'), onClick: () => navigate('dashboard', { view: 'referrals' }) },
    { id: 'materials', label: t('broker.actions.materials'), icon: '📄', description: t('broker.actions.materialsDesc'), onClick: () => navigate('dashboard', { view: 'marketing-materials' }) },
  ];

  const verification = data.profile.verification_status;
  const profileCard = (
    <Card className="p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <UserRound className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-neutral-500">{t('broker.profileTitle')}</p>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 truncate">{data.profile.user_name}</h2>
        </div>
        <span className={cn('inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold',
          verification === 'verified' ? STATUS_STYLE.paid : STATUS_STYLE.pending)}>
          <BadgeCheck className="w-3.5 h-3.5" />
          {t(`broker.verification.${verification}`, { defaultValue: verification })}
        </span>
      </div>
      <dl className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        {[
          [t('broker.fields.email'), data.profile.user_email],
          [t('broker.fields.company'), data.profile.company_name || '—'],
          [t('broker.fields.license'), data.profile.license_number],
          [t('broker.fields.licenseExpiry'), date(data.profile.license_expiry)],
          [t('broker.fields.commissionRate'), `${Number(data.profile.commission_rate || 0)}%`],
          [t('broker.fields.referralRate'), `${Number(data.profile.referral_commission_rate || 0)}%`],
          [t('broker.fields.tier'), data.profile.commission_tier || '—'],
          [t('broker.fields.experience'), t('broker.fields.years', { count: data.profile.experience_years || 0 })],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-neutral-500 dark:text-slate-400">{label}</dt>
            <dd className="font-medium text-neutral-900 dark:text-slate-100 break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );

  const linkBox = (
    <Card className="p-5">
      <p className="text-sm font-medium text-neutral-800 dark:text-slate-200 flex items-center gap-2">
        <Link2 className="w-4 h-4 text-emerald-600" /> {t('broker.materials.linkLabel')}
      </p>
      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <input
          readOnly dir="ltr" value={link || ''}
          placeholder="https://…"
          className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 dark:border-slate-600 bg-neutral-50 dark:bg-slate-900 text-sm"
        />
        <button
          type="button" onClick={generateLink} disabled={linkState === 'loading'}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60"
        >
          {linkState === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" />
            : linkState === 'copied' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {linkState === 'copied' ? t('broker.materials.copied') : link ? t('broker.materials.copy') : t('broker.materials.generate')}
        </button>
      </div>
      {linkState === 'copied' && <p className="mt-2 text-xs text-emerald-700">{t('broker.actions.linkCopied')}</p>}
      {linkState === 'failed' && <p className="mt-2 text-xs text-red-600">{t('broker.actions.linkFailed')}</p>}
    </Card>
  );

  const referrals = (data.recent_referrals || []).filter((r) => referralFilter === 'all' || r.status === referralFilter);
  const referralTracker = (
    <Card>
      <div className="p-5 border-b border-neutral-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">{t('broker.referrals.title')}</h3>
        <select
          value={referralFilter} onChange={(e) => setReferralFilter(e.target.value)}
          className="text-sm border border-neutral-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700"
        >
          <option value="all">{t('broker.referrals.filterAll')}</option>
          {['active', 'invested', 'pending', 'inactive'].map((s) => (
            <option key={s} value={s}>{t(`broker.referralStatus.${s}`)}</option>
          ))}
        </select>
      </div>
      <div className="p-4">
        {referrals.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500 dark:text-slate-400">{t('broker.referrals.empty')}</p>
        ) : (
          <ul className="space-y-3">
            {referrals.map((r) => (
              <li key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-neutral-50 dark:bg-slate-700/50 rounded-lg">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-neutral-900 dark:text-slate-100 truncate">{r.name || r.email}</span>
                    <span className={cn('px-2 py-0.5 text-xs font-semibold rounded-full', STATUS_STYLE[r.status])}>
                      {t(`broker.referralStatus.${r.status}`, { defaultValue: r.status })}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-slate-400 truncate" dir="ltr">{r.email}</p>
                </div>
                <div className="flex gap-6 text-sm">
                  <div><p className="text-neutral-500">{t('broker.referrals.purchased')}</p><p className="font-semibold">{money(r.total_investment)}</p></div>
                  <div><p className="text-neutral-500">{t('broker.referrals.commission')}</p><p className="font-semibold text-emerald-600">{money(r.commission_earned)}</p></div>
                  <div><p className="text-neutral-500">{t('broker.referrals.joined')}</p><p className="font-medium">{date(r.joined_at)}</p></div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );

  const commissionsTable = (
    <Card>
      <div className="p-5 border-b border-neutral-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">{t('broker.commissions.title')}</h3>
      </div>
      <div className="p-2 sm:p-4 overflow-x-auto">
        {(data.recent_commissions || []).length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500 dark:text-slate-400">{t('broker.commissions.empty')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-neutral-500 border-b border-neutral-200 dark:border-slate-700">
                {['property', 'base', 'amount', 'status', 'date'].map((k) => (
                  <th key={k} className="py-2 px-3 font-medium text-start whitespace-nowrap">{t(`broker.commissions.${k}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recent_commissions.map((c) => (
                <tr key={c.id} className="border-b border-neutral-100 dark:border-slate-700/60">
                  <td className="py-3 px-3">{c.property_title || '—'}</td>
                  <td className="py-3 px-3">{money(c.base_amount)}</td>
                  <td className="py-3 px-3 font-semibold text-emerald-600">{money(c.amount)}</td>
                  <td className="py-3 px-3">
                    <span className={cn('px-2 py-0.5 text-xs font-semibold rounded-full', STATUS_STYLE[c.status])}>
                      {t(`broker.commissionStatus.${c.status}`, { defaultValue: c.status })}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">{date(c.earned_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );

  const breakdown = (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">{t('broker.commissions.breakdown')}</h3>
      <div className="space-y-3">
        {[
          [t('broker.commissions.thisMonth'), data.this_month_earned],
          [t('broker.commissions.lastMonth'), data.last_month_earned],
          [t('broker.commissions.paid'), data.total_paid],
          [t('broker.commissions.pending'), data.pending_commission],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-slate-700/50 rounded-lg">
            <span className="font-medium text-neutral-800 dark:text-slate-200">{label}</span>
            <span className="text-lg font-semibold text-neutral-900 dark:text-slate-100">{money(value)}</span>
          </div>
        ))}
      </div>
    </Card>
  );

  const charts = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PerformanceChart data={commissionSeries} title={t('broker.charts.commission')} type="area" color="#10b981" rawLabels />
      <PerformanceChart data={referralSeries} title={t('broker.charts.referrals')} type="bar" color="#3b82f6" valuePrefix="" rawLabels />
    </div>
  );

  let body: React.ReactNode;
  switch (currentView) {
    case 'referrals':
      body = (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">{t('broker.referrals.manageTitle')}</h2>
            <p className="text-neutral-600 dark:text-slate-400 mt-1">{t('broker.referrals.manageDesc')}</p>
          </Card>
          <DashboardStats stats={stats} />
          <ReferClientPanel />
          {referralTracker}
        </div>
      );
      break;
    case 'commissions':
      body = (
        <div className="space-y-6">
          <DashboardStats stats={stats} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {breakdown}
            <PerformanceChart data={commissionSeries} title={t('broker.charts.commission')} type="area" color="#10b981" rawLabels />
          </div>
          {commissionsTable}
        </div>
      );
      break;
    case 'wallet':
      body = (
        <PayoutsPanel
          title={t('broker.wallet.title')}
          subtitle={t('broker.wallet.subtitle')}
          balanceLabel={t('broker.wallet.balanceLabel')}
          balanceHint={t('broker.wallet.balanceHint')}
        />
      );
      break;
    case 'performance':
      body = <div className="space-y-6"><DashboardStats stats={stats} />{charts}</div>;
      break;
    case 'marketing-materials':
      body = (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100">{t('broker.materials.title')}</h2>
            <p className="text-neutral-600 dark:text-slate-400 mt-1">{t('broker.materials.desc')}</p>
          </Card>
          {linkBox}
          <Card className="p-5">
            <p className="text-sm font-medium text-neutral-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" /> {t('broker.materials.guides')}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {([
                ['broker-guide', t('broker.materials.brokerGuide')],
                ['capimax-rt-guide', t('broker.materials.platformGuide')],
                ['investment-guide', t('broker.materials.ownershipGuide')],
                ['faq', t('broker.materials.faq')],
              ] as const).map(([route, label]) => (
                <button
                  key={route} type="button" onClick={() => navigate(route as any)}
                  className="flex items-center gap-2 p-3 rounded-lg border border-neutral-200 dark:border-slate-700 hover:border-emerald-400 text-start text-sm font-medium"
                >
                  <Building2 className="w-4 h-4 text-emerald-600 shrink-0" /> {label}
                </button>
              ))}
            </div>
          </Card>
          <ReferClientPanel />
        </div>
      );
      break;
    default:
      body = (
        <div className="space-y-6">
          {profileCard}
          <DashboardStats stats={stats} />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">{charts}</div>
            <div className="space-y-4">
              <QuickActions actions={quickActions} columns={2} />
              {link && linkBox}
            </div>
          </div>
          {referralTracker}
          {commissionsTable}
        </div>
      );
  }

  return <div dir={isAr ? 'rtl' : 'ltr'}>{body}</div>;
};

export default BrokerDashboard;
