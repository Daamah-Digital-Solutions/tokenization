import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, 
  Shield, 
  QrCode, 
  Copy, 
  Check, 
  AlertCircle, 
  Fingerprint,
  Phone
} from 'lucide-react';
import { Input } from '../design-system/forms/Input';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';

interface TwoFactorAuthProps {
  mode?: 'setup' | 'verify' | 'disable';
  method?: 'sms' | 'authenticator' | 'biometric';
  onSetup?: (method: string, data: any) => void;
  onVerify?: (code: string) => void;
  onDisable?: () => void;
  onMethodChange?: (method: string) => void;
  qrCodeUrl?: string;
  backupCodes?: string[];
  loading?: boolean;
  error?: string;
  success?: boolean;
  phoneNumber?: string;
  className?: string;
}

type TwoFAMethod = 'sms' | 'authenticator' | 'biometric';

interface MethodConfig {
  id: TwoFAMethod;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  available: boolean;
}

const METHODS: MethodConfig[] = [
  {
    id: 'sms',
    title: 'twoFactor.methods.sms.title',
    description: 'twoFactor.methods.sms.desc',
    icon: Phone,
    available: true
  },
  {
    id: 'authenticator',
    title: 'twoFactor.methods.authenticator.title',
    description: 'twoFactor.methods.authenticator.desc',
    icon: Smartphone,
    available: true
  },
  {
    id: 'biometric',
    title: 'twoFactor.methods.biometric.title',
    description: 'twoFactor.methods.biometric.desc',
    icon: Fingerprint,
    available: typeof window !== 'undefined' && 'navigator' in window && 'credentials' in navigator
  }
];

