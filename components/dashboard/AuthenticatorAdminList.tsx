'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Smartphone, RotateCcw } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import type { AuthenticatorStatus } from '@/app/api/pc-credentials/authenticator/route';

interface StaffAuthenticator {
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
  status: AuthenticatorStatus;
  linkedAt: string | null;
}

const STATUS_STYLE: Record<AuthenticatorStatus, { text: string; style: string }> = {
  ACTIVE: { text: 'Linked', style: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  PENDING: { text: 'Setup not finished', style: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  NONE: { text: 'Not linked', style: 'bg-slate-800 text-slate-400 border-slate-700' },
};

/** Admin view: who has linked an authenticator app, and reset it for someone who lost or replaced their phone. */
export default function AuthenticatorAdminList({ refreshKey = 0 }: { refreshKey?: number }) {
  const toast = useToast();
  const [staff, setStaff] = useState<StaffAuthenticator[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pc-credentials/authenticator?list=1', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setStaff(data.staff || []);
        setSetupRequired(!!data.setupRequired);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const reset = async (person: StaffAuthenticator) => {
    setConfirmId(null);
    const res = await fetch('/api/pc-credentials/authenticator', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: person.userId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error('Reset failed', data.error || 'Please try again.');
      return;
    }
    toast.success('Authenticator reset', `${person.name || person.email} must link their app again before viewing credentials.`);
    load();
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400 flex items-start gap-1.5">
        <Smartphone size={13} className="mt-0.5 flex-shrink-0 text-indigo-300" />
        Viewing credentials needs a code from each person&apos;s own Google Authenticator. Reset it when someone loses or replaces
        their phone; they link the app again the next time they view credentials.
      </p>
      {setupRequired && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
          Run <span className="font-mono">supabase_staff_authenticator.sql</span> in the Supabase SQL editor to enable authenticator codes.
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80">
        <table className="w-full text-xs">
          <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="px-3 py-2.5 text-left">Staff</th>
              <th className="px-3 py-2.5 text-left">Role</th>
              <th className="px-3 py-2.5 text-left">Authenticator</th>
              <th className="px-3 py-2.5 text-left hidden md:table-cell">Linked</th>
              <th className="px-3 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {staff.map((p) => (
              <tr key={p.userId}>
                <td className="px-3 py-2">
                  <p className="text-slate-200 font-semibold">{p.name || '—'}</p>
                  <p className="text-slate-500 font-mono text-[10px]">{p.email}</p>
                </td>
                <td className="px-3 py-2 text-slate-400">{p.role.toLowerCase()}</td>
                <td className="px-3 py-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${STATUS_STYLE[p.status].style}`}>
                    {STATUS_STYLE[p.status].text}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-400 whitespace-nowrap hidden md:table-cell">
                  {p.linkedAt ? new Date(p.linkedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {p.status === 'NONE' ? (
                    <span className="text-slate-600">—</span>
                  ) : confirmId === p.userId ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-slate-400">Reset?</span>
                      <button type="button" onClick={() => reset(p)} className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold">
                        Yes, reset
                      </button>
                      <button type="button" onClick={() => setConfirmId(null)} className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300">
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(p.userId)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      <RotateCcw size={11} /> Reset
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && staff.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">No admins or technicians found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
