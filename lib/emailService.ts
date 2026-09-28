import { BrevoClient } from '@getbrevo/brevo';
import { decrypt } from '@/lib/aes';
import { generateRepairReceiptEmailHtml } from '@/lib/emailTemplates';

export interface RepairReceiptData {
  clientName: string;
  clientEmail: string;
  jobOrderNo: string;
  confirmationDate: string;
  deviceType: string;
  deviceModel: string;
  serialNumber: string;
  osSpecs?: string;
  reportedIssue: string;
  physicalConditionNotes?: string;
  additionalInspectionRemarks?: string;
}

export async function sendRepairReceiptEmail(receipt: RepairReceiptData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const encKey = process.env.BREVO_API_KEY_ENC;
    if (!encKey) {
      console.warn('[sendRepairReceiptEmail] BREVO_API_KEY_ENC is not configured');
      return { success: false, error: 'BREVO_API_KEY_ENC is not configured' };
    }

    let apiKey: string;
    try {
      apiKey = decrypt(encKey);
    } catch (err: any) {
      console.error('[sendRepairReceiptEmail] Failed to decrypt Brevo API key:', err?.message);
      return { success: false, error: 'Failed to decrypt Brevo API key' };
    }

    const brevo = new BrevoClient({
      apiKey: apiKey.trim(),
    });

    const sender = {
      name: 'UMakLabAssist',
      email: 'umak.labassist@gmail.com',
    };

    const subject = `Device Repair Intake Receipt [${receipt.jobOrderNo}] - UMakLabAssist`;

    const htmlContent = generateRepairReceiptEmailHtml({
      name: receipt.clientName,
      jobOrderNo: receipt.jobOrderNo,
      confirmationDate: receipt.confirmationDate,
      deviceType: receipt.deviceType,
      model: receipt.deviceModel,
      serialNumber: receipt.serialNumber,
      specs: receipt.osSpecs || 'N/A',
      reportedIssue: receipt.reportedIssue,
      physicalConditionNotes: receipt.physicalConditionNotes || 'None noted',
      additionalInspectionRemarks: receipt.additionalInspectionRemarks || 'None',
    });

    const textContent = `UMakLabAssist - Device Repair Intake Receipt

Name: ${receipt.clientName}
Job Order No: ${receipt.jobOrderNo}
Confirmation Date: ${receipt.confirmationDate}

Device Details:
Device Type: ${receipt.deviceType}
Model: ${receipt.deviceModel}
Serial Number/Tag: ${receipt.serialNumber}
Specs: ${receipt.osSpecs || 'N/A'}
Reported Issue: ${receipt.reportedIssue}

Physical Condition Notes: ${receipt.physicalConditionNotes || 'None noted'}
Additional Inspection Remarks: ${receipt.additionalInspectionRemarks || 'None'}

Please present your Job Order Number at the IT Diagnostics Desk when following up or picking up your hardware.`;

    const sendResponse = await brevo.transactionalEmails.sendTransacEmail({
      sender,
      to: [{ email: receipt.clientEmail, name: receipt.clientName }],
      subject,
      htmlContent,
      textContent,
    });

    const messageId =
      sendResponse.messageId ||
      (sendResponse.messageIds && sendResponse.messageIds[0]) ||
      undefined;

    console.log(`[sendRepairReceiptEmail] Successfully dispatched receipt email to ${receipt.clientEmail}, messageId: ${messageId}`);

    return { success: true, messageId };
  } catch (err: any) {
    const errorMsg = err?.body?.message || err?.message || 'Failed to dispatch email via Brevo';
    console.error('[sendRepairReceiptEmail] Error sending email via Brevo:', errorMsg);
    return { success: false, error: errorMsg };
  }
}
