import crypto from 'crypto';

// ── Authenticator app codes (TOTP, RFC 6238) ──
// The same 6-digit codes Google Authenticator / Microsoft Authenticator show: HMAC-SHA1 of the
// current 30-second time step with a shared secret. The secret is stored encrypted on the server.

const STEP_SECONDS = 30;
const DIGITS = 6;
/** Accept the previous and next code too, so a slightly-off phone clock still works */
const WINDOW = 1;
const ISSUER = 'UMak LabAssist';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A new random secret (160 bits, base32) for one user. */
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function codeAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return String(bin).padStart(DIGITS, '0');
}

export const currentTotpStep = (now = Date.now()) => Math.floor(now / 1000 / STEP_SECONDS);

/**
 * Check a code. Returns the time step it matched (store it, so the same code can't be used twice),
 * or null if it is wrong, expired, or not newer than `lastUsedStep`.
 */
export function verifyTotp(secret: string, code: string, lastUsedStep: number | null = null, now = Date.now()): number | null {
  const clean = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(clean)) return null;
  const step = currentTotpStep(now);
  for (let delta = -WINDOW; delta <= WINDOW; delta++) {
    const candidate = step + delta;
    if (lastUsedStep !== null && candidate <= lastUsedStep) continue;
    const expected = codeAt(secret, candidate);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) return candidate;
  }
  return null;
}

/** The link an authenticator app reads from the QR code. */
export function totpUri(secret: string, accountEmail: string): string {
  const label = encodeURIComponent(`${ISSUER}:${accountEmail}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

/** For tests only: the code an authenticator would show right now. */
export const totpCodeForTest = (secret: string, now = Date.now()) => codeAt(secret, currentTotpStep(now));
