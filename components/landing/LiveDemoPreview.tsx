'use client';
import React, { useState, useEffect } from 'react';
import { Monitor, Keyboard, Zap, Wifi, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

const KEY_MAPPINGS = [
  { key: 'A', category: 'DISPLAY',      icon: <Monitor size={14} />,  color: 'text-blue-400',   bg: 'bg-blue-500/15',   border: 'border-blue-500/30',   status: 'PENDING'    },
  { key: 'B', category: 'PERIPHERALS',  icon: <Keyboard size={14} />, color: 'text-violet-400', bg: 'bg-violet-500/15', border: 'border-violet-500/30', status: 'DISPATCHED' },
  { key: 'C', category: 'POWER/UPS',    icon: <Zap size={14} />,      color: 'text-red-400',    bg: 'bg-red-500/15',    border: 'border-red-500/30',    status: 'PENDING'    },
  { key: 'D', category: 'NET/SOFTWARE', icon: <Wifi size={14} />,     color: 'text-cyan-400',   bg: 'bg-cyan-500/15',   border: 'border-cyan-500/30',   status: 'RESOLVED'   },
];

const DEMO_TICKETS = [
  { id: 'TKT-2401', lab: 'LAB-302', pc: 'PC-07', key: 'A', delay: 0 },
  { id: 'TKT-2402', lab: 'LAB-101', pc: 'PC-12', key: 'D', delay: 1200 },
  { id: 'TKT-2403', lab: 'LAB-204', pc: 'PC-03', key: 'C', delay: 2400 },
];

export default function LiveDemoPreview() {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [pulseKey, setPulseKey] = useState<string | null>(null);

  // Cycle through key presses for demo
  useEffect(() => {
    const keys = ['A', 'B', 'C', 'D'];
    let i = 0;
    const interval = setInterval(() => {
      const k = keys[i % keys.length];
      setActiveKey(k);
      setPulseKey(k);
      setTimeout(() => {
        setActiveKey(null);
        setPulseKey(null);
      }, 900);
      i++;
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="live-demo"
      className="relative py-24 px-4"
      aria-label="Live demo preview section"
    >
      {/* Section header */}
      <div className="max-w-6xl mx-auto text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" aria-hidden="true" />
          <span className="text-xs font-semibold text-cyan-400 tracking-wide uppercase">Live Demo Preview</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-3">
          From Physical Press to Digital Ticket
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto text-base">
          Students press a key on the ESP32 remote — a ticket instantly appears in the IT dashboard.
          No forms. No phone calls. Just one press.
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-center">
        {/* Left: ESP32 Remote Keypad */}
        <div className="animate-fade-in-up">
          <div className="glass rounded-2xl p-6 relative scanline-container overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-200">ESP32 Physical Remote</h3>
                <p className="text-xs text-slate-500 mt-0.5">IoT Keypad Module · Lab Unit</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping-slow" aria-hidden="true" />
                <span className="text-xs text-emerald-400 font-medium">Connected</span>
              </div>
            </div>

            {/* PC Number selector */}
            <div className="mb-5">
              <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">PC Number</p>
              <div className="flex gap-2 flex-wrap">
                {[7, 12, 3, 18, 22].map(n => (
                  <button
                    key={n}
                    className="px-3 py-1.5 text-xs font-mono font-semibold rounded-lg bg-slate-700/60 text-slate-300 border border-slate-600/50 hover:border-indigo-500/50 hover:text-indigo-300 transition-all"
                    aria-label={`PC ${n}`}
                  >
                    PC-{String(n).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* Key buttons grid */}
            <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wide">Failure Category Keys</p>
            <div className="grid grid-cols-2 gap-3">
              {KEY_MAPPINGS.map(({ key, category, icon, color, bg, border }) => (
                <button
                  key={key}
                  aria-label={`Key ${key}: ${category}`}
                  className={`
                    relative flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border
                    font-mono font-bold transition-all duration-200 cursor-pointer
                    ${bg} ${border}
                    ${activeKey === key
                      ? `scale-95 shadow-lg ring-2 ring-offset-2 ring-offset-slate-900 ${color.replace('text-', 'ring-')}`
                      : 'hover:scale-[1.02] hover:shadow-md'
                    }
                  `}
                >
                  {pulseKey === key && (
                    <span className="absolute inset-0 rounded-xl animate-ping opacity-30 border-2 border-current" aria-hidden="true" />
                  )}
                  <span className={`text-xl ${color}`}>[{key}]</span>
                  <span className={`${color} opacity-80`}>{icon}</span>
                  <span className="text-xs text-slate-400 font-sans font-medium text-center leading-tight">{category}</span>
                </button>
              ))}
            </div>

            {/* Footer note */}
            <p className="text-xs text-slate-600 text-center mt-4">
              ↑ Keys cycle automatically in demo · Select PC # first, then press key
            </p>
          </div>
        </div>

        {/* Right: Live Ticket Feed */}
        <div className="flex flex-col gap-4 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-200">Live Ticket Queue</h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock size={12} aria-hidden="true" />
                <span>Real-time</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {DEMO_TICKETS.map((ticket) => {
                const mapping = KEY_MAPPINGS.find(m => m.key === ticket.key)!;
                const isActive = activeKey === ticket.key;
                return (
                  <div
                    key={ticket.id}
                    className={`
                      flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-300
                      ${mapping.bg} ${mapping.border}
                      ${isActive ? 'scale-[1.02] shadow-lg' : ''}
                    `}
                    aria-label={`Ticket ${ticket.id} from ${ticket.lab} ${ticket.pc}`}
                  >
                    {/* Key badge */}
                    <span className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${mapping.bg} ${mapping.color} border ${mapping.border}`}>
                      [{ticket.key}]
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-semibold text-slate-300">{ticket.id}</span>
                        <span className="text-xs text-slate-500">{ticket.lab}</span>
                        <span className="text-xs text-slate-500">{ticket.pc}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`${mapping.color} opacity-80`}>{mapping.icon}</span>
                        <span className={`text-xs font-semibold ${mapping.color}`}>{mapping.category}</span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex-shrink-0">
                      {mapping.status === 'RESOLVED' ? (
                        <CheckCircle2 size={16} className="text-emerald-400" aria-label="Resolved" />
                      ) : mapping.status === 'DISPATCHED' ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">Sent</span>
                      ) : (
                        <AlertCircle size={16} className={`${mapping.color} animate-pulse`} aria-label="Pending" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info card */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-200 mb-3">How It Works</h3>
            <ol className="space-y-2.5">
              {[
                { step: '1', text: 'Student selects their PC number on the ESP32 keypad' },
                { step: '2', text: 'Student presses A, B, C, or D to report the failure type' },
                { step: '3', text: 'Ticket is instantly created in the IT dashboard' },
                { step: '4', text: 'Technician dispatches and updates status in real-time' },
              ].map(({ step, text }) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 text-xs font-bold flex items-center justify-center">{step}</span>
                  <span className="text-xs text-slate-400 leading-relaxed">{text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