export const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({
  mode = 'setup',
  method = 'authenticator',
  onSetup,
  onVerify,
  onDisable: _onDisable,
  onMethodChange,
  qrCodeUrl,
  backupCodes = [],
  loading = false,
  error,
  success = false,
  phoneNumber,
  className
}) => {
  const { t } = useTranslation('ui');
  const [selectedMethod, setSelectedMethod] = useState<TwoFAMethod>(method);
  const [verificationCode, setVerificationCode] = useState('');
  const [setupStep, setSetupStep] = useState(0);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [phoneInput, setPhoneInput] = useState(phoneNumber || '');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleMethodSelect = (methodId: TwoFAMethod) => {
    setSelectedMethod(methodId);
    onMethodChange?.(methodId);
    setSetupStep(0);
    setValidationErrors({});
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode.trim()) {
      setValidationErrors({ code: t('twoFactor.codeRequired') });
      return;
    }

    if (verificationCode.length !== 6) {
      setValidationErrors({ code: t('twoFactor.codeLength') });
      return;
    }

    setValidationErrors({});
    onVerify?.(verificationCode);
  };

  const handleSetupNext = () => {
    if (selectedMethod === 'sms' && setupStep === 0) {
      if (!phoneInput.trim()) {
        setValidationErrors({ phone: t('validation.phoneRequired') });
        return;
      }
      onSetup?.(selectedMethod, { phoneNumber: phoneInput });
    } else if (selectedMethod === 'authenticator' && setupStep === 1) {
      if (!verificationCode.trim()) {
        setValidationErrors({ code: t('twoFactor.codeRequired') });
        return;
      }
      onSetup?.(selectedMethod, { code: verificationCode });
    } else if (selectedMethod === 'biometric') {
      onSetup?.(selectedMethod, {});
    }
    
    setSetupStep(setupStep + 1);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const renderMethodSelection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="text-center space-y-2 mb-6">
        <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
          <Shield className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
          {t('twoFactor.chooseTitle')}
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          {t('twoFactor.chooseSubtitle')}
        </p>
      </div>

      <div className="space-y-3">
        {METHODS.filter(m => m.available).map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;

          return (
            <motion.button
              key={method.id}
              onClick={() => handleMethodSelect(method.id)}
              className={cn(
                'w-full p-4 rounded-xl border-2 text-start transition-all duration-200',
                'hover:border-emerald-200 dark:hover:border-emerald-800',
                isSelected
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'p-2 rounded-lg',
                  isSelected 
                    ? 'bg-emerald-100 dark:bg-emerald-800/50' 
                    : 'bg-slate-100 dark:bg-slate-700'
                )}>
                  <Icon className={cn(
                    'w-5 h-5',
                    isSelected 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-slate-600 dark:text-slate-400'
                  )} />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900 dark:text-white">
                    {t(method.title)}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t(method.description)}
                  </p>
                </div>
                {isSelected && (
                  <Check className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      <Button
        variant="primary"
        size="lg"
        className="w-full mt-6"
        onClick={handleSetupNext}
      >
        {t('twoFactor.continueWith', { method: t(METHODS.find(m => m.id === selectedMethod)?.title || '') })}
      </Button>
    </motion.div>
  );

  const renderSMSSetup = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
          <Phone className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
          {t('twoFactor.smsSetupTitle')}
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          {t('twoFactor.smsSetupSubtitle')}
        </p>
      </div>

      {setupStep === 0 && (
        <div className="space-y-4">
          <Input
            type="tel"
            label={t('fields.phone')}
            placeholder="+1 (555) 123-4567"
            value={phoneInput}
            onChange={(e) => {
              setPhoneInput(e.target.value);
              if (validationErrors.phone) {
                setValidationErrors(prev => {
                  const { phone, ...rest } = prev;
                  return rest;
                });
              }
            }}
            leftIcon={<Phone className="w-5 h-5" />}
            errorMessage={validationErrors.phone}
            size="lg"
          />

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleSetupNext}
            isLoading={loading}
          >
            {loading ? t('twoFactor.sendingCode') : t('twoFactor.sendCode')}
          </Button>
        </div>
      )}

      {setupStep === 1 && (
        <div className="space-y-4">
          <p className="text-center text-slate-600 dark:text-slate-400">
            {t('twoFactor.smsSentTo')} <strong dir="ltr">{phoneInput}</strong>
          </p>

          <form onSubmit={handleVerify}>
            <Input
              type="text"
              label={t('twoFactor.codeLabel')}
              placeholder={t('twoFactor.codePlaceholder')}
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationCode(value);
                if (validationErrors.code) {
                  setValidationErrors(prev => ({ ...prev, code: undefined }));
                }
              }}
              errorMessage={validationErrors.code}
              maxLength={6}
              size="lg"
              className="text-center text-2xl tracking-widest"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-4"
              isLoading={loading}
              disabled={verificationCode.length !== 6}
            >
              {loading ? t('twoFactor.verifying') : t('twoFactor.verifyEnableSms')}
            </Button>
          </form>
        </div>
      )}
    </motion.div>
  );

  const renderAuthenticatorSetup = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
          <Smartphone className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
          {t('twoFactor.appSetupTitle')}
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          {t('twoFactor.appSetupSubtitle')}
        </p>
      </div>

      {setupStep === 0 && (
        <div className="space-y-6">
          <div className="text-center">
            <h4 className="font-medium text-slate-900 dark:text-white mb-4">
              {t('twoFactor.scanQr')}
            </h4>
            
            {qrCodeUrl ? (
              <div className="inline-block p-4 bg-white rounded-xl">
                <img src={qrCodeUrl} alt={t('twoFactor.qrAlt')} className="w-48 h-48 mx-auto" />
              </div>
            ) : (
              <div className="w-48 h-48 mx-auto bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                <QrCode className="w-12 h-12 text-slate-400" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              {t('twoFactor.manualKey')}
            </p>
            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <code className="flex-1 text-sm font-mono text-slate-900 dark:text-white">
                JBSWY3DPEHPK3PXP
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard('JBSWY3DPEHPK3PXP')}
              >
                {copiedSecret ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => setSetupStep(1)}
          >
            {t('twoFactor.addedAccount')}
          </Button>
        </div>
      )}

      {setupStep === 1 && (
        <div className="space-y-4">
          <p className="text-center text-slate-600 dark:text-slate-400">
            {t('twoFactor.enterAppCode')}
          </p>

          <form onSubmit={handleVerify}>
            <Input
              type="text"
              label={t('twoFactor.codeLabel')}
              placeholder={t('twoFactor.codePlaceholder')}
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationCode(value);
                if (validationErrors.code) {
                  setValidationErrors(prev => ({ ...prev, code: undefined }));
                }
              }}
              errorMessage={validationErrors.code}
              maxLength={6}
              size="lg"
              className="text-center text-2xl tracking-widest"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-4"
              isLoading={loading}
              disabled={verificationCode.length !== 6}
            >
              {loading ? t('twoFactor.verifying') : t('twoFactor.verifyEnable')}
            </Button>
          </form>
        </div>
      )}
    </motion.div>
  );

  const renderSuccessStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-center"
    >
      <div className="space-y-4">
        <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
          <Check className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
        </div>
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">
          {t('twoFactor.enabledTitle')}
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          {t('twoFactor.enabledMsg')}
        </p>
      </div>

      {backupCodes.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-start">
              <h4 className="font-medium text-amber-800 dark:text-amber-200">
                {t('twoFactor.backupTitle')}
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {t('twoFactor.backupMsg')}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {backupCodes.map((code, index) => (
              <code key={index} className="block p-2 bg-white dark:bg-slate-800 rounded text-sm font-mono text-center">
                {code}
              </code>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => copyToClipboard(backupCodes.join('\n'))}
          >
            <Copy className="w-4 h-4 me-2" />
            {t('twoFactor.copyAll')}
          </Button>
        </div>
      )}
    </motion.div>
  );

  const renderContent = () => {
    if (success) {
      return renderSuccessStep();
    }

    if (mode === 'verify') {
      return (
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleVerify}
          className="space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
              {t('twoFactor.title')}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {method === 'sms' ? t('twoFactor.enterFromPhone') : t('twoFactor.enterFromApp')}
            </p>
          </div>

          <Input
            type="text"
            label={t('twoFactor.codeLabel')}
            placeholder={t('twoFactor.codePlaceholder')}
            value={verificationCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setVerificationCode(value);
              if (validationErrors.code) {
                setValidationErrors(prev => ({ ...prev, code: undefined }));
              }
            }}
            errorMessage={validationErrors.code}
            maxLength={6}
            size="lg"
            className="text-center text-2xl tracking-widest"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={loading}
            disabled={verificationCode.length !== 6}
          >
            {loading ? t('twoFactor.verifying') : t('twoFactor.verifyCode')}
          </Button>
        </motion.form>
      );
    }

    if (setupStep === 0 && mode === 'setup') {
      return renderMethodSelection();
    }

    if (selectedMethod === 'sms') {
      return renderSMSSetup();
    }

    if (selectedMethod === 'authenticator') {
      return renderAuthenticatorSetup();
    }

    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8',
        className
      )}
    >
      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-6"
        >
          <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
          <span className="text-sm text-red-600 dark:text-red-400">
            {error}
          </span>
        </motion.div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {renderContent()}
      </AnimatePresence>
    </motion.div>
  );
};