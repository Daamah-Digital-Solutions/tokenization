/**
 * Investor Document Center (client edits #3 + #8).
 *
 * Lives inside the investor Dashboard (not a hidden Account page). Shows the
 * investor's documents SEPARATED PER PROPERTY:
 *   - a professional, downloadable Certificate of Ownership per property
 *     (generated client-side with a QR code + certificate number),
 *   - any subscription-agreement PDF,
 *   - the property's Data Room documents (valuation / insurance / ownership …).
 */

import React, { useEffect, useState } from 'react';
import {
  FileText, Download, ShieldCheck, Building2, ScrollText, FileCheck2,
  RefreshCw, FolderOpen,
} from 'lucide-react';
import {
  DocumentService,
  type InvestorPropertyDocuments,
  type InvestorDocument,
} from '../../../services/documents/DocumentService';
import { useUser } from '../../../contexts/AuthContext';
import { downloadOwnershipCertificatePdf } from '../../../utils/ownershipCertificatePdf';

const DOC_TYPE_LABEL: Record<string, string> = {
  ownership: 'Ownership & Title',
  valuation: 'Valuation Report',
  insurance: 'Insurance Policy',
  spv: 'SPV Documents',
  management: 'Property Management',
  financial: 'Financial Report',
  legal: 'Legal Document',
  technical: 'Technical Document',
  other: 'Document',
};

function iconFor(doc: InvestorDocument) {
  if (doc.kind === 'share_certificate') return ShieldCheck;
  if (doc.kind === 'subscription_agreement') return ScrollText;
  if (doc.document_type === 'valuation' || doc.document_type === 'financial') return FileCheck2;
  return FileText;
}

function certificateNumber(propertyId: string, userId?: string): string {
  const p = (propertyId || '').replace(/-/g, '').slice(0, 8).toUpperCase();
  const u = (userId || '').replace(/-/g, '').slice(0, 4).toUpperCase();
  return `CMX-${p}${u ? '-' + u : ''}`;
}

export const InvestorDocumentsPanel: React.FC = () => {
  const user = useUser() as any;
  const [groups, setGroups] = useState<InvestorPropertyDocuments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyCert, setBusyCert] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    DocumentService.getInvestorDocuments()
      .then((res) => setGroups(res?.properties || []))
      .catch(() => setError('Could not load your documents. Please try again.'))
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
    'Investor';

  const downloadCertificate = async (g: InvestorPropertyDocuments) => {
    const certNo = certificateNumber(g.property.id, user?.id);
    setBusyCert(g.property.id);
    try {
      const ownershipPct = parseFloat(g.holdings.ownership_percentage || '0') || 0;
      const invested = parseFloat(g.holdings.total_invested || '0') || 0;
      const qrPayload =
        `Capimax RT - Certificate of Ownership | Cert: ${certNo} | ` +
        `Property: ${g.property.title} | Holder: ${investorName} | ` +
        `Tokens: ${g.holdings.token_amount} | Ownership: ${ownershipPct.toFixed(4)}%`;
      await downloadOwnershipCertificatePdf({
        certificateNumber: certNo,
        investorName,
        property: {
          title: g.property.title,
          reference: certificateNumber(g.property.id).replace('CMX-', ''),
          location: g.property.location,
        },
        tokens: g.holdings.token_amount,
        totalTokens: g.property.total_tokens,
        ownershipPercentage: ownershipPct,
        investmentValue: invested,
        amountPaid: invested,
        issueDate: g.holdings.first_investment_date
          ? new Date(g.holdings.first_investment_date)
          : new Date(),
        qrPayload,
      });
    } catch (_) {
      setError('Could not generate the certificate. Please try again.');
    } finally {
      setBusyCert(null);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500 dark:text-slate-400">
        <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
        Loading your documents…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-emerald-600" />
            Document Center
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your ownership certificates and property documents, organised per property.
          </p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="Refresh"
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
          <p className="text-slate-600 dark:text-slate-300 font-medium">No documents yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Once you own tokens in a property, your ownership certificate and its
            documents will appear here — one section per property.
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
                    <span><strong>{g.holdings.token_amount.toLocaleString()}</strong> tokens</span>
                    <span><strong>{(parseFloat(g.holdings.ownership_percentage) || 0).toFixed(4)}%</strong> ownership</span>
                    <span>${(parseFloat(g.holdings.total_invested) || 0).toLocaleString()} invested</span>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {g.documents.map((doc) => {
                  const Icon = iconFor(doc);
                  const isCert = doc.kind === 'share_certificate';
                  return (
                    <li key={doc.id} className="flex items-center gap-3 p-4">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isCert
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
                          {doc.description || DOC_TYPE_LABEL[doc.document_type] || 'Document'}
                        </p>
                      </div>
                      {isCert ? (
                        <button
                          onClick={() => downloadCertificate(g)}
                          disabled={busyCert === g.property.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 transition-colors shrink-0"
                        >
                          <Download className="w-4 h-4" />
                          {busyCert === g.property.id ? 'Generating…' : 'Download PDF'}
                        </button>
                      ) : doc.download_url ? (
                        <a
                          href={doc.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shrink-0"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 shrink-0">Unavailable</span>
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
