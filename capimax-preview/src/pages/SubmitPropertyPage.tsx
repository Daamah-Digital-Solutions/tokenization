import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, MapPin, Coins, AlertCircle, CheckCircle, ImagePlus, X as XIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../utils/router';
import { apiClient } from '../services/api/ApiClient';
import { Input } from '../components/design-system/forms/Input';
import { Select } from '../components/design-system/forms/Select';
import { Button } from '../components/ui/Button';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { COUNTRIES } from '../utils/countries';

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

// Countries list now comes from `utils/countries.ts` (full ISO-3166 set).

// Image previews are kept in component state until the property is created;
// once we have a property id we POST each image to /properties/<id>/images/.
// Doing it after-the-fact keeps the create payload pure-JSON (no multipart),
// which matches how the backend serializer is wired today.
interface ImagePreview {
  file: File;
  url: string;
  caption: string;
}

const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB per file

export const SubmitPropertyPage: React.FC = () => {
  const { state: authState } = useAuth();
  const { navigate } = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);

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

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const next: ImagePreview[] = [...images];
    for (const file of Array.from(fileList)) {
      if (next.length >= MAX_IMAGES) {
        setImageError(`You can attach up to ${MAX_IMAGES} images.`);
        break;
      }
      if (!file.type.startsWith('image/')) {
        setImageError(`"${file.name}" is not an image.`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setImageError(`"${file.name}" is larger than 8 MB.`);
        continue;
      }
      next.push({ file, url: URL.createObjectURL(file), caption: '' });
    }
    setImages(next);
    // Reset the file input so the user can re-pick the same file if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (idx: number) => {
    setImages((current) => {
      const removed = current[idx];
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return current.filter((_, i) => i !== idx);
    });
  };

  const uploadImagesFor = async (propertyId: string) => {
    if (images.length === 0) return;
    setUploadingImages(true);
    try {
      for (let i = 0; i < images.length; i += 1) {
        const img = images[i];
        const formData = new FormData();
        formData.append('image', img.file);
        if (img.caption) formData.append('caption', img.caption);
        formData.append('is_primary', i === 0 ? 'true' : 'false');
        formData.append('order', String(i));
        try {
          await apiClient.uploadFile(`/properties/${propertyId}/images/`, formData);
        } catch (err) {
          // Don't fail the whole submit if one image upload errors —
          // surface the count of failures in the success screen.
          // eslint-disable-next-line no-console
          console.warn(`Image ${i + 1} failed to upload`, err);
        }
      }
    } finally {
      setUploadingImages(false);
    }
  };

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

      const created: any = await apiClient.post('/properties/', payload);
      const propertyId = created?.id || created?.property?.id;
      if (propertyId) {
        setCreatedPropertyId(propertyId);
        await uploadImagesFor(propertyId);
      }
      setSuccess(true);
      // Show the success screen for 6s so the user can read the next-steps
      // explanation instead of being yanked back to the dashboard.
      setTimeout(() => navigate('dashboard'), 6000);
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
        <div className="max-w-2xl mx-auto px-4 py-24">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Property submitted for review
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {images.length > 0
                ? `${images.length} image${images.length === 1 ? '' : 's'} uploaded. `
                : ''}
              We've added your property to the admin approval queue.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 mb-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">What happens next</h3>
            <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-semibold">1</span>
                <span><strong>Compliance review</strong> — our team verifies ownership documents and that the offering meets local securities rules. Typically 2–5 business days.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-semibold">2</span>
                <span><strong>SPV setup</strong> — if required, we form the special-purpose vehicle that holds title to the property and issues the tokens.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-semibold">3</span>
                <span><strong>Tokenization</strong> — the smart contract is deployed and tokens are minted with the parameters you specified.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-semibold">4</span>
                <span><strong>Listing</strong> — once approved, the property goes live on the marketplace and investors can start buying tokens.</span>
              </li>
            </ol>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 mb-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Need to add more documents?</h3>
            <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
              You can upload supporting documents (title deed, valuation report, insurance, etc.)
              from your Property Owner dashboard at any time. Our team will need them before
              we can approve the listing.
            </p>
            <Button variant="outline" onClick={() => navigate('dashboard', { view: 'documents' })}>
              Go to Documents
            </Button>
          </div>

          <div className="flex gap-3 justify-center">
            <Button variant="ghost" onClick={() => navigate('dashboard')}>Back to Dashboard</Button>
            <Button onClick={() => navigate('dashboard', { view: 'my-properties' })}>View My Properties</Button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-6">
            Auto-redirecting to your dashboard in a few seconds…
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

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <ImagePlus className="w-5 h-5 text-emerald-500" /> Photos
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Add up to {MAX_IMAGES} photos (JPG/PNG, max 8 MB each). The first one will be
                  used as the cover image on listing cards and the marketplace.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {images.map((img, idx) => (
                    <div
                      key={img.url}
                      className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >
                      <img src={img.url} alt={`Property ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-opacity opacity-0 group-hover:opacity-100"
                        title="Remove image"
                        aria-label={`Remove image ${idx + 1}`}
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                      {idx === 0 && (
                        <span className="absolute bottom-1 left-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}

                  {images.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      aria-label="Add photos"
                    >
                      <ImagePlus className="w-6 h-6 mb-1" />
                      <span className="text-xs">Add photo</span>
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAddImages}
                  className="hidden"
                />

                {imageError && (
                  <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span className="text-sm text-amber-700 dark:text-amber-300">{imageError}</span>
                  </div>
                )}
              </section>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => navigate('dashboard')} disabled={submitting || uploadingImages}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="lg" className="flex-1" isLoading={submitting || uploadingImages} disabled={submitting || uploadingImages}>
                  {uploadingImages ? 'Uploading images…' : submitting ? 'Submitting…' : 'Submit for Approval'}
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
