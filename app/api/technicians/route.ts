import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

const FALLBACK_TECHNICIANS: AvailableTechnician[] = [
  {
    id: 'tech-001',
    name: 'Tech. Rivera',
    email: 'rivera.it@campus.edu',
    department: 'Hardware Maintenance Div.',
    role: 'TECHNICIAN',
    activeTickets: 0,
    status: 'AVAILABLE',
    specialization: 'Power, UPS & Motherboard Diagnostics',
  },
  {
    id: 'tech-002',
    name: 'Tech. Santos',
    email: 'santos.it@campus.edu',
    department: 'Hardware Maintenance Div.',
    role: 'TECHNICIAN',
    activeTickets: 0,
    status: 'AVAILABLE',
    specialization: 'Peripherals, I/O & Audio Hardware',
  },
  {
    id: 'tech-003',
    name: 'Tech. Cruz',
    email: 'cruz.it@campus.edu',
    department: 'Visual & Lab Systems',
    role: 'TECHNICIAN',
    activeTickets: 0,
    status: 'AVAILABLE',
    specialization: 'Display, GPU & Projector Matrix',
  },
  {
    id: 'tech-004',
    name: 'Tech. Lim',
    email: 'lim.it@campus.edu',
    department: 'Network & Systems Infrastructure',
    role: 'TECHNICIAN',
    activeTickets: 0,
    status: 'AVAILABLE',
    specialization: 'Network Interface, DHCP & OS Recovery',
  },
  {
    id: 'tech-005',
    name: 'Tech. Garcia',
    email: 'garcia.it@campus.edu',
    department: 'Hardware Maintenance Div.',
    role: 'TECHNICIAN',
    activeTickets: 0,
    status: 'AVAILABLE',
    specialization: 'Fleet Hardware & ESP32 Cluster Hubs',
  },
];

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ technicians: FALLBACK_TECHNICIANS });
  }

  try {
    // 1. Fetch allowlisted technicians
    const { data: allowlistData } = await supabase
      .from('whitelisted_technicians')
      .select('*')
      .order('created_at', { ascending: false });

    // 2. Fetch profiles with role = 'TECHNICIAN'
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'TECHNICIAN');

    // 3. Fetch active dispatched tickets to count load per technician
    const { data: activeTickets } = await supabase
      .from('tickets')
      .select('assignee, status')
      .eq('status', 'DISPATCHED');

    const ticketCountMap: Record<string, number> = {};
    (activeTickets || []).forEach((t) => {
      if (t.assignee) {
        const key = t.assignee.toLowerCase().trim();
        ticketCountMap[key] = (ticketCountMap[key] || 0) + 1;
      }
    });

    const techMap = new Map<string, AvailableTechnician>();

    // Add allowlisted technicians
    (allowlistData || []).forEach((w: any) => {
      const email = (w.email || '').toLowerCase().trim();
      if (!email) return;
      const cleanName = email.split('@')[0].replace(/[._-]/g, ' ');
      const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      const displayName = `Tech. ${formattedName}`;
      const activeCount = ticketCountMap[displayName.toLowerCase()] || ticketCountMap[email] || 0;

      techMap.set(email, {
        id: w.id || `tech-${email}`,
        name: displayName,
        email: w.email,
        department: w.department || 'Hardware Maintenance Div.',
        role: 'TECHNICIAN',
        activeTickets: activeCount,
        status: activeCount >= 3 ? 'BUSY' : 'AVAILABLE',
        specialization: 'Campus Lab Hardware & Bench Diagnostics',
      });
    });

    // Merge technician profiles
    (profileData || []).forEach((p: any) => {
      const email = (p.email || '').toLowerCase().trim();
      const rawName = p.full_name || p.name || email.split('@')[0] || 'Technician';
      const displayName = rawName.startsWith('Tech.') ? rawName : `Tech. ${rawName}`;
      const activeCount = ticketCountMap[displayName.toLowerCase()] || ticketCountMap[email] || 0;

      techMap.set(email || p.id, {
        id: p.id,
        name: displayName,
        email: p.email || `${rawName.toLowerCase().replace(/\s+/g, '.')}@campus.edu`,
        department: p.department || 'Hardware Maintenance Div.',
        role: 'TECHNICIAN',
        activeTickets: activeCount,
        status: activeCount >= 3 ? 'BUSY' : 'AVAILABLE',
        specialization: p.department || 'Hardware Field Operations',
      });
    });

    // If no DB technicians found, merge with fallback default technicians
    FALLBACK_TECHNICIANS.forEach((ft) => {
      const activeCount = ticketCountMap[ft.name.toLowerCase()] || 0;
      if (!techMap.has(ft.email.toLowerCase())) {
        techMap.set(ft.email.toLowerCase(), {
          ...ft,
          activeTickets: activeCount,
          status: activeCount >= 3 ? 'BUSY' : 'AVAILABLE',
        });
      }
    });

    const technicians = Array.from(techMap.values());
    return NextResponse.json({ technicians });
  } catch (err: any) {
    console.error('Error fetching technicians:', err);
    return NextResponse.json({ technicians: FALLBACK_TECHNICIANS });
  }
}
