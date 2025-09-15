import React, { useState } from 'react';
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
import { UserRole } from '../../services/api/types';

interface RegisterFormProps {
  onSignIn?: () => void;
  onSuccess?: () => void;
  className?: string;
}

export interface RegisterData {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  
  // Location Information
  country: string;
  city: string;
  
  // Account Information
  password: string;
  confirmPassword: string;
  userType: UserRole;
  
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
  { value: UserRole.PROPERTY_OWNER, label: 'Property Owner - I want to tokenize my property' },
  { value: UserRole.BROKER, label: 'Broker - I want to refer properties and earn commissions' }
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
  const { state, register, clearError } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<RegisterData>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    country: '',
    city: '',
    password: '',
    confirmPassword: '',
    userType: UserRole.INVESTOR,
    agreeToTerms: false,
    agreeToPrivacy: false,
    agreeToMarketing: false
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

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
        if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
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
        
        if (!formData.userType) errors.userType = 'Please select your user type';
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
        role: formData.userType,
        phone: formData.phoneNumber,
        country: formData.country,
      });

      // Call success callback if provided
      onSuccess?.();
    } catch (error: any) {
      // Error is handled by the auth context
      console.error('Registration failed:', error);
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

            <Input
              type="date"
              label="Date of Birth"
              value={formData.dateOfBirth}
              onChange={handleInputChange('dateOfBirth')}
              errorMessage={validationErrors.dateOfBirth}
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
            <Select
              label="I am a..."
              placeholder="Select your role"
              options={USER_TYPES}
              value={formData.userType}
              onChange={(e) => setFormData(prev => ({ ...prev, userType: e.target.value as UserRole }))}
              errorMessage={validationErrors.userType}
              required
            />

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