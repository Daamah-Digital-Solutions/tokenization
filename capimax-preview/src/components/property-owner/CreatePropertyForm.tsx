import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PropertyService } from '../../services';
import type { Property, PropertyType, PropertyCategory } from '../../services/api/types';

interface FormData {
  // Basic Information
  title: string;
  description: string;
  property_type: PropertyType | '';
  property_category: PropertyCategory | '';

  // Financial Details
  total_value: string;
  token_price: string;
  total_tokens: string;
  expected_return: string;
  rental_yield: string;
  minimum_investment: string;

  // Location
  address: string;
  city: string;
  state: string;
  country: string;
  latitude: string;
  longitude: string;

  // Property Details
  property_size: string;
  year_built: string;

  // Construction Properties
  expected_completion_date: string;
  supports_installments: boolean;
  installment_period_months: string;

  // Ready Properties
  monthly_rental_income: string;
  occupancy_rate: string;
  rental_income_active: boolean;
}

interface FormErrors {
  [key: string]: string;
}

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'mixed_use', label: 'Mixed Use' },
  { value: 'land', label: 'Land' },
];

const PROPERTY_CATEGORIES: { value: PropertyCategory; label: string; description: string }[] = [
  {
    value: 'under_construction',
    label: 'Under Construction',
    description: 'Property currently being built with installment payment options',
  },
  {
    value: 'ready_property',
    label: 'Ready Property',
    description: 'Completed property generating rental income',
  },
];

const STEP_TITLES = ['Basic Information', 'Financial Details', 'Location & Details', 'Review & Submit'];

