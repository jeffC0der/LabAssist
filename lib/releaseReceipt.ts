import type { DeviceRepair } from '@/context/RepairContext';

// ── Device release receipt: one builder shared by the technician and student views ──

export interface ReceiptLineItem {
  workScope?: string;
  itemName?: string;
  quantity?: number;
  unitCost?: number;
}

export interface ReleaseReceiptData {
  jobOrderId: string;
  invoiceId: string;
  clientName: string;
  clientEmail: string;
  clientDepartment: string;
  deviceType: string;
  deviceModel: string;
  serialNumber: string;
  reportedIssue: string;
  partsReplaced: string | null;
  deviceReleasedTo: string;
  completedAt: string;
  settlementDate: string;
  technicianName: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  amountPaid: number;
  onlinePaymentReference?: string | null;
  /** Parts and labor billed on the invoice; empty for jobs completed before invoices were required */
  items: ReceiptLineItem[];
  /** Technician's service report (everything entered during evaluation and repair) */
  assessment: string | null;
  findings: string | null;
  feasibility: string | null;
  partsAvailability: string | null;
  appointment: string | null;
  pickupLocation: string | null;
}

const FEASIBILITY_LABEL: Record<string, string> = {
  FEASIBLE: 'Feasible for repair',
  NOT_FEASIBLE: 'Not feasible',
  BER_BEYOND_ECONOMIC_REPAIR: 'Beyond economic repair',
  PENDING: 'Pending further inspection',
};
const PARTS_LABEL: Record<string, string> = {
  IN_STOCK: 'In lab inventory',
  TO_ORDER: 'Ordered / sourced',
  CLIENT_PROVIDED: 'Provided by client',
  NOT_AVAILABLE: 'Not available',
};
const text = (v?: string | null) => {
  const t = String(v || '').trim();
  return t && t !== 'N/A' ? t : null;
};

/** The saved invoice of a job (staff: any job; students: their own), or null. */
export async function fetchRepairInvoice(jobOrderNumber: string): Promise<any | null> {
  try {
    const res = await fetch(`/api/repairs/invoices?jobOrderNumber=${encodeURIComponent(jobOrderNumber)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.invoice || null;
  } catch {
    return null;
  }
}

/** A technician name, ignoring the old built-in placeholder some early invoices were saved with. */
const realName = (name?: string | null) => (name && name !== 'Unassigned' ? name : null);

export const lineTotal =(it: ReceiptLineItem) => Number(it.quantity || 0) * Number(it.unitCost || 0);

export function buildReleaseReceipt(job: DeviceRepair, invoice: any | null, fallbackTechnician = 'LabAssist Technician'): ReleaseReceiptData {
  const items: ReceiptLineItem[] = Array.isArray(invoice?.items)
    ? invoice.items.filter((it: ReceiptLineItem) => it && (it.itemName || it.workScope))
    : [];
  const itemsTotal = items.reduce((sum, it) => sum + lineTotal(it), 0);
  const totalAmount = Number(invoice?.totalAmount ?? job.billing?.totalAmount ?? itemsTotal) || itemsTotal;
  const completedAt = job.completion?.completedAt || job.completedAt || new Date().toISOString();

  return {
    jobOrderId: job.id,
    invoiceId: invoice?.invoiceNumber || 'No invoice on file',
    clientName: job.clientName,
    clientEmail: job.clientEmail,
    clientDepartment: job.clientDepartment || 'UMak CCIS',
    deviceType: job.deviceType,
    deviceModel: job.deviceModel,
    serialNumber: job.serialNumber,
    reportedIssue: job.reportedIssue,
    partsReplaced: job.partsReplaced && job.partsReplaced !== 'N/A' ? job.partsReplaced : null,
    deviceReleasedTo: job.completion?.deviceReleasedTo || job.deviceReleasedTo || job.clientName,
    completedAt,
    settlementDate: invoice?.settlementDate || job.billing?.settlementDate || completedAt,
    technicianName: realName(job.technicianAssigned) || realName(invoice?.assignedTechnician) || fallbackTechnician,
    paymentStatus: invoice?.paymentStatus || job.billing?.paymentStatus || 'PAID',
    paymentMethod: invoice?.paymentMethod || job.billing?.paymentMethod || 'CASH',
    totalAmount,
    amountPaid: Number(invoice?.amountPaid ?? job.billing?.amountPaid ?? totalAmount) || 0,
    onlinePaymentReference: invoice?.onlinePaymentReference || job.billing?.onlinePaymentReference || null,
    items,
    assessment: text(job.evaluation?.technicianEvaluation),
    findings: text(job.technicianNotes),
    feasibility: job.evaluation?.repairFeasibility ? FEASIBILITY_LABEL[job.evaluation.repairFeasibility] || null : null,
    partsAvailability: job.evaluation?.partsAvailability ? PARTS_LABEL[job.evaluation.partsAvailability] || null : null,
    appointment: job.evaluation?.confirmedDate
      ? `${job.evaluation.confirmedDate}${job.evaluation.confirmedTime ? ` ${job.evaluation.confirmedTime}` : ''}${job.evaluation.confirmedLocation ? ` · ${job.evaluation.confirmedLocation}` : ''}`
      : null,
    pickupLocation: text(job.pickupLocation) || text(job.evaluation?.confirmedLocation),
  };
}
