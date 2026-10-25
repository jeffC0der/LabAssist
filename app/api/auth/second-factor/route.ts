import { NextResponse } from 'next/server';
import { getSessionUser, markSessionVerified, STAFF_ROLES } from '@/lib/serverAuth';
import { checkLockout, recordFailedAttempt, resetLockout } from '@/lib/lockoutStore';
import { getAuthenticatorStatus, getOrCreatePendingSetup, verifyStaffCode, isMissingAuthenticatorTable } from '@/lib/staffAuthenticator';
import { readJson, reqStr, PATTERNS, errorResponse } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = { 'Cache-Control': 'no-store' };
const SQL_HINT = 'Staff sign-in needs the authenticator table. Run supabase_staff_authenticator.sql in Supabase.';

/**
 * Staff who signed in with Google already hold a Supabase session, but it only counts once it passes
 * their authenticator app code (password sign-ins do this inside /api/auth/signin).
 *
 * GET              → { status, verified, secret?, otpauthUri? } (setup details when no app is linked yet)
 * POST { code }    → verifies the code and marks this session as signed in
 */
export async function GET(request: Request) {
  const caller = await getSessionUser(request);
  if (!caller) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  if (!STAFF_ROLES.includes(caller.role)) return NextResponse.json({ status: 'NOT_REQUIRED', verified: true });

  try {
    const status = await getAuthenticatorStatus(caller.id);
    if (status === 'ACTIVE') return NextResponse.json({ status, verified: caller.secondFactorOk }, { headers: NO_STORE });
    const setup = await getOrCreatePendingSetup(caller.id, caller.email);
    return NextResponse.json({ status, verified: caller.secondFactorOk, ...setup }, { headers: NO_STORE });
  } catch (err) {
    if (isMissingAuthenticatorTable(err)) return NextResponse.json({ error: SQL_HINT }, { status: 500 });
    return errorResponse(err, 'api/auth/second-factor');
  }
}

export async function POST(request: Request) {
  const caller = await getSessionUser(request);
  if (!caller) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  if (!STAFF_ROLES.includes(caller.role)) return NextResponse.json({ success: true });
  if (!caller.sessionId) return NextResponse.json({ error: 'Could not start a verified session.' }, { status: 500 });

  try {
    const body = await readJson(request, 2_000);
    const code = reqStr(body.code, 'Code', { max: 6, pattern: PATTERNS.sixDigits, patternMessage: 'Enter the 6-digit code from your authenticator app.' });

    const lock = await checkLockout(caller.email);
    if (lock.isLocked) return NextResponse.json({ success: false, code: 'locked', ...lock }, { status: 423 });

    const result = await verifyStaffCode(caller.id, code);
    if (result !== 'ok') {
      const failure = await recordFailedAttempt(caller.email);
      if (failure.isLocked) return NextResponse.json({ success: false, code: 'locked', ...failure }, { status: 423 });
      return NextResponse.json(
        {
          success: false,
          error: result === 'not_linked'
            ? 'Set up your authenticator app first.'
            : `Incorrect or expired code. Enter the current code from your authenticator app (${failure.attemptsLeft} attempt${failure.attemptsLeft === 1 ? '' : 's'} left).`,
          attemptsLeft: failure.attemptsLeft,
        },
        { status: 401 }
      );
    }

    await resetLockout(caller.email);
    await markSessionVerified(caller.sessionId, caller.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (isMissingAuthenticatorTable(err)) return NextResponse.json({ error: SQL_HINT }, { status: 500 });
    return errorResponse(err, 'api/auth/second-factor');
  }
}
