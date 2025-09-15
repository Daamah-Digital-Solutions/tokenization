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
    title: 'SMS Verification',
    description: 'Receive codes via text message',
    icon: Phone,
    available: true
  },
  {
    id: 'authenticator',
    title: 'Authenticator App',
    description: 'Use Google Authenticator or similar app',
    icon: Smartphone,
    available: true
  },
  {
    id: 'biometric',
    title: 'Biometric Authentication',
    description: 'Use fingerprint or face recognition',
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
      setValidationErrors({ code: 'Verification code is required' });
      return;
    }

    if (verificationCode.length !== 6) {
      setValidationErrors({ code: 'Code must be 6 digits' });
      return;
    }

    setValidationErrors({});
    onVerify?.(verificationCode);
  };

  const handleSetupNext = () => {
    if (selectedMethod === 'sms' && setupStep === 0) {
      if (!phoneInput.trim()) {
        setValidationErrors({ phone: 'Phone number is required' });
        return;
      }
      onSetup?.(selectedMethod, { phoneNumber: phoneInput });
    } else if (selectedMethod === 'authenticator' && setupStep === 1) {
      if (!verificationCode.trim()) {
        setValidationErrors({ code: 'Verification code is required' });
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
          Choose Authentication Method
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Select how you'd like to secure your account
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
                'w-full p-4 rounded-xl border-2 text-left transition-all duration-200',
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
                    {method.title}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {method.description}
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
        Continue with {METHODS.find(m => m.id === selectedMethod)?.title}
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
          SMS Verification Setup
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Enter your phone number to receive verification codes
        </p>
      </div>

      {setupStep === 0 && (
        <div className="space-y-4">
          <Input
            type="tel"
            label="Phone Number"
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
            {loading ? 'Sending Code...' : 'Send Verification Code'}
          </Button>
        </div>
      )}

      {setupStep === 1 && (
        <div className="space-y-4">
          <p className="text-center text-slate-600 dark:text-slate-400">
            We've sent a verification code to <strong>{phoneInput}</strong>
          </p>

          <form onSubmit={handleVerify}>
            <Input
              type="text"
              label="Verification Code"
              placeholder="Enter 6-digit code"
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
              {loading ? 'Verifying...' : 'Verify & Enable SMS 2FA'}
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
          Authenticator App Setup
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Set up two-factor authentication using an authenticator app
        </p>
      </div>

      {setupStep === 0 && (
        <div className="space-y-6">
          <div className="text-center">
            <h4 className="font-medium text-slate-900 dark:text-white mb-4">
              Scan this QR code with your authenticator app
            </h4>
            
            {qrCodeUrl ? (
              <div className="inline-block p-4 bg-white rounded-xl">
                <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 mx-auto" />
              </div>
            ) : (
              <div className="w-48 h-48 mx-auto bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                <QrCode className="w-12 h-12 text-slate-400" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              Can't scan? Enter this key manually:
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
            I've Added the Account
          </Button>
        </div>
      )}

      {setupStep === 1 && (
        <div className="space-y-4">
          <p className="text-center text-slate-600 dark:text-slate-400">
            Enter the 6-digit code from your authenticator app to verify setup
          </p>

          <form onSubmit={handleVerify}>
            <Input
              type="text"
              label="Verification Code"
              placeholder="Enter 6-digit code"
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
              {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
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
          Two-Factor Authentication Enabled!
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Your account is now protected with two-factor authentication
        </p>
      </div>

      {backupCodes.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-left">
              <h4 className="font-medium text-amber-800 dark:text-amber-200">
                Save Your Backup Codes
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Store these codes safely. You can use them to access your account if you lose your device.
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
            <Copy className="w-4 h-4 mr-2" />
            Copy All Codes
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
              Two-Factor Authentication
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Enter the verification code from your {method === 'sms' ? 'phone' : 'authenticator app'}
            </p>
          </div>

          <Input
            type="text"
            label="Verification Code"
            placeholder="Enter 6-digit code"
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
            {loading ? 'Verifying...' : 'Verify Code'}
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