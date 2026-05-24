import React, { useState } from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { LoginForm } from '../components/auth/LoginForm';
import { PasswordRecoveryForm } from '../components/auth/PasswordRecoveryForm';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../utils/router';
import { AuthService } from '../services/auth/AuthService';

type LoginStep = 'login' | 'forgot-password' | 'success';

export const LoginPage: React.FC = () => {
  const { state: authState } = useAuth();
  const { navigate } = useRouter();
  const [currentStep, setCurrentStep] = useState<LoginStep>('login');

  // Password reset states
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleSuccess = () => {
    setCurrentStep('success');
    // Operational admins are funnelled to Django Admin — it is the source of
    // truth for ops work. The custom in-app admin dashboard is intentionally
    // unmounted to avoid confusion between two parallel admin surfaces.
    if (authState.user?.role === 'admin') {
      window.location.href = '/admin/';
      return;
    }
    navigate('dashboard');
  };

  const handleGoToRegister = () => {
    navigate('register');
  };

  const handlePasswordResetRequest = async (data: { email: string }) => {
    setPasswordResetLoading(true);
    setPasswordResetError(null);

    try {
      const response = await AuthService.requestPasswordReset(data);
      setEmailSent(true);
      console.log('✅ Password reset email sent successfully');
    } catch (error: any) {
      console.error('❌ Password reset request failed:', error);
      // Set a user-friendly error message
      const errorMessage = error?.message || 'Failed to send reset email. Please try again.';
      setPasswordResetError(errorMessage);
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setCurrentStep('login');
    // Reset password reset states when going back to login
    setPasswordResetError(null);
    setEmailSent(false);
    setPasswordResetLoading(false);
  };

  const handleUseDifferentEmail = () => {
    // Reset the emailSent state so user can enter different email
    setEmailSent(false);
    setPasswordResetError(null);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'login':
        return (
          <LoginForm
            onForgotPassword={() => setCurrentStep('forgot-password')}
            onSignUp={handleGoToRegister}
            onSuccess={handleSuccess}
          />
        );

      case 'forgot-password':
        return (
          <PasswordRecoveryForm
            onSubmit={handlePasswordResetRequest}
            onBackToLogin={handleBackToLogin}
            onUseDifferentEmail={handleUseDifferentEmail}
            loading={passwordResetLoading}
            error={passwordResetError}
            emailSent={emailSent}
          />
        );

      case 'success':
        return (
          <div className="text-center space-y-6 p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl">
            <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Welcome Back!
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                You have successfully signed in to your account.
              </p>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Redirecting to dashboard...
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to access your real estate ownership portfolio and discover new opportunities"
    >
      {renderCurrentStep()}
    </AuthLayout>
  );
};