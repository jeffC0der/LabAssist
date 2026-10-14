import crypto from 'crypto';
import { getServiceClient } from '@/lib/serverAuth';

// One-time codes live in the public.otp_codes table (service-role access only), so they survive
// restarts and work no matter which server instance handles the send and the verify.
// Codes are stored as keyed hashes, never in plain text.

const MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

/**
 * Generates a secure random 6-digit numeric string.
 */
export function generateNumericOtp(length = 6): string {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += crypto.randomInt(0, 10).toString();
  }
  return otp;
}

function hashCode(email: string, code: string): string {
  const secret = process.env.AES_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return crypto.createHmac('sha256', secret).update(`otp:${email}:${code}`).digest('hex');
}

function db() {
  const supabase = getServiceClient();
  if (!supabase) throw new Error('Server configuration error: missing service role key.');
  return supabase;
}

/**
 * Saves (or replaces) the active code for an email. Refuses if a code was issued under a minute ago.
 */
export async function saveOtp(
  email: string,
  code: string,
  ttlMinutes = 10,
  purpose = 'verification',
  metadata?: Record<string, any>
): Promise<{ ok: boolean; retryAfterSeconds?: number }> {
  const normalizedEmail = email.toLowerCase().trim();
  const supabase = db();

  const { data: existing } = await supabase
    .from('otp_codes')
    .select('created_at')
    .eq('email', normalizedEmail)
    .maybeSingle();
  if (existing?.created_at) {
    const age = Date.now() - new Date(existing.created_at).getTime();
    if (age < OTP_RESEND_COOLDOWN_MS) {
      return { ok: false, retryAfterSeconds: Math.ceil((OTP_RESEND_COOLDOWN_MS - age) / 1000) };
    }
  }

  const now = new Date();
  const { error } = await supabase.from('otp_codes').upsert(
    {
      email: normalizedEmail,
      code_hash: hashCode(normalizedEmail, code),
      purpose,
      metadata: metadata || {},
      attempts: 0,
      expires_at: new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString(),
      created_at: now.toISOString(),
    },
    { onConflict: 'email' }
  );
  if (error) throw new Error(`Could not store verification code: ${error.message}`);
  return { ok: true };
}

/**
 * Validates a submitted OTP code against the stored value and consumes it if valid.
 */
export async function verifyAndConsumeOtp(
  email: string,
  inputCode: string,
  expectedPurpose?: string
): Promise<{ valid: boolean; error?: string; metadata?: Record<string, any>; purpose?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const cleanCode = (inputCode || '').trim();
  const supabase = db();

  const { data: entry } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (!entry) {
    return {
      valid: false,
      error: 'No active verification code found for this email. Please request a new code.',
    };
  }

  // Check expiration
  if (Date.now() > new Date(entry.expires_at).getTime()) {
    await supabase.from('otp_codes').delete().eq('email', normalizedEmail);
    return {
      valid: false,
      error: 'Verification code has expired (valid for 10 minutes). Please request a fresh code.',
    };
  }

  // Count this attempt atomically: the update only succeeds if nobody else counted one in between,
  // so parallel guesses can't exceed the attempt limit
  const attempts = entry.attempts + 1;
  const { data: counted } = await supabase
    .from('otp_codes')
    .update({ attempts })
    .eq('email', normalizedEmail)
    .eq('attempts', entry.attempts)
    .select('email');
  if (!counted || counted.length === 0) {
    return { valid: false, error: 'Verification is already in progress. Please try again.' };
  }

  if (attempts > MAX_ATTEMPTS) {
    await supabase.from('otp_codes').delete().eq('email', normalizedEmail);
    return {
      valid: false,
      error: 'Too many incorrect attempts. For security, please request a new verification code.',
    };
  }

  // Check code match — use constant-time comparison to prevent timing attacks
  const expected = Buffer.from(entry.code_hash, 'hex');
  const given = Buffer.from(hashCode(normalizedEmail, cleanCode), 'hex');
  const codeMatch = expected.length === given.length && crypto.timingSafeEqual(expected, given);
  if (!codeMatch) {
    const remaining = MAX_ATTEMPTS - attempts;
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

  // OTP verified successfully -> consume it so it cannot be reused (only one request can delete it)
  const { data: consumed } = await supabase
    .from('otp_codes')
    .delete()
    .eq('email', normalizedEmail)
    .eq('code_hash', entry.code_hash)
    .select('email');
  if (!consumed || consumed.length === 0) {
    return { valid: false, error: 'This verification code was already used. Please request a new code.' };
  }

  return {
    valid: true,
    metadata: entry.metadata || undefined,
    purpose: entry.purpose || undefined,
  };
}
