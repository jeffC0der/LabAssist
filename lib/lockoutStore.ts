export interface LockoutEntry {
  email: string;
  failedAttempts: number;
  lockedUntil: number | null; // Timestamp in milliseconds when lock expires
  lastAttemptAt: number;
  emailNotified: boolean;
}

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

// Global in-memory storage to survive hot reloads and serverless invocations in Node runtime
declare global {
  // eslint-disable-next-line no-var
  var __labassist_lockout_store__: Map<string, LockoutEntry> | undefined;
}

const lockoutStore: Map<string, LockoutEntry> =
  globalThis.__labassist_lockout_store__ || (globalThis.__labassist_lockout_store__ = new Map());

/**
 * Checks the current lockout status for an email address.
 * Automatically clears expired locks.
 */
export function checkLockout(email: string): LockoutStatus {
  const normalizedEmail = email.toLowerCase().trim();
  const entry = lockoutStore.get(normalizedEmail);
  const now = Date.now();

  if (!entry) {
    return {
      isLocked: false,
      remainingMs: 0,
      remainingMinutes: 0,
      remainingSeconds: 0,
      failedAttempts: 0,
      attemptsLeft: MAX_FAILED_ATTEMPTS,
      lockedUntil: null,
    };
  }

  // Check if account is currently locked
  if (entry.lockedUntil && entry.lockedUntil > now) {
    const remainingMs = entry.lockedUntil - now;
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));

    return {
      isLocked: true,
      remainingMs,
      remainingMinutes,
      remainingSeconds,
      failedAttempts: entry.failedAttempts,
      attemptsLeft: 0,
      lockedUntil: entry.lockedUntil,
    };
  }

  // Lock has expired -> reset lock status
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    entry.lockedUntil = null;
    entry.failedAttempts = 0;
    entry.emailNotified = false;
  }

  return {
    isLocked: false,
    remainingMs: 0,
    remainingMinutes: 0,
    remainingSeconds: 0,
    failedAttempts: entry.failedAttempts,
    attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - entry.failedAttempts),
    lockedUntil: null,
  };
}

/**
 * Records a failed password attempt for an email address.
 * If failed attempts reach MAX_FAILED_ATTEMPTS (6), locks the account for 15 minutes.
 */
export function recordFailedAttempt(email: string): LockoutStatus {
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();
  let entry = lockoutStore.get(normalizedEmail);

  if (!entry) {
    entry = {
      email: normalizedEmail,
      failedAttempts: 0,
      lockedUntil: null,
      lastAttemptAt: now,
      emailNotified: false,
    };
    lockoutStore.set(normalizedEmail, entry);
  }

  // If already locked and lock is still active, return current lock status
  if (entry.lockedUntil && entry.lockedUntil > now) {
    const remainingMs = entry.lockedUntil - now;
    return {
      isLocked: true,
      remainingMs,
      remainingMinutes: Math.ceil(remainingMs / (60 * 1000)),
      remainingSeconds: Math.ceil(remainingMs / 1000),
      failedAttempts: entry.failedAttempts,
      attemptsLeft: 0,
      lockedUntil: entry.lockedUntil,
      justLocked: false,
    };
  }

  // If previous lock expired, reset counter before recording this new attempt
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    entry.failedAttempts = 0;
    entry.lockedUntil = null;
    entry.emailNotified = false;
  }

  entry.failedAttempts += 1;
  entry.lastAttemptAt = now;

  // Check if threshold reached
  if (entry.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
    const remainingMs = LOCKOUT_DURATION_MS;
    const justLocked = !entry.emailNotified;

    return {
      isLocked: true,
      remainingMs,
      remainingMinutes: 15,
      remainingSeconds: 15 * 60,
      failedAttempts: entry.failedAttempts,
      attemptsLeft: 0,
      lockedUntil: entry.lockedUntil,
      justLocked,
    };
  }

  const attemptsLeft = Math.max(0, MAX_FAILED_ATTEMPTS - entry.failedAttempts);

  return {
    isLocked: false,
    remainingMs: 0,
    remainingMinutes: 0,
    remainingSeconds: 0,
    failedAttempts: entry.failedAttempts,
    attemptsLeft,
    lockedUntil: null,
    justLocked: false,
  };
}

/**
 * Marks that the lockout notification email has been dispatched.
 */
export function markEmailNotified(email: string): void {
  const normalizedEmail = email.toLowerCase().trim();
  const entry = lockoutStore.get(normalizedEmail);
  if (entry) {
    entry.emailNotified = true;
  }
}

/**
 * Resets failed attempts and unlocks an account (e.g. on successful login or password reset).
 */
export function resetLockout(email: string): void {
  const normalizedEmail = email.toLowerCase().trim();
  lockoutStore.delete(normalizedEmail);
}
