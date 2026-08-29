import { NextResponse } from 'next/server';
import { BrevoClient } from '@getbrevo/brevo';
import { generateNumericOtp, saveOtp } from '@/lib/otpStore';

// Types for Request & Response
interface SendOtpRequestBody {
  email?: string;
  otpCode?: string;
  purpose?: string; // 'signup' | 'password_reset' | 'oauth_signup' | 'login'
  name?: string;
}

interface SendOtpSuccessResponse {
  success: true;
  messageId?: string;
}

interface SendOtpErrorResponse {
  success: false;
  error: string;
}

type SendOtpResponse = SendOtpSuccessResponse | SendOtpErrorResponse;

/**
 * Generates a clean, professional, responsive HTML email template for the OTP code.
 */
function generateOtpEmailHtml(otpCode: string, recipientName?: string, purpose = 'verification'): string {
  const isReset = purpose === 'password_reset';
  const actionTitle = isReset ? 'Password Reset Code' : 'Your Verification Code';
  const actionDesc = isReset
    ? 'You recently requested to reset the password for your UMakLabAssist account. Use the One-Time Password (OTP) below to authorize this request.'
    : 'Use the One-Time Password (OTP) below to authenticate your identity and activate your UMakLabAssist access.';

  const greeting = recipientName ? `Hello ${recipientName},` : 'Hello,';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Your One-Time Password (OTP)</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    .wrapper {
      width: 100%;
      background-color: #0f172a;
      padding: 40px 15px;
    }
    .card {
      max-width: 520px;
      margin: 0 auto;
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    }
    .header {
      padding: 32px 32px 20px 32px;
      text-align: center;
      background: linear-gradient(180deg, #1e1b4b 0%, #1e293b 100%);
      border-bottom: 1px solid #312e81;
    }
    .logo-badge {
      display: inline-block;
      width: 48px;
      height: 48px;
      line-height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%);
      color: #ffffff;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 12px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #f8fafc;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 13px;
      color: #94a3b8;
      margin: 4px 0 0 0;
    }
    .content {
      padding: 32px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0 0 12px 0;
    }
    .description {
      font-size: 14px;
      line-height: 1.6;
      color: #cbd5e1;
      margin: 0 0 24px 0;
    }
    .otp-container {
      background-color: #0f172a;
      border: 1px solid #4f46e5;
      border-radius: 12px;
      padding: 24px 16px;
      text-align: center;
      margin: 0 0 24px 0;
    }
    .otp-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #818cf8;
      margin: 0 0 8px 0;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace, 'SFMono-Regular';
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #38bdf8;
      margin: 0;
      user-select: all;
    }
    .security-notice {
      background-color: #1e1b4b;
      border-left: 3px solid #6366f1;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 13px;
      line-height: 1.5;
      color: #cbd5e1;
      margin: 0 0 24px 0;
    }
    .footer {
      padding: 20px 32px 32px 32px;
      border-top: 1px solid #334155;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <div class="card">
            <!-- Header -->
            <div class="header">
              <div class="logo-badge">&#9881;</div>
              <h1 class="brand-title">UMakLabAssist</h1>
              <p class="brand-subtitle">Campus Laboratory &amp; Security Services</p>
            </div>

            <!-- Content -->
            <div class="content">
              <h2 class="greeting">${greeting}</h2>
              <p class="description">
                ${actionDesc}
              </p>

              <!-- OTP Display Box -->
              <div class="otp-container">
                <div class="otp-label">${actionTitle}</div>
                <div class="otp-code">${otpCode}</div>
              </div>

              <!-- Security Notice -->
              <div class="security-notice">
                <strong>Important:</strong> This verification code will expire in <strong>10 minutes</strong>. Never share this code with anyone. LabAssist staff will never ask for your verification code.
              </div>

              <p class="description" style="margin-bottom: 0; font-size: 13px; color: #94a3b8;">
                If you did not initiate this request, you can safely ignore this email or review your account security settings.
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p style="margin: 0 0 6px 0;">
                &copy; ${new Date().getFullYear()} UMakLabAssist. All rights reserved.
              </p>
              <p style="margin: 0;">
                Automated System Message &bull; Please do not reply directly to this email.
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `.trim();
}

/**
 * POST /api/send-otp
 * Accepts: { email: string, otpCode?: string, purpose?: string, name?: string }
 * Generates an OTP, saves it in the server OTP store, and sends an OTP email via Brevo.
 */
export async function POST(request: Request): Promise<NextResponse<SendOtpResponse>> {
  try {
    // 1. Parse JSON request body
    let body: SendOtpRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request body.' },
        { status: 400 }
      );
    }

    const { email, otpCode, purpose = 'verification', name } = body;

    // 2. Validate input fields
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'Recipient email is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    // 3. Generate or use provided 6-digit OTP code
    const finalOtp =
      otpCode && typeof otpCode === 'string' && otpCode.trim().length === 6
        ? otpCode.trim()
        : generateNumericOtp(6);

    // 4. Save to OTP store with 10-minute validity
    saveOtp(cleanEmail, finalOtp, 10, purpose, { name });

    // 5. Check for Brevo API Key
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      console.error('[send-otp] Server Error: BREVO_API_KEY environment variable is not configured.');
      return NextResponse.json(
        { success: false, error: 'Brevo API key is not configured on the server.' },
        { status: 500 }
      );
    }

    // 6. Initialize Brevo Client
    const brevo = new BrevoClient({
      apiKey: apiKey.trim(),
    });

    const sender = {
      name: 'UMakLabAssist',
      email: 'umak.labassist@gmail.com',
    };

    const subject = purpose === 'password_reset'
      ? 'Your Password Reset OTP - UMakLabAssist'
      : 'Your One-Time Password (OTP) - UMakLabAssist';

    const htmlContent = generateOtpEmailHtml(finalOtp, name, purpose);
    const textContent = `Your UMakLabAssist One-Time Password (OTP) is: ${finalOtp}. This code expires in 10 minutes. Please do not share it with anyone.`;

    const sendResponse = await brevo.transactionalEmails.sendTransacEmail({
      sender,
      to: [{ email: cleanEmail }],
      subject,
      htmlContent,
      textContent,
    });

    const messageId =
      sendResponse.messageId ||
      (sendResponse.messageIds && sendResponse.messageIds[0]) ||
      undefined;

    console.log(`[send-otp] Successfully sent Brevo OTP to ${cleanEmail}, messageId: ${messageId}`);

    return NextResponse.json(
      {
        success: true,
        messageId,
      },
      { status: 200 }
    );
  } catch (error: any) {
    const errorMessage =
      error?.body?.message ||
      error?.message ||
      'An unexpected error occurred while sending the OTP email.';

    console.error('[send-otp] Failed to send email via Brevo:', {
      error: errorMessage,
      details: error?.body || error,
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
