/**
 * Investor documents per property (client edits #3 + #8), shown under
 * Reports & Documents (client round 4, #4):
 *   - the purchase receipt,
 *   - any subscription-agreement PDF,
 *   - the property's Data Room documents (valuation / insurance / ownership …).
 * Ownership certificates are real records now and live in My Certificates.
 */

import React, { useEffect, useState } from 'react';
import {
  FileText, Download, ShieldCheck, Building2, ScrollText, FileCheck2,
  RefreshCw, FolderOpen, ReceiptText,
} from 'lucide-react';
import {
  DocumentService,
  type InvestorPropertyDocuments,
  type InvestorDocument,
} from '../../../services/documents/DocumentService';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../../contexts/AuthContext';
import { downloadReceiptPdf } from '../../../utils/receiptPdf';

// Values are i18n keys in the `dashboard` namespace (docsPanel.types.*).
const DOC_TYPE_LABEL: Record<string, string> = {
  ownership: 'docsPanel.types.ownership',
  valuation: 'docsPanel.types.valuation',
  insurance: 'docsPanel.types.insurance',
  spv: 'docsPanel.types.spv',
  management: 'docsPanel.types.management',
  financial: 'docsPanel.types.financial',
  legal: 'docsPanel.types.legal',
  technical: 'docsPanel.types.technical',
  other: 'docsPanel.types.other',
};

function iconFor(doc: InvestorDocument) {
  if (doc.kind === 'share_certificate') return ShieldCheck;
  if (doc.kind === 'purchase_receipt') return ReceiptText;
  if (doc.kind === 'subscription_agreement') return ScrollText;
  if (doc.document_type === 'valuation' || doc.document_type === 'financial') return FileCheck2;
  return FileText;
}

export const InvestorDocumentsPanel: React.FC = () => {
  const { t } = useTranslation('dashboard');
  const user = useUser() as any;
  const [groups, setGroups] = useState<InvestorPropertyDocuments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyDoc, setBusyDoc] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    DocumentService.getInvestorDocuments()
      .then((res) => setGroups(res?.properties || []))
      .catch(() => setError(t('docsPanel.loadError')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const investorName =
    user?.name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.email ||
    t('docsPanel.holderFallback');

  const downloadReceipt = async (g: InvestorPropertyDocuments, docId: string) => {
    setBusyDoc(docId);
    try {
      const tokens = g.holdings.token_amount || 0;
      const invested = parseFloat(g.holdings.total_invested || '0') || 0;
      const ownershipPct = parseFloat(g.holdings.ownership_percentage || '0') || 0;
      const tokenPrice = tokens > 0 ? invested / tokens : 0;
      await downloadReceiptPdf({
        transactionId: `${g.property.id.slice(0, 8).toUpperCase()}`,
        date: g.holdings.first_investment_date
          ? new Date(g.holdings.first_investment_date)
          : new Date(),
        status: 'Confirmed',
        property: {
          title: g.property.title,
          location: g.property.location,
          tokenPrice,
          totalValue: undefined,
        },
        purchase: {
          amount: invested,
          tokens,
          ownershipPercentage: ownershipPct,
        },
        owner: { name: investorName },
      });
    } catch (_) {
      setError(t('docsPanel.receiptError'));
    } finally {
      setBusyDoc(null);
    }
  };

  const generateDoc = (g: InvestorPropertyDocuments, doc: InvestorDocument) => downloadReceipt(g, doc.id);

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500 dark:text-slate-400">
        <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
        {t('docsPanel.loading')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-emerald-600" />
            {t('docsPanel.title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('docsPanel.subtitle')}
          </p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title={t('docsPanel.refresh')}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-400" />
          <p className="text-slate-600 dark:text-slate-300 font-medium">{t('docsPanel.emptyTitle')}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('docsPanel.emptyText')}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div
              key={g.property.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden"
            >
              {/* Property header */}
              <div className="flex items-center gap-4 p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/30">
                {g.property.image_url ? (
                  <img
                    src={g.property.image_url}
                    alt={g.property.title}
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                    {g.property.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {g.property.location}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-slate-600 dark:text-slate-300">
                    <span><strong>{g.holdings.token_amount.toLocaleString()}</strong> {t('docsPanel.shares')}</span>
                    <span><strong>{(parseFloat(g.holdings.ownership_percentage) || 0).toFixed(4)}%</strong> {t('docsPanel.ownership')}</span>
                    <span>{t('docsPanel.invested', { amount: `$${(parseFloat(g.holdings.total_invested) || 0).toLocaleString()}` })}</span>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {g.documents.filter((doc) => doc.kind !== 'share_certificate').map((doc) => {
                  const Icon = iconFor(doc);
                  const isGenerated = doc.generated;
                  const highlight = doc.kind === 'share_certificate';
                  return (
                    <li key={doc.id} className="flex items-center gap-3 p-4">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        highlight
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                      }`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {doc.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {doc.description || t(DOC_TYPE_LABEL[doc.document_type] || 'docsPanel.types.other')}
                        </p>
                      </div>
                      {isGenerated ? (
                        <button
                          onClick={() => generateDoc(g, doc)}
                          disabled={busyDoc === doc.id}
                          className={`inline-flex items-center gap-1.5 rounded-lg disabled:opacity-50 text-sm font-medium px-3 py-1.5 transition-colors shrink-0 ${
                            highlight
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          <Download className="w-4 h-4" />
                          {busyDoc === doc.id ? t('docsPanel.generating') : t('docsPanel.downloadPdf')}
                        </button>
                      ) : doc.download_url ? (
                        <a
                          href={doc.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shrink-0"
                        >
                          <Download className="w-4 h-4" />
                          {t('docsPanel.download')}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 shrink-0">{t('docsPanel.unavailable')}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvestorDocumentsPanel;
