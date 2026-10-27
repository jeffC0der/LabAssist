'use client';
import React, { useEffect, useState } from 'react';
import MaterialsUsedTable from '@/components/repairs/MaterialsUsedTable';
import { fetchRepairInvoice, type ReceiptLineItem } from '@/lib/releaseReceipt';

/** Loads a job's invoice and lists the materials, parts and labor billed on it. */
export default function JobMaterials({ jobOrderNumber, partsNote, refreshKey }: { jobOrderNumber: string; partsNote?: string | null; refreshKey?: unknown }) {
  const [items, setItems] = useState<ReceiptLineItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchRepairInvoice(jobOrderNumber).then((inv) => {
      if (alive) setItems(Array.isArray(inv?.items) ? inv.items.filter((it: ReceiptLineItem) => it && (it.itemName || it.workScope)) : []);
    });
    return () => {
      alive = false;
    };
  }, [jobOrderNumber, refreshKey]);

  if (items === null) return <p className="text-[11px] text-slate-500">Loading materials…</p>;
  return <MaterialsUsedTable items={items} partsNote={partsNote && partsNote !== 'N/A' ? partsNote : null} />;
}
