import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { type Workstation, type WorkstationStatus } from '@/lib/mockData';
import { requireAuth, STAFF_ROLES } from '@/lib/serverAuth';
import { errorResponse, readJson, reqStr, optStr, optOneOf, PATTERNS } from '@/lib/validation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhkpqacieloefhzrciae.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  const key = serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) return null;
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function rowToWorkstation(row: any): Workstation {
  return {
    id: row.pc_num,
    labId: row.lab_code,
    status: row.status as WorkstationStatus,
    user: row.assigned_user || undefined,
    ip: row.ip_address || '10.12.0.1',
    specs: row.specs || 'Intel Core i7 · 32GB RAM',
    lastPing: 'Just now',
    activeIssue: row.active_issue || undefined,
  };
}

// ── GET: Fetch all workstations grouped by lab ──
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from('workstations')
      .select('*')
      .order('pc_num', { ascending: true });

    if (error) {
      console.error('Workstations query error:', error.message);
      return NextResponse.json({ error: 'Could not load workstations.' }, { status: 500 });
    }

    const grouped: Record<string, Workstation[]> = {};
    for (const row of data || []) {
      const ws = rowToWorkstation(row);
      if (!grouped[ws.labId]) {
        grouped[ws.labId] = [];
      }
      grouped[ws.labId].push(ws);
    }

    return NextResponse.json({ workstations: grouped });
  } catch (err: any) {
    console.error('Error fetching workstations:', err);
    return NextResponse.json({ error: 'Could not load workstations.' }, { status: 500 });
  }
}

// ── PATCH: Update a workstation status ──
export async function PATCH(request: Request) {
  const auth = await requireAuth(request, STAFF_ROLES);
  if (auth.response) return auth.response;

  const supabase = getSupabaseAdmin();

  try {
    const body = await readJson(request);
    const labCode = reqStr(String(body.labCode || '').toUpperCase(), 'Room', { max: 20, pattern: PATTERNS.labCode });
    const pcNum = reqStr(body.pcNum, 'PC number', { max: 10, pattern: PATTERNS.pcNum });
    const status = optOneOf(body.status, 'Status', ['ONLINE', 'OCCUPIED', 'ISSUE_REPORTED', 'UNDER_REPAIR'] as const);
    const activeIssue = body.activeIssue === null ? null : optStr(body.activeIssue, 'Active issue', { max: 300 });
    const assignedUser = body.assignedUser === null ? null : optStr(body.assignedUser, 'Assigned user', { max: 100 });

    if (!labCode || !pcNum) {
      return NextResponse.json({ error: 'labCode and pcNum are required' }, { status: 400 });
    }

    if (supabase) {
      const updates: any = {};
      if (status !== undefined) updates.status = status;
      if (activeIssue !== undefined) updates.active_issue = activeIssue;
      if (assignedUser !== undefined) updates.assigned_user = assignedUser;

      const { error } = await supabase
        .from('workstations')
        .update(updates)
        .match({ lab_code: labCode, pc_num: pcNum });

      if (error) {
        console.error('Workstation update error:', error);
      }
    }

    return NextResponse.json({ success: true, labCode, pcNum, status });
  } catch (err: any) {
    console.error('Workstation PATCH error:', err);
    return errorResponse(err, 'api/workstations');
  }
}
