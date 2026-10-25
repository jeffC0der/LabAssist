import { getServiceClient } from '@/lib/serverAuth';
import { encryptCredential, decryptCredential } from '@/lib/credentialCrypto';
import { generateTotpSecret, totpUri, verifyTotp } from '@/lib/totp';

// Server-side helpers for staff authenticator apps (Google Authenticator), shared by staff sign-in
// and PC credential reveals. One secret per user in public.staff_authenticators (encrypted).

export type AuthenticatorStatus = 'NONE' | 'PENDING' | 'ACTIVE';

interface Row {
  secret_enc: string;
  confirmed_at: string | null;
  last_used_step: number | null;
}

async function readRow(userId: string): Promise<Row | null> {
  const supabase = getServiceClient();
  if (!supabase) throw new Error('Database is not configured');
  const { data, error } = await supabase
    .from('staff_authenticators')
    .select('secret_enc, confirmed_at, last_used_step')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Row) || null;
}

export async function getAuthenticatorStatus(userId: string): Promise<AuthenticatorStatus> {
  const row = await readRow(userId);
  return row ? (row.confirmed_at ? 'ACTIVE' : 'PENDING') : 'NONE';
}

/**
 * Setup details for a user who hasn't linked an app yet. Reuses an unfinished setup, so a QR code
 * already scanned keeps working; returns null when an app is already linked.
 */
export async function getOrCreatePendingSetup(userId: string, email: string): Promise<{ secret: string; otpauthUri: string } | null> {
  const row = await readRow(userId);
  if (row?.confirmed_at) return null;
  let secret = row ? decryptCredential(row.secret_enc) : '';
  if (!secret) {
    secret = generateTotpSecret();
    const supabase = getServiceClient()!;
    const { error } = await supabase
      .from('staff_authenticators')
      .upsert({ user_id: userId, secret_enc: encryptCredential(secret), confirmed_at: null, last_used_step: null, created_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
  }
  return { secret, otpauthUri: totpUri(secret, email) };
}

/**
 * Check a code from the user's app. An unfinished setup is completed by its first valid code.
 * Each code works once. Returns 'ok', 'invalid', or 'not_linked' (no app set up at all).
 */
export async function verifyStaffCode(userId: string, code: string): Promise<'ok' | 'invalid' | 'not_linked'> {
  const row = await readRow(userId);
  if (!row) return 'not_linked';
  const step = verifyTotp(decryptCredential(row.secret_enc), code, row.confirmed_at ? row.last_used_step ?? null : null);
  if (step === null) return 'invalid';
  const supabase = getServiceClient()!;
  const update: Record<string, unknown> = { last_used_step: step };
  if (!row.confirmed_at) update.confirmed_at = new Date().toISOString();
  const { error } = await supabase.from('staff_authenticators').update(update).eq('user_id', userId);
  if (error) throw new Error(error.message);
  return 'ok';
}

export const isMissingAuthenticatorTable = (err: unknown) => /staff_authenticators/.test(String((err as any)?.message || err));
