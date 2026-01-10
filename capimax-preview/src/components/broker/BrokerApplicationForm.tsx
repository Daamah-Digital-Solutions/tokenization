import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import BrokerService, { BrokerApplication } from '../../services/broker/BrokerService';
import { useNavigate } from 'react-router-dom';

interface FormErrors {
  [key: string]: string;
}

const SPECIALIZATIONS = [
  'Residential Properties',
  'Commercial Properties',
  'Industrial Properties',
  'Mixed-Use Developments',
  'Land & Development',
  'Luxury Real Estate',
  'Investment Properties',
  'Property Management',
  'General Real Estate',
];

export const BrokerApplicationForm: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<FormErrors>({});
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const [formData, setFormData] = useState<BrokerApplication>({
    full_name: '',
    email: '',
    phone_number: '',
    company_name: '',
    license_number: '',
    years_of_experience: 0,
    specialization: '',
    linkedin_url: '',
    portfolio_url: '',
    motivation: '',
    target_market: '',
    expected_clients: 0,
  });

  const submitMutation = useMutation({
    mutationFn: (data: BrokerApplication) => BrokerService.submitApplication(data),
    onSuccess: (response) => {
      setApplicationId(response.id || null);
      setCurrentStep(4); // Move to success step
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail || error.message || 'Failed to submit application';
      setErrors({ submit: errorMessage });
    },
  });

  const updateField = (field: keyof BrokerApplication, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};

    if (step === 1) {
      // Personal Information
      if (!formData.full_name || formData.full_name.trim().length < 3) {
        newErrors.full_name = 'Full name must be at least 3 characters';
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.email || !emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }

      const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
      if (!formData.phone_number || !phoneRegex.test(formData.phone_number)) {
        newErrors.phone_number = 'Please enter a valid phone number (min 10 digits)';
      }
    }

    if (step === 2) {
      // Professional Information
      if (!formData.specialization) {
        newErrors.specialization = 'Please select your specialization';
      }

      if (formData.years_of_experience < 0) {
        newErrors.years_of_experience = 'Years of experience cannot be negative';
      }

      if (formData.linkedin_url && !formData.linkedin_url.includes('linkedin.com')) {
        newErrors.linkedin_url = 'Please enter a valid LinkedIn URL';
      }

      if (formData.portfolio_url) {
        try {
          new URL(formData.portfolio_url);
        } catch {
          newErrors.portfolio_url = 'Please enter a valid URL';
        }
      }
    }

    if (step === 3) {
      // Motivation & Goals
      if (!formData.motivation || formData.motivation.trim().length < 100) {
        newErrors.motivation = 'Please provide at least 100 characters explaining your motivation';
      }

      if (formData.expected_clients && formData.expected_clients < 0) {
        newErrors.expected_clients = 'Expected clients cannot be negative';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = () => {
    if (validateStep(3)) {
      submitMutation.mutate(formData);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { number: 1, label: 'Personal Info' },
      { number: 2, label: 'Professional Info' },
      { number: 3, label: 'Motivation & Goals' },
    ];

    return (
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${currentStep >= step.number
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-200 dark:bg-slate-700 text-neutral-500 dark:text-slate-400'
                  }`}
              >
                {currentStep > step.number ? '✓' : step.number}
              </div>
              <span className="text-xs mt-2 text-neutral-600 dark:text-slate-400">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 rounded transition-all ${currentStep > step.number
                    ? 'bg-primary-600'
                    : 'bg-neutral-200 dark:bg-slate-700'
                  }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-slate-100 mb-6">
        Personal Information
      </h2>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
          Full Name *
        </label>
        <input
          type="text"
          value={formData.full_name}
          onChange={(e) => updateField('full_name', e.target.value)}
          placeholder="John Doe"
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100 ${errors.full_name ? 'border-red-500' : 'border-neutral-300 dark:border-slate-600'
            }`}
        />
        {errors.full_name && (
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.full_name}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
          Email Address *
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="john.doe@example.com"
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100 ${errors.email ? 'border-red-500' : 'border-neutral-300 dark:border-slate-600'
            }`}
        />
        {errors.email && (
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.email}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
          Phone Number *
        </label>
        <input
          type="tel"
          value={formData.phone_number}
          onChange={(e) => updateField('phone_number', e.target.value)}
          placeholder="+1 (555) 123-4567"
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100 ${errors.phone_number ? 'border-red-500' : 'border-neutral-300 dark:border-slate-600'
            }`}
        />
        {errors.phone_number && (
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.phone_number}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
          Company Name (Optional)
        </label>
        <input
          type="text"
          value={formData.company_name}
          onChange={(e) => updateField('company_name', e.target.value)}
          placeholder="ABC Realty Group"
          className="w-full px-4 py-2 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100"
        />
      </div>
    </div>
  );

  const renderProfessionalInfo = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-slate-100 mb-6">
        Professional Information
      </h2>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
          Specialization *
        </label>
        <select
          value={formData.specialization}
          onChange={(e) => updateField('specialization', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100 ${errors.specialization ? 'border-red-500' : 'border-neutral-300 dark:border-slate-600'
            }`}
        >
          <option value="">Select your specialization...</option>
          {SPECIALIZATIONS.map(spec => (
            <option key={spec} value={spec}>{spec}</option>
          ))}
        </select>
        {errors.specialization && (
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.specialization}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
          Years of Experience *
        </label>
        <input
          type="number"
          min="0"
          value={formData.years_of_experience}
          onChange={(e) => updateField('years_of_experience', parseInt(e.target.value) || 0)}
          placeholder="5"
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100 ${errors.years_of_experience ? 'border-red-500' : 'border-neutral-300 dark:border-slate-600'
            }`}
        />
        {errors.years_of_experience && (
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.years_of_experience}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
          License Number (Optional)
        </label>
        <input
          type="text"
          value={formData.license_number}
          onChange={(e) => updateField('license_number', e.target.value)}
          placeholder="RE-123456"
          className="w-full px-4 py-2 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100"
        />
        <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
          If you have a real estate license, please provide the number
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
          LinkedIn Profile (Optional)
        </label>
        <input
          type="url"
          value={formData.linkedin_url}
          onChange={(e) => updateField('linkedin_url', e.target.value)}
          placeholder="https://www.linkedin.com/in/yourprofile"
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100 ${errors.linkedin_url ? 'border-red-500' : 'border-neutral-300 dark:border-slate-600'
            }`}
        />
        {errors.linkedin_url && (
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.linkedin_url}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
          Portfolio Website (Optional)
        </label>
        <input
          type="url"
          value={formData.portfolio_url}
          onChange={(e) => updateField('portfolio_url', e.target.value)}
          placeholder="https://www.yourwebsite.com"
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100 ${errors.portfolio_url ? 'border-red-500' : 'border-neutral-300 dark:border-slate-600'
            }`}
        />
        {errors.portfolio_url && (
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.portfolio_url}</p>
        )}
      </div>
    </div>
  );

  const renderMotivationAndGoals = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-slate-100 mb-6">
        Motivation & Goals
      </h2>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
          Why do you want to become a broker on our platform? *
        </label>
        <textarea
          value={formData.motivation}
          onChange={(e) => updateField('motivation', e.target.value)}
          placeholder="Tell us about your motivation, experience, and how you can help clients invest in tokenized real estate..."
          rows={8}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100 ${errors.motivation ? 'border-red-500' : 'border-neutral-300 dark:border-slate-600'
            }`}
        />
        <div className="flex items-center justify-between mt-1">
          {errors.motivation && (
            <p className="text-red-600 dark:text-red-400 text-sm">{errors.motivation}</p>
          )}
          <p className={`text-sm ml-auto ${formData.motivation.length < 100
              ? 'text-red-600 dark:text-red-400'
              : 'text-neutral-500 dark:text-slate-400'
            }`}>
            {formData.motivation.length} / 100 minimum
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
          Target Market (Optional)
        </label>
        <input
          type="text"
          value={formData.target_market}
          onChange={(e) => updateField('target_market', e.target.value)}
          placeholder="e.g., High-net-worth individuals, International investors"
          className="w-full px-4 py-2 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100"
        />
        <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
          Describe your target client demographic
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
          Expected Clients in First Year (Optional)
        </label>
        <input
          type="number"
          min="0"
          value={formData.expected_clients || ''}
          onChange={(e) => updateField('expected_clients', parseInt(e.target.value) || 0)}
          placeholder="10"
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-slate-100 ${errors.expected_clients ? 'border-red-500' : 'border-neutral-300 dark:border-slate-600'
            }`}
        />
        {errors.expected_clients && (
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.expected_clients}</p>
        )}
      </div>

      {/* Terms & Conditions */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
          By submitting this application, you agree to:
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Follow our broker code of conduct and ethical guidelines</li>
          <li>• Provide accurate and honest information to all clients</li>
          <li>• Comply with all applicable real estate and securities regulations</li>
          <li>• Maintain active communication with referred clients</li>
          <li>• Accept our commission structure and payment terms</li>
        </ul>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-3xl font-bold text-neutral-900 dark:text-slate-100 mb-4">
        Application Submitted Successfully!
      </h2>

      <p className="text-neutral-600 dark:text-slate-400 mb-2">
        Thank you for applying to become a broker on our platform.
      </p>

      <p className="text-neutral-600 dark:text-slate-400 mb-8">
        We will review your application and contact you within 3-5 business days.
      </p>

      {applicationId && (
        <div className="bg-neutral-100 dark:bg-slate-800 rounded-lg p-4 mb-8 max-w-md mx-auto">
          <p className="text-sm text-neutral-600 dark:text-slate-400 mb-2">
            Application ID:
          </p>
          <p className="text-lg font-mono font-semibold text-neutral-900 dark:text-slate-100">
            {applicationId}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          Go to Dashboard
        </button>
        <br />
        {applicationId && (
          <button
            onClick={() => navigate(`/broker/application-status/${applicationId}`)}
            className="px-6 py-3 bg-neutral-200 dark:bg-slate-700 text-neutral-900 dark:text-slate-100 rounded-lg hover:bg-neutral-300 dark:hover:bg-slate-600 transition-colors font-medium"
          >
            Check Application Status
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 p-8">
        {/* Header */}
        {currentStep < 4 && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-slate-100 mb-2">
              Broker Application
            </h1>
            <p className="text-neutral-600 dark:text-slate-400">
              Join our network of professional real estate brokers and earn competitive commissions
            </p>
          </div>
        )}

        {/* Step Indicator */}
        {currentStep < 4 && renderStepIndicator()}

        {/* Form Content */}
        {currentStep === 1 && renderPersonalInfo()}
        {currentStep === 2 && renderProfessionalInfo()}
        {currentStep === 3 && renderMotivationAndGoals()}
        {currentStep === 4 && renderSuccess()}

        {/* Error Message */}
        {errors.submit && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{errors.submit}</p>
          </div>
        )}

        {/* Navigation Buttons */}
        {currentStep < 4 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-neutral-200 dark:border-slate-700">
            {currentStep > 1 ? (
              <button
                onClick={handleBack}
                className="px-6 py-2 border border-neutral-300 dark:border-slate-600 text-neutral-700 dark:text-slate-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-700 transition-colors font-medium"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-neutral-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrokerApplicationForm;
