/**
 * app/api/auth/state/route.ts
 *
 * Generates and verifies an AES-256-GCM encrypted OAuth `state` token for CSRF protection.
 *
 * POST /api/auth/state         — Generate an encrypted state token
 * POST /api/auth/state/verify  — Verify and consume a state token
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { encrypt, decrypt } from '@/lib/aes';

// In-memory nonce registry: prevents replay attacks within the state TTL window.
// (Nonces are only valid once and expire after STATE_TTL_MS.)
declare global {
  // eslint-disable-next-line no-var
  var __labassist_oauth_nonces__: Map<string, number> | undefined;
}

const usedNonces: Map<string, number> =
  globalThis.__labassist_oauth_nonces__ ||
  (globalThis.__labassist_oauth_nonces__ = new Map());

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Clean up expired nonces to prevent memory growth */
function pruneNonces() {
  const now = Date.now();
  for (const [nonce, ts] of usedNonces.entries()) {
    if (now - ts > STATE_TTL_MS) {
      usedNonces.delete(nonce);
    }
  }
}

interface OAuthStatePayload {
  csrfNonce: string;
  timestamp: number;
  returnUrl?: string;
}

/**
 * POST /api/auth/state
 * Body: { returnUrl?: string }
 * Returns: { state: "<encrypted_hex>" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const returnUrl = typeof body?.returnUrl === 'string' ? body.returnUrl : '/dashboard';

    const payload: OAuthStatePayload = {
      csrfNonce: crypto.randomUUID(),
      timestamp: Date.now(),
      returnUrl,
    };

    const state = encrypt(JSON.stringify(payload));
    return NextResponse.json({ state }, { status: 200 });
  } catch (err: any) {
    console.error('[auth/state] Failed to generate state token:', err?.message);
    return NextResponse.json(
      { error: 'Failed to generate OAuth state token.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/state  (used as verify endpoint)
 * Body: { state: "<encrypted_hex>" }
 * Returns: { valid: true, returnUrl: string } | { valid: false, error: string }
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const stateToken = body?.state;

    if (typeof stateToken !== 'string' || !stateToken) {
      return NextResponse.json(
        { valid: false, error: 'Missing state token.' },
        { status: 400 }
      );
    }

    // Decrypt the state token
    let payload: OAuthStatePayload;
    try {
      payload = JSON.parse(decrypt(stateToken));
    } catch {
      return NextResponse.json(
        { valid: false, error: 'Invalid or tampered state token.' },
        { status: 401 }
      );
    }

    const { csrfNonce, timestamp, returnUrl } = payload;

    // 1. Check timestamp expiry (10 minutes)
    if (!timestamp || Date.now() - timestamp > STATE_TTL_MS) {
      return NextResponse.json(
        { valid: false, error: 'OAuth state token has expired. Please try signing in again.' },
        { status: 401 }
      );
    }

    // 2. Check nonce uniqueness (prevent replay attacks)
    pruneNonces();
    if (usedNonces.has(csrfNonce)) {
      return NextResponse.json(
        { valid: false, error: 'OAuth state token has already been used (replay detected).' },
        { status: 401 }
      );
    }

    // 3. Mark nonce as consumed
    usedNonces.set(csrfNonce, Date.now());

    return NextResponse.json(
      { valid: true, returnUrl: returnUrl || '/dashboard' },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[auth/state] Failed to verify state token:', err?.message);
    return NextResponse.json(
      { valid: false, error: 'State verification failed.' },
      { status: 500 }
    );
  }
}
