import { NextResponse } from 'next/server';
import { issueAndSendOtp } from '@/lib/otpEmail';
import { reqEmail, optOneOf, optStr, errorResponse } from '@/lib/validation';

const OTP_PURPOSES = ['signup', 'password_reset', 'oauth_signup', 'login', 'verification'] as const;

interface SendOtpRequestBody {
  email?: string;
  purpose?: string; // 'signup' | 'password_reset' | 'oauth_signup' | 'login'
  name?: string;
}

/**
 * POST /api/send-otp
 * Accepts: { email: string, purpose?: string, name?: string }
 * Generates a code on the server, stores it, and emails it via Brevo (one code per minute per email).
 */
export async function POST(request: Request) {
  let body: SendOtpRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON request body.' }, { status: 400 });
  }

  let cleanEmail: string, purpose: string, name: string | undefined;
  try {
    cleanEmail = reqEmail(body.email, 'Recipient email');
    purpose = optOneOf(body.purpose, 'purpose', OTP_PURPOSES) || 'verification';
    name = optStr(body.name, 'Name', { max: 80 });
  } catch (err) {
    return errorResponse(err, 'send-otp');
  }

  try {
    // The response is the same whether or not the email already has an account, so this can't be
    // used to find out who is registered. A signup code for an existing account only proves
    // ownership of the email (verify-otp then updates that account; its role never changes).
    const result = await issueAndSendOtp(cleanEmail, purpose, name);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error, retryAfterSeconds: result.retryAfterSeconds },
        { status: result.status }
      );
    }
    return NextResponse.json({ success: true, messageId: result.messageId }, { status: 200 });
  } catch (err: any) {
    console.error('[send-otp] Error:', err);
    return errorResponse(err, 'api/send-otp');
  }
}
