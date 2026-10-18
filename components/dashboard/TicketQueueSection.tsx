'use client';
import React, { useState } from 'react';
import { Clock, CheckCircle2, KeyRound } from 'lucide-react';
import MetricsBar from '@/components/dashboard/MetricsBar';
import FilterBar from '@/components/dashboard/FilterBar';
import TicketTable from '@/components/dashboard/TicketTable';
import PcCredentialsPanel from '@/components/dashboard/PcCredentialsPanel';
import { useTickets } from '@/context/TicketContext';

type QueueTab = 'PENDING' | 'RESOLVED' | 'CREDENTIALS';

/** Ticket Queue for staff: open tickets, resolved tickets, and the PC admin credentials. */
export default function TicketQueueSection() {
  const { tickets } = useTickets();
  const [tab, setTab] = useState<QueueTab>('PENDING');

  const openCount = tickets.filter((t) => t.status !== 'RESOLVED').length;
  const resolvedCount = tickets.length - openCount;

  const tabs: Array<{ id: QueueTab; label: string; icon: React.ReactNode; count?: number; active: string }> = [
    { id: 'PENDING', label: 'Pending', icon: <Clock size={14} />, count: openCount, active: 'border-amber-400 text-amber-200 bg-amber-500/10' },
    { id: 'RESOLVED', label: 'Resolved', icon: <CheckCircle2 size={14} />, count: resolvedCount, active: 'border-emerald-400 text-emerald-200 bg-emerald-500/10' },
    { id: 'CREDENTIALS', label: 'PC Credentials', icon: <KeyRound size={14} />, active: 'border-rose-400 text-rose-200 bg-rose-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-1.5 overflow-x-auto border-b border-slate-800/80" role="tablist" aria-label="Ticket queue views">
        {tabs.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-t-xl border-b-2 text-xs font-bold transition-colors ${
                isActive ? t.active : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span className={`px-1.5 rounded-md font-mono text-[10px] ${isActive ? 'bg-white/10' : 'bg-slate-800 text-slate-500'}`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'CREDENTIALS' ? (
        <PcCredentialsPanel />
      ) : (
        <>
          <MetricsBar />
          <FilterBar />
          <TicketTable scope={tab === 'PENDING' ? 'OPEN' : 'RESOLVED'} />
        </>
      )}
    </div>
  );
}
