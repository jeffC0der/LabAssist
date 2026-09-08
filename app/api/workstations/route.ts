import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MOCK_WORKSTATIONS, type Workstation, type WorkstationStatus } from '@/lib/mockData';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhkpqacieloefhzrciae.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
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
export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ workstations: MOCK_WORKSTATIONS });
  }

  try {
    const { data, error } = await supabase
      .from('workstations')
      .select('*')
      .order('pc_num', { ascending: true });

    if (error || !data || data.length === 0) {
      // Return default mock if DB not yet seeded
      return NextResponse.json({ workstations: MOCK_WORKSTATIONS });
    }

    const grouped: Record<string, Workstation[]> = {};
    for (const row of data) {
      const ws = rowToWorkstation(row);
      if (!grouped[ws.labId]) {
        grouped[ws.labId] = [];
      }
      grouped[ws.labId].push(ws);
    }

    return NextResponse.json({ workstations: grouped });
  } catch (err: any) {
    console.error('Error fetching workstations:', err);
    return NextResponse.json({ workstations: MOCK_WORKSTATIONS });
  }
}

// ── PATCH: Update a workstation status ──
export async function PATCH(request: Request) {
  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const { labCode, pcNum, status, activeIssue, assignedUser } = body;

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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
