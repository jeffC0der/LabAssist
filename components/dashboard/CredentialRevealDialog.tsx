'use client';
import React, { useState, useEffect } from 'react';
import { KeyRound, Eye, EyeOff, Copy, X, ShieldAlert } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import ModalPortal from '@/components/shared/ModalPortal';
import type { RevealedCredential } from '@/app/api/pc-credentials/reveal/route';

/** What to reveal. A single PC can be identified by its id or by room + PC number (e.g. from a ticket). */
export type RevealTarget =
  | { scope: 'PC'; workstationId?: string; labCode?: string; pcNum?: string; label: string }
  | { scope: 'ROOM'; labCode: string; label: string }
  | { scope: 'ALL'; label: string };

interface CredentialRevealDialogProps {
  target: RevealTarget | null;
  /** Pre-filled reason (e.g. the ticket being worked on); the user can edit it */
  defaultReason?: string;
  onClose: () => void;
  /** Called after a successful reveal (e.g. to refresh "viewed since change" counters) */
  onRevealed?: () => void;
}

/**
 * Reveal window for PC admin credentials. Every reveal requires a reason and the user's own password;
 * the server rate-limits, logs it and notifies the admins. Revealed credentials auto-hide.
 */
export default function CredentialRevealDialog({ target, defaultReason = '', onClose, onRevealed }: CredentialRevealDialogProps) {
  const toast = useToast();
  const [reason, setReason] = useState(defaultReason);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealed, setRevealed] = useState<RevealedCredential[] | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [unmasked, setUnmasked] = useState<Record<string, boolean>>({});

  // Fresh state every time the dialog opens for a new target. Keyed on what the target points at,
  // not the object itself: parents (e.g. the live ticket queue) rebuild it on every re-render, which
  // would otherwise wipe what the user is typing.
  const targetKey = target ? JSON.stringify(target) : '';
  useEffect(() => {
    setReason(defaultReason);
    setPassword('');
    setShowPassword(false);
    setRevealed(null);
    setSecondsLeft(0);
    setUnmasked({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  const close = () => {
    setRevealed(null);
    setPassword('');
    setUnmasked({});
    onClose();
  };

  // Revealed credentials disappear when the timer runs out
  useEffect(() => {
    if (!revealed) return;
    if (secondsLeft <= 0) {
      close();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, secondsLeft]);

  if (!target) return null;

  const handleReveal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRevealing(true);
    try {
      const res = await fetch('/api/pc-credentials/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: target.scope,
          workstationId: target.scope === 'PC' ? target.workstationId : undefined,
          labCode: target.scope === 'PC' || target.scope === 'ROOM' ? target.labCode : undefined,
          pcNum: target.scope === 'PC' ? target.pcNum : undefined,
          reason: reason.trim(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setPassword('');
      if (!res.ok) {
        toast.error('Could not reveal credentials', data.error || 'Please try again.');
        return;
      }
      setRevealed(data.items || []);
      setSecondsLeft(data.expiresInSeconds || 60);
      onRevealed?.();
    } finally {
      setIsRevealing(false);
    }
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.info('Copied', `${what} copied to the clipboard.`);
    } catch {
      toast.error('Copy failed', 'Your browser blocked clipboard access.');
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => !isRevealing && close()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reveal-title"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl space-y-4 animate-scale-up text-xs max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 id="reveal-title" className="text-base font-bold text-slate-100 flex items-center gap-2">
                <KeyRound size={16} className="text-rose-300" />
                Admin credentials: {target.label}
              </h3>
              <p className="text-slate-400 mt-0.5 flex items-center gap-1.5">
                <ShieldAlert size={12} className="text-amber-400" />
                This view is logged and the admins are notified.
              </p>
            </div>
            <button type="button" onClick={close} className="p-1 text-slate-400 hover:text-white" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {!revealed ? (
            <form onSubmit={handleReveal} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="reveal-reason" className="block font-semibold text-slate-300">Reason</label>
                <input
                  id="reveal-reason"
                  type="text"
                  value={reason}
                  maxLength={200}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Installing MATLAB for TKT-2531"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-rose-400 focus:outline-none"
                  autoFocus={!defaultReason}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="reveal-password" className="block font-semibold text-slate-300">Your password</label>
                <div className="relative">
                  <input
                    id="reveal-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Re-enter your account password"
                    className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-rose-400 focus:outline-none"
                    autoFocus={!!defaultReason}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="pt-1 flex justify-end gap-2">
                <button type="button" onClick={close} className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRevealing || reason.trim().length < 3 || !password}
                  className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-40"
                >
                  {isRevealing ? 'Checking…' : 'Reveal'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {(() => {
                const withPassword = revealed.filter((c) => c.password !== null).map((c) => `${c.labCode}-${c.pcNum}`);
                const allShown = withPassword.length > 0 && withPassword.every((k) => unmasked[k]);
                return (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                    <span>Hides automatically in {secondsLeft}s</span>
                    <div className="flex items-center gap-3">
                      {withPassword.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setUnmasked(allShown ? {} : Object.fromEntries(withPassword.map((k) => [k, true])))}
                          className="inline-flex items-center gap-1 font-semibold hover:text-white"
                        >
                          {allShown ? <EyeOff size={13} /> : <Eye size={13} />}
                          {allShown ? 'Hide all passwords' : 'Show all passwords'}
                        </button>
                      )}
                      <button type="button" onClick={close} className="font-semibold hover:text-white">Hide now</button>
                    </div>
                  </div>
                );
              })()}
              <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-slate-800">
                <table className="w-full">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">PC</th>
                      <th className="px-3 py-2 text-left">Username</th>
                      <th className="px-3 py-2 text-left">Password</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 font-mono">
                    {revealed.map((c) => {
                      const key = `${c.labCode}-${c.pcNum}`;
                      return (
                        <tr key={key}>
                          <td className="px-3 py-2 text-slate-300 whitespace-nowrap">
                            {target.scope === 'ALL' ? `${c.labCode} ` : ''}{c.pcNum}
                          </td>
                          {c.password === null ? (
                            <td colSpan={2} className="px-3 py-2 text-slate-500 font-sans">Not set</td>
                          ) : (
                            <>
                              <td className="px-3 py-2 text-slate-200 whitespace-nowrap">
                                {c.username}
                                <button type="button" onClick={() => copy(c.username!, 'Username')} className="ml-1.5 text-slate-500 hover:text-slate-200 align-middle" aria-label="Copy username">
                                  <Copy size={11} />
                                </button>
                              </td>
                              <td className="px-3 py-2 text-slate-200 whitespace-nowrap">
                                {unmasked[key] ? c.password : '••••••••'}
                                <button
                                  type="button"
                                  onClick={() => setUnmasked((u) => ({ ...u, [key]: !u[key] }))}
                                  className="ml-1.5 text-slate-500 hover:text-slate-200 align-middle"
                                  aria-label={unmasked[key] ? 'Hide password' : 'Show password'}
                                >
                                  {unmasked[key] ? <EyeOff size={11} /> : <Eye size={11} />}
                                </button>
                                <button type="button" onClick={() => copy(c.password!, 'Password')} className="ml-1.5 text-slate-500 hover:text-slate-200 align-middle" aria-label="Copy password">
                                  <Copy size={11} />
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
