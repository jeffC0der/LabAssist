/**
 * Generates an HTML email for account lockout notification via Brevo.
 */
export function generateAccountLockedEmailHtml(
  recipientEmail: string,
  lockedUntilDate: Date,
  lockDurationMinutes = 15,
  recipientName?: string
): string {
  const greeting = recipientName ? `Hello ${recipientName},` : 'Hello,';
  const formattedUnlockTime = lockedUntilDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
  const formattedUnlockDate = lockedUntilDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Security Alert: Account Temporarily Locked</title>
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
      max-width: 540px;
      margin: 0 auto;
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    }
    .header {
      padding: 32px 32px 24px 32px;
      text-align: center;
      background: linear-gradient(180deg, #450a0a 0%, #1e293b 100%);
      border-bottom: 1px solid #7f1d1d;
    }
    .shield-badge {
      display: inline-block;
      width: 52px;
      height: 52px;
      line-height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: #ffffff;
      font-size: 26px;
      text-align: center;
      margin-bottom: 14px;
      box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
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
      color: #fca5a5;
      margin: 4px 0 0 0;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
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
      margin: 0 0 20px 0;
    }
    .lock-box {
      background-color: #0f172a;
      border: 1px solid #ef4444;
      border-radius: 12px;
      padding: 20px;
      margin: 0 0 24px 0;
    }
    .lock-title {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #f87171;
      margin: 0 0 12px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #1e293b;
      font-size: 13px;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #94a3b8;
    }
    .info-value {
      color: #f1f5f9;
      font-weight: 600;
      text-align: right;
    }
    .warning-box {
      background-color: #1e1b4b;
      border-left: 3px solid #6366f1;
      padding: 14px 16px;
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
              <div class="shield-badge">&#128274;</div>
              <h1 class="brand-title">UMakLabAssist Security</h1>
              <p class="brand-subtitle">Account Security Alert</p>
            </div>

            <!-- Content -->
            <div class="content">
              <h2 class="greeting">${greeting}</h2>
              <p class="description">
                We detected <strong>6 consecutive failed password attempts</strong> on your UMakLabAssist account (<strong>${recipientEmail}</strong>).
              </p>
              <p class="description">
                As a campus security precaution to protect your account against unauthorized access, <strong>your account has been temporarily locked for ${lockDurationMinutes} minutes</strong>.
              </p>

              <!-- Lock Details Box -->
              <div class="lock-box">
                <div class="lock-title">&#9888; Lockout Information</div>
                <table width="100%" cellpadding="4" cellspacing="0">
                  <tr>
                    <td style="color: #94a3b8; font-size: 13px;">Reason:</td>
                    <td style="color: #f87171; font-size: 13px; font-weight: 600; text-align: right;">6 Failed Password Attempts</td>
                  </tr>
                  <tr>
                    <td style="color: #94a3b8; font-size: 13px;">Lock Duration:</td>
                    <td style="color: #f1f5f9; font-size: 13px; font-weight: 600; text-align: right;">${lockDurationMinutes} Minutes</td>
                  </tr>
                  <tr>
                    <td style="color: #94a3b8; font-size: 13px;">Automatic Unlock:</td>
                    <td style="color: #38bdf8; font-size: 13px; font-weight: 600; text-align: right;">${formattedUnlockTime} (${formattedUnlockDate})</td>
                  </tr>
                </table>
              </div>

              <!-- Recommended Next Steps -->
              <div class="warning-box">
                <strong>What should you do?</strong>
                <ul style="margin: 8px 0 0 0; padding-left: 18px;">
                  <li style="margin-bottom: 6px;"><strong>If this was you:</strong> You can wait until the lock expires, or immediately reset your password using the <em>Forgot Password</em> feature with an OTP verification code.</li>
                  <li><strong>If you did NOT attempt to log in:</strong> Someone may be attempting to guess your password. We strongly recommend resetting your password immediately once your account unlocks.</li>
                </ul>
              </div>

              <p class="description" style="margin-bottom: 0; font-size: 13px; color: #94a3b8;">
                If you need assistance or suspect an unauthorized access attempt on campus, please contact the Laboratory Operations Administrator.
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p style="margin: 0 0 6px 0;">
                &copy; ${new Date().getFullYear()} UMakLabAssist. Campus Laboratory &amp; Security Services.
              </p>
              <p style="margin: 0;">
                Automated Security Dispatch &bull; Please do not reply directly to this email.
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
