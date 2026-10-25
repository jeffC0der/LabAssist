// ── CSV export (opens in Excel / Google Sheets) ──

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

/** One CSV cell: quoted when needed; text a spreadsheet would run as a formula is neutralised. */
function cell(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return '';
  let text = String(raw);
  // Names, notes etc. come from users: "=HYPERLINK(...)" must not become a live formula in Excel
  if (typeof raw === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((c) => cell(c.header)).join(',')];
  for (const row of rows) lines.push(columns.map((c) => cell(c.value(row))).join(','));
  return lines.join('\r\n');
}

/** Save a CSV file in the browser. The byte-order mark lets Excel read ₱ and accented names correctly. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** e.g. "revenue-ledger-2026-10-25.csv" (local date) */
export function datedFilename(base: string) {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${base}-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.csv`;
}
