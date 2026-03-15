import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  User,
  Phone,
  AlertCircle,
  Check,
  ChevronRight,
  ChevronLeft,
  Shield,
  Globe,
  Building
} from 'lucide-react';
import { Input } from '../design-system/forms/Input';
import { Select } from '../design-system/forms/Select';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useRouter } from '../../utils/router';
import { AuthService } from '../../services/auth/AuthService';
import { UserRole } from '../../services/api/types';

interface RegisterFormProps {
  onSignIn?: () => void;
  onSuccess?: (email: string) => void;
  className?: string;
}

export interface RegisterData {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  // Note: dateOfBirth moved to KYC process per client requirements

  // Location Information
  country: string;
  city: string;

  // Account Information
  password: string;
  confirmPassword: string;
  userType: UserRole;  // Primary role for backward compatibility
  userRoles: UserRole[];  // Multi-role support

  // Agreements
  agreeToTerms: boolean;
  agreeToPrivacy: boolean;
  agreeToMarketing: boolean;
}

interface ValidationErrors {
  [key: string]: string | undefined;
}

const STEPS = [
  { id: 'personal', title: 'Personal Info', icon: User },
  { id: 'location', title: 'Location', icon: Globe },
  { id: 'account', title: 'Account', icon: Shield },
  { id: 'agreements', title: 'Agreements', icon: Building }
];

const USER_TYPES = [
  { value: UserRole.INVESTOR, label: 'Investor - I want to invest in real estate' },
  { value: UserRole.PROPERTY_OWNER, label: 'Property Owner - I want to tokenize my property' }
  // Note: BROKER role has been moved to a separate partner program
];

