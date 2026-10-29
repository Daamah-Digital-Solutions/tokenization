/**
 * The open section of a property page lives in the URL (?id=…&tab=financials),
 * one browser-history entry per section (client: "leaving a section of the
 * opportunity took me back out to the property list"). Browser Back steps
 * back through the sections, and the page's own Back button returns to the
 * overview before it leaves the property.
 */

export const TAB_EVENT = 'property-tab-change';
const OVERVIEW = 'overview';

export function readPropertyTab(): string {
  return new URLSearchParams(window.location.search).get('tab') || OVERVIEW;
}

function urlWithTab(tab: string): string {
  const params = new URLSearchParams(window.location.search);
  if (tab === OVERVIEW) params.delete('tab');
  else params.set('tab', tab);
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ''}`;
}

/** Open a section: a new history entry, so Back returns to the section before. */
export function pushPropertyTab(tab: string): void {
  if (tab === readPropertyTab()) return;
  const depth = (window.history.state?.propertyTabDepth || 0) + 1;
  window.history.pushState(
    { ...(window.history.state || {}), route: 'property-detail', propertyTabDepth: depth },
    '',
    urlWithTab(tab),
  );
  window.dispatchEvent(new Event(TAB_EVENT));
}

/** Back to the property's overview: unwind the sections opened from it, else replace the URL. */
export function backToPropertyOverview(): void {
  const depth = window.history.state?.propertyTabDepth || 0;
  if (depth > 0) {
    window.history.go(-depth);
    return;
  }
  window.history.replaceState({ ...(window.history.state || {}), route: 'property-detail' }, '', urlWithTab(OVERVIEW));
  window.dispatchEvent(new Event(TAB_EVENT));
}

/** Call ``onChange`` with the open section whenever it changes (clicks, Back / Forward). */
export function subscribePropertyTab(onChange: (tab: string) => void): () => void {
  const handler = () => onChange(readPropertyTab());
  window.addEventListener('popstate', handler);
  window.addEventListener(TAB_EVENT, handler);
  return () => {
    window.removeEventListener('popstate', handler);
    window.removeEventListener(TAB_EVENT, handler);
  };
}
