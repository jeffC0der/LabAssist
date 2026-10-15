import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient, type User as SupabaseUser } from '@supabase/supabase-js';

// Server-only helpers for authenticating API requests.
// The browser sends the Supabase access token as `Authorization: Bearer <token>`
// (attached automatically by lib/apiAuthFetch.ts); the role always comes from the
// profiles table, never from anything the client sends.
//
// Two-factor login: accounts with app_metadata.require_login_otp only count as signed in when
// their Supabase session passed the emailed code (recorded in public.verified_sessions).
// app_metadata can only be written with the service-role key, so users can't switch it off
// from the browser, and sessions obtained directly from Supabase (skipping the code) are refused.

export type AppRole = 'STUDENT' | 'TECHNICIAN' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  sessionId: string | null;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhkpqacieloefhzrciae.supabase.co';

let adminClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  if (!adminClient) {
    adminClient = createClient(supabaseUrl, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

/** The Supabase session id inside an access token (the token itself is validated separately). */
export function sessionIdFromToken(accessToken: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8'));
    return typeof payload.session_id === 'string' ? payload.session_id : null;
  } catch {
    return null;
  }
}

export function requiresLoginOtp(user: Pick<SupabaseUser, 'app_metadata'>): boolean {
  return user.app_metadata?.require_login_otp === true;
}

/** Record that a session passed two-factor verification. */
export async function markSessionVerified(sessionId: string, userId: string): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) return;
  await supabase
    .from('verified_sessions')
    .upsert({ session_id: sessionId, user_id: userId, verified_at: new Date().toISOString() }, { onConflict: 'session_id' });
}

async function isSessionVerified(sessionId: string | null): Promise<boolean> {
  if (!sessionId) return false;
  const supabase = getServiceClient();
  if (!supabase) return false;
  const { data } = await supabase.from('verified_sessions').select('session_id').eq('session_id', sessionId).maybeSingle();
  return !!data;
}

export interface SessionUser extends AuthUser {
  /** false when the account requires two-factor login and this session hasn't passed it yet */
  secondFactorOk: boolean;
}

/**
 * Resolve the Supabase session behind a request, including sessions still waiting for their
 * two-factor code. Returns null when the token is missing/invalid or the account is suspended.
 */
export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const header = request.headers.get('authorization') || '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;

  const supabase = getServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role, status')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profile?.status === 'SUSPENDED') return null;

  const sessionId = sessionIdFromToken(token);
  const secondFactorOk = !requiresLoginOtp(data.user) || (await isSessionVerified(sessionId));

  const email = (data.user.email || '').toLowerCase();
  return {
    id: data.user.id,
    email,
    name: profile?.name || data.user.user_metadata?.full_name || email.split('@')[0],
    role: (profile?.role as AppRole) || 'STUDENT',
    sessionId,
    secondFactorOk,
  };
}

/** Resolve the fully signed-in user behind a request (two-factor completed where required), or null. */
export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  const user = await getSessionUser(request);
  if (!user || !user.secondFactorOk) return null;
  const { secondFactorOk: _ok, ...authUser } = user;
  return authUser;
}

/**
 * Require a signed-in user (optionally with one of `roles`).
 * Returns `{ user }` on success, or `{ response }` holding the 401/403 to return.
 */
export async function requireAuth(
  request: Request,
  roles?: AppRole[]
): Promise<{ user: AuthUser; response?: undefined } | { user?: undefined; response: NextResponse }> {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return { response: NextResponse.json({ error: 'Sign in required.' }, { status: 401 }) };
  }
  if (!sessionUser.secondFactorOk) {
    return {
      response: NextResponse.json(
        { error: 'Enter the verification code sent to your email to finish signing in.', code: 'second_factor_required' },
        { status: 401 }
      ),
    };
  }
  const { secondFactorOk: _ok, ...user } = sessionUser;
  if (roles && !roles.includes(user.role)) {
    return { response: NextResponse.json({ error: 'You do not have permission to do this.' }, { status: 403 }) };
  }
  return { user };
}

export const STAFF_ROLES: AppRole[] = ['TECHNICIAN', 'ADMIN'];
