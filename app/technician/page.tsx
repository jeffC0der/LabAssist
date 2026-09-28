'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/nav/Header';
import MetricsBar from '@/components/dashboard/MetricsBar';
import FilterBar from '@/components/dashboard/FilterBar';
import TicketTable from '@/components/dashboard/TicketTable';
import WorkstationGrid from '@/components/student/WorkstationGrid';
import TechnicianRepairsWorkbench from '@/components/technician/TechnicianRepairsWorkbench';
import { useAuth } from '@/context/AuthContext';
import { useTickets } from '@/context/TicketContext';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Wrench, Monitor, ListOrdered, Sparkles, Layers, Shield } from 'lucide-react';

export type TechnicianTab = 'PC_DISPLAY' | 'DISPATCH_QUEUE' | 'REPAIRS';

interface TabItem {
  id: TechnicianTab;
  label: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
}

export default function TechnicianPage() {
  const { role, isLoading, isAuthenticated } = useAuth();
  const { tickets } = useTickets();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TechnicianTab>('DISPATCH_QUEUE');

  const isAuthorized = isAuthenticated && role === 'TECHNICIAN';

  // Count active pending/dispatched tickets
  const pendingTicketCount = tickets.filter(
    (t) => t.status === 'PENDING' || t.status === 'DISPATCHED'
  ).length;

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/auth');
      } else if (role === 'STUDENT') {
        router.replace('/student');
      } else if (role === 'ADMIN') {
        router.replace('/admin');
      }
    }
  }, [role, isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthorized) {
    return (
      <main className="min-h-screen bg-base flex flex-col items-center justify-center p-4">
        <LoadingSpinner size={28} className="text-indigo-400 mb-2" />
        <p className="text-xs text-slate-400 font-mono">Verifying Technician Authorization...</p>
      </main>
    );
  }

  const tabs: TabItem[] = [
    {
      id: 'PC_DISPLAY',
      label: 'PC Display',
      icon: <Monitor size={16} />,
      badge: (
        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
          Orientation
        </span>
      ),
    },
    {
      id: 'DISPATCH_QUEUE',
      label: 'IT Operations & Dispatch Queue',
      icon: <ListOrdered size={16} />,
      badge: pendingTicketCount > 0 ? (
        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          {pendingTicketCount} Live
        </span>
      ) : undefined,
    },
    {
      id: 'REPAIRS',
      label: 'Repairs',
      icon: <Wrench size={16} />,
      badge: (
        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-violet-500/20 text-violet-300 border border-violet-500/30">
          Job Cards
        </span>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-base pb-12" id="technician-portal-main">
      <a
        href="#technician-portal-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-500 focus:text-white focus:rounded-lg"
      >
        Skip to technician dashboard
      </a>

      <Header />

      <div className="max-w-[1650px] mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
        {/* Title & Live Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-purple-950/60 border border-indigo-500/20 shadow-card">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100 flex items-center gap-2">
                <Wrench size={22} className="text-indigo-400" />
                IT Field Technician Operations Board
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                Live Operations
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Monitoring all campus lab units · Real-time hardware bench queue, PC orientation diagnostics & repair job cards
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-800 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-emerald-400 font-bold">Technician Verified</span>
          </div>
        </div>

        {/* ── Technician Tabs Navigation Bar ──────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800/80 backdrop-blur-md shadow-card">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-glow-indigo'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge}
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: PC Display (Orientation & Layout Grid) ────────── */}
        {activeTab === 'PC_DISPLAY' && (
          <section aria-label="PC Display Orientation Grid" className="animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Monitor size={18} className="text-cyan-400" />
                  Campus PC Stations Display & Physical Orientation
                </h2>
                <p className="text-xs text-slate-400">
                  Visual layout grid of all campus laboratory workstations with hardware specifications, IP telemetry, and active failure flags.
                </p>
              </div>
            </div>

            <WorkstationGrid />
          </section>
        )}

        {/* ── TAB 2: IT Operations & Dispatch Queue ─────────────────── */}
        {activeTab === 'DISPATCH_QUEUE' && (
          <section aria-label="IT Operations & Dispatch Queue" className="animate-fade-in space-y-6">
            {/* KPI Metrics */}
            <MetricsBar />

            {/* Filters */}
            <FilterBar />

            {/* Ticket Table */}
            <TicketTable />
          </section>
        )}

        {/* ── TAB 3: Repairs (Job Cards with Quick Filters PC / Laptop) ─ */}
        {activeTab === 'REPAIRS' && (
          <section aria-label="Repairs Workbench & Job Cards" className="animate-fade-in">
            <TechnicianRepairsWorkbench />
          </section>
        )}

        {/* Global Footer */}
        <div className="mt-12 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <span>LabAssist IT Operations · Campus Field Technicians</span>
          <span className="flex items-center gap-1.5 font-mono text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Dispatch Queue: 0.8s SLA
          </span>
        </div>
      </div>
    </main>
  );
}
