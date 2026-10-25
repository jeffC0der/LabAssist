import { NextResponse } from 'next/server';
import { requireAuth, getServiceClient } from '@/lib/serverAuth';
import { errorResponse } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface CredentialLogEntry {
  id: string;
  userName: string | null;
  userRole: string | null;
  action: 'REVEAL' | 'SET' | 'CLEAR' | 'AUTH_SETUP' | 'AUTH_RESET';
  scope: 'PC' | 'ROOM' | 'ALL';
  labCode: string | null;
  pcNum: string | null;
  pcsCount: number;
  reason: string | null;
  success: boolean;
  failureReason: string | null;
  ipAddress: string | null;
  createdAt: string;
}

// ── GET (admin): the credential access log, newest first ──
export async function GET(request: Request) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (auth.response) return auth.response;

  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'Database is not configured' }, { status: 503 });

  const limit = Math.min(500, Math.max(1, Number(new URL(request.url).searchParams.get('limit')) || 200));
  const { data, error } = await supabase
    .from('credential_access_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return errorResponse(error, 'api/pc-credentials/log', { entries: [] });

  const entries: CredentialLogEntry[] = (data || []).map((r: any) => ({
    id: r.id,
    userName: r.user_name,
    userRole: r.user_role,
    action: r.action,
    scope: r.scope,
    labCode: r.lab_code,
    pcNum: r.pc_num,
    pcsCount: r.pcs_count,
    reason: r.reason,
    success: r.success,
    failureReason: r.failure_reason,
    ipAddress: r.ip_address,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ entries }, { headers: { 'Cache-Control': 'no-store' } });
}
