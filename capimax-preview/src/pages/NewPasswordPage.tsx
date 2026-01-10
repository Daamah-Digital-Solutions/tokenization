import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Input } from '../components/design-system/forms/Input';
import { Button } from '../components/ui/Button';
import { useRouter } from '../utils/router';
import { AuthService } from '../services/auth/AuthService';

interface NewPasswordPageProps {}

export const NewPasswordPage: React.FC<NewPasswordPageProps> = () => {
  const { navigate } = useRouter();
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
      setError('Invalid or missing reset token. Please request a new password reset.');
      setTokenValid(false);
    }
  }, []);

  const validatePasswords = (): boolean => {
    const errors: Record<string, string> = {};

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
        new_password: password,
        confirm_password: confirmPassword
      });

      setSuccess(true);
      console.log('✅ Password reset successful');
    } catch (error: any) {
      console.error('❌ Password reset failed:', error);
      const errorMessage = error?.message || 'Failed to reset password. Please try again or request a new reset link.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('login');
  };

  const handleRequestNewReset = () => {
    navigate('login');
    // The login page handles the forgot password flow
  };

  // Show loading state while checking token
  if (tokenValid === null) {
    return (
      <AuthLayout
        title="Set New Password"
        subtitle="Creating secure access to your account"
      >
        <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
            <p className="text-slate-600 dark:text-slate-300">Validating reset link...</p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Show error if token is invalid
  if (tokenValid === false) {
    return (
      <AuthLayout
        title="Set New Password"
        subtitle="Creating secure access to your account"
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
              Invalid Reset Link
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              The password reset link is invalid or has expired. Please request a new one.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleRequestNewReset}
            >
              Request New Reset Link
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleBackToLogin}
            >
              Back to Sign In
            </Button>
          </div>
        </motion.div>
      </AuthLayout>
    );
  }

  // Show success screen
  if (success) {
    return (
      <AuthLayout
        title="Password Updated Successfully"
        subtitle="You can now sign in with your new password"
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
              Password Updated Successfully!
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Your password has been updated. You can now sign in with your new password.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleBackToLogin}
          >
            Continue to Sign In
          </Button>
        </motion.div>
      </AuthLayout>
    );
  }

  // Show password reset form
  return (
    <AuthLayout
      title="Set Your New Password"
      subtitle="Enter your new password to regain access to your account"
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
              Create New Password
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
                  setValidationErrors(prev => {
                    const { password, ...rest } = prev;
                    return rest;
                  });
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
            {loading ? 'Updating Password...' : 'Update Password'}
          </Button>
        </form>

        {/* Back to Login Link */}
        <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleBackToLogin}
            className="inline-flex items-center gap-2 text-sm text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </button>
        </div>
      </motion.div>
    </AuthLayout>
  );
};