import { NextResponse } from 'next/server';
import { requireAuth, getServiceClient, getClientIp, STAFF_ROLES } from '@/lib/serverAuth';
import { encryptCredential, decryptCredential, isCredentialsKeyConfigured, credentialsKeyProblem } from '@/lib/credentialCrypto';
import { generateTotpSecret, totpUri, verifyTotp } from '@/lib/totp';
import { notifyAdmins } from '@/lib/notifications';
import { readJson, reqStr, reqUuid, oneOf, PATTERNS, errorResponse } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = { 'Cache-Control': 'no-store' };
const SQL_HINT = 'The authenticator is not set up yet. Run supabase_staff_authenticator.sql in the Supabase SQL editor.';
const missingTable = (msg?: string) => /staff_authenticators/.test(msg || '');

export type AuthenticatorStatus = 'NONE' | 'PENDING' | 'ACTIVE';

function db() {
  const supabase = getServiceClient();
  if (!supabase) throw new Error('Database is not configured');
  return supabase;
}

/**
 * Authenticator app (Google Authenticator) for revealing PC credentials.
 *
 * GET                     → { status } for the signed-in staff member
 * GET ?list=1   (admin)   → { staff: [{ userId, name, email, role, status, linkedAt }] }
 * POST { action: 'setup' }            → new secret + QR link (not active until confirmed)
 * POST { action: 'confirm', code }    → first code from the app activates it
 * DELETE { userId }        (admin)    → unlink someone's authenticator (lost / new phone)
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request, STAFF_ROLES);
  if (auth.response) return auth.response;

  try {
    const supabase = db();
    const list = new URL(request.url).searchParams.get('list') === '1';

    if (list) {
      if (auth.user.role !== 'ADMIN') return NextResponse.json({ error: 'Only an administrator can view this.' }, { status: 403 });
      const [{ data: staff }, { data: rows, error }] = await Promise.all([
        supabase.from('profiles').select('id, name, email, role').in('role', ['ADMIN', 'TECHNICIAN']).order('name'),
        supabase.from('staff_authenticators').select('user_id, confirmed_at'),
      ]);
      if (error) {
        if (missingTable(error.message)) return NextResponse.json({ staff: [], setupRequired: true });
        throw new Error(error.message);
      }
      const byUser = new Map((rows || []).map((r: any) => [r.user_id, r]));
      return NextResponse.json({
        staff: (staff || []).map((p: any) => {
          const row: any = byUser.get(p.id);
          return {
            userId: p.id,
            name: p.name,
            email: p.email,
            role: p.role,
            status: (row ? (row.confirmed_at ? 'ACTIVE' : 'PENDING') : 'NONE') as AuthenticatorStatus,
            linkedAt: row?.confirmed_at || null,
          };
        }),
      }, { headers: NO_STORE });
    }

    const { data: row, error } = await supabase
      .from('staff_authenticators')
      .select('confirmed_at')
      .eq('user_id', auth.user.id)
      .maybeSingle();
    if (error) {
      if (missingTable(error.message)) return NextResponse.json({ status: 'NONE', setupRequired: true });
      throw new Error(error.message);
    }
    const status: AuthenticatorStatus = row ? (row.confirmed_at ? 'ACTIVE' : 'PENDING') : 'NONE';
    return NextResponse.json({ status }, { headers: NO_STORE });
  } catch (err) {
    return errorResponse(err, 'api/pc-credentials/authenticator');
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(request, STAFF_ROLES);
  if (auth.response) return auth.response;
  if (!isCredentialsKeyConfigured()) return NextResponse.json({ error: credentialsKeyProblem() }, { status: 500 });

  try {
    const supabase = db();
    const body = await readJson(request, 5_000);
    const action = oneOf(body.action, 'Action', ['setup', 'confirm'] as const);
    const me = auth.user;

    const { data: row, error: readErr } = await supabase
      .from('staff_authenticators')
      .select('secret_enc, confirmed_at')
      .eq('user_id', me.id)
      .maybeSingle();
    if (readErr) {
      if (missingTable(readErr.message)) return NextResponse.json({ error: SQL_HINT }, { status: 500 });
      throw new Error(readErr.message);
    }

    // An active authenticator can only be replaced by an admin reset (stops a stolen session from re-linking it)
    if (row?.confirmed_at) {
      return NextResponse.json(
        { error: 'Your authenticator is already linked. If you lost your phone, ask an administrator to reset it.' },
        { status: 409 }
      );
    }

    if (action === 'setup') {
      const secret = generateTotpSecret();
      const { error } = await supabase
        .from('staff_authenticators')
        .upsert({ user_id: me.id, secret_enc: encryptCredential(secret), confirmed_at: null, last_used_step: null, created_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
      return NextResponse.json({ secret, otpauthUri: totpUri(secret, me.email) }, { headers: NO_STORE });
    }

    // confirm
    const code = reqStr(body.code, 'Code', { max: 10, pattern: PATTERNS.sixDigits, patternMessage: 'Enter the 6-digit code from your authenticator app.' });
    if (!row) return NextResponse.json({ error: 'Start the setup first.' }, { status: 400 });
    const step = verifyTotp(decryptCredential(row.secret_enc), code);
    if (step === null) {
      return NextResponse.json(
        { error: 'That code is not right. Check that the app shows "UMak LabAssist" and that your phone’s time is set automatically.' },
        { status: 400 }
      );
    }
    const { error } = await supabase
      .from('staff_authenticators')
      .update({ confirmed_at: new Date().toISOString(), last_used_step: step })
      .eq('user_id', me.id);
    if (error) throw new Error(error.message);

    await supabase.from('credential_access_log').insert({
      user_id: me.id, user_name: me.name, user_role: me.role, action: 'AUTH_SETUP', scope: 'ALL',
      success: true, ip_address: getClientIp(request), reason: 'Linked an authenticator app',
    });
    return NextResponse.json({ status: 'ACTIVE' as AuthenticatorStatus });
  } catch (err) {
    return errorResponse(err, 'api/pc-credentials/authenticator');
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (auth.response) return auth.response;

  try {
    const supabase = db();
    const body = await readJson(request, 2_000);
    const userId = reqUuid(body.userId, 'User');

    const { data: target } = await supabase.from('profiles').select('name, email').eq('id', userId).maybeSingle();
    const { error } = await supabase.from('staff_authenticators').delete().eq('user_id', userId);
    if (error) {
      if (missingTable(error.message)) return NextResponse.json({ error: SQL_HINT }, { status: 500 });
      throw new Error(error.message);
    }

    const who = target?.name || target?.email || 'a staff member';
    await supabase.from('credential_access_log').insert({
      user_id: auth.user.id, user_name: auth.user.name, user_role: auth.user.role, action: 'AUTH_RESET', scope: 'ALL',
      success: true, ip_address: getClientIp(request), reason: `Reset the authenticator of ${who}`,
    });
    await notifyAdmins(
      { category: 'SECURITY', title: `Authenticator reset: ${who}`, message: `${auth.user.name} reset the authenticator app of ${who}. They must link it again before viewing PC credentials.` },
      { exceptUserId: auth.user.id }
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, 'api/pc-credentials/authenticator');
  }
}
