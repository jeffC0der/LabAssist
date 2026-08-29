'use client';
import React, { useState } from 'react';
import { Monitor, CheckCircle2, User, AlertTriangle, Cpu, HardDrive, Wifi, Sparkles, ArrowUpRight } from 'lucide-react';
import { MOCK_WORKSTATIONS, LAB_ROOMS, type Workstation, type WorkstationStatus } from '@/lib/mockData';

interface WorkstationGridProps {
  onSelectStation?: (lab: string, pcNum: string) => void;
  selectedStation?: { lab: string; pcNum: string } | null;
}

export default function WorkstationGrid({ onSelectStation, selectedStation }: WorkstationGridProps) {
  const [selectedLab, setSelectedLab] = useState<string>('LAB-302');
  const [statusFilter, setStatusFilter] = useState<WorkstationStatus | 'ALL'>('ALL');
  const [activeModalStation, setActiveModalStation] = useState<Workstation | null>(null);

  // Available lab rooms excluding "All Labs"
  const labOptions = LAB_ROOMS.filter(r => r !== 'All Labs');
  const stations = MOCK_WORKSTATIONS[selectedLab] || [];

  const filteredStations = stations.filter(s => {
    if (statusFilter === 'ALL') return true;
    return s.status === statusFilter;
  });

  const onlineCount = stations.filter(s => s.status === 'ONLINE').length;
  const occupiedCount = stations.filter(s => s.status === 'OCCUPIED').length;
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

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`p-2.5 rounded-xl border text-left transition-all ${
            statusFilter === 'ALL'
              ? 'bg-slate-800 border-indigo-500/50 shadow-glow-indigo/20'
              : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/50'
          }`}
          aria-label="Show all workstations"
        >
          <p className="text-[11px] font-medium text-slate-400">Total Stations</p>
          <p className="text-lg font-bold text-slate-100 font-mono mt-0.5">{stations.length}</p>
        </button>

        <button
          onClick={() => setStatusFilter('ONLINE')}
          className={`p-2.5 rounded-xl border text-left transition-all ${
            statusFilter === 'ONLINE'
              ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/50'
          }`}
          aria-label="Filter by Online workstations"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-emerald-400">Online & Ready</p>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-lg font-bold text-emerald-300 font-mono mt-0.5">{onlineCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter('OCCUPIED')}
          className={`p-2.5 rounded-xl border text-left transition-all ${
            statusFilter === 'OCCUPIED'
              ? 'bg-indigo-950/40 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
              : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/50'
          }`}
          aria-label="Filter by Occupied workstations"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-indigo-300">In Use / Occupied</p>
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
          </div>
          <p className="text-lg font-bold text-indigo-300 font-mono mt-0.5">{occupiedCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter('UNDER_REPAIR')}
          className={`p-2.5 rounded-xl border text-left transition-all ${
            statusFilter === 'UNDER_REPAIR'
              ? 'bg-rose-950/40 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
              : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/50'
          }`}
          aria-label="Filter by Under Repair workstations"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-rose-300">Under Repair</p>
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping-slow" />
          </div>
          <p className="text-lg font-bold text-rose-300 font-mono mt-0.5">{repairCount}</p>
        </button>
      </div>

      {/* Grid of Station Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filteredStations.map((station) => {
          const isSelected = selectedStation?.lab === selectedLab && selectedStation?.pcNum === station.id;
          const isRepair = station.status === 'UNDER_REPAIR';
          const isOccupied = station.status === 'OCCUPIED';

          return (
            <div
              key={station.id}
              onClick={() => handleStationClick(station)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleStationClick(station); }}
              tabIndex={0}
              role="button"
              aria-label={`Station ${station.id} in ${selectedLab}, status ${station.status}`}
              className={`group relative p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none ${
                isSelected
                  ? 'bg-indigo-900/40 border-indigo-400 shadow-glow-indigo scale-[1.02]'
                  : isRepair
                  ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400 hover:bg-rose-950/30'
                  : isOccupied
                  ? 'bg-slate-900/70 border-slate-800 hover:border-indigo-500/40 hover:bg-slate-850'
                  : 'bg-slate-900/60 border-slate-800/90 hover:border-emerald-500/40 hover:bg-slate-800/60'
              }`}
            >
              {/* Top Station ID & Status Indicator */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                  {station.id}
                </span>
                <span className="flex-shrink-0">
                  {station.status === 'ONLINE' && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                  )}
                  {station.status === 'OCCUPIED' && (
                    <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                  )}
                  {station.status === 'UNDER_REPAIR' && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse inline-block" />
                  )}
                </span>
              </div>

              {/* Station Visual Icon / Status */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                    isRepair
                      ? 'bg-rose-500/20 text-rose-300'
                      : isOccupied
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  <Monitor size={14} />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[11px] font-medium text-slate-300 truncate">
                    {isOccupied ? station.user : isRepair ? 'Fault Logged' : 'Ready'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">{station.ip}</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                {getStatusBadge(station.status)}
                <span className="text-[10px] text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                  Select
                  <ArrowUpRight size={10} />
                </span>
              </div>

              {/* Warning tag for repair */}
              {station.activeIssue && (
                <div className="mt-1.5 p-1 rounded bg-rose-500/10 border border-rose-500/20 flex items-center gap-1">
                  <AlertTriangle size={10} className="text-rose-400 flex-shrink-0" />
                  <span className="text-[10px] text-rose-300 truncate">{station.activeIssue}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Station Detail Flyout Modal if clicked */}
      {activeModalStation && (
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
                    {selectedLab} — {activeModalStation.id}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">{activeModalStation.ip}</p>
                </div>
              </div>
              <div>{getStatusBadge(activeModalStation.status)}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
              <div>
                <span className="text-slate-500 block">Hardware Specs</span>
                <span className="text-slate-200 font-medium">{activeModalStation.specs}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Telemetry Latency</span>
                <span className="text-slate-200 font-mono flex items-center gap-1">
                  <Wifi size={11} className="text-emerald-400" />
                  {activeModalStation.lastPing}
                </span>
              </div>
              {activeModalStation.user && (
                <div className="col-span-2 pt-2 border-t border-slate-700/40">
                  <span className="text-slate-500 block">Current User Session</span>
                  <span className="text-indigo-300 font-semibold flex items-center gap-1.5">
                    <User size={12} />
                    {activeModalStation.user} (Logged in)
                  </span>
                </div>
              )}
              {activeModalStation.activeIssue && (
                <div className="col-span-2 pt-2 border-t border-rose-500/20 bg-rose-500/5 p-2 rounded-lg mt-1">
                  <span className="text-rose-400 font-medium block flex items-center gap-1">
                    <AlertTriangle size={12} /> Active Hardware Failure
                  </span>
                  <span className="text-rose-200">{activeModalStation.activeIssue}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onSelectStation) {
                    onSelectStation(selectedLab, activeModalStation.id);
                  }
                  setActiveModalStation(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-glow-indigo transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} />
                Prefill Failure Ticket for {activeModalStation.id}
              </button>
              <button
                type="button"
                onClick={() => setActiveModalStation(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
