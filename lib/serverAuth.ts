import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-only helpers for authenticating API requests.
// The browser sends the Supabase access token as `Authorization: Bearer <token>`
// (attached automatically by lib/apiAuthFetch.ts); the role always comes from the
// profiles table, never from anything the client sends.

export type AppRole = 'STUDENT' | 'TECHNICIAN' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
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

/** Resolve the signed-in user behind a request, or null when the token is missing/invalid or the account is suspended. */
export async function getAuthUser(request: Request): Promise<AuthUser | null> {
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

  const email = (data.user.email || '').toLowerCase();
  return {
    id: data.user.id,
    email,
    name: profile?.name || data.user.user_metadata?.full_name || email.split('@')[0],
    role: (profile?.role as AppRole) || 'STUDENT',
  };
}

/**
 * Require a signed-in user (optionally with one of `roles`).
 * Returns `{ user }` on success, or `{ response }` holding the 401/403 to return.
 */
export async function requireAuth(
  request: Request,
  roles?: AppRole[]
): Promise<{ user: AuthUser; response?: undefined } | { user?: undefined; response: NextResponse }> {
  const user = await getAuthUser(request);
  if (!user) {
    return { response: NextResponse.json({ error: 'Sign in required.' }, { status: 401 }) };
  }
  if (roles && !roles.includes(user.role)) {
    return { response: NextResponse.json({ error: 'You do not have permission to do this.' }, { status: 403 }) };
  }
  return { user };
}

export const STAFF_ROLES: AppRole[] = ['TECHNICIAN', 'ADMIN'];
