'use client';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Monitor, User, AlertTriangle, Sparkles, ArrowUpRight, X, ArrowLeft, ArrowRight, CheckCircle2, Pencil } from 'lucide-react';
import { LAB_ROOMS, type Workstation, type WorkstationStatus, type Ticket } from '@/lib/mockData';
import { useWorkstations } from '@/context/WorkstationContext';
import { useTickets } from '@/context/TicketContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import ModalPortal from '@/components/shared/ModalPortal';
import LabLayoutEditor from '@/components/dashboard/LabLayoutEditor';
import { type LabLayout, arrangeRoom, suggestLayout } from '@/lib/labLayout';

interface WorkstationGridProps {
  onSelectStation?: (lab: string, pcNum: string) => void;
  onPrefillTicket?: (lab: string, pcNum: string) => void;
  selectedStation?: { lab: string; pcNum: string } | null;
}

const needsAttention = (s: Workstation) => s.status === 'ISSUE_REPORTED' || s.status === 'UNDER_REPAIR';

// Combine a station with its open ticket (if any) to get the live status shown on the grid
function deriveStation(lab: string, s: Workstation, tickets: Ticket[]): Workstation {
  const sIdClean = s.id.trim().toUpperCase();
  const sNum = parseInt(s.id.replace(/\D/g, ''), 10);
  const labClean = lab.trim().toUpperCase();

  const activeTicket = tickets.find((t) => {
    const tLab = t.lab_id?.trim().toUpperCase();
    const tPcClean = t.pc_num?.trim().toUpperCase();
    const tNum = parseInt(t.pc_num?.replace(/\D/g, ''), 10);

    const labMatches = tLab === labClean;
    const pcMatches = tPcClean === sIdClean || (!isNaN(tNum) && !isNaN(sNum) && tNum === sNum);
    const isUnresolved = t.status === 'PENDING' || t.status === 'DISPATCHED' || t.status === 'UNDER_REPAIR';

    return labMatches && pcMatches && isUnresolved;
  });

  if (activeTicket) {
    const techName = activeTicket.assignee || 'Technician';
    if (activeTicket.status === 'UNDER_REPAIR') {
      return {
        ...s,
        status: 'UNDER_REPAIR' as WorkstationStatus,
        activeIssue: `${activeTicket.category} repair confirmed in progress (${activeTicket.ticket_id}) · ${techName}`,
      };
    }
    // PENDING or DISPATCHED -> Yellow (ISSUE_REPORTED)
    const issueNote =
      activeTicket.status === 'DISPATCHED'
        ? `${activeTicket.category} issue reported (${activeTicket.ticket_id}) · Dispatched: ${techName}`
        : `${activeTicket.category} issue reported (${activeTicket.ticket_id})`;
    return { ...s, status: 'ISSUE_REPORTED' as WorkstationStatus, activeIssue: issueNote };
  }

  // No active ticket for this station: restore to ONLINE if it was marked as ISSUE_REPORTED or UNDER_REPAIR
  if (needsAttention(s)) {
    return { ...s, status: 'ONLINE' as WorkstationStatus, activeIssue: undefined };
  }
  return s;
}

