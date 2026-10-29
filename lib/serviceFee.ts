// ── Automated service fee on repair invoices (shared by the browser and the server) ──
// The fee is stored as one invoice line marked kind: 'SERVICE_FEE'. It is added by the server when an
// invoice is first created, with the amount the admin set at that time; technicians can't edit or remove it.

export const SERVICE_FEE_KIND = 'SERVICE_FEE';
export const SERVICE_FEE_LABEL = 'Service Fee';
export const SERVICE_FEE_MAX = 100_000;

export interface InvoiceLine {
  kind?: string;
  workScope?: string;
  itemName?: string;
  quantity?: number;
  unitCost?: number;
  totalCost?: number;
}

export const isServiceFee = (it: InvoiceLine | null | undefined) => it?.kind === SERVICE_FEE_KIND;

const lineAmount = (it: InvoiceLine) =>
  Number(it.totalCost ?? Number(it.quantity || 1) * Number(it.unitCost || 0)) || 0;

/** The invoice line for a fee amount (null when there is no fee). */
export function serviceFeeLine(amount: number) {
  if (!(amount > 0)) return null;
  return {
    id: 'service-fee',
    kind: SERVICE_FEE_KIND,
    itemName: SERVICE_FEE_LABEL,
    workScope: 'Standard repair service fee',
    quantity: 1,
    unitCost: amount,
    totalCost: amount,
  };
}

/** Split invoice lines into the service fee and everything else (parts, materials, services). */
export function splitServiceFee<T extends InvoiceLine>(items: T[] | null | undefined) {
  const list = Array.isArray(items) ? items : [];
  const feeLines = list.filter(isServiceFee);
  const others = list.filter((it) => !isServiceFee(it));
  const fee = feeLines.reduce((sum, it) => sum + lineAmount(it), 0);
  const othersTotal = others.reduce((sum, it) => sum + lineAmount(it), 0);
  return { fee, others, othersTotal };
}

/** Of what a client has paid, the part that is service fee: the fee is counted as paid first. */
export const serviceFeePaid = (fee: number, amountPaid: number) => Math.max(0, Math.min(fee, amountPaid));
