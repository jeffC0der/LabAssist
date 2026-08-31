/**
 * app/api/auth/store-google-token/route.ts
 *
 * Receives a Google ID token from an authenticated client and stores an
 * AES-256-GCM encrypted copy in the `profiles.google_token_enc` column.
 *
 * POST /api/auth/store-google-token
 * Body: { idToken: string, userId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encrypt } from '@/lib/aes';

function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { idToken, userId } = body;

    if (typeof idToken !== 'string' || !idToken.trim()) {
      return NextResponse.json(
        { success: false, error: 'idToken is required.' },
        { status: 400 }
      );
    }

    if (typeof userId !== 'string' || !userId.trim()) {
      return NextResponse.json(
        { success: false, error: 'userId is required.' },
        { status: 400 }
      );
    }

    // Encrypt the Google ID token with AES-256-GCM
    const encryptedToken = encrypt(idToken.trim());

    const supabaseAdmin = getAdminClient();

    // Upsert into profiles.google_token_enc
    const { error: dbError } = await supabaseAdmin
      .from('profiles')
      .update({ google_token_enc: encryptedToken })
      .eq('id', userId.trim());

    if (dbError) {
      // The column may not exist yet if the SQL migration hasn't been run.
      // Log the error but don't fail the sign-in flow.
      console.warn('[store-google-token] Could not persist encrypted token:', dbError.message);
      return NextResponse.json(
        { success: false, error: 'Token stored in session only (DB column may not exist yet).' },
        { status: 200 }
      );
    }

    console.log(`[store-google-token] Encrypted Google ID token stored for user ${userId}`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('[store-google-token] Unexpected error:', err?.message);
    return NextResponse.json(
      { success: false, error: 'Failed to store encrypted Google token.' },
      { status: 500 }
    );
  }
}
