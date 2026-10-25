import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Phone,
  AlertCircle,
  Check,
  Globe,
  Building,
  User,
  Shield
} from 'lucide-react';
import { Input } from '../components/design-system/forms/Input';
import { Select } from '../components/design-system/forms/Select';
import { Button } from '../components/ui/Button';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../utils/router';
import { AuthService, GoogleProfileCompletionData } from '../services/auth/AuthService';
import { UserRole } from '../services/api/types';
import { getLocalizedCountries } from '../utils/countries';
import { useTranslation } from 'react-i18next';

interface GoogleUserData {
  email: string;
  first_name: string;
  last_name: string;
  google_id: string;
}

interface ValidationErrors {
  [key: string]: string | undefined;
}

const USER_TYPES = [
  { value: UserRole.INVESTOR, label: 'register.roles.owner.title', desc: 'register.roles.owner.desc' },
  { value: UserRole.PROPERTY_OWNER, label: 'register.roles.propertyOwner.title', desc: 'register.roles.propertyOwner.desc' }
];

// Countries list now comes from `utils/countries.ts` (full ISO-3166 set).

export const CompleteGoogleProfilePage: React.FC = () => {
  const { setUser } = useAuth();
  const { t, i18n } = useTranslation('ui');
  const { navigate } = useRouter();

  const [googleUserData, setGoogleUserData] = useState<GoogleUserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const [formData, setFormData] = useState({
    phoneNumber: '',
    dateOfBirth: '',
    country: '',
    city: '',
    userRoles: [UserRole.INVESTOR] as UserRole[],
    agreeToTerms: false,
    agreeToPrivacy: false,
    agreeToMarketing: false
  });

  useEffect(() => {
    // Get Google user data from session storage
    const storedData = sessionStorage.getItem('googleUserData');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        setGoogleUserData(parsed);
      } catch {
        // Invalid data, redirect to login
        navigate('login');
      }
    } else {
      // No Google user data, redirect to login
      navigate('login');
    }
  }, [navigate]);

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = t('validation.phoneRequired');
    }

    if (!formData.country) {
      errors.country = t('validation.countryRequired');
    }

    if (!formData.city.trim()) {
      errors.city = t('validation.cityRequired');
    }

    if (formData.userRoles.length === 0) {
      errors.userRoles = t('validation.roleRequired');
    }

    if (!formData.agreeToTerms) {
      errors.agreeToTerms = t('validation.termsRequired');
    }

    if (!formData.agreeToPrivacy) {
      errors.agreeToPrivacy = t('validation.privacyRequired');
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !googleUserData) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const profileData: GoogleProfileCompletionData = {
        email: googleUserData.email,
        google_id: googleUserData.google_id,
        phone_number: formData.phoneNumber,
        date_of_birth: formData.dateOfBirth || undefined,
        country: formData.country,
        city: formData.city,
        roles: formData.userRoles,
        agree_to_terms: formData.agreeToTerms,
        agree_to_privacy: formData.agreeToPrivacy,
        agree_to_marketing: formData.agreeToMarketing
      };

      const response = await AuthService.completeGoogleProfile(profileData);

      // Update auth context with user
      setUser(response.user);

      // Clear session storage
      sessionStorage.removeItem('googleUserData');

      // Navigate to dashboard
      navigate('dashboard');
    } catch (err: any) {
      console.error('Profile completion failed:', err);
      setError(err.message || t('googleProfile.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : e.target.value;

    setFormData(prev => ({ ...prev, [field]: value }));

    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!googleUserData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <Navbar />

      <div className="pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 space-y-8"
          >
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
                <User className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                {t('googleProfile.title')}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {t('googleProfile.welcome', { name: googleUserData.first_name })}
              </p>
            </div>

            {/* Google Account Info */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                {googleUserData.first_name.charAt(0)}{googleUserData.last_name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {googleUserData.first_name} {googleUserData.last_name}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {googleUserData.email}
                </p>
              </div>
              <div className="ms-auto">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded-full">
                  <Check className="w-3 h-3" />
                  {t('googleProfile.verified')}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
              >
                <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
                <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Phone className="w-5 h-5 text-emerald-500" />
                  {t('googleProfile.contact')}
                </h3>

                <Input
                  type="tel"
                  label={t('fields.phone')}
                  placeholder={t('fields.phonePlaceholder')}
                  value={formData.phoneNumber}
                  onChange={handleInputChange('phoneNumber')}
                  leftIcon={<Phone className="w-5 h-5" />}
                  errorMessage={validationErrors.phoneNumber}
                  size="lg"
                  required
                />

                <Input
                  type="date"
                  label={t('googleProfile.dob')}
                  value={formData.dateOfBirth}
                  onChange={handleInputChange('dateOfBirth')}
                  errorMessage={validationErrors.dateOfBirth}
                  size="lg"
                />
              </div>

              {/* Location Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-emerald-500" />
                  {t('register.steps.location')}
                </h3>

                <Select
                  label={t('fields.country')}
                  placeholder={t('fields.countryPlaceholder')}
                  options={getLocalizedCountries(i18n.language)}
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  errorMessage={validationErrors.country}
                  required
                />

                <Input
                  label={t('fields.city')}
                  placeholder={t('fields.cityPlaceholder')}
                  value={formData.city}
                  onChange={handleInputChange('city')}
                  errorMessage={validationErrors.city}
                  size="lg"
                  required
                />
              </div>

              {/* Role Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  {t('register.selectRoles')}
                </h3>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-3">
                  {USER_TYPES.map(roleType => (
                    <label
                      key={roleType.value}
                      className="flex items-start gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 p-3 rounded-lg transition-colors"
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
                            userRoles: newRoles
                          }));
                          if (validationErrors.userRoles) {
                            setValidationErrors(prev => ({ ...prev, userRoles: undefined }));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-700 dark:text-slate-200">
                          {t(roleType.label)}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {t(roleType.desc)}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {formData.userRoles.length > 1 && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-300">
                      {t('register.switchRoles')}
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

              {/* Agreements */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-emerald-500" />
                  {t('googleProfile.terms')}
                </h3>

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
                      {t('register.agreePrefix')}{' '}
                      <a href="/terms" className="text-emerald-500 hover:text-emerald-600 dark:text-emerald-400">
                        {t('register.terms')}
                      </a>{' '}
                      {t('register.termsSuffix')}
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
                      {t('register.agreePrefix')}{' '}
                      <a href="/privacy" className="text-emerald-500 hover:text-emerald-600 dark:text-emerald-400">
                        {t('register.privacy')}
                      </a>{' '}
                      {t('register.privacySuffix')}
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
                      {t('register.marketing')}
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? t('googleProfile.completing') : t('googleProfile.complete')}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CompleteGoogleProfilePage;
