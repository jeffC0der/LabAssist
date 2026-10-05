'use client';
import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  Clock,
  ShieldAlert,
  Cpu,
  AlertOctagon,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useTickets } from '@/context/TicketContext';
import { useWorkstations } from '@/context/WorkstationContext';

const LAB_NAME_MAP: Record<string, string> = {
  'LAB-101': 'LAB-101 (Embedded Systems)',
  'LAB-102': 'LAB-102 (Intro Computing)',
  'LAB-103': 'LAB-103 (Digital Logic)',
  'LAB-104': 'LAB-104 (Microcontrollers)',
  'LAB-105': 'LAB-105 (AI & Studio)',
};

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

const TIME_SLOTS = [
  { time: '08:00', minHour: 7, maxHour: 8 },
  { time: '10:00', minHour: 9, maxHour: 10 },
  { time: '12:00', minHour: 11, maxHour: 12 },
  { time: '14:00', minHour: 13, maxHour: 14 },
  { time: '16:00', minHour: 15, maxHour: 16 },
  { time: '18:00', minHour: 17, maxHour: 18 },
  { time: '20:00', minHour: 19, maxHour: 23 },
];

export default function FailureAnalytics() {
  const { tickets, isLoading: isTicketsLoading, refreshTickets } = useTickets();
  const { workstations } = useWorkstations();
  const [timeRange, setTimeRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('WEEK');

  // 1. Filter tickets by timeRange
  const { activeTickets, prevPeriodTickets } = useMemo(() => {
    const now = Date.now();
    let durationMs = 7 * 24 * 60 * 60 * 1000;
    if (timeRange === 'TODAY') durationMs = 24 * 60 * 60 * 1000;
    else if (timeRange === 'WEEK') durationMs = 7 * 24 * 60 * 60 * 1000;
    else if (timeRange === 'MONTH') durationMs = 30 * 24 * 60 * 60 * 1000;
    else if (timeRange === 'ALL') durationMs = Infinity;

    const filtered = tickets.filter((t) => {
      if (timeRange === 'ALL') return true;
      const tTime = new Date(t.timestamp).getTime();
      return !isNaN(tTime) && now - tTime <= durationMs;
    });

    const prevFiltered = tickets.filter((t) => {
      if (timeRange === 'ALL') return false;
      const tTime = new Date(t.timestamp).getTime();
      return !isNaN(tTime) && now - tTime > durationMs && now - tTime <= durationMs * 2;
    });

    // Fallback gracefully if database has tickets but none in narrow slice
    const selected = filtered.length > 0 || timeRange === 'ALL' ? filtered : tickets;
    return { activeTickets: selected, prevPeriodTickets: prevFiltered };
  }, [tickets, timeRange]);

  // 2. Mean Time to Resolution (MTTR) calculation
  const { mttrDisplay, mttrTrend } = useMemo(() => {
    const resolved = activeTickets.filter(
      (t) => t.status === 'RESOLVED' && t.resolvedAt && t.timestamp
    );

    if (resolved.length === 0) {
      // Check if there are any all-time resolved tickets
      const allResolved = tickets.filter(
        (t) => t.status === 'RESOLVED' && t.resolvedAt && t.timestamp
      );
      if (allResolved.length > 0) {
        const sum = allResolved.reduce((acc, t) => {
          const start = new Date(t.timestamp).getTime();
          const end = new Date(t.resolvedAt!).getTime();
          return acc + Math.max(0, (end - start) / 60000);
        }, 0);
        const avg = sum / allResolved.length;
        return {
          mttrDisplay: avg >= 60 ? `${(avg / 60).toFixed(1)} hrs` : `${avg.toFixed(1)} mins`,
          mttrTrend: { text: `Based on ${allResolved.length} all-time resolved tickets`, isFaster: true },
        };
      }
      return {
        mttrDisplay: '0.0 mins',
        mttrTrend: { text: 'No resolved tickets logged yet', isFaster: true },
      };
    }

    const currentSum = resolved.reduce((acc, t) => {
      const start = new Date(t.timestamp).getTime();
      const end = new Date(t.resolvedAt!).getTime();
      return acc + Math.max(0, (end - start) / 60000);
    }, 0);
    const currentAvg = currentSum / resolved.length;

    // Previous period resolved
    const prevResolved = prevPeriodTickets.filter(
      (t) => t.status === 'RESOLVED' && t.resolvedAt && t.timestamp
    );

    let trendObj = {
      text: `${resolved.length} tickets resolved in period`,
      isFaster: true,
    };

    if (prevResolved.length > 0) {
      const prevSum = prevResolved.reduce((acc, t) => {
        const start = new Date(t.timestamp).getTime();
        const end = new Date(t.resolvedAt!).getTime();
        return acc + Math.max(0, (end - start) / 60000);
      }, 0);
      const prevAvg = prevSum / prevResolved.length;

      if (prevAvg > 0) {
        const delta = ((currentAvg - prevAvg) / prevAvg) * 100;
        const isFaster = delta <= 0;
        trendObj = {
          text: `${Math.abs(delta).toFixed(1)}% ${isFaster ? 'faster' : 'slower'} vs last period`,
          isFaster,
        };
      }
    }

    return {
      mttrDisplay: currentAvg >= 60 ? `${(currentAvg / 60).toFixed(1)} hrs` : `${currentAvg.toFixed(1)} mins`,
      mttrTrend: trendObj,
    };
  }, [activeTickets, prevPeriodTickets, tickets]);

  // 3. Peak Fault Window calculation
  const { peakWindowDisplay, peakWindowDetail } = useMemo(() => {
    if (activeTickets.length === 0) {
      return {
        peakWindowDisplay: '08:00 – 10:00',
        peakWindowDetail: 'No incidents logged in window',
      };
    }

    // Windows of 2 hours: 08-10, 10-12, 12-14, 14-16, 16-18, 18-20, 20-22
    const windows: Record<string, { count: number; labCounts: Record<string, number> }> = {
      '08:00 – 10:00': { count: 0, labCounts: {} },
      '10:00 – 12:00': { count: 0, labCounts: {} },
      '12:00 – 14:00': { count: 0, labCounts: {} },
      '14:00 – 16:00': { count: 0, labCounts: {} },
      '16:00 – 18:00': { count: 0, labCounts: {} },
      '18:00 – 20:00': { count: 0, labCounts: {} },
      '20:00 – 22:00': { count: 0, labCounts: {} },
    };

    activeTickets.forEach((t) => {
      const d = new Date(t.timestamp);
      const hour = isNaN(d.getTime()) ? 14 : d.getHours();
      let key = '14:00 – 16:00';

      if (hour < 10) key = '08:00 – 10:00';
      else if (hour < 12) key = '10:00 – 12:00';
      else if (hour < 14) key = '12:00 – 14:00';
      else if (hour < 16) key = '14:00 – 16:00';
      else if (hour < 18) key = '16:00 – 18:00';
      else if (hour < 20) key = '18:00 – 20:00';
      else key = '20:00 – 22:00';

      windows[key].count++;
      windows[key].labCounts[t.lab_id] = (windows[key].labCounts[t.lab_id] || 0) + 1;
    });

    let bestWindow = '14:00 – 16:00';
    let maxCount = -1;

    Object.entries(windows).forEach(([win, data]) => {
      if (data.count > maxCount) {
        maxCount = data.count;
        bestWindow = win;
      }
    });

    // Determine top lab in peak window
    const topLabEntry = Object.entries(windows[bestWindow].labCounts).sort((a, b) => b[1] - a[1])[0];
    const topLabName = topLabEntry ? topLabEntry[0] : 'Campus Labs';
    const detail =
      maxCount > 0
        ? `${topLabName} (${maxCount} incident${maxCount > 1 ? 's' : ''} recorded)`
        : 'Normal operational load';

    return { peakWindowDisplay: bestWindow, peakWindowDetail: detail };
  }, [activeTickets]);

  // 4. Fleet Availability Index calculation
  const { fleetAvailabilityPct, fleetStatusDetail } = useMemo(() => {
    const allStations = Object.values(workstations).flat();
    const totalStations = allStations.length || 98;
    const underRepairCount = allStations.filter((s) => s.status === 'UNDER_REPAIR').length;
    const readyCount = totalStations - underRepairCount;
    const pct = totalStations > 0 ? ((readyCount / totalStations) * 100).toFixed(1) : '100.0';

    return {
      fleetAvailabilityPct: `${pct}%`,
      fleetStatusDetail: `${readyCount} of ${totalStations} workstations ready`,
    };
  }, [workstations]);

  // 5. Total Failures / Dispatch Rate
  const { totalFailuresCount, dispatchRateDetail } = useMemo(() => {
    const count = activeTickets.length;
    const dispatchedOrResolved = activeTickets.filter(
      (t) => t.status === 'DISPATCHED' || t.status === 'RESOLVED'
    ).length;
    const rate = count > 0 ? ((dispatchedOrResolved / count) * 100).toFixed(1) : '100.0';

    return {
      totalFailuresCount: count,
      dispatchRateDetail: `${rate}% technician dispatch rate`,
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

  // 7. Lab Room Failure Density
  const labDensity = useMemo(() => {
    const total = activeTickets.length || 1;
    const counts: Record<string, number> = {
      'LAB-101': 0,
      'LAB-102': 0,
      'LAB-103': 0,
      'LAB-104': 0,
      'LAB-105': 0,
    };

    activeTickets.forEach((t) => {
      counts[t.lab_id] = (counts[t.lab_id] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([roomCode, count]) => {
        const pct = Math.round((count / total) * 100);
        let load = 'Low Fault';
        if (pct >= 30 || count >= 4) load = 'High Exposure';
        else if (pct >= 15 || count >= 2) load = 'Moderate';
        else if (count === 0) load = 'Optimal (0 Faults)';

        return {
          room: LAB_NAME_MAP[roomCode] || roomCode,
          code: roomCode,
          count,
          pct,
          load,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [activeTickets]);

  // 8. Time of Day Peak Distribution Histogram
  const { hourlyPeakData, peakHourLabel } = useMemo(() => {
    const slotCounts = TIME_SLOTS.map((slot) => {
      const faults = activeTickets.filter((t) => {
        const d = new Date(t.timestamp);
        if (isNaN(d.getTime())) return false;
        const h = d.getHours();
        return h >= slot.minHour && h <= slot.maxHour;
      }).length;
      return { time: slot.time, faults };
    });

    const maxFaults = Math.max(1, ...slotCounts.map((s) => s.faults));

    let peakSlot = slotCounts[0];
    slotCounts.forEach((s) => {
      if (s.faults > peakSlot.faults) peakSlot = s;
    });

    const hourlyData = slotCounts.map((s) => ({
      time: s.time,
      faults: s.faults,
      load: s.faults > 0 ? Math.max(14, Math.round((s.faults / maxFaults) * 100)) : 8,
    }));

    const peakLabel =
      peakSlot.faults > 0
        ? `Peak at ${peakSlot.time} (${peakSlot.faults} ticket${peakSlot.faults > 1 ? 's' : ''})`
        : 'Even load distribution';

    return { hourlyPeakData: hourlyData, peakHourLabel: peakLabel };
  }, [activeTickets]);

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
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Sparkles size={10} /> Live Supabase Data
              </span>
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
            onClick={() => refreshTickets()}
            className="p-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh analytics data"
          >
            <RefreshCw size={13} className={isTicketsLoading ? 'animate-spin text-indigo-400' : ''} />
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

