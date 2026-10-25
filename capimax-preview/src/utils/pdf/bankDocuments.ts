/**
 * Bank documents (client round 3, #15): transfer instructions for a wallet
 * deposit by bank transfer, and the confirmation of a withdrawal request —
 * both in the official Capimax RT document design.
 */

import i18n from '../../i18n/config';
import { docT, newOfficialDocument, codeLabel } from './statements';
import { documentReference, pdfDate, pdfMoney } from './officialDocument';

export interface BankInstructionsData {
  holderName: string;
  holderEmail?: string;
  amount: number;
  reference?: string;
  account: {
    account_holder_name: string;
    bank_name: string;
    account_number: string;
    routing_number?: string;
    swift_code?: string;
    bank_address?: string;
    bank_country?: string;
    currency?: string;
    instructions?: string;
  };
  lang?: string;
}

export async function downloadBankInstructionsPdf(data: BankInstructionsData): Promise<void> {
  const lang = data.lang || i18n.language || 'en';
  const t = docT(lang);
  const now = new Date();
  const ref = documentReference('BTI', data.reference || data.holderEmail || '', now);
  const doc = await newOfficialDocument(lang, t('titles.bankInstructions') as string, ref);
  doc.holder({
    label: t('holder.accountHolder') as string,
    name: data.holderName,
    rows: data.holderEmail ? [[t('holder.email') as string, data.holderEmail]] : [],
    meta: [
      [t('holder.documentNo') as string, ref],
      [t('holder.issued') as string, pdfDate(now, lang)],
    ],
  });
  doc.summary([
    [t('bank.amount') as string, `${pdfMoney(data.amount)}${data.account.currency ? ` ${data.account.currency}` : ''}`, true],
    [t('bank.reference') as string, data.reference || ref],
  ], 2);
  doc.section(t('sections.instructions') as string);
  doc.paragraph(t('bank.intro') as string, 9);
  doc.section(t('sections.bank') as string);
  const a = data.account;
  doc.kv([
    [t('bank.beneficiary') as string, a.account_holder_name, true],
    [t('bank.bankName') as string, a.bank_name],
    [t('bank.accountNumber') as string, a.account_number, true],
    ...(a.swift_code ? [[t('bank.swift') as string, a.swift_code] as [string, string]] : []),
    ...(a.routing_number ? [[t('bank.routing') as string, a.routing_number] as [string, string]] : []),
    ...(a.bank_address || a.bank_country
      ? [[t('bank.bankAddress') as string, [a.bank_address, a.bank_country].filter(Boolean).join(', ')] as [string, string]]
      : []),
    [t('bank.reference') as string, data.reference || ref, true],
  ]);
  if (a.instructions) doc.paragraph(a.instructions, 8.6);
  doc.save(`capimax-rt-bank-transfer-instructions-${ref}.pdf`);
}

export interface WithdrawalConfirmationData {
  holderName: string;
  holderEmail?: string;
  requestId?: string;
  amount: number;
  currency?: string;
  method: 'bank' | 'crypto' | string;
  status?: string;
  requestedAt?: Date;
  destination: Array<[string, string]>;
  lang?: string;
}

export async function downloadWithdrawalConfirmationPdf(data: WithdrawalConfirmationData): Promise<void> {
  const lang = data.lang || i18n.language || 'en';
  const t = docT(lang);
  const when = data.requestedAt || new Date();
  const ref = documentReference('WDR', data.requestId || '', when);
  const doc = await newOfficialDocument(lang, t('titles.withdrawal') as string, ref);
  doc.holder({
    label: t('holder.accountHolder') as string,
    name: data.holderName,
    rows: data.holderEmail ? [[t('holder.email') as string, data.holderEmail]] : [],
    meta: [
      [t('holder.documentNo') as string, ref],
      [t('bank.requested') as string, pdfDate(when, lang)],
      [t('receipt.status') as string, codeLabel(t, 'status', data.status || 'pending')],
    ],
  });
  doc.summary([
    [t('bank.amount') as string, `${pdfMoney(data.amount)}${data.currency ? ` ${data.currency}` : ''}`, true],
    [t('cols.method') as string, codeLabel(t, 'methods', data.method)],
  ], 2);
  doc.paragraph(t('bank.withdrawIntro') as string, 9);
  doc.section(t('bank.destination') as string);
  doc.kv(data.destination.filter(([, v]) => !!v));
  doc.save(`capimax-rt-withdrawal-${ref}.pdf`);
}
