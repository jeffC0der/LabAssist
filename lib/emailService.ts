import { BrevoClient } from '@getbrevo/brevo';
import { decrypt } from '@/lib/aes';
import {
  generateRepairReceiptEmailHtml,
  generateInvoiceEmailHtml,
  generateReadyForPickupEmailHtml,
  generateFinalReceiptEmailHtml,
} from '@/lib/emailTemplates';

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

export interface InvoiceEmailItem {
  workScope: string;
  itemName?: string | null;
  quantity?: number | null;
  unitCost: number;
  totalCost?: number;
}

export interface InvoiceEmailData {
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
  items: InvoiceEmailItem[];
  totalAmount: number;
  amountPaid?: number;
  onlinePaymentReference?: string | null;
  billingNotes?: string | null;
}

/**
 * Dispatches an official Repair Invoice notification email to the customer's registered email via Brevo.
 */
export async function sendInvoiceNotificationEmail(
  invoice: InvoiceEmailData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!invoice.clientEmail || !invoice.clientEmail.includes('@')) {
      console.warn('[sendInvoiceNotificationEmail] Invalid or missing customer email:', invoice.clientEmail);
      return { success: false, error: 'Customer registered email is missing or invalid' };
    }

    const encKey = process.env.BREVO_API_KEY_ENC;
    if (!encKey) {
      console.warn('[sendInvoiceNotificationEmail] BREVO_API_KEY_ENC is not configured');
      return { success: false, error: 'BREVO_API_KEY_ENC is not configured' };
    }

    let apiKey: string;
    try {
      apiKey = decrypt(encKey);
    } catch (err: any) {
      console.error('[sendInvoiceNotificationEmail] Failed to decrypt Brevo API key:', err?.message);
      return { success: false, error: 'Failed to decrypt Brevo API key' };
    }

    const brevo = new BrevoClient({
      apiKey: apiKey.trim(),
    });

    const sender = {
      name: 'UMakLabAssist',
      email: 'umak.labassist@gmail.com',
    };

    const subject = `Official Repair Invoice [${invoice.invoiceId}] - Job Order ${invoice.jobOrderId} - UMakLabAssist`;

    const isPaid =
      invoice.paymentStatus === 'PAID' ||
      invoice.paymentStatus?.toLowerCase() === 'paid' ||
      invoice.paymentStatus === 'Paid in Full';
    const paymentStatusDisplay = isPaid ? 'Paid in Full' : 'Unpaid';

    let paymentMethodDisplay = 'N/A';
    if (invoice.paymentMethod) {
      const pm = invoice.paymentMethod.toUpperCase();
      if (pm === 'CASH') paymentMethodDisplay = 'Cash';
      else if (pm === 'ONLINE' || pm === 'GCASH' || pm === 'MAYA') paymentMethodDisplay = 'Online';
      else paymentMethodDisplay = invoice.paymentMethod;
    }

    const htmlContent = generateInvoiceEmailHtml({
      invoiceId: invoice.invoiceId,
      jobOrderId: invoice.jobOrderId,
      issueDate: invoice.issueDate,
      paymentStatus: paymentStatusDisplay,
      paymentMethod: paymentMethodDisplay,
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail,
      device: invoice.device,
      serialNumber: invoice.serialNumber,
      assignedTechnician: invoice.assignedTechnician,
      items: invoice.items,
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      onlinePaymentReference: invoice.onlinePaymentReference,
      billingNotes: invoice.billingNotes,
    });

    const itemsText = (invoice.items && invoice.items.length > 0 ? invoice.items : [
      {
        workScope: 'Device Diagnostics & Labor Service',
        itemName: undefined,
        quantity: 1,
        unitCost: invoice.totalAmount || 0,
        totalCost: invoice.totalAmount || 0,
      }
    ])
      .map((it, idx) => {
        const itemText = it.itemName && it.itemName.trim() !== '' ? it.itemName.trim() : 'N/A (Labor Only)';
        const qtyText = it.quantity && !isNaN(Number(it.quantity)) ? Number(it.quantity).toString() : 'N/A';
        const costText = `PHP ${Number(it.unitCost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        return `Item ${idx + 1}:
Work Scope: ${it.workScope || 'Diagnostics & Labor Service'}
Item: ${itemText}
Quantity: ${qtyText}
Cost: ${costText}`;
      })
      .join('\n\n');

    const totalText = `PHP ${Number(invoice.totalAmount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const textContent = `UMakLabAssist - Official Repair Service Invoice

Invoice ID: ${invoice.invoiceId}
Linked Job Order: ${invoice.jobOrderId}
Issue Date: ${invoice.issueDate}
Payment Status: ${paymentStatusDisplay}
Payment Method: ${paymentMethodDisplay}

Client Name: ${invoice.clientName}
Device: ${invoice.device}
Serial Number: ${invoice.serialNumber || 'N/A'}
Assigned Technician: ${invoice.assignedTechnician || 'Hardware Support Tech'}

--- BILLING BREAKDOWN ---
${itemsText}

Total Amount: ${totalText}

Please present your Invoice ID (${invoice.invoiceId}) or Job Order (${invoice.jobOrderId}) at the IT Diagnostics Desk upon claim or settlement.`;

    const sendResponse = await brevo.transactionalEmails.sendTransacEmail({
      sender,
      to: [{ email: invoice.clientEmail, name: invoice.clientName }],
      subject,
      htmlContent,
      textContent,
    });

    const messageId =
      sendResponse.messageId ||
      (sendResponse.messageIds && sendResponse.messageIds[0]) ||
      undefined;

    console.log(`[sendInvoiceNotificationEmail] Successfully dispatched invoice email to ${invoice.clientEmail}, messageId: ${messageId}`);

    return { success: true, messageId };
  } catch (err: any) {
    const errorMsg = err?.body?.message || err?.message || 'Failed to dispatch invoice email via Brevo';
    console.error('[sendInvoiceNotificationEmail] Error sending email via Brevo:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

export interface ReadyForPickupEmailData {
  jobOrderId: string;
  device: string;
  clientName: string;
  clientEmail: string;
  pickupLocation: string;
  readyAt?: string;
}

/**
 * Dispatches an official Ready for Pickup notification email to the customer's registered email via Brevo.
 */
export async function sendReadyForPickupEmail(
  data: ReadyForPickupEmailData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!data.clientEmail || !data.clientEmail.includes('@')) {
      console.warn('[sendReadyForPickupEmail] Invalid or missing customer email:', data.clientEmail);
      return { success: false, error: 'Customer registered email is missing or invalid' };
    }

    const encKey = process.env.BREVO_API_KEY_ENC;
    if (!encKey) {
      console.warn('[sendReadyForPickupEmail] BREVO_API_KEY_ENC is not configured');
      return { success: false, error: 'BREVO_API_KEY_ENC is not configured' };
    }

    let apiKey: string;
    try {
      apiKey = decrypt(encKey);
    } catch (err: any) {
      console.error('[sendReadyForPickupEmail] Failed to decrypt Brevo API key:', err?.message);
      return { success: false, error: 'Failed to decrypt Brevo API key' };
    }

    const brevo = new BrevoClient({
      apiKey: apiKey.trim(),
    });

    const sender = {
      name: 'UMakLabAssist',
      email: 'umak.labassist@gmail.com',
    };

    const subject = `Device Ready for Pickup [${data.jobOrderId}] - UMakLabAssist`;

    const htmlContent = generateReadyForPickupEmailHtml({
      jobOrderId: data.jobOrderId,
      device: data.device,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      pickupLocation: data.pickupLocation,
      readyAt: data.readyAt,
    });

    const textContent = `Job Order:
${data.jobOrderId}

Status:
Ready for Pickup

Device:
${data.device}

Pickup Details

Location:
${data.pickupLocation}`;

    const sendResponse = await brevo.transactionalEmails.sendTransacEmail({
      sender,
      to: [{ email: data.clientEmail, name: data.clientName }],
      subject,
      htmlContent,
      textContent,
    });

    const messageId =
      sendResponse.messageId ||
      (sendResponse.messageIds && sendResponse.messageIds[0]) ||
      undefined;

    console.log(`[sendReadyForPickupEmail] Successfully dispatched pickup email to ${data.clientEmail}, messageId: ${messageId}`);

    return { success: true, messageId };
  } catch (err: any) {
    const errorMsg = err?.body?.message || err?.message || 'Failed to dispatch pickup email via Brevo';
    console.error('[sendReadyForPickupEmail] Error sending email via Brevo:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

export interface FinalReceiptEmailData {
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
 * Dispatches an official Final Receipt email to the customer's registered email via Brevo.
 */
export async function sendFinalReceiptEmail(
  data: FinalReceiptEmailData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!data.clientEmail || !data.clientEmail.includes('@')) {
      console.warn('[sendFinalReceiptEmail] Invalid or missing customer email:', data.clientEmail);
      return { success: false, error: 'Customer registered email is missing or invalid' };
    }

    const encKey = process.env.BREVO_API_KEY_ENC;
    if (!encKey) {
      console.warn('[sendFinalReceiptEmail] BREVO_API_KEY_ENC is not configured');
      return { success: false, error: 'BREVO_API_KEY_ENC is not configured' };
    }

    let apiKey: string;
    try {
      apiKey = decrypt(encKey);
    } catch (err: any) {
      console.error('[sendFinalReceiptEmail] Failed to decrypt Brevo API key:', err?.message);
      return { success: false, error: 'Failed to decrypt Brevo API key' };
    }

    const brevo = new BrevoClient({
      apiKey: apiKey.trim(),
    });

    const sender = {
      name: 'UMakLabAssist',
      email: 'umak.labassist@gmail.com',
    };

    const subject = `Device Repair Final Receipt [${data.jobOrderId}] - UMakLabAssist`;

    const htmlContent = generateFinalReceiptEmailHtml({
      invoiceId: data.invoiceId,
      jobOrderId: data.jobOrderId,
      settlementDate: data.settlementDate,
      paymentStatus: 'PAID IN FULL',
      paymentMethod: data.paymentMethod,
      onlineReference: data.onlineReference,
      totalPaid: data.totalPaid,
      deviceReleasedTo: data.deviceReleasedTo,
      clientEmail: data.clientEmail,
      clientName: data.clientName,
      deviceModel: data.deviceModel,
    });

    const isOnline = data.paymentMethod.toLowerCase() === 'online' || !!data.onlineReference;
    const methodDisplay = isOnline ? 'Online' : 'Cash';
    const formattedTotal = Number(data.totalPaid || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const textContent = `Invoice ID: ${data.invoiceId}
Linked Job Order: ${data.jobOrderId}

Settlement Date: ${data.settlementDate}

Payment Status: PAID IN FULL
Payment Method: ${methodDisplay}
${isOnline && data.onlineReference ? `\nOnline Reference:\n${data.onlineReference}\n` : ''}
Total Paid: ₱${formattedTotal}

Device Released To:
${data.deviceReleasedTo}

Thank you for using UMakLabAssist!`;

    const sendResponse = await brevo.transactionalEmails.sendTransacEmail({
      sender,
      to: [{ email: data.clientEmail, name: data.clientName || 'Valued Customer' }],
      subject,
      htmlContent,
      textContent,
    });

    const messageId =
      sendResponse.messageId ||
      (sendResponse.messageIds && sendResponse.messageIds[0]) ||
      undefined;

    console.log(`[sendFinalReceiptEmail] Successfully dispatched final receipt email to ${data.clientEmail}, messageId: ${messageId}`);

    return { success: true, messageId };
  } catch (err: any) {
    const errorMsg = err?.body?.message || err?.message || 'Failed to dispatch final receipt email via Brevo';
    console.error('[sendFinalReceiptEmail] Error sending email via Brevo:', errorMsg);
    return { success: false, error: errorMsg };
  }
}
