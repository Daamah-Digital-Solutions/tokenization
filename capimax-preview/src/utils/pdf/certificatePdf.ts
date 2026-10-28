/**
 * Certificate of Ownership PDF (client round 4, #5 — the Capimax BRX certificate
 * in RT's official document design). Drawn from the backend certificate record:
 * SPV, property, shares, token contract + explorer link, the holder's wallet,
 * verification code, signature hash and a QR that opens the public verify page.
 */

import i18n from '../../i18n/config';
import type { CertificateRecord } from '../../services/certificates/CertificateService';
import { docT, newOfficialDocument } from './statements';
import { pdfDate, pdfMoney } from './officialDocument';

const pct = (v: string | number) => `${(Number(v) || 0).toFixed(4)}%`;

/** Long unbroken values (hashes, links) get break points so they wrap instead of running off the line. */
const breakLong = (v: string, every = 32) =>
  v && !/\s/.test(v) && v.length > every ? v.match(new RegExp(`.{1,${every}}`, 'g'))!.join(' ') : v;

/** The QR / link target: the same app origin the holder is using, so it works on every deployment. */
export function certificateVerifyUrl(cert: CertificateRecord): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return cert.verification_url?.startsWith(origin) || !origin
    ? cert.verification_url
    : `${origin}/verify/${encodeURIComponent(cert.verification_code)}`;
}

export async function downloadCertificatePdf(cert: CertificateRecord, lang?: string): Promise<void> {
  lang = lang || i18n.language || 'en';
  const t = docT(lang);
  const c = (key: string, opts?: Record<string, unknown>) => t(`cert.${key}`, opts) as string;
  const verifyUrl = certificateVerifyUrl(cert);
  const doc = await newOfficialDocument(lang, t('titles.certificate') as string, cert.certificate_id,
    `${cert.property_name} — ${c(`status.${cert.status}`)}`);

  doc.statement(cert.spv_name
    ? c('statement', { name: cert.investor_name, units: cert.units.toLocaleString('en-US'),
      pct: pct(cert.ownership_percentage), property: cert.property_name, spv: cert.spv_name })
    : c('statementNoSpv', { name: cert.investor_name, units: cert.units.toLocaleString('en-US'),
      pct: pct(cert.ownership_percentage), property: cert.property_name }));

  doc.holder({
    label: c('holder'),
    name: cert.investor_name,
    rows: [[c('investorId'), cert.investor_id_masked]],
    meta: [
      [c('certificateId'), cert.certificate_id],
      [c('issueDate'), pdfDate(cert.issue_date, lang)],
    ],
  });

  doc.summary([
    [c('units'), `${cert.units.toLocaleString('en-US')} / ${(cert.total_units || 0).toLocaleString('en-US')}`, true],
    [c('ownership'), pct(cert.ownership_percentage), true],
    [c('amount'), pdfMoney(cert.investment_amount)],
    [c('unitPrice'), pdfMoney(cert.unit_price)],
    [c('acquisition'), c(`acq.${cert.acquisition}`, { defaultValue: cert.acquisition })],
    [c('subscriptionDate'), pdfDate(cert.subscription_date, lang)],
  ]);

  doc.section(c('sections.propertySpv'));
  doc.kv([
    [c('property'), cert.property_name, true],
    [c('location'), cert.property_location || '—'],
    [c('spv'), cert.spv_name
      ? `${cert.spv_name} — ${cert.spv_jurisdiction || c('wyoming')}` : c('pending')],
    [c('spvRef'), cert.spv_registration_ref || c('pending'), false, cert.spv_registry_url || undefined],
  ]);

  doc.section(c('sections.onchain'));
  const standard = [cert.token_standard, cert.token_id ? `#${cert.token_id}` : ''].filter(Boolean).join(' ');
  doc.kv([
    [c('wallet'), cert.holder_wallet || c('pending')],
    [c('contract'), cert.contract_address || c('pendingDeployment'), false, cert.contract_explorer_url || undefined],
    [c('standard'), cert.network_name
      ? `${standard} · ${cert.network_name}${cert.chain_id ? ` (chain ${cert.chain_id})` : ''}` : standard],
    ...(cert.mint_tx_hash
      ? [[c('mintTx'), breakLong(cert.mint_tx_hash, 44), false, cert.mint_tx_url || undefined] as [string, string, boolean, string?]] : []),
  ]);

  const rows: Array<[string, string, boolean?]> = [
    [c('code'), cert.verification_code, true],
    [c('verifyAt'), breakLong(verifyUrl, 44)],
    [c('signature'), breakLong(cert.digital_signature_hash)],
    [c('signatory'), cert.authorized_signatory],
  ];
  let qr = '';
  try {
    const QRCode = await import('qrcode');
    qr = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 280, color: { dark: '#0A2928', light: '#FFFFFF' } });
  } catch {
    // the verification code and link still identify the certificate
  }
  if (qr) {
    doc.kvWithImage(c('sections.verification'), rows, qr, 76, t('certificate.scan') as string);
  } else {
    doc.section(c('sections.verification'));
    doc.kv(rows);
  }

  if (cert.status === 'revoked') {
    doc.paragraph(c('revokedNote', { reason: cert.revocation_reason || '—' }));
  } else if (cert.status === 'provisional') {
    doc.paragraph(c('provisionalNote'));
  }

  doc.save(`capimax-rt-${cert.certificate_id}.pdf`);
}
