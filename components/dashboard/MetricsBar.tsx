'use client';
import React, { useState, useMemo } from 'react';
import { Ticket, Clock, Users, BarChart3 } from 'lucide-react';
import { useTickets } from '@/context/TicketContext';
import { getKPIData } from '@/lib/mockData';
import { formatResolutionTime as fmt } from '@/lib/utils';

const KPI_CONFIGS = [
  {
    id: 'kpi-total',
    label: 'Total Tickets',
    key: 'total' as const,
    icon: <Ticket size={20} />,
    gradient: 'from-indigo-500/20 to-violet-500/10',
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/15',
    valueColor: 'text-indigo-300',
    format: (v: number) => String(v),
    suffix: 'tickets',
  },
  {
    id: 'kpi-pending',
    label: 'Active Pending Queue',
    key: 'pending' as const,
    icon: <Clock size={20} />,
    gradient: 'from-amber-500/20 to-orange-500/10',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/15',
    valueColor: 'text-amber-300',
    format: (v: number) => String(v),
    suffix: 'awaiting',
  },
  {
    id: 'kpi-dispatched',
    label: 'Dispatched Technicians',
    key: 'dispatched' as const,
    icon: <Users size={20} />,
    gradient: 'from-blue-500/20 to-cyan-500/10',
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/15',
    valueColor: 'text-blue-300',
    format: (v: number) => String(v),
    suffix: 'active',
  },
  {
    id: 'kpi-avg-resolution',
    label: 'Avg. Resolution Time',
    key: 'avgResolutionMins' as const,
    icon: <BarChart3 size={20} />,
    gradient: 'from-emerald-500/20 to-teal-500/10',
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/15',
    valueColor: 'text-emerald-300',
    format: (v: number) => fmt(v),
    suffix: 'per ticket',
  },
];

// Periods for the Total Tickets card (calendar-based, in the viewer's local time)
type TicketPeriod = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';
const PERIODS: Array<{ id: TicketPeriod; short: string; label: string }> = [
  { id: 'ALL', short: 'All', label: 'Total Tickets' },
  { id: 'TODAY', short: 'Today', label: 'Tickets Today' },
  { id: 'WEEK', short: 'Week', label: 'Tickets This Week' },
  { id: 'MONTH', short: 'Month', label: 'Tickets This Month' },
];

function periodStart(period: TicketPeriod): number {
  const now = new Date();
  if (period === 'TODAY') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (period === 'WEEK') {
    const daysSinceMonday = (now.getDay() + 6) % 7;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday).getTime();
  }
  if (period === 'MONTH') return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return -Infinity;
}

export default function MetricsBar() {
  const { tickets } = useTickets();
  const kpi = getKPIData(tickets);
  const [period, setPeriod] = useState<TicketPeriod>('ALL');

  const periodCount = useMemo(() => {
    const start = periodStart(period);
    return tickets.filter((t) => new Date(t.timestamp).getTime() >= start).length;
  }, [tickets, period]);
  const activePeriod = PERIODS.find((p) => p.id === period)!;

  return (
    <section aria-label="Key performance metrics" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {KPI_CONFIGS.map((config) => {
        const isTotalCard = config.id === 'kpi-total';
        const value = isTotalCard ? periodCount : kpi[config.key];
        const label = isTotalCard ? activePeriod.label : config.label;
        return (
          <article
            key={config.id}
            id={config.id}
            className={`kpi-card p-5 bg-gradient-to-br ${config.gradient} animate-fade-in-up`}
            aria-label={`${label}: ${config.format(value)}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${config.iconBg} flex items-center justify-center ${config.iconColor} flex-shrink-0`} aria-hidden="true">
                {config.icon}
              </div>
              {/* Mini trend bar */}
              <div className="flex items-end gap-0.5 h-8" aria-hidden="true">
                {[40, 60, 45, 80, 65, 90, value > 0 ? Math.min(100, value * 8) : 30].map((h, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-sm ${config.iconBg} opacity-60`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className={`text-3xl font-black leading-none mb-1 ${config.valueColor}`}>
                {config.format(value)}
              </p>
              <p className="text-xs font-semibold text-slate-200 leading-snug">{label}</p>
              {isTotalCard ? (
                <div className="flex flex-wrap gap-1 mt-2" role="group" aria-label="Ticket count period">
                  {PERIODS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPeriod(p.id)}
                      aria-pressed={period === p.id}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors ${
                        period === p.id
                          ? 'bg-indigo-500/25 border-indigo-400/50 text-indigo-200'
                          : 'bg-slate-900/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {p.short}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-0.5">{config.suffix}</p>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
