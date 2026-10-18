import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, getServiceClient, getClientIp, STAFF_ROLES } from '@/lib/serverAuth';
import { decryptCredential, isCredentialsKeyConfigured } from '@/lib/credentialCrypto';
import { checkLockout, recordFailedAttempt } from '@/lib/lockoutStore';
import { notifyAdmins } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhkpqacieloefhzrciae.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const MAX_REVEALS_PER_HOUR = 10;
const SHOW_SECONDS = { PC: 60, ROOM: 120, ALL: 180 } as const;
const NO_STORE = { 'Cache-Control': 'no-store' };
const pcNumber = (pc: string) => parseInt(String(pc).replace(/\D/g, ''), 10);

export interface RevealedCredential {
  labCode: string;
  pcNum: string;
  username: string | null;
  password: string | null;
  source: 'ROOM' | 'CUSTOM' | 'NONE';
}

/**
 * POST /api/pc-credentials/reveal
 * Body: { password, reason, scope: 'PC' | 'ROOM' | 'ALL', workstationId?, labCode? }
 *
 * Staff re-enter their own password for every reveal; each attempt (successful or not) is
 * written to credential_access_log and admins are notified of every reveal.
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request, STAFF_ROLES);
  if (auth.response) return auth.response;

  const supabase = getServiceClient();
  if (!supabase || !anonKey) return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  if (!isCredentialsKeyConfigured()) {
    return NextResponse.json({ error: 'CREDENTIALS_KEY is not configured on the server.' }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const scope: 'PC' | 'ROOM' | 'ALL' = ['PC', 'ROOM', 'ALL'].includes(body.scope) ? body.scope : 'PC';
  const reason = String(body.reason || '').trim();
  const password = String(body.password || '');
  const me = auth.user;

  // Resolve which PCs are being revealed
  let query = supabase.from('workstations').select('id, lab_code, pc_num');
  let labCode: string | null = null;
  let pcNum: string | null = null;
  if (scope === 'PC') {
    if (body.workstationId) {
      query = query.eq('id', body.workstationId);
    } else if (body.labCode && body.pcNum) {
      // From a ticket: room + PC number (tickets may say PC-1 or PC-01)
      query = query.eq('lab_code', String(body.labCode).trim().toUpperCase());
    } else {
      return NextResponse.json({ error: 'workstationId, or labCode and pcNum, is required.' }, { status: 400 });
    }
  } else if (scope === 'ROOM') {
    labCode = String(body.labCode || '').trim().toUpperCase();
    if (!labCode) return NextResponse.json({ error: 'labCode is required.' }, { status: 400 });
    query = query.eq('lab_code', labCode);
  }
  let { data: stations } = await query;
  if (scope === 'PC' && !body.workstationId && stations) {
    const wanted = pcNumber(String(body.pcNum));
    stations = stations.filter((s: any) => pcNumber(s.pc_num) === wanted).slice(0, 1);
  }
  if (!stations || stations.length === 0) return NextResponse.json({ error: 'No PCs found.' }, { status: 404 });
  if (scope === 'PC') {
    labCode = stations[0].lab_code;
    pcNum = stations[0].pc_num;
  }

  const log = (success: boolean, extra: Record<string, any> = {}) =>
    supabase.from('credential_access_log').insert({
      user_id: me.id,
      user_name: me.name,
      user_role: me.role,
      action: 'REVEAL',
      scope,
      lab_code: labCode,
      pc_num: pcNum,
      pcs_count: success ? stations.length : 0,
      reason: reason || null,
      success,
      ip_address: getClientIp(request),
      ...extra,
    });

  if (reason.length < 3 || reason.length > 200) {
    return NextResponse.json({ error: 'Enter a reason (3–200 characters) for viewing the credentials.' }, { status: 400 });
  }
  if (!password) return NextResponse.json({ error: 'Enter your password to continue.' }, { status: 400 });

  // 1. Locked accounts can't reveal
  const lock = await checkLockout(me.email);
  if (lock.isLocked) {
    await log(false, { failure_reason: 'account locked' });
    return NextResponse.json({ error: 'Your account is temporarily locked. Try again later.' }, { status: 423 });
  }

  // 2. Re-check the user's own password (a throwaway session, signed out right away)
  const checker = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: check, error: checkErr } = await checker.auth.signInWithPassword({ email: me.email, password });
  if (checkErr || !check.session) {
    const failure = await recordFailedAttempt(me.email);
    await log(false, { failure_reason: 'wrong password' });
    return NextResponse.json(
      {
        error: failure.isLocked
          ? 'Too many wrong passwords. Your account is temporarily locked.'
          : `Incorrect password. ${failure.attemptsLeft} attempt${failure.attemptsLeft === 1 ? '' : 's'} left.`,
      },
      { status: failure.isLocked ? 423 : 401 }
    );
  }
  await checker.auth.signOut({ scope: 'local' });

  // 3. Rate limit: successful reveals in the last hour
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recent } = await supabase
    .from('credential_access_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', me.id)
    .eq('action', 'REVEAL')
    .eq('success', true)
    .gte('created_at', since);
  if ((recent || 0) >= MAX_REVEALS_PER_HOUR) {
    await log(false, { failure_reason: 'rate limited' });
    await notifyAdmins({
      category: 'SECURITY',
      title: `Reveal limit reached: ${me.name}`,
      message: `${me.name} reached the limit of ${MAX_REVEALS_PER_HOUR} credential reveals per hour and was blocked. Check the Credential Access Log.`,
    });
    return NextResponse.json(
      { error: `You have reached the limit of ${MAX_REVEALS_PER_HOUR} reveals per hour. Try again later.` },
      { status: 429 }
    );
  }

  // 4. Decrypt: a PC's own credentials take priority over its room's
  const labs = Array.from(new Set(stations.map((s: any) => s.lab_code)));
  const { data: creds } = await supabase
    .from('pc_credentials')
    .select('id, lab_code, workstation_id, username, password_enc, reveal_count')
    .in('lab_code', labs);
  const roomDefaults = new Map<string, any>();
  const overrides = new Map<string, any>();
  (creds || []).forEach((c: any) => (c.workstation_id ? overrides.set(c.workstation_id, c) : roomDefaults.set(c.lab_code, c)));

  const decrypted = new Map<string, string>();
  const usedRows = new Set<string>();
  const items: RevealedCredential[] = stations
    .map((s: any) => {
      const row = overrides.get(s.id) || roomDefaults.get(s.lab_code);
      if (!row) return { labCode: s.lab_code, pcNum: s.pc_num, username: null, password: null, source: 'NONE' as const };
      if (!decrypted.has(row.id)) decrypted.set(row.id, decryptCredential(row.password_enc));
      usedRows.add(row.id);
      return {
        labCode: s.lab_code,
        pcNum: s.pc_num,
        username: row.username,
        password: decrypted.get(row.id)!,
        source: overrides.has(s.id) ? ('CUSTOM' as const) : ('ROOM' as const),
      };
    })
    .sort((a: RevealedCredential, b: RevealedCredential) =>
      a.labCode.localeCompare(b.labCode, undefined, { numeric: true }) || pcNumber(a.pcNum) - pcNumber(b.pcNum)
    );

  // 5. Count the reveal against each credential used, log it, alert admins
  await Promise.all(
    Array.from(usedRows).map((id) => {
      const row = (creds || []).find((c: any) => c.id === id);
      return supabase.from('pc_credentials').update({ reveal_count: (row?.reveal_count || 0) + 1 }).eq('id', id);
    })
  );
  await log(true);

  const what = scope === 'PC' ? `${labCode} ${pcNum}` : scope === 'ROOM' ? `${labCode} (${stations.length} PCs)` : `all PCs (${stations.length})`;
  await notifyAdmins(
    {
      category: 'SECURITY',
      title: `Credentials viewed: ${what}`,
      message: `${me.name} (${me.role.toLowerCase()}) viewed the admin credentials for ${what}. Reason: ${reason}`,
    },
    { exceptUserId: me.id }
  );

  return NextResponse.json({ items, expiresInSeconds: SHOW_SECONDS[scope] }, { headers: NO_STORE });
}
