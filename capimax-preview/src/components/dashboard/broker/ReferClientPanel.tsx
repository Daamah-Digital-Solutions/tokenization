/**
 * ReferClientPanel — the broker's "refer a client" action (client #6a).
 *
 * Generates a personal invite link (/register?ref=CODE). If the broker enters a
 * client email the referral is tagged to that prospect; either way the broker
 * gets a copyable link to send. When someone signs up through it and makes their
 * first purchase, the broker earns a referral commission (wired server-side).
 */

import React, { useState } from 'react';
import { Link2, Copy, Check, UserPlus, Loader2 } from 'lucide-react';
import { BrokerService } from '../../../services/broker/BrokerService';

interface ReferClientPanelProps {
  onCreated?: () => void;
}

export const ReferClientPanel: React.FC<ReferClientPanelProps> = ({ onCreated }) => {
  const [email, setEmail] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildLink = (code: string) =>
    `${window.location.origin}/register?ref=${encodeURIComponent(code)}`;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      let url = '';
      if (email.trim()) {
        const ref: any = await BrokerService.createReferral(email.trim());
        url = ref?.referral_code ? buildLink(ref.referral_code) : '';
      } else {
        const res: any = await BrokerService.generateReferralLink();
        url =
          res?.referral_url ||
          res?.referral_link ||
          (res?.referral_code ? buildLink(res.referral_code) : '');
      }
      if (!url) throw new Error('Could not create a referral link. Please try again.');
      setLink(url);
      onCreated?.();
    } catch (e: any) {
      setError(e?.message || 'Could not create a referral link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the link is still selectable in the field */
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-neutral-200 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-1">
        <UserPlus className="w-5 h-5 text-emerald-500" />
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">Refer a client</h3>
      </div>
      <p className="text-sm text-neutral-500 dark:text-slate-400 mb-4">
        Generate a personal invite link. When someone signs up through it and makes their first
        purchase, you earn a referral commission.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Client email (optional)"
          className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-neutral-900 dark:text-white"
        />
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 whitespace-nowrap"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
          Generate link
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>}

      {link && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-700">
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 bg-transparent text-sm text-neutral-700 dark:text-slate-300 outline-none min-w-0"
          />
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white whitespace-nowrap"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReferClientPanel;
