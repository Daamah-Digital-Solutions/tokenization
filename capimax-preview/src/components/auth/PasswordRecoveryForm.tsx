import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowLeft, Check, AlertCircle, Shield } from 'lucide-react';
import { Input } from '../design-system/forms/Input';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface PasswordRecoveryFormProps {
  onSubmit?: (data: { email: string }) => void;
  onResetSubmit?: (data: { code: string; password: string }) => void;
  onBackToLogin?: () => void;
  loading?: boolean;
  error?: string;
  emailSent?: boolean;
  className?: string;
}

type Step = 'request' | 'verify' | 'reset' | 'success';

export const PasswordRecoveryForm: React.FC<PasswordRecoveryFormProps> = ({
  onSubmit,
  onResetSubmit,
  onBackToLogin,
  loading = false,
  error,
  emailSent = false,
  className
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Move to verify step when email is sent
  React.useEffect(() => {
    if (emailSent && currentStep === 'request') {
      setCurrentStep('verify');
    }
  }, [emailSent, currentStep]);

  const validateEmail = (): boolean => {
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateReset = (): boolean => {
    const errors: Record<string, string> = {};

    if (!code.trim()) {
      errors.code = 'Verification code is required';
    } else if (code.length !== 6) {
      errors.code = 'Code must be 6 digits';
    }

    if (!password) {
      errors.password = 'New password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
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

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateReset()) {
      return;
    }

    onResetSubmit?.({ code, password });
  };

  const handleCodeVerify = () => {
    if (code.length === 6) {
      setCurrentStep('reset');
    } else {
      setValidationErrors({ code: 'Code must be 6 digits' });
    }
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
                Forgot Your Password?
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                No worries! Enter your email and we'll send you a reset code.
              </p>
            </div>

            <Input
              type="email"
              label="Email Address"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (validationErrors.email) {
                  setValidationErrors(prev => ({ ...prev, email: undefined }));
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
              {loading ? 'Sending Reset Code...' : 'Send Reset Code'}
            </Button>
          </motion.form>
        );

      case 'verify':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Check Your Email
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                We've sent a 6-digit verification code to <strong>{email}</strong>
              </p>
            </div>

            <div className="space-y-4">
              <Input
                type="text"
                label="Verification Code"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(value);
                  if (validationErrors.code) {
                    setValidationErrors(prev => ({ ...prev, code: undefined }));
                  }
                }}
                leftIcon={<Shield className="w-5 h-5" />}
                errorMessage={validationErrors.code}
                maxLength={6}
                size="lg"
                className="text-center text-2xl tracking-widest"
                required
              />

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => onSubmit?.({ email })}
                  className="text-sm text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
                >
                  Didn't receive the code? Resend
                </button>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleCodeVerify}
              disabled={code.length !== 6}
            >
              Verify Code
            </Button>
          </motion.div>
        );

      case 'reset':
        return (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onSubmit={handleResetSubmit}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Reset Your Password
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Enter your new password below
              </p>
            </div>

            <div className="space-y-5">
              <Input
                type="password"
                label="New Password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (validationErrors.password) {
                    setValidationErrors(prev => ({ ...prev, password: undefined }));
                  }
                }}
                leftIcon={<Lock className="w-5 h-5" />}
                showPasswordToggle
                errorMessage={validationErrors.password}
                helperText="Must be 8+ characters with uppercase, lowercase, and number"
                size="lg"
                required
              />

              <Input
                type="password"
                label="Confirm New Password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (validationErrors.confirmPassword) {
                    setValidationErrors(prev => ({ ...prev, confirmPassword: undefined }));
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
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </motion.form>
        );

      case 'success':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 text-center"
          >
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Password Reset Successfully!
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Your password has been updated. You can now sign in with your new password.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={onBackToLogin}
            >
              Continue to Sign In
            </Button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  // Auto-advance to success step when reset is successful (you would trigger this from parent)
  React.useEffect(() => {
    if (currentStep === 'reset' && !loading && !error) {
      // This would be triggered by parent component when reset is successful
      // setCurrentStep('success');
    }
  }, [currentStep, loading, error]);

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
      {onBackToLogin && currentStep !== 'success' && (
        <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onBackToLogin}
            className="inline-flex items-center gap-2 text-sm text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </button>
        </div>
      )}
    </motion.div>
  );
};

// Helper function to trigger success step from parent component
export const usePasswordRecoverySuccess = () => {
  return {
    triggerSuccess: () => {
      // This would be called from parent when API confirms password reset
      // Implementation depends on how you manage the state
    }
  };
};