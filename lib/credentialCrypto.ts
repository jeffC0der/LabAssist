import crypto from 'crypto';

// Server-only encryption for PC admin passwords (AES-256-GCM).
// Uses its own key, CREDENTIALS_KEY (64 hex chars), separate from AES_SECRET_KEY, so a leak of
// one key — or of the database alone — does not expose the stored passwords.

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/** The key as set in the environment, forgiving common paste mistakes in hosting dashboards
 *  (surrounding quotes, spaces/line breaks, or the "CREDENTIALS_KEY=" prefix pasted along with it). */
function readKeyHex(): string {
  return String(process.env.CREDENTIALS_KEY || '')
    .trim()
    .replace(/^CREDENTIALS_KEY\s*=\s*/, '')
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, '');
}

/** Why the key can't be used (safe to show: never includes the key itself), or null if it's fine. */
export function credentialsKeyProblem(): string | null {
  const hex = readKeyHex();
  if (!hex) return 'CREDENTIALS_KEY is not set on the server. Add it to the environment variables and redeploy.';
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    return `CREDENTIALS_KEY on the server is not valid: expected 64 hex characters (0-9, a-f), got ${hex.length} characters. Copy the value from .env.local again.`;
  }
  return null;
}

function getKey(): Buffer {
  const problem = credentialsKeyProblem();
  if (problem) throw new Error(problem);
  return Buffer.from(readKeyHex(), 'hex');
}

export function isCredentialsKeyConfigured(): boolean {
  return credentialsKeyProblem() === null;
}

/** Encrypts to "iv:tag:ciphertext" (base64 parts). */
export function encryptCredential(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv, { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptCredential(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed encrypted credential');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'), { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}
