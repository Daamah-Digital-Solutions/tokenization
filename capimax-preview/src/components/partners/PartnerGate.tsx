import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Clock, LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from '../../utils/router';
import { rememberReturn } from '../../utils/returnTo';
import { PARTNER_APPLY, PartnerKind, isOpenApplication } from '../../services/partners/PartnerService';
import { formatDate, useOpenPartnerDashboard, usePartnerStatus } from './usePartnerStatus';

interface PartnerGateProps {
  kind: PartnerKind;
  children: React.ReactNode;
  /** Draw the sign-in / status cards in a white panel (pages with a coloured background). */
  framed?: boolean;
}

const FrameContext = React.createContext(false);

const Card: React.FC<{ icon: React.ReactNode; title: string; text: string; children?: React.ReactNode }> = ({
  icon, title, text, children,
}) => (
  <div className={`text-center py-10 px-6 ${React.useContext(FrameContext)
    ? 'max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-xl' : ''}`}>
    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
    <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6">{text}</p>
    {children && <div className="flex flex-wrap gap-3 justify-center">{children}</div>}
  </div>
);

const primary = 'px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold';
const secondary = 'px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold';

/**
 * Stands in front of a partner application form (client round 4 follow-up):
 * signed out -> sign in / register, then come back here; already a partner ->
 * open the dashboard; application under review -> its status; otherwise the
 * form (with the reason when the previous application was not approved).
 */
export const PartnerGate: React.FC<PartnerGateProps> = ({ kind, children, framed = false }) => (
  <FrameContext.Provider value={framed}>
    <GateBody kind={kind}>{children}</GateBody>
  </FrameContext.Provider>
);

const GateBody: React.FC<PartnerGateProps> = ({ kind, children }) => {
  const { t, i18n } = useTranslation('partners');
  const { state } = useAuth();
  const { navigate } = useRouter();
  const { data, isLoading } = usePartnerStatus(kind);
  const openDashboard = useOpenPartnerDashboard();
  const role = t(`join.roleName.${kind}`);

  if (state.isLoading || (state.user && isLoading)) {
    return (
      <div className="py-16 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!state.user) {
    const go = (route: 'login' | 'register') => {
      rememberReturn(PARTNER_APPLY[kind].route, PARTNER_APPLY[kind].params);
      navigate(route);
    };
    return (
      <Card icon={<LogIn className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />}
            title={t('join.gate.signInTitle')} text={t('join.gate.signInText', { role })}>
        <button type="button" onClick={() => go('login')} className={primary}>{t('join.gate.signIn')}</button>
        <button type="button" onClick={() => go('register')} className={secondary}>{t('join.gate.createAccount')}</button>
      </Card>
    );
  }

  if (data?.has_role) {
    return (
      <Card icon={<CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />}
            title={t('join.gate.partnerTitle', { role })} text={t('join.gate.partnerText')}>
        <button type="button" onClick={() => openDashboard(kind)} className={primary}>{t('join.gate.openDashboard')}</button>
      </Card>
    );
  }

  const app = data?.application;
  if (app && isOpenApplication(app.status)) {
    return (
      <Card icon={<Clock className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />}
            title={t('join.gate.pendingTitle')}
            text={t('join.gate.pendingText', { role, date: formatDate(app.submitted_at, i18n.language) })}>
        <button type="button" onClick={() => navigate('dashboard', { view: 'become-partner' })} className={secondary}>
          {t('join.gate.back')}
        </button>
      </Card>
    );
  }

  return (
    <>
      {app?.status === 'rejected' && (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-amber-900 dark:text-amber-100">
            <p className="font-semibold">{t('join.gate.rejectedTitle')}</p>
            {app.rejection_reason && <p className="mt-1">{t('join.card.reason', { reason: app.rejection_reason })}</p>}
            <p className="mt-1">{t('join.gate.rejectedText')}</p>
          </div>
        </div>
      )}
      {children}
    </>
  );
};

export default PartnerGate;
