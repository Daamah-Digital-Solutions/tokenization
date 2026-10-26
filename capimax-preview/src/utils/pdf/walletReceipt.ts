/**
 * The numbered receipt of one wallet ledger row (PropShare model: every
 * movement of the wallet has its receipt). Data from PayoutService.receipt();
 * labels from the `docs` translations in the document's language.
 */

import type { WalletReceipt } from '../../services/wallet/PayoutService';
import { codeLabel, docT, newOfficialDocument } from './statements';
import { pdfDate, pdfMoney } from './officialDocument';

export async function downloadWalletReceiptPdf(r: WalletReceipt, lang: string): Promise<void> {
  const t = docT(lang);
  const when = new Date(r.created_at);
  const doc = await newOfficialDocument(lang, t('titles.walletReceipt') as string, r.number);

  doc.holder({
    label: t('holder.accountHolder') as string,
    name: r.holder.name,
    rows: [
      [t('holder.email') as string, r.holder.email],
      [t('holder.accountId') as string, r.holder.account_id],
    ],
    meta: [
      [t('holder.documentNo') as string, r.number],
      [t('receipt.paidOn') as string, `${pdfDate(when, lang)} ${when.toTimeString().slice(0, 5)}`],
    ],
  });
  doc.summary([
    [t('receipt.amount') as string, `${pdfMoney(r.amount, true)} ${r.currency}`, true],
    [t('cols.type') as string, codeLabel(t, 'types', r.type)],
    [t('receipt.balanceAfter') as string, pdfMoney(r.balance_after)],
  ], 3);

  doc.section(t('receipt.details') as string);
  const rel = r.related || {};
  doc.kv([
    [t('receipt.description') as string, r.description],
    [t('receipt.balanceBefore') as string, pdfMoney(r.balance_before)],
    [t('receipt.balanceAfter') as string, pdfMoney(r.balance_after)],
    ...(rel.reference ? [[t('receipt.reference') as string, rel.reference, true] as [string, string, boolean]] : []),
    ...(rel.property ? [[t('receipt.property') as string, rel.property] as [string, string]] : []),
    ...(rel.shares ? [[t('receipt.shares') as string, String(rel.shares)] as [string, string]] : []),
    ...(rel.payment_method ? [[t('cols.method') as string, codeLabel(t, 'methods', rel.payment_method)] as [string, string]] : []),
    ...(rel.destination ? [[t('bank.destination') as string, rel.destination] as [string, string]] : []),
    ...(rel.transfer_reference ? [[t('receipt.transferReference') as string, rel.transfer_reference] as [string, string]] : []),
    [t('receipt.transactionId') as string, r.id],
  ].filter(([, v]) => !!v) as Array<[string, string, boolean?]>);
  doc.paragraph(t('receipt.receiptNote') as string, 8.6);
  doc.save(`capimax-rt-receipt-${r.number}.pdf`);
}
