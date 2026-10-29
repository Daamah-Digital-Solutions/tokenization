import React from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase, Landmark } from 'lucide-react';
import { useRouter } from '../../utils/router';
import {
  PARTNER_APPLY, PARTNER_INFO_ROUTE, PartnerKind, isOpenApplication,
} from '../../services/partners/PartnerService';
import { formatDate, useOpenPartnerDashboard, usePartnerStatus } from './usePartnerStatus';

const TONES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  under_review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  incomplete: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  none: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
};

const PartnerCard: React.FC<{ kind: PartnerKind }> = ({ kind }) => {
  const { t, i18n } = useTranslation('partners');
  const { navigate } = useRouter();
  const { data, isLoading, isError } = usePartnerStatus(kind);
  const openDashboard = useOpenPartnerDashboard();

  const app = data?.application;
  const status = data?.has_role ? 'active' : app?.status || 'none';
  const Icon = kind === 'broker' ? Briefcase : Landmark;
  const apply = () => navigate(PARTNER_APPLY[kind].route as any, PARTNER_APPLY[kind].params);

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 shrink-0 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <Icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t(kind === 'broker' ? 'join.card.brokerTitle' : 'join.card.lpTitle')}
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t(kind === 'broker' ? 'join.card.brokerText' : 'join.card.lpText')}
          </p>
        </div>
      </div>

      <div className="mt-5 min-h-[3.5rem]">
        {isLoading ? (
          <div className="h-6 w-40 rounded bg-slate-100 dark:bg-slate-700 animate-pulse" />
        ) : isError ? (
          <p className="text-sm text-red-600 dark:text-red-400">{t('join.panel.loadFailed')}</p>
        ) : (
          <>
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${TONES[status] || TONES.none}`}>
              {t(`join.card.status.${status}`, { defaultValue: status })}
            </span>
            {app && !data?.has_role && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {t('join.card.submittedOn', { date: formatDate(app.submitted_at, i18n.language) })}
              </p>
            )}
            {!data?.has_role && app?.status === 'rejected' && app.rejection_reason && (
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                {t('join.card.reason', { reason: app.rejection_reason })}
              </p>
            )}
            {!data?.has_role && app && isOpenApplication(app.status) && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {t(app.status === 'incomplete' ? 'join.card.incompleteNote' : 'join.card.reviewNote')}
              </p>
            )}
          </>
        )}
      </div>

      <div className="mt-auto pt-5 flex flex-wrap gap-3">
        {data?.has_role ? (
          <button type="button" onClick={() => openDashboard(kind)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
            {t(kind === 'broker' ? 'join.card.openBroker' : 'join.card.openLp')}
          </button>
        ) : !isLoading && !isError && !(app && isOpenApplication(app.status)) ? (
          <button type="button" onClick={apply}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
            {t(app?.status === 'rejected' ? 'join.card.applyAgain' : 'join.card.apply')}
          </button>
        ) : null}
        <button type="button" onClick={() => navigate(PARTNER_INFO_ROUTE[kind] as any)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold">
          {t('join.card.learnMore')}
        </button>
      </div>
    </div>
  );
};

/**
 * Dashboard section "Become a partner" (client round 4 follow-up): how to
 * apply as a broker or a liquidity provider from this account, where each
 * application stands, and the way into the partner dashboard once approved.
 */
export const BecomePartnerPanel: React.FC = () => {
  const { t } = useTranslation('partners');
  const steps = ['join.panel.step1', 'join.panel.step2', 'join.panel.step3'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('join.panel.title')}</h2>
        <p className="mt-1 text-slate-600 dark:text-slate-400 max-w-3xl">{t('join.panel.subtitle')}</p>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        {steps.map((key, i) => (
          <li key={key} className="flex gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 p-4 text-sm text-slate-700 dark:text-slate-300">
            <span className="w-6 h-6 shrink-0 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <span>{t(key)}</span>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 md:grid-cols-2">
        <PartnerCard kind="broker" />
        <PartnerCard kind="lp" />
      </div>
    </div>
  );
};

export default BecomePartnerPanel;
