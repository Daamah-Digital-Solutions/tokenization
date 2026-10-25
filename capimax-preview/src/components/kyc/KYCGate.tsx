import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Shield, Clock, XCircle, FileText, Camera, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from '../../utils/router';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface KYCGateProps {
  action: string; // e.g. "deposit funds", "own property"
  onProceed?: () => void; // Called when user can proceed (KYC approved)
  children?: React.ReactNode; // Content to show when KYC is approved
}

// Callers pass an English phrase; map the known ones to translated text.
const ACTION_KEYS: Record<string, string> = {
  'deposit funds': 'deposit',
  'own property': 'own',
  'withdraw funds': 'withdraw',
};

export const KYCGate: React.FC<KYCGateProps> = ({ action, onProceed, children }) => {
  const { t } = useTranslation('kyc');
  const { state } = useAuth();
  const { navigate } = useRouter();
  const user = state.user;

  // If not authenticated, redirect to login
  if (!user) {
    navigate('login');
    return null;
  }

  // The backend sends not_verified / pending_review / approved / rejected
  // (accounts.User.kyc_status), which the shared KYCStatus type doesn't model.
  const kycStatus = String(user.kyc_status || 'not_verified');

  // If user is KYC approved, render children or call onProceed
  if (kycStatus === 'approved') {
    if (children) return <>{children}</>;
    onProceed?.();
    return null;
  }

  const actionText = ACTION_KEYS[action] ? t(`gate.actions.${ACTION_KEYS[action]}`) : action;

  const renderGate = () => {
    if (kycStatus === 'pending_review') {
      return (
        <Card className="max-w-md mx-auto p-8">
          <div className="text-center space-y-5">
            <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{t('gate.pendingTitle')}</h3>
              <p className="text-slate-600 dark:text-slate-400">{t('gate.pendingDesc', { action: actionText })}</p>
            </div>
            <div className="space-y-3">
              <Button onClick={() => navigate('kyc')} variant="outline" className="w-full">
                {t('gate.viewStatus')}
              </Button>
              <Button variant="ghost" onClick={() => navigate('dashboard')} className="w-full">
                {t('page.backToDashboard')}
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    if (kycStatus === 'rejected') {
      return (
        <Card className="max-w-md mx-auto p-8">
          <div className="text-center space-y-5">
            <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{t('gate.rejectedTitle')}</h3>
              <p className="text-slate-600 dark:text-slate-400">{t('gate.rejectedDesc', { action: actionText })}</p>
            </div>
            <div className="space-y-3">
              <Button onClick={() => navigate('kyc')} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {t('gate.fixNow')}
              </Button>
              <Button variant="ghost" onClick={() => navigate('dashboard')} className="w-full">
                {t('page.backToDashboard')}
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    // not_verified / not_started / anything else → start (or continue) verification
    return (
      <Card className="max-w-md mx-auto p-8">
        <div className="text-center space-y-5">
          <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{t('gate.title')}</h3>
            <p className="text-slate-600 dark:text-slate-400">{t('gate.desc', { action: actionText })}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-start">
            <p className="font-medium text-slate-900 dark:text-white mb-2 text-sm">{t('banner.stepsLabel')}</p>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1.5">
              <li className="flex items-center gap-2"><User className="w-4 h-4 text-emerald-500" />{t('banner.step1')}</li>
              <li className="flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-500" />{t('banner.step2')}</li>
              <li className="flex items-center gap-2"><Camera className="w-4 h-4 text-emerald-500" />{t('banner.step3')}</li>
            </ul>
          </div>
          <div className="space-y-3">
            <Button onClick={() => navigate('kyc')} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {t('gate.start')}
            </Button>
            <Button variant="ghost" onClick={() => navigate('dashboard')} className="w-full">
              {t('page.backToDashboard')}
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-[71] w-full"
      >
        {renderGate()}
      </motion.div>
    </div>
  );
};

export default KYCGate;
