import React, { useState } from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { RegisterForm, type RegisterData } from '../components/auth/RegisterForm';
import { TwoFactorAuth } from '../components/auth/TwoFactorAuth';

type RegisterStep = 'register' | '2fa-setup' | 'email-verification' | 'success';

interface RegisterState {
  step: RegisterStep;
  formData: RegisterData | null;
  loading: boolean;
  error: string | null;
  twoFAMethod: 'sms' | 'authenticator';
  emailVerificationSent: boolean;
}

export const RegisterPage: React.FC = () => {
  const [state, setState] = useState<RegisterState>({
    step: 'register',
    formData: null,
    loading: false,
    error: null,
    twoFAMethod: 'authenticator',
    emailVerificationSent: false
  });

  const handleRegister = async (data: RegisterData) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate validation scenarios
      const existingEmails = ['test@example.com', 'user@test.com'];
      if (existingEmails.includes(data.email)) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }
      
      // Simulate successful registration
      console.log('Registration data:', data);
      
      setState(prev => ({
        ...prev,
        formData: data,
        step: 'email-verification',
        loading: false,
        emailVerificationSent: true
      }));
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      }));
    }
  };

  const handleEmailVerification = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Simulate email verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Email verification successful');
      setState(prev => ({ ...prev, step: '2fa-setup', loading: false }));
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Email verification failed'
      }));
    }
  };

  const handle2FASetup = async (method: string, data: any) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Simulate 2FA setup
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('2FA setup successful:', { method, data });
      setState(prev => ({ ...prev, step: 'success', loading: false }));
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '2FA setup failed'
      }));
    }
  };

  const handleGoToLogin = () => {
    // In a real app, this would use router navigation
    console.log('Navigate to login page');
  };

  const handleResendVerification = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Verification email resent');
      setState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to resend verification email'
      }));
    }
  };

  const renderCurrentStep = () => {
    switch (state.step) {
      case 'register':
        return (
          <RegisterForm
            onSubmit={handleRegister}
            onSignIn={handleGoToLogin}
            loading={state.loading}
            error={state.error}
          />
        );

      case 'email-verification':
        return (
          <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 space-y-6">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Verify Your Email
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                  We've sent a verification link to{' '}
                  <strong>{state.formData?.email}</strong>
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Click the link in the email to verify your account and continue.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleEmailVerification}
                disabled={state.loading}
                className="w-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {state.loading ? 'Checking...' : "I've Verified My Email"}
              </button>

              <div className="text-center">
                <button
                  onClick={handleResendVerification}
                  disabled={state.loading}
                  className="text-sm text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors disabled:opacity-50"
                >
                  Didn't receive the email? Resend
                </button>
              </div>
            </div>

            <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Already have an account?{' '}
              </span>
              <button
                onClick={handleGoToLogin}
                className="text-sm text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
              >
                Sign in
              </button>
            </div>
          </div>
        );

      case '2fa-setup':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Secure Your Account
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Set up two-factor authentication to protect your investment account
              </p>
            </div>
            
            <TwoFactorAuth
              mode="setup"
              method={state.twoFAMethod}
              onSetup={handle2FASetup}
              onMethodChange={(method) => setState(prev => ({ 
                ...prev, 
                twoFAMethod: method as 'sms' | 'authenticator' 
              }))}
              loading={state.loading}
              error={state.error}
              phoneNumber={state.formData?.phoneNumber}
              qrCodeUrl="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgZmlsbD0iI2ZmZmZmZiIvPjxyZWN0IHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgeD0iMCIgeT0iMCIgZmlsbD0iIzAwMDAwMCIvPjwvc3ZnPg=="
              backupCodes={[
                'ABC123DEF456',
                'GHI789JKL012',
                'MNO345PQR678',
                'STU901VWX234',
                'YZA567BCD890',
                'EFG123HIJ456'
              ]}
            />
          </div>
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
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Welcome to CapiMax!
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Your account has been created successfully. You can now start exploring investment opportunities.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <h3 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2">
                  Next Steps:
                </h3>
                <ul className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1 text-left">
                  <li>• Complete your KYC verification</li>
                  <li>• Set up your investment preferences</li>
                  <li>• Browse premium property opportunities</li>
                  <li>• Make your first investment</li>
                </ul>
              </div>

              <button
                onClick={() => console.log('Navigate to dashboard')}
                className="w-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors"
              >
                Get Started
              </button>
            </div>

            <div className="text-sm text-slate-500 dark:text-slate-400">
              Account type: <strong>{state.formData?.userType?.replace('_', ' ').toUpperCase()}</strong>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AuthLayout
      title="Join the Future of Real Estate Investment"
      subtitle="Create your account to access exclusive tokenized real estate opportunities with transparent returns"
      className={state.step === 'register' ? 'min-h-screen' : ''}
    >
      {renderCurrentStep()}
    </AuthLayout>
  );
};