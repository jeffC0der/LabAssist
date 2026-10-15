import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkLockout, recordFailedAttempt, resetLockout, markEmailNotified } from '@/lib/lockoutStore';
import { dispatchBrevoLockoutEmail } from '@/lib/lockoutEmail';
import { getServiceClient, requiresLoginOtp, sessionIdFromToken, markSessionVerified } from '@/lib/serverAuth';
import { verifyAndConsumeOtp } from '@/lib/otpStore';
import { issueAndSendOtp } from '@/lib/otpEmail';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhkpqacieloefhzrciae.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * POST /api/auth/signin
 * Body: { email: string, password: string, otpCode?: string }
 *
 * Password sign-in performed on the server so login lockouts are based on real password checks:
 * the server enforces the lock, counts the failure itself, and only then returns a Supabase
 * session ({ access_token, refresh_token }) that the browser installs with supabase.auth.setSession().
 */
export async function POST(request: Request) {
  let body: { email?: string; password?: string; otpCode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const otpCode = typeof body.otpCode === 'string' ? body.otpCode.trim() : '';
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

    // 3. Correct password clears the failure count
    await resetLockout(email);

    // 4. Two-factor accounts: the session is only handed over together with a valid emailed code
    if (requiresLoginOtp(data.user)) {
      if (!otpCode) {
        // Discard this session and email a login code
        await authClient.auth.signOut();
        const sent = await issueAndSendOtp(email, 'login', data.user.user_metadata?.full_name || data.user.user_metadata?.name);
        return NextResponse.json({
          success: false,
          code: 'otp_required',
          codeSent: sent.ok,
          // A code sent less than a minute ago is still valid
          error: sent.ok || sent.status === 429 ? undefined : sent.error,
        });
      }

      const verification = await verifyAndConsumeOtp(email, otpCode, 'login');
      if (!verification.valid) {
        await authClient.auth.signOut();
        return NextResponse.json(
          { success: false, code: 'invalid_otp', error: verification.error || 'Invalid or expired verification code.' },
          { status: 400 }
        );
      }

      const sessionId = sessionIdFromToken(data.session.access_token);
      if (!sessionId) {
        return NextResponse.json({ success: false, error: 'Could not start a verified session.' }, { status: 500 });
      }
      await markSessionVerified(sessionId, data.user.id);
    }

    // 5. Hand the session to the browser
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
