import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, MapPin, Coins, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../utils/router';
import { apiClient } from '../services/api/ApiClient';
import { Input } from '../components/design-system/forms/Input';
import { Select } from '../components/design-system/forms/Select';
import { Button } from '../components/ui/Button';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';

interface FormData {
  title: string;
  description: string;
  property_type: string;
  property_category: string;
  total_value: string;
  token_price: string;
  total_tokens: string;
  expected_return: string;
  rental_yield: string;
  property_size: string;
  address: string;
  city: string;
  state: string;
  country: string;
  year_built: string;
  expected_completion_date: string;
}

const PROPERTY_TYPES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'mixed_use', label: 'Mixed Use' },
  { value: 'land', label: 'Land' },
];

const PROPERTY_CATEGORIES = [
  { value: 'ready_property', label: 'Ready (Income-Generating)' },
  { value: 'under_construction', label: 'Under Construction' },
];

const COUNTRIES = [
  { value: 'US', label: 'United States' }, { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' }, { value: 'AE', label: 'United Arab Emirates' },
  { value: 'SG', label: 'Singapore' }, { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' }, { value: 'FR', label: 'France' },
];

export const SubmitPropertyPage: React.FC = () => {
  const { state: authState } = useAuth();
  const { navigate } = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    property_type: 'residential',
    property_category: 'ready_property',
    total_value: '',
    token_price: '',
    total_tokens: '',
    expected_return: '',
    rental_yield: '',
    property_size: '',
    address: '',
    city: '',
    state: '',
    country: 'US',
    year_built: '',
    expected_completion_date: '',
  });

  const set = <K extends keyof FormData>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  // Auto-derive total_value from token_price * total_tokens — the backend
  // serializer enforces equality so we save the user a manual calculation.
  const handleTokensOrPriceChange = (key: 'token_price' | 'total_tokens') =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setForm(prev => {
        const next = { ...prev, [key]: v };
        const tp = parseFloat(next.token_price);
        const tt = parseFloat(next.total_tokens);
        if (!isNaN(tp) && !isNaN(tt) && tp > 0 && tt > 0) {
          next.total_value = (tp * tt).toFixed(2);
        }
        return next;
      });
    };

  const isUnderConstruction = form.property_category === 'under_construction';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSubmitting(true);

    try {
      // Required + numeric coercion. Empty strings → undefined so the
      // backend doesn't reject them as invalid decimals.
      const num = (s: string) => (s.trim() === '' ? undefined : Number(s));
      const payload: any = {
        title: form.title,
        description: form.description,
        property_type: form.property_type,
        property_category: form.property_category,
        total_value: num(form.total_value),
        token_price: num(form.token_price),
        total_tokens: num(form.total_tokens),
        expected_return: num(form.expected_return),
        rental_yield: num(form.rental_yield),
        property_size: num(form.property_size),
        address: form.address,
        city: form.city,
        state: form.state,
        country: form.country,
        year_built: num(form.year_built),
      };
      if (isUnderConstruction && form.expected_completion_date) {
        payload.expected_completion_date = form.expected_completion_date;
      }

      await apiClient.post('/properties/', payload);
      setSuccess(true);
      setTimeout(() => navigate('dashboard'), 2000);
    } catch (err: any) {
      const msg = err?.message || 'Failed to submit property. Please check your inputs and try again.';
      const details = err?.details;
      if (details && typeof details === 'object') {
        const flat = Object.entries(details)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' · ');
        setServerError(`${msg} (${flat})`);
      } else {
        setServerError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!authState.isAuthenticated) {
    navigate('login');
    return null;
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Submitted for review
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Your property is now in the approval queue. Redirecting to dashboard…
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Submit a New Property</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Tell us about the property — it'll go to the admin queue for review and tokenization.
                </p>
              </div>
            </div>

            {serverError && (
              <div className="flex gap-3 p-4 mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <span className="text-sm text-red-700 dark:text-red-300">{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Basic info</h2>
                <Input label="Title" placeholder="e.g. Marina Tower 12" value={form.title} onChange={set('title')} required />
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={set('description')}
                    rows={4}
                    required
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    placeholder="Describe the property, its location and what makes it a good investment."
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select label="Type" options={PROPERTY_TYPES} value={form.property_type} onChange={set('property_type')} required />
                  <Select label="Category" options={PROPERTY_CATEGORIES} value={form.property_category} onChange={set('property_category')} required />
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-emerald-500" /> Tokenization
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Token price (USD)" type="number" step="0.01" min="0.01" value={form.token_price} onChange={handleTokensOrPriceChange('token_price')} required />
                  <Input label="Total tokens" type="number" step="1" min="1" value={form.total_tokens} onChange={handleTokensOrPriceChange('total_tokens')} required />
                </div>
                <Input label="Total value (USD)" type="number" step="0.01" value={form.total_value} onChange={set('total_value')} required helperText="Auto-calculated from token price × total tokens. Adjust if needed." />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Expected annual return (%)" type="number" step="0.01" min="0" max="100" value={form.expected_return} onChange={set('expected_return')} />
                  <Input label="Rental yield (%)" type="number" step="0.01" min="0" max="100" value={form.rental_yield} onChange={set('rental_yield')} />
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-500" /> Location
                </h2>
                <Input label="Address" value={form.address} onChange={set('address')} required />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input label="City" value={form.city} onChange={set('city')} required />
                  <Input label="State / Region" value={form.state} onChange={set('state')} />
                  <Select label="Country" options={COUNTRIES} value={form.country} onChange={set('country')} required />
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Property specifics</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Size (m²)" type="number" step="0.01" min="0" value={form.property_size} onChange={set('property_size')} />
                  <Input label="Year built" type="number" min="1800" max="2100" value={form.year_built} onChange={set('year_built')} />
                </div>
                {isUnderConstruction && (
                  <Input label="Expected completion date" type="date" value={form.expected_completion_date} onChange={set('expected_completion_date')} />
                )}
              </section>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => navigate('dashboard')} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="lg" className="flex-1" isLoading={submitting} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit for Approval'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SubmitPropertyPage;
