import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, User, Mail, Phone, Globe, DollarSign,
  CheckCircle, AlertCircle, Loader2, ChevronRight, ChevronLeft, FileUp, X
} from 'lucide-react';
import { apiClient } from '../../services/api/ApiClient';
import { useTranslation, Trans } from 'react-i18next';
import { useUser } from '../../contexts/AuthContext';
import { useRouter } from '../../utils/router';

interface LPApplicationFormData {
  // Entity Information
  legal_entity_name: string;
  country: string;
  jurisdiction: string;
  entity_type: 'company' | 'fund' | 'professional_individual';
  registration_number: string;
  website: string;

  // Contact Information
  contact_person_name: string;
  contact_position: string;
  official_email: string;
  phone_number: string;

  // Financial Information
  approximate_liquidity_available: string;
  preferred_currencies: string[];
  average_transaction_size: string;

  // Operating Policy
  target_ready_properties: boolean;
  target_under_construction: boolean;
  target_property_portfolios: boolean;
  expected_discount_rate: string;
  max_per_transaction: string;
  max_per_month: string;

  // Acknowledgments
  ack_independent_provider: boolean;
  ack_no_exit_guarantee: boolean;
  ack_compliance_agreement: boolean;
}

const initialFormData: LPApplicationFormData = {
  legal_entity_name: '',
  country: '',
  jurisdiction: '',
  entity_type: 'company',
  registration_number: '',
  website: '',
  contact_person_name: '',
  contact_position: '',
  official_email: '',
  phone_number: '',
  approximate_liquidity_available: '',
  preferred_currencies: [],
  average_transaction_size: '',
  target_ready_properties: true,
  target_under_construction: false,
  target_property_portfolios: false,
  expected_discount_rate: '',
  max_per_transaction: '',
  max_per_month: '',
  ack_independent_provider: false,
  ack_no_exit_guarantee: false,
  ack_compliance_agreement: false
};

const currencyOptions = ['USD', 'EUR', 'CRYPTO', 'OTHER'];

// Documents the team reviews (client round 4, #14). The first two are required.
const DOCUMENT_TYPES = [
  { type: 'certificate_of_incorporation', required: true },
  { type: 'director_id', required: true },
  { type: 'regulatory_license', required: false },
  { type: 'proof_of_address', required: false },
  { type: 'proof_of_funds', required: false },
  { type: 'aml_policy', required: false },
  { type: 'board_resolution', required: false },
] as const;
const ACCEPT = '.pdf,.jpg,.jpeg,.png';
const MAX_BYTES = 10 * 1024 * 1024;

const entityTypes = [
  { value: 'company', label: 'Company' },
  { value: 'fund', label: 'Investment Fund' },
  { value: 'professional_individual', label: 'Professional Individual' }
];

interface LPApplicationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const LPApplicationForm: React.FC<LPApplicationFormProps> = ({ onSuccess, onCancel }) => {
  const { t } = useTranslation('brokerui');
  const [formData, setFormData] = useState<LPApplicationFormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof LPApplicationFormData, string>>>({});
  const user = useUser();
  const { navigate } = useRouter();
  const [documents, setDocuments] = useState<Record<string, File | null>>({});
  const [docErrors, setDocErrors] = useState<Record<string, string>>({});

  const totalSteps = 6;

