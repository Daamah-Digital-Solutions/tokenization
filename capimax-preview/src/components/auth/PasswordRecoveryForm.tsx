import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, AlertCircle } from 'lucide-react';
import { Input } from '../design-system/forms/Input';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';

interface PasswordRecoveryFormProps {
  onSubmit?: (data: { email: string }) => void;
  onBackToLogin?: () => void;
  onUseDifferentEmail?: () => void;
  loading?: boolean;
  error?: string;
  emailSent?: boolean;
  className?: string;
}

type Step = 'request' | 'sent';

export const PasswordRecoveryForm: React.FC<PasswordRecoveryFormProps> = ({
  onSubmit,
  onBackToLogin,
  onUseDifferentEmail,
  loading = false,
  error,
  emailSent = false,
  className
}) => {
  const { t } = useTranslation('ui');
  const [currentStep, setCurrentStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Move to sent step when email is sent
  React.useEffect(() => {
    if (emailSent && currentStep === 'request') {
      setCurrentStep('sent');
    }
  }, [emailSent, currentStep]);

  const validateEmail = (): boolean => {
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = t('validation.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = t('validation.emailInvalid');
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };


  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail()) {
      return;
    }

    onSubmit?.({ email });
  };


  const renderStepContent = () => {
    switch (currentStep) {
      case 'request':
        return (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onSubmit={handleEmailSubmit}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('recovery.title')}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {t('recovery.subtitle')}
              </p>
            </div>

            <Input
              type="email"
              label={t('fields.email')}
              placeholder={t('fields.emailAddressPlaceholder')}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (validationErrors.email) {
                  setValidationErrors(prev => {
                    const { email, ...rest } = prev;
                    return rest;
                  });
                }
              }}
              leftIcon={<Mail className="w-5 h-5" />}
              errorMessage={validationErrors.email}
              size="lg"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={loading}
              disabled={loading}
            >
              {loading ? t('recovery.sending') : t('recovery.send')}
            </Button>
          </motion.form>
        );

      case 'sent':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('recovery.checkEmail')}
              </h2>
              <div className="space-y-3">
                <p className="text-slate-600 dark:text-slate-400">
                  {t('recovery.sentTo')} <strong>{email}</strong>
                </p>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  {t('recovery.clickLink')}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full"></div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t('recovery.tipSpam')}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full"></div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t('recovery.tipOnce')}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => onSubmit?.({ email })}
                  className="text-sm text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
                  disabled={loading}
                >
                  {loading ? t('recovery.sendingShort') : t('recovery.sendAgain')}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep('request');
                    setEmail('');
                    setValidationErrors({});
                    // Notify parent to reset emailSent state
                    onUseDifferentEmail?.();
                  }}
                  className="text-sm text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 font-medium transition-colors"
                >
                  {t('recovery.differentEmail')}
                </button>
              </div>
            </div>
          </motion.div>
        );


      default:
        return null;
    }
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 space-y-6',
        className
      )}
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

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {renderStepContent()}
      </AnimatePresence>

      {/* Back to Login Link */}
      {onBackToLogin && (
        <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onBackToLogin}
            className="inline-flex items-center gap-2 text-sm text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {t('recovery.backToSignIn')}
          </button>
        </div>
      )}
    </motion.div>
  );
};

