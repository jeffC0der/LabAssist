'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowRight, Cpu, Shield, Zap, BarChart3 } from 'lucide-react';

const FEATURES = [
  { icon: <Zap size={16} />, label: 'ESP32 Physical Keypad', desc: 'Keys A–D map directly to failure categories' },
  { icon: <BarChart3 size={16} />, label: 'Real-Time IT Queue', desc: 'Live dispatch board for technicians' },
  { icon: <Shield size={16} />, label: 'Lab-Wide Coverage', desc: 'Multi-lab monitoring from one dashboard' },
  { icon: <Cpu size={16} />, label: 'Hardware → Software', desc: 'Physical inputs trigger digital tickets instantly' },
];

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center pt-16 pb-8 px-4 overflow-hidden hero-grid"
      aria-label="Hero section"
    >
      {/* Radial glow blob */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, rgba(6,182,212,0.06) 50%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Floating orbs */}
      <div className="absolute top-32 left-16 w-64 h-64 rounded-full blur-3xl opacity-20 animate-float pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} aria-hidden="true" />
      <div className="absolute bottom-32 right-16 w-48 h-48 rounded-full blur-3xl opacity-15 animate-float pointer-events-none"
        style={{ background: 'radial-gradient(circle, #06b6d4, transparent)', animationDelay: '3s' }} aria-hidden="true" />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 mb-8 animate-fade-in-up">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" aria-hidden="true" />
          <span className="text-xs font-semibold text-indigo-400 tracking-wide uppercase">Real-Time Computer Hardware Condition Monitoring and Maintenance Scheduling System</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Campus Lab Maintenance{' '}
          <br className="hidden sm:block" />
          <span className="gradient-text">at the Touch of a Button</span>
        </h1>

        {/* Updated tagline */}
        <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed mb-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Eliminating campus computer lab downtime by integrating IoT hardware remotes with a real-time, role-based IT dispatch platform.
        </p>

        {/* Single centered Get Started CTA */}
        <div className="flex items-center justify-center mb-16 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <Link
            href="/auth"
            id="hero-get-started-btn"
            className="flex items-center gap-2.5 px-8 py-4 rounded-xl btn-primary text-base font-semibold shadow-glow-indigo"
            aria-label="Get Started with LabAssist"
          >
            <span>Get Started</span>
            <ArrowRight size={18} />
          </Link>
        </div>

        {/* Feature pills */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-3xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          {FEATURES.map((f) => (
            <div key={f.label} className="glass rounded-xl p-3 text-left hover:border-indigo-500/40 transition-all duration-200 group cursor-default">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-indigo-400 group-hover:text-cyan-400 transition-colors">{f.icon}</span>
                <span className="text-xs font-semibold text-slate-200">{f.label}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce opacity-50" aria-hidden="true">
        <div className="w-px h-8 bg-gradient-to-b from-transparent to-slate-500" />
        <span className="text-xs text-slate-500">Scroll to explore</span>
      </div>
    </section>
  );
}
