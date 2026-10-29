import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Building2, MapPin, Coins, AlertCircle, CheckCircle, ImagePlus, X as XIcon,
  FileText, Upload, EyeOff, MessageSquare,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../utils/router';
import { apiClient } from '../services/api/ApiClient';
import { Input } from '../components/design-system/forms/Input';
import { Select } from '../components/design-system/forms/Select';
import { Button } from '../components/ui/Button';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { getLocalizedCountries } from '../utils/countries';
import { cn } from '../utils/cn';

/**
 * Property submission (client round 3, #22 + #24).
 *
 * - Owners / developers now attach the property's documents (title deed,
 *   owner ID, permits, valuation, insurance, financial study, …) — the form
 *   used to accept only photos and data.
 * - Submitting never publishes: the page states clearly that the property
 *   stays hidden until the platform team reviews, approves and publishes it.
 */

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

interface ImagePreview {
  file: File;
  url: string;
}

type DocType =
  | 'ownership' | 'owner_identity' | 'company_registration' | 'permits'
  | 'valuation' | 'insurance' | 'financial' | 'other';

interface DocSlot {
  type: DocType;
  required: boolean | 'under_construction';
  multiple?: boolean;
}

const DOC_SLOTS: DocSlot[] = [
  { type: 'ownership', required: true },
  { type: 'owner_identity', required: true },
  { type: 'company_registration', required: false },
  { type: 'permits', required: 'under_construction' },
  { type: 'valuation', required: false },
  { type: 'insurance', required: false },
  { type: 'financial', required: false },
  { type: 'other', required: false, multiple: true },
];

const PROPERTY_TYPES = ['residential', 'commercial', 'industrial', 'mixed_use', 'land'];
const PROPERTY_CATEGORIES = ['ready_property', 'under_construction'];

