import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkLockout, recordFailedAttempt, resetLockout, markEmailNotified } from '@/lib/lockoutStore';
import { dispatchBrevoLockoutEmail } from '@/lib/lockoutEmail';
import { getServiceClient } from '@/lib/serverAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhkpqacieloefhzrciae.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * POST /api/auth/signin
 * Body: { email: string, password: string }
 *
 * Password sign-in performed on the server so login lockouts are based on real password checks:
 * the server enforces the lock, counts the failure itself, and only then returns a Supabase
 * session ({ access_token, refresh_token }) that the browser installs with supabase.auth.setSession().
 */
export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  if (!email || !password) {
    return NextResponse.json({ success: false, error: 'Email and password are required.' }, { status: 400 });
  }
  if (!anonKey) {
    return NextResponse.json({ success: false, error: 'Server configuration error: missing Supabase anon key.' }, { status: 500 });
  }

  try {
    // 1. A locked account is refused before the password is even checked
    const lock = await checkLockout(email);
    if (lock.isLocked) {
      return NextResponse.json({ success: false, code: 'locked', ...lock }, { status: 423 });
    }

    // 2. Check the password with Supabase. Pass the caller's IP along so Supabase's own per-IP
    //    sign-in limits can apply to the real user instead of this server (ignored if unsupported).
    const clientIp = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: clientIp ? { headers: { 'Sb-Forwarded-For': clientIp } } : undefined,
    });
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      const code = (error as any)?.code as string | undefined;
      const status = (error as any)?.status as number | undefined;

      // Only wrong credentials count toward a lockout; rate limits / unconfirmed emails do not
      const isBadCredentials =
        code === 'invalid_credentials' || (status === 400 && /invalid login credentials/i.test(error?.message || ''));

      if (!isBadCredentials) {
        return NextResponse.json(
          {
            success: false,
            code: status === 429 ? 'rate_limited' : code || 'signin_failed',
            error:
              status === 429
                ? 'Too many sign-in attempts right now. Please wait a few minutes and try again.'
                : error?.message || 'Sign in failed.',
          },
          { status: status === 429 ? 429 : 400 }
        );
      }

      const failure = await recordFailedAttempt(email);

      // Alert the account owner once when the lock triggers — only for accounts that actually exist
      if (failure.justLocked && failure.lockedUntil) {
        const supabaseAdmin = getServiceClient();
        const { data: profile } = supabaseAdmin
          ? await supabaseAdmin.from('profiles').select('name').eq('email', email).maybeSingle()
          : { data: null };
        if (profile) {
          const sent = await dispatchBrevoLockoutEmail(email, failure.lockedUntil, profile.name);
          if (sent.success) await markEmailNotified(email);
        }
      }

      if (failure.isLocked) {
        return NextResponse.json({ success: false, code: 'locked', ...failure }, { status: 423 });
      }
      return NextResponse.json(
        {
          success: false,
          code: 'invalid_credentials',
          error: 'Invalid email or password.',
          attemptsLeft: failure.attemptsLeft,
        },
        { status: 401 }
      );
    }

    // 3. Success clears the failure count and hands the session to the browser
    await resetLockout(email);
    return NextResponse.json({
      success: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
  } catch (err: any) {
    console.error('[auth/signin] Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Sign in failed.' }, { status: 500 });
  }
}
