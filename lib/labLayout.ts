// ── Room layout for the Live Workstation Grid ──
// A room is drawn as table rows on one or two sides of a middle aisle. Each row has its own PC
// count. PCs are numbered left to right across the room, row by row:
//   row 1: left 1 2 3 4 | right 5 6 7 8
//   row 2: left 9 10 11 12 | right 13 14 15 16

export type FrontPosition = 'TOP' | 'BOTTOM' | 'NONE';

export interface LabLayout {
  sides: 1 | 2;
  front: FrontPosition;
  frontLabel: string;
  /** PCs per table row on the left side (or the only side when sides = 1) */
  left: number[];
  /** PCs per table row on the right side (ignored when sides = 1) */
  right: number[];
}

export const MAX_ROWS = 20;
export const MAX_PER_ROW = 12;
export const FRONT_LABEL_MAX = 40;
export const DEFAULT_FRONT_LABEL = "FRONT · Teacher's Desk / Whiteboard";

export const seatCount = (layout: LabLayout) =>
  layout.left.reduce((a, b) => a + b, 0) + (layout.sides === 2 ? layout.right.reduce((a, b) => a + b, 0) : 0);

const pcNumber = (id: string) => parseInt(String(id).replace(/\D/g, ''), 10);

/** Sort PCs by their number (PC-2 before PC-10). */
export function sortByPcNumber<T extends { id: string }>(stations: T[]): T[] {
  return [...stations].sort((a, b) => {
    const na = pcNumber(a.id);
    const nb = pcNumber(b.id);
    if (isNaN(na) || isNaN(nb)) return a.id.localeCompare(b.id, undefined, { numeric: true });
    return na - nb;
  });
}

export interface ArrangedRoom<T> {
  rows: Array<{
    left: T[];
    right: T[];
    /** Seats on this row without a PC (more seats than PCs), shown as empty desks */
    emptyLeft: number;
    emptyRight: number;
    /** added automatically for PCs beyond the saved rows */
    extra?: boolean;
  }>;
  /** How many PCs were seated in automatically added rows */
  extraCount: number;
}

/**
 * Place PCs into the layout's rows, left to right across the room, row by row.
 * PCs beyond the saved seats (e.g. a PC added to the room later) go into extra rows automatically,
 * each as wide as the room's widest row, so every PC always appears in the room.
 */
export function arrangeRoom<T extends { id: string }>(stations: T[], layout: LabLayout): ArrangedRoom<T> {
  const queue = sortByPcNumber(stations);
  const twoSides = layout.sides === 2;
  const right = twoSides ? layout.right : [];
  const rowTotal = Math.max(layout.left.length, right.length);
  const rows: ArrangedRoom<T>['rows'] = [];
  for (let i = 0; i < rowTotal; i++) {
    const seatsL = layout.left[i] || 0;
    const seatsR = right[i] || 0;
    const l = queue.splice(0, seatsL);
    const r = queue.splice(0, seatsR);
    rows.push({ left: l, right: r, emptyLeft: seatsL - l.length, emptyRight: seatsR - r.length });
  }

  const extraCount = queue.length;
  const perLeft = Math.max(1, ...layout.left);
  const perRight = twoSides ? Math.max(1, ...right) : 0;
  while (queue.length > 0) {
    rows.push({ left: queue.splice(0, perLeft), right: queue.splice(0, perRight), emptyLeft: 0, emptyRight: 0, extra: true });
  }
  return { rows, extraCount };
}

/** A starting layout for a room: two sides, rows of `perRow` PCs per side, until every PC has a seat. */
export function suggestLayout(pcCount: number, perRow = 4, sides: 1 | 2 = 2): LabLayout {
  const left: number[] = [];
  const right: number[] = [];
  let remaining = Math.max(0, pcCount);
  while (remaining > 0 && left.length < MAX_ROWS) {
    const l = Math.min(perRow, remaining);
    left.push(l);
    remaining -= l;
    if (sides === 2 && remaining > 0) {
      const r = Math.min(perRow, remaining);
      right.push(r);
      remaining -= r;
    }
  }
  if (left.length === 0) left.push(perRow);
  return { sides, front: 'TOP', frontLabel: DEFAULT_FRONT_LABEL, left, right: sides === 2 ? right : [] };
}

/** Validate untrusted input (API body). Returns a clean layout or throws an Error with a user-facing message. */
export function parseLayout(input: unknown): LabLayout {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Layout is invalid.');
  const raw = input as Record<string, unknown>;
  const sides = raw.sides === 1 ? 1 : raw.sides === 2 ? 2 : null;
  if (!sides) throw new Error('Choose one or two sides.');
  const front = raw.front === 'TOP' || raw.front === 'BOTTOM' || raw.front === 'NONE' ? raw.front : null;
  if (!front) throw new Error('Choose where the front of the room is.');
  const frontLabel = typeof raw.frontLabel === 'string' ? raw.frontLabel.trim() : '';
  if (frontLabel.length > FRONT_LABEL_MAX) throw new Error(`The front label must be ${FRONT_LABEL_MAX} characters or fewer.`);

  const rows = (value: unknown, name: string): number[] => {
    if (!Array.isArray(value)) throw new Error(`${name} rows are invalid.`);
    if (value.length > MAX_ROWS) throw new Error(`${name} can have at most ${MAX_ROWS} rows.`);
    return value.map((n, i) => {
      if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > MAX_PER_ROW) {
        throw new Error(`${name} row ${i + 1} must have 1–${MAX_PER_ROW} PCs.`);
      }
      return n;
    });
  };
  const left = rows(raw.left, sides === 2 ? 'Left side' : 'The room');
  const right = sides === 2 ? rows(raw.right, 'Right side') : [];
  if (left.length === 0 && right.length === 0) throw new Error('Add at least one row.');

  return { sides, front, frontLabel: frontLabel || DEFAULT_FRONT_LABEL, left, right };
}
