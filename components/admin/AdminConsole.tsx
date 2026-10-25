'use client';
import React, { useState } from 'react';
import TelemetryFleetDiagnostics from './TelemetryFleetDiagnostics';
import FailureAnalytics from './FailureAnalytics';
import RevenueAnalytics from './RevenueAnalytics';
import UserAccessControl from './UserAccessControl';
import LabStationManager from './LabStationManager';
import WorkstationGrid from '@/components/student/WorkstationGrid';
import { Shield, Radio, BarChart3, DollarSign, Users, Layers, Sparkles, ListOrdered, Monitor, HardDrive } from 'lucide-react';
import PcInventory from '@/components/dashboard/PcInventory';
import { useTickets } from '@/context/TicketContext';
import { useWorkstations } from '@/context/WorkstationContext';
import TicketQueueSection from '@/components/dashboard/TicketQueueSection';

type AdminTab = 'WORKSTATIONS' | 'TICKETS' | 'FLEET' | 'ANALYTICS' | 'REVENUE' | 'RBAC' | 'ROOMS' | 'INVENTORY';

export default function AdminConsole() {
  const { tickets } = useTickets();
  const { workstations } = useWorkstations();
  const [activeTab, setActiveTab] = useState<AdminTab>('WORKSTATIONS');

  const pendingCount = tickets.filter(t => t.status === 'PENDING').length;
  const dispatchedCount = tickets.filter(t => t.status === 'DISPATCHED').length;
  const allStations = Object.values(workstations).flat();
  const faultyStationCount = allStations.filter(s => s.status === 'ISSUE_REPORTED' || s.status === 'UNDER_REPAIR').length;

  const adminTabs: Array<{ id: AdminTab; label: string; icon: React.ReactNode; badge?: string }> = [
    {
      id: 'WORKSTATIONS',
      label: 'Live Workstations',
      icon: <Monitor size={15} />,
      badge: faultyStationCount > 0 ? `${faultyStationCount} Need Attention` : `${allStations.length} PCs`,
    },
    {
      id: 'TICKETS',
      label: 'Ticket Queue & Dispatch',
      icon: <ListOrdered size={15} />,
      badge: pendingCount > 0 ? `${pendingCount} Pending` : `${dispatchedCount} Dispatched`,
    },
    { id: 'FLEET', label: 'ESP32 Fleet Telemetry', icon: <Radio size={15} />, badge: '6 Nodes Live' },
    { id: 'ANALYTICS', label: 'Failure Analytics', icon: <BarChart3 size={15} />, badge: `${tickets.length} Incidents` },
    { id: 'REVENUE', label: 'Revenue Analytics', icon: <DollarSign size={15} />, badge: 'Live Ledger' },
    { id: 'RBAC', label: 'User & Access Control', icon: <Users size={15} />, badge: 'Live DB' },
    { id: 'ROOMS', label: 'Lab & Station Manager', icon: <Layers size={15} />, badge: '5 Labs' },
    { id: 'INVENTORY', label: 'PC Inventory', icon: <HardDrive size={15} />, badge: `${allStations.length} PCs` },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Admin Operations Console Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-purple-950/60 border border-violet-500/20 p-5 sm:p-6 shadow-card">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-semibold mb-2">
              <Shield size={13} />
              <span>Campus IT Admin Operations Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Centralized Infrastructure & IoT Administration
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Monitor remote ESP32 hardware clusters, dispatch field technicians with live roster selection, audit campus failure metrics, provision access keys, and configure lab workstation topologies.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-800 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-emerald-400 font-bold">Admin Root Access</span>
          </div>
        </div>
      </div>

      {/* Main Layout: left navigation menu (lg+) / scrollable tab row (smaller screens) + section content */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        <aside className="w-full lg:w-72 flex-shrink-0 lg:sticky lg:top-20">
          <div className="glass rounded-2xl p-2 sm:p-3 border border-slate-800/80 shadow-card">
            <div className="hidden lg:flex px-3 pt-1 pb-3 mb-2 text-[11px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800/60 items-center justify-between">
              <span>Admin Navigation</span>
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            </div>

            <nav
              className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible"
              aria-label="Admin Console Sections"
            >
              {adminTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group relative flex-shrink-0 lg:w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-violet-500/20 to-indigo-500/10 border-violet-500/40 shadow-lg'
                        : 'border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        isActive
                          ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-glow-indigo'
                          : 'bg-slate-800/70 text-slate-400 group-hover:text-slate-200'
                      }`}
                    >
                      {tab.icon}
                    </div>
                    <div className="min-w-0">
                      <span
                        className={`block text-xs font-bold whitespace-nowrap lg:whitespace-normal ${
                          isActive ? 'text-slate-50' : 'text-slate-200'
                        }`}
                      >
                        {tab.label}
                      </span>
                      {tab.badge && (
                        <span
                          className={`block text-[10px] font-mono mt-0.5 whitespace-nowrap ${
                            isActive ? 'text-violet-200' : 'text-slate-500'
                          }`}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </div>

                    {/* Active accent bar */}
                    {isActive && (
                      <span className="hidden lg:block absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-violet-400" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Section Content */}
        <div className="flex-1 min-w-0 w-full transition-all duration-300 space-y-6">
          {activeTab === 'WORKSTATIONS' && (
            <section aria-label="Campus Workstation Fleet" className="animate-fade-in">
              <WorkstationGrid />
            </section>
          )}
          {activeTab === 'TICKETS' && (
            <div className="animate-fade-in">
              {/* Pending / Resolved tickets and PC admin credentials */}
              <TicketQueueSection />
            </div>
          )}
          {activeTab === 'FLEET' && <TelemetryFleetDiagnostics />}
          {activeTab === 'ANALYTICS' && <FailureAnalytics />}
          {activeTab === 'REVENUE' && <RevenueAnalytics />}
          {activeTab === 'RBAC' && <UserAccessControl />}
          {activeTab === 'ROOMS' && <LabStationManager />}
          {activeTab === 'INVENTORY' && <PcInventory />}
        </div>
      </div>
    </div>
  );
}