const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_DOC_BYTES = 15 * 1024 * 1024;
const DOC_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export const SubmitPropertyPage: React.FC = () => {
  const { t, i18n } = useTranslation('owner');
  const lang = i18n.language || 'en';
  const isAr = lang.startsWith('ar');
  const { state: authState } = useAuth();
  const { navigate } = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputs = useRef<Partial<Record<DocType, HTMLInputElement | null>>>({});

  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'images' | 'documents'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [failedUploads, setFailedUploads] = useState(0);
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [docs, setDocs] = useState<Partial<Record<DocType, File[]>>>({});
  const [docError, setDocError] = useState<string | null>(null);

  const countries = useMemo(() => getLocalizedCountries(lang), [lang]);

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

  // total_value = token_price × total_tokens (the backend enforces equality).
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
  const isRequired = (slot: DocSlot) => slot.required === true || (slot.required === 'under_construction' && isUnderConstruction);

  // ------------------------------------------------------------ photos
  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const next: ImagePreview[] = [...images];
    for (const file of Array.from(fileList)) {
      if (next.length >= MAX_IMAGES) {
        setImageError(t('submit.photos.errors.max', { max: MAX_IMAGES }));
        break;
      }
      if (!file.type.startsWith('image/')) {
        setImageError(t('submit.photos.errors.notImage', { name: file.name }));
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setImageError(t('submit.photos.errors.tooLarge', { name: file.name }));
        continue;
      }
      next.push({ file, url: URL.createObjectURL(file) });
    }
    setImages(next);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleRemoveImage = (idx: number) => {
    setImages(current => {
      const removed = current[idx];
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return current.filter((_, i) => i !== idx);
    });
  };

  // ------------------------------------------------------------ documents
  const addDocs = (slot: DocSlot, fileList: FileList | null) => {
    setDocError(null);
    if (!fileList || fileList.length === 0) return;
    const accepted: File[] = [];
    for (const file of Array.from(fileList)) {
      if (!DOC_MIME.includes(file.type)) {
        setDocError(t('submit.documents.badType', { name: file.name }));
        continue;
      }
      if (file.size > MAX_DOC_BYTES) {
        setDocError(t('submit.documents.tooLarge', { name: file.name }));
        continue;
      }
      accepted.push(file);
    }
    if (!accepted.length) return;
    setDocs(prev => ({
      ...prev,
      [slot.type]: slot.multiple ? [...(prev[slot.type] || []), ...accepted].slice(0, 5) : [accepted[0]],
    }));
  };

  const removeDoc = (type: DocType, index: number) =>
    setDocs(prev => ({ ...prev, [type]: (prev[type] || []).filter((_, i) => i !== index) }));

  // ------------------------------------------------------------ submit
  const uploadAll = async (propertyId: string): Promise<number> => {
    let failures = 0;
    if (images.length) {
      setPhase('images');
      for (let i = 0; i < images.length; i += 1) {
        const fd = new FormData();
        fd.append('image', images[i].file);
        fd.append('is_primary', i === 0 ? 'true' : 'false');
        fd.append('order', String(i));
        try {
          await apiClient.uploadFile(`/properties/${propertyId}/images/`, fd);
        } catch {
          failures += 1;
        }
      }
    }
    const docEntries = Object.entries(docs) as Array<[DocType, File[]]>;
    if (docEntries.some(([, files]) => files.length)) {
      setPhase('documents');
      for (const [type, files] of docEntries) {
        for (const file of files) {
          const fd = new FormData();
          fd.append('document', file);
          fd.append('name', `${t(`submit.documents.types.${type}`, { lng: 'en' })} — ${file.name}`.slice(0, 250));
          fd.append('document_type', type);
          try {
            await apiClient.uploadFile(`/properties/${propertyId}/documents/`, fd);
          } catch {
            failures += 1;
          }
        }
      }
    }
    setPhase('idle');
    return failures;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const missing = DOC_SLOTS.filter(slot => isRequired(slot) && !(docs[slot.type] || []).length)
      .map(slot => t(`submit.documents.types.${slot.type}`));
    if (missing.length) {
      setDocError(t('submit.documents.missingRequired', { list: missing.join('، ') }));
      document.getElementById('documents-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setSubmitting(true);
    try {
      const num = (s: string) => (s.trim() === '' ? undefined : Number(s));
      const payload: Record<string, unknown> = {
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
        setFailedUploads(await uploadAll(propertyId));
      }
      setSuccess(true);
      window.scrollTo({ top: 0 });
    } catch (err: any) {
      const details = err?.details;
      let msg = err?.message && !String(err.message).startsWith('HTTP ') ? err.message : t('submit.errors.generic');
      if (details && typeof details === 'object') {
        const flat = Object.entries(details)
          .filter(([k]) => !['path', 'method', 'code'].includes(k))
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' · ');
        if (flat) msg = `${msg} (${flat})`;
      }
      setServerError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
      setPhase('idle');
    }
  };

  if (!authState.isAuthenticated) {
    navigate('login');
    return null;
  }

  const docCount = Object.values(docs).reduce((n, files) => n + (files?.length || 0), 0);

  if (success) {
    return (
      <div dir={isAr ? 'rtl' : 'ltr'} className="min-h-screen bg-white dark:bg-slate-900">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 pt-28 pb-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('success.title')}</h1>
            <p className="text-slate-600 dark:text-slate-400">
              {t('success.desc', { images: images.length, documents: docCount })}
            </p>
            {failedUploads > 0 && (
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{t('success.uploadFailures', { count: failedUploads })}</p>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 mb-6">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4">{t('success.nextTitle')}</h2>
            <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              {[1, 2, 3, 4].map(n => (
                <li key={n} className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-semibold">{n}</span>
                  <span>{t(`success.step${n}`)}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 mb-6">
            <h2 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> {t('success.messagesTitle')}
            </h2>
            <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">{t('success.messagesDesc')}</p>
            <Button variant="outline" onClick={() => navigate('dashboard', { view: 'messages' })}>
              {t('success.toMessages')}
            </Button>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <Button variant="ghost" onClick={() => navigate('dashboard')}>{t('success.toDashboard')}</Button>
            <Button onClick={() => navigate('dashboard', { view: 'my-properties' })}>{t('success.toMyProperties')}</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const busyLabel = phase === 'images' ? t('submit.buttons.uploadingImages')
    : phase === 'documents' ? t('submit.buttons.uploadingDocuments')
    : submitting ? t('submit.buttons.submitting') : t('submit.buttons.submit');

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-5 sm:p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('submit.title')}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('submit.subtitle')}</p>
              </div>
            </div>

            <div className="flex gap-3 p-4 mb-6 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <EyeOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">{t('submit.hiddenNotice')}</p>
            </div>

            {serverError && (
              <div role="alert" className="flex gap-3 p-4 mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <span className="text-sm text-red-700 dark:text-red-300">{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('submit.sections.basic')}</h2>
                <Input label={t('submit.fields.title')} placeholder={t('submit.fields.titlePlaceholder')} value={form.title} onChange={set('title')} required />
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('submit.fields.description')}</label>
                  <textarea
                    value={form.description}
                    onChange={set('description')}
                    rows={8}
                    required
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    placeholder={t('submit.fields.descriptionPlaceholder')}
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('common:richTextHint')}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select label={t('submit.fields.type')} options={PROPERTY_TYPES.map(v => ({ value: v, label: t(`submit.types.${v}`) }))} value={form.property_type} onChange={set('property_type')} required />
                  <Select label={t('submit.fields.category')} options={PROPERTY_CATEGORIES.map(v => ({ value: v, label: t(`submit.categories.${v}`) }))} value={form.property_category} onChange={set('property_category')} required />
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-emerald-500" /> {t('submit.sections.tokenization')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label={t('submit.fields.tokenPrice')} type="number" step="0.01" min="0.01" value={form.token_price} onChange={handleTokensOrPriceChange('token_price')} required />
                  <Input label={t('submit.fields.totalTokens')} type="number" step="1" min="1" value={form.total_tokens} onChange={handleTokensOrPriceChange('total_tokens')} required />
                </div>
                <Input label={t('submit.fields.totalValue')} type="number" step="0.01" value={form.total_value} onChange={set('total_value')} required helperText={t('submit.fields.totalValueHint')} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label={t('submit.fields.expectedReturn')} type="number" step="0.01" min="0" max="100" value={form.expected_return} onChange={set('expected_return')} />
                  <Input label={t('submit.fields.rentalYield')} type="number" step="0.01" min="0" max="100" value={form.rental_yield} onChange={set('rental_yield')} />
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-500" /> {t('submit.sections.location')}
                </h2>
                <Input label={t('submit.fields.address')} value={form.address} onChange={set('address')} required />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input label={t('submit.fields.city')} value={form.city} onChange={set('city')} required />
                  <Input label={t('submit.fields.state')} value={form.state} onChange={set('state')} />
                  <Select label={t('submit.fields.country')} options={countries} value={form.country} onChange={set('country')} required />
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('submit.sections.specifics')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label={t('submit.fields.size')} type="number" step="0.01" min="0" value={form.property_size} onChange={set('property_size')} />
                  <Input label={t('submit.fields.yearBuilt')} type="number" min="1800" max="2100" value={form.year_built} onChange={set('year_built')} />
                </div>
                {isUnderConstruction && (
                  <Input label={t('submit.fields.completionDate')} type="date" value={form.expected_completion_date} onChange={set('expected_completion_date')} required />
                )}
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <ImagePlus className="w-5 h-5 text-emerald-500" /> {t('submit.sections.photos')}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('submit.photos.hint', { max: MAX_IMAGES })}</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {images.map((img, idx) => (
                    <div key={img.url} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 end-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
                        aria-label={t('submit.photos.remove')}
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                      {idx === 0 && (
                        <span className="absolute bottom-1 start-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                          {t('submit.photos.cover')}
                        </span>
                      )}
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-emerald-400 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      <ImagePlus className="w-6 h-6 mb-1" />
                      <span className="text-xs">{t('submit.photos.add')}</span>
                    </button>
                  )}
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleAddImages} className="hidden" />
                {imageError && (
                  <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span className="text-sm text-amber-700 dark:text-amber-300">{imageError}</span>
                  </div>
                )}
              </section>

              <section id="documents-section" className="space-y-3 scroll-mt-24">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-500" /> {t('submit.sections.documents')}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('submit.documents.intro')}</p>
                <p className="text-xs text-slate-400">{t('submit.documents.formats')}</p>

                {docError && (
                  <div role="alert" className="flex gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span className="text-sm text-red-700 dark:text-red-300">{docError}</span>
                  </div>
                )}

                <div className="space-y-3">
                  {DOC_SLOTS.map(slot => {
                    const files = docs[slot.type] || [];
                    const required = isRequired(slot);
                    return (
                      <div
                        key={slot.type}
                        className={cn(
                          'rounded-xl border p-4',
                          files.length ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-900/10'
                            : 'border-slate-200 dark:border-slate-700',
                        )}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-slate-900 dark:text-white">{t(`submit.documents.types.${slot.type}`)}</p>
                              <span className={cn(
                                'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                                required ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                              )}>
                                {required ? t('submit.documents.required') : t('submit.documents.optional')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {t(`submit.documents.descs.${slot.type}`)}
                              {slot.required === 'under_construction' && !isUnderConstruction && ` · ${t('submit.documents.requiredUnderConstruction')}`}
                            </p>
                            {files.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {files.map((file, i) => (
                                  <li key={`${file.name}-${i}`} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span className="truncate">{file.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => removeDoc(slot.type, i)}
                                      className="text-xs text-red-600 hover:underline shrink-0"
                                    >
                                      {t('submit.documents.remove')}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => docInputs.current[slot.type]?.click()}
                          >
                            <Upload className="w-4 h-4 me-1.5" />
                            {files.length ? (slot.multiple ? t('submit.documents.addMore') : t('submit.documents.replace')) : t('submit.documents.choose')}
                          </Button>
                          <input
                            ref={el => { docInputs.current[slot.type] = el; }}
                            type="file"
                            accept={DOC_MIME.join(',')}
                            multiple={!!slot.multiple}
                            className="hidden"
                            onChange={e => {
                              addDocs(slot, e.target.files);
                              e.target.value = '';
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button type="button" variant="ghost" onClick={() => navigate('dashboard')} disabled={submitting}>
                  {t('submit.buttons.cancel')}
                </Button>
                <Button type="submit" variant="primary" size="lg" className="flex-1" isLoading={submitting} disabled={submitting}>
                  {busyLabel}
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
