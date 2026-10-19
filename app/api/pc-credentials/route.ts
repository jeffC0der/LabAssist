import { NextResponse } from 'next/server';
import { requireAuth, getServiceClient, getClientIp, STAFF_ROLES } from '@/lib/serverAuth';
import { encryptCredential, isCredentialsKeyConfigured, credentialsKeyProblem } from '@/lib/credentialCrypto';
import { errorResponse, readJson, optUuid, reqStr, PATTERNS } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// PC admin credentials (local Windows admin account per room, optional per-PC override).
// GET lists which PCs have credentials — never the username or password themselves.
// PUT (admin) sets or clears them. Revealing goes through /api/pc-credentials/reveal.

export interface CredentialPc {
  workstationId: string;
  pcNum: string;
  /** ROOM = uses the room's credentials, CUSTOM = has its own, NONE = nothing set */
  source: 'ROOM' | 'CUSTOM' | 'NONE';
  revealCount: number;
}

export interface CredentialRoom {
  labCode: string;
  hasRoomDefault: boolean;
  roomRevealCount: number;
  roomUpdatedAt: string | null;
  roomUpdatedBy: string | null;
  pcs: CredentialPc[];
}

const pcNumber = (pc: string) => parseInt(String(pc).replace(/\D/g, ''), 10);
const NO_STORE = { 'Cache-Control': 'no-store' };

function db() {
  const supabase = getServiceClient();
  if (!supabase) throw new Error('Database is not configured');
  return supabase;
}

// ── GET: credential coverage per room (staff) ──
export async function GET(request: Request) {
  const auth = await requireAuth(request, STAFF_ROLES);
  if (auth.response) return auth.response;

  try {
    const supabase = db();
    const [{ data: stations, error: wsErr }, { data: creds, error: credErr }] = await Promise.all([
      supabase.from('workstations').select('id, lab_code, pc_num'),
      supabase.from('pc_credentials').select('lab_code, workstation_id, reveal_count, updated_at, updated_by'),
    ]);
    if (wsErr) throw new Error(wsErr.message);
    if (credErr) throw new Error(credErr.message);

    const roomDefaults = new Map<string, any>();
    const overrides = new Map<string, any>();
    (creds || []).forEach((c: any) => (c.workstation_id ? overrides.set(c.workstation_id, c) : roomDefaults.set(c.lab_code, c)));

    const byRoom: Record<string, CredentialPc[]> = {};
    (stations || []).forEach((w: any) => {
      const override = overrides.get(w.id);
      const room = roomDefaults.get(w.lab_code);
      (byRoom[w.lab_code] ||= []).push({
        workstationId: w.id,
        pcNum: w.pc_num,
        source: override ? 'CUSTOM' : room ? 'ROOM' : 'NONE',
        revealCount: override ? override.reveal_count : room ? room.reveal_count : 0,
      });
    });

    const rooms: CredentialRoom[] = Object.keys(byRoom)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((labCode) => {
        const room = roomDefaults.get(labCode);
        return {
          labCode,
          hasRoomDefault: !!room,
          roomRevealCount: room?.reveal_count || 0,
          roomUpdatedAt: room?.updated_at || null,
          roomUpdatedBy: room?.updated_by || null,
          pcs: byRoom[labCode].sort((a, b) => pcNumber(a.pcNum) - pcNumber(b.pcNum)),
        };
      });

    return NextResponse.json({ rooms, keyConfigured: isCredentialsKeyConfigured() }, { headers: NO_STORE });
  } catch (err: any) {
    console.error('[pc-credentials] GET error:', err.message);
    return errorResponse(err, 'api/pc-credentials', { rooms: [] });
  }
}

// ── PUT (admin): set a room's credentials, set one PC's own, or clear a PC's own ──
// { labCode, username, password }            → room credentials
// { workstationId, username, password }      → this PC's own credentials
// { workstationId, clear: true }             → PC goes back to the room's credentials
export async function PUT(request: Request) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (auth.response) return auth.response;

  try {
    if (!isCredentialsKeyConfigured()) {
      return NextResponse.json({ error: credentialsKeyProblem() }, { status: 500 });
    }
    const supabase = db();
    const body = await readJson(request);
    const workstationId: string | null = optUuid(body.workstationId, 'PC') || null;
    if (!workstationId && body.labCode !== undefined) {
      reqStr(String(body.labCode).toUpperCase(), 'Room', { max: 20, pattern: PATTERNS.labCode });
    }

    // Resolve the target
    let labCode = String(body.labCode || '').trim().toUpperCase();
    let pcNum: string | null = null;
    if (workstationId) {
      const { data: ws } = await supabase.from('workstations').select('lab_code, pc_num').eq('id', workstationId).maybeSingle();
      if (!ws) return NextResponse.json({ error: 'PC not found.' }, { status: 404 });
      labCode = ws.lab_code;
      pcNum = ws.pc_num;
    } else if (!labCode) {
      return NextResponse.json({ error: 'labCode or workstationId is required.' }, { status: 400 });
    }

    const audit = {
      user_id: auth.user.id,
      user_name: auth.user.name,
      user_role: auth.user.role,
      scope: workstationId ? 'PC' : 'ROOM',
      lab_code: labCode,
      pc_num: pcNum,
      pcs_count: 0,
      success: true,
      ip_address: getClientIp(request),
    };

    if (body.clear) {
      if (!workstationId) return NextResponse.json({ error: 'Only a PC’s own credentials can be cleared.' }, { status: 400 });
      await supabase.from('pc_credentials').delete().eq('workstation_id', workstationId);
      await supabase.from('credential_access_log').insert({ ...audit, action: 'CLEAR', reason: 'PC now uses the room credentials' });
      return NextResponse.json({ success: true });
    }

    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    if (!username || username.length > 64) {
      return NextResponse.json({ error: 'Enter the admin username (up to 64 characters).' }, { status: 400 });
    }
    if (!password || password.length > 128) {
      return NextResponse.json({ error: 'Enter the admin password (up to 128 characters).' }, { status: 400 });
    }

    const row = {
      lab_code: labCode,
      workstation_id: workstationId,
      username,
      password_enc: encryptCredential(password),
      reveal_count: 0, // a new password has not been revealed yet
      updated_by: auth.user.name,
      updated_at: new Date().toISOString(),
    };

    const existingQuery = supabase.from('pc_credentials').select('id');
    const { data: existing } = workstationId
      ? await existingQuery.eq('workstation_id', workstationId).maybeSingle()
      : await existingQuery.eq('lab_code', labCode).is('workstation_id', null).maybeSingle();

    const { error } = existing
      ? await supabase.from('pc_credentials').update(row).eq('id', existing.id)
      : await supabase.from('pc_credentials').insert(row);
    if (error) throw new Error(error.message);

    await supabase.from('credential_access_log').insert({
      ...audit,
      action: 'SET',
      reason: workstationId ? `Set ${labCode} ${pcNum}'s own credentials` : `Set ${labCode} room credentials`,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[pc-credentials] PUT error:', err.message);
    return errorResponse(err, 'api/pc-credentials');
  }
}
