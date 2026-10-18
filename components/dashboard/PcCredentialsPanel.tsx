'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { KeyRound, RefreshCw, Eye, EyeOff, X, History, Pencil, RotateCcw, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import ModalPortal from '@/components/shared/ModalPortal';
import type { CredentialRoom, CredentialPc } from '@/app/api/pc-credentials/route';
import CredentialRevealDialog, { type RevealTarget } from '@/components/dashboard/CredentialRevealDialog';
import type { CredentialLogEntry } from '@/app/api/pc-credentials/log/route';

type SetTarget = { workstationId?: string; labCode: string; label: string; isPc: boolean };

const SOURCE_LABEL: Record<CredentialPc['source'], { text: string; style: string }> = {
  ROOM: { text: 'Room credentials', style: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' },
  CUSTOM: { text: 'Own credentials', style: 'bg-violet-500/10 text-violet-300 border-violet-500/30' },
  NONE: { text: 'Not set', style: 'bg-slate-800 text-slate-500 border-slate-700' },
};

export default function PcCredentialsPanel() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const [rooms, setRooms] = useState<CredentialRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<'CREDENTIALS' | 'LOG'>('CREDENTIALS');

  // Reveal flow (the dialog owns its own state)
  const [revealTarget, setRevealTarget] = useState<RevealTarget | null>(null);

  // Admin: set credentials
  const [setTarget, setSetTarget] = useState<SetTarget | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Admin: access log
  const [logEntries, setLogEntries] = useState<CredentialLogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  const loadRooms = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/pc-credentials', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load credentials');
      setRooms(data.rooms || []);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load credentials');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadLog = useCallback(async () => {
    setLogLoading(true);
    try {
      const res = await fetch('/api/pc-credentials/log', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setLogEntries(data.entries || []);
    } finally {
      setLogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (view === 'LOG' && isAdmin) loadLog();
  }, [view, isAdmin, loadLog]);

  useEffect(() => {
    if (rooms.length === 0) return;
    if (!activeRoom || !rooms.some((r) => r.labCode === activeRoom)) setActiveRoom(rooms[0].labCode);
  }, [rooms, activeRoom]);

  const room = useMemo(() => rooms.find((r) => r.labCode === activeRoom) || null, [rooms, activeRoom]);
  const totalPcs = rooms.reduce((sum, r) => sum + r.pcs.length, 0);

  const openReveal = (target: RevealTarget) => setRevealTarget(target);

  const openSet = (target: SetTarget) => {
    setSetTarget(target);
    setNewUsername('');
    setNewPassword('');
    setShowNewPassword(false);
  };

  const handleSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setTarget) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/pc-credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(setTarget.workstationId ? { workstationId: setTarget.workstationId } : { labCode: setTarget.labCode }),
          username: newUsername.trim(),
          password: newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error('Save failed', data.error || 'The credentials could not be saved.');
        return;
      }
      toast.success('Credentials saved', `Admin credentials for ${setTarget.label} were updated.`);
      setSetTarget(null);
      setNewPassword('');
      loadRooms();
    } finally {
      setIsSaving(false);
    }
  };

  const clearOwn = async (pc: CredentialPc) => {
    if (!room) return;
    const res = await fetch('/api/pc-credentials', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workstationId: pc.workstationId, clear: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error('Could not update', data.error || 'Please try again.');
      return;
    }
    toast.info('Using room credentials', `${room.labCode} ${pc.pcNum} now uses the room credentials.`);
    loadRooms();
  };

  return (
    <div className="glass rounded-2xl p-5 border border-slate-800/80 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-300">
            <KeyRound size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">PC Credentials</h2>
            <p className="text-xs text-slate-400">
              Local admin accounts for installing software and changing settings. Every view is logged and reported to admins.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
              {(['CREDENTIALS', 'LOG'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    view === v ? 'bg-rose-600/80 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {v === 'CREDENTIALS' ? <KeyRound size={12} /> : <History size={12} />}
                  {v === 'CREDENTIALS' ? 'Credentials' : 'Access Log'}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => (view === 'LOG' ? loadLog() : loadRooms())}
            className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} className={isLoading || logLoading ? 'animate-spin text-rose-300' : ''} />
          </button>
        </div>
      </div>

      {loadError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          Could not load credentials: {loadError}
        </div>
      )}

      {view === 'LOG' && isAdmin ? (
        /* ── Access log (admin) ─────────────────────────────────────────── */
        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-3 py-2.5 text-left">When</th>
                <th className="px-3 py-2.5 text-left">Who</th>
                <th className="px-3 py-2.5 text-left">Action</th>
                <th className="px-3 py-2.5 text-left">What</th>
                <th className="px-3 py-2.5 text-left">Reason</th>
                <th className="px-3 py-2.5 text-left">Result</th>
                <th className="px-3 py-2.5 text-left hidden lg:table-cell">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {logEntries.map((e) => (
                <tr key={e.id} className={e.success ? '' : 'bg-rose-500/5'}>
                  <td className="px-3 py-2 text-slate-400 whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </td>
                  <td className="px-3 py-2 text-slate-200 whitespace-nowrap">
                    {e.userName || '—'} <span className="text-slate-500 text-[10px]">{e.userRole?.toLowerCase()}</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        e.action === 'REVEAL'
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {e.action === 'REVEAL' ? 'VIEWED' : e.action === 'SET' ? 'CHANGED' : 'RESET TO ROOM'}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-300 whitespace-nowrap">
                    {e.scope === 'ALL' ? `All PCs${e.pcsCount ? ` (${e.pcsCount})` : ''}` : e.scope === 'ROOM' ? `${e.labCode}${e.pcsCount ? ` (${e.pcsCount} PCs)` : ''}` : `${e.labCode} ${e.pcNum}`}
                  </td>
                  <td className="px-3 py-2 text-slate-400 min-w-[180px] [overflow-wrap:anywhere]">{e.reason || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {e.success ? (
                      <span className="text-emerald-400">OK</span>
                    ) : (
                      <span className="text-rose-400">Failed{e.failureReason ? `: ${e.failureReason}` : ''}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-500 whitespace-nowrap hidden lg:table-cell">{e.ipAddress || '—'}</td>
                </tr>
              ))}
              {!logLoading && logEntries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">No credential activity yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Credentials by room ────────────────────────────────────────── */
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Lab rooms">
              {rooms.map((r) => {
                const isActive = r.labCode === activeRoom;
                return (
                  <button
                    key={r.labCode}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveRoom(r.labCode)}
                    className={`flex-shrink-0 px-4 py-2 rounded-t-xl border-b-2 text-xs font-semibold font-mono transition-colors ${
                      isActive ? 'border-rose-400 bg-rose-500/10 text-rose-200' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    {r.labCode}
                  </button>
                );
              })}
            </div>
            {totalPcs > 0 && (
              <button
                type="button"
                onClick={() => openReveal({ scope: 'ALL', label: `all PCs (${totalPcs})` })}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/40 text-rose-200 text-xs font-semibold transition-colors"
              >
                <Eye size={13} />
                Show all PCs
              </button>
            )}
          </div>

          {room && (
            <div className="space-y-3">
              {/* Room summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs">
                  <p className="text-slate-200 font-semibold">
                    {room.labCode} room credentials:{' '}
                    {room.hasRoomDefault ? <span className="text-emerald-400">set</span> : <span className="text-amber-400">not set</span>}
                  </p>
                  {room.hasRoomDefault && (
                    <p className="text-slate-500 mt-0.5">
                      Viewed {room.roomRevealCount} time{room.roomRevealCount === 1 ? '' : 's'} since last change
                      {room.roomUpdatedBy ? ` · changed by ${room.roomUpdatedBy}` : ''}
                      {room.roomUpdatedAt ? ` on ${new Date(room.roomUpdatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => openSet({ labCode: room.labCode, label: `${room.labCode} (room)`, isPc: false })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                    >
                      <Pencil size={12} />
                      {room.hasRoomDefault ? 'Change room credentials' : 'Set room credentials'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openReveal({ scope: 'ROOM', labCode: room.labCode, label: `${room.labCode} (${room.pcs.length} PCs)` })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/40 text-rose-200 text-xs font-semibold"
                  >
                    <Eye size={12} />
                    Show all in {room.labCode}
                  </button>
                </div>
              </div>

              {/* PCs */}
              <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                <table className="w-full text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5 text-left">PC</th>
                      <th className="px-3 py-2.5 text-left">Credentials</th>
                      <th className="px-3 py-2.5 text-left hidden md:table-cell">Viewed since change</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {room.pcs.map((pc) => (
                      <tr key={pc.workstationId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-3 py-2.5 font-mono text-slate-200">{pc.pcNum}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${SOURCE_LABEL[pc.source].style}`}>
                            {SOURCE_LABEL[pc.source].text}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 hidden md:table-cell">{pc.source === 'NONE' ? '—' : pc.revealCount}</td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex gap-1.5">
                            {isAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openSet({ workstationId: pc.workstationId, labCode: room.labCode, label: `${room.labCode} ${pc.pcNum}`, isPc: true })}
                                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold"
                                  title="Give this PC its own credentials"
                                >
                                  Set own
                                </button>
                                {pc.source === 'CUSTOM' && (
                                  <button
                                    type="button"
                                    onClick={() => clearOwn(pc)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold"
                                    title="Use the room credentials again"
                                  >
                                    <RotateCcw size={11} />
                                    Use room
                                  </button>
                                )}
                              </>
                            )}
                            <button
                              type="button"
                              disabled={pc.source === 'NONE'}
                              onClick={() => openReveal({ scope: 'PC', workstationId: pc.workstationId, label: `${room.labCode} ${pc.pcNum}` })}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/40 text-rose-200 text-[11px] font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <KeyRound size={11} />
                              Show
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!isLoading && rooms.length === 0 && !loadError && (
            <p className="py-8 text-center text-xs text-slate-500">No PCs registered yet.</p>
          )}
        </>
      )}

      {/* ── Reveal dialog (shared with the ticket queue) ───────────────────── */}
      <CredentialRevealDialog target={revealTarget} onClose={() => setRevealTarget(null)} onRevealed={loadRooms} />

      {/* ── Set credentials dialog (admin) ───────────────────────────────── */}
      {setTarget && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => !isSaving && setSetTarget(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="set-cred-title"
          >
            <form
              onSubmit={handleSet}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl space-y-4 animate-scale-up text-xs"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 id="set-cred-title" className="text-base font-bold text-slate-100">
                    {setTarget.isPc ? 'Own credentials' : 'Room credentials'}: {setTarget.label}
                  </h3>
                  <p className="text-slate-400 mt-0.5">
                    {setTarget.isPc
                      ? 'Used for this PC instead of the room credentials.'
                      : 'Used by every PC in this room that has no credentials of its own.'}
                  </p>
                </div>
                <button type="button" onClick={() => setSetTarget(null)} className="p-1 text-slate-400 hover:text-white" aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cred-username" className="block font-semibold text-slate-300">Admin username</label>
                <input
                  id="cred-username"
                  type="text"
                  value={newUsername}
                  maxLength={64}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. .\LabAdmin"
                  autoComplete="off"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-rose-400 focus:outline-none font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="cred-password" className="block font-semibold text-slate-300">Admin password</label>
                <div className="relative">
                  <input
                    id="cred-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    maxLength={128}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-rose-400 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-slate-500">Stored encrypted. Saving resets the “viewed since change” counter.</p>
              </div>

              <div className="pt-1 flex justify-end gap-2">
                <button type="button" onClick={() => setSetTarget(null)} className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !newUsername.trim() || !newPassword}
                  className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-40"
                >
                  <Check size={13} />
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
