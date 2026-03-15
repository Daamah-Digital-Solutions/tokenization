import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { Input } from '../design-system/forms/Input';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from '../../utils/router';
import { AuthService } from '../../services/auth/AuthService';

// Declare google global for TypeScript
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          disableAutoSelect: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface LoginFormProps {
  onForgotPassword?: () => void;
  onSignUp?: () => void;
  onSuccess?: () => void;
  className?: string;
}

interface LoginData {
  email: string;
  password: string;
  rememberMe: boolean;
  twoFactorCode?: string;
}

interface ValidationErrors {
  email?: string;
  password?: string;
  twoFactorCode?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onForgotPassword,
  onSignUp,
  onSuccess,
  className
}) => {
  const { state, login, clearError, setUser } = useAuth();
  const { navigate } = useRouter();

  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: '',
    rememberMe: false,
    twoFactorCode: ''
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleInitialized, setGoogleInitialized] = useState(false);

  // Ref for Google button container (kept for potential future use)
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Google OAuth Client ID from environment
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Handle Google Sign-In response
  const handleGoogleResponse = useCallback(async (response: any) => {
    if (!response.credential) {
      setGoogleError('Google authentication failed. Please try again.');
      return;
    }

    setGoogleLoading(true);
    setGoogleError(null);
    clearError();

    try {
      // Send ID token to our backend
      const authResponse = await AuthService.googleAuth(response.credential);

      if (authResponse.requires_profile_completion) {
        // Store Google user data in session storage for profile completion
        sessionStorage.setItem('googleUserData', JSON.stringify(authResponse.user));
        // Navigate to profile completion page
        navigate('complete-google-profile');
      } else if (authResponse.tokens) {
        // User has complete profile, log them in
        const user = await AuthService.getCurrentUser();
        setUser(user);
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Google auth error:', error);

      // Handle specific error cases
      if (error.status === 409) {
        setGoogleError('An account with this email already exists. Please sign in with your email and password.');
      } else {
        setGoogleError(error.message || 'Google authentication failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  }, [clearError, navigate, onSuccess, setUser]);

  // Load and initialize Google Sign-In
  useEffect(() => {
    if (!googleClientId || googleClientId === 'your_google_client_id.apps.googleusercontent.com') {
      console.warn('Google OAuth Client ID not configured');
      return;
    }

    // Load Google Sign-In script
    const loadGoogleScript = () => {
      if (document.getElementById('google-signin-script')) {
        initializeGoogle();
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-signin-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.head.appendChild(script);
    };

    // Initialize Google Sign-In with FedCM support
    const initializeGoogle = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: true,  // Enable FedCM support
          itp_support: true  // Safari Intelligent Tracking Prevention support
        });

        setGoogleInitialized(true);
        console.log('✅ Google Sign-In initialized with FedCM support');
      }
    };

    loadGoogleScript();
  }, [googleClientId, handleGoogleResponse]);

  // Render Google's real button invisibly inside the overlay container
  useEffect(() => {
    if (googleInitialized && window.google && googleButtonRef.current) {
      const timer = setTimeout(() => {
        if (googleButtonRef.current) {
          window.google!.accounts.id.renderButton(googleButtonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            width: 400,
            locale: 'en'
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [googleInitialized]);


  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (showTwoFactor && !formData.twoFactorCode) {
      errors.twoFactorCode = '2FA code is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      clearError();
      await login(formData.email, formData.password, formData.twoFactorCode);
      
      // Call success callback if provided
      onSuccess?.();
    } catch (error: any) {
      // Check if 2FA is required
      if (error.code === 'TWO_FACTOR_REQUIRED') {
        setShowTwoFactor(true);
      }
      // Error is handled by the auth context
    }
  };

  const handleInputChange = (field: keyof LoginData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'rememberMe' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (field in validationErrors) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
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
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
          Welcome Back
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Sign in to your account to continue
        </p>
      </div>

      {/* Error Message */}
      {state.error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
        >
          <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
          <span className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </span>
        </motion.div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email Field */}
        <Input
          type="email"
          label="Email Address"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleInputChange('email')}
          leftIcon={<Mail className="w-5 h-5" />}
          errorMessage={validationErrors.email}
          size="lg"
          required
        />

        {/* Password Field */}
        <Input
          type="password"
          label="Password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleInputChange('password')}
          leftIcon={<Lock className="w-5 h-5" />}
          showPasswordToggle
          errorMessage={validationErrors.password}
          size="lg"
          required
        />

        {/* Two Factor Code Field */}
        {showTwoFactor && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="overflow-hidden"
          >
            <Input
              type="text"
              label="Two-Factor Authentication Code"
              placeholder="Enter your 6-digit code"
              value={formData.twoFactorCode || ''}
              onChange={handleInputChange('twoFactorCode')}
              leftIcon={<Lock className="w-5 h-5" />}
              errorMessage={validationErrors.twoFactorCode}
              size="lg"
              maxLength={6}
              required
            />
          </motion.div>
        )}

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.rememberMe}
              onChange={handleInputChange('rememberMe')}
              className="w-4 h-4 text-emerald-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-emerald-500 focus:ring-2"
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Remember me
            </span>
          </label>

          {onForgotPassword && (
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
            >
              Forgot password?
            </button>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={state.isLoading}
          disabled={state.isLoading}
        >
          {state.isLoading ? 'Signing In...' : 'Sign In'}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-200 dark:border-slate-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">
            Or continue with
          </span>
        </div>
      </div>

      {/* Google Error Message */}
      {googleError && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl"
        >
          <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
          <span className="text-sm text-amber-700 dark:text-amber-400">
            {googleError}
          </span>
        </motion.div>
      )}

      {/* Google Sign-In: custom styled button with invisible Google button overlay */}
      <div className="relative w-full" style={{ minHeight: '48px' }}>
        {/* Our visible custom button (underneath) */}
        <div className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 pointer-events-none">
          {googleLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          {googleLoading ? 'Signing in with Google...' : 'Continue with Google'}
        </div>
        {/* Google's real rendered button (invisible overlay, captures the click) */}
        <div
          ref={googleButtonRef}
          className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl"
          style={{ opacity: 0.0001, cursor: 'pointer' }}
        />
      </div>

      {/* Sign Up Link */}
      {onSignUp && (
        <div className="text-center">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Don't have an account?{' '}
          </span>
          <button
            onClick={onSignUp}
            className="text-sm text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
          >
            Create an account
          </button>
        </div>
      )}
    </motion.div>
  );
};