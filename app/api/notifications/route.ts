import { NextResponse } from 'next/server';
import { requireAuth, getServiceClient } from '@/lib/serverAuth';
import { errorResponse, readJson, isUuid } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface AppNotification {
  id: string;
  category: 'TICKET' | 'REPAIR' | 'PAYMENT' | 'SECURITY';
  title: string;
  message: string;
  linkTab: string | null;
  refId: string | null;
  isRead: boolean;
  createdAt: string;
}

// ── GET: the signed-in user's notifications (newest first) + unread count ──
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'Database is not configured' }, { status: 503 });

  const limit = Math.min(200, Math.max(1, Number(new URL(request.url).searchParams.get('limit')) || 100));

  const [listRes, unreadRes] = await Promise.all([
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.user.id)
      .eq('is_read', false),
  ]);

  if (listRes.error) {
    return errorResponse(listRes.error, 'api/notifications', { notifications: [], unreadCount: 0 });
  }

  const notifications: AppNotification[] = (listRes.data || []).map((n: any) => ({
    id: n.id,
    category: n.category,
    title: n.title,
    message: n.message,
    linkTab: n.link_tab,
    refId: n.ref_id,
    isRead: n.is_read,
    createdAt: n.created_at,
  }));

  return NextResponse.json({ notifications, unreadCount: unreadRes.count || 0 });
}

// ── PATCH: mark notifications as read: { ids: string[] } or { all: true } ──
export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'Database is not configured' }, { status: 503 });

  let body: Record<string, any>;
  try {
    body = await readJson(request);
  } catch (err) {
    return errorResponse(err, 'api/notifications');
  }
  let query = supabase.from('notifications').update({ is_read: true }).eq('user_id', auth.user.id).eq('is_read', false);

  if (!body.all) {
    const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => isUuid(x)).slice(0, 200) : [];
    if (ids.length === 0) return NextResponse.json({ error: 'ids or all is required' }, { status: 400 });
    query = query.in('id', ids);
  }

  const { error } = await query;
  if (error) return errorResponse(error, 'api/notifications');
  return NextResponse.json({ success: true });
}
