import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Input } from '../components/design-system/forms/Input';
import { Button } from '../components/ui/Button';
import { useRouter } from '../utils/router';
import { AuthService } from '../services/auth/AuthService';
import { useTranslation } from 'react-i18next';

interface PasswordResetPageProps {}

export const PasswordResetPage: React.FC<PasswordResetPageProps> = () => {
  const { navigate } = useRouter();
  const { t } = useTranslation('ui');
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  // Extract token from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');

    if (resetToken) {
      setToken(resetToken);
      setTokenValid(true);
    } else {
      setError(t('newPassword.missingToken'));
      setTokenValid(false);
    }
  }, []);

  const validatePasswords = (): boolean => {
    const errors: Record<string, string> = {};

    if (!password) {
      errors.password = t('newPassword.required');
    } else if (password.length < 8) {
      errors.password = t('validation.passwordMin8');
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.password = t('validation.passwordComplexity');
    }

    if (!confirmPassword) {
      errors.confirmPassword = t('validation.confirmRequired');
    } else if (password !== confirmPassword) {
      errors.confirmPassword = t('validation.passwordMismatch');
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePasswords() || !token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await AuthService.resetPassword({
        token,
        password,
        confirmPassword
      });

      setSuccess(true);
      console.log('✅ Password reset successful');
    } catch (error: any) {
      console.error('❌ Password reset failed:', error);
      const errorMessage = error?.message || t('newPassword.failed');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('login');
  };

  // Show loading state while checking token
  if (tokenValid === null) {
    return (
      <AuthLayout
        title={t('passwordResetPage.layoutTitle')}
        subtitle={t('newPassword.layoutSubtitle')}
      >
        <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
            <p className="text-slate-600 dark:text-slate-300">{t('newPassword.validating')}</p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Show error if token is invalid
  if (tokenValid === false) {
    return (
      <AuthLayout
        title={t('passwordResetPage.layoutTitle')}
        subtitle={t('newPassword.layoutSubtitle')}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 space-y-6"
        >
          {/* Error Message */}
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
            <span className="text-sm text-red-600 dark:text-red-400">
              {error}
            </span>
          </div>

          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t('newPassword.invalidTitle')}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {t('newPassword.invalidMsg')}
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleBackToLogin}
          >
            {t('recovery.backToSignIn')}
          </Button>
        </motion.div>
      </AuthLayout>
    );
  }

  // Show success screen
  if (success) {
    return (
      <AuthLayout
        title={t('passwordResetPage.successLayoutTitle')}
        subtitle={t('newPassword.successLayoutSubtitle')}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 space-y-6 text-center"
        >
          <div className="space-y-4">
            <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
              <Check className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t('passwordResetPage.successTitle')}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {t('newPassword.successMsg')}
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleBackToLogin}
          >
            {t('newPassword.continueSignIn')}
          </Button>
        </motion.div>
      </AuthLayout>
    );
  }

  // Show password reset form
  return (
    <AuthLayout
      title={t('passwordResetPage.formLayoutTitle')}
      subtitle={t('newPassword.formLayoutSubtitle')}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 space-y-6"
      >
        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
          >
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
            <span className="text-sm text-red-600 dark:text-red-400">
              {error}
            </span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t('newPassword.formTitle')}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {t('newPassword.formSubtitle')}
            </p>
          </div>

          <div className="space-y-5">
            <Input
              type="password"
              label={t('newPassword.newLabel')}
              placeholder={t('newPassword.newPlaceholder')}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (validationErrors.password) {
                  setValidationErrors(prev => {
                    const { password, ...rest } = prev;
                    return rest;
                  });
                }
              }}
              leftIcon={<Lock className="w-5 h-5" />}
              showPasswordToggle
              errorMessage={validationErrors.password}
              helperText={t('register.passwordHelper')}
              size="lg"
              required
            />

            <Input
              type="password"
              label={t('newPassword.confirmLabel')}
              placeholder={t('newPassword.confirmPlaceholder')}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (validationErrors.confirmPassword) {
                  setValidationErrors(prev => {
                    const { confirmPassword, ...rest } = prev;
                    return rest;
                  });
                }
              }}
              leftIcon={<Lock className="w-5 h-5" />}
              showPasswordToggle
              errorMessage={validationErrors.confirmPassword}
              size="lg"
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={loading}
            disabled={loading}
          >
            {loading ? t('passwordResetPage.resetting') : t('passwordResetPage.reset')}
          </Button>
        </form>

        {/* Back to Login Link */}
        <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleBackToLogin}
            className="inline-flex items-center gap-2 text-sm text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {t('recovery.backToSignIn')}
          </button>
        </div>
      </motion.div>
    </AuthLayout>
  );
};