'use client';
import React, { useState } from 'react';
import { Clock, CheckCircle, UserCheck, AlertCircle, ChevronDown, ChevronUp, RefreshCw, Sparkles, Monitor } from 'lucide-react';
import { useTickets } from '@/context/TicketContext';
import { getCategoryColors, getStatusColors, formatTimestamp, formatFullTimestamp } from '@/lib/utils';
import type { Ticket, TicketStatus } from '@/lib/mockData';

export default function MyTicketsTracker() {
  const { tickets } = useTickets();
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  // Take the most recent tickets
  const displayTickets = tickets.filter(t => {
    if (filter === 'ACTIVE') return t.status === 'PENDING' || t.status === 'DISPATCHED';
    if (filter === 'RESOLVED') return t.status === 'RESOLVED';
    return true;
  }).slice(0, 8);

  const getStepState = (currentStatus: TicketStatus, stepIndex: number) => {
    // 0 = PENDING, 1 = DISPATCHED, 2 = RESOLVED
    if (currentStatus === 'RESOLVED') {
      return 'completed';
    }
    if (currentStatus === 'DISPATCHED') {
      if (stepIndex <= 1) return stepIndex === 1 ? 'active' : 'completed';
      return 'upcoming';
    }
    // PENDING
    if (stepIndex === 0) return 'active';
    return 'upcoming';
  };

  return (
    <div className="glass rounded-2xl p-5 border border-slate-800/80">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              My Tickets Tracker
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Live Status
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Real-time multi-stage dispatch & technician resolution progress
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          {(['ALL', 'ACTIVE', 'RESOLVED'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                filter === tab
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'ALL' ? 'All' : tab === 'ACTIVE' ? 'In Progress' : 'Resolved'}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket List */}
      <div className="mt-4 space-y-3">
        {displayTickets.length === 0 ? (
          <div className="text-center py-10 bg-slate-900/30 rounded-xl border border-slate-800/50">
            <CheckCircle size={32} className="text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-400">No tickets found in this view</p>
            <p className="text-[11px] text-slate-500">Submit a new ticket to track its real-time response</p>
          </div>
        ) : (
          displayTickets.map((ticket) => {
            const catColors = getCategoryColors(ticket.category);
            const statusColors = getStatusColors(ticket.status);
            const isExpanded = expandedTicketId === ticket.ticket_id;

            return (
              <div
                key={ticket.ticket_id}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'bg-slate-850 border-indigo-500/40 shadow-card'
                    : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-850/60'
                }`}
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedTicketId(isExpanded ? null : ticket.ticket_id)}
                  className="p-3.5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {ticket.ticket_id}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">
                        {ticket.lab_id} · <span className="font-mono">{ticket.pc_num}</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${catColors.bg} ${catColors.text} ${catColors.border}`}>
                        [{ticket.key}] {ticket.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span className="text-[11px] text-slate-500">{formatTimestamp(ticket.timestamp)}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusColors.text.replace('text-', 'bg-')} ${ticket.status === 'PENDING' ? 'animate-pulse' : ''}`} />
                      {ticket.status}
                    </span>
                    <button
                      type="button"
                      aria-label="Toggle details"
                      className="text-slate-500 hover:text-slate-300"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Progress Stepper Bar (Always visible or enhanced) */}
                <div className="px-4 pb-3 pt-1 border-t border-slate-800/40 bg-slate-900/30">
                  <div className="grid grid-cols-3 gap-2 relative">
                    {/* Stepper Step 1: PENDING */}
                    {(() => {
                      const st = getStepState(ticket.status, 0);
                      return (
                        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                st === 'completed'
                                  ? 'bg-emerald-500 text-white'
                                  : st === 'active'
                                  ? 'bg-amber-500 text-white animate-pulse'
                                  : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              1
                            </span>
                            <span className={`text-[11px] font-semibold ${st === 'active' ? 'text-amber-300' : 'text-slate-300'}`}>
                              Queued
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 hidden sm:block">IoT Packet Received</p>
                        </div>
                      );
                    })()}

                    {/* Stepper Step 2: DISPATCHED */}
                    {(() => {
                      const st = getStepState(ticket.status, 1);
                      return (
                        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                st === 'completed'
                                  ? 'bg-emerald-500 text-white'
                                  : st === 'active'
                                  ? 'bg-blue-500 text-white animate-pulse'
                                  : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              2
                            </span>
                            <span className={`text-[11px] font-semibold ${st === 'active' ? 'text-blue-300' : st === 'completed' ? 'text-slate-300' : 'text-slate-500'}`}>
                              Dispatched
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 hidden sm:block">
                            {ticket.assignee ? ticket.assignee : 'Awaiting Assignment'}
                          </p>
                        </div>
                      );
                    })()}

                    {/* Stepper Step 3: RESOLVED */}
                    {(() => {
                      const st = getStepState(ticket.status, 2);
                      return (
                        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                st === 'completed'
                                  ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                                  : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              3
                            </span>
                            <span className={`text-[11px] font-semibold ${st === 'completed' ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                              Resolved
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 hidden sm:block">
                            {ticket.resolvedAt ? formatTimestamp(ticket.resolvedAt) : 'Bench Testing'}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 bg-slate-900/80 border-t border-slate-800/80 space-y-2.5 text-xs animate-fade-in">
                    <div>
                      <span className="text-slate-500 font-semibold block mb-0.5">Problem Description:</span>
                      <p className="text-slate-200 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                        {ticket.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Submitted By:</span>
                        <span className="text-slate-300 font-medium">{ticket.reporter}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Exact Timestamp:</span>
                        <span className="text-slate-300 font-mono">{formatFullTimestamp(ticket.timestamp)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Assigned Technician:</span>
                        <span className="text-indigo-300 font-medium">
                          {ticket.assignee || 'Pending IT Queue Allocation'}
                        </span>
                      </div>
                    </div>

                    {ticket.notes && (
                      <div className="pt-2 border-t border-slate-800 bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-500/20">
                        <span className="text-emerald-400 font-bold block mb-0.5 flex items-center gap-1">
                          <CheckCircle size={12} /> Technician Resolution Report:
                        </span>
                        <p className="text-emerald-200 text-xs">{ticket.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
