/**
 * Capimax RT floating chat assistant.
 *
 * A site-wide chat bubble (bottom-right) that talks to the n8n webhook.
 * Mounted once at the App level so it persists across in-app navigation.
 *
 * Protocol (see the integration spec):
 *   POST  <webhook>
 *   body  { action: 'sendMessage', sessionId, chatInput }
 *   resp  { output: '<assistant reply>' }
 *
 * The webhook keeps per-session memory (last ~12 messages) keyed by sessionId,
 * so we generate one stable id per browser and reuse it for the whole
 * conversation. "New chat" mints a fresh id and clears the transcript.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, Send, RefreshCw, Bot } from 'lucide-react';

const WEBHOOK_URL =
  import.meta.env.VITE_CHAT_WEBHOOK_URL ||
  'https://ai.capimaxgroup.com/webhook/capimax-rt/chat';

const SESSION_KEY = 'capimax_chat_session_id';
const HISTORY_KEY = 'capimax_chat_history';
const MAX_STORED = 50; // cap what we persist locally

type Role = 'user' | 'assistant';
interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  error?: boolean;
}

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: "Hi! I'm the Capimax RT assistant. Ask me anything about our properties, tokenized ownership, or getting started.",
};

// crypto.randomUUID isn't in every older browser; fall back gracefully.
function makeId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch (_) {
    /* noop */
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function loadSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const fresh = makeId();
    localStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch (_) {
    return makeId();
  }
}

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (_) {
    /* ignore corrupt history */
  }
  return [WELCOME];
}

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => loadSessionId());
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory());
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hasUnsent = useMemo(() => input.trim().length > 0, [input]);

  // Persist transcript (trimmed) so it survives a hard reload.
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
    } catch (_) {
      /* storage full / disabled — non-fatal */
    }
  }, [messages]);

  // Auto-scroll to the newest message.
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isSending]);

  // Focus the input when the panel opens.
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const startNewChat = () => {
    const fresh = makeId();
    try {
      localStorage.setItem(SESSION_KEY, fresh);
      localStorage.removeItem(HISTORY_KEY);
    } catch (_) {
      /* noop */
    }
    setSessionId(fresh);
    setMessages([WELCOME]);
    setInput('');
    inputRef.current?.focus();
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = { id: makeId(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendMessage',
          sessionId,
          chatInput: text,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json().catch(() => ({}));
      const reply =
        (typeof data?.output === 'string' && data.output.trim()) ||
        "Sorry, I couldn't come up with a reply just now. Please try again.";

      setMessages((prev) => [...prev, { id: makeId(), role: 'assistant', text: reply }]);
    } catch (_) {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: 'assistant',
          text: 'Sorry — I had trouble reaching the server. Please check your connection and try again.',
          error: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Launcher bubble — hidden while the panel is open */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="chat-launcher"
            initial={false}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => setIsOpen(true)}
            aria-label="Open Capimax RT assistant"
            className="fixed z-50 right-4 bottom-20 md:right-6 md:bottom-6 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-xl shadow-emerald-600/30 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-emerald-400/40"
          >
            <MessageCircle className="w-7 h-7" />
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white/90 border-2 border-emerald-500" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-panel"
            initial={false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed z-50 flex flex-col overflow-hidden bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 shadow-2xl
                       inset-x-3 bottom-20 top-16 rounded-2xl
                       md:inset-auto md:right-6 md:bottom-6 md:top-auto md:w-[384px] md:h-[600px] md:max-h-[80vh]"
            role="dialog"
            aria-label="Capimax RT assistant"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white shrink-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold leading-tight">Capimax RT Assistant</p>
                <p className="text-xs text-emerald-50/90 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                  Online
                </p>
              </div>
              <button
                onClick={startNewChat}
                aria-label="Start a new chat"
                title="New chat"
                className="p-2 rounded-lg hover:bg-white/15 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="p-2 rounded-lg hover:bg-white/15 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50 dark:bg-navy-900"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                      m.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-md'
                        : m.error
                        ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-bl-md'
                        : 'bg-white dark:bg-navy-800 text-navy-800 dark:text-slate-100 border border-slate-200 dark:border-navy-700 rounded-bl-md'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isSending && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 shadow-sm">
                    <span className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-2 h-2 rounded-full bg-navy-400 dark:bg-navy-500 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="p-3 border-t border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={1}
                  placeholder="Type your message…"
                  className="flex-1 resize-none max-h-32 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-navy-800 text-navy-800 dark:text-slate-100 placeholder:text-navy-400 border border-transparent focus:border-emerald-400 focus:bg-white dark:focus:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 text-sm"
                />
                <button
                  onClick={sendMessage}
                  disabled={!hasUnsent || isSending}
                  aria-label="Send message"
                  className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-600 text-white shrink-0 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-2 text-[11px] text-center text-navy-400 dark:text-navy-500">
                Powered by Capimax RT AI
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;
