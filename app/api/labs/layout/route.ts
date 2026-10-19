import { NextResponse } from 'next/server';
import { requireAuth, getServiceClient, STAFF_ROLES } from '@/lib/serverAuth';
import { errorResponse, readJson, reqStr, PATTERNS, ValidationError } from '@/lib/validation';
import { parseLayout, type LabLayout } from '@/lib/labLayout';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MISSING_COLUMN = /layout/i;
const SQL_HINT = 'Room layouts are not set up yet. Run supabase_lab_layout.sql in the Supabase SQL editor.';

// ── GET: saved layout of every room — { layouts: { [labCode]: LabLayout } } ──
// Everyone signed in sees the grid (students too), so any signed-in user can read layouts.
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  try {
    const supabase = getServiceClient();
    if (!supabase) throw new Error('Database is not configured');
    const { data, error } = await supabase.from('labs').select('code, layout');
    if (error) {
      // Column not added yet: every room falls back to the default grid
      if (MISSING_COLUMN.test(error.message)) return NextResponse.json({ layouts: {}, setupRequired: true });
      throw new Error(error.message);
    }
    const layouts: Record<string, LabLayout> = {};
    (data || []).forEach((row: any) => {
      if (!row.layout) return;
      try {
        layouts[row.code] = parseLayout(row.layout);
      } catch {
        // ignore a malformed stored layout; that room shows the default grid
      }
    });
    return NextResponse.json({ layouts }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return errorResponse(err, 'api/labs/layout', { layouts: {} });
  }
}

// ── PUT: save a room's layout — { labCode, layout } (layout: null resets to the default grid) ──
export async function PUT(request: Request) {
  const auth = await requireAuth(request, STAFF_ROLES);
  if (auth.response) return auth.response;

  try {
    const supabase = getServiceClient();
    if (!supabase) throw new Error('Database is not configured');
    const body = await readJson(request, 20_000);
    const labCode = reqStr(String(body.labCode || '').toUpperCase(), 'Room', { max: 20, pattern: PATTERNS.labCode });
    let layout: LabLayout | null = null;
    if (body.layout !== null) {
      try {
        layout = parseLayout(body.layout);
      } catch (e: any) {
        throw new ValidationError(e.message);
      }
    }

    const { data: lab } = await supabase.from('labs').select('code').eq('code', labCode).maybeSingle();
    if (!lab) return NextResponse.json({ error: `Room ${labCode} does not exist.` }, { status: 404 });

    const { error } = await supabase.from('labs').update({ layout }).eq('code', labCode);
    if (error) {
      if (MISSING_COLUMN.test(error.message)) return NextResponse.json({ error: SQL_HINT }, { status: 500 });
      throw new Error(error.message);
    }
    return NextResponse.json({ success: true, labCode, layout });
  } catch (err) {
    return errorResponse(err, 'api/labs/layout');
  }
}
