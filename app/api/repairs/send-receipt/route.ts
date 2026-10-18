import { NextResponse } from 'next/server';
import { sendRepairReceiptEmail } from '@/lib/emailService';
import { requireAuth, STAFF_ROLES } from '@/lib/serverAuth';
import { errorResponse, readJson, reqStr, reqEmail, optStr, PATTERNS } from '@/lib/validation';

export async function POST(request: Request) {
  const auth = await requireAuth(request, STAFF_ROLES);
  if (auth.response) return auth.response;

  try {
    const body = await readJson(request);
    reqStr(body.clientName, 'Client name', { max: 80 });
    reqEmail(body.clientEmail, 'Client email');
    reqStr(body.jobOrderNo, 'Job order', { max: 40, pattern: PATTERNS.jobOrder });
    for (const [field, max] of [['confirmationDate', 60], ['deviceType', 30], ['deviceModel', 80], ['serialNumber', 50], ['osSpecs', 200], ['reportedIssue', 1000], ['additionalInspectionRemarks', 500]] as const) {
      optStr(body[field], field, { max });
    }
    const {
      clientName,
      clientEmail,
      jobOrderNo,
      confirmationDate,
      deviceType,
      deviceModel,
      serialNumber,
      osSpecs,
      reportedIssue,
      physicalConditionNotes,
      additionalInspectionRemarks,
    } = body;

    if (!clientName || !clientEmail || !jobOrderNo) {
      return NextResponse.json(
        { error: 'Missing required parameters: clientName, clientEmail, jobOrderNo' },
        { status: 400 }
      );
    }

    const result = await sendRepairReceiptEmail({
      clientName,
      clientEmail,
      jobOrderNo,
      confirmationDate: confirmationDate || new Date().toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
      deviceType: deviceType || 'Laptop',
      deviceModel: deviceModel || 'Unknown Device',
      serialNumber: serialNumber || 'UNTAGGED-S/N',
      osSpecs: osSpecs || 'N/A',
      reportedIssue: reportedIssue || 'General Diagnostics',
      physicalConditionNotes: physicalConditionNotes || 'None noted',
      additionalInspectionRemarks: additionalInspectionRemarks || 'None',
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to dispatch receipt email via Brevo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: `Receipt successfully dispatched to ${clientEmail} via Brevo.`,
    });
  } catch (err: any) {
    console.error('Error in send-receipt API:', err);
    return errorResponse(err, 'api/repairs/send-receipt');
  }
}
