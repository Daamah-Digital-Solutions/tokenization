/**
 * WalletPanel — the user's view of their two wallet slots.
 *
 * Behavior:
 *  - Always shows the primary wallet (custodial by default). Investors who
 *    paid with a card never have to understand MetaMask to see "their wallet"
 *    — it just exists.
 *  - Offers a "Link external wallet" CTA that pops MetaMask, asks the user
 *    to sign a verification message, and stores the address as the
 *    self-custody slot.
 *  - When external is linked, shows both addresses + an "Unlink" action.
 *  - Clipboard-copy each address.
 *
 * The sign-to-prove flow keeps the platform honest: we never accept a
 * raw address from the client without a signature recoverable to the
 * same address. See accounts/wallet_views.py for the verification side.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '../design-system/cards/Card';
import { WalletService } from '../../services/wallet/WalletService';
import type { WalletInfo, CustodialBalance } from '../../services/api/types';
import {
  connectWallet,
  detectInjectedWallet,
  signMessage,
  WalletConnectionError,
} from '../../utils/web3';
import { useAuth } from '../../contexts/AuthContext';

type Status = 'idle' | 'loading' | 'linking' | 'unlinking' | 'error';

interface WalletPanelProps {
  /** Optional class to override outer wrapper styles. */
  className?: string;
  /** If true, render without a Card wrapper (e.g. inside another panel). */
  bare?: boolean;
}

