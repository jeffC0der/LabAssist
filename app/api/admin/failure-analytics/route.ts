import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhkpqacieloefhzrciae.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  const key = serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) return null;
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface FailureIncident {
  ticketId: string;
  labId: string;
  pcNum: string;
  category: string;
  status: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface FailureLab {
  code: string;
  name: string;
}

export interface FailureStation {
  labCode: string;
  status: string;
}

// ── GET: Raw incident, lab and fleet data straight from the database (no placeholder fallback) ──
export async function GET(request: Request) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (auth.response) return auth.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database is not configured', incidents: [], labs: [], stations: [] },
      { status: 503 }
    );
  }

  try {
    const [ticketRes, labRes, stationRes] = await Promise.all([
      supabase
        .from('tickets')
        .select('ticket_id, lab_id, pc_num, category, status, notes, description, created_at, resolved_at')
        .order('created_at', { ascending: false }),
      supabase.from('labs').select('code, name').order('code', { ascending: true }),
      supabase.from('workstations').select('lab_code, status'),
    ]);

    if (ticketRes.error) throw new Error(`tickets: ${ticketRes.error.message}`);

    const incidents: FailureIncident[] = (ticketRes.data || []).map((r: any) => {
      let status = r.status;
      // Mirror the Under Repair override stored in notes/description by the tickets API
      if (
        status !== 'RESOLVED' &&
        (r.notes === 'STATUS_OVERRIDE:UNDER_REPAIR' ||
          r.notes === 'UNDER_REPAIR' ||
          r.description?.includes('<!--LABASSIST_STATUS:UNDER_REPAIR-->'))
      ) {
        status = 'UNDER_REPAIR';
      }
      return {
        ticketId: r.ticket_id,
        labId: r.lab_id,
        pcNum: r.pc_num,
        category: r.category,
        status,
        createdAt: r.created_at,
        resolvedAt: r.resolved_at || undefined,
      };
    });

    if (labRes.error) console.warn('Supabase labs fetch error:', labRes.error.message);
    if (stationRes.error) console.warn('Supabase workstations fetch error:', stationRes.error.message);

    const labs: FailureLab[] = (labRes.data || []).map((l: any) => ({ code: l.code, name: l.name }));
    const stations: FailureStation[] = (stationRes.data || []).map((s: any) => ({
      labCode: s.lab_code,
      status: s.status,
    }));

    return NextResponse.json({
      incidents,
      labs,
      stations,
      meta: { fetchedAt: new Date().toISOString() },
    });
  } catch (err: any) {
    console.error('Failure analytics fetch error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to load failure analytics', incidents: [], labs: [], stations: [] },
      { status: 500 }
    );
  }
}
