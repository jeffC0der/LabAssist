import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, STAFF_ROLES } from '@/lib/serverAuth';
import { errorResponse } from '@/lib/validation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhkpqacieloefhzrciae.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  const key = serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) return null;
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface AvailableTechnician {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  activeTickets: number;
  status: 'AVAILABLE' | 'BUSY';
  specialization?: string;
}

// ── GET: Registered technician accounts only (active TECHNICIAN profiles), with their current job load ──
export async function GET(request: Request) {
  const auth = await requireAuth(request, STAFF_ROLES);
  if (auth.response) return auth.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database is not configured', technicians: [] }, { status: 503 });
  }

  try {
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('id, email, name, department')
      .eq('role', 'TECHNICIAN')
      .eq('status', 'ACTIVE')
      .order('name', { ascending: true });

    if (profileErr) throw new Error(profileErr.message);

    // Open jobs (dispatched or under repair) count toward each technician's load
    const { data: activeTickets } = await supabase
      .from('tickets')
      .select('assignee')
      .in('status', ['DISPATCHED', 'UNDER_REPAIR']);

    const ticketCountMap: Record<string, number> = {};
    (activeTickets || []).forEach((t) => {
      if (t.assignee) {
        const key = t.assignee.toLowerCase().trim();
        ticketCountMap[key] = (ticketCountMap[key] || 0) + 1;
      }
    });

    const technicians: AvailableTechnician[] = (profileData || []).map((p: any) => {
      const email = (p.email || '').toLowerCase().trim();
      const rawName = p.name || email.split('@')[0] || 'Technician';
      const displayName = rawName.startsWith('Tech.') ? rawName : `Tech. ${rawName}`;
      const activeCount = ticketCountMap[displayName.toLowerCase()] || ticketCountMap[email] || 0;

      return {
        id: p.id,
        name: displayName,
        email: p.email,
        department: p.department || 'Hardware Maintenance Div.',
        role: 'TECHNICIAN',
        activeTickets: activeCount,
        status: activeCount >= 3 ? 'BUSY' : 'AVAILABLE',
      };
    });

    return NextResponse.json({ technicians });
  } catch (err: any) {
    console.error('Error fetching technicians:', err);
    return errorResponse(err, 'api/technicians', { technicians: [] });
  }
}
