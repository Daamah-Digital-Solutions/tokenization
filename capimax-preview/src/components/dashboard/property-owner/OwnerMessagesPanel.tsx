import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, Paperclip, Loader2, AlertCircle, Upload, FileText, Building2, CheckCircle } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { Button } from '../../ui/Button';
import { PropertyOwnerService } from '../../../services/property-owner/PropertyOwnerService';
import {
  OwnerMessagesService,
  OWNER_UPLOADABLE_DOC_TYPES,
  type OwnerMessage,
} from '../../../services/property-owner/OwnerMessagesService';

/**
 * Messages between the owner / developer and the platform team (client
 * round 3, #23): review notes, document requests, approval results,
 * publication notices — and the owner's replies and requested uploads.
 */

const GENERAL = '__general__';

const CATEGORY_STYLE: Record<string, string> = {
  changes_requested: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  document_request: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  approval_result: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  publication: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  review_note: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  general: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  reply: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
};

export const OwnerMessagesPanel: React.FC<{ initialPropertyId?: string | null }> = ({ initialPropertyId }) => {
  const { t, i18n } = useTranslation('owner');
  const isAr = (i18n.language || 'en').startsWith('ar');
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string>(initialPropertyId || GENERAL);
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [docType, setDocType] = useState<string>('ownership');
  const [uploading, setUploading] = useState(false);
  const attachRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useQuery({
    queryKey: ['owner-messages'],
    queryFn: () => OwnerMessagesService.list(),
    refetchInterval: 60_000,
  });
  const propertiesQuery = useQuery({
    queryKey: ['properties', 'owner'],
    queryFn: PropertyOwnerService.getOwnedProperties,
    staleTime: 5 * 60 * 1000,
  });

  const messages = messagesQuery.data?.results || [];

  // Conversations = every owned property + any property/general thread with messages.
  const threads = useMemo(() => {
    const map = new Map<string, { id: string; title: string; unread: number; last: string | null }>();
    (propertiesQuery.data || []).forEach((p: any) =>
      map.set(String(p.id), { id: String(p.id), title: p.title, unread: 0, last: null }));
    messages.forEach(m => {
      const id = m.property || GENERAL;
      const entry = map.get(id) || { id, title: m.property_title || t('messages.general'), unread: 0, last: null };
      if (!m.is_read) entry.unread += 1;
      if (!entry.last || m.created_at > entry.last) entry.last = m.created_at;
      map.set(id, entry);
    });
    if (!map.has(GENERAL)) map.set(GENERAL, { id: GENERAL, title: t('messages.general'), unread: 0, last: null });
    return Array.from(map.values()).sort((a, b) => (b.last || '').localeCompare(a.last || ''));
  }, [messages, propertiesQuery.data, t]);

  // Open the most recent conversation that actually has messages (unread
  // first) instead of an empty "General" thread.
  const autoSelected = useRef(false);
  useEffect(() => {
    if (autoSelected.current || initialPropertyId || !messages.length) return;
    autoSelected.current = true;
    const withUnread = threads.find(th => th.unread > 0);
    const withMessages = threads.find(th => th.last);
    const pick = withUnread || withMessages;
    if (pick) setSelected(pick.id);
  }, [messages.length, threads, initialPropertyId]);

  const thread = useMemo(
    () => messages
      .filter(m => (m.property || GENERAL) === selected)
      .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [messages, selected],
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['owner-messages'] });
    queryClient.invalidateQueries({ queryKey: ['properties', 'owner'] });
  }, [queryClient]);

  // Opening a conversation marks it read.
  useEffect(() => {
    const unread = thread.some(m => !m.is_read);
    if (unread) {
      OwnerMessagesService.markRead(selected === GENERAL ? null : selected).then(refresh).catch(() => undefined);
    }
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [selected, thread, refresh]);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(isAr ? 'ar' : 'en', { dateStyle: 'medium', timeStyle: 'short' });

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    setNotice(null);
    try {
      await OwnerMessagesService.send(selected === GENERAL ? null : selected, body.trim(), attachment);
      setBody('');
      setAttachment(null);
      setNotice({ tone: 'ok', text: t('messages.sent') });
      refresh();
    } catch {
      setNotice({ tone: 'err', text: t('messages.sendFailed') });
    } finally {
      setSending(false);
    }
  };

  const uploadDoc = async (file: File) => {
    if (selected === GENERAL) return;
    setUploading(true);
    setNotice(null);
    try {
      const label = t(`submit.documents.types.${docType}`);
      await OwnerMessagesService.uploadDocument(selected, docType, file, t(`submit.documents.types.${docType}`, { lng: 'en' }));
      await OwnerMessagesService.send(selected, `📎 ${label}: ${file.name}`);
      setNotice({ tone: 'ok', text: t('messages.uploaded') });
      refresh();
    } catch {
      setNotice({ tone: 'err', text: t('messages.uploadFailed') });
    } finally {
      setUploading(false);
    }
  };

  const roleLabel = (m: OwnerMessage) =>
    m.sender_role === 'owner' ? t('messages.you') : m.sender_role === 'system' ? t('messages.system') : t('messages.fromTeam');

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700">
      <div className="p-5 border-b border-neutral-200 dark:border-slate-700">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-slate-100 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-600" /> {t('messages.title')}
        </h2>
        <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">{t('messages.subtitle')}</p>
      </div>

      {messagesQuery.isError && (
        <div className="m-5 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {t('messages.loadFailed')}
        </div>
      )}

      <div className="grid md:grid-cols-[16rem_1fr] min-h-[28rem]">
        {/* Conversations */}
        <div className="border-b md:border-b-0 md:border-e border-neutral-200 dark:border-slate-700">
          <div className="md:hidden p-3">
            <select
              value={selected}
              onChange={e => setSelected(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
            >
              {threads.map(th => (
                <option key={th.id} value={th.id}>{th.title}{th.unread ? ` (${th.unread})` : ''}</option>
              ))}
            </select>
          </div>
          <ul className="hidden md:block max-h-[32rem] overflow-y-auto">
            {threads.map(th => (
              <li key={th.id}>
                <button
                  type="button"
                  onClick={() => setSelected(th.id)}
                  className={cn(
                    'w-full text-start px-4 py-3 flex items-center gap-2 border-b border-neutral-100 dark:border-slate-700/60',
                    selected === th.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-neutral-50 dark:hover:bg-slate-700/50',
                  )}
                >
                  {th.id === GENERAL ? <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" /> : <Building2 className="w-4 h-4 text-slate-400 shrink-0" />}
                  <span className="flex-1 min-w-0 truncate text-sm font-medium text-neutral-900 dark:text-slate-100">{th.title}</span>
                  {th.unread > 0 && (
                    <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
                      {th.unread}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Thread */}
        <div className="flex flex-col min-w-0">
          <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[28rem]">
            {messagesQuery.isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : thread.length === 0 ? (
              <p className="text-center text-sm text-neutral-500 dark:text-slate-400 py-12">{t('messages.empty')}</p>
            ) : (
              thread.map(m => {
                const mine = m.sender_role === 'owner';
                return (
                  <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3 border',
                      mine
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-neutral-50 dark:bg-slate-700/60 border-neutral-200 dark:border-slate-600 text-neutral-900 dark:text-slate-100',
                    )}>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={cn('text-xs font-semibold', mine ? 'text-emerald-50' : 'text-neutral-700 dark:text-slate-200')}>{roleLabel(m)}</span>
                        {!mine && (
                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', CATEGORY_STYLE[m.category] || CATEGORY_STYLE.general)}>
                            {t(`messages.categories.${m.category}`)}
                          </span>
                        )}
                        {!m.is_read && !mine && <span className="text-[10px] font-bold text-emerald-700">{t('messages.unread')}</span>}
                      </div>
                      {!mine && <p className="font-medium text-sm mb-1">{(isAr && m.subject_ar) || m.subject}</p>}
                      <p className="text-sm whitespace-pre-line break-words">{(isAr && m.body_ar) || m.body}</p>
                      {m.attachment_url && (
                        <a href={m.attachment_url} target="_blank" rel="noopener noreferrer"
                          className={cn('mt-2 inline-flex items-center gap-1 text-xs underline', mine ? 'text-emerald-50' : 'text-emerald-700 dark:text-emerald-400')}>
                          <FileText className="w-3.5 h-3.5" /> {t('messages.attach')}
                        </a>
                      )}
                      <p className={cn('mt-1.5 text-[11px]', mine ? 'text-emerald-100' : 'text-neutral-500 dark:text-slate-400')}>{fmt(m.created_at)}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {notice && (
            <div className={cn('mx-4 mb-2 p-2.5 rounded-lg text-sm flex items-center gap-2',
              notice.tone === 'ok' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300')}>
              {notice.tone === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {notice.text}
            </div>
          )}

          {selected !== GENERAL && (
            <div className="mx-4 mb-3 p-3 rounded-xl border border-dashed border-neutral-300 dark:border-slate-600">
              <p className="text-sm font-medium text-neutral-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4" /> {t('messages.uploadTitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value)}
                  aria-label={t('messages.uploadType')}
                  className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                >
                  {OWNER_UPLOADABLE_DOC_TYPES.map(type => (
                    <option key={type} value={type}>{t(`submit.documents.types.${type}`)}</option>
                  ))}
                </select>
                <Button variant="outline" size="sm" disabled={uploading} onClick={() => docRef.current?.click()}>
                  {uploading ? <Loader2 className="w-4 h-4 me-1.5 animate-spin" /> : <Upload className="w-4 h-4 me-1.5" />}
                  {uploading ? t('messages.uploading') : t('messages.uploadButton')}
                </Button>
                <input
                  ref={docRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) uploadDoc(file);
                  }}
                />
              </div>
            </div>
          )}

          <div className="border-t border-neutral-200 dark:border-slate-700 p-3">
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={2}
              placeholder={t('messages.replyPlaceholder')}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-neutral-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Button variant="ghost" size="sm" onClick={() => attachRef.current?.click()}>
                  <Paperclip className="w-4 h-4 me-1" /> {t('messages.attach')}
                </Button>
                {attachment && <span className="text-xs text-neutral-600 dark:text-slate-300 truncate">{attachment.name}</span>}
                <input ref={attachRef} type="file" className="hidden" onChange={e => setAttachment(e.target.files?.[0] || null)} />
              </div>
              <Button variant="primary" size="sm" onClick={send} disabled={sending || !body.trim()}>
                {sending ? <Loader2 className="w-4 h-4 me-1.5 animate-spin" /> : <Send className="w-4 h-4 me-1.5" />}
                {sending ? t('messages.sending') : t('messages.send')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerMessagesPanel;
