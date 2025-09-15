import React, { useState } from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { LoginForm } from '../components/auth/LoginForm';
import { PasswordRecoveryForm } from '../components/auth/PasswordRecoveryForm';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../utils/router';

type LoginStep = 'login' | 'forgot-password' | 'success';

export const LoginPage: React.FC = () => {
  const { state: authState } = useAuth();
  const { navigate } = useRouter();
  const [currentStep, setCurrentStep] = useState<LoginStep>('login');

  const handleSuccess = () => {
    setCurrentStep('success');
    console.log('🚀 Login successful - redirecting to dashboard');
    // Navigate immediately since login was successful
    navigate('dashboard');
  };

  const handleGoToRegister = () => {
    navigate('register');
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
            onBackToLogin={() => setCurrentStep('login')}
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
      subtitle="Sign in to access your real estate investment portfolio and discover new opportunities"
    >
      {renderCurrentStep()}
    </AuthLayout>
  );
};