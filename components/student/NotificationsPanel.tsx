'use client';
import React, { useState } from 'react';
import { Bell, Ticket, Wrench, CreditCard, CheckCheck, ArrowUpRight, RefreshCw, KeyRound } from 'lucide-react';
import { useNotifications, timeAgo } from '@/context/NotificationContext';
import type { AppNotification } from '@/app/api/notifications/route';

interface NotificationsPanelProps {
  /** Switch the student portal to the tab a notification links to */
  onOpenTab: (tab: string) => void;
}

const CATEGORY_STYLE: Record<AppNotification['category'], { label: string; icon: React.ReactNode; chip: string }> = {
  TICKET: {
    label: 'Report',
    icon: <Ticket size={15} />,
    chip: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
  REPAIR: {
    label: 'Repair',
    icon: <Wrench size={15} />,
    chip: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  },
  PAYMENT: {
    label: 'Payment',
    icon: <CreditCard size={15} />,
    chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  SECURITY: {
    label: 'Security',
    icon: <KeyRound size={15} />,
    chip: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
};

export default function NotificationsPanel({ onOpenTab }: NotificationsPanelProps) {
  const { notifications, unreadCount, isLoading, refreshNotifications, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const visible = filter === 'UNREAD' ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div className="glass rounded-2xl p-5 border border-slate-800/80 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Bell size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Notifications</h2>
            <p className="text-xs text-slate-400">Updates on your reports, repairs and payments</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => refreshNotifications()}
            className="p-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
          <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
            {(['ALL', 'UNREAD'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  filter === f ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f === 'ALL' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {isLoading && notifications.length === 0 ? (
        <p className="py-10 text-center text-xs text-slate-500">Loading notifications…</p>
      ) : visible.length === 0 ? (
        <div className="py-10 text-center space-y-1">
          <p className="text-sm font-semibold text-slate-300">
            {filter === 'UNREAD' ? "You're all caught up" : 'No notifications yet'}
          </p>
          <p className="text-xs text-slate-500">
            You'll be notified here when your reports, repairs or payments are updated.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((n) => {
            const style = CATEGORY_STYLE[n.category];
            return (
              <li key={n.id}>
                <div
                  className={`flex gap-3 p-3.5 rounded-xl border transition-colors [overflow-wrap:anywhere] ${
                    n.isRead
                      ? 'bg-slate-900/40 border-slate-800/80'
                      : 'bg-indigo-500/5 border-indigo-500/30'
                  }`}
                  onClick={() => !n.isRead && markRead([n.id])}
                >
                  <div className={`flex-shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center ${style.chip}`}>
                    {style.icon}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm ${n.isRead ? 'text-slate-300 font-medium' : 'text-slate-100 font-bold'}`}>
                        {n.title}
                      </span>
                      {!n.isRead && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{n.message}</p>
                    <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px] text-slate-500">
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${style.chip}`}>{style.label}</span>
                      <span title={new Date(n.createdAt).toLocaleString()}>{timeAgo(n.createdAt)}</span>
                      {n.linkTab && (
                        <button
                          type="button"
                          onClick={() => {
                            markRead([n.id]);
                            onOpenTab(n.linkTab!);
                          }}
                          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                        >
                          {n.category === 'TICKET' ? 'View my tickets' : 'View my repairs'}
                          <ArrowUpRight size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
