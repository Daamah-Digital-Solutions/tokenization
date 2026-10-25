import React, { useState, useEffect } from 'react';
import { useRouter } from '../utils/router';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, XCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/auth/AuthService';
import { useTranslation } from 'react-i18next';

type VerificationState = 'pending' | 'success' | 'error' | 'resending';

export const EmailVerificationPage: React.FC = () => {
  const { navigate } = useRouter();
  const { login } = useAuth();
  const { t } = useTranslation('ui');
  const [verificationState, setVerificationState] = useState<VerificationState>('pending');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  // Get token and email from URL search params
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const email = urlParams.get('email') || t('emailVerify.yourEmail');

  useEffect(() => {
    if (token) {
      handleEmailVerification(token);
    }
  }, [token]);

  const handleEmailVerification = async (verificationToken: string) => {
    try {
      setVerificationState('pending');
      const response = await AuthService.verifyEmail(verificationToken);
      setMessage(response.message || t('emailVerify.verifiedShort'));
      setVerificationState('success');

      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        navigate('login');
      }, 3000);
    } catch (error: any) {
      console.error('Email verification failed:', error);
      setMessage(error.message || t('emailVerify.failedMsg'));
      setVerificationState('error');
    }
  };

  const handleResendVerification = async () => {
    try {
      setIsResending(true);
      // Resend works without a session; it needs the account's email.
      const response = await AuthService.resendEmailVerification(
        new URLSearchParams(window.location.search).get('email') || undefined
      );
      setMessage(response.message || t('emailVerify.resent'));
      setVerificationState('pending');
    } catch (error: any) {
      console.error('Failed to resend verification email:', error);
      setMessage(error.message || t('emailVerify.resendFailed'));
      setVerificationState('error');
    } finally {
      setIsResending(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const renderContent = () => {
    switch (verificationState) {
      case 'pending':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6 p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl"
          >
            <div className="w-20 h-20 mx-auto bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Mail className="w-10 h-10 text-blue-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {token ? t('emailVerify.verifying') : t('recovery.checkEmail')}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {token
                  ? t('emailVerify.pleaseWait')
                  : t('emailVerify.sentLink', { email })
                }
              </p>
            </div>
            {token && (
              <div className="flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            )}
            {!token && (
              <div className="space-y-4">
                <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
                  <p>• {t('emailVerify.tipSpam')}</p>
                  <p>• {t('emailVerify.tipExpire')}</p>
                  <p>• {t('emailVerify.tipMust')}</p>
                </div>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleResendVerification}
                    isLoading={isResending}
                    disabled={isResending}
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 me-2" />
                    {t('emailVerify.resend')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={handleGoToLogin}
                    className="w-full"
                  >
                    <ArrowLeft className="w-4 h-4 me-2 rtl:rotate-180" />
                    {t('emailVerify.backToLogin')}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        );

      case 'success':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6 p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl"
          >
            <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {t('emailVerify.successTitle')}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {message || t('emailVerify.successMsg')}
              </p>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {t('emailVerify.redirecting')}
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={handleGoToLogin}
                className="w-full"
              >
                {t('emailVerify.continueLogin')}
              </Button>
            </div>
          </motion.div>
        );

      case 'error':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6 p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl"
          >
            <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {t('emailVerify.failedTitle')}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {message || t('emailVerify.invalidLink')}
              </p>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
                <p>• {t('emailVerify.tipExpireAfter')}</p>
                <p>• {t('emailVerify.tipComplete')}</p>
                <p>• {t('emailVerify.tipRequest')}</p>
              </div>
              <div className="space-y-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleResendVerification}
                  isLoading={isResending}
                  disabled={isResending}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 me-2" />
                  {t('emailVerify.sendNew')}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleGoToLogin}
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 me-2 rtl:rotate-180" />
                  {t('emailVerify.backToLogin')}
                </Button>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <AuthLayout
      title={t('emailVerify.layoutTitle')}
      subtitle={t('emailVerify.layoutSubtitle')}
    >
      {renderContent()}
    </AuthLayout>
  );
};