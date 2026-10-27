'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/nav/Header';
import WorkstationGrid from '@/components/student/WorkstationGrid';
import TechnicianRepairsWorkbench from '@/components/technician/TechnicianRepairsWorkbench';
import { useAuth } from '@/context/AuthContext';
import { useTickets } from '@/context/TicketContext';
import { useWorkstations } from '@/context/WorkstationContext';
import { useRepairs } from '@/context/RepairContext';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Wrench, Monitor, ListOrdered, Sparkles, Layers, Shield, HardDrive, Bell } from 'lucide-react';
import NotificationsPanel from '@/components/student/NotificationsPanel';
import { useNotifications, OPEN_PORTAL_TAB_EVENT } from '@/context/NotificationContext';
import PcInventory from '@/components/dashboard/PcInventory';
import TicketQueueSection from '@/components/dashboard/TicketQueueSection';

export type TechnicianTab = 'PC_DISPLAY' | 'DISPATCH_QUEUE' | 'REPAIRS' | 'INVENTORY' | 'NOTIFICATIONS';

interface TabItem {
  id: TechnicianTab;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

export default function TechnicianPage() {
  const { role, isLoading, isAuthenticated } = useAuth();
  const { tickets } = useTickets();
  const { workstations } = useWorkstations();
  const { repairs } = useRepairs();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TechnicianTab>('DISPATCH_QUEUE');
  const { unreadCount } = useNotifications();

  // Open the full notifications list from the bell ("Show All") or a ?tab=NOTIFICATIONS link
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'NOTIFICATIONS') setActiveTab('NOTIFICATIONS');
    const onOpenTab = (e: Event) => {
      if ((e as CustomEvent).detail === 'NOTIFICATIONS') setActiveTab('NOTIFICATIONS');
    };
    window.addEventListener(OPEN_PORTAL_TAB_EVENT, onOpenTab);
    return () => window.removeEventListener(OPEN_PORTAL_TAB_EVENT, onOpenTab);
  }, []);

  const isAuthorized = isAuthenticated && role === 'TECHNICIAN';

  // Real counts for the menu badges
  const pendingTicketCount = tickets.filter((t) => t.status === 'PENDING').length;
  const dispatchedTicketCount = tickets.filter((t) => t.status === 'DISPATCHED').length;
  const allStations = Object.values(workstations).flat();
  const faultyStationCount = allStations.filter((st) => st.status === 'ISSUE_REPORTED' || st.status === 'UNDER_REPAIR').length;
  const activeRepairCount = repairs.filter((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED').length;

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
      label: 'Live Workstations',
      icon: <Monitor size={15} />,
      badge: faultyStationCount > 0 ? `${faultyStationCount} Need Attention` : `${allStations.length} PCs`,
    },
    {
      id: 'DISPATCH_QUEUE',
      label: 'Ticket Queue & Dispatch',
      icon: <ListOrdered size={15} />,
      badge: pendingTicketCount > 0 ? `${pendingTicketCount} Pending` : `${dispatchedTicketCount} Dispatched`,
    },
    {
      id: 'REPAIRS',
      label: 'Repairs & Job Cards',
      icon: <Wrench size={15} />,
      badge: `${activeRepairCount} Active`,
    },
    {
      id: 'INVENTORY',
      label: 'PC Inventory',
      icon: <HardDrive size={15} />,
      badge: `${allStations.length} PCs`,
    },
    {
      id: 'NOTIFICATIONS',
      label: 'Notifications',
      icon: <Bell size={15} />,
      badge: unreadCount > 0 ? `${unreadCount} New` : 'All read',
    },
  ];

  return (
    <main className="min-h-screen bg-base pb-12" id="technician-portal-main">
      <a
        href="#technician-portal-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-500 focus:text-slate-50 focus:rounded-lg"
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

        {/* Main Layout: left navigation menu (lg+) / scrollable tab row (smaller screens) + section content */}
        <div className="flex flex-col lg:flex-row items-start gap-6">
          <aside className="w-full lg:w-72 flex-shrink-0 lg:sticky lg:top-20">
            <div className="glass rounded-2xl p-2 sm:p-3 border border-slate-800/80 shadow-card">
              <div className="hidden lg:flex px-3 pt-1 pb-3 mb-2 text-[11px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800/60 items-center justify-between">
                <span>Technician Navigation</span>
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              </div>

              <nav
                className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible"
                aria-label="Technician Board Sections"
              >
                {tabs.filter((tab) => tab.id !== 'NOTIFICATIONS').map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`group relative flex-shrink-0 lg:w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 border-indigo-500/40 shadow-lg'
                          : 'border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                          isActive
                            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-glow-indigo'
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
                              isActive ? 'text-indigo-200' : 'text-slate-500'
                            }`}
                          >
                            {tab.badge}
                          </span>
                        )}
                      </div>

                      {/* Active accent bar */}
                      {isActive && (
                        <span className="hidden lg:block absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-indigo-400" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Section Content */}
          <div className="flex-1 min-w-0 w-full">
            {activeTab === 'PC_DISPLAY' && (
              <section aria-label="Live Workstations" className="animate-fade-in">
                <WorkstationGrid />
              </section>
            )}

            {activeTab === 'DISPATCH_QUEUE' && (
              <section aria-label="Ticket Queue & Dispatch" className="animate-fade-in">
                {/* Pending / Resolved tickets and PC admin credentials */}
                <TicketQueueSection />
              </section>
            )}

            {activeTab === 'INVENTORY' && (
              <section aria-label="PC Inventory" className="animate-fade-in">
                <PcInventory />
              </section>
            )}

            {activeTab === 'NOTIFICATIONS' && (
              <section aria-label="Notifications" className="animate-fade-in">
                <NotificationsPanel audience="staff" />
              </section>
            )}

            {activeTab === 'REPAIRS' && (
              <section aria-label="Repairs Workbench & Job Cards" className="animate-fade-in">
                <TechnicianRepairsWorkbench />
              </section>
            )}
          </div>
        </div>

        {/* Global Footer */}
        <div className="mt-12 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <span>UMak LabAssist · University of Makati</span>
        </div>
      </div>
    </main>
  );
}
