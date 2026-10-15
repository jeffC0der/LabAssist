import { NextResponse } from 'next/server';
import { issueAndSendOtp } from '@/lib/otpEmail';
import { getServiceClient } from '@/lib/serverAuth';

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

  const { email, purpose = 'verification', name } = body;

  if (!email || typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ success: false, error: 'Recipient email is required.' }, { status: 400 });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return NextResponse.json({ success: false, error: 'Please provide a valid email address.' }, { status: 400 });
  }

  try {
    // Signup codes are only for emails that aren't registered yet (checked here because
    // browsers can no longer read other users' profiles)
    if (purpose === 'signup') {
      const supabaseAdmin = getServiceClient();
      const { data: existing } = supabaseAdmin
        ? await supabaseAdmin.from('profiles').select('id').eq('email', cleanEmail).maybeSingle()
        : { data: null };
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'An account with this email address already exists.' },
          { status: 409 }
        );
      }
    }

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
    return NextResponse.json({ success: false, error: err?.message || 'Failed to send the code.' }, { status: 500 });
  }
}