  const pickDocument = (type: string, file: File | null) => {
    if (file) {
      const ext = file.name.toLowerCase().split('.').pop() || '';
      if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
        setDocErrors(prev => ({ ...prev, [type]: t('lp.docs.badType') }));
        return;
      }
      if (file.size > MAX_BYTES) {
        setDocErrors(prev => ({ ...prev, [type]: t('lp.docs.tooBig') }));
        return;
      }
    }
    setDocErrors(prev => ({ ...prev, [type]: '' }));
    setDocuments(prev => ({ ...prev, [type]: file }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error for this field
    if (errors[name as keyof LPApplicationFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCurrencyToggle = (currency: string) => {
    setFormData(prev => ({
      ...prev,
      preferred_currencies: prev.preferred_currencies.includes(currency)
        ? prev.preferred_currencies.filter(c => c !== currency)
        : [...prev.preferred_currencies, currency]
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof LPApplicationFormData, string>> = {};

    if (step === 1) {
      if (!formData.legal_entity_name) newErrors.legal_entity_name = t('lp.required');
      if (!formData.country) newErrors.country = t('lp.required');
      if (!formData.jurisdiction) newErrors.jurisdiction = t('lp.required');
      if (!formData.registration_number) newErrors.registration_number = t('lp.required');
    }

    if (step === 2) {
      if (!formData.contact_person_name) newErrors.contact_person_name = t('lp.required');
      if (!formData.contact_position) newErrors.contact_position = t('lp.required');
      if (!formData.official_email) newErrors.official_email = t('lp.required');
      else if (!/\S+@\S+\.\S+/.test(formData.official_email)) newErrors.official_email = t('lp.invalidEmail');
      if (!formData.phone_number) newErrors.phone_number = t('lp.required');
    }

    if (step === 3) {
      if (!formData.approximate_liquidity_available) newErrors.approximate_liquidity_available = t('lp.required');
      if (formData.preferred_currencies.length === 0) newErrors.preferred_currencies = t('lp.selectOne');
      if (!formData.average_transaction_size) newErrors.average_transaction_size = t('lp.required');
    }

    if (step === 4) {
      if (!formData.expected_discount_rate) newErrors.expected_discount_rate = t('lp.required');
      if (!formData.max_per_transaction) newErrors.max_per_transaction = t('lp.required');
      if (!formData.max_per_month) newErrors.max_per_month = t('lp.required');
    }

    if (step === 5) {
      const missing: Record<string, string> = {};
      DOCUMENT_TYPES.filter(d => d.required && !documents[d.type]).forEach(d => {
        missing[d.type] = t('lp.docs.required');
      });
      setDocErrors(missing);
      if (Object.keys(missing).length) return false;
    }

    if (step === 6) {
      if (!formData.ack_independent_provider) newErrors.ack_independent_provider = t('lp.mustAcknowledge');
      if (!formData.ack_no_exit_guarantee) newErrors.ack_no_exit_guarantee = t('lp.mustAcknowledge');
      if (!formData.ack_compliance_agreement) newErrors.ack_compliance_agreement = t('lp.mustAgree');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // multipart: the form fields + the documents with their types
      const body = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'preferred_currencies') {
          (value as string[]).forEach(c => body.append(key, c));
        } else {
          body.append(key, typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value ?? ''));
        }
      });
      Object.entries(documents).forEach(([type, file]) => {
        if (file) {
          body.append('documents', file);
          body.append('document_types', type);
        }
      });

      await apiClient.uploadFile('/liquidity-provider/applications/', body);
      setSubmitSuccess(true);
      onSuccess?.();
    } catch (error: any) {
      const details = error?.details && typeof error.details === 'object'
        ? Object.values(error.details).flat().filter((v: any) => typeof v === 'string').join(' ')
        : '';
      const message = details || error.response?.data?.message || error.message || t('lp.errSubmit');
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12 px-6 bg-white dark:bg-slate-800 rounded-2xl"
      >
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          {t('lp.submittedTitle')}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          {t('lp.submittedDesc')}
        </p>
      </motion.div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {t('lp.entityInfo')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('lp.legalName')}
                </label>
                <input
                  type="text"
                  name="legal_entity_name"
                  value={formData.legal_entity_name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border ${errors.legal_entity_name ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  placeholder={t('lp.legalNamePh')}
                />
                {errors.legal_entity_name && <p className="text-red-500 text-sm mt-1">{errors.legal_entity_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('lp.entityType')}
                </label>
                <select
                  name="entity_type"
                  value={formData.entity_type}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {entityTypes.map(type => (
                    <option key={type.value} value={type.value}>{t(`lp.entity.${type.value}`, { defaultValue: type.label })}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('lp.country')}
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border ${errors.country ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  placeholder={t('lp.countryPh')}
                />
                {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('lp.jurisdiction')}
                </label>
                <input
                  type="text"
                  name="jurisdiction"
                  value={formData.jurisdiction}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border ${errors.jurisdiction ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  placeholder={t('lp.jurisdictionPh')}
                />
                {errors.jurisdiction && <p className="text-red-500 text-sm mt-1">{errors.jurisdiction}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('lp.registrationNumber')}
                </label>
                <input
                  type="text"
                  name="registration_number"
                  value={formData.registration_number}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border ${errors.registration_number ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  placeholder="CL-12345678"
                />
                {errors.registration_number && <p className="text-red-500 text-sm mt-1">{errors.registration_number}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('lp.website')}
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="https://www.example.com"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {t('lp.contactInfo')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('lp.contactName')}
                </label>
                <input
                  type="text"
                  name="contact_person_name"
                  value={formData.contact_person_name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border ${errors.contact_person_name ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  placeholder={t('lp.contactNamePh')}
                />
                {errors.contact_person_name && <p className="text-red-500 text-sm mt-1">{errors.contact_person_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('lp.position')}
                </label>
                <input
                  type="text"
                  name="contact_position"
                  value={formData.contact_position}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border ${errors.contact_position ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  placeholder={t('lp.positionPh')}
                />
                {errors.contact_position && <p className="text-red-500 text-sm mt-1">{errors.contact_position}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('lp.officialEmail')}
                </label>
                <input
                  type="email"
                  name="official_email"
                  value={formData.official_email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border ${errors.official_email ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  placeholder="contact@company.com"
                />
                {errors.official_email && <p className="text-red-500 text-sm mt-1">{errors.official_email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('lp.phone')}
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border ${errors.phone_number ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  placeholder="+971 50 123 4567"
                />
                {errors.phone_number && <p className="text-red-500 text-sm mt-1">{errors.phone_number}</p>}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {t('lp.financialInfo')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('lp.liquidity')}
                </label>
                <input
                  type="number"
                  name="approximate_liquidity_available"
                  value={formData.approximate_liquidity_available}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border ${errors.approximate_liquidity_available ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  placeholder="1000000"
                  min="0"
                />
                {errors.approximate_liquidity_available && <p className="text-red-500 text-sm mt-1">{errors.approximate_liquidity_available}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('lp.avgTxSize')}
                </label>
                <input
                  type="number"
                  name="average_transaction_size"
                  value={formData.average_transaction_size}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border ${errors.average_transaction_size ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  placeholder="50000"
                  min="0"
                />
                {errors.average_transaction_size && <p className="text-red-500 text-sm mt-1">{errors.average_transaction_size}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                {t('lp.currencies')}
              </label>
              <div className="flex flex-wrap gap-3">
                {currencyOptions.map(currency => (
                  <button
                    key={currency}
                    type="button"
                    onClick={() => handleCurrencyToggle(currency)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      formData.preferred_currencies.includes(currency)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                    }`}
                  >
                    {t(`lp.currency.${currency}`, { defaultValue: currency })}
                  </button>
                ))}
              </div>
              {errors.preferred_currencies && <p className="text-red-500 text-sm mt-2">{errors.preferred_currencies}</p>}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {t('lp.operatingPolicy')}
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                {t('lp.targetAssets')}
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="target_ready_properties"
                    checked={formData.target_ready_properties}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300">{t('lp.readyProps')}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="target_under_construction"
                    checked={formData.target_under_construction}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300">{t('lp.underConstruction')}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="target_property_portfolios"
                    checked={formData.target_property_portfolios}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300">{t('lp.portfolios')}</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('lp.discountRate')}
                </label>
                <input
                  type="number"
                  name="expected_discount_rate"
                  value={formData.expected_discount_rate}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border ${errors.expected_discount_rate ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  placeholder="5"
                  min="0"
                  max="100"
                  step="0.1"
                />
                {errors.expected_discount_rate && <p className="text-red-500 text-sm mt-1">{errors.expected_discount_rate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('lp.maxPerTx')}
                </label>
                <input
                  type="number"
                  name="max_per_transaction"
                  value={formData.max_per_transaction}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border ${errors.max_per_transaction ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  placeholder="100000"
                  min="0"
                />
                {errors.max_per_transaction && <p className="text-red-500 text-sm mt-1">{errors.max_per_transaction}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('lp.maxPerMonth')}
                </label>
                <input
                  type="number"
                  name="max_per_month"
                  value={formData.max_per_month}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border ${errors.max_per_month ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  placeholder="500000"
                  min="0"
                />
                {errors.max_per_month && <p className="text-red-500 text-sm mt-1">{errors.max_per_month}</p>}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{t('lp.docs.title')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('lp.docs.subtitle')}</p>
            </div>
            <div className="space-y-3">
              {DOCUMENT_TYPES.map(({ type, required }) => {
                const file = documents[type];
                return (
                  <div key={type} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {t(`lp.docs.types.${type}`)}
                        {required && <span className="text-red-500 ms-1">*</span>}
                      </span>
                      {file ? (
                        <span className="inline-flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 max-w-full">
                          <CheckCircle className="w-4 h-4 shrink-0" />
                          <span className="truncate max-w-[180px]" dir="ltr">{file.name}</span>
                          <button type="button" onClick={() => pickDocument(type, null)}
                                  className="text-slate-400 hover:text-red-500" aria-label={t('lp.docs.remove')}>
                            <X className="w-4 h-4" />
                          </button>
                        </span>
                      ) : (
                        <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
                          <FileUp className="w-4 h-4" />
                          {t('lp.docs.choose')}
                          <input type="file" accept={ACCEPT} className="hidden"
                                 onChange={e => pickDocument(type, e.target.files?.[0] || null)} />
                        </label>
                      )}
                    </div>
                    {docErrors[type] && <p className="text-red-500 text-xs mt-1">{docErrors[type]}</p>}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('lp.docs.hint')}</p>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {t('lp.acknowledgments')}
            </h3>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {t('lp.ackIntro')}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label className={`flex items-start gap-3 cursor-pointer p-4 rounded-lg border ${errors.ack_independent_provider ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                <input
                  type="checkbox"
                  name="ack_independent_provider"
                  checked={formData.ack_independent_provider}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
                <span className="text-slate-700 dark:text-slate-300 text-sm">
                  <Trans t={t} i18nKey="lp.ack1" components={{ strong: <strong /> }} />
                </span>
              </label>

              <label className={`flex items-start gap-3 cursor-pointer p-4 rounded-lg border ${errors.ack_no_exit_guarantee ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                <input
                  type="checkbox"
                  name="ack_no_exit_guarantee"
                  checked={formData.ack_no_exit_guarantee}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
                <span className="text-slate-700 dark:text-slate-300 text-sm">
                  <Trans t={t} i18nKey="lp.ack2" components={{ strong: <strong /> }} />
                </span>
              </label>

              <label className={`flex items-start gap-3 cursor-pointer p-4 rounded-lg border ${errors.ack_compliance_agreement ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                <input
                  type="checkbox"
                  name="ack_compliance_agreement"
                  checked={formData.ack_compliance_agreement}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
                <span className="text-slate-700 dark:text-slate-300 text-sm">
                  {t('lp.ack3')}
                </span>
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Progress Bar */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {t('lp.stepOf', { step: currentStep, total: totalSteps })}
          </span>
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {t('lp.percentComplete', { value: Math.round((currentStep / totalSteps) * 100) })}
          </span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
            className="h-full bg-emerald-600 rounded-full"
          />
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit}>
        <div className="p-6">
          {renderStep()}

          {submitError && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{submitError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-between">
          <button
            type="button"
            onClick={currentStep === 1 ? onCancel : handlePrev}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            {currentStep === 1 ? t('lp.cancel') : t('lp.previous')}
          </button>

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
            >
              {t('lp.next')}
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white font-medium rounded-lg transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('lp.submitting')}
                </>
              ) : (
                <>
                  {t('lp.submit')}
                  <CheckCircle className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default LPApplicationForm;
