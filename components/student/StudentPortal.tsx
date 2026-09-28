'use client';
import React, { useState } from 'react';
import WorkstationGrid from './WorkstationGrid';
import TicketSubmissionForm from './TicketSubmissionForm';
import MyTicketsTracker from './MyTicketsTracker';
import HardwareLoanerCard from './HardwareLoanerCard';
import { useTickets } from '@/context/TicketContext';
import { useWorkstations } from '@/context/WorkstationContext';
import {
  Monitor,
  Ticket as TicketIcon,
  Cpu,
  Sparkles,
  ChevronRight,
  Radio,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

export type StudentNavTab = 'PC_STATION' | 'SUBMIT_TICKET' | 'HARDWARE_RENT';

interface TabConfig {
  id: StudentNavTab;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  activeColor: string;
  badge?: (props: { activeTicketCount: number; onlinePcCount: number }) => React.ReactNode;
}

const NAV_TABS: TabConfig[] = [
  {
    id: 'PC_STATION',
    label: 'PC Station',
    sublabel: 'Live Lab Map & Station Monitor',
    icon: <Monitor size={18} />,
    activeColor: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-300',
    badge: ({ onlinePcCount }) => (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        {onlinePcCount > 0 ? `${onlinePcCount} Live` : 'Live'}
      </span>
    ),
  },
  {
    id: 'SUBMIT_TICKET',
    label: 'Submit a ticket',
    sublabel: 'Manual Ticket & My Tickets Tracker',
    icon: <TicketIcon size={18} />,
    activeColor: 'from-indigo-500/20 to-purple-500/10 border-indigo-500/40 text-indigo-300',
    badge: ({ activeTicketCount }) => (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
        {activeTicketCount > 0 ? `${activeTicketCount} Active` : 'Report'}
      </span>
    ),
  },
  {
    id: 'HARDWARE_RENT',
    label: 'Hardware Rent',
    sublabel: 'Smart Locker Dev Kit Checkout',
    icon: <Cpu size={18} />,
    activeColor: 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-300',
    badge: () => (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        Lockers
      </span>
    ),
  },
];

export default function StudentPortal() {
  const [activeTab, setActiveTab] = useState<StudentNavTab>('PC_STATION');
  const [selectedStation, setSelectedStation] = useState<{ lab: string; pcNum: string } | null>({
    lab: 'LAB-101',
    pcNum: 'PC-07',
  });

  const { tickets } = useTickets();
  const { workstations } = useWorkstations();

  // Active tickets for badge
  const activeTicketCount = tickets.filter(
    (t) => t.status === 'PENDING' || t.status === 'DISPATCHED'
  ).length;

  // Approximate online workstations across all labs
  const onlinePcCount = Object.values(workstations).reduce(
    (acc, labStations) => acc + labStations.filter((s) => s.status === 'ONLINE').length,
    0
  );

  const handleSelectStation = (lab: string, pcNum: string) => {
    setSelectedStation({ lab, pcNum });
  };

  const handlePrefillTicket = (lab: string, pcNum: string) => {
    setSelectedStation({ lab, pcNum });
    setActiveTab('SUBMIT_TICKET');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Student View Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-cyan-950/60 border border-indigo-500/20 p-5 sm:p-6 shadow-card">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Student Self-Service Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Lab Workstation & Hardware Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Inspect live PC stations across campus, trigger hardware failure tickets instantly to lab technicians, or check out loaner dev kits from smart lockers.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-800 text-xs text-slate-300">
            <Radio size={16} className="text-cyan-400 animate-pulse" />
            <span className="font-mono">ESP32 Hardware Hotkeys [A–D] Live</span>
          </div>
        </div>
      </div>

      {/* Main Layout: Left-side Navigation Sidebar + Tab Content Area */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* ── Left Navigation Sidebar ─────────────────────────────── */}
        <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0 space-y-4">
          <div className="glass rounded-2xl p-3 sm:p-4 border border-slate-800/80 shadow-card">
            <div className="px-3 pt-1 pb-3 text-[11px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800/60 flex items-center justify-between">
              <span>Portal Navigation</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>

            {/* Navigation Tabs (Vertical on lg+, Horizontal row on mobile) */}
            <nav className="mt-3 flex flex-row lg:flex-col gap-2" aria-label="Student Portal Sections">
              {NAV_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative w-full flex items-center justify-between p-3 sm:p-3.5 rounded-xl border text-left transition-all duration-200 ${
                      isActive
                        ? `bg-gradient-to-r ${tab.activeColor} shadow-lg`
                        : 'bg-slate-900/40 hover:bg-slate-800/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                          isActive
                            ? 'bg-slate-950/60 text-white shadow-inner'
                            : 'bg-slate-800/70 text-slate-400 group-hover:text-slate-200'
                        }`}
                      >
                        {tab.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
                            {tab.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                          {tab.sublabel}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-2 flex-shrink-0">
                      {tab.badge && tab.badge({ activeTicketCount, onlinePcCount })}
                      <ChevronRight
                        size={16}
                        className={`hidden lg:block transition-transform duration-200 ${
                          isActive ? 'text-slate-200 translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                        }`}
                      />
                    </div>

                    {/* Active Accent Bar on the Left */}
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-cyan-400 shadow-glow-cyan" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Selection Status & Hardware Hotkey helper card */}
          <div className="glass rounded-2xl p-4 border border-slate-800/80 text-xs space-y-3 shadow-card hidden lg:block">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-400" />
                Active Workstation
              </span>
              {selectedStation && (
                <span className="font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 font-bold">
                  {selectedStation.lab} · {selectedStation.pcNum}
                </span>
              )}
            </div>

            {selectedStation ? (
              <div className="space-y-2">
                <p className="text-slate-400 text-[11px]">
                  Station selected for rapid diagnosis and ticket pre-filling.
                </p>
                {activeTab !== 'SUBMIT_TICKET' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('SUBMIT_TICKET')}
                    className="w-full py-2 px-3 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-glow-indigo"
                  >
                    <Sparkles size={13} />
                    Report Issue on {selectedStation.pcNum}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-[11px]">
                Click on any PC in the PC Station tab to link it here.
              </p>
            )}

            {/* Hotkey Reference */}
            <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                ESP32 Hotkey Mapping
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <span className="text-blue-400 font-bold">[A]</span>
                  <span className="text-slate-400">Display</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <span className="text-violet-400 font-bold">[B]</span>
                  <span className="text-slate-400">Periph</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <span className="text-red-400 font-bold">[C]</span>
                  <span className="text-slate-400">Power</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <span className="text-cyan-400 font-bold">[D]</span>
                  <span className="text-slate-400">Network</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main Tab Content Display Area ──────────────────────── */}
        <div className="flex-1 w-full min-w-0">
          {/* TAB 1: PC Station */}
          {activeTab === 'PC_STATION' && (
            <section aria-label="PC Station Grid" className="animate-fade-in">
              <WorkstationGrid
                onSelectStation={handleSelectStation}
                onPrefillTicket={handlePrefillTicket}
                selectedStation={selectedStation}
              />
            </section>
          )}

          {/* TAB 2: Submit a ticket (Manual Submission + My Tickets Tracker) */}
          {activeTab === 'SUBMIT_TICKET' && (
            <section aria-label="Submit a Ticket and Track Progress" className="animate-fade-in space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="ticket-submission-form-anchor">
                {/* Manual Ticket Submission Form */}
                <div className="xl:col-span-6">
                  <TicketSubmissionForm
                    initialLab={selectedStation?.lab}
                    initialPc={selectedStation?.pcNum}
                  />
                </div>

                {/* My Tickets Live Tracker */}
                <div className="xl:col-span-6">
                  <MyTicketsTracker />
                </div>
              </div>
            </section>
          )}

          {/* TAB 3: Hardware Rent */}
          {activeTab === 'HARDWARE_RENT' && (
            <section aria-label="Hardware Rent and Loaners" className="animate-fade-in">
              <HardwareLoanerCard />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
