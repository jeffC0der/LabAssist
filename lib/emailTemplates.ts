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

export interface InvoiceTemplateItem {
  workScope: string;
  itemName?: string | null;
  quantity?: number | null;
  unitCost: number;
  totalCost?: number;
}

export interface InvoiceTemplateData {
  invoiceId: string;
  jobOrderId: string;
  issueDate: string;
  paymentStatus: string;
  paymentMethod: string;
  clientName: string;
  clientEmail: string;
  device: string;
  serialNumber: string;
  assignedTechnician: string;
  items: InvoiceTemplateItem[];
  totalAmount: number;
  amountPaid?: number;
  onlinePaymentReference?: string | null;
  billingNotes?: string | null;
}

/**
 * Generates an HTML email for newly generated Repair Invoices via Brevo.
 */
export function generateInvoiceEmailHtml(data: InvoiceTemplateData): string {
  const isPaid =
    data.paymentStatus === 'PAID' ||
    data.paymentStatus?.toLowerCase() === 'paid' ||
    data.paymentStatus === 'Paid in Full';
  const paymentStatusText = isPaid ? 'Paid in Full' : 'Unpaid';
  const paymentStatusBg = isPaid ? '#065f46' : '#78350f';
  const paymentStatusColor = isPaid ? '#34d399' : '#fcd34d';

  let paymentMethodText = 'N/A';
  if (data.paymentMethod) {
    if (data.paymentMethod.toUpperCase() === 'CASH') paymentMethodText = 'Cash';
    else if (data.paymentMethod.toUpperCase() === 'ONLINE' || data.paymentMethod.toUpperCase() === 'GCASH' || data.paymentMethod.toUpperCase() === 'MAYA') paymentMethodText = 'Online';
    else paymentMethodText = data.paymentMethod;
  }

  const formattedTotal = Number(data.totalAmount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const itemsRowsHtml = (data.items && data.items.length > 0 ? data.items : [
    {
      workScope: 'Device Diagnostics & Labor Service',
      itemName: undefined,
      quantity: 1,
      unitCost: data.totalAmount || 0,
      totalCost: data.totalAmount || 0,
    }
  ]).map((it, idx) => {
    const scope = it.workScope?.trim() || 'Labor & Service';
    const itemDisplay = it.itemName && it.itemName.trim() !== '' ? it.itemName.trim() : 'N/A (Labor Only)';
    const qtyDisplay = it.quantity && !isNaN(Number(it.quantity)) ? Number(it.quantity).toString() : 'N/A';
    const cost = Number(it.unitCost || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const lineTotal = Number(it.totalCost || (Number(it.quantity || 1) * Number(it.unitCost || 0))).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return `
      <tr style="border-bottom: 1px solid #334155;">
        <td style="padding: 12px 10px; font-size: 13px; color: #f1f5f9; vertical-align: top;">
          <strong style="color: #60a5fa;">${scope}</strong>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 3px;">
            <span style="color: #cbd5e1;">Item:</span> ${itemDisplay} &bull; <span style="color: #cbd5e1;">Qty:</span> ${qtyDisplay}
          </div>
        </td>
        <td style="padding: 12px 10px; font-size: 13px; color: #cbd5e1; text-align: right; vertical-align: top; white-space: nowrap;">
          &#8369;${cost}
        </td>
        <td style="padding: 12px 10px; font-size: 13px; font-weight: 700; color: #38bdf8; text-align: right; vertical-align: top; white-space: nowrap;">
          &#8369;${lineTotal}
        </td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Official Repair Invoice - UMakLabAssist</title>
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
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .header {
      padding: 32px 32px 24px 32px;
      text-align: center;
      background: linear-gradient(180deg, #1e1b4b 0%, #1e293b 100%);
      border-bottom: 1px solid #312e81;
    }
    .badge-icon {
      display: inline-block;
      width: 52px;
      height: 52px;
      line-height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
      color: #ffffff;
      font-size: 26px;
      text-align: center;
      margin-bottom: 14px;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
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
      color: #818cf8;
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
      color: #94a3b8;
      margin: 0 0 24px 0;
    }
    .invoice-hero {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 20px;
      margin: 0 0 24px 0;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #f8fafc;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
    }
    .details-box {
      background-color: #0f172a;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 20px;
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
              <div class="badge-icon">&#128179;</div>
              <h1 class="brand-title">UMakLabAssist</h1>
              <p class="brand-subtitle">Official Repair Service Invoice</p>
            </div>

            <!-- Content -->
            <div class="content">
              <h2 class="greeting">Client Name: ${data.clientName}</h2>
              <p class="description">
                A new invoice has been generated for your confirmed device repair service. Please review the official billing and scope breakdown below:
              </p>

              <!-- Main Invoice Overview Box -->
              <div class="invoice-hero">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 6px 0; font-size: 13px; color: #94a3b8; width: 150px;">Invoice ID:</td>
                    <td style="padding: 6px 0; font-size: 15px; font-weight: 800; color: #38bdf8; font-family: 'SF Mono', 'Cascadia Code', monospace;">
                      ${data.invoiceId}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Linked Job Order:</td>
                    <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #f1f5f9; font-family: 'SF Mono', 'Cascadia Code', monospace;">
                      ${data.jobOrderId}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Issue Date:</td>
                    <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #e2e8f0;">
                      ${data.issueDate}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Payment Status:</td>
                    <td style="padding: 6px 0;">
                      <span style="display: inline-block; background-color: ${paymentStatusBg}; color: ${paymentStatusColor}; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${paymentStatusText}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Payment Method:</td>
                    <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #f1f5f9;">
                      ${paymentMethodText}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Device & Service Details -->
              <div class="details-box">
                <div class="section-title">&#128187; Device &amp; Assignment</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr style="border-bottom: 1px solid #1e293b;">
                    <td style="padding: 6px 0; font-size: 13px; color: #94a3b8; width: 160px;">Client Name:</td>
                    <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #f1f5f9;">${data.clientName}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1e293b;">
                    <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Device:</td>
                    <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #f1f5f9;">${data.device}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1e293b;">
                    <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Serial Number:</td>
                    <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #38bdf8; font-family: 'SF Mono', 'Cascadia Code', monospace;">${data.serialNumber || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Assigned Technician:</td>
                    <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #a78bfa;">${data.assignedTechnician || 'Hardware Support Tech'}</td>
                  </tr>
                </table>
              </div>

              <!-- Work Scope & Line Items Breakdown -->
              <div class="details-box">
                <div class="section-title">&#128221; Work Scope &amp; Billing Items</div>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 8px;">
                  <thead>
                    <tr style="border-bottom: 2px solid #334155; text-align: left;">
                      <th style="padding: 8px 10px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Scope &amp; Item</th>
                      <th style="padding: 8px 10px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; text-align: right;">Cost</th>
                      <th style="padding: 8px 10px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsRowsHtml}
                  </tbody>
                </table>

                <!-- Grand Total -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px; border-top: 2px solid #475569; padding-top: 12px;">
                  <tr>
                    <td style="font-size: 15px; font-weight: 800; color: #f8fafc; padding: 6px 10px;">
                      Total Amount:
                    </td>
                    <td style="font-size: 18px; font-weight: 900; color: #38bdf8; text-align: right; padding: 6px 10px;">
                      &#8369;${formattedTotal}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Payment Notice -->
              <div style="background-color: #1e1b4b; border-left: 3px solid #6366f1; padding: 14px 16px; border-radius: 6px; font-size: 13px; line-height: 1.5; color: #cbd5e1; margin-bottom: 24px;">
                <strong>Payment Instructions:</strong>
                ${
                  isPaid
                    ? `<p style="margin: 6px 0 0 0;">This invoice has been recorded as <strong>Paid in Full</strong>. Your device is being processed according to the agreed work scope.</p>`
                    : `<p style="margin: 6px 0 0 0;">Payment timing is set to <strong>Pay After Repair</strong>. You may settle this amount via Cash or Online Payment when your device is ready for pickup.</p>`
                }
              </div>

              <p class="description" style="margin-bottom: 0; font-size: 13px; color: #94a3b8;">
                If you have questions regarding this invoice, please present your <strong>Invoice ID: ${data.invoiceId}</strong> or <strong>Job Order: ${data.jobOrderId}</strong> at the IT Diagnostics Desk.
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p style="margin: 0 0 6px 0;">
                &copy; ${new Date().getFullYear()} UMakLabAssist. Campus Laboratory &amp; IT Services.
              </p>
              <p style="margin: 0;">
                Automated Repair Billing Notification &bull; Sent to customer registered email: ${data.clientEmail}
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

export interface ReadyForPickupTemplateData {
  jobOrderId: string;
  device: string;
  clientName: string;
  clientEmail: string;
  pickupLocation: string;
  readyAt?: string;
}

/**
 * Generates an HTML email for Ready for Pickup notifications via Brevo.
 */
export function generateReadyForPickupEmailHtml(data: ReadyForPickupTemplateData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Device Ready for Pickup - UMakLabAssist</title>
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
      max-width: 560px;
      margin: 0 auto;
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .header {
      padding: 32px 32px 24px 32px;
      text-align: center;
      background: linear-gradient(180deg, #064e3b 0%, #1e293b 100%);
      border-bottom: 1px solid #065f46;
    }
    .badge-icon {
      display: inline-block;
      width: 52px;
      height: 52px;
      line-height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff;
      font-size: 26px;
      text-align: center;
      margin-bottom: 14px;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
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
      color: #6ee7b7;
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
      color: #94a3b8;
      margin: 0 0 24px 0;
    }
    .status-card {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 20px;
      margin: 0 0 24px 0;
    }
    .pickup-card {
      background: #064e3b25;
      border: 1.5px solid #05966960;
      border-radius: 12px;
      padding: 20px;
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
              <div class="badge-icon">&#10004;</div>
              <h1 class="brand-title">UMakLabAssist</h1>
              <p class="brand-subtitle">Device Ready for Pickup</p>
            </div>

            <!-- Content -->
            <div class="content">
              <h2 class="greeting">Hello ${data.clientName},</h2>
              <p class="description">
                Great news! Your device repair service has been serviced and is now <strong>Ready for Pickup</strong>.
              </p>

              <!-- Overview Details -->
              <div class="status-card">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr style="border-bottom: 1px solid #1e293b;">
                    <td style="padding: 8px 0; font-size: 13px; color: #94a3b8; width: 140px;">Job Order:</td>
                    <td style="padding: 8px 0; font-size: 15px; font-weight: 800; color: #38bdf8; font-family: 'SF Mono', 'Cascadia Code', monospace;">
                      ${data.jobOrderId}
                    </td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1e293b;">
                    <td style="padding: 8px 0; font-size: 13px; color: #94a3b8;">Status:</td>
                    <td style="padding: 8px 0;">
                      <span style="display: inline-block; background-color: #065f46; color: #34d399; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
                        Ready for Pickup
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 13px; color: #94a3b8;">Device:</td>
                    <td style="padding: 8px 0; font-size: 13px; font-weight: 700; color: #f1f5f9;">
                      ${data.device}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Pickup Details -->
              <div class="pickup-card">
                <div style="font-size: 14px; font-weight: 800; color: #34d399; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                  &#128205; Pickup Details
                </div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 6px 0; font-size: 13px; color: #94a3b8; width: 140px; vertical-align: top;">Location:</td>
                    <td style="padding: 6px 0; font-size: 14px; font-weight: 800; color: #f8fafc;">
                      ${data.pickupLocation}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Important Claim Instructions -->
              <div style="background-color: #1e1b4b; border-left: 3px solid #6366f1; padding: 14px 16px; border-radius: 6px; font-size: 13px; line-height: 1.5; color: #cbd5e1; margin-bottom: 24px;">
                <strong>Claiming Instructions:</strong>
                <ul style="margin: 6px 0 0 0; padding-left: 18px;">
                  <li style="margin-bottom: 4px;">Please present your <strong>Job Order: ${data.jobOrderId}</strong> and a valid UMak student/faculty ID.</li>
                  <li style="margin-bottom: 4px;">Inspect and test your device with the technician before signing the claim receipt.</li>
                  <li>If settling payment upon pickup, our desk accepts Cash and GCash/Maya online payments.</li>
                </ul>
              </div>

              <p class="description" style="margin-bottom: 0; font-size: 13px; color: #94a3b8;">
                Thank you for choosing UMakLabAssist IT Hardware Support.
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p style="margin: 0 0 6px 0;">
                &copy; ${new Date().getFullYear()} UMakLabAssist. Campus Laboratory &amp; IT Services.
              </p>
              <p style="margin: 0;">
                Automated Repair Status Dispatch &bull; Sent to customer registered email: ${data.clientEmail}
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

export interface FinalReceiptTemplateData {
  invoiceId: string;
  jobOrderId: string;
  settlementDate: string;
  paymentStatus?: string;
  paymentMethod: 'Cash' | 'Online' | string;
  onlineReference?: string;
  totalPaid: number;
  deviceReleasedTo: string;
  clientEmail: string;
  clientName?: string;
  deviceModel?: string;
}

/**
 * Generates an HTML email for Final Job Order & Release Receipt notifications via Brevo.
 */
export function generateFinalReceiptEmailHtml(data: FinalReceiptTemplateData): string {
  const formattedTotal = Number(data.totalPaid || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const isOnline = data.paymentMethod.toLowerCase() === 'online' || !!data.onlineReference;
  const methodDisplay = isOnline ? 'Online' : 'Cash';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Device Repair Final Receipt - UMakLabAssist</title>
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
      max-width: 560px;
      margin: 0 auto;
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .header {
      padding: 32px 32px 24px 32px;
      text-align: center;
      background: linear-gradient(180deg, #064e3b 0%, #1e293b 100%);
      border-bottom: 1px solid #065f46;
    }
    .badge-icon {
      display: inline-block;
      width: 52px;
      height: 52px;
      line-height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff;
      font-size: 26px;
      text-align: center;
      margin-bottom: 14px;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
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
      color: #34d399;
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
      color: #94a3b8;
      line-height: 1.6;
      margin: 0 0 24px 0;
    }
    .receipt-card {
      background-color: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .total-box {
      background-color: #064e3b;
      border: 1px solid #059669;
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 24px;
      text-align: center;
    }
    .footer {
      padding: 24px 32px;
      text-align: center;
      background-color: #0f172a;
      border-top: 1px solid #334155;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <div class="card">
            <!-- Header -->
            <div class="header">
              <div class="badge-icon">&#10003;</div>
              <h1 class="brand-title">UMakLabAssist</h1>
              <p class="brand-subtitle">Official Final Settlement Receipt</p>
            </div>

            <!-- Body Content -->
            <div class="content">
              <h2 class="greeting">Hello ${data.clientName || 'UMak Student / Faculty'},</h2>
              <p class="description">
                Your repair service is officially completed and your equipment has been handed over. Below is your official final settlement receipt:
              </p>

              <!-- Receipt Specification -->
              <div class="receipt-card">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr style="border-bottom: 1px solid #1e293b;">
                    <td style="padding: 9px 0; font-size: 13px; color: #94a3b8; width: 150px;">Invoice ID:</td>
                    <td style="padding: 9px 0; font-size: 14px; font-weight: 800; color: #34d399; font-family: 'SF Mono', 'Cascadia Code', monospace;">
                      ${data.invoiceId}
                    </td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1e293b;">
                    <td style="padding: 9px 0; font-size: 13px; color: #94a3b8;">Linked Job Order:</td>
                    <td style="padding: 9px 0; font-size: 14px; font-weight: 800; color: #38bdf8; font-family: 'SF Mono', 'Cascadia Code', monospace;">
                      ${data.jobOrderId}
                    </td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1e293b;">
                    <td style="padding: 9px 0; font-size: 13px; color: #94a3b8;">Settlement Date:</td>
                    <td style="padding: 9px 0; font-size: 13px; font-weight: 700; color: #f1f5f9;">
                      ${data.settlementDate}
                    </td>
                  </tr>
                  <tr style="border-bottom: 1px solid #1e293b;">
                    <td style="padding: 9px 0; font-size: 13px; color: #94a3b8;">Payment Status:</td>
                    <td style="padding: 9px 0;">
                      <span style="display: inline-block; background-color: #065f46; color: #34d399; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 9999px; text-transform: uppercase;">
                        PAID IN FULL
                      </span>
                    </td>
                  </tr>
                  <tr style="border-bottom: ${isOnline && data.onlineReference ? '1px solid #1e293b' : '1px solid #1e293b'};">
                    <td style="padding: 9px 0; font-size: 13px; color: #94a3b8;">Payment Method:</td>
                    <td style="padding: 9px 0; font-size: 13px; font-weight: 700; color: #f1f5f9;">
                      ${methodDisplay}
                    </td>
                  </tr>
                  ${
                    isOnline && data.onlineReference
                      ? `
                  <tr style="border-bottom: 1px solid #1e293b;">
                    <td style="padding: 9px 0; font-size: 13px; color: #94a3b8;">Online Reference:</td>
                    <td style="padding: 9px 0; font-size: 13px; font-weight: 700; color: #a5f3fc; font-family: 'SF Mono', 'Cascadia Code', monospace;">
                      ${data.onlineReference}
                    </td>
                  </tr>
                  `
                      : ''
                  }
                  <tr style="border-bottom: 1px solid #1e293b;">
                    <td style="padding: 9px 0; font-size: 13px; color: #94a3b8;">Total Paid:</td>
                    <td style="padding: 9px 0; font-size: 16px; font-weight: 900; color: #34d399; font-family: 'SF Mono', 'Cascadia Code', monospace;">
                      &#8369;${formattedTotal}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 9px 0; font-size: 13px; color: #94a3b8;">Device Released To:</td>
                    <td style="padding: 9px 0; font-size: 14px; font-weight: 800; color: #f8fafc;">
                      ${data.deviceReleasedTo}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Closing Note -->
              <div style="background-color: #064e3b; border-left: 3px solid #10b981; padding: 14px 16px; border-radius: 6px; font-size: 13px; line-height: 1.5; color: #d1fae5; margin-bottom: 24px;">
                <strong>Thank you for using UMakLabAssist!</strong>
                <p style="margin: 4px 0 0 0; color: #a7f3d0; font-size: 12px;">
                  Your service record and 30-day labor verification warranty are active. For inquiries, present your Invoice ID or Job Order Number at the IT Laboratory Counter.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p style="margin: 0 0 6px 0;">
                &copy; ${new Date().getFullYear()} UMakLabAssist. Campus Laboratory &amp; IT Services.
              </p>
              <p style="margin: 0;">
                Automated Final Receipt &bull; Sent to customer registered email: ${data.clientEmail}
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

