'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, Minus, Plus, Trash2, X, RotateCcw, Wand2 } from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';
import { useToast } from '@/context/ToastContext';
import {
  type LabLayout,
  type FrontPosition,
  MAX_PER_ROW,
  MAX_ROWS,
  FRONT_LABEL_MAX,
  arrangeRoom,
  seatCount,
  suggestLayout,
} from '@/lib/labLayout';

interface LabLayoutEditorProps {
  labCode: string;
  stations: Array<{ id: string }>;
  /** Saved layout, or null when the room still uses the default grid */
  current: LabLayout | null;
  onClose: () => void;
  onSaved: (labCode: string, layout: LabLayout | null) => void;
}

type Side = 'left' | 'right';

export default function LabLayoutEditor({ labCode, stations, current, onClose, onSaved }: LabLayoutEditorProps) {
  const toast = useToast();
  const [layout, setLayout] = useState<LabLayout>(() => current || suggestLayout(stations.length));
  const [quickPerRow, setQuickPerRow] = useState(4);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const seats = seatCount(layout);
  const preview = useMemo(() => arrangeRoom(stations, layout), [stations, layout]);
  const sideList: Side[] = layout.sides === 2 ? ['left', 'right'] : ['left'];

  const setRows = (side: Side, rows: number[]) => setLayout((l) => ({ ...l, [side]: rows }));
  const changeRow = (side: Side, i: number, delta: number) =>
    setRows(side, layout[side].map((n, j) => (j === i ? Math.min(MAX_PER_ROW, Math.max(1, n + delta)) : n)));
  const removeRow = (side: Side, i: number) => setRows(side, layout[side].filter((_, j) => j !== i));
  const addRow = (side: Side) => {
    const rows = layout[side];
    if (rows.length >= MAX_ROWS) return;
    setRows(side, [...rows, rows[rows.length - 1] || 4]);
  };

  // Turn the automatic extra rows into real rows of the layout, so they can be adjusted with − / +
  const addRowsForExtras = () => {
    const extras = preview.rows.filter((r) => r.extra);
    setLayout((l) => ({
      ...l,
      left: [...l.left, ...extras.map((r) => r.left.length)].filter((n) => n > 0).slice(0, MAX_ROWS),
      right: l.sides === 2 ? [...l.right, ...extras.map((r) => r.right.length)].filter((n) => n > 0).slice(0, MAX_ROWS) : l.right,
    }));
  };

  const save = async (next: LabLayout | null) => {
    if (next && seatCount(next) === 0) {
      toast.error('Add a row', 'The layout needs at least one row of PCs.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/labs/layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labCode, layout: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save the layout.');
      onSaved(labCode, data.layout ?? null);
      toast.success(next ? 'Layout saved' : 'Layout reset', next ? `${labCode} now shows your room layout.` : `${labCode} is back to the default grid.`);
      onClose();
    } catch (err: any) {
      toast.error('Could not save the layout', err.message);
    } finally {
      setSaving(false);
    }
  };

  const frontBar = (
    <div className="w-full text-center py-1 rounded-md bg-slate-700/40 border border-slate-600/50 text-[10px] font-semibold tracking-wider uppercase text-slate-300 truncate px-2">
      {layout.frontLabel || 'FRONT'}
    </div>
  );

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="layout-editor-title"
      >
        {/* Header and footer stay put; only the middle scrolls (nearly full screen on phones) */}
        <div
          className="w-full max-w-4xl max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] flex flex-col overflow-hidden bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-4 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <LayoutGrid size={16} />
              </div>
              <div className="min-w-0">
                <h3 id="layout-editor-title" className="text-sm font-bold text-slate-100 truncate">
                  Room layout: {labCode}
                </h3>
                <p className="text-[11px] text-slate-400">Set how many PCs sit on each table row. PCs are numbered left to right across the room.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="p-2 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 flex-shrink-0"
              aria-label="Close layout editor"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-5">
            {/* Room settings */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <span className="block text-[11px] font-semibold text-slate-400 mb-1.5">Sides</span>
                <div className="flex rounded-xl border border-slate-700 overflow-hidden">
                  {([1, 2] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setLayout((l) => ({ ...l, sides: n, right: n === 2 && l.right.length === 0 ? [...l.left] : l.right }))}
                      className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
                        layout.sides === n ? 'bg-indigo-600 text-white' : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {n === 1 ? 'One' : 'Two (aisle)'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="layout-front" className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Front of room
                </label>
                <div className="relative">
                  <select
                    id="layout-front"
                    value={layout.front}
                    onChange={(e) => setLayout((l) => ({ ...l, front: e.target.value as FrontPosition }))}
                    className="w-full appearance-none px-3 py-1.5 pr-8 rounded-xl text-xs font-semibold bg-slate-800/90 text-slate-200 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="TOP">Top (row 1 nearest the front)</option>
                    <option value="BOTTOM">Bottom (row 1 nearest the front)</option>
                    <option value="NONE">Don&apos;t show</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">▼</span>
                </div>
              </div>
              <div>
                <label htmlFor="layout-front-label" className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Front label
                </label>
                <input
                  id="layout-front-label"
                  type="text"
                  value={layout.frontLabel}
                  maxLength={FRONT_LABEL_MAX}
                  disabled={layout.front === 'NONE'}
                  onChange={(e) => setLayout((l) => ({ ...l, frontLabel: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-800/90 text-slate-200 border border-slate-700 focus:border-indigo-500 focus:outline-none disabled:opacity-40"
                />
              </div>
            </div>

            {/* Quick fill */}
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <Wand2 size={14} className="text-indigo-400" />
              <span className="text-xs text-slate-300">Quick fill:</span>
              <input
                type="number"
                min={1}
                max={MAX_PER_ROW}
                value={quickPerRow}
                onChange={(e) => setQuickPerRow(Math.min(MAX_PER_ROW, Math.max(1, Number(e.target.value) || 1)))}
                className="w-14 px-2 py-1 rounded-lg text-xs text-center bg-slate-900 text-slate-200 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                aria-label="PCs per row for quick fill"
              />
              <span className="text-xs text-slate-400">PCs per row, every side, until all {stations.length} PCs are seated</span>
              <button
                type="button"
                onClick={() =>
                  setLayout((l) => ({ ...suggestLayout(stations.length, quickPerRow, l.sides), front: l.front, frontLabel: l.frontLabel }))
                }
                className="ml-auto px-3 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Apply
              </button>
            </div>

            {/* Rows per side */}
            <div className={`grid gap-4 ${layout.sides === 2 ? 'sm:grid-cols-2' : ''}`}>
              {sideList.map((side) => (
                <div key={side} className="rounded-xl border border-slate-700/60 bg-slate-800/30 p-3">
                  <p className="text-xs font-bold text-slate-200 mb-2">
                    {layout.sides === 2 ? (side === 'left' ? 'Left side' : 'Right side') : 'Table rows'}
                  </p>
                  <div className="space-y-1.5">
                    {layout[side].map((count, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-12 text-[11px] text-slate-400">Row {i + 1}</span>
                        <button
                          type="button"
                          onClick={() => changeRow(side, i, -1)}
                          disabled={count <= 1}
                          className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-30 flex items-center justify-center"
                          aria-label={`Fewer PCs in ${side} row ${i + 1}`}
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-6 text-center font-mono text-sm font-bold text-slate-100">{count}</span>
                        <button
                          type="button"
                          onClick={() => changeRow(side, i, 1)}
                          disabled={count >= MAX_PER_ROW}
                          className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-30 flex items-center justify-center"
                          aria-label={`More PCs in ${side} row ${i + 1}`}
                        >
                          <Plus size={12} />
                        </button>
                        <span className="text-[11px] text-slate-500">PC{count === 1 ? '' : 's'}</span>
                        <button
                          type="button"
                          onClick={() => removeRow(side, i)}
                          className="ml-auto p-2.5 sm:p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                          aria-label={`Remove ${side} row ${i + 1}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addRow(side)}
                    disabled={layout[side].length >= MAX_ROWS}
                    className="mt-2 w-full py-2.5 sm:py-1.5 rounded-lg border border-dashed border-slate-600 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-500 disabled:opacity-30"
                  >
                    + Add row
                  </button>
                </div>
              ))}
            </div>

            {/* Seat count */}
            <div
              className={`px-3 py-2 rounded-xl text-xs border ${
                seats === stations.length
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : seats < stations.length
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300'
              }`}
            >
              Seats: <strong className="font-mono">{seats}</strong> for <strong className="font-mono">{stations.length}</strong> PCs
              {seats === stations.length && ' ✓ every PC has a seat'}
              {seats < stations.length && (
                <>
                  {` · ${stations.length - seats} PC${stations.length - seats === 1 ? '' : 's'} will go into new rows automatically (shown in amber).`}
                  <button
                    type="button"
                    onClick={addRowsForExtras}
                    className="ml-2 px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold"
                  >
                    Add them as rows
                  </button>
                </>
              )}
              {seats > stations.length && ` · ${seats - stations.length} empty seat${seats - stations.length === 1 ? '' : 's'}`}
            </div>

            {/* Live preview */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 mb-2">Preview</p>
              {/* Seats shrink to fit a phone screen; very wide rooms scroll sideways */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50 p-2 sm:p-4">
                <div className="mx-auto space-y-1.5 sm:space-y-2">
                  {layout.front === 'TOP' && frontBar}
                  {(layout.front === 'BOTTOM' ? [...preview.rows].reverse() : preview.rows).map((row, i) => (
                    <div key={i} className={`grid gap-2 sm:gap-6 ${layout.sides === 2 ? 'grid-cols-[1fr_auto_1fr]' : 'grid-cols-1'}`}>
                      <div className="flex justify-center gap-1 sm:gap-1.5">
                        {row.left.map((s) => <PreviewSeat key={s.id} id={s.id} warn={row.extra} />)}
                        {Array.from({ length: row.emptyLeft }, (_, k) => <PreviewSeat key={`el${k}`} />)}
                      </div>
                      {layout.sides === 2 && (
                        <>
                          <div className="w-3 sm:w-6 border-x border-dashed border-slate-700/60" aria-hidden="true" />
                          <div className="flex justify-center gap-1 sm:gap-1.5">
                            {row.right.map((s) => <PreviewSeat key={s.id} id={s.id} warn={row.extra} />)}
                            {Array.from({ length: row.emptyRight }, (_, k) => <PreviewSeat key={`er${k}`} />)}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {layout.front === 'BOTTOM' && frontBar}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 flex flex-wrap items-center gap-2 px-4 sm:px-5 py-3 bg-slate-900 border-t border-slate-800">
            {current && (
              <button
                type="button"
                onClick={() => save(null)}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                title="Remove this room's layout and show the default grid"
              >
                <RotateCcw size={13} />
                Reset to default grid
              </button>
            )}
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => save(layout)}
                disabled={saving || seats === 0}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save layout'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function PreviewSeat({ id, warn = false }: { id?: string; warn?: boolean }) {
  if (!id) {
    // A seat with no PC yet (the layout has more seats than the room has PCs)
    return (
      <span className="flex-1 min-w-[1.5rem] max-w-[2.75rem] py-1 rounded-md text-center text-[10px] border border-dashed border-slate-700 text-slate-600" title="Empty seat">
        –
      </span>
    );
  }
  return (
    <span
      className={`flex-1 min-w-[1.5rem] max-w-[2.75rem] py-1 rounded-md text-center font-mono text-[10px] font-semibold border ${
        warn ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : 'bg-slate-800 border-slate-600 text-slate-200'
      }`}
    >
      {id.replace(/^PC-?/i, '')}
    </span>
  );
}
