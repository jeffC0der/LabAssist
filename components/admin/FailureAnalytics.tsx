'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  Clock,
  ShieldAlert,
  Cpu,
  AlertOctagon,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { FailureIncident, FailureLab, FailureStation } from '@/app/api/admin/failure-analytics/route';

const DOMAIN_DEFINITIONS = [
  {
    category: 'DISPLAY',
    name: 'Display & Projectors [Key A]',
    color: 'from-blue-500 to-indigo-500',
    bg: 'bg-blue-500',
    textColor: 'text-blue-400',
  },
  {
    category: 'POWER/UPS',
    name: 'Power Grid & UPS Batteries [Key C]',
    color: 'from-red-500 to-orange-500',
    bg: 'bg-red-500',
    textColor: 'text-red-400',
  },
  {
    category: 'NET/SOFTWARE',
    name: 'Network & OS Drivers [Key D]',
    color: 'from-cyan-500 to-teal-500',
    bg: 'bg-cyan-500',
    textColor: 'text-cyan-400',
  },
  {
    category: 'PERIPHERALS',
    name: 'Input Peripherals & Audio [Key B]',
    color: 'from-violet-500 to-purple-500',
    bg: 'bg-violet-500',
    textColor: 'text-violet-400',
  },
];

// Two-hour fault windows shared by the Peak Fault Window card and the time-of-day histogram.
// The first and last windows also absorb early-morning and late-night reports.
const TIME_WINDOWS = [
  { time: '08:00', label: '08:00 – 10:00' },
  { time: '10:00', label: '10:00 – 12:00' },
  { time: '12:00', label: '12:00 – 14:00' },
  { time: '14:00', label: '14:00 – 16:00' },
  { time: '16:00', label: '16:00 – 18:00' },
  { time: '18:00', label: '18:00 – 20:00' },
  { time: '20:00', label: '20:00 – 22:00' },
];

function windowIndex(hour: number) {
  return Math.min(TIME_WINDOWS.length - 1, Math.max(0, Math.floor((hour - 8) / 2)));
}

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_MS = { TODAY: DAY_MS, WEEK: 7 * DAY_MS, MONTH: 30 * DAY_MS, ALL: Infinity } as const;

function formatMinutes(mins: number) {
  if (mins >= 1440) return `${(mins / 1440).toFixed(1)} days`;
  if (mins >= 60) return `${(mins / 60).toFixed(1)} hrs`;
  return `${mins.toFixed(1)} mins`;
}

function averageResolutionMinutes(list: FailureIncident[]) {
  const resolved = list.filter((t) => t.status === 'RESOLVED' && t.resolvedAt && t.createdAt);
  if (resolved.length === 0) return { avg: 0, count: 0 };
  const sum = resolved.reduce((acc, t) => {
    const start = new Date(t.createdAt).getTime();
    const end = new Date(t.resolvedAt!).getTime();
    return acc + Math.max(0, (end - start) / 60000);
  }, 0);
  return { avg: sum / resolved.length, count: resolved.length };
}

