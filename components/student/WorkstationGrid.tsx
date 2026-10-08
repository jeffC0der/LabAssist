'use client';
import React, { useState } from 'react';
import { Monitor, CheckCircle2, User, AlertTriangle, Cpu, HardDrive, Wifi, Sparkles, ArrowUpRight, X } from 'lucide-react';
import { LAB_ROOMS, type Workstation, type WorkstationStatus } from '@/lib/mockData';
import { useWorkstations } from '@/context/WorkstationContext';
import { useTickets } from '@/context/TicketContext';

interface WorkstationGridProps {
  onSelectStation?: (lab: string, pcNum: string) => void;
  onPrefillTicket?: (lab: string, pcNum: string) => void;
  selectedStation?: { lab: string; pcNum: string } | null;
}

export default function WorkstationGrid({ onSelectStation, onPrefillTicket, selectedStation }: WorkstationGridProps) {
  const { workstations } = useWorkstations();
  const { tickets } = useTickets();
  const [selectedLab, setSelectedLab] = useState<string>('LAB-101');
  const [statusFilter, setStatusFilter] = useState<WorkstationStatus | 'ALL'>('ALL');
  const [activeModalStation, setActiveModalStation] = useState<Workstation | null>(null);

  // Available lab rooms excluding "All Labs", naturally sorted
  const dbLabs = Object.keys(workstations).filter(k => k !== 'All Labs');
  const labList = dbLabs.length > 0 ? dbLabs : LAB_ROOMS.filter(r => r !== 'All Labs');
  const labOptions = [...labList].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  // Raw stations combined with active ticket telemetry
  const rawStations = workstations[selectedLab] || [];
  const stations: Workstation[] = rawStations.map((s) => {
    const sIdClean = s.id.trim().toUpperCase();
    const sNum = parseInt(s.id.replace(/\D/g, ''), 10);

    const activeTicket = tickets.find((t) => {
      const tLab = t.lab_id?.trim().toUpperCase();
      const selLab = selectedLab?.trim().toUpperCase();
      const tPcClean = t.pc_num?.trim().toUpperCase();
      const tNum = parseInt(t.pc_num?.replace(/\D/g, ''), 10);

      const labMatches = tLab === selLab;
      const pcMatches = tPcClean === sIdClean || (!isNaN(tNum) && !isNaN(sNum) && tNum === sNum);
      const isUnresolved = t.status === 'PENDING' || t.status === 'DISPATCHED' || t.status === 'UNDER_REPAIR';

      return labMatches && pcMatches && isUnresolved;
    });

    if (activeTicket) {
      if (activeTicket.status === 'UNDER_REPAIR') {
        const techName = activeTicket.assignee || 'Technician';
        return {
          ...s,
          status: 'UNDER_REPAIR' as WorkstationStatus,
          activeIssue: `${activeTicket.category} repair confirmed in progress (${activeTicket.ticket_id}) · ${techName}`,
        };
      } else {
        // PENDING or DISPATCHED -> Yellow (ISSUE_REPORTED)
        const isDispatched = activeTicket.status === 'DISPATCHED';
        const techName = activeTicket.assignee || 'Technician';
        const issueNote = isDispatched
          ? `${activeTicket.category} issue reported (${activeTicket.ticket_id}) · Dispatched: ${techName}`
          : `${activeTicket.category} issue reported (${activeTicket.ticket_id})`;

        return {
          ...s,
          status: 'ISSUE_REPORTED' as WorkstationStatus,
          activeIssue: issueNote,
        };
      }
    }

    // If there is no active ticket for this station, restore to ONLINE if it was marked as ISSUE_REPORTED or UNDER_REPAIR
    if (s.status === 'UNDER_REPAIR' || s.status === 'ISSUE_REPORTED') {
      return {
        ...s,
        status: 'ONLINE' as WorkstationStatus,
        activeIssue: undefined,
      };
    }
    return s;
  });

  const filteredStations = stations.filter(s => {
    if (statusFilter === 'ALL') return true;
    return s.status === statusFilter;
  });

  const onlineCount = stations.filter(s => s.status === 'ONLINE').length;
  const occupiedCount = stations.filter(s => s.status === 'OCCUPIED').length;
  const reportedCount = stations.filter(s => s.status === 'ISSUE_REPORTED').length;
  const repairCount = stations.filter(s => s.status === 'UNDER_REPAIR').length;

  const handleStationClick = (station: Workstation) => {
    setActiveModalStation(station);
    if (onSelectStation) {
      onSelectStation(selectedLab, station.id);
    }
  };

  const getStatusBadge = (status: WorkstationStatus) => {
    switch (status) {
      case 'ONLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
            ONLINE
          </span>
        );
      case 'OCCUPIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" aria-hidden="true" />
            OCCUPIED
          </span>
        );
      case 'ISSUE_REPORTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" aria-hidden="true" />
            ISSUE_REPORTED
          </span>
        );
      case 'UNDER_REPAIR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping-slow" aria-hidden="true" />
            UNDER_REPAIR
          </span>
        );
    }
  };

  return (
    <div className="glass rounded-2xl p-5 border border-slate-800/80">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/70">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Monitor size={17} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Live Workstation Grid
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  Interactive
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Click any PC station to inspect specs or prefill a failure ticket
              </p>
            </div>
          </div>
        </div>

        {/* Lab selector dropdown */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label htmlFor="lab-select" className="text-xs font-semibold text-slate-400">
            Room:
          </label>
          <select
            id="lab-select"
            value={selectedLab}
            onChange={(e) => setSelectedLab(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/90 text-slate-200 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer transition-all"
            aria-label="Select Lab Room"
          >
            {labOptions.map((lab) => (
              <option key={lab} value={lab} className="bg-slate-900 text-slate-200">
                {lab}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Pills with Clear Active/Selected States */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 my-4">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`p-2.5 rounded-xl border text-left transition-all duration-200 ${
            statusFilter === 'ALL'
              ? 'bg-slate-800 border-indigo-400 text-slate-100 shadow-glow-indigo ring-2 ring-indigo-500/50 scale-[1.02]'
              : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 opacity-75 hover:opacity-100'
          }`}
          aria-label="Show all workstations"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-slate-300">All Workstations</p>
            {statusFilter === 'ALL' && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            )}
          </div>
          <p className="text-lg font-bold text-slate-100 font-mono mt-0.5">{stations.length}</p>
        </button>

        <button
          onClick={() => setStatusFilter('ONLINE')}
          className={`p-2.5 rounded-xl border text-left transition-all duration-200 ${
            statusFilter === 'ONLINE'
              ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.35)] ring-2 ring-emerald-500/60 scale-[1.02]'
              : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/50 hover:text-emerald-300 opacity-75 hover:opacity-100'
          }`}
          aria-label="Filter and highlight Online workstations"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-emerald-400">Online & Ready</p>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-lg font-bold text-emerald-300 font-mono mt-0.5">{onlineCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter('OCCUPIED')}
          className={`p-2.5 rounded-xl border text-left transition-all duration-200 ${
            statusFilter === 'OCCUPIED'
              ? 'bg-indigo-950/70 border-indigo-400 text-indigo-200 shadow-[0_0_20px_rgba(99,102,241,0.35)] ring-2 ring-indigo-500/60 scale-[1.02]'
              : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/50 hover:text-indigo-300 opacity-75 hover:opacity-100'
          }`}
          aria-label="Filter and highlight Occupied workstations"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-indigo-300">In Use / Occupied</p>
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
          </div>
          <p className="text-lg font-bold text-indigo-300 font-mono mt-0.5">{occupiedCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter('ISSUE_REPORTED')}
          className={`p-2.5 rounded-xl border text-left transition-all duration-200 ${
            statusFilter === 'ISSUE_REPORTED'
              ? 'bg-amber-950/70 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.35)] ring-2 ring-amber-500/60 scale-[1.02]'
              : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/50 hover:text-amber-300 opacity-75 hover:opacity-100'
          }`}
          aria-label="Filter and highlight Issue Reported workstations"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-amber-300">Issue Reported</p>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <p className="text-lg font-bold text-amber-300 font-mono mt-0.5">{reportedCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter('UNDER_REPAIR')}
          className={`p-2.5 rounded-xl border text-left transition-all duration-200 ${
            statusFilter === 'UNDER_REPAIR'
              ? 'bg-rose-950/70 border-rose-400 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.35)] ring-2 ring-rose-500/60 scale-[1.02]'
              : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/50 hover:text-rose-300 opacity-75 hover:opacity-100'
          }`}
          aria-label="Filter and highlight Under Repair workstations"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-rose-300">Under Repair</p>
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping-slow" />
          </div>
          <p className="text-lg font-bold text-rose-300 font-mono mt-0.5">{repairCount}</p>
        </button>
      </div>

      {/* Grid of Station Cards — All remain visible, non-matching stations become dimmed */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {stations.map((station) => {
          const isSelected = selectedStation?.lab === selectedLab && selectedStation?.pcNum === station.id;
          const isMatch = statusFilter === 'ALL' || station.status === statusFilter;
          const isDimmed = statusFilter !== 'ALL' && !isMatch;
          const isRepair = station.status === 'UNDER_REPAIR';
          const isIssueReported = station.status === 'ISSUE_REPORTED';
          const isOccupied = station.status === 'OCCUPIED';

          return (
            <div
              key={station.id}
              onClick={() => {
                if (isDimmed) return;
                handleStationClick(station);
              }}
              onKeyDown={(e) => {
                if (isDimmed) return;
                if (e.key === 'Enter' || e.key === ' ') handleStationClick(station);
              }}
              tabIndex={isDimmed ? -1 : 0}
              role="button"
              aria-disabled={isDimmed}
              aria-label={`Station ${station.id} in ${selectedLab}, status ${station.status}${isDimmed ? ' (filtered out)' : ''}`}
              className={`group relative p-3 rounded-xl border text-left transition-all duration-300 select-none ${
                isDimmed
                  ? 'opacity-20 grayscale brightness-75 contrast-75 bg-slate-900/20 border-slate-800/30 cursor-not-allowed pointer-events-none'
                  : isSelected
                  ? 'bg-indigo-900/50 border-indigo-400 shadow-glow-indigo ring-2 ring-indigo-400/50 scale-[1.02] cursor-pointer'
                  : statusFilter !== 'ALL'
                  ? /* Actively highlighted matching filter */
                    isRepair
                    ? 'bg-rose-950/35 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)] ring-1 ring-rose-500/50 scale-[1.02] hover:bg-rose-950/50 cursor-pointer'
                    : isIssueReported
                    ? 'bg-amber-950/35 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-1 ring-amber-500/50 scale-[1.02] hover:bg-amber-950/50 cursor-pointer'
                    : isOccupied
                    ? 'bg-indigo-950/35 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)] ring-1 ring-indigo-500/50 scale-[1.02] hover:bg-indigo-950/50 cursor-pointer'
                    : 'bg-emerald-950/35 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/50 scale-[1.02] hover:bg-emerald-950/50 cursor-pointer'
                  : /* Normal view when statusFilter === 'ALL' */
                    isRepair
                    ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400 hover:bg-rose-950/30 cursor-pointer'
                    : isIssueReported
                    ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400 hover:bg-amber-950/30 cursor-pointer'
                    : isOccupied
                    ? 'bg-slate-900/70 border-slate-800 hover:border-indigo-500/40 hover:bg-slate-850 cursor-pointer'
                    : 'bg-slate-900/60 border-slate-800/90 hover:border-emerald-500/40 hover:bg-slate-800/60 cursor-pointer'
              }`}
            >
              {/* Top Station ID & Status Indicator */}
              <div className="flex items-center justify-between mb-2">
                <span className={`font-mono text-xs font-bold transition-colors ${
                  isDimmed ? 'text-slate-500' : 'text-slate-200 group-hover:text-white'
                }`}>
                  {station.id}
                </span>
                <span className="flex-shrink-0">
                  {isDimmed ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block" />
                  ) : (
                    <>
                      {station.status === 'ONLINE' && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                      )}
                      {station.status === 'OCCUPIED' && (
                        <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                      )}
                      {station.status === 'ISSUE_REPORTED' && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
                      )}
                      {station.status === 'UNDER_REPAIR' && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse inline-block" />
                      )}
                    </>
                  )}
                </span>
              </div>

              {/* Station Visual Icon / Status */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors ${
                    isDimmed
                      ? 'bg-slate-800/50 text-slate-500'
                      : isRepair
                      ? 'bg-rose-500/20 text-rose-300'
                      : isIssueReported
                      ? 'bg-amber-500/20 text-amber-300'
                      : isOccupied
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  <Monitor size={14} />
                </div>
                <div className="overflow-hidden">
                  <p className={`text-[11px] font-medium truncate ${isDimmed ? 'text-slate-500' : 'text-slate-300'}`}>
                    {isOccupied ? station.user : isIssueReported ? 'Issue Reported' : isRepair ? 'Under Repair' : 'Ready'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">{station.ip}</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                {getStatusBadge(station.status)}
                {!isDimmed && (
                  <span className="text-[10px] text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    Select
                    <ArrowUpRight size={10} />
                  </span>
                )}
              </div>

              {/* Warning tag for issue reported / repair */}
              {station.activeIssue && (
                <div
                  className={`mt-1.5 p-1 rounded border flex items-center gap-1 ${
                    isDimmed
                      ? 'bg-slate-900/30 border-slate-800/40 text-slate-500'
                      : isIssueReported
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  }`}
                >
                  <AlertTriangle
                    size={10}
                    className={
                      isDimmed
                        ? 'text-slate-500 flex-shrink-0'
                        : isIssueReported
                        ? 'text-amber-400 flex-shrink-0'
                        : 'text-rose-400 flex-shrink-0'
                    }
                  />
                  <span className="text-[10px] truncate">{station.activeIssue}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Station Detail Flyout Modal if clicked */}
      {(() => {
        const liveModalStation = activeModalStation
          ? stations.find((s) => s.id.toUpperCase() === activeModalStation.id.toUpperCase()) || activeModalStation
          : null;

        if (!liveModalStation) return null;

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setActiveModalStation(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="station-detail-title"
          >
            <div
              className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl space-y-4 animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Monitor size={20} />
                  </div>
                  <div>
                    <h3 id="station-detail-title" className="text-base font-bold text-slate-100 flex items-center gap-2">
                      {selectedLab} — {liveModalStation.id}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">{liveModalStation.ip}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(liveModalStation.status)}
                  <button
                    type="button"
                    onClick={() => setActiveModalStation(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    aria-label="Close station details"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                <div>
                  <span className="text-slate-500 block">Hardware Specs</span>
                  <span className="text-slate-200 font-medium">{liveModalStation.specs}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Telemetry Latency</span>
                  <span className="text-slate-200 font-mono flex items-center gap-1">
                    <Wifi size={11} className="text-emerald-400" />
                    {liveModalStation.lastPing}
                  </span>
                </div>
                {liveModalStation.user && (
                  <div className="col-span-2 pt-2 border-t border-slate-700/40">
                    <span className="text-slate-500 block">Current User Session</span>
                    <span className="text-indigo-300 font-semibold flex items-center gap-1.5">
                      <User size={12} />
                      {liveModalStation.user} (Logged in)
                    </span>
                  </div>
                )}
                {liveModalStation.activeIssue && (
                  <div
                    className={`col-span-2 pt-2 border-t p-2 rounded-lg mt-1 ${
                      liveModalStation.status === 'ISSUE_REPORTED'
                        ? 'border-amber-500/20 bg-amber-500/5'
                        : 'border-rose-500/20 bg-rose-500/5'
                    }`}
                  >
                    <span
                      className={`font-medium block flex items-center gap-1 ${
                        liveModalStation.status === 'ISSUE_REPORTED' ? 'text-amber-400' : 'text-rose-400'
                      }`}
                    >
                      <AlertTriangle size={12} />
                      {liveModalStation.status === 'ISSUE_REPORTED'
                        ? 'Issue Reported (Awaiting Confirmation / Tech)'
                        : 'Active Hardware Failure (Under Repair)'}
                    </span>
                    <span className={liveModalStation.status === 'ISSUE_REPORTED' ? 'text-amber-200' : 'text-rose-200'}>
                      {liveModalStation.activeIssue}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                {liveModalStation.status === 'UNDER_REPAIR' ? (
                  <button
                    type="button"
                    disabled
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800/90 border border-rose-500/30 text-rose-300 text-xs font-semibold cursor-not-allowed opacity-85 flex items-center justify-center gap-1.5"
                  >
                    <AlertTriangle size={14} className="text-rose-400" />
                    Station Under Active Repair
                  </button>
                ) : liveModalStation.status === 'ISSUE_REPORTED' ? (
                  <button
                    type="button"
                    disabled
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800/90 border border-amber-500/30 text-amber-300 text-xs font-semibold cursor-not-allowed opacity-85 flex items-center justify-center gap-1.5"
                  >
                    <AlertTriangle size={14} className="text-amber-400" />
                    Issue Already Logged (Pending Confirmation)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (onPrefillTicket) {
                        onPrefillTicket(selectedLab, liveModalStation.id);
                      } else if (onSelectStation) {
                        onSelectStation(selectedLab, liveModalStation.id);
                      }
                      setActiveModalStation(null);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-glow-indigo transition-all flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={14} />
                    Prefill Failure Ticket for {liveModalStation.id}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveModalStation(null)}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
