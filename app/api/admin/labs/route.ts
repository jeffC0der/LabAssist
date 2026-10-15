import { NextResponse } from 'next/server';
import { requireAuth, getServiceClient } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Admin Lab Room manager: rooms come from public.labs, PC counts from public.workstations
// (one row per PC) and mapped ESP32 boards from public.esp32_nodes.

export interface LabRoom {
  id: string;
  code: string;
  name: string;
  building: string;
  floor: string;
  /** PCs registered for this room (rows in workstations) */
  totalPcs: number;
  /** PCs not currently reported / under repair */
  operationalPcs: number;
  clusterMaster: string | null;
  status: 'OPERATIONAL' | 'MAINTENANCE';
  mappedMacs: string[];
}

const FAULTY = ['ISSUE_REPORTED', 'UNDER_REPAIR'];
const MAC_RE = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/;

function db() {
  const supabase = getServiceClient();
  if (!supabase) throw new Error('Database is not configured');
  return supabase;
}

// Register an ESP32 board for a room. It stays OFFLINE until the device itself reports in.
async function mapMac(code: string, cluster: string, mac: string): Promise<{ error?: string; status?: number }> {
  const suffix = mac.replace(/:/g, '').slice(-4);
  const { error } = await db().from('esp32_nodes').insert({
    node_id: `ESP-${code}-${suffix}`,
    name: `${code} ESP32 (${suffix})`,
    lab_room: code,
    cluster,
    mac_address: mac,
    status: 'OFFLINE',
  });
  if (error) {
    const duplicate = error.code === '23505';
    return { error: duplicate ? `MAC ${mac} is already mapped.` : error.message, status: duplicate ? 409 : 500 };
  }
  return {};
}

// ── GET: every lab room with its real PC counts and ESP32 MACs ──
export async function GET(request: Request) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (auth.response) return auth.response;

  try {
    const supabase = db();
    const [labRes, stationRes, nodeRes] = await Promise.all([
      supabase.from('labs').select('id, code, name, building, floor, cluster_master, status').order('code'),
      supabase.from('workstations').select('lab_code, status'),
      supabase.from('esp32_nodes').select('lab_room, mac_address').order('mac_address'),
    ]);
    if (labRes.error) throw new Error(labRes.error.message);

    const counts: Record<string, { total: number; operational: number }> = {};
    (stationRes.data || []).forEach((s: any) => {
      const c = (counts[s.lab_code] ||= { total: 0, operational: 0 });
      c.total++;
      if (!FAULTY.includes(s.status)) c.operational++;
    });

    const macs: Record<string, string[]> = {};
    (nodeRes.data || []).forEach((n: any) => {
      (macs[n.lab_room] ||= []).push(n.mac_address);
    });

    const rooms: LabRoom[] = (labRes.data || []).map((l: any) => ({
      id: l.id,
      code: l.code,
      name: l.name,
      building: l.building,
      floor: l.floor,
      totalPcs: counts[l.code]?.total || 0,
      operationalPcs: counts[l.code]?.operational || 0,
      clusterMaster: l.cluster_master || null,
      status: l.status,
      mappedMacs: macs[l.code] || [],
    }));

    return NextResponse.json({ rooms });
  } catch (err: any) {
    console.error('[admin/labs] GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to load lab rooms', rooms: [] }, { status: 500 });
  }
}

// ── POST: register a room (creates its PCs) or map an ESP32 MAC to a room ──
export async function POST(request: Request) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (auth.response) return auth.response;

  try {
    const supabase = db();
    const body = await request.json();

    if (body.action === 'create_room') {
      const code = String(body.code || '').trim().toUpperCase();
      const name = String(body.name || '').trim();
      const building = String(body.building || '').trim();
      const floor = String(body.floor || '').trim();
      const pcCount = Math.floor(Number(body.pcCount));
      const mac = String(body.mac || '').trim().toUpperCase();

      if (!code || !name || !building || !floor) {
        return NextResponse.json({ error: 'Room code, name, building and floor are required.' }, { status: 400 });
      }
      if (!Number.isFinite(pcCount) || pcCount < 1 || pcCount > 100) {
        return NextResponse.json({ error: 'PC count must be between 1 and 100.' }, { status: 400 });
      }
      if (mac && !MAC_RE.test(mac)) {
        return NextResponse.json({ error: 'MAC address must look like 24:6F:28:B1:3C:99.' }, { status: 400 });
      }

      const clusterMaster = `ESP-NODE-${code.replace(/^LAB-?/, '')}A`;
      const { error: labErr } = await supabase.from('labs').insert({
        code,
        name,
        building,
        floor,
        capacity: pcCount,
        active_stations: pcCount,
        cluster_master: clusterMaster,
        status: 'OPERATIONAL',
      });
      if (labErr) {
        const duplicate = labErr.code === '23505';
        return NextResponse.json(
          { error: duplicate ? `Room ${code} already exists.` : labErr.message },
          { status: duplicate ? 409 : 500 }
        );
      }

      // One workstation row per PC: these rows are the room's real PC count
      const stations = Array.from({ length: pcCount }, (_, i) => ({
        lab_code: code,
        pc_num: `PC-${String(i + 1).padStart(2, '0')}`,
        status: 'ONLINE',
      }));
      const { error: wsErr } = await supabase.from('workstations').insert(stations);
      if (wsErr) {
        await supabase.from('labs').delete().eq('code', code);
        return NextResponse.json({ error: `Could not create the room's PCs: ${wsErr.message}` }, { status: 500 });
      }

      if (mac) {
        const mapped = await mapMac(code, clusterMaster, mac);
        if (mapped.error) return NextResponse.json({ success: true, warning: mapped.error });
      }
      return NextResponse.json({ success: true });
    }

    if (body.action === 'add_mac') {
      const code = String(body.code || '').trim().toUpperCase();
      const mac = String(body.mac || '').trim().toUpperCase();
      if (!MAC_RE.test(mac)) {
        return NextResponse.json({ error: 'MAC address must look like 24:6F:28:B1:3C:99.' }, { status: 400 });
      }
      const { data: lab } = await supabase.from('labs').select('code, cluster_master').eq('code', code).maybeSingle();
      if (!lab) return NextResponse.json({ error: `Room ${code} not found.` }, { status: 404 });

      const mapped = await mapMac(lab.code, lab.cluster_master || lab.code, mac);
      if (mapped.error) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (err: any) {
    console.error('[admin/labs] POST error:', err);
    return NextResponse.json({ error: err.message || 'Request failed' }, { status: 500 });
  }
}

// ── PATCH: switch a room between OPERATIONAL and MAINTENANCE ──
export async function PATCH(request: Request) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (auth.response) return auth.response;

  try {
    const { code, status } = await request.json();
    if (!['OPERATIONAL', 'MAINTENANCE'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }
    const { data, error } = await db()
      .from('labs')
      .update({ status })
      .eq('code', String(code || '').toUpperCase())
      .select('code');
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[admin/labs] PATCH error:', err);
    return NextResponse.json({ error: err.message || 'Request failed' }, { status: 500 });
  }
}

// ── DELETE: unmap an ESP32 MAC (?mac=...) ──
export async function DELETE(request: Request) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (auth.response) return auth.response;

  try {
    const mac = (new URL(request.url).searchParams.get('mac') || '').trim().toUpperCase();
    if (!mac) return NextResponse.json({ error: 'mac is required.' }, { status: 400 });
    const { error } = await db().from('esp32_nodes').delete().eq('mac_address', mac);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[admin/labs] DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Request failed' }, { status: 500 });
  }
}
