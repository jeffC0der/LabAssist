'use client';
import React from 'react';
import Link from 'next/link';
import { Cpu, Wifi, LogIn } from 'lucide-react';

export default function LandingHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 nav-blur border-b border-slate-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="LabAssist Home">
          <div className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-glow-indigo group-hover:shadow-glow-cyan transition-all duration-300">
            <Cpu size={18} className="text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900" />
          </div>
          <div>
            <span className="text-base font-bold text-slate-100 tracking-tight">Lab</span>
            <span className="text-base font-bold gradient-text tracking-tight">Assist</span>
          </div>
        </Link>

        {/* Center — System Status */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
          <Wifi size={12} className="text-emerald-400 animate-pulse" aria-hidden="true" />
          <span className="text-xs font-semibold text-emerald-400 status-dot-online">ESP32 Gateway Live</span>
        </div>

        {/* Single Sign In CTA — no dedicated Admin link */}
        <div className="flex items-center gap-3">
          <Link
            href="/auth"
            id="landing-signin-btn"
            className="flex items-center gap-2 px-4 py-2 rounded-lg btn-primary text-xs font-semibold"
            aria-label="Sign in to LabAssist"
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
