import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  User,
  Briefcase,
  FileText,
  Clock,
  Mail,
  Phone,
  Globe,
  Upload
} from 'lucide-react';
import { Container } from '../components/design-system/layout/Container';
import { Button } from '../components/ui/Button';
import { Input } from '../components/design-system/forms/Input';
import { useRouter } from '../utils/router';

interface FormData {
  // Step 1: Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  country: string;
  cityAddress: string;

  // Step 2: Professional Credentials
  licenseNumber: string;
  experienceLevel: string;
  currentCompany: string;
  referralStrategy: string;
  supportingDocuments: File | null;

  // Step 3: Agreements
  termsAccepted: boolean;
}

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  country: '',
  cityAddress: '',
  licenseNumber: '',
  experienceLevel: '',
  currentCompany: '',
  referralStrategy: '',
  supportingDocuments: null,
  termsAccepted: false
};

export const BrokerApplicationPage: React.FC = () => {
  const { navigate } = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const steps = [
    {
      number: 1,
      title: 'Personal Information',
      icon: User,
      description: 'Basic contact details'
    },
    {
      number: 2,
      title: 'Professional Credentials',
      icon: Briefcase,
      description: 'Experience and qualifications'
    },
    {
      number: 3,
      title: 'Agreements & Submission',
      icon: FileText,
      description: 'Terms and final review'
    }
  ];

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<FormData> = {};

    if (step === 1) {
      if (!formData.firstName) newErrors.firstName = 'First name is required';
      if (!formData.lastName) newErrors.lastName = 'Last name is required';
      if (!formData.email) newErrors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
      if (!formData.phoneNumber) newErrors.phoneNumber = 'Phone number is required';
      if (!formData.country) newErrors.country = 'Country is required';
      if (!formData.cityAddress) newErrors.cityAddress = 'City/Address is required';
    }

    if (step === 2) {
      if (!formData.experienceLevel) newErrors.experienceLevel = 'Experience level is required';
      if (!formData.referralStrategy) newErrors.referralStrategy = 'Referral strategy is required';
    }

    if (step === 3) {
      if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const submitApplication = async () => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    try {
      const formDataToSubmit = new FormData();

      // Append all form fields
      formDataToSubmit.append('first_name', formData.firstName);
      formDataToSubmit.append('last_name', formData.lastName);
      formDataToSubmit.append('email', formData.email);
      formDataToSubmit.append('phone_number', formData.phoneNumber);
      formDataToSubmit.append('country', formData.country);
      formDataToSubmit.append('city_address', formData.cityAddress);
      formDataToSubmit.append('license_number', formData.licenseNumber);
      formDataToSubmit.append('experience_level', formData.experienceLevel);
      formDataToSubmit.append('current_company', formData.currentCompany);
      formDataToSubmit.append('referral_strategy', formData.referralStrategy);
      formDataToSubmit.append('terms_accepted', 'true');

      if (formData.supportingDocuments) {
        formDataToSubmit.append('supporting_documents', formData.supportingDocuments);
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/broker/applications/submit/`, {
        method: 'POST',
        body: formDataToSubmit,
      });

      if (response.ok) {
        setSubmitSuccess(true);
      } else {
        const errorData = await response.json();
        console.error('Submission failed:', errorData);
        // Handle errors
      }
    } catch (error) {
      console.error('Error submitting application:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Helmet>
          <title>Application Submitted - Capimax Broker Program</title>
        </Helmet>

        <Container className="py-16 pt-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="bg-white rounded-3xl p-12 shadow-xl">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-10 h-10 text-green-600" />
              </motion.div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Application Submitted Successfully!
              </h1>

              <p className="text-gray-600 mb-8">
                Thank you for your interest in joining the Capimax Broker Partner Program.
                We have received your application and will review it within 2-3 business days.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">What happens next?</span>
                </div>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• Our team will review your application</li>
                  <li>• You'll receive an email notification with our decision</li>
                  <li>• If approved, we'll provide your broker account credentials</li>
                </ul>
              </div>

              <div className="flex gap-4 justify-center">
                <Button onClick={() => navigate('home')} variant="outline">
                  Back to Home
                </Button>
                <Button onClick={() => navigate('broker-program')}>
                  Learn More About Our Program
                </Button>
              </div>
            </div>
          </motion.div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Helmet>
        <title>Broker Application - Capimax Partner Program</title>
        <meta name="description" content="Join the Capimax Broker Partner Program. Submit your application to become a certified real estate tokenization broker." />
      </Helmet>

      <Container className="py-8 pt-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Broker Partner Application
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join our elite network of real estate tokenization brokers and unlock new opportunities
          </p>
        </div>

        {/* Progress Steps */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-8 left-0 right-0 h-0.5 bg-gray-200">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500"
                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              />
            </div>

            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;

              return (
                <div key={step.number} className="relative flex flex-col items-center">
                  <motion.div
                    className={`w-16 h-16 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                      isCompleted
                        ? 'bg-green-600 border-green-600 text-white'
                        : isActive
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                    whileHover={{ scale: 1.05 }}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                  </motion.div>

                  <div className="mt-4 text-center">
                    <div className={`font-medium ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>
                      {step.title}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {step.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
                    <p className="text-gray-600">Please provide your basic contact details</p>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          First Name *
                        </label>
                        <Input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => updateFormData('firstName', e.target.value)}
                          className={errors.firstName ? 'border-red-500' : ''}
                          placeholder="John"
                        />
                        {errors.firstName && (
                          <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Last Name *
                        </label>
                        <Input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => updateFormData('lastName', e.target.value)}
                          className={errors.lastName ? 'border-red-500' : ''}
                          placeholder="Doe"
                        />
                        {errors.lastName && (
                          <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => updateFormData('email', e.target.value)}
                          className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                          placeholder="john.doe@example.com"
                        />
                      </div>
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          type="tel"
                          value={formData.phoneNumber}
                          onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                          className={`pl-10 ${errors.phoneNumber ? 'border-red-500' : ''}`}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      {errors.phoneNumber && (
                        <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country of Residence *
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          type="text"
                          value={formData.country}
                          onChange={(e) => updateFormData('country', e.target.value)}
                          className={`pl-10 ${errors.country ? 'border-red-500' : ''}`}
                          placeholder="United States"
                        />
                      </div>
                      {errors.country && (
                        <p className="text-red-500 text-sm mt-1">{errors.country}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City / Address *
                      </label>
                      <textarea
                        value={formData.cityAddress}
                        onChange={(e) => updateFormData('cityAddress', e.target.value)}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.cityAddress ? 'border-red-500' : ''
                        }`}
                        rows={3}
                        placeholder="New York, NY 10001&#10;123 Main Street"
                      />
                      {errors.cityAddress && (
                        <p className="text-red-500 text-sm mt-1">{errors.cityAddress}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Professional Credentials</h2>
                    <p className="text-gray-600">Tell us about your experience and qualifications</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Real Estate License Number
                      </label>
                      <Input
                        type="text"
                        value={formData.licenseNumber}
                        onChange={(e) => updateFormData('licenseNumber', e.target.value)}
                        placeholder="Optional - Enter your license number if applicable"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        If you don't have a license yet, that's okay! We provide training.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Years of Experience *
                      </label>
                      <select
                        value={formData.experienceLevel}
                        onChange={(e) => updateFormData('experienceLevel', e.target.value)}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.experienceLevel ? 'border-red-500' : ''
                        }`}
                      >
                        <option value="">Select your experience level</option>
                        <option value="0-1">0-1 Years</option>
                        <option value="2-5">2-5 Years</option>
                        <option value="5-10">5-10 Years</option>
                        <option value="10+">10+ Years</option>
                      </select>
                      {errors.experienceLevel && (
                        <p className="text-red-500 text-sm mt-1">{errors.experienceLevel}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Brokerage/Company Name
                      </label>
                      <Input
                        type="text"
                        value={formData.currentCompany}
                        onChange={(e) => updateFormData('currentCompany', e.target.value)}
                        placeholder="Optional - Current employer or brokerage"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        How do you plan to refer clients? *
                      </label>
                      <textarea
                        value={formData.referralStrategy}
                        onChange={(e) => updateFormData('referralStrategy', e.target.value)}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.referralStrategy ? 'border-red-500' : ''
                        }`}
                        rows={4}
                        placeholder="Describe your strategy for referring clients to our tokenization platform. Include your network, marketing methods, and target audience."
                      />
                      {errors.referralStrategy && (
                        <p className="text-red-500 text-sm mt-1">{errors.referralStrategy}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Supporting Documents
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <div className="text-sm text-gray-600 mb-2">
                          Upload your license, company registration, or other relevant documents
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => updateFormData('supportingDocuments', e.target.files?.[0] || null)}
                          className="hidden"
                          id="documents"
                        />
                        <label
                          htmlFor="documents"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                        >
                          Choose Files
                        </label>
                        {formData.supportingDocuments && (
                          <div className="mt-2 text-sm text-green-600">
                            ✓ {formData.supportingDocuments.name}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Submit</h2>
                    <p className="text-gray-600">Please review your information and accept our terms</p>
                  </div>

                  {/* Application Summary */}
                  <div className="bg-gray-50 rounded-xl p-6 mb-8">
                    <h3 className="font-semibold text-gray-900 mb-4">Application Summary</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <div className="font-medium">{formData.firstName} {formData.lastName}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Email:</span>
                        <div className="font-medium">{formData.email}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Experience:</span>
                        <div className="font-medium">{formData.experienceLevel} Years</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Country:</span>
                        <div className="font-medium">{formData.country}</div>
                      </div>
                    </div>
                  </div>

                  {/* Terms and Conditions */}
                  <div className="space-y-6">
                    <div className="border border-gray-200 rounded-xl p-6">
                      <h4 className="font-semibold text-gray-900 mb-4">Broker Program Terms & Conditions</h4>
                      <div className="text-sm text-gray-600 space-y-3 max-h-40 overflow-y-auto">
                        <p>By applying to become a Capimax Broker Partner, you agree to:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Maintain professional standards in all client interactions</li>
                          <li>Follow all applicable real estate and financial regulations</li>
                          <li>Provide accurate information about our tokenization platform</li>
                          <li>Complete required training and certification programs</li>
                          <li>Maintain confidentiality of client and company information</li>
                          <li>Comply with our commission structure and payment terms</li>
                          <li>Report all transactions and referrals accurately</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={formData.termsAccepted}
                        onChange={(e) => updateFormData('termsAccepted', e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="terms" className="text-sm text-gray-700">
                        I have read and agree to the Broker Program Terms & Conditions *
                      </label>
                    </div>
                    {errors.termsAccepted && (
                      <p className="text-red-500 text-sm">{errors.termsAccepted}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </Button>

              {currentStep < 3 ? (
                <Button
                  onClick={nextStep}
                  className="flex items-center gap-2"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={submitApplication}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  <CheckCircle className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};