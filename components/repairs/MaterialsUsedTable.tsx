'use client';
import React from 'react';
import { Wrench } from 'lucide-react';
import { lineTotal, type ReceiptLineItem } from '@/lib/releaseReceipt';

const peso = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface MaterialsUsedTableProps {
  items: ReceiptLineItem[];
  /** Free-text "parts replaced" note from the job, shown when there are no invoice lines */
  partsNote?: string | null;
  title?: string;
}

/** Parts, materials and labor billed for a repair: item, work scope, quantity, unit cost, line total. */
export default function MaterialsUsedTable({ items, partsNote, title = 'Materials & Services Used' }: MaterialsUsedTableProps) {
  const total = items.reduce((sum, it) => sum + lineTotal(it), 0);

  return (
    <div className="space-y-2">
      <span className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
        <Wrench size={12} className="text-cyan-400" />
        {title}
      </span>
      {items.length === 0 ? (
        <p className="text-[11px] text-slate-400 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
          {partsNote
            ? `Parts replaced: ${partsNote}`
            : 'No itemized materials were recorded for this job (completed before itemized invoices were required).'}
        </p>
      ) : (
        <div className="rounded-lg border border-slate-800 overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-2.5 py-2 text-left">Item / Material</th>
                <th className="px-2.5 py-2 text-left">Work Scope</th>
                <th className="px-2.5 py-2 text-right">Qty</th>
                <th className="px-2.5 py-2 text-right">Unit Cost</th>
                <th className="px-2.5 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {items.map((it, i) => (
                <tr key={i}>
                  {/* A line saved with only a description shows it as the item, not a blank dash */}
                  <td className="px-2.5 py-2 text-slate-200 font-semibold">{it.itemName || it.workScope || '—'}</td>
                  <td className="px-2.5 py-2 text-slate-400">{it.itemName ? it.workScope || '—' : 'Service'}</td>
                  <td className="px-2.5 py-2 text-right font-mono text-slate-300">{Number(it.quantity || 0)}</td>
                  <td className="px-2.5 py-2 text-right font-mono text-slate-300">{peso(Number(it.unitCost || 0))}</td>
                  <td className="px-2.5 py-2 text-right font-mono text-slate-100 font-semibold">{peso(lineTotal(it))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-700 bg-slate-900/60">
                <td colSpan={4} className="px-2.5 py-2 text-right text-slate-400 font-semibold">Total</td>
                <td className="px-2.5 py-2 text-right font-mono text-emerald-400 font-bold">{peso(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {items.length > 0 && partsNote && <p className="text-[11px] text-slate-400">Technician note: {partsNote}</p>}
    </div>
  );
}
