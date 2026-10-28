import React, { useEffect, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import { apiClient } from '../services/api/ApiClient';
import { useUser } from '../contexts/AuthContext';

// Documents the team reviews (client round 4, #14); PDF / JPG / PNG, 10 MB each.
const BROKER_DOCUMENTS = ['license', 'id_document', 'company_registration', 'proof_of_address', 'other'] as const;
const MAX_BYTES = 10 * 1024 * 1024;

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
  supportingDocuments: Record<string, File | null>;

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
  supportingDocuments: {},
  termsAccepted: false
};

export const BrokerApplicationPage: React.FC = () => {
  const { navigate } = useRouter();
  const { t } = useTranslation('brokerui');
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const user = useUser() as any;

  // The application belongs to the signed-in account (client round 4, #13):
  // its email is the account's, so approval upgrades this account.
  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({
        ...prev,
        email: user.email,
        firstName: prev.firstName || user.first_name || '',
        lastName: prev.lastName || user.last_name || '',
      }));
    }
  }, [user?.email]);

  const pickDocument = (type: string, file: File | null) => {
    if (file) {
      const ext = file.name.toLowerCase().split('.').pop() || '';
      if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
        setDocError(t('application.docs.badType'));
        return;
      }
      if (file.size > MAX_BYTES) {
        setDocError(t('application.docs.tooBig'));
        return;
      }
    }
    setDocError(null);
    setFormData(prev => ({ ...prev, supportingDocuments: { ...prev.supportingDocuments, [type]: file } }));
  };

  const steps = [
    {
      number: 1,
      title: t('application.steps.personal'),
      icon: User,
      description: t('application.steps.personalDesc')
    },
    {
      number: 2,
      title: t('application.steps.professional'),
      icon: Briefcase,
      description: t('application.steps.professionalDesc')
    },
    {
      number: 3,
      title: t('application.steps.agreements'),
      icon: FileText,
      description: t('application.steps.agreementsDesc')
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
      if (!formData.firstName) newErrors.firstName = t('application.err.firstName');
      if (!formData.lastName) newErrors.lastName = t('application.err.lastName');
      if (!formData.email) newErrors.email = t('application.err.email');
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = t('application.err.emailInvalid');
      if (!formData.phoneNumber) newErrors.phoneNumber = t('application.err.phone');
      if (!formData.country) newErrors.country = t('application.err.country');
      if (!formData.cityAddress) newErrors.cityAddress = t('application.err.cityAddress');
    }

    if (step === 2) {
      if (!formData.experienceLevel) newErrors.experienceLevel = t('application.err.experience');
      if (!formData.referralStrategy) newErrors.referralStrategy = t('application.err.strategy');
    }

    if (step === 3) {
      if (!formData.termsAccepted) newErrors.termsAccepted = t('application.err.terms');
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
    setSubmitError(null);
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

      Object.entries(formData.supportingDocuments).forEach(([type, file]) => {
        if (file) {
          formDataToSubmit.append('documents', file);
          formDataToSubmit.append('document_types', type);
        }
      });

      // through the shared client (signed in; the old fetch used an undefined base URL)
      await apiClient.uploadFile('/broker/applications/submit/', formDataToSubmit);
      setSubmitSuccess(true);
    } catch (error: any) {
      const details = error?.details && typeof error.details === 'object'
        ? Object.values(error.details).flat().filter((v: any) => typeof v === 'string').join(' ')
        : '';
      setSubmitError(details || error?.message || t('application.err.submit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Helmet>
          <title>{t('application.submittedMetaTitle')}</title>
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
                {t('application.successTitle')}
              </h1>

              <p className="text-gray-600 mb-8">
                {t('application.successDesc')}
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">{t('application.nextTitle')}</span>
                </div>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• {t('application.next1')}</li>
                  <li>• {t('application.next2')}</li>
                  <li>• {t('application.next3')}</li>
                </ul>
              </div>

              <div className="flex gap-4 justify-center">
                <Button onClick={() => navigate('home')} variant="outline">
                  {t('application.backHome')}
                </Button>
                <Button onClick={() => navigate('broker-program')}>
                  {t('application.learnMore')}
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
        <title>{t('application.metaTitle')}</title>
        <meta name="description" content={t('application.metaDescription')} />
      </Helmet>

      <Container className="py-8 pt-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t('application.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('application.subtitle')}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-8 start-0 end-0 h-0.5 bg-gray-200">
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('application.steps.personal')}</h2>
                    <p className="text-gray-600">{t('application.personalDesc')}</p>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('application.firstName')}
                        </label>
                        <Input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => updateFormData('firstName', e.target.value)}
                          className={errors.firstName ? 'border-red-500' : ''}
                          placeholder={t('application.firstNamePh')}
                        />
                        {errors.firstName && (
                          <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('application.lastName')}
                        </label>
                        <Input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => updateFormData('lastName', e.target.value)}
                          className={errors.lastName ? 'border-red-500' : ''}
                          placeholder={t('application.lastNamePh')}
                        />
                        {errors.lastName && (
                          <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('application.email')}
                      </label>
                      <div className="relative">
                        <Mail className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => updateFormData('email', e.target.value)}
                          readOnly={!!user?.email}
                          className={`ps-10 ${errors.email ? 'border-red-500' : ''} ${user?.email ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                          placeholder="john.doe@example.com"
                        />
                      </div>
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                      )}
                      {user?.email && (
                        <p className="text-xs text-gray-500 mt-1">{t('application.emailFromAccount')}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('application.phone')}
                      </label>
                      <div className="relative">
                        <Phone className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          type="tel"
                          value={formData.phoneNumber}
                          onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                          className={`ps-10 ${errors.phoneNumber ? 'border-red-500' : ''}`}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      {errors.phoneNumber && (
                        <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('application.country')}
                      </label>
                      <div className="relative">
                        <Globe className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          type="text"
                          value={formData.country}
                          onChange={(e) => updateFormData('country', e.target.value)}
                          className={`ps-10 ${errors.country ? 'border-red-500' : ''}`}
                          placeholder={t('application.countryPh')}
                        />
                      </div>
                      {errors.country && (
                        <p className="text-red-500 text-sm mt-1">{errors.country}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('application.cityAddress')}
                      </label>
                      <textarea
                        value={formData.cityAddress}
                        onChange={(e) => updateFormData('cityAddress', e.target.value)}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.cityAddress ? 'border-red-500' : ''
                        }`}
                        rows={3}
                        placeholder={t('application.cityAddressPh')}
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('application.steps.professional')}</h2>
                    <p className="text-gray-600">{t('application.professionalDesc')}</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('application.license')}
                      </label>
                      <Input
                        type="text"
                        value={formData.licenseNumber}
                        onChange={(e) => updateFormData('licenseNumber', e.target.value)}
                        placeholder={t('application.licensePh')}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        {t('application.licenseHint')}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('application.years')}
                      </label>
                      <select
                        value={formData.experienceLevel}
                        onChange={(e) => updateFormData('experienceLevel', e.target.value)}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.experienceLevel ? 'border-red-500' : ''
                        }`}
                      >
                        <option value="">{t('application.selectExperience')}</option>
                        <option value="0-1">{t('application.yearsRange', { value: '0-1' })}</option>
                        <option value="2-5">{t('application.yearsRange', { value: '2-5' })}</option>
                        <option value="5-10">{t('application.yearsRange', { value: '5-10' })}</option>
                        <option value="10+">{t('application.yearsRange', { value: '10+' })}</option>
                      </select>
                      {errors.experienceLevel && (
                        <p className="text-red-500 text-sm mt-1">{errors.experienceLevel}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('application.company')}
                      </label>
                      <Input
                        type="text"
                        value={formData.currentCompany}
                        onChange={(e) => updateFormData('currentCompany', e.target.value)}
                        placeholder={t('application.companyPh')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('application.strategy')}
                      </label>
                      <textarea
                        value={formData.referralStrategy}
                        onChange={(e) => updateFormData('referralStrategy', e.target.value)}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.referralStrategy ? 'border-red-500' : ''
                        }`}
                        rows={4}
                        placeholder={t('application.strategyPh')}
                      />
                      {errors.referralStrategy && (
                        <p className="text-red-500 text-sm mt-1">{errors.referralStrategy}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('application.documents')}
                      </label>
                      <div className="space-y-2">
                        {BROKER_DOCUMENTS.map((type) => {
                          const file = formData.supportingDocuments[type];
                          return (
                            <div key={type} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 p-3">
                              <span className="text-sm font-medium text-gray-700">{t(`application.docs.types.${type}`)}</span>
                              {file ? (
                                <span className="inline-flex items-center gap-2 text-sm text-green-700">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="truncate max-w-[180px]" dir="ltr">{file.name}</span>
                                  <button type="button" onClick={() => pickDocument(type, null)} className="text-gray-400 hover:text-red-500">×</button>
                                </span>
                              ) : (
                                <label className="inline-flex items-center gap-1.5 cursor-pointer px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                                  <Upload className="w-4 h-4" />
                                  {t('application.chooseFiles')}
                                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                                         onChange={(e) => pickDocument(type, e.target.files?.[0] || null)} />
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {docError && <p className="text-red-500 text-sm mt-2">{docError}</p>}
                      <p className="text-xs text-gray-500 mt-2">
                        {t('application.docs.formats')}
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('application.reviewTitle')}</h2>
                    <p className="text-gray-600">{t('application.reviewDesc')}</p>
                  </div>

                  {/* Application Summary */}
                  <div className="bg-gray-50 rounded-xl p-6 mb-8">
                    <h3 className="font-semibold text-gray-900 mb-4">{t('application.summary')}</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">{t('application.nameLabel')}</span>
                        <div className="font-medium">{formData.firstName} {formData.lastName}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">{t('application.emailLabel')}</span>
                        <div className="font-medium">{formData.email}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">{t('application.experienceLabel')}</span>
                        <div className="font-medium">{t('application.yearsRange', { value: formData.experienceLevel })}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">{t('application.countryLabel')}</span>
                        <div className="font-medium">{formData.country}</div>
                      </div>
                    </div>
                  </div>

                  {/* Terms and Conditions */}
                  <div className="space-y-6">
                    <div className="border border-gray-200 rounded-xl p-6">
                      <h4 className="font-semibold text-gray-900 mb-4">{t('application.termsTitle')}</h4>
                      <div className="text-sm text-gray-600 space-y-3 max-h-40 overflow-y-auto">
                        <p>{t('application.termsIntro')}</p>
                        <ul className="list-disc ps-5 space-y-1">
                          <li>{t('application.terms1')}</li>
                          <li>{t('application.terms2')}</li>
                          <li>{t('application.terms3')}</li>
                          <li>{t('application.terms4')}</li>
                          <li>{t('application.terms5')}</li>
                          <li>{t('application.terms6')}</li>
                          <li>{t('application.terms7')}</li>
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
                        {t('application.termsAccept')}
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
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                {t('application.previous')}
              </Button>

              {submitError && (
                <p className="text-red-600 text-sm flex-1 text-center px-2" role="alert">{submitError}</p>
              )}
              {currentStep < 3 ? (
                <Button
                  onClick={nextStep}
                  className="flex items-center gap-2"
                >
                  {t('application.next')}
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </Button>
              ) : (
                <Button
                  onClick={submitApplication}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? t('application.submitting') : t('application.submit')}
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