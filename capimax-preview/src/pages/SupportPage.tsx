/**
 * Support center (client round 3, #13), modelled on the other Capimax
 * platforms: the AI assistant, WhatsApp / phone / email, common questions,
 * and — for signed-in users — support tickets with the full conversation.
 */

import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Bot, ChevronDown, Loader2, Mail, MessageCircle, Phone, Plus, Send, Ticket,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useRouter } from '../utils/router';
import { useUser } from '../contexts/AuthContext';
import { COMPANY, SUPPORT_WHATSAPP } from '../utils/company';
import { SupportService, type SupportTicket } from '../services/support/SupportService';

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';
const STATUS_TONE: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

export const SupportPage: React.FC = () => {
  const { t, i18n } = useTranslation('site');
  const { navigate } = useRouter();
  const user = useUser();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const faq = t('support.faq.items', { returnObjects: true }) as Array<{ q: string; a: string }>;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language?.startsWith('ar') ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const channels = [
    {
      icon: Bot, title: t('support.channels.assistant'), hint: t('support.channels.assistantHint'),
      action: <button type="button" onClick={() => window.dispatchEvent(new Event('capimax:open-assistant'))} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">{t('support.channels.assistantCta')}</button>,
    },
    {
      icon: MessageCircle, title: t('support.channels.whatsapp'), hint: t('support.channels.whatsappHint'),
      action: <a href={`https://wa.me/${SUPPORT_WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">{t('support.channels.whatsappCta')}</a>,
    },
    {
      icon: Phone, title: t('support.channels.phone'), hint: t('support.channels.phoneHint'),
      action: <div className="space-y-0.5">{COMPANY.phones.map((p) => <a key={p} href={telHref(p)} dir="ltr" className="block text-sm font-semibold text-emerald-600 hover:text-emerald-700">{p}</a>)}</div>,
    },
    {
      icon: Mail, title: t('support.channels.email'), hint: t('support.channels.emailHint'),
      action: <a href={`mailto:${COMPANY.email}`} dir="ltr" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 break-all">{COMPANY.email}</a>,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Helmet>
        <title>{`${t('support.badge')} | Capimax RT`}</title>
      </Helmet>
      <Navbar />

      <section className="pt-28 pb-10 bg-gradient-to-b from-emerald-50 to-transparent dark:from-emerald-950/30">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-4">
            {t('support.badge')}
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">{t('support.title')}</h1>
          <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">{t('support.subtitle')}</p>
        </div>
      </section>

      <section className="pb-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {channels.map(({ icon: Icon, title, hint, action }) => (
            <div key={title} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">{hint}</p>
              {action}
            </div>
          ))}
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Tickets */}
          <div className="lg:col-span-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            {user ? (
              <Tickets fmt={fmt} />
            ) : (
              <div className="text-center py-10">
                <Ticket className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t('support.tickets.title')}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{t('support.tickets.signIn')}</p>
                <div className="flex justify-center gap-3 flex-wrap">
                  <button type="button" onClick={() => navigate('login')} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5">
                    {t('support.tickets.signInCta')}
                  </button>
                  <button type="button" onClick={() => navigate('contact')} className="rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold px-5 py-2.5">
                    {t('support.channels.contactCta')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{t('support.faq.title')}</h2>
            <div className="space-y-2">
              {Array.isArray(faq) && faq.map((item, i) => (
                <div key={i} className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-3 p-4 text-start font-medium text-slate-900 dark:text-white"
                    aria-expanded={openFaq === i}
                  >
                    {item.q}
                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && <p className="px-4 pb-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{item.a}</p>}
                </div>
              ))}
            </div>
            <button type="button" onClick={() => navigate('faq')} className="mt-4 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
              {t('support.faq.all')}
            </button>
            <div className="mt-6 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 p-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('support.channels.contact')}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 mb-2">{t('support.channels.contactHint')}</p>
              <button type="button" onClick={() => navigate('contact')} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
                {t('support.channels.contactCta')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const Tickets: React.FC<{ fmt: (iso: string) => string }> = ({ fmt }) => {
  const { t } = useTranslation('site');
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'new' | string>('list');
  const [notice, setNotice] = useState<string | null>(null);
  const { data, isLoading, isError } = useQuery({ queryKey: ['support-tickets'], queryFn: SupportService.listTickets });
  const tickets = data?.tickets ?? [];

  if (view === 'new') {
    return (
      <NewTicket
        onCancel={() => setView('list')}
        onCreated={(ticket) => {
          queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
          setNotice(t('support.tickets.created', { reference: ticket.reference }));
          setView(ticket.id);
        }}
      />
    );
  }
  if (view !== 'list') {
    return <TicketThread id={view} fmt={fmt} notice={notice} onBack={() => { setNotice(null); setView('list'); }} />;
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('support.tickets.title')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('support.tickets.subtitle')}</p>
        </div>
        <button type="button" onClick={() => setView('new')} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2">
          <Plus className="w-4 h-4" />{t('support.tickets.new')}
        </button>
      </div>
      {isLoading ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : isError ? (
        <p className="py-8 text-center text-sm text-red-600">{t('support.tickets.loadError')}</p>
      ) : tickets.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">{t('support.tickets.empty')}</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {tickets.map((tk) => (
            <li key={tk.id}>
              <button type="button" onClick={() => setView(tk.id)} className="w-full flex items-center justify-between gap-3 py-3 text-start hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-lg">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate">{tk.subject}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span dir="ltr">{tk.reference}</span> · {t(`support.tickets.categories.${tk.category}`)} · {t('support.tickets.updated', { date: fmt(tk.updated_at) })}
                  </p>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_TONE[tk.status]}`}>
                  {t(`support.tickets.status.${tk.status}`)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const NewTicket: React.FC<{ onCancel: () => void; onCreated: (t: SupportTicket) => void }> = ({ onCancel, onCreated }) => {
  const { t } = useTranslation('site');
  const [form, setForm] = useState({ subject: '', category: 'other' as SupportTicket['category'], priority: 'low' as SupportTicket['priority'], details: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.details.trim()) return;
    setBusy(true);
    setError(null);
    try {
      onCreated(await SupportService.openTicket(form));
    } catch {
      setError(t('support.tickets.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />{t('support.tickets.back')}
      </button>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('support.tickets.new')}</h2>
      <label className="block">
        <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('support.tickets.subject')} *</span>
        <input className={inputClass} value={form.subject} maxLength={200} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('support.tickets.category')}</span>
          <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as SupportTicket['category'] })}>
            {(['investment', 'payments', 'account', 'technical', 'other'] as const).map((c) => (
              <option key={c} value={c}>{t(`support.tickets.categories.${c}`)}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('support.tickets.priority')}</span>
          <select className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as SupportTicket['priority'] })}>
            {(['low', 'medium', 'high'] as const).map((p) => (
              <option key={p} value={p}>{t(`support.tickets.priorities.${p}`)}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('support.tickets.details')} *</span>
        <textarea className={`${inputClass} min-h-[140px]`} value={form.details} maxLength={5000} onChange={(e) => setForm({ ...form, details: e.target.value })} />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy || !form.subject.trim() || !form.details.trim()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {busy ? t('support.tickets.submitting') : t('support.tickets.submit')}
      </button>
    </form>
  );
};

const TicketThread: React.FC<{ id: string; fmt: (iso: string) => string; notice: string | null; onBack: () => void }> = ({ id, fmt, notice, onBack }) => {
  const { t } = useTranslation('site');
  const queryClient = useQueryClient();
  const { data: ticket, isLoading } = useQuery({ queryKey: ['support-ticket', id], queryFn: () => SupportService.getTicket(id) });
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => setReply(''), [id]);

  const send = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      const updated = await SupportService.reply(id, reply.trim());
      queryClient.setQueryData(['support-ticket', id], updated);
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      setReply('');
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || !ticket) {
    return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }
  const bubbles = [
    { id: 'original', from_support: false, body: ticket.details, created_at: ticket.created_at },
    ...(ticket.messages || []),
  ];

  return (
    <div>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white mb-3">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />{t('support.tickets.back')}
      </button>
      {notice && <div className="mb-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-700 dark:text-emerald-300">{notice}</div>}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{ticket.subject}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <span dir="ltr">{ticket.reference}</span> · {t(`support.tickets.categories.${ticket.category}`)} · {t('support.tickets.opened', { date: fmt(ticket.created_at) })}
          </p>
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_TONE[ticket.status]}`}>
          {t(`support.tickets.status.${ticket.status}`)}
        </span>
      </div>
      <div className="space-y-3 max-h-[420px] overflow-y-auto pe-1">
        {bubbles.map((m) => (
          <div key={m.id} className={`flex ${m.from_support ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.from_support ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100' : 'bg-emerald-600 text-white'}`}>
              <p className="text-[11px] font-semibold opacity-80 mb-1">
                {m.from_support ? t('support.tickets.team') : t('support.tickets.you')} · {fmt(m.created_at)}
              </p>
              <p className="whitespace-pre-line leading-relaxed">{m.body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2 items-end">
        <textarea className={`${inputClass} min-h-[70px]`} value={reply} placeholder={t('support.tickets.reply')} maxLength={5000} onChange={(e) => setReply(e.target.value)} />
        <button type="button" onClick={send} disabled={busy || !reply.trim()} className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rtl:-scale-x-100" />}
          {t('support.tickets.send')}
        </button>
      </div>
    </div>
  );
};

export default SupportPage;
