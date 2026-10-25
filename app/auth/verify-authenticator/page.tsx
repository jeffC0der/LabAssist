'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Check, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import OtpInput from '@/components/auth/OtpInput';
import AuthenticatorQr from '@/components/auth/AuthenticatorQr';

/**
 * Staff who signed in with Google finish here with their authenticator app code
 * (linking the app the first time). Password sign-ins do the same step inside the sign-in card.
 */
export default function VerifyAuthenticatorPage() {
  const router = useRouter();
  const toast = useToast();
  const { verifyStaffSecondFactor, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/auth');
        return;
      }
      try {
        const res = await fetch('/api/auth/second-factor', { cache: 'no-store' });
        const info = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) throw new Error(info.error || 'Could not load your authenticator.');
        if (info.status === 'NOT_REQUIRED') {
          router.replace('/student');
          return;
        }
        if (info.secret && info.otpauthUri) setSetup({ secret: info.secret, otpauthUri: info.otpauthUri });
      } catch (err: any) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const user = await verifyStaffSecondFactor(code);
      toast.success(setup ? 'Authenticator linked' : 'Verified & Signed In!', `Welcome back, ${user.name || user.email}!`);
      router.replace(user.role === 'ADMIN' ? '/admin' : user.role === 'TECHNICIAN' ? '/technician' : '/student');
    } catch (err: any) {
      setCode('');
      setError(err.message);
      if (err.isLocked) {
        await signOut();
        router.replace('/auth');
      }
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    await signOut();
    router.replace('/auth');
  };

  return (
    <main className="min-h-screen bg-base flex flex-col items-center justify-center p-4">
      <div className="glass rounded-2xl p-6 sm:p-8 max-w-md w-full border border-indigo-500/30 space-y-5 animate-fade-in">
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 mx-auto mb-2">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-lg font-bold text-slate-100">{setup ? 'Link Your Authenticator App' : 'Authenticator Code'}</h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {setup
              ? 'Staff accounts sign in with Google Authenticator. Link it once, then use its code every time you sign in.'
              : 'Open Google Authenticator and enter the current code for UMak LabAssist.'}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <LoadingSpinner size={24} className="text-indigo-400" />
          </div>
        ) : (
          <>
            {setup && <AuthenticatorQr secret={setup.secret} otpauthUri={setup.otpauthUri} />}
            <form onSubmit={submit} className="space-y-4" noValidate>
              <OtpInput
                value={code}
                onChange={(val) => {
                  setCode(val);
                  setError(null);
                }}
                hasError={!!error}
                disabled={busy}
                autoFocus={!setup}
                idPrefix="google-auth-app"
              />
              {error && <p className="text-xs text-rose-400 text-center" role="alert">{error}</p>}
              <button
                type="submit"
                disabled={code.length !== 6 || busy}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy ? <LoadingSpinner size={16} className="text-white" /> : <Check size={16} />}
                <span>{setup ? 'Link App & Sign In' : 'Verify & Enter Dashboard'}</span>
              </button>
            </form>
          </>
        )}

        <div className="flex flex-col items-center gap-2 text-xs">
          <p className="text-slate-500 text-center">Lost or replaced your phone? Ask an administrator to reset your authenticator.</p>
          <button type="button" onClick={cancel} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300">
            <ArrowLeft size={13} /> Cancel and sign out
          </button>
        </div>
      </div>
    </main>
  );
}
