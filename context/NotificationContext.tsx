'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { AppNotification } from '@/app/api/notifications/route';

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } else if (res.status === 401) {
        // Signed out: nothing to show
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // New notifications are created on the server; check every 30s while the tab is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') refreshNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  // Reload when the user signs in or out
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') refreshNotifications();
    });
    return () => data.subscription.unsubscribe();
  }, [refreshNotifications]);

  const markRead = useCallback(async (ids: string[]) => {
    const unreadIds = ids.filter((id) => notifications.some((n) => n.id === id && !n.isRead));
    if (unreadIds.length === 0) return;
    // Optimistic update
    setNotifications((prev) => prev.map((n) => (unreadIds.includes(n.id) ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - unreadIds.length));
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unreadIds }),
      });
    } catch {
      refreshNotifications();
    }
  }, [notifications, refreshNotifications]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
    } catch {
      refreshNotifications();
    }
  }, [refreshNotifications]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, isLoading, refreshNotifications, markRead, markAllRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

/** "Just now", "5m ago", "3h ago", "2d ago", then a date */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Ask the student portal to switch tabs (used by the bell's "Show All" while already on /student) */
export const OPEN_PORTAL_TAB_EVENT = 'labassist:open-portal-tab';
