'use client';
import React, { useState, useEffect } from 'react';
import { KeyRound, Eye, EyeOff, Copy, X, ShieldAlert, Smartphone } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import ModalPortal from '@/components/shared/ModalPortal';
import type { RevealedCredential } from '@/app/api/pc-credentials/reveal/route';
import type { AuthenticatorStatus } from '@/app/api/pc-credentials/authenticator/route';
import AuthenticatorSetup from '@/components/dashboard/AuthenticatorSetup';

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
 * Reveal window for PC admin credentials. Every reveal requires a reason and the current 6-digit code from
 * the user's authenticator app (Google Authenticator; linked once, right here, the first time);
 * the server rate-limits, logs it and notifies the admins. Revealed credentials auto-hide.
 */
export default function CredentialRevealDialog({ target, defaultReason = '', onClose, onRevealed }: CredentialRevealDialogProps) {
  const toast = useToast();
  const [reason, setReason] = useState(defaultReason);
  const [code, setCode] = useState('');
  // Whether this user has linked an authenticator app (checked each time the dialog opens)
  const [authStatus, setAuthStatus] = useState<AuthenticatorStatus | 'LOADING'>('LOADING');
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
    setCode('');
    if (target) {
      setAuthStatus('LOADING');
      fetch('/api/pc-credentials/authenticator', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => setAuthStatus(d.status === 'ACTIVE' ? 'ACTIVE' : d.status === 'PENDING' ? 'PENDING' : 'NONE'))
        .catch(() => setAuthStatus('NONE'));
    }
    setRevealed(null);
    setSecondsLeft(0);
    setUnmasked({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  const close = () => {
    setRevealed(null);
    setCode('');
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
          code,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setCode('');
      if (!res.ok) {
        if (data.code === 'authenticator_required') {
          setAuthStatus('NONE');
          return;
        }
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
            <button type="button" onClick={close} className="p-1 text-slate-400 hover:text-slate-50" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {!revealed && authStatus === 'LOADING' ? (
            <p className="py-6 text-center text-slate-400">Checking your authenticator…</p>
          ) : !revealed && authStatus !== 'ACTIVE' ? (
            <AuthenticatorSetup onLinked={() => setAuthStatus('ACTIVE')} onCancel={close} />
          ) : !revealed ? (
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
                <label htmlFor="reveal-code" className="block font-semibold text-slate-300">
                  Authenticator code
                </label>
                <div className="relative">
                  <Smartphone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="reveal-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit code"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 text-slate-100 border border-slate-700 focus:border-rose-400 focus:outline-none font-mono text-base tracking-[0.4em]"
                    autoFocus={!!defaultReason}
                  />
                </div>
                <p className="text-[11px] text-slate-500">Open Google Authenticator and enter the current code for UMak LabAssist. It changes every 30 seconds.</p>
              </div>
              <div className="pt-1 flex justify-end gap-2">
                <button type="button" onClick={close} className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRevealing || reason.trim().length < 3 || code.length !== 6}
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
                          className="inline-flex items-center gap-1 font-semibold hover:text-slate-50"
                        >
                          {allShown ? <EyeOff size={13} /> : <Eye size={13} />}
                          {allShown ? 'Hide all passwords' : 'Show all passwords'}
                        </button>
                      )}
                      <button type="button" onClick={close} className="font-semibold hover:text-slate-50">Hide now</button>
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
