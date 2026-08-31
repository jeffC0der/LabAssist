import crypto from 'crypto';

interface StoredOtp {
  code: string;
  expiresAt: number; // Timestamp in ms
  attempts: number;
  purpose?: string;
  metadata?: Record<string, any>;
}

// Global in-memory storage to survive hot reloads and serverless invocations in Node runtime
declare global {
  // eslint-disable-next-line no-var
  var __labassist_otp_store__: Map<string, StoredOtp> | undefined;
}

const otpStore: Map<string, StoredOtp> =
  globalThis.__labassist_otp_store__ || (globalThis.__labassist_otp_store__ = new Map());

/**
 * Generates a secure random 6-digit numeric string.
 */
export function generateNumericOtp(length = 6): string {
  const digits = '0123456789';
  let otp = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[randomBytes[i] % 10];
  }
  return otp;
}

/**
 * Stores or overwrites an OTP for an email address with a TTL (default: 10 minutes).
 */
export function saveOtp(
  email: string,
  code: string,
  ttlMinutes = 10,
  purpose = 'verification',
  metadata?: Record<string, any>
): void {
  const normalizedEmail = email.toLowerCase().trim();
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;

  otpStore.set(normalizedEmail, {
    code: code.trim(),
    expiresAt,
    attempts: 0,
    purpose,
    metadata,
  });
}

/**
 * Validates a submitted OTP code against the stored value and consumes it if valid.
 */
export function verifyAndConsumeOtp(
  email: string,
  inputCode: string,
  expectedPurpose?: string
): { valid: boolean; error?: string; metadata?: Record<string, any>; purpose?: string } {
  const normalizedEmail = email.toLowerCase().trim();
  const cleanCode = (inputCode || '').trim();

  const entry = otpStore.get(normalizedEmail);

  if (!entry) {
    return {
      valid: false,
      error: 'No active verification code found for this email. Please request a new code.',
    };
  }

  // Check expiration
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(normalizedEmail);
    return {
      valid: false,
      error: 'Verification code has expired (valid for 10 minutes). Please request a fresh code.',
    };
  }

  // Check brute-force attempts
  entry.attempts += 1;
  if (entry.attempts > 5) {
    otpStore.delete(normalizedEmail);
    return {
      valid: false,
      error: 'Too many incorrect attempts. For security, please request a new verification code.',
    };
  }

  // Check code match — use constant-time comparison to prevent timing attacks
  const codeMatch =
    entry.code.length === cleanCode.length &&
    crypto.timingSafeEqual(Buffer.from(entry.code, 'utf8'), Buffer.from(cleanCode, 'utf8'));
  if (!codeMatch) {
    const remaining = 5 - entry.attempts;
    return {
      valid: false,
      error: `Invalid verification code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'Code has been invalidated.'}`,
    };
  }

  // Check purpose if specified
  if (expectedPurpose && entry.purpose && entry.purpose !== expectedPurpose) {
    return {
      valid: false,
      error: 'Verification code does not match the requested operation.',
    };
  }

  // OTP verified successfully -> consume it so it cannot be reused
  const metadata = entry.metadata;
  const purpose = entry.purpose;
  otpStore.delete(normalizedEmail);

  return {
    valid: true,
    metadata,
    purpose,
  };
}

/**
 * Peeks whether an active OTP exists for an email (without consuming it).
 */
export function hasActiveOtp(email: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  const entry = otpStore.get(normalizedEmail);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(normalizedEmail);
    return false;
  }
  return true;
}
