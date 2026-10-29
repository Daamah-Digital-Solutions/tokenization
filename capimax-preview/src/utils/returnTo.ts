/**
 * Where to go after signing in (client round 4 follow-up): a visitor who clicks
 * "Apply" signs in, registers or continues with Google first, then lands back
 * on the application. Kept in localStorage so it survives the e-mail code step,
 * and it expires after two hours so an abandoned click does not hijack a later
 * sign-in.
 */

const KEY = 'capimax.returnTo';
const TTL_MS = 2 * 60 * 60 * 1000;
// Only pages that ask for a sign-in can be returned to.
const ALLOWED = new Set(['broker-application', 'liquidity-provider', 'dashboard']);

type Navigate = (route: any, params?: Record<string, string>) => void;

export function rememberReturn(route: string, params?: Record<string, string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ route, params, at: Date.now() }));
  } catch {
    // storage unavailable: the user simply lands on the dashboard
  }
}

export function clearReturn(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function takeReturn(): { route: string; params?: Record<string, string> } | null {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved?.route || !ALLOWED.has(saved.route) || Date.now() - (saved.at || 0) > TTL_MS) return null;
    return { route: saved.route, params: saved.params };
  } catch {
    return null;
  }
}

/** Send a user who has just signed in to the page they came from, else the dashboard. */
export function goAfterSignIn(navigate: Navigate): void {
  const next = takeReturn();
  if (next) navigate(next.route, next.params);
  else navigate('dashboard');
}
