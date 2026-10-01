/**
 * Centralized in-memory & database serialization store for repair workflow metadata.
 * Ensures consistent persistence of evaluation, billing, completion, and cancellation
 * across all Next.js API routes and Supabase Realtime refreshes.
 */

const WORKFLOW_META_PREFIX = '<!--LABASSIST_WORKFLOW:';
const WORKFLOW_META_SUFFIX = '-->';

export interface WorkflowMetadata {
  status?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';
  technicianAssigned?: string;
  technicianId?: string;
  technicianNotes?: string;
  partsReplaced?: string;
  readyAt?: string;
  pickupLocation?: string;
  deviceReleasedTo?: string;
  completedAt?: string;
  evaluation?: {
    technicianEvaluation?: string;
    repairFeasibility?: 'FEASIBLE' | 'NOT_FEASIBLE' | 'BER_BEYOND_ECONOMIC_REPAIR' | 'PENDING';
    partsAvailability?: 'IN_STOCK' | 'TO_ORDER' | 'CLIENT_PROVIDED' | 'NOT_AVAILABLE';
    confirmedDate?: string;
    confirmedTime?: string;
    confirmedLocation?: string;
    evaluatorId?: string;
    evaluatedAt?: string;
  };
  completion?: {
    deviceReleasedTo?: string;
    completedAt?: string;
  };
  cancellation?: {
    reason?: string;
    description?: string;
    cancelledAt?: string;
    cancelledBy?: string;
  };
  billing?: {
    paymentTiming?: 'PAY_NOW' | 'PAY_AFTER_REPAIR';
    paymentStatus?: 'UNPAID' | 'PAID' | 'REFUNDED';
    paymentMethod?: 'CASH' | 'ONLINE';
    totalAmount?: number;
    amountPaid?: number;
    onlinePaymentReference?: string;
    settlementDate?: string | null;
    billingNotes?: string;
  };
}

// Global cross-module stores that survive Next.js Fast Refresh & HMR
const globalAny = globalThis as any;

if (!globalAny.__LABASSIST_REPAIR_STORE__) {
  globalAny.__LABASSIST_REPAIR_STORE__ = {};
}

if (!globalAny.__LABASSIST_INVOICE_STORE__) {
  globalAny.__LABASSIST_INVOICE_STORE__ = {};
}

export function stripWorkflowMetadata(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/<!--LABASSIST_WORKFLOW:[\s\S]*?-->/g, '').trim();
}

export function extractWorkflowMetadata(rawNotes: string | null | undefined): {
  cleanNotes: string;
  meta: WorkflowMetadata;
} {
  if (!rawNotes) return { cleanNotes: '', meta: {} };
  const clean = stripWorkflowMetadata(rawNotes);
  const startIdx = rawNotes.indexOf(WORKFLOW_META_PREFIX);
  if (startIdx === -1) {
    return { cleanNotes: clean, meta: {} };
  }
  const endIdx = rawNotes.indexOf(WORKFLOW_META_SUFFIX, startIdx + WORKFLOW_META_PREFIX.length);
  if (endIdx === -1) {
    return { cleanNotes: clean, meta: {} };
  }

  const jsonStr = rawNotes.substring(startIdx + WORKFLOW_META_PREFIX.length, endIdx);
  try {
    const meta = JSON.parse(jsonStr);
    return { cleanNotes: clean, meta };
  } catch (_) {
    return { cleanNotes: clean, meta: {} };
  }
}

export function packWorkflowMetadata(
  cleanNotes: string | null | undefined,
  meta: WorkflowMetadata
): string {
  const base = (cleanNotes || '').trim();
  const metaStr = `${WORKFLOW_META_PREFIX}${JSON.stringify(meta)}${WORKFLOW_META_SUFFIX}`;
  return base ? `${base}\n${metaStr}` : metaStr;
}

export function getAllExtendedRepairs(): Record<string, WorkflowMetadata> {
  return globalAny.__LABASSIST_REPAIR_STORE__ || {};
}

export function getExtendedRepair(rma: string): WorkflowMetadata {
  return globalAny.__LABASSIST_REPAIR_STORE__[rma] || {};
}

export function setExtendedRepair(rma: string, data: WorkflowMetadata): void {
  const prev = globalAny.__LABASSIST_REPAIR_STORE__[rma] || {};
  globalAny.__LABASSIST_REPAIR_STORE__[rma] = {
    ...prev,
    ...data,
    evaluation: {
      ...(prev.evaluation || {}),
      ...(data.evaluation || {}),
    },
    completion: {
      ...(prev.completion || {}),
      ...(data.completion || {}),
    },
    cancellation: {
      ...(prev.cancellation || {}),
      ...(data.cancellation || {}),
    },
    billing: {
      ...(prev.billing || {}),
      ...(data.billing || {}),
    },
  };
}

export function getInMemoryInvoice(jobOrderNum: string): any {
  return globalAny.__LABASSIST_INVOICE_STORE__[jobOrderNum] || null;
}

export function setInMemoryInvoice(jobOrderNum: string, invoice: any): void {
  globalAny.__LABASSIST_INVOICE_STORE__[jobOrderNum] = invoice;
  // Also synchronize to extended repair billing
  if (invoice) {
    setExtendedRepair(jobOrderNum, {
      billing: {
        paymentTiming: invoice.paymentTiming,
        paymentStatus: invoice.paymentStatus,
        paymentMethod: invoice.paymentMethod,
        totalAmount: Number(invoice.totalAmount || 0),
        amountPaid: Number(invoice.amountPaid || 0),
        onlinePaymentReference: invoice.onlinePaymentReference,
        settlementDate: invoice.settlementDate,
        billingNotes: invoice.billingNotes,
      },
    });
  }
}
