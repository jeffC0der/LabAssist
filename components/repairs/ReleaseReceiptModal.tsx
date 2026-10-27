'use client';
import React from 'react';
import { Receipt, Printer, X, CheckCircle2, CheckSquare, Check, AlertCircle } from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';
import MaterialsUsedTable from '@/components/repairs/MaterialsUsedTable';
import { printReceipt } from '@/lib/printReceipt';
import type { ReleaseReceiptData } from '@/lib/releaseReceipt';

const peso = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface ReleaseReceiptModalProps {
  receipt: ReleaseReceiptData;
  onClose: () => void;
}

/**
 * Official Device Release & Completion Receipt — the same document for technicians and students,
 * on screen and when printed / saved as PDF.
 */
export default function ReleaseReceiptModal({ receipt, onClose }: ReleaseReceiptModalProps) {
  const balance = Math.max(0, receipt.totalAmount - receipt.amountPaid);
  const paidInFull = receipt.paymentStatus === 'PAID' || (receipt.totalAmount > 0 && balance === 0);

  const PrintButton = ({ big = false }: { big?: boolean }) => (
    <button
      type="button"
      onClick={(e) => printReceipt(e.currentTarget, `Release Receipt ${receipt.jobOrderId}`)}
      className={`${big ? 'px-4 py-2' : 'px-3 py-1.5'} rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm`}
      title="Print, or choose Save as PDF in the print window"
    >
      <Printer size={13} className="text-emerald-400" />
      <span>Print / Save PDF</span>
    </button>
  );

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
        <div data-print-root className="w-full max-w-3xl my-8 rounded-2xl bg-slate-900 border border-emerald-500/50 shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Receipt size={20} />
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase font-bold text-emerald-400 tracking-wider">
                    University of Makati · CCIS Lab Services
                  </span>
                  <h2 className="text-lg font-black text-slate-100">Official Device Release &amp; Completion Receipt</h2>
                </div>
              </div>
              <p className="text-xs text-slate-400">Electronics Diagnostics &amp; IT Hardware Servicing Desk · Handover Verification</p>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-start">
              <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800" aria-label="Close receipt">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* References */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block">Job Order Number</span>
              <span className="text-sm font-extrabold font-mono text-cyan-400 block">{receipt.jobOrderId}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block">Invoice Reference</span>
              <span className="text-sm font-bold font-mono text-emerald-400 block">{receipt.invoiceId}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block">Release Date &amp; Time</span>
              <span className="text-xs font-semibold text-slate-200 block">{new Date(receipt.completedAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Owner & device */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-3 text-xs">
            <span className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider block">Equipment &amp; Custody Information</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Row label="Registered Owner:"><strong className="text-slate-200">{receipt.clientName}</strong></Row>
                <Row label="University Email:"><span className="font-mono text-cyan-300 break-all">{receipt.clientEmail}</span></Row>
                <Row label="Department / College:"><span className="text-slate-300">{receipt.clientDepartment}</span></Row>
                <Row label="Device Released To:">
                  <strong className="text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{receipt.deviceReleasedTo}</strong>
                </Row>
              </div>
              <div className="space-y-2">
                <Row label="Device Model:"><strong className="text-slate-200">{receipt.deviceModel}</strong></Row>
                <Row label="Device Type:"><span className="text-slate-300">{receipt.deviceType}</span></Row>
                <Row label="Serial Number:"><span className="font-mono text-cyan-300">{receipt.serialNumber}</span></Row>
                <Row label="Authorized Technician:"><strong className="text-slate-200">{receipt.technicianName}</strong></Row>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800 space-y-1">
              <span className="text-slate-400 font-semibold block">Issue Addressed:</span>
              <p className="text-slate-300 text-[11px] leading-relaxed bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 [overflow-wrap:anywhere]">
                {receipt.reportedIssue}
              </p>
            </div>
          </div>

          {/* Technician's service report: what was assessed, found and done */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-3 text-xs">
            <span className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider block">Technician Service Report</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <Box label="Repair Feasibility:">{receipt.feasibility || '—'}</Box>
              <Box label="Parts Availability:">{receipt.partsAvailability || '—'}</Box>
              <Box label="Service Appointment:">{receipt.appointment || '—'}</Box>
              <Box label="Pickup Location:">{receipt.pickupLocation || '—'}</Box>
            </div>
            <ReportField label="Diagnostic Evaluation & Assessment" value={receipt.assessment} />
            <ReportField label="Inspection Findings & Repair Work Done" value={receipt.findings} />
            <ReportField label="Component Parts Sourced / Replaced" value={receipt.partsReplaced} />
          </div>

          {/* Materials / parts / labor */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90">
            {/* The parts note is already in the service report above; it only stands in when nothing was itemized */}
            <MaterialsUsedTable items={receipt.items} partsNote={receipt.items.length ? null : receipt.partsReplaced} />
          </div>

          {/* Payment */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider">Payment Settlement Summary</span>
              {paidInFull ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 size={11} /> PAID IN FULL
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <AlertCircle size={11} /> BALANCE {peso(balance)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[11px]">
              <Box label="Payment Method:">{receipt.paymentMethod}</Box>
              <Box label="Reference / Trace:">{receipt.onlinePaymentReference || 'Cash Settlement'}</Box>
              <Box label="Settlement Date:">{new Date(receipt.settlementDate).toLocaleDateString()}</Box>
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 space-y-1">
                <span className="text-emerald-400 block font-sans text-[10px] font-bold">Total Amount Paid:</span>
                <strong className="text-emerald-300 block text-sm font-black">{peso(receipt.amountPaid)}</strong>
              </div>
            </div>
          </div>

          {/* Sign-off */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckSquare size={15} className="text-emerald-400 flex-shrink-0" />
              <span>Device handover verified and logged in University of Makati IT Laboratory Repair Registry.</span>
            </div>
            <span className="font-mono text-emerald-400 font-bold uppercase text-[10px] whitespace-nowrap">Officially Completed</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <PrintButton big />
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-400 flex-shrink-0">{label}</span>
      <span className="text-right min-w-0">{children}</span>
    </div>
  );
}

function ReportField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-1">
      <span className="text-slate-400 font-semibold block">{label}:</span>
      <p className="text-slate-200 text-[11px] leading-relaxed bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 whitespace-pre-line [overflow-wrap:anywhere]">
        {value || 'Not recorded'}
      </p>
    </div>
  );
}

function Box({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1 min-w-0">
      <span className="text-slate-500 block font-sans text-[10px]">{label}</span>
      <strong className="text-slate-200 block text-xs truncate">{children}</strong>
    </div>
  );
}
