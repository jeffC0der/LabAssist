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

/**
 * Generates an HTML email for repair intake receipt confirmation via Brevo.
 */
export function generateRepairReceiptEmailHtml(receipt: {
  name: string;
  jobOrderNo: string;
  confirmationDate: string;
  deviceType: string;
  model: string;
  serialNumber: string;
  specs: string;
  reportedIssue: string;
  physicalConditionNotes: string;
  additionalInspectionRemarks: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Repair Intake Receipt - UMakLabAssist</title>
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
      max-width: 580px;
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
      background: linear-gradient(180deg, #1e1b4b 0%, #1e293b 100%);
      border-bottom: 1px solid #4338ca;
    }
    .shield-badge {
      display: inline-block;
      width: 52px;
      height: 52px;
      line-height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
      color: #ffffff;
      font-size: 26px;
      text-align: center;
      margin-bottom: 14px;
      box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
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
      color: #a78bfa;
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
    .job-order-box {
      background-color: #0f172a;
      border: 1px solid #6d28d9;
      border-radius: 12px;
      padding: 20px;
      margin: 0 0 24px 0;
      text-align: center;
    }
    .job-order-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #a78bfa;
      margin: 0 0 8px 0;
    }
    .job-order-number {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #c4b5fd;
      font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
      margin: 0 0 8px 0;
    }
    .confirmation-date {
      font-size: 12px;
      color: #94a3b8;
      margin: 0;
    }
    .details-box {
      background-color: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 20px;
      margin: 0 0 16px 0;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #8b5cf6;
      margin: 0 0 14px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid #1e293b;
    }
    .info-row {
      padding: 7px 0;
      border-bottom: 1px solid #1e293b;
      font-size: 13px;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .notice-box {
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
              <div class="shield-badge">&#128736;</div>
              <h1 class="brand-title">UMakLabAssist</h1>
              <p class="brand-subtitle">Device Repair Intake Receipt</p>
            </div>

            <!-- Content -->
            <div class="content">
              <h2 class="greeting">Name: ${receipt.name}</h2>
              <p class="description">
                Your device repair intake has been successfully confirmed. Below is the official summary and receipt details for your records:
              </p>

              <!-- Job Order Number Box -->
              <div class="job-order-box">
                <p class="job-order-label">Job Order No:</p>
                <p class="job-order-number">${receipt.jobOrderNo}</p>
                <p class="confirmation-date"><strong>Confirmation Date:</strong> ${receipt.confirmationDate}</p>
              </div>

              <!-- Device Details -->
              <div class="details-box">
                <div class="section-title">&#128187; Device Details</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr class="info-row">
                    <td style="color: #94a3b8; font-size: 13px; padding: 7px 0; border-bottom: 1px solid #1e293b; width: 170px; vertical-align: top;">Device Type:</td>
                    <td style="color: #f1f5f9; font-size: 13px; font-weight: 600; padding: 7px 0; border-bottom: 1px solid #1e293b;">${receipt.deviceType}</td>
                  </tr>
                  <tr class="info-row">
                    <td style="color: #94a3b8; font-size: 13px; padding: 7px 0; border-bottom: 1px solid #1e293b; width: 170px; vertical-align: top;">Model:</td>
                    <td style="color: #f1f5f9; font-size: 13px; font-weight: 600; padding: 7px 0; border-bottom: 1px solid #1e293b;">${receipt.model}</td>
                  </tr>
                  <tr class="info-row">
                    <td style="color: #94a3b8; font-size: 13px; padding: 7px 0; border-bottom: 1px solid #1e293b; width: 170px; vertical-align: top;">Serial Number/Tag:</td>
                    <td style="color: #38bdf8; font-size: 13px; font-weight: 600; padding: 7px 0; border-bottom: 1px solid #1e293b; font-family: 'SF Mono', 'Cascadia Code', monospace;">${receipt.serialNumber}</td>
                  </tr>
                  <tr class="info-row">
                    <td style="color: #94a3b8; font-size: 13px; padding: 7px 0; border-bottom: 1px solid #1e293b; width: 170px; vertical-align: top;">Specs:</td>
                    <td style="color: #f1f5f9; font-size: 13px; font-weight: 600; padding: 7px 0; border-bottom: 1px solid #1e293b;">${receipt.specs || 'N/A'}</td>
                  </tr>
                  <tr class="info-row">
                    <td style="color: #94a3b8; font-size: 13px; padding: 7px 0; width: 170px; vertical-align: top;">Reported Issue:</td>
                    <td style="color: #fbbf24; font-size: 13px; font-weight: 600; padding: 7px 0;">${receipt.reportedIssue}</td>
                  </tr>
                </table>
              </div>

              <!-- Inspection Notes -->
              <div class="details-box">
                <div class="section-title">&#128269; Physical Condition & Inspection</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr class="info-row">
                    <td style="color: #94a3b8; font-size: 13px; padding: 7px 0; border-bottom: 1px solid #1e293b; width: 200px; vertical-align: top;">Physical Condition Notes:</td>
                    <td style="color: #f1f5f9; font-size: 13px; font-weight: 600; padding: 7px 0; border-bottom: 1px solid #1e293b;">${receipt.physicalConditionNotes || 'None noted'}</td>
                  </tr>
                  <tr class="info-row">
                    <td style="color: #94a3b8; font-size: 13px; padding: 7px 0; width: 200px; vertical-align: top;">Additional Inspection Remarks:</td>
                    <td style="color: #f1f5f9; font-size: 13px; font-weight: 600; padding: 7px 0;">${receipt.additionalInspectionRemarks || 'None'}</td>
                  </tr>
                </table>
              </div>

              <!-- Notice Box -->
              <div class="notice-box">
                <strong>Next Steps:</strong>
                <ul style="margin: 8px 0 0 0; padding-left: 18px;">
                  <li style="margin-bottom: 6px;">Bring your device or present your <strong>Job Order No: ${receipt.jobOrderNo}</strong> to the IT Diagnostics Desk.</li>
                  <li style="margin-bottom: 6px;">You can track real-time diagnostics on your UMakLabAssist dashboard.</li>
                  <li>When diagnostics are complete, you will receive another notification for pickup.</li>
                </ul>
              </div>

              <p class="description" style="margin-bottom: 0; font-size: 13px; color: #94a3b8;">
                Thank you for using UMakLabAssist IT Hardware Support.
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p style="margin: 0 0 6px 0;">
                &copy; ${new Date().getFullYear()} UMakLabAssist. Campus Laboratory &amp; IT Services.
              </p>
              <p style="margin: 0;">
                Automated Repair Dispatch &bull; Please do not reply directly to this email.
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