export default function FailureAnalytics() {
  const [incidents, setIncidents] = useState<FailureIncident[]>([]);
  const [labs, setLabs] = useState<FailureLab[]>([]);
  const [stations, setStations] = useState<FailureStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('WEEK');

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/failure-analytics', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load failure analytics');
      setIncidents(data.incidents || []);
      setLabs(data.labs || []);
      setStations(data.stations || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error fetching failure analytics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Reload whenever tickets or workstation statuses change in the database
  useEffect(() => {
    try {
      const channel = supabase
        .channel('admin:failure-analytics')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => loadAnalytics())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'workstations' }, () => loadAnalytics())
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Could not establish failure analytics realtime channel:', err);
    }
  }, [loadAnalytics]);

  // 1. Filter incidents by timeRange (current period and the equal-length period before it)
  const { activeTickets, prevPeriodTickets } = useMemo(() => {
    if (timeRange === 'ALL') return { activeTickets: incidents, prevPeriodTickets: [] as FailureIncident[] };
    const now = Date.now();
    const durationMs = RANGE_MS[timeRange];
    const age = (t: FailureIncident) => now - new Date(t.createdAt).getTime();

    return {
      activeTickets: incidents.filter((t) => age(t) <= durationMs),
      prevPeriodTickets: incidents.filter((t) => age(t) > durationMs && age(t) <= durationMs * 2),
    };
  }, [incidents, timeRange]);

  // 2. Mean Time to Resolution (MTTR) calculation
  const { mttrDisplay, mttrTrend } = useMemo(() => {
    const current = averageResolutionMinutes(activeTickets);
    if (current.count === 0) {
      return {
        mttrDisplay: '—',
        mttrTrend: { text: 'No resolved incidents in this period', isFaster: true },
      };
    }

    let trendObj = {
      text: `Based on ${current.count} resolved incident${current.count !== 1 ? 's' : ''}`,
      isFaster: true,
    };

    const prev = averageResolutionMinutes(prevPeriodTickets);
    if (prev.count > 0 && prev.avg > 0) {
      const delta = ((current.avg - prev.avg) / prev.avg) * 100;
      const isFaster = delta <= 0;
      trendObj = {
        text: `${Math.abs(delta).toFixed(1)}% ${isFaster ? 'faster' : 'slower'} vs last period`,
        isFaster,
      };
    }

    return { mttrDisplay: formatMinutes(current.avg), mttrTrend: trendObj };
  }, [activeTickets, prevPeriodTickets]);

  // Incidents bucketed into the shared time-of-day windows
  const windowBuckets = useMemo(() => {
    const buckets = TIME_WINDOWS.map(() => ({ count: 0, labCounts: {} as Record<string, number> }));
    activeTickets.forEach((t) => {
      const d = new Date(t.createdAt);
      if (isNaN(d.getTime())) return;
      const b = buckets[windowIndex(d.getHours())];
      b.count++;
      b.labCounts[t.labId] = (b.labCounts[t.labId] || 0) + 1;
    });
    return buckets;
  }, [activeTickets]);

  // 3. Peak Fault Window calculation
  const { peakWindowDisplay, peakWindowDetail } = useMemo(() => {
    let peakIdx = -1;
    windowBuckets.forEach((b, i) => {
      if (b.count > 0 && (peakIdx < 0 || b.count > windowBuckets[peakIdx].count)) peakIdx = i;
    });

    if (peakIdx < 0) {
      return { peakWindowDisplay: '—', peakWindowDetail: 'No incidents logged in this period' };
    }

    const peak = windowBuckets[peakIdx];
    const topLab = Object.entries(peak.labCounts).sort((a, b) => b[1] - a[1])[0];
    return {
      peakWindowDisplay: TIME_WINDOWS[peakIdx].label,
      peakWindowDetail: `${topLab[0]} (${peak.count} incident${peak.count > 1 ? 's' : ''} recorded)`,
    };
  }, [windowBuckets]);

  // 4. Fleet Availability Index calculation (current workstation statuses)
  const { fleetAvailabilityPct, fleetStatusDetail } = useMemo(() => {
    const totalStations = stations.length;
    if (totalStations === 0) {
      return { fleetAvailabilityPct: '—', fleetStatusDetail: 'No workstation records in database' };
    }
    const faultyCount = stations.filter((s) => s.status === 'UNDER_REPAIR' || s.status === 'ISSUE_REPORTED').length;
    const readyCount = totalStations - faultyCount;

    return {
      fleetAvailabilityPct: `${((readyCount / totalStations) * 100).toFixed(1)}%`,
      fleetStatusDetail: `${readyCount} of ${totalStations} workstations operational`,
    };
  }, [stations]);

  // 5. Total Failures / Dispatch Rate (any ticket past PENDING has had a technician dispatched)
  const { totalFailuresCount, dispatchRateDetail } = useMemo(() => {
    const count = activeTickets.length;
    if (count === 0) return { totalFailuresCount: 0, dispatchRateDetail: 'No incidents to dispatch' };
    const dispatched = activeTickets.filter((t) => t.status !== 'PENDING').length;

    return {
      totalFailuresCount: count,
      dispatchRateDetail: `${((dispatched / count) * 100).toFixed(1)}% technician dispatch rate`,
    };
  }, [activeTickets]);

  // 6. Failure Domain Breakdown
  const failureDomains = useMemo(() => {
    const total = activeTickets.length || 1;
    return DOMAIN_DEFINITIONS.map((def) => {
      const count = activeTickets.filter((t) => t.category === def.category).length;
      const percentage = Math.round((count / total) * 100);
      return {
        ...def,
        count,
        percentage,
      };
    }).sort((a, b) => b.count - a.count);
  }, [activeTickets]);

  // 7. Lab Room Failure Density (every lab in the labs table, plus any lab code found only on tickets)
  const labDensity = useMemo(() => {
    const total = activeTickets.length || 1;
    const labNames: Record<string, string> = {};
    const counts: Record<string, number> = {};
    labs.forEach((l) => {
      labNames[l.code] = l.name;
      counts[l.code] = 0;
    });

    activeTickets.forEach((t) => {
      counts[t.labId] = (counts[t.labId] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([roomCode, count]) => {
        const pct = Math.round((count / total) * 100);
        let load = 'Low Fault';
        if (pct >= 30 || count >= 4) load = 'High Exposure';
        else if (pct >= 15 || count >= 2) load = 'Moderate';
        else if (count === 0) load = 'Optimal (0 Faults)';

        return {
          room: labNames[roomCode] ? `${roomCode} (${labNames[roomCode]})` : roomCode,
          code: roomCode,
          count,
          pct,
          load,
        };
      })
      .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
  }, [activeTickets, labs]);

  // 8. Time of Day Peak Distribution Histogram
  const { hourlyPeakData, peakHourLabel } = useMemo(() => {
    const maxFaults = Math.max(1, ...windowBuckets.map((b) => b.count));

    let peakIdx = 0;
    windowBuckets.forEach((b, i) => {
      if (b.count > windowBuckets[peakIdx].count) peakIdx = i;
    });
    const peakFaults = windowBuckets[peakIdx].count;

    const hourlyData = windowBuckets.map((b, i) => ({
      time: TIME_WINDOWS[i].time,
      faults: b.count,
      load: b.count > 0 ? Math.max(14, Math.round((b.count / maxFaults) * 100)) : 8,
    }));

    const peakLabel =
      peakFaults > 0
        ? `Peak at ${TIME_WINDOWS[peakIdx].time} (${peakFaults} ticket${peakFaults > 1 ? 's' : ''})`
        : 'No incidents in this period';

    return { hourlyPeakData: hourlyData, peakHourLabel: peakLabel };
  }, [windowBuckets]);

  return (
    <div className="glass rounded-2xl p-5 border border-slate-800/80 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-glow-indigo/20">
            <BarChart3 size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Failure Analytics & Incident Metrics
              {error ? (
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  Database Unavailable
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles size={10} /> Live Supabase Data
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Campus hardware reliability breakdown, MTTR metrics, & fault distribution patterns
            </p>
          </div>
        </div>

        {/* Time range selector & refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => loadAnalytics()}
            className="p-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh analytics data"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-indigo-400' : ''} />
          </button>

          <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
            {(['TODAY', 'WEEK', 'MONTH', 'ALL'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  timeRange === r
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r === 'TODAY' ? '24h' : r === 'WEEK' ? '7 Days' : r === 'MONTH' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          Could not load incident data from the database: {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MTTR */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/5 border border-emerald-500/30 hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400">Mean Time to Resolution (MTTR)</span>
            <Clock size={16} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-300 font-mono">{mttrDisplay}</p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-400 font-semibold">
            {mttrTrend?.isFaster ? <TrendingDown size={13} /> : <TrendingUp size={13} className="text-amber-400" />}
            <span className={mttrTrend?.isFaster ? 'text-emerald-400' : 'text-amber-400'}>
              {mttrTrend?.text || 'Calculated from database'}
            </span>
          </div>
        </div>

        {/* Peak Fault Hours */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/5 border border-amber-500/30 hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-400">Peak Fault Window</span>
            <AlertOctagon size={16} className="text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-300 font-mono">{peakWindowDisplay}</p>
          <p className="text-[11px] text-slate-400 mt-1 truncate" title={peakWindowDetail}>
            {peakWindowDetail}
          </p>
        </div>

        {/* Hardware Health Score */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/15 to-cyan-500/5 border border-indigo-500/30 hover:border-indigo-500/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-indigo-400">Fleet Availability Index</span>
            <Cpu size={16} className="text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-indigo-300 font-mono">{fleetAvailabilityPct}</p>
          <p className="text-[11px] text-slate-400 mt-1">{fleetStatusDetail}</p>
        </div>

        {/* Total Incidents Logged */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/5 border border-violet-500/30 hover:border-violet-500/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-violet-400">
              {timeRange === 'TODAY'
                ? 'Total 24h Failures'
                : timeRange === 'WEEK'
                ? 'Total 7d Failures'
                : timeRange === 'MONTH'
                ? 'Total Month Failures'
                : 'Total Logged Failures'}
            </span>
            <ShieldAlert size={16} className="text-violet-400" />
          </div>
          <p className="text-2xl font-black text-violet-300 font-mono">{totalFailuresCount} tickets</p>
          <p className="text-[11px] text-slate-400 mt-1">{dispatchRateDetail}</p>
        </div>
      </div>

      {/* Domain Breakdown Progress Bars & Room Heat Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Failure Domains */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 space-y-3.5">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
            <span>Failure Domain Breakdown</span>
            <span className="text-slate-500 font-mono text-[10px]">
              {activeTickets.length} Incidents ({timeRange === 'ALL' ? 'All' : timeRange})
            </span>
          </h3>

          <div className="space-y-3">
            {failureDomains.map((domain, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">{domain.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[11px] font-mono">
                      {domain.count} incident{domain.count !== 1 ? 's' : ''}
                    </span>
                    <span className={`font-mono font-bold ${domain.textColor}`}>{domain.percentage}%</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${domain.color} transition-all duration-500`}
                    style={{ width: `${Math.max(domain.count > 0 ? 6 : 0, domain.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Room Failure Density Heat Distribution */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 space-y-3.5">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
            <span>Lab Room Failure Density</span>
            <span className="text-slate-500 font-mono text-[10px]">Spatial Risk</span>
          </h3>

          <div className="space-y-2.5">
            {labDensity.map((lab, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-200">{lab.room}</p>
                  <p
                    className={`text-[10px] ${
                      lab.pct >= 30
                        ? 'text-rose-400 font-semibold'
                        : lab.pct >= 15
                        ? 'text-amber-400 font-semibold'
                        : 'text-slate-500'
                    }`}
                  >
                    {lab.load} · {lab.count} incident{lab.count !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                    <div
                      className={`h-full rounded-full ${
                        lab.pct >= 30 ? 'bg-rose-500' : lab.pct >= 15 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${lab.pct}%` }}
                    />
                  </div>
                  <span className="font-mono font-bold text-slate-300 w-10 text-right">{lab.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hourly Incident Peak Histogram */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center justify-between">
          <span>Fault Incident Frequency by Time of Day</span>
          <span className="text-amber-400 font-mono text-[10px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            {peakHourLabel}
          </span>
        </h3>

        <div className="grid grid-cols-7 gap-2 items-end h-28 pt-2">
          {hourlyPeakData.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
              <span className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.faults} tkt
              </span>
              <div
                className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 ${
                  item.load >= 75
                    ? 'bg-gradient-to-t from-amber-600 to-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                    : 'bg-gradient-to-t from-indigo-700 to-cyan-500 hover:from-indigo-600 hover:to-cyan-400'
                }`}
                style={{ height: `${item.load}%` }}
              />
              <span className="text-[10px] font-mono text-slate-400 mt-1">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

