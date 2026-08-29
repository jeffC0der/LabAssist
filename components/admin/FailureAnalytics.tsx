'use client';
import React, { useState } from 'react';
import { BarChart3, TrendingDown, Clock, ShieldAlert, Cpu, Layers, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { useTickets } from '@/context/TicketContext';

export default function FailureAnalytics() {
  const { tickets } = useTickets();
  const [timeRange, setTimeRange] = useState<'TODAY' | 'WEEK' | 'MONTH'>('WEEK');

  // Failure categories calculation
  const total = tickets.length || 1;
  const displayCount = tickets.filter(t => t.category === 'DISPLAY').length;
  const peripheralsCount = tickets.filter(t => t.category === 'PERIPHERALS').length;
  const powerCount = tickets.filter(t => t.category === 'POWER/UPS').length;
  const netCount = tickets.filter(t => t.category === 'NET/SOFTWARE').length;

  const displayPct = Math.round((displayCount / total) * 100);
  const peripheralsPct = Math.round((peripheralsCount / total) * 100);
  const powerPct = Math.round((powerCount / total) * 100);
  const netPct = Math.round((netCount / total) * 100);

  // Failure Domains
  const failureDomains = [
    {
      name: 'Display & Projectors [Key A]',
      count: displayCount,
      percentage: displayPct,
      color: 'from-blue-500 to-indigo-500',
      bg: 'bg-blue-500',
      textColor: 'text-blue-400',
    },
    {
      name: 'Power Grid & UPS Batteries [Key C]',
      count: powerCount,
      percentage: powerPct,
      color: 'from-red-500 to-orange-500',
      bg: 'bg-red-500',
      textColor: 'text-red-400',
    },
    {
      name: 'Network & OS Drivers [Key D]',
      count: netCount,
      percentage: netPct,
      color: 'from-cyan-500 to-teal-500',
      bg: 'bg-cyan-500',
      textColor: 'text-cyan-400',
    },
    {
      name: 'Input Peripherals & Audio [Key B]',
      count: peripheralsCount,
      percentage: peripheralsPct,
      color: 'from-violet-500 to-purple-500',
      bg: 'bg-violet-500',
      textColor: 'text-violet-400',
    },
  ];

  // Room failure density
  const labDensity = [
    { room: 'LAB-302 (Embedded Systems)', count: 5, pct: 36, load: 'High Exposure' },
    { room: 'LAB-101 (Intro Computing)', count: 3, pct: 24, load: 'Moderate' },
    { room: 'LAB-204 (Digital Logic)', count: 2, pct: 18, load: 'Moderate' },
    { room: 'LAB-401 (AI & Studio)', count: 2, pct: 14, load: 'Low Fault' },
    { room: 'LAB-205 (Microcontrollers)', count: 1, pct: 8, load: 'Low Fault' },
  ];

  // Time of Day Peak Distribution (8am to 8pm)
  const hourlyPeakData = [
    { time: '08:00', load: 15, faults: 1 },
    { time: '10:00', load: 45, faults: 3 },
    { time: '12:00', load: 30, faults: 2 },
    { time: '14:00', load: 95, faults: 7 }, // Peak
    { time: '16:00', load: 80, faults: 5 },
    { time: '18:00', load: 35, faults: 2 },
    { time: '20:00', load: 20, faults: 1 },
  ];

  return (
    <div className="glass rounded-2xl p-5 border border-slate-800/80 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <BarChart3 size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Failure Analytics & Incident Metrics
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                AI Diagnostics
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Campus hardware reliability breakdown, MTTR metrics, & fault distribution patterns
            </p>
          </div>
        </div>

        {/* Time range selector */}
        <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          {(['TODAY', 'WEEK', 'MONTH'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                timeRange === r
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r === 'TODAY' ? '24h' : r === 'WEEK' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MTTR */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/5 border border-emerald-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400">Mean Time to Resolution (MTTR)</span>
            <Clock size={16} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-300 font-mono">18.4 mins</p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-400 font-semibold">
            <TrendingDown size={13} />
            <span>-14.2% faster vs last week</span>
          </div>
        </div>

        {/* Peak Fault Hours */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/5 border border-amber-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-400">Peak Fault Window</span>
            <AlertOctagon size={16} className="text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-300 font-mono">14:00 – 16:00</p>
          <p className="text-[11px] text-slate-400 mt-1">Lab Session B (High GPU Load)</p>
        </div>

        {/* Hardware Health Score */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/15 to-cyan-500/5 border border-indigo-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-indigo-400">Fleet Availability Index</span>
            <Cpu size={16} className="text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-indigo-300 font-mono">96.8%</p>
          <p className="text-[11px] text-slate-400 mt-1">94 of 98 workstations ready</p>
        </div>

        {/* Total Incidents Logged */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/5 border border-violet-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-violet-400">Total Month Failures</span>
            <ShieldAlert size={16} className="text-violet-400" />
          </div>
          <p className="text-2xl font-black text-violet-300 font-mono">142 tickets</p>
          <p className="text-[11px] text-slate-400 mt-1">98.5% technician dispatch rate</p>
        </div>
      </div>

      {/* Domain Breakdown Progress Bars & Room Heat Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Failure Domains */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 space-y-3.5">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
            <span>Failure Domain Breakdown</span>
            <span className="text-slate-500 font-mono text-[10px]">Campus Total</span>
          </h3>

          <div className="space-y-3">
            {failureDomains.map((domain, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">{domain.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[11px] font-mono">{domain.count} incidents</span>
                    <span className={`font-mono font-bold ${domain.textColor}`}>{domain.percentage}%</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${domain.color} transition-all duration-500`}
                    style={{ width: `${Math.max(8, domain.percentage)}%` }}
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
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs">
                <div>
                  <p className="font-semibold text-slate-200">{lab.room}</p>
                  <p className="text-[10px] text-slate-500">{lab.load}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                    <div
                      className={`h-full rounded-full ${lab.pct > 30 ? 'bg-rose-500' : lab.pct > 15 ? 'bg-amber-500' : 'bg-emerald-500'}`}
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
            Peak at 14:00 (Lab Switchover)
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
                  item.load > 80
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
