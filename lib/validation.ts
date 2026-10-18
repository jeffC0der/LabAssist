import { NextResponse } from 'next/server';

// Shared request validation for API routes.
//
// Database access goes through the Supabase query builder, which sends every value as a bound
// parameter (never concatenated into SQL), so user input cannot change a query. These helpers add
// the second layer: every input is checked for type, length and format before it reaches the
// database, and unexpected errors are logged server-side instead of being echoed to the browser.

export class ValidationError extends Error {
  status = 400;
}

const fail = (message: string): never => {
  throw new ValidationError(message);
};

type StrOptions = { max: number; min?: number; pattern?: RegExp; patternMessage?: string };

/** Required string: trimmed, non-empty, length-limited (and optionally pattern-checked). */
export function reqStr(value: unknown, field: string, opts: StrOptions): string {
  if (typeof value !== 'string' && typeof value !== 'number') fail(`${field} is required.`);
  const s = String(value).trim();
  if (!s) fail(`${field} is required.`);
  if (s.length < (opts.min ?? 1)) fail(`${field} must be at least ${opts.min} characters.`);
  if (s.length > opts.max) fail(`${field} must be ${opts.max} characters or fewer.`);
  if (opts.pattern && !opts.pattern.test(s)) fail(opts.patternMessage || `${field} has an invalid format.`);
  return s;
}

/** Optional string: undefined/null/'' become undefined; otherwise validated like reqStr. */
export function optStr(value: unknown, field: string, opts: StrOptions): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return reqStr(value, field, opts);
}

/** Value must be one of the allowed options. */
export function oneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) fail(`${field} must be one of: ${allowed.join(', ')}.`);
  return value as T;
}

export function optOneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return oneOf(value, field, allowed);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}
export function reqUuid(value: unknown, field: string): string {
  if (!isUuid(value)) fail(`${field} is invalid.`);
  return value as string;
}
export function optUuid(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return reqUuid(value, field);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function reqEmail(value: unknown, field = 'Email'): string {
  return reqStr(value, field, { max: 254, pattern: EMAIL_RE, patternMessage: 'Enter a valid email address.' }).toLowerCase();
}
export function optEmail(value: unknown, field = 'Email'): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return reqEmail(value, field);
}

/** Number within a range (integers only when `integer` is set). */
export function reqNum(value: unknown, field: string, opts: { min: number; max: number; integer?: boolean }): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(n)) fail(`${field} must be a number.`);
  if (opts.integer && !Number.isInteger(n)) fail(`${field} must be a whole number.`);
  if (n < opts.min || n > opts.max) fail(`${field} must be between ${opts.min} and ${opts.max}.`);
  return n;
}
export function optNum(value: unknown, field: string, opts: { min: number; max: number; integer?: boolean }): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return reqNum(value, field, opts);
}

export function optBool(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean') fail(`${field} must be true or false.`);
  return value as boolean;
}

/** ISO date/time string (optional). */
export function optDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.length > 40 || isNaN(new Date(value).getTime())) fail(`${field} must be a valid date.`);
  return value as string;
}

// Common identifiers used across the app
export const PATTERNS = {
  labCode: /^[A-Z0-9][A-Z0-9-]{1,19}$/,          // LAB-101
  pcNum: /^PC-?\d{1,3}$/i,                         // PC-07, PC-7
  ticketId: /^TKT-[A-Z0-9-]{1,20}$/i,              // TKT-2531
  jobOrder: /^[A-Z0-9][A-Z0-9-]{2,39}$/i,          // 01-LP-2026-1016
  sixDigits: /^\d{6}$/,
};

/**
 * Parse a JSON request body. Rejects non-JSON, non-object and oversized bodies.
 * (Use for every POST/PUT/PATCH handler.)
 */
export async function readJson(request: Request, maxBytes = 100_000): Promise<Record<string, any>> {
  const text = await request.text();
  if (text.length > maxBytes) fail('Request is too large.');
  if (!text.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    fail('Invalid JSON request body.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) fail('Request body must be a JSON object.');
  return parsed as Record<string, any>;
}

/**
 * Turn a thrown error into a response: validation problems → 400 with their message;
 * anything else is logged server-side and answered with a generic 500 (no internal details leaked).
 */
export function errorResponse(err: unknown, context: string, extra: Record<string, unknown> = {}) {
  if (err instanceof ValidationError) {
    return NextResponse.json({ success: false, error: err.message, ...extra }, { status: 400 });
  }
  console.error(`[${context}]`, err);
  return NextResponse.json(
    { success: false, error: 'Something went wrong while processing your request. Please try again.', ...extra },
    { status: 500 }
  );
}
