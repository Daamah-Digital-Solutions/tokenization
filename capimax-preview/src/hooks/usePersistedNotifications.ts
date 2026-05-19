/**
 * usePersistedNotifications — wraps NotificationService for React UIs.
 *
 * Distinct from `useNotifications()` (toast/transient context). This hook
 * powers the navbar bell, notification list page, and unread badges. It
 * polls the backend on a configurable interval rather than relying on
 * WebSocket — the WS channel exists but is not yet used by every page.
 *
 * Wiring a bell into the navbar is then a one-liner:
 *
 *   const { unread, items, markAllAsRead } = usePersistedNotifications();
 *   <button onClick={markAllAsRead}>
 *     <BellIcon /> {unread > 0 && <span>{unread}</span>}
 *   </button>
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  notificationService,
  type BackendNotification,
} from '../services/notifications/NotificationService';
import { useAuth } from '../contexts/AuthContext';

interface Options {
  pageSize?: number;
  pollIntervalMs?: number;
  unreadOnly?: boolean;
}

export function usePersistedNotifications(options: Options = {}) {
  const { pageSize = 20, pollIntervalMs = 30_000, unreadOnly = false } = options;
  const { state: auth } = useAuth();

  const [items, setItems] = useState<BackendNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!auth?.isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const [list, count] = await Promise.all([
        notificationService.list({ page: 1, page_size: pageSize, unread_only: unreadOnly }),
        notificationService.getUnreadCount(),
      ]);
      if (!mountedRef.current) return;
      setItems(list.results ?? []);
      setUnread(Number(count?.unread ?? 0));
    } catch (err: any) {
      if (!mountedRef.current) return;
      setError(err?.message ?? 'Failed to load notifications');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [auth?.isAuthenticated, pageSize, unreadOnly]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    if (pollIntervalMs <= 0) return;
    const timer = setInterval(refresh, pollIntervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [refresh, pollIntervalMs]);

  const markAsRead = useCallback(async (id: string) => {
    await notificationService.markAsRead(id);
    setItems(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    );
    setUnread(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await notificationService.markAllAsRead();
    setItems(prev =>
      prev.map(n => ({ ...n, is_read: true, read_at: n.read_at ?? new Date().toISOString() }))
    );
    setUnread(0);
  }, []);

  return { items, unread, loading, error, refresh, markAsRead, markAllAsRead };
}
