import { NextResponse } from 'next/server';
import { sendRepairReceiptEmail } from '@/lib/emailService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
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
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
