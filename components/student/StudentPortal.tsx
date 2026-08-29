'use client';
import React, { useState } from 'react';
import WorkstationGrid from './WorkstationGrid';
import TicketSubmissionForm from './TicketSubmissionForm';
import MyTicketsTracker from './MyTicketsTracker';
import HardwareLoanerCard from './HardwareLoanerCard';
import { Sparkles, Cpu, HelpCircle } from 'lucide-react';

export default function StudentPortal() {
  const [selectedStation, setSelectedStation] = useState<{ lab: string; pcNum: string } | null>({
    lab: 'LAB-302',
    pcNum: 'PC-07',
  });

  const handleSelectStation = (lab: string, pcNum: string) => {
    setSelectedStation({ lab, pcNum });
    // Smooth scroll down to form if on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      document.getElementById('ticket-submission-form-anchor')?.scrollIntoView({ behavior: 'smooth' });
    }
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
            <Cpu size={16} className="text-cyan-400 animate-pulse" />
            <span>ESP32 Physical Remote Hotkeys Active [A–D]</span>
          </div>
        </div>
      </div>

      {/* Section 1: Live Workstation Grid */}
      <section aria-label="Workstation Station Grid">
        <WorkstationGrid
          onSelectStation={handleSelectStation}
          selectedStation={selectedStation}
        />
      </section>

      {/* Section 2: Ticket Submission Form & My Tickets Tracker side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="ticket-submission-form-anchor">
        <div className="lg:col-span-6 xl:col-span-6">
          <TicketSubmissionForm
            initialLab={selectedStation?.lab}
            initialPc={selectedStation?.pcNum}
          />
        </div>

        <div className="lg:col-span-6 xl:col-span-6">
          <MyTicketsTracker />
        </div>
      </div>

      {/* Section 3: Hardware Loaner Request Card */}
      <section aria-label="Hardware Loaner Request">
        <HardwareLoanerCard />
      </section>
    </div>
  );
}
