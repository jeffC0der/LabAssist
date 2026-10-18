import { NextResponse } from 'next/server';
import { checkLockout, resetLockout, MAX_FAILED_ATTEMPTS } from '@/lib/lockoutStore';
import { getAuthUser } from '@/lib/serverAuth';
import { readJson, reqEmail, optOneOf, errorResponse } from '@/lib/validation';

interface LockoutRequestBody {
  email?: string;
  action?: 'check' | 'unlock';
}

/**
 * POST /api/auth/lockout
 * Body: { email: string, action: 'check' | 'unlock' }
 *
 * 'check' reports whether an account is temporarily locked (shown on the sign-in form).
 * 'unlock' clears a lockout and is admin-only.
 * Failed and successful logins are recorded by /api/auth/signin itself after a real password check,
 * so they can't be reported (or faked) from the browser.
 */
export async function POST(request: Request) {
  try {
    const body = (await readJson(request)) as LockoutRequestBody;
    const cleanEmail = reqEmail(body.email);
    const action = optOneOf(body.action, 'action', ['check', 'unlock'] as const) || 'check';

    if (action === 'check') {
      const status = await checkLockout(cleanEmail);
      return NextResponse.json({
        success: true,
        ...status,
      });
    }

    if (action === 'unlock') {
      const caller = await getAuthUser(request);
      if (!caller || caller.role !== 'ADMIN') {
        return NextResponse.json({ success: false, error: 'Only admins can unlock accounts.' }, { status: 403 });
      }
      await resetLockout(cleanEmail);
      return NextResponse.json({
        success: true,
        isLocked: false,
        failedAttempts: 0,
        attemptsLeft: MAX_FAILED_ATTEMPTS,
        message: 'Lockout state cleared.',
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action specified.' }, { status: 400 });
  } catch (err) {
    return errorResponse(err, 'lockout-route');
  }
}
