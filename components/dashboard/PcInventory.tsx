'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HardDrive, RefreshCw, Search, Pencil, X, Lock, ArrowRight, Layers } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useWorkstations } from '@/context/WorkstationContext';
import type { InventoryPc } from '@/app/api/workstations/inventory/route';
import ModalPortal from '@/components/shared/ModalPortal';

const SPECS_MAX = 150;
const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const pcNumber = (pc: string) => parseInt(String(pc).replace(/\D/g, ''), 10);
const ipToInt = (ip: string) => ip.split('.').reduce((acc, octet) => acc * 256 + Number(octet), 0);
const intToIp = (n: number) => [24, 16, 8, 0].map((shift) => Math.floor(n / 2 ** shift) % 256).join('.');

const STATUS_STYLE: Record<string, string> = {
  ONLINE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  OCCUPIED: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  ISSUE_REPORTED: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  UNDER_REPAIR: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

function formatUpdated(pc: InventoryPc) {
  if (!pc.updatedAt) return '—';
  const when = new Date(pc.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return pc.updatedBy ? `${when} · ${pc.updatedBy}` : when;
}

export default function PcInventory() {
  const { user } = useAuth();
  const toast = useToast();
  const { refreshWorkstations } = useWorkstations();
  const isAdmin = user?.role === 'ADMIN';

  const [pcs, setPcs] = useState<InventoryPc[]>([]);
  const [rooms, setRooms] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Single-PC edit dialog
  const [editing, setEditing] = useState<InventoryPc | null>(null);
  const [specs, setSpecs] = useState('');
  const [ip, setIp] = useState('');
  const [room, setRoom] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Bulk edit dialog (one room)
  const [bulkRoom, setBulkRoom] = useState<string | null>(null);
  const [bulkSpecs, setBulkSpecs] = useState('');
  const [ipStart, setIpStart] = useState('');
  const [ipEnd, setIpEnd] = useState('');

  const loadPcs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/workstations/inventory', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load PCs');
      setPcs(data.pcs || []);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load PCs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPcs();
  }, [loadPcs]);

  // Rooms: admins get every registered room (including empty ones) for moving PCs
  useEffect(() => {
    const fromPcs = Array.from(new Set(pcs.map((p) => p.labCode)));
    const sortRooms = (list: string[]) => list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (!isAdmin) {
      setRooms(sortRooms(fromPcs));
      return;
    }
    fetch('/api/admin/labs', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { rooms: [] }))
      .then((data) => {
        const codes: string[] = (data.rooms || []).map((r: any) => r.code);
        setRooms(sortRooms(Array.from(new Set([...codes, ...fromPcs]))));
      })
      .catch(() => setRooms(sortRooms(fromPcs)));
  }, [pcs, isAdmin]);

  // Room tabs: every room that has PCs (one room is shown at a time)
  const roomTabs = useMemo(() => {
    const counts: Record<string, number> = {};
    pcs.forEach((p) => (counts[p.labCode] = (counts[p.labCode] || 0) + 1));
    return Object.keys(counts)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((code) => ({ code, count: counts[code] }));
  }, [pcs]);

  // Keep a valid room selected (first room by default, or after its last PC moved away)
  useEffect(() => {
    if (roomTabs.length === 0) return;
    if (!activeRoom || !roomTabs.some((t) => t.code === activeRoom)) setActiveRoom(roomTabs[0].code);
  }, [roomTabs, activeRoom]);

  const roomPcs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pcs
      .filter((p) => p.labCode === activeRoom)
      .filter((p) => !q || `${p.pcNum} ${p.ipAddress || ''} ${p.specs || ''}`.toLowerCase().includes(q))
      .sort((a, b) => pcNumber(a.pcNum) - pcNumber(b.pcNum));
  }, [pcs, activeRoom, search]);
  const activeRoomTotal = roomTabs.find((t) => t.code === activeRoom)?.count || 0;

  // ── Single edit ──
  const openEdit = (pc: InventoryPc) => {
    setEditing(pc);
    setSpecs(pc.specs || '');
    setIp(pc.ipAddress || '');
    setRoom(pc.labCode);
  };

  // Where a moved PC will land: next free number in the destination room
  const movePreview = useMemo(() => {
    if (!editing || room === editing.labCode) return null;
    const numbers = pcs.filter((p) => p.labCode === room).map((p) => pcNumber(p.pcNum)).filter((n) => !isNaN(n));
    return `${room} PC-${String(Math.max(0, ...numbers) + 1).padStart(2, '0')}`;
  }, [editing, room, pcs]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    const changes: Record<string, string> = {};
    if (specs.trim() !== (editing.specs || '')) changes.specs = specs.trim();
    if (ip.trim() !== (editing.ipAddress || '')) changes.ipAddress = ip.trim();
    if (isAdmin && room !== editing.labCode) changes.labCode = room;
    if (Object.keys(changes).length === 0) {
      setEditing(null);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/workstations/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, ...changes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error('Save Failed', data.error || 'The change could not be saved.');
        return;
      }
      toast.success(
        'PC Updated',
        data.movedTo
          ? `${editing.labCode} ${editing.pcNum} is now ${data.movedTo.labCode} ${data.movedTo.pcNum}.`
          : `${editing.labCode} ${editing.pcNum} details saved.`
      );
      setEditing(null);
      await loadPcs();
      refreshWorkstations();
    } finally {
      setIsSaving(false);
    }
  };

  // ── Bulk edit ──
  const bulkPcs = useMemo(
    () => (bulkRoom ? pcs.filter((p) => p.labCode === bulkRoom).sort((a, b) => pcNumber(a.pcNum) - pcNumber(b.pcNum)) : []),
    [bulkRoom, pcs]
  );

  const openBulk = (code: string) => {
    const roomPcs = pcs.filter((p) => p.labCode === code).sort((a, b) => pcNumber(a.pcNum) - pcNumber(b.pcNum));
    setBulkRoom(code);
    setBulkSpecs('');
    // Pre-fill with the room's current range when it is already consecutive
    const first = roomPcs[0]?.ipAddress;
    if (first && IPV4.test(first)) {
      setIpStart(first);
      setIpEnd(intToIp(ipToInt(first) + roomPcs.length - 1));
    } else {
      setIpStart('');
      setIpEnd('');
    }
  };

  // Live check of the IP range against the room's PC count
  const ipPlan = useMemo(() => {
    if (!bulkRoom || (!ipStart.trim() && !ipEnd.trim())) return { state: 'none' as const };
    if (!IPV4.test(ipStart.trim()) || !IPV4.test(ipEnd.trim())) {
      return { state: 'error' as const, message: 'Enter a valid starting and ending IP address.' };
    }
    const from = ipToInt(ipStart.trim());
    const to = ipToInt(ipEnd.trim());
    if (to < from) return { state: 'error' as const, message: 'The ending IP address must come after the starting one.' };
    const available = to - from + 1;
    if (available < bulkPcs.length) {
      return { state: 'error' as const, message: `This range has ${available} address${available === 1 ? '' : 'es'}, but ${bulkRoom} has ${bulkPcs.length} PCs.` };
    }
    const assigned = bulkPcs.map((pc, i) => ({ pc: pc.pcNum, ip: intToIp(from + i) }));
    const reserved = assigned.find((a) => a.ip.endsWith('.0') || a.ip.endsWith('.255'));
    if (reserved) {
      return { state: 'error' as const, message: `${reserved.ip} would be assigned (a network/broadcast address). Choose a range that avoids .0 and .255.` };
    }
    return { state: 'ok' as const, assigned, unused: available - bulkPcs.length };
  }, [bulkRoom, ipStart, ipEnd, bulkPcs]);

  const canApplyBulk = !isSaving && (bulkSpecs.trim() !== '' || ipPlan.state === 'ok') && ipPlan.state !== 'error';

  const handleBulkSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkRoom || !canApplyBulk) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/workstations/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labCode: bulkRoom,
          ...(bulkSpecs.trim() ? { specs: bulkSpecs.trim() } : {}),
          ...(ipPlan.state === 'ok' ? { ipStart: ipStart.trim(), ipEnd: ipEnd.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error('Bulk Update Failed', data.error || 'The changes could not be saved.');
        return;
      }
      const parts = [
        bulkSpecs.trim() ? 'specs' : null,
        data.firstIp ? `IPs ${data.firstIp} – ${data.lastIp}` : null,
      ].filter(Boolean);
      toast.success('Room Updated', `${bulkRoom}: ${parts.join(' and ')} applied to ${data.updated} PCs.`);
      setBulkRoom(null);
      await loadPcs();
      refreshWorkstations();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-5 border border-slate-800/80 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <HardDrive size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">PC Inventory</h2>
            <p className="text-xs text-slate-400">
              {isAdmin
                ? 'Edit PC specs and IP addresses one by one or per room, or move a PC to another room'
                : 'Edit PC specs and IP addresses one by one or per room'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => loadPcs()}
          className="self-start sm:self-auto p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin text-cyan-400' : ''} />
        </button>
      </div>

      {loadError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          Could not load PCs: {loadError}
        </div>
      )}

      {/* Room tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-slate-800/70" role="tablist" aria-label="Lab rooms">
        {roomTabs.map((tab) => {
          const isActive = tab.code === activeRoom;
          return (
            <button
              key={tab.code}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setActiveRoom(tab.code);
                setSearch('');
              }}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-t-xl border-b-2 text-xs font-semibold transition-colors ${
                isActive
                  ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span className="font-mono">{tab.code}</span>
              <span className={`px-1.5 rounded-md font-mono text-[10px] ${isActive ? 'bg-cyan-500/20 text-cyan-200' : 'bg-slate-800 text-slate-500'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {activeRoom && (
        <div className="space-y-3" role="tabpanel" aria-label={`${activeRoom} PCs`}>
          {/* Room toolbar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${activeRoom} by PC number, IP address or specs…`}
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs bg-slate-800/90 text-slate-200 placeholder-slate-500 border border-slate-700 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <span className="self-center text-[11px] font-mono text-slate-500 whitespace-nowrap">
              {roomPcs.length === activeRoomTotal ? `${activeRoomTotal} PCs` : `${roomPcs.length} of ${activeRoomTotal} PCs`}
            </span>
            <button
              type="button"
              onClick={() => openBulk(activeRoom)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold transition-colors"
            >
              <Layers size={13} />
              Bulk edit {activeRoom}
            </button>
          </div>

          {/* The room's PCs */}
          <div className="overflow-x-auto rounded-xl border border-slate-800/80">
            <table className="w-full text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-3 py-2.5 text-left">PC</th>
                  <th className="px-3 py-2.5 text-left">Status</th>
                  <th className="px-3 py-2.5 text-left">IP Address</th>
                  <th className="px-3 py-2.5 text-left">Hardware Specs</th>
                  <th className="px-3 py-2.5 text-left hidden lg:table-cell">Last Updated</th>
                  <th className="px-3 py-2.5 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {roomPcs.map((pc) => (
                  <tr key={pc.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-slate-200 whitespace-nowrap">{pc.pcNum}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_STYLE[pc.status] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {pc.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-300 whitespace-nowrap">{pc.ipAddress || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-300 min-w-[200px] [overflow-wrap:anywhere]">{pc.specs || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap hidden lg:table-cell">{formatUpdated(pc)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(pc)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors"
                      >
                        <Pencil size={11} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {roomPcs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-500">No PCs in {activeRoom} match your search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isLoading && !loadError && roomTabs.length === 0 && (
        <p className="py-8 text-center text-xs text-slate-500">No PCs registered yet.</p>
      )}

      {/* Single-PC edit dialog */}
      {editing && (
        <ModalPortal>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => !isSaving && setEditing(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pc-edit-title"
        >
          <form
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl space-y-4 animate-scale-up text-xs"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 id="pc-edit-title" className="text-base font-bold text-slate-100">
                  Edit {editing.labCode} {editing.pcNum}
                </h3>
                <p className="text-slate-400 mt-0.5">Last updated: {formatUpdated(editing)}</p>
              </div>
              <button type="button" onClick={() => setEditing(null)} className="p-1 text-slate-400 hover:text-slate-50" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pc-specs" className="block font-semibold text-slate-300">Hardware Specs</label>
              <input
                id="pc-specs"
                type="text"
                value={specs}
                maxLength={SPECS_MAX}
                onChange={(e) => setSpecs(e.target.value)}
                placeholder="e.g. Intel Core i5-12400 · 16GB RAM · GTX 1650"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-cyan-500 focus:outline-none"
              />
              <p className="text-right text-[10px] font-mono text-slate-500">{specs.length} / {SPECS_MAX}</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pc-ip" className="block font-semibold text-slate-300">IP Address</label>
              <input
                id="pc-ip"
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="e.g. 10.12.101.11"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-cyan-500 focus:outline-none font-mono"
              />
            </div>

            {isAdmin && (
              <div className="space-y-1.5">
                <label htmlFor="pc-room" className="block font-semibold text-slate-300">Room</label>
                {editing.openTicketId ? (
                  <p className="flex items-center gap-1.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    <Lock size={12} />
                    Can’t move this PC while ticket {editing.openTicketId} is open.
                  </p>
                ) : (
                  <>
                    <select
                      id="pc-room"
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-cyan-500 focus:outline-none"
                    >
                      {rooms.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    {movePreview && (
                      <p className="flex items-center gap-1.5 text-cyan-300">
                        {editing.labCode} {editing.pcNum}
                        <ArrowRight size={12} />
                        <span className="font-semibold">{movePreview}</span>
                        <span className="text-slate-500">(next free number in that room)</span>
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="py-2 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
        </ModalPortal>
      )}

      {/* Bulk edit dialog (one room) */}
      {bulkRoom && (
        <ModalPortal>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => !isSaving && setBulkRoom(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-edit-title"
        >
          <form
            onSubmit={handleBulkSave}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl space-y-4 animate-scale-up text-xs max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 id="bulk-edit-title" className="text-base font-bold text-slate-100">Bulk edit {bulkRoom}</h3>
                <p className="text-slate-400 mt-0.5">Applies to all {bulkPcs.length} PCs in this room.</p>
              </div>
              <button type="button" onClick={() => setBulkRoom(null)} className="p-1 text-slate-400 hover:text-slate-50" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {/* Specs for every PC */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/50 border border-slate-800">
              <label htmlFor="bulk-specs" className="block font-semibold text-slate-300">Hardware specs for every PC</label>
              <input
                id="bulk-specs"
                type="text"
                value={bulkSpecs}
                maxLength={SPECS_MAX}
                onChange={(e) => setBulkSpecs(e.target.value)}
                placeholder="e.g. Intel Core i5-12400 · 16GB RAM · GTX 1650"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-cyan-500 focus:outline-none"
              />
              <p className="text-right text-[10px] font-mono text-slate-500">{bulkSpecs.length} / {SPECS_MAX}</p>
            </div>

            {/* IP range */}
            <div className="space-y-2 p-3 rounded-xl bg-slate-950/50 border border-slate-800">
              <p className="font-semibold text-slate-300">IP address range</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="bulk-ip-start" className="block text-[11px] text-slate-400 mb-1">Starting IP</label>
                  <input
                    id="bulk-ip-start"
                    type="text"
                    value={ipStart}
                    onChange={(e) => setIpStart(e.target.value)}
                    placeholder="10.12.101.11"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="bulk-ip-end" className="block text-[11px] text-slate-400 mb-1">Ending IP</label>
                  <input
                    id="bulk-ip-end"
                    type="text"
                    value={ipEnd}
                    onChange={(e) => setIpEnd(e.target.value)}
                    placeholder="10.12.101.34"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {ipPlan.state === 'error' && <p className="text-rose-400">{ipPlan.message}</p>}
              {ipPlan.state === 'ok' && (
                <div className="space-y-1">
                  <p className="text-cyan-300">
                    Assigned in PC-number order
                    {ipPlan.unused > 0 ? ` · ${ipPlan.unused} address${ipPlan.unused === 1 ? '' : 'es'} at the end of the range left unused` : ''}
                  </p>
                  <div className="max-h-40 overflow-y-auto grid grid-cols-2 gap-x-4 gap-y-0.5 p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px]">
                    {ipPlan.assigned.map((a) => (
                      <span key={a.pc} className="text-slate-400">
                        {a.pc} <span className="text-slate-600">→</span> <span className="text-slate-200">{a.ip}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBulkRoom(null)}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canApplyBulk}
                className="py-2 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold disabled:opacity-40"
              >
                {isSaving ? 'Applying…' : `Apply to ${bulkPcs.length} PCs`}
              </button>
            </div>
          </form>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
