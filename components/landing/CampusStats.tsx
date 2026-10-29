'use client';
import React, { useEffect, useState } from 'react';
import { Building2, Monitor, Wifi, Users } from 'lucide-react';

interface Stats {
  labs: number;
  totalPcs: number;
  onlinePcs: number;
  inUsePcs: number;
}

/**
 * Live campus-wide PC numbers from /api/public/stats (counts only, refreshed every minute).
 * Same card style and grid as the hero's feature cards, so the two rows read as one design.
 */
export default function CampusStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/public/stats')
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => alive && (setStats(d), setFailed(false)))
        .catch(() => alive && setFailed(true));
    load();
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  if (failed && !stats) return null;

  const items = [
    { icon: <Building2 size={16} />, label: 'Computer labs', value: stats?.labs },
    { icon: <Monitor size={16} />, label: 'PCs monitored', value: stats?.totalPcs },
    { icon: <Wifi size={16} />, label: 'Online & ready now', value: stats?.onlinePcs, live: true },
    { icon: <Users size={16} />, label: 'In use right now', value: stats?.inUsePcs, live: true },
  ];

  return (
    <section id="stats" aria-label="Campus lab statistics" className="relative px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
            Live across campus
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {items.map((it) => (
            <div key={it.label} className="glass rounded-xl p-4 text-left hover:border-indigo-500/40 transition-all duration-200 group">
              <div className="flex items-center gap-2 text-indigo-400 group-hover:text-cyan-400 transition-colors">
                {it.icon}
                <span className="text-xs font-semibold text-slate-200">{it.label}</span>
              </div>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-100 tabular-nums" aria-live={it.live ? 'polite' : undefined}>
                {it.value === undefined ? <span className="inline-block w-12 h-7 rounded-md shimmer align-middle" aria-label="Loading" /> : it.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
