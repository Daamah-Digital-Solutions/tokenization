/**
 * Contact Us (client round 3, #12).
 *
 * The form used to be fake (it waited a second and showed "sent"). It now
 * posts to /support/contact/: the message is stored, emailed to the
 * Capimax team and acknowledged to the sender with a reference number.
 * Contact details are the platform's real ones (utils/company).
 */

import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Headphones, Loader2, Mail, MapPin, Phone, Send } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useRouter } from '../utils/router';
import { useUser } from '../contexts/AuthContext';
import { COMPANY } from '../utils/company';
import { SupportService } from '../services/support/SupportService';

const TOPICS = ['general', 'investment', 'account', 'payments', 'listing', 'partnership', 'media', 'other'] as const;
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

export const ContactPage: React.FC = () => {
  const { t, i18n } = useTranslation('site');
  const { navigate } = useRouter();
  const user: any = useUser();
  const [form, setForm] = useState({
    name: [user?.first_name, user?.last_name].filter(Boolean).join(' '),
    email: user?.email || '',
    phone: '',
    topic: 'general' as (typeof TOPICS)[number],
    subject: '',
    message: '',
    website: '',
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ reference: string; email: string } | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      setError(t('contact.form.required'));
      return;
    }
    if (!EMAIL_RE.test(form.email.trim())) {
      setError(t('contact.form.invalidEmail'));
      return;
    }
    setSending(true);
    try {
      const res = await SupportService.sendContact({ ...form, language: i18n.language?.slice(0, 2) || 'en' });
      setSent({ reference: res.reference, email: form.email.trim() });
    } catch (err: any) {
      setError(err?.message && !/^HTTP/.test(err.message) ? err.message : t('contact.form.error'));
    } finally {
      setSending(false);
    }
  };

  const [us1, us2, uk] = COMPANY.phones;
  const cards = [
    {
      icon: Mail,
      title: t('contact.cards.email'),
      body: <a href={`mailto:${COMPANY.email}`} dir="ltr" className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline">{COMPANY.email}</a>,
      hint: t('contact.cards.emailHint'),
    },
    {
      icon: Phone,
      title: t('contact.cards.phone'),
      body: (
        <div className="space-y-0.5">
          {[us1, us2, uk].map((p) => (
            <a key={p} href={telHref(p)} dir="ltr" className="block font-medium text-emerald-700 dark:text-emerald-400 hover:underline">{p}</a>
          ))}
        </div>
      ),
      hint: t('contact.cards.phoneHint'),
    },
    {
      icon: MapPin,
      title: t('contact.cards.office'),
      body: <span dir="ltr" className="text-slate-700 dark:text-slate-200">{COMPANY.address}</span>,
      hint: '',
    },
    {
      icon: Headphones,
      title: t('contact.cards.support'),
      body: (
        <button type="button" onClick={() => navigate('support')} className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
          {t('footer.links.support')}
        </button>
      ),
      hint: t('contact.cards.supportHint'),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Helmet>
        <title>{`${t('contact.badge')} | Capimax RT`}</title>
      </Helmet>
      <Navbar />

      <section className="pt-28 pb-12 bg-gradient-to-b from-emerald-50 to-transparent dark:from-emerald-950/30">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-4">
            {t('contact.badge')}
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">{t('contact.title')}</h1>
          <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">{t('contact.subtitle')}</p>
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cards.map(({ icon: Icon, title, body, hint }) => (
              <div key={title} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-slate-900 dark:text-white mb-1">{title}</h2>
                  <div className="text-sm">{body}</div>
                  {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8">
            {sent ? (
              <div className="text-center py-10">
                <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
                <p className="text-slate-700 dark:text-slate-200 max-w-md mx-auto mb-6">
                  {t('contact.form.sent', { email: sent.email, reference: sent.reference })}
                </p>
                <button
                  type="button"
                  onClick={() => { setSent(null); setForm((f) => ({ ...f, subject: '', message: '' })); }}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                  {t('contact.form.sendAnother')}
                </button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('contact.form.title')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('contact.form.name')} *</span>
                    <input className={inputClass} value={form.name} onChange={set('name')} autoComplete="name" maxLength={150} />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('contact.form.email')} *</span>
                    <input className={inputClass} type="email" dir="ltr" value={form.email} onChange={set('email')} autoComplete="email" />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('contact.form.phone')}</span>
                    <input className={inputClass} type="tel" dir="ltr" value={form.phone} onChange={set('phone')} autoComplete="tel" maxLength={40} />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('contact.form.topic')}</span>
                    <select className={inputClass} value={form.topic} onChange={set('topic')}>
                      {TOPICS.map((topic) => (
                        <option key={topic} value={topic}>{t(`contact.topics.${topic}`)}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('contact.form.subject')} *</span>
                  <input className={inputClass} value={form.subject} onChange={set('subject')} maxLength={200} />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('contact.form.message')} *</span>
                  <textarea className={`${inputClass} min-h-[150px]`} value={form.message} onChange={set('message')} maxLength={5000} />
                </label>
                {/* Honeypot for bots — hidden from people and screen readers. */}
                <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')}
                  className="hidden" aria-hidden="true" />
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                    {error}
                  </div>
                )}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('contact.form.privacy')}</p>
                  <button
                    type="submit"
                    disabled={sending}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {sending ? t('contact.form.sending') : t('contact.form.send')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;
