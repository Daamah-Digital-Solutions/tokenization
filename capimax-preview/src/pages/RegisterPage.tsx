import React, { useState } from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { RegisterForm } from '../components/auth/RegisterForm';

type RegisterStep = 'register' | 'success';

export const RegisterPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<RegisterStep>('register');

  const handleSuccess = () => {
    setCurrentStep('success');
    // Redirect to dashboard after a short delay
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 3000);
  };

  const handleGoToLogin = () => {
    window.location.href = '/login';
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'register':
        return (
          <RegisterForm
            onSignIn={handleGoToLogin}
            onSuccess={handleSuccess}
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
                Account Created Successfully!
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Welcome to Capimax! Your account has been created and you're ready to start investing in real estate.
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                What's next?
              </p>
              <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <p>• Complete your KYC verification</p>
                <p>• Explore available properties</p>
                <p>• Make your first investment</p>
              </div>
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
      title="Join Capimax"
      subtitle="Create your account and start investing in tokenized real estate with as little as $100"
    >
      {renderCurrentStep()}
    </AuthLayout>
  );
};