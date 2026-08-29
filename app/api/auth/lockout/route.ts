import { NextResponse } from 'next/server';
import { BrevoClient } from '@getbrevo/brevo';
import {
  checkLockout,
  recordFailedAttempt,
  resetLockout,
  markEmailNotified,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MS,
} from '@/lib/lockoutStore';
import { generateAccountLockedEmailHtml } from '@/lib/emailTemplates';

interface LockoutRequestBody {
  email?: string;
  action?: 'check' | 'record_failure' | 'record_success' | 'unlock';
  name?: string;
}

/**
 * Sends a Brevo security email notifying the user that their account has been temporarily locked.
 */
async function dispatchBrevoLockoutEmail(
  cleanEmail: string,
  lockedUntilMs: number,
  recipientName?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      console.warn('[lockout] BREVO_API_KEY environment variable is not configured.');
      return { success: false, error: 'Brevo API key not configured' };
    }

    const brevo = new BrevoClient({
      apiKey: apiKey.trim(),
    });

    const sender = {
      name: 'UMakLabAssist Security',
      email: 'umak.labassist@gmail.com',
    };

    const lockedUntilDate = new Date(lockedUntilMs);
    const htmlContent = generateAccountLockedEmailHtml(
      cleanEmail,
      lockedUntilDate,
      15,
      recipientName
    );

    const textContent = `Security Alert: Your UMakLabAssist account (${cleanEmail}) has been locked for 15 minutes due to 6 consecutive failed password attempts. It will automatically unlock at ${lockedUntilDate.toLocaleTimeString()}. If you did not make these attempts, please reset your password once unlocked.`;

    const sendResponse = await brevo.transactionalEmails.sendTransacEmail({
      sender,
      to: [{ email: cleanEmail }],
      subject: 'Security Alert: Your Account Has Been Temporarily Locked - UMakLabAssist',
      htmlContent,
      textContent,
    });

    const messageId =
      sendResponse.messageId ||
      (sendResponse.messageIds && sendResponse.messageIds[0]) ||
      undefined;

    console.log(`[lockout] Brevo lockout email sent successfully to ${cleanEmail}, messageId: ${messageId}`);
    return { success: true, messageId };
  } catch (error: any) {
    const errorMessage = error?.body?.message || error?.message || 'Failed to dispatch lockout email via Brevo';
    console.error('[lockout] Brevo email dispatch error:', {
      error: errorMessage,
      details: error?.body || error,
    });
    return { success: false, error: errorMessage };
  }
}

/**
 * POST /api/auth/lockout
 * Body: { email: string, action: 'check' | 'record_failure' | 'record_success' | 'unlock', name?: string }
 */
export async function POST(request: Request) {
  try {
    let body: LockoutRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const { email, action = 'check', name } = body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ success: false, error: 'Email is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. ACTION: CHECK
    if (action === 'check') {
      const status = checkLockout(cleanEmail);
      return NextResponse.json({
        success: true,
        ...status,
      });
    }

    // 2. ACTION: RECORD SUCCESS OR UNLOCK
    if (action === 'record_success' || action === 'unlock') {
      resetLockout(cleanEmail);
      return NextResponse.json({
        success: true,
        isLocked: false,
        failedAttempts: 0,
        attemptsLeft: MAX_FAILED_ATTEMPTS,
        message: 'Lockout state cleared.',
      });
    }

    // 3. ACTION: RECORD FAILURE
    if (action === 'record_failure') {
      const status = recordFailedAttempt(cleanEmail);

      let emailSent = false;
      let emailError: string | undefined;

      // If account just crossed the 6 failed attempts threshold and got locked
      if (status.isLocked && status.justLocked && status.lockedUntil) {
        const emailResult = await dispatchBrevoLockoutEmail(cleanEmail, status.lockedUntil, name);
        emailSent = emailResult.success;
        emailError = emailResult.error;
        if (emailSent) {
          markEmailNotified(cleanEmail);
        }
      }

      return NextResponse.json({
        success: true,
        ...status,
        emailSent,
        emailError,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action specified.' }, { status: 400 });
  } catch (err: any) {
    console.error('[lockout-route] Server error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error in lockout handler.' },
      { status: 500 }
    );
  }
}
