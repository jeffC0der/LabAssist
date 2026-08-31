/**
 * lib/aes.ts
 *
 * Server-side AES-256-GCM encryption/decryption utility.
 * Reads AES_SECRET_KEY from env (must be 64 hex chars = 32 bytes = 256 bits).
 *
 * Serialized format:  "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 *
 * GCM mode provides:
 *   - Confidentiality  (AES cipher stream)
 *   - Integrity        (16-byte GHASH authentication tag — decryption throws if tampered)
 *
 * Usage:
 *   import { encrypt, decrypt } from '@/lib/aes';
 *   const enc = encrypt('my secret');
 *   const dec = decrypt(enc); // → 'my secret'
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;   // 96-bit IV recommended for GCM
const TAG_LENGTH = 16;  // 128-bit authentication tag (GCM default)
const KEY_HEX_LENGTH = 64; // 32 bytes * 2 hex chars = 64 chars

function getKey(): Buffer {
  const hex = process.env.AES_SECRET_KEY;
  if (!hex || hex.length !== KEY_HEX_LENGTH) {
    throw new Error(
      '[AES] AES_SECRET_KEY is missing or invalid. ' +
      'Set a 64-character hex string in .env.local. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a colon-separated hex string: "<iv>:<authTag>:<ciphertext>"
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

/**
 * Decrypts a payload produced by `encrypt()`.
 * Throws if the payload is malformed, tampered, or the key is wrong.
 */
export function decrypt(payload: string): string {
  const key = getKey();
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('[AES] Invalid encrypted payload format. Expected "iv:authTag:ciphertext".');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    throw new Error('[AES] Decryption failed — payload may have been tampered with or the key is incorrect.');
  }
}