export const CreatePropertyForm: React.FC = () => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    property_type: '',
    property_category: '',
    total_value: '',
    token_price: '',
    total_tokens: '',
    expected_return: '',
    rental_yield: '',
    minimum_investment: '',
    address: '',
    city: '',
    state: '',
    country: '',
    latitude: '',
    longitude: '',
    property_size: '',
    year_built: '',
    expected_completion_date: '',
    supports_installments: false,
    installment_period_months: '',
    monthly_rental_income: '',
    occupancy_rate: '100',
    rental_income_active: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const createPropertyMutation = useMutation({
    mutationFn: (data: Partial<Property>) => PropertyService.createProperty(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', 'owner'] });
      // Show success message and redirect
      alert('Property created successfully! It has been submitted for approval.');
      window.location.href = '/property-owner/dashboard';
    },
    onError: (error: any) => {
      alert(`Failed to create property: ${error.message}`);
    },
  });

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};

    if (step === 0) {
      if (!formData.title.trim()) newErrors.title = 'Title is required';
      if (formData.title.length < 5) newErrors.title = 'Title must be at least 5 characters';
      if (!formData.description.trim()) newErrors.description = 'Description is required';
      if (formData.description.length < 50) newErrors.description = 'Description must be at least 50 characters';
      if (!formData.property_type) newErrors.property_type = 'Property type is required';
      if (!formData.property_category) newErrors.property_category = 'Property category is required';
    }

    if (step === 1) {
      if (!formData.total_value || parseFloat(formData.total_value) <= 0) {
        newErrors.total_value = 'Total value must be greater than 0';
      }
      if (!formData.token_price || parseFloat(formData.token_price) <= 0) {
        newErrors.token_price = 'Token price must be greater than 0';
      }
      if (!formData.total_tokens || parseInt(formData.total_tokens) <= 0) {
        newErrors.total_tokens = 'Total tokens must be greater than 0';
      }

      // Validate that total_value = token_price * total_tokens
      if (formData.total_value && formData.token_price && formData.total_tokens) {
        const calculatedValue = parseFloat(formData.token_price) * parseInt(formData.total_tokens);
        const totalValue = parseFloat(formData.total_value);
        if (Math.abs(calculatedValue - totalValue) > 0.01) {
          newErrors.total_value = 'Total value must equal token price × total tokens';
        }
      }

      if (!formData.expected_return || parseFloat(formData.expected_return) < 0) {
        newErrors.expected_return = 'Expected return is required';
      }

      if (formData.property_category === 'ready_property') {
        if (!formData.rental_yield || parseFloat(formData.rental_yield) < 0) {
          newErrors.rental_yield = 'Rental yield is required for ready properties';
        }
        if (formData.rental_income_active && (!formData.monthly_rental_income || parseFloat(formData.monthly_rental_income) <= 0)) {
          newErrors.monthly_rental_income = 'Monthly rental income is required when rental income is active';
        }
      }

      if (formData.property_category === 'under_construction') {
        if (!formData.expected_completion_date) {
          newErrors.expected_completion_date = 'Expected completion date is required for construction properties';
        }
        if (formData.supports_installments && (!formData.installment_period_months || parseInt(formData.installment_period_months) <= 0)) {
          newErrors.installment_period_months = 'Installment period is required when installments are supported';
        }
      }
    }

    if (step === 2) {
      if (!formData.address.trim()) newErrors.address = 'Address is required';
      if (!formData.city.trim()) newErrors.city = 'City is required';
      if (!formData.country.trim()) newErrors.country = 'Country is required';
      if (!formData.property_size || parseFloat(formData.property_size) <= 0) {
        newErrors.property_size = 'Property size is required';
      }
      if (!formData.year_built || parseInt(formData.year_built) < 1800 || parseInt(formData.year_built) > new Date().getFullYear() + 10) {
        newErrors.year_built = 'Year built must be between 1800 and ' + (new Date().getFullYear() + 10);
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEP_TITLES.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(currentStep)) {
      return;
    }

    // Prepare data for submission
    const propertyData: Partial<Property> = {
      title: formData.title,
      description: formData.description,
      property_type: formData.property_type as PropertyType,
      property_category: formData.property_category as PropertyCategory,
      total_value: parseFloat(formData.total_value),
      token_price: parseFloat(formData.token_price),
      total_tokens: parseInt(formData.total_tokens),
      expected_return: formData.expected_return ? parseFloat(formData.expected_return) : undefined,
      rental_yield: formData.rental_yield ? parseFloat(formData.rental_yield) : undefined,
      minimum_investment: formData.minimum_investment ? parseFloat(formData.minimum_investment) : undefined,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      country: formData.country,
      latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      property_size: formData.property_size ? parseFloat(formData.property_size) : undefined,
      year_built: formData.year_built ? parseInt(formData.year_built) : undefined,
    };

    // Add category-specific fields
    if (formData.property_category === 'under_construction') {
      propertyData.expected_completion_date = formData.expected_completion_date;
      propertyData.supports_installments = formData.supports_installments;
      if (formData.supports_installments) {
        propertyData.installment_period_months = parseInt(formData.installment_period_months);
      }
    } else if (formData.property_category === 'ready_property') {
      propertyData.rental_income_active = formData.rental_income_active;
      if (formData.rental_income_active) {
        propertyData.monthly_rental_income = parseFloat(formData.monthly_rental_income);
      }
      propertyData.occupancy_rate = parseFloat(formData.occupancy_rate);
    }

    createPropertyMutation.mutate(propertyData);
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {STEP_TITLES.map((title, index) => (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center flex-1">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all
                ${currentStep > index ? 'bg-green-500 text-white' :
                  currentStep === index ? 'bg-primary-600 text-white' :
                  'bg-neutral-200 text-neutral-500 dark:bg-slate-700 dark:text-slate-400'}
              `}>
                {currentStep > index ? '✓' : index + 1}
              </div>
              <span className={`mt-2 text-xs font-medium ${
                currentStep >= index ? 'text-neutral-900 dark:text-slate-100' : 'text-neutral-500 dark:text-slate-400'
              }`}>
                {title}
              </span>
            </div>
            {index < STEP_TITLES.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 transition-all ${
                currentStep > index ? 'bg-green-500' : 'bg-neutral-200 dark:bg-slate-700'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const renderStep0 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
          Property Title *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 ${
            errors.title ? 'border-red-500' : 'border-neutral-300'
          }`}
          placeholder="e.g., Luxury Apartment Complex - Manhattan"
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
          Description *
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={5}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 ${
            errors.description ? 'border-red-500' : 'border-neutral-300'
          }`}
          placeholder="Detailed description of your property..."
        />
        <p className="mt-1 text-sm text-neutral-500">Minimum 50 characters ({formData.description.length}/50)</p>
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
          Property Type *
        </label>
        <select
          name="property_type"
          value={formData.property_type}
          onChange={handleInputChange}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 ${
            errors.property_type ? 'border-red-500' : 'border-neutral-300'
          }`}
        >
          <option value="">Select property type</option>
          {PROPERTY_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
        {errors.property_type && <p className="mt-1 text-sm text-red-600">{errors.property_type}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
          Property Category *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROPERTY_CATEGORIES.map(category => (
            <div
              key={category.value}
              onClick={() => {
                setFormData(prev => ({ ...prev, property_category: category.value }));
                if (errors.property_category) {
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.property_category;
                    return newErrors;
                  });
                }
              }}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                formData.property_category === category.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-neutral-300 hover:border-primary-300 dark:border-slate-600 dark:hover:border-primary-500'
              }`}
            >
              <h4 className="font-semibold text-neutral-900 dark:text-slate-100 mb-1">{category.label}</h4>
              <p className="text-sm text-neutral-600 dark:text-slate-400">{category.description}</p>
            </div>
          ))}
        </div>
        {errors.property_category && <p className="mt-1 text-sm text-red-600">{errors.property_category}</p>}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
            Total Property Value ($) *
          </label>
          <input
            type="number"
            name="total_value"
            value={formData.total_value}
            onChange={handleInputChange}
            step="0.01"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 ${
              errors.total_value ? 'border-red-500' : 'border-neutral-300'
            }`}
            placeholder="5000000"
          />
          {errors.total_value && <p className="mt-1 text-sm text-red-600">{errors.total_value}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
            Token Price ($) *
          </label>
          <input
            type="number"
            name="token_price"
            value={formData.token_price}
            onChange={handleInputChange}
            step="0.01"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 ${
              errors.token_price ? 'border-red-500' : 'border-neutral-300'
            }`}
            placeholder="100"
          />
          {errors.token_price && <p className="mt-1 text-sm text-red-600">{errors.token_price}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
            Total Tokens *
          </label>
          <input
            type="number"
            name="total_tokens"
            value={formData.total_tokens}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 ${
              errors.total_tokens ? 'border-red-500' : 'border-neutral-300'
            }`}
            placeholder="50000"
          />
          {errors.total_tokens && <p className="mt-1 text-sm text-red-600">{errors.total_tokens}</p>}
        </div>
      </div>

      {formData.total_value && formData.token_price && formData.total_tokens && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Validation:</strong> ${parseFloat(formData.token_price).toFixed(2)} × {parseInt(formData.total_tokens).toLocaleString()} =
            ${(parseFloat(formData.token_price) * parseInt(formData.total_tokens)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            {Math.abs((parseFloat(formData.token_price) * parseInt(formData.total_tokens)) - parseFloat(formData.total_value)) < 0.01 ?
              ' ✓ Matches total value' : ' ⚠️ Should match total value'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
            Expected Return (%) *
          </label>
          <input
            type="number"
            name="expected_return"
            value={formData.expected_return}
            onChange={handleInputChange}
            step="0.01"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 ${
              errors.expected_return ? 'border-red-500' : 'border-neutral-300'
            }`}
            placeholder="8.5"
          />
          {errors.expected_return && <p className="mt-1 text-sm text-red-600">{errors.expected_return}</p>}
        </div>

        {formData.property_category === 'ready_property' && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
              Rental Yield (%) *
            </label>
            <input
              type="number"
              name="rental_yield"
              value={formData.rental_yield}
              onChange={handleInputChange}
              step="0.01"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 ${
                errors.rental_yield ? 'border-red-500' : 'border-neutral-300'
              }`}
              placeholder="6.0"
            />
            {errors.rental_yield && <p className="mt-1 text-sm text-red-600">{errors.rental_yield}</p>}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
            Minimum Investment ($)
          </label>
          <input
            type="number"
            name="minimum_investment"
            value={formData.minimum_investment}
            onChange={handleInputChange}
            step="0.01"
            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            placeholder="100"
          />
        </div>
      </div>

      {formData.property_category === 'ready_property' && (
        <div className="p-4 bg-neutral-50 dark:bg-slate-800 rounded-lg space-y-4">
          <h4 className="font-semibold text-neutral-900 dark:text-slate-100">Ready Property Settings</h4>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="rental_income_active"
              checked={formData.rental_income_active}
              onChange={handleInputChange}
              className="w-5 h-5"
            />
            <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">
              Property is actively generating rental income
            </label>
          </div>

          {formData.rental_income_active && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                  Monthly Rental Income ($) *
                </label>
                <input
                  type="number"
                  name="monthly_rental_income"
                  value={formData.monthly_rental_income}
                  onChange={handleInputChange}
                  step="0.01"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 ${
                    errors.monthly_rental_income ? 'border-red-500' : 'border-neutral-300'
                  }`}
                  placeholder="25000"
                />
                {errors.monthly_rental_income && <p className="mt-1 text-sm text-red-600">{errors.monthly_rental_income}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                  Occupancy Rate (%)
                </label>
                <input
                  type="number"
                  name="occupancy_rate"
                  value={formData.occupancy_rate}
                  onChange={handleInputChange}
                  step="0.01"
                  max="100"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                  placeholder="95"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {formData.property_category === 'under_construction' && (
        <div className="p-4 bg-neutral-50 dark:bg-slate-800 rounded-lg space-y-4">
          <h4 className="font-semibold text-neutral-900 dark:text-slate-100">Construction Property Settings</h4>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
              Expected Completion Date *
            </label>
            <input
              type="date"
              name="expected_completion_date"
              value={formData.expected_completion_date}
              onChange={handleInputChange}
              min={new Date().toISOString().split('T')[0]}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 ${
                errors.expected_completion_date ? 'border-red-500' : 'border-neutral-300'
              }`}
            />
            {errors.expected_completion_date && <p className="mt-1 text-sm text-red-600">{errors.expected_completion_date}</p>}
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="supports_installments"
              checked={formData.supports_installments}
              onChange={handleInputChange}
              className="w-5 h-5"
            />
            <label className="text-sm font-medium text-neutral-700 dark:text-slate-300">
              Support installment payments for investors
            </label>
          </div>

          {formData.supports_installments && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                Maximum Installment Period (months) *
              </label>
              <input
                type="number"
                name="installment_period_months"
                value={formData.installment_period_months}
                onChange={handleInputChange}
                max="120"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 ${
                  errors.installment_period_months ? 'border-red-500' : 'border-neutral-300'
                }`}
                placeholder="24"
              />
              {errors.installment_period_months && <p className="mt-1 text-sm text-red-600">{errors.installment_period_months}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
          Full Address *
        </label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleInputChange}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 ${
            errors.address ? 'border-red-500' : 'border-neutral-300'
          }`}
          placeholder="456 Park Avenue, New York, NY 10022"
        />
        {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
            City *
          </label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 ${
              errors.city ? 'border-red-500' : 'border-neutral-300'
            }`}
            placeholder="New York"
          />
          {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
            State/Province
          </label>
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            placeholder="NY"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
            Country *
          </label>
          <input
            type="text"
            name="country"
            value={formData.country}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 ${
              errors.country ? 'border-red-500' : 'border-neutral-300'
            }`}
            placeholder="USA"
          />
          {errors.country && <p className="mt-1 text-sm text-red-600">{errors.country}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
            Latitude (optional)
          </label>
          <input
            type="number"
            name="latitude"
            value={formData.latitude}
            onChange={handleInputChange}
            step="0.00000001"
            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            placeholder="40.7580"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
            Longitude (optional)
          </label>
          <input
            type="number"
            name="longitude"
            value={formData.longitude}
            onChange={handleInputChange}
            step="0.00000001"
            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            placeholder="-73.9855"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
            Property Size (sq ft) *
          </label>
          <input
            type="number"
            name="property_size"
            value={formData.property_size}
            onChange={handleInputChange}
            step="0.01"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 ${
              errors.property_size ? 'border-red-500' : 'border-neutral-300'
            }`}
            placeholder="45000"
          />
          {errors.property_size && <p className="mt-1 text-sm text-red-600">{errors.property_size}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
            Year Built *
          </label>
          <input
            type="number"
            name="year_built"
            value={formData.year_built}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 ${
              errors.year_built ? 'border-red-500' : 'border-neutral-300'
            }`}
            placeholder="2023"
          />
          {errors.year_built && <p className="mt-1 text-sm text-red-600">{errors.year_built}</p>}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="p-6 bg-neutral-50 dark:bg-slate-800 rounded-lg">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">Review Your Property</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-neutral-700 dark:text-slate-300 mb-2">Basic Information</h4>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-neutral-500 dark:text-slate-400">Title:</dt>
                <dd className="font-medium text-neutral-900 dark:text-slate-100">{formData.title}</dd>
              </div>
              <div>
                <dt className="text-neutral-500 dark:text-slate-400">Type:</dt>
                <dd className="font-medium text-neutral-900 dark:text-slate-100">{formData.property_type}</dd>
              </div>
              <div>
                <dt className="text-neutral-500 dark:text-slate-400">Category:</dt>
                <dd className="font-medium text-neutral-900 dark:text-slate-100">{formData.property_category}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h4 className="font-medium text-neutral-700 dark:text-slate-300 mb-2">Financial Details</h4>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-neutral-500 dark:text-slate-400">Total Value:</dt>
                <dd className="font-medium text-neutral-900 dark:text-slate-100">${parseFloat(formData.total_value).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-neutral-500 dark:text-slate-400">Token Price:</dt>
                <dd className="font-medium text-neutral-900 dark:text-slate-100">${parseFloat(formData.token_price).toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-neutral-500 dark:text-slate-400">Total Tokens:</dt>
                <dd className="font-medium text-neutral-900 dark:text-slate-100">{parseInt(formData.total_tokens).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-neutral-500 dark:text-slate-400">Expected Return:</dt>
                <dd className="font-medium text-neutral-900 dark:text-slate-100">{parseFloat(formData.expected_return).toFixed(2)}%</dd>
              </div>
            </dl>
          </div>

          <div>
            <h4 className="font-medium text-neutral-700 dark:text-slate-300 mb-2">Location</h4>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-neutral-500 dark:text-slate-400">Address:</dt>
                <dd className="font-medium text-neutral-900 dark:text-slate-100">{formData.address}</dd>
              </div>
              <div>
                <dt className="text-neutral-500 dark:text-slate-400">City:</dt>
                <dd className="font-medium text-neutral-900 dark:text-slate-100">{formData.city}, {formData.country}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h4 className="font-medium text-neutral-700 dark:text-slate-300 mb-2">Property Details</h4>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-neutral-500 dark:text-slate-400">Size:</dt>
                <dd className="font-medium text-neutral-900 dark:text-slate-100">{parseFloat(formData.property_size).toLocaleString()} sq ft</dd>
              </div>
              <div>
                <dt className="text-neutral-500 dark:text-slate-400">Year Built:</dt>
                <dd className="font-medium text-neutral-900 dark:text-slate-100">{formData.year_built}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Important:</strong> Your property will be submitted for admin review after creation.
          You can upload images and documents in the next step.
        </p>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-slate-100 mb-8">Create New Property</h1>

        {renderStepIndicator()}

        <form onSubmit={handleSubmit}>
          {currentStep === 0 && renderStep0()}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          <div className="flex justify-between mt-8">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-2 border border-neutral-300 dark:border-slate-600 text-neutral-700 dark:text-slate-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors"
              >
                Back
              </button>
            )}

            {currentStep < STEP_TITLES.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="ml-auto px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={createPropertyMutation.isPending}
                className="ml-auto px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-neutral-400 disabled:cursor-not-allowed transition-colors"
              >
                {createPropertyMutation.isPending ? 'Creating...' : 'Create Property'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePropertyForm;
