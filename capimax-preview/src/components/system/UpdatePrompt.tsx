/**
 * Service-worker update prompt.
 *
 * The PWA precaches every JS chunk. That means when a new build is deployed,
 * an already-open tab keeps running the OLD JS — even a normal reload may
 * serve the old precached `index.html` if the new service worker hasn't
 * registered yet. The symptom users see: bugs we just fixed still happen,
 * because they're testing against stale code.
 *
 * This component subscribes to vite-plugin-pwa's update signal. When a new
 * service worker is waiting, it shows a non-intrusive banner with a "Reload
 * now" button. The Reload action calls `updateServiceWorker(true)` which
 * skipWaitings the new SW and reloads the window, so the next tick of the
 * app runs the new bundle.
 *
 * Auto-reload fallback: if the user doesn't interact within 10 seconds we
 * trigger the reload ourselves. Better to interrupt them once than to leave
 * them stuck on a buggy old build.
 */

import { useEffect, useState } from 'react';
// virtual:pwa-register/react is provided by vite-plugin-pwa at build time.
// Types come from `vite-plugin-pwa/react` (referenced in vite-env.d.ts).
import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(err: any) {
      console.warn('SW registration error:', err);
    },
  });

  const [secondsLeft, setSecondsLeft] = useState(10);

  // Auto-reload countdown — guarantees users don't get stuck on a stale build.
  useEffect(() => {
    if (!needRefresh) return;
    setSecondsLeft(10);
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          updateServiceWorker(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [needRefresh, updateServiceWorker]);

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-[1000] max-w-sm rounded-xl bg-emerald-600 text-white shadow-2xl"
    >
      <div className="flex items-start gap-3 p-4">
        <span aria-hidden className="text-2xl leading-none">↻</span>
        <div className="flex-1">
          <p className="font-semibold">New version available</p>
          <p className="mt-0.5 text-sm text-emerald-50">
            Reloading in {secondsLeft}s to get the latest fixes.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => updateServiceWorker(true)}
              className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              Reload now
            </button>
            <button
              type="button"
              onClick={() => setNeedRefresh(false)}
              className="rounded-lg border border-white/30 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpdatePrompt;
