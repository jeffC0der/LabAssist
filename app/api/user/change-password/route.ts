import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, getServiceClient, sessionIdFromToken, requiresLoginOtp, markSessionVerified } from '@/lib/serverAuth';
import { checkLockout, recordFailedAttempt } from '@/lib/lockoutStore';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhkpqacieloefhzrciae.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * POST /api/user/change-password
 * Body: { currentPassword: string, newPassword: string }
 *
 * Password change for a signed-in user (Profile → Account & Security). The current password is
 * re-checked on the server, so an unattended signed-in session can't be used to lock the owner
 * out; wrong guesses count toward the normal login lockout.
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const currentPassword = body.currentPassword || '';
  const newPassword = body.newPassword || '';

  if (!currentPassword) {
    return NextResponse.json({ success: false, error: 'Enter your current password.' }, { status: 400 });
  }
  if (newPassword.length < 16) {
    return NextResponse.json({ success: false, error: 'New password must be at least 16 characters.' }, { status: 400 });
  }
  if (newPassword === currentPassword) {
    return NextResponse.json(
      { success: false, error: 'Your new password must be different from your current password.' },
      { status: 400 }
    );
  }

  const supabaseAdmin = getServiceClient();
  if (!supabaseAdmin || !anonKey) {
    return NextResponse.json({ success: false, error: 'Server configuration error.' }, { status: 500 });
  }

  try {
    const email = auth.user.email;

    const lock = await checkLockout(email);
    if (lock.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Too many wrong passwords. Your account is temporarily locked; try again later.' },
        { status: 423 }
      );
    }

    // Verify the current password with a throwaway session (signed out right after, this device only)
    const checker = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: check, error: checkErr } = await checker.auth.signInWithPassword({ email, password: currentPassword });
    if (checkErr || !check.session) {
      const failure = await recordFailedAttempt(email);
      return NextResponse.json(
        {
          success: false,
          error: failure.isLocked
            ? 'Too many wrong passwords. Your account is temporarily locked; try again later.'
            : `Your current password is incorrect. ${failure.attemptsLeft} attempt${failure.attemptsLeft === 1 ? '' : 's'} left.`,
        },
        { status: failure.isLocked ? 423 : 401 }
      );
    }
    await checker.auth.signOut({ scope: 'local' });

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(auth.user.id, { password: newPassword });
    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 400 });
    }

    // Supabase revokes every session when the password changes (other devices are signed out).
    // Sign this user straight back in with the new password and hand the browser that session.
    const fresh = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: renewed } = await fresh.auth.signInWithPassword({ email, password: newPassword });
    if (renewed?.session) {
      // The user already passed two-factor login in this session, so the new one inherits it
      const sessionId = sessionIdFromToken(renewed.session.access_token);
      if (sessionId && renewed.user && requiresLoginOtp(renewed.user)) {
        await markSessionVerified(sessionId, auth.user.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully.',
      session: renewed?.session
        ? { access_token: renewed.session.access_token, refresh_token: renewed.session.refresh_token }
        : null,
    });
  } catch (err: any) {
    console.error('[user/change-password] Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Failed to change password.' }, { status: 500 });
  }
}
