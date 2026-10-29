import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Clock, AlertTriangle, ShieldAlert, XCircle, Loader2 } from 'lucide-react';
import { useRouter } from '../../utils/router';
import { cn } from '../../utils/cn';
import { KYCService, deriveKYCUiState, type KYCStatusPayload, type KYCUiState } from '../../services/user/KYCService';
import { baseLanguage } from '../../utils/locale';

/**
 * Compact, REAL KYC status for settings pages. Replaces a card that was
 * hard-coded to "Identity Verified · Level 2 · Verified on <today>" for every
 * user, verified or not (client round 3, #3).
 */

const TONE: Record<KYCUiState, { icon: React.ComponentType<any>; box: string; icon_c: string }> = {
  approved: { icon: Check, box: 'bg-emerald-50 dark:bg-emerald-900/20', icon_c: 'text-emerald-600' },
  in_review: { icon: Clock, box: 'bg-blue-50 dark:bg-blue-900/20', icon_c: 'text-blue-600' },
  action_required: { icon: AlertTriangle, box: 'bg-orange-50 dark:bg-orange-900/20', icon_c: 'text-orange-600' },
  rejected: { icon: XCircle, box: 'bg-red-50 dark:bg-red-900/20', icon_c: 'text-red-600' },
  pending: { icon: ShieldAlert, box: 'bg-amber-50 dark:bg-amber-900/20', icon_c: 'text-amber-600' },
  not_started: { icon: ShieldAlert, box: 'bg-amber-50 dark:bg-amber-900/20', icon_c: 'text-amber-600' },
  expired: { icon: ShieldAlert, box: 'bg-amber-50 dark:bg-amber-900/20', icon_c: 'text-amber-600' },
};

export const KYCStatusSummaryCard: React.FC<{ className?: string }> = ({ className }) => {
  const { t, i18n } = useTranslation('kyc');
  const { navigate } = useRouter();
  const [payload, setPayload] = useState<KYCStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    KYCService.getStatus()
      .then((data) => alive && setPayload(data))
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const uiState = deriveKYCUiState(payload);
  const tone = TONE[uiState];
  const Icon = tone.icon;
  const isAr = (i18n.language || 'en').startsWith('ar');
  const fmt = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString(baseLanguage((i18n.language || 'en')), { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="font-semibold text-slate-900 dark:text-white">{t('page.title')}</h3>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('page.loading')}
        </div>
      ) : (
        <>
          <div className={cn('flex items-center gap-3 p-4 rounded-lg', tone.box)}>
            <div className="w-10 h-10 rounded-full bg-white/70 dark:bg-slate-900/40 flex items-center justify-center">
              <Icon className={cn('w-5 h-5', tone.icon_c)} />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">{t(`status.${uiState}`)}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{t(`status.desc.${uiState}`)}</p>
            </div>
          </div>
          {uiState === 'approved' && payload && (
            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
              {payload.reviewed_at && <p>{t('status.reviewedOn', { date: fmt(payload.reviewed_at) })}</p>}
              {payload.expires_at && <p>{t('status.expiresOn', { date: fmt(payload.expires_at) })}</p>}
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate('kyc')}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {uiState === 'approved' || uiState === 'in_review' ? t('banner.ctaView') : t('banner.ctaStart')}
          </button>
        </>
      )}
    </div>
  );
};

export default KYCStatusSummaryCard;
