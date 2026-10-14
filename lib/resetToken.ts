import { createHmac, timingSafeEqual } from 'crypto';

// Short-lived, HMAC-signed proof that a password-reset OTP was verified for an email.
// Stateless so it works across server instances.

const TTL_MS = 15 * 60 * 1000;

function secret(): string {
  const s = process.env.AES_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('No signing secret configured (AES_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY).');
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(`password_reset:${payload}`).digest('base64url');
}

export function issueResetToken(email: string): string {
  const payload = Buffer.from(JSON.stringify({ email: email.toLowerCase(), exp: Date.now() + TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/** Returns the email the token was issued for, or null if it is invalid or expired. */
export function verifyResetToken(token: string): string | null {
  if (!token || typeof token !== 'string') return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const { email, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof email !== 'string' || typeof exp !== 'number' || Date.now() > exp) return null;
    return email;
  } catch {
    return null;
  }
}
