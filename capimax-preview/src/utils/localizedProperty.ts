/**
 * A property's own text (title, description, developer, notes) in the reader's
 * language: the admin writes the Arabic and French next to the English, and what
 * is left empty falls back to the English. The API sends them in `translations`.
 */

import { baseLanguage } from './locale';

type Texts = Record<string, string>;

export function localizedField(property: any, field: string, lng?: string | null): string {
  const text: Texts | undefined = property?.translations?.[baseLanguage(lng)];
  return text?.[field] || property?.[field] || '';
}

/** A copy of the property (and its listing details) with its text in that language. */
export function localizeProperty<T>(property: T, lng?: string | null): T {
  const p = property as any;
  const text: Texts | undefined = p?.translations?.[baseLanguage(lng)];
  if (!text) return property;

  const out: any = { ...p };
  if (text.title) out.title = text.title;
  if (text.description) out.description = text.description;

  const d = p.listing_details;
  if (d) {
    out.listing_details = {
      ...d,
      developer: d.developer && {
        ...d.developer,
        name: text.developer_name || d.developer.name,
        description: text.developer_description || d.developer.description,
      },
      returns: d.returns && { ...d.returns, notes: text.returns_notes || d.returns.notes },
      financial_study: d.financial_study && {
        ...d.financial_study,
        summary: text.financial_study_summary || d.financial_study.summary,
      },
      insurance: d.insurance && { ...d.insurance, coverage: text.insurance_coverage || d.insurance.coverage },
      payment_plan: d.payment_plan && { ...d.payment_plan, notes: text.installment_notes || d.payment_plan.notes },
    };
  }
  return out;
}
