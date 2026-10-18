// ── Automatic sign-out ──
// Supabase keeps a browser session alive indefinitely (the refresh token renews it), so closing the
// laptop and coming back a day later would still be signed in. We track the last real activity in
// localStorage (shared by every tab) and treat the session as over once it goes stale.

/** Signed out after this long without any activity (mouse, keyboard, touch, scroll). */
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
/** A warning with a "Stay signed in" button appears this long before the idle sign-out. */
export const IDLE_WARNING_MS = 60 * 1000;
/** Hard limit: sign in again after this long, even if active the whole time. */
export const MAX_SESSION_MS = 12 * 60 * 60 * 1000;

const LAST_ACTIVITY_KEY = 'labassist_last_activity';
const SESSION_START_KEY = 'labassist_session_started';
const SIGNED_OUT_REASON_KEY = 'labassist_signout_reason';

export type SignOutReason = 'idle' | 'expired';

const read = (key: string): number | null => {
  try {
    const n = Number(localStorage.getItem(key));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private mode etc.) — the in-memory timers still apply
  }
};

export const getLastActivity = () => read(LAST_ACTIVITY_KEY);
export const getSessionStart = () => read(SESSION_START_KEY);

export function markActivity(now = Date.now()) {
  write(LAST_ACTIVITY_KEY, String(now));
}

/** Start the clocks for a new sign-in (keeps an existing start so reloads don't extend the limit). */
export function startSessionClock(now = Date.now()) {
  if (!getSessionStart()) write(SESSION_START_KEY, String(now));
  markActivity(now);
}

export function clearSessionClock() {
  write(LAST_ACTIVITY_KEY, null);
  write(SESSION_START_KEY, null);
}

/** Why the stored session should no longer be used, or null if it is still fine. */
export function staleReason(now = Date.now()): SignOutReason | null {
  const last = getLastActivity();
  const start = getSessionStart();
  if (start && now - start >= MAX_SESSION_MS) return 'expired';
  if (last && now - last >= IDLE_TIMEOUT_MS) return 'idle';
  return null;
}

// The reason survives the redirect so the next page can explain why the user was signed out
export function rememberSignOutReason(reason: SignOutReason) {
  try {
    sessionStorage.setItem(SIGNED_OUT_REASON_KEY, reason);
  } catch {}
}
export function takeSignOutReason(): SignOutReason | null {
  try {
    const r = sessionStorage.getItem(SIGNED_OUT_REASON_KEY) as SignOutReason | null;
    sessionStorage.removeItem(SIGNED_OUT_REASON_KEY);
    return r === 'idle' || r === 'expired' ? r : null;
  } catch {
    return null;
  }
}

export const SIGN_OUT_MESSAGES: Record<SignOutReason, [string, string]> = {
  idle: ['Signed out for inactivity', 'You were inactive for 30 minutes. Please sign in again.'],
  expired: ['Session expired', 'For security, sessions last 12 hours. Please sign in again.'],
};
