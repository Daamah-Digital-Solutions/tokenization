/**
 * The backend sends the construction stage as English text
 * (construction_status_display); show it in the visitor's language.
 */

import i18n from '../i18n/config';

const KEYS: Record<string, string> = {
  'Construction Complete': 'complete',
  'Nearly Complete': 'nearly',
  'Half Complete': 'half',
  'In Progress': 'progress',
  'Just Started': 'started',
};

export function constructionStageLabel(display?: string | null): string | undefined {
  if (!display) return undefined;
  const key = KEYS[display];
  return key ? (i18n.t(`common:constructionStage.${key}`) as string) : display;
}
