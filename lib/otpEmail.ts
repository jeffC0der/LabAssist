import { BrevoClient } from '@getbrevo/brevo';
import { generateNumericOtp, saveOtp } from '@/lib/otpStore';
import { decrypt } from '@/lib/aes';
import { escapeHtml } from '@/lib/emailTemplates';

/**
 * Generates a clean, professional, responsive HTML email template for the OTP code.
 */
function generateOtpEmailHtml(otpCode: string, recipientName?: string, purpose = 'verification'): string {
  recipientName = recipientName ? escapeHtml(recipientName) : recipientName;
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
 * Generates a one-time code on the server, stores it (hashed) for `purpose`, and emails it via Brevo.
 * Refuses with retryAfterSeconds if a code was issued to this email less than a minute ago.
 */
export async function issueAndSendOtp(
  email: string,
  purpose: string,
  name?: string
): Promise<{ ok: boolean; status: number; error?: string; retryAfterSeconds?: number; messageId?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const code = generateNumericOtp(6);

  const saved = await saveOtp(cleanEmail, code, 10, purpose, { name });
  if (!saved.ok) {
    return {
      ok: false,
      status: 429,
      error: `A code was just sent. Please wait ${saved.retryAfterSeconds} seconds before requesting another.`,
      retryAfterSeconds: saved.retryAfterSeconds,
    };
  }

  let apiKey: string;
  try {
    const encKey = process.env.BREVO_API_KEY_ENC;
    if (!encKey) throw new Error('BREVO_API_KEY_ENC is not set');
    apiKey = decrypt(encKey);
  } catch (err: any) {
    console.error('[otp-email] Failed to decrypt Brevo API key:', err?.message);
    return { ok: false, status: 500, error: 'Brevo API key could not be decrypted. Check server configuration.' };
  }

  try {
    const brevo = new BrevoClient({ apiKey: apiKey.trim() });
    const subject = purpose === 'password_reset'
      ? 'Your Password Reset OTP - UMakLabAssist'
      : 'Your One-Time Password (OTP) - UMakLabAssist';

    const sendResponse = await brevo.transactionalEmails.sendTransacEmail({
      sender: { name: 'UMakLabAssist', email: 'umak.labassist@gmail.com' },
      to: [{ email: cleanEmail }],
      subject,
      htmlContent: generateOtpEmailHtml(code, name, purpose),
      textContent: `Your UMakLabAssist One-Time Password (OTP) is: ${code}. This code expires in 10 minutes. Please do not share it with anyone.`,
    });

    const messageId =
      sendResponse.messageId || (sendResponse.messageIds && sendResponse.messageIds[0]) || undefined;
    console.log(`[otp-email] Sent ${purpose} code to ${cleanEmail}, messageId: ${messageId}`);
    return { ok: true, status: 200, messageId };
  } catch (error: any) {
    const errorMessage = error?.body?.message || error?.message || 'An unexpected error occurred while sending the OTP email.';
    console.error('[otp-email] Failed to send email via Brevo:', { error: errorMessage, details: error?.body || error });
    return { ok: false, status: 500, error: errorMessage };
  }
}
