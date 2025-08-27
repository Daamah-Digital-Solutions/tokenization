import React, { useState } from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { LoginForm } from '../components/auth/LoginForm';
import { PasswordRecoveryForm } from '../components/auth/PasswordRecoveryForm';
import { TwoFactorAuth } from '../components/auth/TwoFactorAuth';

type LoginStep = 'login' | 'forgot-password' | '2fa' | 'success';

interface LoginState {
  step: LoginStep;
  email: string;
  requires2FA: boolean;
  twoFAMethod: 'sms' | 'authenticator';
  loading: boolean;
  error: string | null;
}

export const LoginPage: React.FC = () => {
  const [state, setState] = useState<LoginState>({
    step: 'login',
    email: '',
    requires2FA: false,
    twoFAMethod: 'authenticator',
    loading: false,
    error: null
  });

  const handleLogin = async (data: { email: string; password: string; rememberMe: boolean }) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate different scenarios
      const scenarios = ['success', '2fa-required', 'error'];
      const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      
      if (scenario === 'error') {
        throw new Error('Invalid email or password. Please try again.');
      }
      
      if (scenario === '2fa-required') {
        setState(prev => ({
          ...prev,
          step: '2fa',
          email: data.email,
          requires2FA: true,
          loading: false
        }));
        return;
      }
      
      // Success - would typically redirect to dashboard
      console.log('Login successful:', data);
      setState(prev => ({ ...prev, step: 'success', loading: false }));
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Login failed'
      }));
    }
  };

  const handleForgotPassword = async (data: { email: string }) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Password recovery initiated for:', data.email);
      setState(prev => ({ ...prev, loading: false }));
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to send recovery email'
      }));
    }
  };

  const handlePasswordReset = async (data: { code: string; password: string }) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Password reset successful');
      setState(prev => ({ ...prev, loading: false, step: 'login' }));
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to reset password'
      }));
    }
  };

  const handle2FAVerification = async (code: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (code !== '123456') {
        throw new Error('Invalid verification code. Please try again.');
      }
      
      console.log('2FA verification successful');
      setState(prev => ({ ...prev, step: 'success', loading: false }));
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '2FA verification failed'
      }));
    }
  };

  const handleGoToRegister = () => {
    // In a real app, this would use router navigation
    console.log('Navigate to register page');
  };

  const handleBackToLogin = () => {
    setState(prev => ({
      ...prev,
      step: 'login',
      error: null,
      requires2FA: false
    }));
  };

  const renderCurrentStep = () => {
    switch (state.step) {
      case 'login':
        return (
          <LoginForm
            onSubmit={handleLogin}
            onForgotPassword={() => setState(prev => ({ ...prev, step: 'forgot-password' }))}
            onSignUp={handleGoToRegister}
            loading={state.loading}
            error={state.error}
          />
        );

      case 'forgot-password':
        return (
          <PasswordRecoveryForm
            onSubmit={handleForgotPassword}
            onResetSubmit={handlePasswordReset}
            onBackToLogin={handleBackToLogin}
            loading={state.loading}
            error={state.error}
          />
        );

      case '2fa':
        return (
          <TwoFactorAuth
            mode="verify"
            method={state.twoFAMethod}
            onVerify={handle2FAVerification}
            loading={state.loading}
            error={state.error}
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