const COUNTRIES = [
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'gb', label: 'United Kingdom' },
  { value: 'au', label: 'Australia' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'ae', label: 'United Arab Emirates' }
];

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSignIn,
  onSuccess,
  className
}) => {
  const { state, register, clearError, setUser } = useAuth();
  const { error: showError } = useNotifications();
  const { navigate } = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleInitialized, setGoogleInitialized] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [formData, setFormData] = useState<RegisterData>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    country: '',
    city: '',
    password: '',
    confirmPassword: '',
    userType: UserRole.INVESTOR,
    userRoles: [UserRole.INVESTOR],  // Initialize with default role
    agreeToTerms: false,
    agreeToPrivacy: false,
    agreeToMarketing: false
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Handle Google Sign-Up response
  const handleGoogleResponse = useCallback(async (response: any) => {
    if (!response.credential) {
      setGoogleError('Google authentication failed. Please try again.');
      return;
    }

    setGoogleLoading(true);
    setGoogleError(null);
    clearError();

    try {
      const authResponse = await AuthService.googleAuth(response.credential);

      if (authResponse.requires_profile_completion) {
        sessionStorage.setItem('googleUserData', JSON.stringify(authResponse.user));
        navigate('complete-google-profile');
      } else if (authResponse.tokens) {
        const user = await AuthService.getCurrentUser();
        setUser(user);
        onSuccess?.(user.email);
      }
    } catch (error: any) {
      console.error('Google auth error:', error);
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
      return;
    }

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

    const initializeGoogle = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: true,
          itp_support: true
        });
        setGoogleInitialized(true);
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
            text: 'signup_with',
            shape: 'rectangular',
            width: 400,
            locale: 'en'
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [googleInitialized]);

  const validateStep = (stepIndex: number): boolean => {
    const errors: ValidationErrors = {};

    switch (stepIndex) {
      case 0: // Personal Info
        if (!formData.firstName.trim()) errors.firstName = 'First name is required';
        if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
        if (!formData.email.trim()) {
          errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          errors.email = 'Please enter a valid email address';
        }
        if (!formData.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required';
        // Note: dateOfBirth validation moved to KYC process
        break;

      case 1: // Location
        if (!formData.country) errors.country = 'Country is required';
        if (!formData.city.trim()) errors.city = 'City is required';
        break;

      case 2: // Account
        if (!formData.password) {
          errors.password = 'Password is required';
        } else if (formData.password.length < 8) {
          errors.password = 'Password must be at least 8 characters';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
          errors.password = 'Password must contain uppercase, lowercase, and number';
        }

        if (!formData.confirmPassword) {
          errors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
          errors.confirmPassword = 'Passwords do not match';
        }

        if (formData.userRoles.length === 0) errors.userRoles = 'Please select at least one role';
        break;

      case 3: // Agreements
        if (!formData.agreeToTerms) errors.agreeToTerms = 'You must agree to the terms and conditions';
        if (!formData.agreeToPrivacy) errors.agreeToPrivacy = 'You must agree to the privacy policy';
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    try {
      clearError();
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.userRoles[0],  // Primary role (first selected)
        roles: formData.userRoles,     // Multi-role support
        phone: formData.phoneNumber,
        country: formData.country,
      });

      // Call success callback if provided, pass email for redirect
      onSuccess?.(formData.email);
    } catch (error: any) {
      // Show notification for registration error
      showError('Registration Failed', error.message || 'Unable to create account. Please try again.');
    }
  };

  const handleInputChange = (field: keyof RegisterData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked 
      : e.target.value;
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Personal Information
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                placeholder="Enter your first name"
                value={formData.firstName}
                onChange={handleInputChange('firstName')}
                errorMessage={validationErrors.firstName}
                size="lg"
                required
              />
              <Input
                label="Last Name"
                placeholder="Enter your last name"
                value={formData.lastName}
                onChange={handleInputChange('lastName')}
                errorMessage={validationErrors.lastName}
                size="lg"
                required
              />
            </div>

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

            <Input
              type="tel"
              label="Phone Number"
              placeholder="Enter your phone number"
              value={formData.phoneNumber}
              onChange={handleInputChange('phoneNumber')}
              leftIcon={<Phone className="w-5 h-5" />}
              errorMessage={validationErrors.phoneNumber}
              size="lg"
              required
            />
          </motion.div>
        );

      case 1: // Location Information
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <Select
              label="Country"
              placeholder="Select your country"
              options={COUNTRIES}
              value={formData.country}
              onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
              errorMessage={validationErrors.country}
              required
            />

            <Input
              label="City"
              placeholder="Enter your city"
              value={formData.city}
              onChange={handleInputChange('city')}
              errorMessage={validationErrors.city}
              size="lg"
              required
            />
          </motion.div>
        );

      case 2: // Account Information
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            {/* Multi-role selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Select your role(s) <span className="text-red-500">*</span>
              </label>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-3">
                {USER_TYPES.map(roleType => (
                  <label
                    key={roleType.value}
                    className="flex items-start gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      className="w-5 h-5 mt-0.5 text-emerald-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-emerald-500 focus:ring-2"
                      checked={formData.userRoles.includes(roleType.value)}
                      onChange={(e) => {
                        const newRoles = e.target.checked
                          ? [...formData.userRoles, roleType.value]
                          : formData.userRoles.filter(r => r !== roleType.value);
                        setFormData(prev => ({
                          ...prev,
                          userRoles: newRoles,
                          userType: newRoles[0] || UserRole.INVESTOR // Set primary role
                        }));
                        // Clear validation error
                        if (validationErrors.userRoles) {
                          setValidationErrors(prev => ({ ...prev, userRoles: undefined }));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-700 dark:text-slate-200">
                        {roleType.label.split(' - ')[0]}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {roleType.label.split(' - ')[1]}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {formData.userRoles.length > 1 && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm text-emerald-700 dark:text-emerald-300">
                    You can switch between roles anytime from your dashboard
                  </span>
                </div>
              )}
              {validationErrors.userRoles && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  {validationErrors.userRoles}
                </div>
              )}
            </div>

            <Input
              type="password"
              label="Password"
              placeholder="Create a strong password"
              value={formData.password}
              onChange={handleInputChange('password')}
              leftIcon={<Lock className="w-5 h-5" />}
              showPasswordToggle
              errorMessage={validationErrors.password}
              helperText="Must be 8+ characters with uppercase, lowercase, and number"
              size="lg"
              required
            />

            <Input
              type="password"
              label="Confirm Password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              leftIcon={<Lock className="w-5 h-5" />}
              showPasswordToggle
              errorMessage={validationErrors.confirmPassword}
              size="lg"
              required
            />
          </motion.div>
        );

      case 3: // Agreements
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={formData.agreeToTerms}
                  onChange={handleInputChange('agreeToTerms')}
                  className="w-5 h-5 mt-0.5 text-emerald-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-emerald-500 focus:ring-2"
                />
                <label htmlFor="terms" className="text-sm text-slate-600 dark:text-slate-400">
                  I agree to the{' '}
                  <a href="/terms" className="text-emerald-500 hover:text-emerald-600 dark:text-emerald-400">
                    Terms and Conditions
                  </a>{' '}
                  and understand the risks involved in real estate tokenization
                </label>
              </div>
              {validationErrors.agreeToTerms && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  {validationErrors.agreeToTerms}
                </div>
              )}

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="privacy"
                  checked={formData.agreeToPrivacy}
                  onChange={handleInputChange('agreeToPrivacy')}
                  className="w-5 h-5 mt-0.5 text-emerald-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-emerald-500 focus:ring-2"
                />
                <label htmlFor="privacy" className="text-sm text-slate-600 dark:text-slate-400">
                  I agree to the{' '}
                  <a href="/privacy" className="text-emerald-500 hover:text-emerald-600 dark:text-emerald-400">
                    Privacy Policy
                  </a>{' '}
                  and consent to the processing of my personal data
                </label>
              </div>
              {validationErrors.agreeToPrivacy && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  {validationErrors.agreeToPrivacy}
                </div>
              )}

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="marketing"
                  checked={formData.agreeToMarketing}
                  onChange={handleInputChange('agreeToMarketing')}
                  className="w-5 h-5 mt-0.5 text-emerald-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-emerald-500 focus:ring-2"
                />
                <label htmlFor="marketing" className="text-sm text-slate-600 dark:text-slate-400">
                  I would like to receive marketing communications and investment opportunities (optional)
                </label>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 space-y-8',
        className
      )}
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
          Create Your Account
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Join our platform and start your investment journey
        </p>
      </div>

      {/* Google Sign-Up */}
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

      {/* Google Sign-Up: custom styled button with invisible Google button overlay */}
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
          {googleLoading ? 'Signing up with Google...' : 'Sign up with Google'}
        </div>
        {/* Google's real rendered button (invisible overlay, captures the click) */}
        <div
          ref={googleButtonRef}
          className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl"
          style={{ opacity: 0.0001, cursor: 'pointer' }}
        />
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-200 dark:border-slate-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">
            Or register with email
          </span>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const StepIcon = step.icon;

          return (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200',
                  isActive && 'border-emerald-500 bg-emerald-500 text-white',
                  isCompleted && 'border-emerald-500 bg-emerald-500 text-white',
                  !isActive && !isCompleted && 'border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500'
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <StepIcon className="w-5 h-5" />
                )}
              </div>
              
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-16 h-0.5 ml-2 transition-all duration-200',
                    isCompleted ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                  )}
                />
              )}
            </div>
          );
        })}
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

      {/* Step Content */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {renderStepContent()}
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6">
        <Button
          variant="ghost"
          size="lg"
          onClick={handleBack}
          disabled={currentStep === 0}
          className={cn(
            'flex items-center gap-2',
            currentStep === 0 && 'invisible'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="text-sm text-slate-500 dark:text-slate-400">
          Step {currentStep + 1} of {STEPS.length}
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={handleNext}
          isLoading={state.isLoading && currentStep === STEPS.length - 1}
          disabled={state.isLoading}
          className="flex items-center gap-2"
        >
          {currentStep === STEPS.length - 1 ? (
            state.isLoading ? 'Creating Account...' : 'Create Account'
          ) : (
            <>
              Next
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>

      {/* Sign In Link */}
      {onSignIn && (
        <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-700">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{' '}
          </span>
          <button
            onClick={onSignIn}
            className="text-sm text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
          >
            Sign in
          </button>
        </div>
      )}
    </motion.div>
  );
};