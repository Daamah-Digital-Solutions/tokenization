/**
 * The transactions API writes descriptions in English ("Investment in X",
 * "Dividend from X", "Withdrawal from X"); show them in the visitor's
 * language. Anything else is shown as received.
 */

import i18n from '../i18n/config';

const PATTERNS: Array<[RegExp, string]> = [
  [/^Investment in (.+)$/, 'investmentIn'],
  [/^Dividend from (.+)$/, 'dividendFrom'],
  [/^Withdrawal from (.+)$/, 'withdrawalFrom'],
];

export function localizeTxDescription(description?: string | null): string {
  if (!description) return '';
  for (const [re, key] of PATTERNS) {
    const m = re.exec(description);
    if (m) return i18n.t(`common:txDescription.${key}`, { property: m[1] }) as string;
  }
  return description;
}