export default function WorkstationGrid({ onSelectStation, onPrefillTicket, selectedStation }: WorkstationGridProps) {
  const { workstations } = useWorkstations();
  const { tickets } = useTickets();
  const toast = useToast();
  const [selectedLab, setSelectedLab] = useState<string>('LAB-101');
  const [statusFilter, setStatusFilter] = useState<WorkstationStatus | 'ALL'>('ALL');
  // "Needs Attention" view: every Issue Reported / Under Repair PC across all rooms
  const [showAttention, setShowAttention] = useState(false);
  const [activeModal, setActiveModal] = useState<{ lab: string; station: Workstation } | null>(null);
  const { user } = useAuth();
  const canEditLayout = user?.role === 'ADMIN' || user?.role === 'TECHNICIAN';
  // Saved room layouts (table rows per side); rooms without one use the default grid
  const [layouts, setLayouts] = useState<Record<string, LabLayout>>({});
  // Saved layouts arrive after the first render; wait for them so a room never flashes the default first
  const [layoutsLoaded, setLayoutsLoaded] = useState(false);
  const [layoutEditorOpen, setLayoutEditorOpen] = useState(false);

  // Width available to the room drawing: on narrow screens (phones) the room switches to compact tiles
  const [roomWidth, setRoomWidth] = useState(0);
  const roomObserver = useRef<ResizeObserver | null>(null);
  const roomRef = useCallback((el: HTMLDivElement | null) => {
    roomObserver.current?.disconnect();
    roomObserver.current = null;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setRoomWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    roomObserver.current = observer;
  }, []);

  const layoutRequest = useRef(0);
  const loadLayouts = useCallback(async () => {
    // Only the newest request may update the grid (an older, slower response would bring back a past layout)
    const requestId = ++layoutRequest.current;
    try {
      const res = await fetch('/api/labs/layout', { cache: 'no-store' });
      if (!res.ok || requestId !== layoutRequest.current) return;
      const data = await res.json();
      if (requestId !== layoutRequest.current) return;
      setLayouts(data.layouts || {});
    } catch {
      // keep the current layouts
    } finally {
      if (requestId === layoutRequest.current) setLayoutsLoaded(true);
    }
  }, []);
  // Keep layouts live for everyone: instant update when any room's layout is saved, plus a periodic
  // and on-focus refresh in case the live connection drops
  useEffect(() => {
    if (!user?.id) {
      setLayoutsLoaded(true); // nothing to load when signed out: show the default room view
      return;
    }
    loadLayouts();
    const channel = supabase
      .channel(`public:labs:layout:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'labs' }, () => loadLayouts())
      .subscribe();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadLayouts();
    }, 20000);
    const onFocus = () => loadLayouts();
    window.addEventListener('focus', onFocus);
    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [user?.id, loadLayouts]);

  // Available lab rooms excluding "All Labs", naturally sorted
  const dbLabs = Object.keys(workstations).filter(k => k !== 'All Labs');
  const labList = dbLabs.length > 0 ? dbLabs : LAB_ROOMS.filter(r => r !== 'All Labs');
  const labOptions = [...labList].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  // Live (ticket-aware) stations for every room
  const derivedByLab = useMemo(() => {
    const result: Record<string, Workstation[]> = {};
    labOptions.forEach((lab) => {
      result[lab] = (workstations[lab] || []).map((s) => deriveStation(lab, s, tickets));
    });
    return result;
    // labOptions is derived from workstations, so these two cover every input
  }, [workstations, tickets]);

  const stations = derivedByLab[selectedLab] || [];

  const attentionByLab = labOptions
    .map((lab) => ({ lab, stations: (derivedByLab[lab] || []).filter(needsAttention) }))
    .filter((group) => group.stations.length > 0);
  const attentionTotal = attentionByLab.reduce((sum, g) => sum + g.stations.length, 0);
  const attentionReported = attentionByLab.reduce((sum, g) => sum + g.stations.filter(s => s.status === 'ISSUE_REPORTED').length, 0);
  const attentionRepair = attentionTotal - attentionReported;
  // The list only opens when there is something in it (it also closes itself if the last PC gets fixed)
  const attentionOpen = showAttention && attentionTotal > 0;

  const handleAttentionClick = () => {
    if (attentionOpen) {
      setShowAttention(false);
    } else if (attentionTotal === 0) {
      setShowAttention(false);
      toast.success('All Clear', 'No PCs need attention in any room right now.');
    } else {
      setShowAttention(true);
    }
  };

  const onlineCount = stations.filter(s => s.status === 'ONLINE').length;
  const occupiedCount = stations.filter(s => s.status === 'OCCUPIED').length;
  const reportedCount = stations.filter(s => s.status === 'ISSUE_REPORTED').length;
  const repairCount = stations.filter(s => s.status === 'UNDER_REPAIR').length;

  const handleStationClick = (lab: string, station: Workstation) => {
    setActiveModal({ lab, station });
    if (onSelectStation) {
      onSelectStation(lab, station.id);
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

  // Compact PC tile for the room-layout view (many PCs per row, so only the essentials)
  const renderSeat = (lab: string, station: Workstation, filter: WorkstationStatus | 'ALL') => {
    const isSelected = selectedStation?.lab === lab && selectedStation?.pcNum === station.id;
    const isDimmed = filter !== 'ALL' && station.status !== filter;
    const tone =
      station.status === 'UNDER_REPAIR'
        ? { box: 'bg-rose-950/30 border-rose-500/50 hover:border-rose-400', dot: 'bg-rose-500 animate-pulse', text: 'text-rose-300', label: 'Repair' }
        : station.status === 'ISSUE_REPORTED'
        ? { box: 'bg-amber-950/30 border-amber-500/50 hover:border-amber-400', dot: 'bg-amber-400 animate-pulse', text: 'text-amber-300', label: 'Issue' }
        : station.status === 'OCCUPIED'
        ? { box: 'bg-indigo-950/30 border-indigo-500/40 hover:border-indigo-400', dot: 'bg-indigo-400', text: 'text-indigo-300', label: 'In use' }
        : { box: 'bg-slate-900/70 border-slate-700/80 hover:border-emerald-500/50', dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Ready' };

    return (
      <button
        key={`${lab}-${station.id}`}
        type="button"
        onClick={() => handleStationClick(lab, station)}
        disabled={isDimmed}
        title={station.activeIssue || `${station.id} · ${station.status}`}
        aria-label={`Station ${station.id} in ${lab}, status ${station.status}${isDimmed ? ' (filtered out)' : ''}`}
        data-seat={isDimmed ? undefined : station.status}
        // Width comes from the room (see renderRoomLayout); text scales with the tile's own width
        style={{ width: 'var(--seat-w)', containerType: 'inline-size' }}
        className={`flex-shrink-0 rounded-lg sm:rounded-xl border text-left transition-all duration-200 ${
          isDimmed
            ? 'opacity-20 grayscale bg-slate-900/20 border-slate-800/30 cursor-not-allowed'
            : isSelected
            ? 'bg-indigo-900/50 border-indigo-400 ring-2 ring-indigo-400/50'
            : `${tone.box} ${filter !== 'ALL' ? 'scale-[1.04] shadow-lg' : ''}`
        }`}
      >
        <div className="seat-body">
          <div className="flex items-center justify-between gap-1">
            <Monitor className={`seat-icon ${isDimmed ? 'text-slate-500' : tone.text}`} />
            <span className={`seat-dot rounded-full ${isDimmed ? 'bg-slate-600' : tone.dot}`} />
          </div>
          <p className="seat-id font-mono font-bold text-slate-100 truncate">{station.id}</p>
          <p className={`seat-label font-semibold uppercase tracking-wide truncate ${isDimmed ? 'text-slate-500' : tone.text}`}>{tone.label}</p>
          {station.ip && <p className="seat-extra font-mono text-slate-500 truncate">{station.ip}</p>}
        </div>
        {/* Small tiles (phones): just the PC number, in its status color */}
        <span className={`seat-num font-mono font-bold ${isDimmed ? 'text-slate-500' : tone.text}`} aria-hidden="true">
          {station.id.replace(/^PC-?/i, '')}
        </span>
      </button>
    );
  };

  // The selected room drawn as its saved layout: table rows on each side of the aisle, front marker
  const renderRoomLayout = (lab: string, layout: LabLayout) => {
    const { rows, extraCount } = arrangeRoom(stations, layout);
    // Only rows with PCs are drawn (seats without a PC are left out), so the room frame fits the PCs it has
    const filled = rows.filter((r) => r.left.length + r.right.length > 0);
    const ordered = layout.front === 'BOTTOM' ? [...filled].reverse() : filled;
    const twoSides = layout.sides === 2;

    // Size every tile from the widest row: the room fills the panel, so fewer PCs per row = bigger tiles.
    // Narrow screens (phones) use tighter spacing and compact number-only tiles, so a whole room (both sides
    // and the front marker) fits on screen. Below SEAT_MIN the room scrolls sideways, with a hint.
    const maxLeft = Math.max(1, ...filled.map((r) => r.left.length));
    const maxRight = twoSides ? Math.max(1, ...filled.map((r) => r.right.length)) : 0;
    const cols = maxLeft + maxRight;
    const spacing = (gap: number, aisle: number) => (maxLeft - 1) * gap + (twoSides ? (maxRight - 1) * gap + aisle : 0);
    // Compact whenever full-size tiles (72px+) wouldn't fit across the available width
    const compact = roomWidth > 0 && cols * 72 + spacing(8, 48) > roomWidth;
    const SEAT_MIN = compact ? 30 : 72;
    const SEAT_MAX = 180;
    const GAP = compact ? 4 : 8;
    const AISLE = twoSides ? (compact ? 20 : 48) : 0;
    const fixed = spacing(GAP, AISLE);
    const minRoomWidth = cols * SEAT_MIN + fixed;
    const scrolls = roomWidth > 0 && minRoomWidth > roomWidth;
    // Tiles under 64px show only the number (see .seat-num in globals.css)
    const numberOnly = compact && (Math.max(roomWidth, minRoomWidth) - fixed) / cols < 64;
    const sideWidth = (n: number) => `calc(${n} * var(--seat-w) + ${(n - 1) * GAP}px)`;
    const roomStyle = {
      containerType: 'inline-size',
      minWidth: minRoomWidth,
      maxWidth: cols * SEAT_MAX + fixed,
      // cqw = width of this room box, so the tile width follows the available space
      '--seat-w': `calc((100cqw - ${fixed}px) / ${cols})`,
    } as React.CSSProperties;

    const front = (
      <div className="w-full text-center py-1.5 sm:py-2 rounded-lg bg-slate-700/30 border border-slate-600/50 text-[10px] sm:text-xs font-semibold tracking-[0.1em] sm:tracking-[0.15em] uppercase text-slate-300 px-2 sm:px-3 truncate">
        {layout.frontLabel}
      </div>
    );
    const legend: Array<[string, string]> = [
      ['bg-emerald-400', 'Ready'],
      ['bg-indigo-400', 'In use'],
      ['bg-amber-400', 'Issue'],
      ['bg-rose-500', 'Repair'],
    ];
    return (
      <div className="space-y-2">
        {scrolls && (
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ArrowLeft size={12} aria-hidden="true" />
            Swipe sideways to see the whole room
            <ArrowRight size={12} aria-hidden="true" />
          </p>
        )}
        <div ref={roomRef} className="overflow-x-auto overscroll-x-contain rounded-xl border border-slate-800/80 bg-slate-950/40 p-2 sm:p-5">
          <div className={`mx-auto w-full ${compact ? 'space-y-2' : 'space-y-3 sm:space-y-4'}`} style={roomStyle}>
            {layout.front === 'TOP' && front}
            {ordered.map((row, i) => (
              <div key={i} className="flex items-stretch justify-center">
                <div className="flex justify-center" style={{ width: sideWidth(maxLeft), gap: GAP }}>
                  {row.left.map((s) => renderSeat(lab, s, statusFilter))}
                </div>
                {twoSides && (
                  <>
                    <div className="flex justify-center flex-shrink-0" style={{ width: AISLE }} aria-hidden="true">
                      <div className="w-px border-l border-dashed border-slate-700/60" />
                    </div>
                    <div className="flex justify-center" style={{ width: sideWidth(maxRight), gap: GAP }}>
                      {row.right.map((s) => renderSeat(lab, s, statusFilter))}
                    </div>
                  </>
                )}
              </div>
            ))}
            {layout.front === 'BOTTOM' && front}
            {extraCount > 0 && canEditLayout && (
              <p className="text-[10px] sm:text-xs text-slate-500 text-center">
                {extraCount} PC{extraCount === 1 ? ' was' : 's were'} added to new rows automatically · use Edit Layout to arrange {extraCount === 1 ? 'it' : 'them'}
              </p>
            )}
          </div>
        </div>
        {/* Compact tiles only show the number: say what the colors mean */}
        {numberOnly && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-slate-400" aria-label="Status colors">
            {legend.map(([dot, label]) => (
              <span key={label} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${dot}`} aria-hidden="true" />
                {label}
              </span>
            ))}
            <span className="text-slate-500">· Tap a PC for details</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="glass rounded-2xl p-3 sm:p-5 border border-slate-800/80">
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
              </h2>
              <p className="text-xs text-slate-400">
                Click any PC station to inspect specs or prefill a failure ticket
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Needs Attention: every reported / under-repair PC across all rooms */}
          <button
            type="button"
            onClick={handleAttentionClick}
            aria-pressed={attentionOpen}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              attentionOpen
                ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-500/50'
                : attentionTotal > 0
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20'
                : 'bg-slate-800/90 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Show every PC with a reported issue or under repair, in all rooms"
          >
            {attentionTotal > 0 ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} className="text-emerald-400" />}
            <span>Needs Attention</span>
            <span
              className={`px-1.5 rounded-md font-mono text-[11px] ${
                attentionTotal > 0 ? 'bg-amber-500/25 text-amber-200' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {attentionTotal}
            </span>
          </button>

          {/* Lab selector dropdown */}
          <div className={`flex items-center gap-2 ${attentionOpen ? 'opacity-40 pointer-events-none' : ''}`}>
            <label htmlFor="lab-select" className="text-xs font-semibold text-slate-400">
              Room:
            </label>
            <select
              id="lab-select"
              value={selectedLab}
              onChange={(e) => setSelectedLab(e.target.value)}
              disabled={attentionOpen}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/90 text-slate-200 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer transition-all"
              aria-label="Select Lab Room"
            >
              {labOptions.map((lab) => {
                const flagged = (derivedByLab[lab] || []).filter(needsAttention).length;
                return (
                  <option key={lab} value={lab} className="bg-slate-900 text-slate-200">
                    {flagged > 0 ? `${lab} · ${flagged} need attention` : lab}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Room layout editor (staff only) */}
          {canEditLayout && (
            <button
              type="button"
              onClick={() => setLayoutEditorOpen(true)}
              disabled={attentionOpen}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/90 border border-slate-700 text-slate-300 hover:text-slate-50 hover:border-indigo-500/60 disabled:opacity-40 disabled:pointer-events-none transition-all"
              title={`Arrange how the PCs in ${selectedLab} are laid out`}
              aria-label={`Edit layout of ${selectedLab}`}
            >
              <Pencil size={13} />
              <span>Edit Layout</span>
            </button>
          )}
        </div>
      </div>

      {attentionOpen ? (
        /* ── Needs Attention view: grouped by room ─────────────────────── */
        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <p className="text-xs text-slate-300">
              <span className="font-semibold text-amber-300">{attentionTotal}</span> PC{attentionTotal === 1 ? '' : 's'} need attention across all rooms
              {' · '}
              <span className="text-amber-300">{attentionReported} issue reported</span>
              {' · '}
              <span className="text-rose-300">{attentionRepair} under repair</span>
            </p>
            <button
              type="button"
              onClick={() => setShowAttention(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              <ArrowLeft size={13} />
              Back to room view
            </button>
          </div>

          {attentionByLab.map((group) => (
            <section key={group.lab} aria-label={`${group.lab} PCs needing attention`} className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-cyan-400">{group.lab}</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                  {group.stations.length} PC{group.stations.length === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLab(group.lab);
                    setStatusFilter('ALL');
                    setShowAttention(false);
                  }}
                  className="ml-auto text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                >
                  Open room
                  <ArrowUpRight size={11} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2" style={{ '--seat-w': '128px' } as React.CSSProperties}>
                {group.stations.map((station) => renderSeat(group.lab, station, 'ALL'))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <>
          {/* Summary KPI Pills with Clear Active/Selected States */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 my-4">
            <button
              onClick={() => setStatusFilter('ALL')}
              data-kpi={statusFilter === 'ALL' ? undefined : 'ALL'}
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
              data-kpi={statusFilter === 'ONLINE' ? undefined : 'ONLINE'}
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
              data-kpi={statusFilter === 'OCCUPIED' ? undefined : 'OCCUPIED'}
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
              data-kpi={statusFilter === 'ISSUE_REPORTED' ? undefined : 'ISSUE_REPORTED'}
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
              data-kpi={statusFilter === 'UNDER_REPAIR' ? undefined : 'UNDER_REPAIR'}
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

          {/* Every room is drawn as a room: its saved layout, or the default (two sides, 4 PCs per row).
              All PCs stay visible; non-matching ones are dimmed */}
          {layoutsLoaded ? (
            renderRoomLayout(selectedLab, layouts[selectedLab] || suggestLayout(stations.length))
          ) : (
            <div className="h-40 rounded-xl border border-slate-800/80 bg-slate-950/40 animate-pulse" aria-label="Loading room layout" />
          )}
        </>
      )}

      {layoutEditorOpen && (
        <LabLayoutEditor
          labCode={selectedLab}
          stations={stations}
          current={layouts[selectedLab] || null}
          onClose={() => setLayoutEditorOpen(false)}
          onSaved={(lab, layout) =>
            setLayouts((prev) => {
              const next = { ...prev };
              if (layout) next[lab] = layout;
              else delete next[lab];
              return next;
            })
          }
        />
      )}

      {/* Quick Station Detail Flyout Modal if clicked */}
      {(() => {
        if (!activeModal) return null;
        const modalLab = activeModal.lab;
        const liveModalStation =
          (derivedByLab[modalLab] || []).find((s) => s.id.toUpperCase() === activeModal.station.id.toUpperCase()) ||
          activeModal.station;

        return (
          <ModalPortal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setActiveModal(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="station-detail-title"
          >
            <div
              className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                    <Monitor size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 id="station-detail-title" className="text-base font-bold text-slate-100 truncate">
                      {modalLab} — {liveModalStation.id}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">{liveModalStation.ip}</p>
                    {/* Phones: the status goes under the name so the header fits */}
                    <div className="mt-1 sm:hidden">{getStatusBadge(liveModalStation.status)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="hidden sm:inline-flex">{getStatusBadge(liveModalStation.status)}</span>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    aria-label="Close station details"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                <div className="col-span-2">
                  <span className="text-slate-500 block">Hardware Specs</span>
                  <span className="text-slate-200 font-medium">{liveModalStation.specs}</span>
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
                        onPrefillTicket(modalLab, liveModalStation.id);
                      } else if (onSelectStation) {
                        onSelectStation(modalLab, liveModalStation.id);
                      }
                      setActiveModal(null);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-glow-indigo transition-all flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={14} />
                    Prefill Failure Ticket for {liveModalStation.id}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
          </ModalPortal>
        );
      })()}
    </div>
  );
}
