import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Clock, AlertTriangle, XCircle, ChevronRight, ChevronLeft, User, FileText, Camera } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from '../../utils/router';
import { cn } from '../../utils/cn';
import { KYCService, deriveKYCUiState, type KYCUiState } from '../../services/user/KYCService';

/**
 * Always-visible KYC call-to-action on the dashboard (client round 3, item 3:
 * "show the KYC section somewhere clear, say the user must complete it, and
 * list the steps"). Hidden once the user is verified.
 */

const STYLE: Partial<Record<KYCUiState, { icon: React.ComponentType<any>; box: string; iconTone: string }>> = {
  not_started: { icon: ShieldAlert, box: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20', iconTone: 'text-amber-600' },
  pending: { icon: ShieldAlert, box: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20', iconTone: 'text-amber-600' },
  expired: { icon: ShieldAlert, box: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20', iconTone: 'text-amber-600' },
  action_required: { icon: AlertTriangle, box: 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20', iconTone: 'text-orange-600' },
  in_review: { icon: Clock, box: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20', iconTone: 'text-blue-600' },
  rejected: { icon: XCircle, box: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20', iconTone: 'text-red-600' },
};

export const KYCReminderBanner: React.FC<{ className?: string }> = ({ className }) => {
  const { t, i18n } = useTranslation('kyc');
  const { state } = useAuth();
  const { navigate } = useRouter();
  const user = state.user;
  const verified = user?.kyc_status === 'approved';
  const [uiState, setUiState] = useState<KYCUiState | null>(null);

  useEffect(() => {
    if (!user || verified) return;
    let alive = true;
    KYCService.getStatus()
      .then((payload) => alive && setUiState(deriveKYCUiState(payload)))
      .catch(() => alive && setUiState('not_started'));
    return () => {
      alive = false;
    };
  }, [user, verified]);

  if (!user || verified || !uiState || uiState === 'approved') return null;

  const bannerKey = uiState === 'expired' ? 'not_started' : uiState;
  const style = STYLE[uiState] || STYLE.not_started!;
  const Icon = style.icon;
  const Arrow = (i18n.language || 'en').startsWith('ar') ? ChevronLeft : ChevronRight;
  const cta =
    uiState === 'in_review'
      ? t('banner.ctaView')
      : uiState === 'action_required' || uiState === 'rejected'
        ? t('banner.ctaFix')
        : uiState === 'pending'
          ? t('banner.ctaContinue')
          : t('banner.ctaStart');
  const showSteps = uiState === 'not_started' || uiState === 'pending' || uiState === 'expired';

  return (
    <section
      aria-label={t('page.title')}
      className={cn('rounded-2xl border p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-4', style.box, className)}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Icon className={cn('w-7 h-7 shrink-0', style.iconTone)} />
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900 dark:text-white">{t(`banner.${bannerKey}.title`)}</h2>
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{t(`banner.${bannerKey}.desc`)}</p>
          {showSteps && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-medium">{t('banner.stepsLabel')}</span>
              {[
                { icon: User, text: t('banner.step1') },
                { icon: FileText, text: t('banner.step2') },
                { icon: Camera, text: t('banner.step3') },
              ].map(({ icon: StepIcon, text }, i) => (
                <span key={text} className="inline-flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-white/80 dark:bg-slate-800 text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <StepIcon className="w-3.5 h-3.5" />
                  {text}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => navigate('kyc')}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 text-sm transition-colors shrink-0"
      >
        {cta}
        <Arrow className="w-4 h-4" />
      </button>
    </section>
  );
};

export default KYCReminderBanner;
