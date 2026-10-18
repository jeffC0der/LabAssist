import { NextResponse } from 'next/server';
import { requireAuth, getServiceClient, STAFF_ROLES } from '@/lib/serverAuth';
import { errorResponse, readJson, reqUuid, reqStr, PATTERNS } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// PC Inventory: staff view and edit each PC's hardware specs and IP address;
// admins can also move a PC to another room (it takes the next free PC number there).

export interface InventoryPc {
  id: string;
  labCode: string;
  pcNum: string;
  status: string;
  ipAddress: string | null;
  specs: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  /** Open ticket on this PC (blocks moving it to another room) */
  openTicketId: string | null;
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const SPECS_MAX = 150;

const pcNumber = (pc: string) => parseInt(String(pc).replace(/\D/g, ''), 10);
const samePc = (a: string, b: string) => {
  const na = pcNumber(a);
  const nb = pcNumber(b);
  return !isNaN(na) && !isNaN(nb) ? na === nb : a.trim().toUpperCase() === b.trim().toUpperCase();
};

function db() {
  const supabase = getServiceClient();
  if (!supabase) throw new Error('Database is not configured');
  return supabase;
}

async function openTickets() {
  const { data } = await db().from('tickets').select('ticket_id, lab_id, pc_num, status').neq('status', 'RESOLVED');
  return data || [];
}

// ── GET: every PC with its details and any open ticket ──
export async function GET(request: Request) {
  const auth = await requireAuth(request, STAFF_ROLES);
  if (auth.response) return auth.response;

  try {
    const supabase = db();
    const [{ data, error }, tickets] = await Promise.all([
      supabase.from('workstations').select('*').order('lab_code').order('pc_num'),
      openTickets(),
    ]);
    if (error) throw new Error(error.message);

    const pcs: InventoryPc[] = (data || []).map((w: any) => ({
      id: w.id,
      labCode: w.lab_code,
      pcNum: w.pc_num,
      status: w.status,
      ipAddress: w.ip_address || null,
      specs: w.specs || null,
      updatedAt: w.updated_at || null,
      updatedBy: w.updated_by || null,
      openTicketId: tickets.find((t: any) => t.lab_id === w.lab_code && samePc(t.pc_num, w.pc_num))?.ticket_id || null,
    }));
    pcs.sort((a, b) => a.labCode.localeCompare(b.labCode) || pcNumber(a.pcNum) - pcNumber(b.pcNum));

    return NextResponse.json({ pcs });
  } catch (err: any) {
    console.error('[workstations/inventory] GET error:', err);
    return errorResponse(err, 'api/workstations/inventory', { pcs: [] });
  }
}

const ipToInt = (ip: string) => ip.split('.').reduce((acc, octet) => acc * 256 + Number(octet), 0);
const intToIp = (n: number) => [24, 16, 8, 0].map((shift) => Math.floor(n / 2 ** shift) % 256).join('.');

// ── POST: bulk edit one room — { labCode, specs?, ipStart?, ipEnd? } ──
// specs: applied to every PC in the room. ipStart/ipEnd: consecutive addresses assigned in PC-number order.
export async function POST(request: Request) {
  const auth = await requireAuth(request, STAFF_ROLES);
  if (auth.response) return auth.response;

  try {
    const supabase = db();
    const body = await readJson(request);
    const labCode = reqStr(String(body.labCode || '').toUpperCase(), 'Room', { max: 20, pattern: PATTERNS.labCode });

    const { data: roomPcs, error: roomErr } = await supabase.from('workstations').select('id, pc_num').eq('lab_code', labCode);
    if (roomErr) throw new Error(roomErr.message);
    const pcs = (roomPcs || []).sort((a: any, b: any) => pcNumber(a.pc_num) - pcNumber(b.pc_num));
    if (pcs.length === 0) return NextResponse.json({ error: `Room ${labCode} has no PCs.` }, { status: 400 });

    const wantsSpecs = body.specs !== undefined && String(body.specs).trim() !== '';
    const wantsIps = !!(body.ipStart || body.ipEnd);
    if (!wantsSpecs && !wantsIps) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

    let specs: string | null = null;
    if (wantsSpecs) {
      specs = String(body.specs).trim();
      if (specs.length > SPECS_MAX) {
        return NextResponse.json({ error: `Hardware specs must be ${SPECS_MAX} characters or fewer.` }, { status: 400 });
      }
    }

    // Validate the whole IP plan before changing anything
    let ipPlan: Array<{ id: string; ip: string }> = [];
    if (wantsIps) {
      const start = String(body.ipStart || '').trim();
      const end = String(body.ipEnd || '').trim();
      if (!IPV4.test(start) || !IPV4.test(end)) {
        return NextResponse.json({ error: 'Enter a valid starting and ending IP address, for example 10.12.101.11 to 10.12.101.34.' }, { status: 400 });
      }
      const from = ipToInt(start);
      const to = ipToInt(end);
      if (to < from) return NextResponse.json({ error: 'The ending IP address must come after the starting one.' }, { status: 400 });
      const available = to - from + 1;
      if (available < pcs.length) {
        return NextResponse.json(
          { error: `That range has ${available} address${available === 1 ? '' : 'es'}, but ${labCode} has ${pcs.length} PCs.` },
          { status: 400 }
        );
      }
      ipPlan = pcs.map((pc: any, i: number) => ({ id: pc.id, ip: intToIp(from + i) }));

      const reserved = ipPlan.find((p) => p.ip.endsWith('.0') || p.ip.endsWith('.255'));
      if (reserved) {
        return NextResponse.json({ error: `The range would assign ${reserved.ip}, a network/broadcast address. Choose a range that avoids .0 and .255.` }, { status: 400 });
      }

      // Addresses already used by PCs in other rooms (this room's own addresses are being reassigned)
      const { data: clashes } = await supabase
        .from('workstations')
        .select('lab_code, pc_num, ip_address')
        .in('ip_address', ipPlan.map((p) => p.ip))
        .neq('lab_code', labCode);
      if (clashes && clashes.length > 0) {
        const c = clashes[0];
        return NextResponse.json(
          { error: `IP address ${c.ip_address} is already used by ${c.lab_code} ${c.pc_num}${clashes.length > 1 ? ` (and ${clashes.length - 1} more)` : ''}.` },
          { status: 409 }
        );
      }
    }

    const audit = { updated_at: new Date().toISOString(), updated_by: auth.user.name };
    const run = async (withAudit: boolean) => {
      const extra = withAudit ? audit : {};
      if (wantsIps) {
        const results = await Promise.all(
          ipPlan.map((p) =>
            supabase
              .from('workstations')
              .update({ ip_address: p.ip, ...(specs !== null ? { specs } : {}), ...extra })
              .eq('id', p.id)
          )
        );
        return results.find((r) => r.error)?.error || null;
      }
      const { error } = await supabase.from('workstations').update({ specs, ...extra }).eq('lab_code', labCode);
      return error;
    };

    let error = await run(true);
    if (error && /updated_(at|by)/.test(error.message)) {
      // supabase_workstation_inventory.sql not run yet: save without the audit columns
      error = await run(false);
    }
    if (error) throw new Error(error.message);

    return NextResponse.json({
      success: true,
      updated: pcs.length,
      firstIp: ipPlan[0]?.ip || null,
      lastIp: ipPlan[ipPlan.length - 1]?.ip || null,
    });
  } catch (err: any) {
    console.error('[workstations/inventory] POST error:', err);
    return errorResponse(err, 'api/workstations/inventory');
  }
}

// ── PATCH: { id, specs?, ipAddress?, labCode? } — labCode (move to another room) is admin-only ──
export async function PATCH(request: Request) {
  const auth = await requireAuth(request, STAFF_ROLES);
  if (auth.response) return auth.response;

  try {
    const supabase = db();
    const body = await readJson(request);
    const id = reqUuid(body.id, 'PC');

    const { data: pc } = await supabase.from('workstations').select('*').eq('id', id).maybeSingle();
    if (!pc) return NextResponse.json({ error: 'PC not found.' }, { status: 404 });

    const updates: Record<string, any> = {};

    if (body.specs !== undefined) {
      const specs = String(body.specs).trim();
      if (!specs) return NextResponse.json({ error: 'Hardware specs cannot be empty.' }, { status: 400 });
      if (specs.length > SPECS_MAX) {
        return NextResponse.json({ error: `Hardware specs must be ${SPECS_MAX} characters or fewer.` }, { status: 400 });
      }
      updates.specs = specs;
    }

    if (body.ipAddress !== undefined) {
      const ip = String(body.ipAddress).trim();
      if (!IPV4.test(ip)) {
        return NextResponse.json({ error: 'Enter a valid IP address, for example 10.12.101.11.' }, { status: 400 });
      }
      const { data: clash } = await supabase
        .from('workstations')
        .select('lab_code, pc_num')
        .eq('ip_address', ip)
        .neq('id', id)
        .maybeSingle();
      if (clash) {
        return NextResponse.json(
          { error: `IP address ${ip} is already used by ${clash.lab_code} ${clash.pc_num}.` },
          { status: 409 }
        );
      }
      updates.ip_address = ip;
    }

    let movedTo: { labCode: string; pcNum: string } | null = null;
    if (body.labCode !== undefined && String(body.labCode).toUpperCase() !== pc.lab_code) {
      if (auth.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Only an administrator can move a PC to another room.' }, { status: 403 });
      }
      const target = String(body.labCode).trim().toUpperCase();
      const { data: lab } = await supabase.from('labs').select('code').eq('code', target).maybeSingle();
      if (!lab) return NextResponse.json({ error: `Room ${target} does not exist.` }, { status: 400 });

      const open = (await openTickets()).find((t: any) => t.lab_id === pc.lab_code && samePc(t.pc_num, pc.pc_num));
      if (open) {
        return NextResponse.json(
          { error: `${pc.lab_code} ${pc.pc_num} has an open ticket (${open.ticket_id}). Resolve it before moving the PC.` },
          { status: 409 }
        );
      }

      // Next free PC number in the destination room
      const { data: roomPcs } = await supabase.from('workstations').select('pc_num').eq('lab_code', target);
      const highest = Math.max(0, ...(roomPcs || []).map((r: any) => pcNumber(r.pc_num)).filter((n: number) => !isNaN(n)));
      const newPcNum = `PC-${String(highest + 1).padStart(2, '0')}`;
      updates.lab_code = target;
      updates.pc_num = newPcNum;
      movedTo = { labCode: target, pcNum: newPcNum };
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    const stamped = { ...updates, updated_at: new Date().toISOString(), updated_by: auth.user.name };
    let { error } = await supabase.from('workstations').update(stamped).eq('id', id);
    if (error && /updated_(at|by)/.test(error.message)) {
      // supabase_workstation_inventory.sql not run yet: save the change without the audit columns
      ({ error } = await supabase.from('workstations').update(updates).eq('id', id));
    }
    if (error) {
      const duplicate = error.code === '23505';
      return NextResponse.json(
        { error: duplicate ? 'That PC number is already taken in the destination room. Try again.' : error.message },
        { status: duplicate ? 409 : 500 }
      );
    }

    return NextResponse.json({ success: true, movedTo });
  } catch (err: any) {
    console.error('[workstations/inventory] PATCH error:', err);
    return errorResponse(err, 'api/workstations/inventory');
  }
}
