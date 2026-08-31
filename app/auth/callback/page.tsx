'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { isUmakEmail } from '@/lib/validators';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [statusMsg, setStatusMsg] = useState('Verifying Google authorization…');

  useEffect(() => {
    let isHandled = false;

    async function processUser(user: any) {
      if (isHandled || !user) return;
      isHandled = true;

      const email = (user.email || '').toLowerCase().trim();
      const meta = user.user_metadata || {};
      const fullName = meta.full_name || meta.name || email.split('@')[0];

      // Security Gate: Reject any Google accounts outside @umak.edu.ph
      if (!isUmakEmail(email)) {
        setStatusMsg('Access restricted: Only @umak.edu.ph accounts are authorized.');
        try {
          await supabase.auth.signOut();
        } catch {}
        router.replace('/auth?error=unauthorized_domain');
        return;
      }

      try {
        const isOtpDisabled =
          process.env.NEXT_PUBLIC_DISABLE_OTP === 'true' ||
          process.env.NEXT_PUBLIC_REQUIRE_OTP === 'false';

        // Admin email: bypass OTP, go straight to admin portal.
        if (email === 'labadmin@gmail.com' || email === 'labadmin@campus.edu') {
          setStatusMsg('Admin account detected. Loading portal…');
          router.replace('/admin');
          return;
        }


        // Check if user already has a verified record in the database.
        const [{ data: profileRow }, { data: userRow }] = await Promise.all([
          supabase.from('profiles').select('id, role').eq('id', user.id).maybeSingle(),
          supabase.from('users').select('id, role').eq('id', user.id).maybeSingle(),
        ]);

        if (isOtpDisabled || profileRow || userRow) {
          // If first-time user and OTP is disabled, auto-populate DB records
          if (!profileRow && !userRow) {
            try {
              await supabase.from('profiles').upsert({
                id: user.id,
                email,
                name: fullName,
                role: 'STUDENT',
                department: 'Undergraduate Engineering',
              });
            } catch {}
            try {
              await supabase.from('users').upsert({
                id: user.id,
                email,
                full_name: fullName,
                role: 'STUDENT',
              });
            } catch {}
          }

          // Route to their portal
          setStatusMsg('Welcome! Loading your workspace…');
          const role = profileRow?.role || userRow?.role || 'STUDENT';
          if (role === 'ADMIN') {
            router.replace('/admin');
          } else if (role === 'TECHNICIAN') {
            router.replace('/technician');
          } else {
            router.replace('/student');
          }
          return;
        }

        // NEW USER (When OTP is active) → trigger Email OTP via Brevo, then redirect to verify page.
        setStatusMsg('First-time login detected — sending Email OTP via Brevo…');
        try {
          await fetch('/api/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name: fullName, purpose: 'oauth_signup' }),
          });
        } catch (otpErr) {
          console.warn('Brevo send-otp warning:', otpErr);
        }

        router.replace(
          `/auth/verify-otp?email=${encodeURIComponent(email)}&type=oauth_signup&name=${encodeURIComponent(fullName)}`
        );
      } catch (err) {
        console.error('Callback error:', err);
        router.replace('/auth');
      }

    }

    // ── Feature C: AES-256-GCM OAuth State Verification + Auth Listener Setup ──
    // Wrapped in async init() because useEffect callbacks cannot be async directly.
    async function init() {
      // If Google returned a `state` parameter in the URL, verify it server-side
      // before trusting the callback. Reject if tampered, expired, or replayed.
      const urlParams = new URLSearchParams(window.location.search);
      const returnedState = urlParams.get('state');
      if (returnedState) {
        try {
          const verifyRes = await fetch('/api/auth/state', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: returnedState }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok || !verifyData.valid) {
            console.error('[callback] OAuth state verification failed:', verifyData.error);
            setStatusMsg('Security check failed. Please try signing in again.');
            try { await supabase.auth.signOut(); } catch {}
            router.replace('/auth?error=state_invalid');
            return;
          }
        } catch (stateErr) {
          console.warn('[callback] State verification request failed — proceeding cautiously:', stateErr);
          // Non-fatal if server is temporarily unreachable; log but continue
        }
      }

      // Strategy 1: onAuthStateChange fires as soon as Supabase parses the hash fragment.
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          processUser(session.user);
        }
      });

      // Strategy 2: Also try getSession() immediately (covers cases where session was
      // already established before this component mounted, e.g. fast load).
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          processUser(session.user);
        }
      });

      // Fallback: if nothing fires within 10 seconds, bounce back to auth.
      const timeout = setTimeout(() => {
        if (!isHandled) {
          router.replace('/auth');
        }
      }, 10000);

      // Return a cleanup fn — stored so the useEffect cleanup can call it.
      return () => {
        clearTimeout(timeout);
        authListener?.subscription.unsubscribe();
      };
    }

    let cleanupFn: (() => void) | undefined;
    init().then((fn) => { cleanupFn = fn; });

    return () => {
      cleanupFn?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-base flex flex-col items-center justify-center p-4">
      <div className="glass rounded-2xl p-8 max-w-sm w-full text-center border border-indigo-500/30 space-y-5 animate-fade-in">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center mx-auto">
          <LoadingSpinner size={24} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-100 mb-1">{statusMsg}</h1>
          <p className="text-xs text-slate-500">Securely connecting your campus Google account…</p>
        </div>
        <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 animate-[shimmer_1.5s_ease-in-out_infinite] w-1/2" />
        </div>
      </div>
    </main>
  );
}