const WalletPanel: React.FC<WalletPanelProps> = ({ className = '', bare = false }) => {
  const { refreshUser } = useAuth();
  const [info, setInfo] = useState<WalletInfo | null>(null);
  const [balances, setBalances] = useState<CustodialBalance[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [withdrawingProperty, setWithdrawingProperty] = useState<string | null>(null);
  const [lastWithdrawTx, setLastWithdrawTx] = useState<{ propertyId: string; hash: string } | null>(null);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [walletData, balanceRows] = await Promise.all([
        WalletService.getWalletInfo(),
        WalletService.getCustodialBalances().catch(() => []),
      ]);
      setInfo(walletData);
      setBalances(balanceRows);
      setStatus('idle');
    } catch (e: any) {
      setError(e?.message || 'Failed to load wallet info.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard refused — fall through silently */
    }
  }, []);

  const handleLink = useCallback(async () => {
    setError(null);
    const injected = detectInjectedWallet();
    if (!injected) {
      setError(
        'No browser wallet detected. Install MetaMask (or another EVM wallet) and try again.'
      );
      return;
    }
    setStatus('linking');
    try {
      const conn = await connectWallet(injected);
      const result = await WalletService.linkExternalWallet(
        conn.address,
        async (msg) => signMessage(injected, conn.address, msg),
      );
      // Refresh server-side data + the global auth user so dashboards
      // pick up the new external_wallet_address.
      await Promise.all([refresh(), refreshUser?.()]);
      setError(null);
      return result;
    } catch (e: any) {
      if (e instanceof WalletConnectionError && e.code === 'USER_REJECTED') {
        setError('Connection cancelled.');
      } else {
        setError(e?.message || 'Failed to link wallet.');
      }
      setStatus('idle');
    }
  }, [refresh, refreshUser]);

  const handleUnlink = useCallback(async () => {
    setError(null);
    setStatus('unlinking');
    try {
      await WalletService.unlinkExternalWallet();
      await Promise.all([refresh(), refreshUser?.()]);
    } catch (e: any) {
      setError(e?.message || 'Failed to unlink wallet.');
      setStatus('idle');
    }
  }, [refresh, refreshUser]);

  const handleWithdraw = useCallback(
    async (row: CustodialBalance) => {
      setError(null);
      setLastWithdrawTx(null);
      const tokens = parseInt(row.custodial_balance, 10) || 0;
      if (tokens <= 0) {
        setError('Nothing to withdraw for this property.');
        return;
      }
      const ok = window.confirm(
        `Withdraw ${tokens} token${tokens === 1 ? '' : 's'} of "${row.property_title}" ` +
          `to your external wallet?\n\nThis sends an on-chain transaction signed by ` +
          `the Capimax custody system. Gas is paid by the platform.`,
      );
      if (!ok) return;
      setWithdrawingProperty(row.property_id);
      try {
        const result = await WalletService.withdrawTokens(row.property_id);
        setLastWithdrawTx({
          propertyId: row.property_id,
          hash: result.transaction_hash,
        });
        await refresh();
      } catch (e: any) {
        setError(e?.message || 'Withdrawal failed.');
      } finally {
        setWithdrawingProperty(null);
      }
    },
    [refresh],
  );

  const body = (
    <div className="space-y-5">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Your Capimax Wallet
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Where your property tokens are minted.
        </p>
      </header>

      {/* Primary wallet (custodial in the common case) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {info?.primary_kind === 'external'
              ? 'Primary wallet (self-custody)'
              : 'Primary wallet (platform-managed)'}
          </span>
          {info?.primary_kind === 'custodial' && (
            <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              No setup required
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3">
          <code className="flex-1 break-all font-mono text-sm text-slate-700 dark:text-slate-300">
            {status === 'loading'
              ? 'Loading…'
              : info?.primary_wallet || 'Not yet assigned'}
          </code>
          {info?.primary_wallet && (
            <button
              type="button"
              onClick={() => handleCopy(info.primary_wallet!)}
              className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label="Copy primary wallet address"
            >
              {copied === info.primary_wallet ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
        {info?.custody_explanation && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {info.custody_explanation}
          </p>
        )}
      </section>

      {/* External wallet — optional self-custody slot */}
      <section className="space-y-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          External wallet (optional)
        </span>

        {info?.has_external && info.external_wallet ? (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3">
            <code className="flex-1 break-all font-mono text-sm text-slate-700 dark:text-slate-300">
              {info.external_wallet}
            </code>
            <button
              type="button"
              onClick={() => handleCopy(info.external_wallet!)}
              className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {copied === info.external_wallet ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={handleUnlink}
              disabled={status === 'unlinking'}
              className="rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-900/30"
            >
              {status === 'unlinking' ? 'Unlinking…' : 'Unlink'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Link a self-custody wallet (MetaMask, hardware wallet, etc.) if
              you want crypto-paid investments to land directly in it, or to
              later withdraw your tokens from Capimax custody.
            </p>
            <button
              type="button"
              onClick={handleLink}
              disabled={status === 'linking'}
              className="self-start rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {status === 'linking' ? 'Waiting for wallet…' : 'Link external wallet'}
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You'll be asked to sign a verification message — no gas, no funds
              are moved.
            </p>
          </div>
        )}
      </section>

      {/* Custodial holdings — per-property balances + withdraw to external */}
      {info?.has_external && balances.length > 0 && (
        <section className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Custodial holdings
          </span>
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2 text-left">Property</th>
                  <th className="px-4 py-2 text-right">In custody</th>
                  <th className="px-4 py-2 text-right">In your wallet</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {balances.map((row) => {
                  const inCustody = parseInt(row.custodial_balance, 10) || 0;
                  const external = parseInt(row.external_balance, 10) || 0;
                  const busy = withdrawingProperty === row.property_id;
                  return (
                    <tr
                      key={row.property_id}
                      className="border-t border-slate-200 dark:border-slate-800"
                    >
                      <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                        {row.property_title}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                        {inCustody}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {external}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleWithdraw(row)}
                          disabled={busy || inCustody <= 0}
                          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                        >
                          {busy ? 'Withdrawing…' : 'Withdraw'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {lastWithdrawTx && (
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Withdrawal broadcast.{' '}
              <a
                href={`https://testnet.bscscan.com/tx/${lastWithdrawTx.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline"
              >
                View on BscScan ↗
              </a>
            </p>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tokens currently held in the platform-managed custodial wallet
            can be moved to your linked external wallet anytime. Gas is
            paid by the platform.
          </p>
        </section>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {error}
        </p>
      )}
    </div>
  );

  if (bare) return <div className={className}>{body}</div>;

  return (
    <Card variant="elevated" size="md" radius="xl" className={className}>
      {body}
    </Card>
  );
};

export default WalletPanel;
