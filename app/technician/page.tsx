'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/nav/Header';
import MetricsBar from '@/components/dashboard/MetricsBar';
import FilterBar from '@/components/dashboard/FilterBar';
import TicketTable from '@/components/dashboard/TicketTable';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Wrench } from 'lucide-react';

export default function TechnicianPage() {
  const { role, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const isAuthorized = isAuthenticated && role === 'TECHNICIAN';

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

  return (
    <main className="min-h-screen bg-base pb-12" id="technician-portal-main">
      <a href="#technician-portal-main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-500 focus:text-white focus:rounded-lg">
        Skip to technician dashboard
      </a>

      <Header />

      <div className="max-w-[1650px] mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
        {/* Title & Live Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Wrench size={20} className="text-indigo-400" />
                IT Operations & Dispatch Queue
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                Technician Live Board
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Monitoring all campus lab units · Real-time hardware bench queue & technician dispatch
            </p>
          </div>
        </div>

        {/* KPI Metrics */}
        <MetricsBar />

        {/* Filters */}
        <FilterBar />

        {/* Ticket Table */}
        <TicketTable />

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
