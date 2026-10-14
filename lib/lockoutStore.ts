import { getServiceClient } from '@/lib/serverAuth';

// Login lockouts live in the public.account_lockouts table (service-role access only), so they
// survive restarts and are shared by every server instance. Failed attempts are only ever
// recorded by the server itself after a real password check (see /api/auth/signin).

export interface LockoutStatus {
  isLocked: boolean;
  remainingMs: number;
  remainingMinutes: number;
  remainingSeconds: number;
  failedAttempts: number;
  attemptsLeft: number;
  lockedUntil: number | null;
  justLocked?: boolean;
}

export const MAX_FAILED_ATTEMPTS = 6;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

interface LockoutRow {
  email: string;
  failed_attempts: number;
  locked_until: string | null;
  last_failed_at: string | null;
  email_notified: boolean | null;
}

function db() {
  const supabase = getServiceClient();
  if (!supabase) throw new Error('Server configuration error: missing service role key.');
  return supabase;
}

function lockedStatus(lockedUntil: number, failedAttempts: number, justLocked = false): LockoutStatus {
  const remainingMs = Math.max(0, lockedUntil - Date.now());
  return {
    isLocked: true,
    remainingMs,
    remainingMinutes: Math.ceil(remainingMs / (60 * 1000)),
    remainingSeconds: Math.ceil(remainingMs / 1000),
    failedAttempts,
    attemptsLeft: 0,
    lockedUntil,
    justLocked,
  };
}

function openStatus(failedAttempts: number): LockoutStatus {
  return {
    isLocked: false,
    remainingMs: 0,
    remainingMinutes: 0,
    remainingSeconds: 0,
    failedAttempts,
    attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - failedAttempts),
    lockedUntil: null,
    justLocked: false,
  };
}

/** Failed attempts that still count: an expired lock or failures older than the lockout window start over */
function activeFailures(row: LockoutRow | null, now: number): number {
  if (!row) return 0;
  const lockedUntil = row.locked_until ? new Date(row.locked_until).getTime() : null;
  if (lockedUntil && lockedUntil <= now) return 0;
  const lastFailed = row.last_failed_at ? new Date(row.last_failed_at).getTime() : 0;
  if (!lockedUntil && now - lastFailed > LOCKOUT_DURATION_MS) return 0;
  return row.failed_attempts;
}

async function readRow(email: string): Promise<LockoutRow | null> {
  const { data } = await db().from('account_lockouts').select('*').eq('email', email).maybeSingle();
  return (data as LockoutRow) || null;
}

/**
 * Checks the current lockout status for an email address.
 */
export async function checkLockout(email: string): Promise<LockoutStatus> {
  const normalizedEmail = email.toLowerCase().trim();
  const row = await readRow(normalizedEmail);
  const now = Date.now();

  const lockedUntil = row?.locked_until ? new Date(row.locked_until).getTime() : null;
  if (row && lockedUntil && lockedUntil > now) {
    return lockedStatus(lockedUntil, row.failed_attempts);
  }
  return openStatus(activeFailures(row, now));
}

/**
 * Records a failed password attempt for an email address.
 * If failed attempts reach MAX_FAILED_ATTEMPTS (6), locks the account for 15 minutes.
 * `justLocked` is true only for the attempt that triggered the lock (used to send one alert email).
 */
export async function recordFailedAttempt(email: string): Promise<LockoutStatus> {
  const normalizedEmail = email.toLowerCase().trim();
  const supabase = db();

  // Optimistic concurrency: retry if another request changed the row between our read and write
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await readRow(normalizedEmail);
    const now = Date.now();

    const currentLock = row?.locked_until ? new Date(row.locked_until).getTime() : null;
    if (row && currentLock && currentLock > now) {
      return lockedStatus(currentLock, row.failed_attempts);
    }

    const failedAttempts = activeFailures(row, now) + 1;
    const locks = failedAttempts >= MAX_FAILED_ATTEMPTS;
    const lockedUntil = locks ? now + LOCKOUT_DURATION_MS : null;
    const next = {
      email: normalizedEmail,
      failed_attempts: failedAttempts,
      locked_until: lockedUntil ? new Date(lockedUntil).toISOString() : null,
      last_failed_at: new Date(now).toISOString(),
      email_notified: locks ? false : row?.email_notified ?? false,
      updated_at: new Date(now).toISOString(),
    };

    let written = false;
    if (!row) {
      const { error } = await supabase.from('account_lockouts').insert(next);
      written = !error; // a concurrent insert wins the race -> retry with its row
    } else {
      const { data } = await supabase
        .from('account_lockouts')
        .update(next)
        .eq('email', normalizedEmail)
        .eq('failed_attempts', row.failed_attempts)
        .select('email');
      written = !!data && data.length > 0;
    }

    if (written) {
      return locks ? lockedStatus(lockedUntil!, failedAttempts, true) : openStatus(failedAttempts);
    }
  }

  // Heavy contention: report the current state rather than failing the login request
  return checkLockout(normalizedEmail);
}

/**
 * Marks that the lockout notification email has been dispatched.
 */
export async function markEmailNotified(email: string): Promise<void> {
  await db()
    .from('account_lockouts')
    .update({ email_notified: true, updated_at: new Date().toISOString() })
    .eq('email', email.toLowerCase().trim());
}

/**
 * Resets failed attempts and unlocks an account (e.g. on successful login or password reset).
 */
export async function resetLockout(email: string): Promise<void> {
  await db().from('account_lockouts').delete().eq('email', email.toLowerCase().trim());
}
