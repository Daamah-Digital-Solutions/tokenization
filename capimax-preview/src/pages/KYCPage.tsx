import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Circle,
  Loader2,
  MessageSquare,
  FileText,
  Lock,
  Zap,
  LifeBuoy,
} from 'lucide-react';
import { KYCWizard } from '../components/kyc/KYCWizard';
import { SumsubVerification } from '../components/kyc/SumsubVerification';
import { Button } from '../components/ui/Button';
import { Navbar } from '../components/layout/Navbar';
import { useRouter } from '../utils/router';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';
import {
  KYCService,
  deriveKYCUiState,
  type KYCStatusPayload,
  type KYCUiState,
} from '../services/user/KYCService';

/**
 * Identity verification page (client round 3, items 3–7).
 *
 * It used to render a HARD-CODED "processing" status with mock documents,
 * so "Check status" never reflected the backend and users stayed "stuck in
 * Processing". Everything here now comes from GET /kyc/status/.
 */

const STATE_STYLE: Record<KYCUiState, { icon: React.ComponentType<any>; tone: string; badge: string }> = {
  not_started: { icon: ShieldCheck, tone: 'text-slate-600', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
  pending: { icon: Clock, tone: 'text-amber-600', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  action_required: { icon: AlertTriangle, tone: 'text-orange-600', badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  in_review: { icon: Clock, tone: 'text-blue-600', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  approved: { icon: CheckCircle2, tone: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  rejected: { icon: XCircle, tone: 'text-red-600', badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  expired: { icon: AlertTriangle, tone: 'text-amber-600', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
};

export const KYCPage: React.FC = () => {
  const { t, i18n } = useTranslation('kyc');
  const lang = i18n.language || 'en';
  const isAr = lang.startsWith('ar');
  const { navigate } = useRouter();
  const { refreshUser } = useAuth();

  const [payload, setPayload] = useState<KYCStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const load = useCallback(async (): Promise<KYCStatusPayload | null> => {
    try {
      const data = await KYCService.getStatus();
      setPayload(data);
      setLoadError(false);
      return data;
    } catch {
      setLoadError(true);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmitted = async (fresh: KYCStatusPayload | null) => {
    setJustSubmitted(true);
    if (fresh) setPayload(fresh);
    else await load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Keep the dashboard banner / KYC gates in sync with the new status.
    refreshUser().catch(() => undefined);
  };

  const handleProviderChange = async () => {
    await load();
    refreshUser().catch(() => undefined);
  };

  const fmtDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString(isAr ? 'ar' : 'en', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const fmtMoney = (amount?: string | null) =>
    amount ? new Intl.NumberFormat(isAr ? 'ar' : 'en', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(amount)) : '';

  const uiState = deriveKYCUiState(payload);
  const style = STATE_STYLE[uiState];
  const StateIcon = style.icon;

  const renderStatusCard = () => {
    if (!payload) return null;
    const cs = payload.completion_status;
    const showSteps = ['not_started', 'pending', 'action_required', 'rejected', 'expired'].includes(uiState);
    const showReason = ['action_required', 'rejected'].includes(uiState) && payload.rejection_reason;
    return (
      <section
        aria-labelledby="kyc-status-heading"
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 sm:p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className={cn('w-12 h-12 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 shrink-0', style.tone)}>
            <StateIcon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="kyc-status-heading" className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {t('status.label')}
              </h2>
              <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold', style.badge)}>
                {t(`status.${uiState}`)}
              </span>
            </div>
            <p className="mt-1 text-slate-700 dark:text-slate-300">{t(`status.desc.${uiState}`)}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-slate-500 dark:text-slate-400">
              {payload.submitted_at && <span>{t('status.submittedOn', { date: fmtDate(payload.submitted_at) })}</span>}
              {payload.reviewed_at && <span>{t('status.reviewedOn', { date: fmtDate(payload.reviewed_at) })}</span>}
              {uiState === 'approved' && payload.investment_limit && <span>{t('status.limit', { amount: fmtMoney(payload.investment_limit) })}</span>}
              {uiState === 'approved' && payload.expires_at && <span>{t('status.expiresOn', { date: fmtDate(payload.expires_at) })}</span>}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{t('status.progress', { percent: Math.round(cs.completion_percentage) })}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden" role="progressbar"
            aria-valuenow={Math.round(cs.completion_percentage)} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={cn('h-full rounded-full transition-all', uiState === 'approved' ? 'bg-emerald-500' : 'bg-emerald-400')}
              style={{ width: `${Math.min(100, cs.completion_percentage)}%` }}
            />
          </div>
        </div>

        {showReason && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm font-semibold text-red-800 dark:text-red-200">{t('status.reasonTitle')}</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1 whitespace-pre-line">{payload.rejection_reason}</p>
          </div>
        )}

        {payload.public_notes.length > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {t('status.notesTitle')}
            </p>
            <ul className="mt-2 space-y-2">
              {payload.public_notes.map((n) => (
                <li key={n.created_at} className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="text-xs text-slate-500 me-2">{fmtDate(n.created_at)}</span>
                  {n.note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {showSteps && cs.next_steps.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">{t('steps.title')}</p>
            <ol className="space-y-2">
              {cs.next_steps.map((s) => (
                <li key={s.step} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Circle className={cn('w-4 h-4 mt-0.5 shrink-0', s.step.startsWith('replace_') ? 'text-red-500' : 'text-emerald-500')} />
                  <span>{t(`steps.${s.step}`, { defaultValue: s.title })}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    );
  };

  const renderDocumentsList = () => (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {payload!.documents.map((d) => (
        <li key={d.id} className="flex items-center justify-between gap-3 py-3">
          <span className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
            <FileText className="w-4 h-4 text-slate-400" />
            {t(`docTypes.${d.document_type}`)}
          </span>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{t(`docStatus.${d.status}`)}</span>
        </li>
      ))}
    </ul>
  );

  const renderBody = () => {
    if (!payload) return null;
    if (uiState === 'approved') {
      return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-emerald-200 dark:border-emerald-900 p-8 text-center">
          <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500" />
          <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{t('approved.title')}</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">{t('approved.desc')}</p>
          <Button variant="primary" className="mt-6" onClick={() => navigate('dashboard')}>
            {t('page.backToDashboard')}
          </Button>
        </div>
      );
    }
    if (uiState === 'in_review') {
      return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
          <div className="text-center">
            {justSubmitted ? (
              <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500" />
            ) : (
              <Clock className="w-14 h-14 mx-auto text-blue-500" />
            )}
            <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
              {justSubmitted ? t('wizard.complete.title') : t('inReview.title')}
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              {justSubmitted ? t('wizard.complete.desc') : t('inReview.desc')}
            </p>
          </div>
          <ul className="mt-6 space-y-2 max-w-md mx-auto">
            {[t('wizard.complete.next1'), t('wizard.complete.next2'), t('wizard.complete.next3')].map((line) => (
              <li key={line} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                {line}
              </li>
            ))}
          </ul>
          {payload.documents.length > 0 && (
            <div className="mt-6 max-w-md mx-auto">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t('inReview.documentsTitle')}</p>
              {renderDocumentsList()}
            </div>
          )}
          <div className="mt-6 text-center">
            <Button variant="primary" onClick={() => navigate('dashboard')}>
              {t('wizard.complete.toDashboard')}
            </Button>
          </div>
        </div>
      );
    }
    if (payload.provider === 'sumsub') {
      return <SumsubVerification onStatusChange={handleProviderChange} />;
    }
    return <KYCWizard status={payload} onRefresh={load} onSubmitted={handleSubmitted} />;
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pt-24 pb-12 px-4"
    >
      <Navbar />
      <div className="max-w-4xl mx-auto space-y-6">
        <nav className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <button onClick={() => navigate('dashboard')} className="hover:text-emerald-600 transition-colors">
            {t('page.breadcrumbDashboard')}
          </button>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-medium">{t('page.title')}</span>
        </nav>

        <header className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">{t('page.title')}</h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">{t('page.subtitle')}</p>
        </header>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-600 dark:text-slate-300">
            <Loader2 className="w-5 h-5 animate-spin" />
            {t('page.loading')}
          </div>
        )}

        {!loading && loadError && !payload && (
          <div role="alert" className="text-center py-16">
            <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
            <p className="mt-3 text-slate-700 dark:text-slate-300">{t('page.loadError')}</p>
            <Button variant="primary" className="mt-4" onClick={() => { setLoading(true); load(); }}>
              {t('page.retry')}
            </Button>
          </div>
        )}

        {!loading && payload && (
          <>
            {renderStatusCard()}
            {renderBody()}
          </>
        )}

        <div className="grid sm:grid-cols-3 gap-4 pt-4">
          {[
            { icon: Lock, title: t('info.secureTitle'), desc: t('info.secureDesc') },
            { icon: Zap, title: t('info.fastTitle'), desc: t('info.fastDesc') },
            { icon: LifeBuoy, title: t('info.supportTitle'), desc: t('info.supportDesc') },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
              <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">{title}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KYCPage;
