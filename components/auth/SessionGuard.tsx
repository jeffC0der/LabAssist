'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import ModalPortal from '@/components/shared/ModalPortal';
import {
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_MS,
  SIGN_OUT_MESSAGES,
  type SignOutReason,
  getLastActivity,
  markActivity,
  staleReason,
  startSessionClock,
  takeSignOutReason,
} from '@/lib/sessionActivity';

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;
const WRITE_EVERY_MS = 15_000; // don't hammer localStorage on every mouse move
const CHECK_EVERY_MS = 5_000;

/**
 * Signs the user out after 30 minutes of inactivity (with a 60-second warning) and after 12 hours
 * in total. Activity in any tab keeps every tab signed in. Timers pause while a laptop sleeps, so the
 * check also runs whenever the page becomes visible again, and on load (see AuthContext).
 */
export default function SessionGuard() {
  const { user, signOut, isLoading } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const lastWrite = useRef(0);
  const signingOut = useRef(false);

  // Explain a sign-out that happened during page load (AuthContext found a stale session)
  useEffect(() => {
    if (isLoading) return;
    const reason = takeSignOutReason();
    if (reason) toast.warning(...SIGN_OUT_MESSAGES[reason]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const endSession = useCallback(
    async (reason: SignOutReason) => {
      if (signingOut.current) return;
      signingOut.current = true;
      setSecondsLeft(null);
      await signOut();
      toast.warning(...SIGN_OUT_MESSAGES[reason]);
      router.push('/auth');
      signingOut.current = false;
    },
    [signOut, toast, router]
  );

  const check = useCallback(() => {
    const now = Date.now();
    const reason = staleReason(now);
    if (reason) return void endSession(reason);
    const last = getLastActivity() ?? now;
    const remaining = IDLE_TIMEOUT_MS - (now - last);
    setSecondsLeft(remaining <= IDLE_WARNING_MS ? Math.max(0, Math.ceil(remaining / 1000)) : null);
  }, [endSession]);

  useEffect(() => {
    if (!user) {
      setSecondsLeft(null);
      return;
    }
    startSessionClock();
    check();

    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite.current < WRITE_EVERY_MS) return;
      // Activity only counts while the warning isn't up (the user must click "Stay signed in")
      const last = getLastActivity() ?? now;
      if (IDLE_TIMEOUT_MS - (now - last) <= IDLE_WARNING_MS) return;
      lastWrite.current = now;
      markActivity(now);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
      window.clearInterval(timer);
    };
  }, [user, check]);

  // Count down every second once the warning is showing
  useEffect(() => {
    if (secondsLeft === null) return;
    const t = window.setTimeout(check, 1000);
    return () => window.clearTimeout(t);
  }, [secondsLeft, check]);

  const staySignedIn = () => {
    lastWrite.current = Date.now();
    markActivity(lastWrite.current);
    setSecondsLeft(null);
  };

  if (!user || secondsLeft === null) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="alertdialog" aria-modal="true" aria-labelledby="idle-title">
        <div className="glass w-full max-w-sm rounded-2xl border border-white/10 p-6 text-center shadow-2xl">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-2xl">⏳</div>
          <h2 id="idle-title" className="text-lg font-semibold text-text-primary">Are you still there?</h2>
          <p className="mt-2 text-sm text-slate-400">
            You&apos;ve been inactive for a while. For your security you&apos;ll be signed out in{' '}
            <span className="font-mono font-semibold text-amber-400">{secondsLeft}s</span>.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => endSession('idle')}
              className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
            >
              Sign out
            </button>
            <button
              type="button"
              autoFocus
              onClick={staySignedIn}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Stay signed in
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
