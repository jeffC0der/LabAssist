import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireAuth, getServiceClient, STAFF_ROLES, type AuthUser } from '@/lib/serverAuth';
import { errorResponse, ValidationError, PATTERNS } from '@/lib/validation';
import { MAX_TICKET_PHOTOS } from '@/lib/repairPhotos';
import { PHOTO_BUCKET, PHOTO_LINK_SECONDS, readPhotoFromForm } from '@/lib/photoUpload';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SQL_HINT = 'Ticket photos are not set up yet. Run sql/supabase_ticket_photos.sql in the Supabase SQL editor.';
const missingTable = (message = '') => /ticket_photos/.test(message);

export interface TicketPhoto {
  id: string;
  url: string;
  createdAt: string;
}

function db() {
  const supabase = getServiceClient();
  if (!supabase) throw new Error('Database is not configured');
  return supabase;
}

const validTicketId = (value: unknown): string => {
  const id = String(value || '').trim();
  if (!PATTERNS.ticketId.test(id) || id.length > 30) throw new ValidationError('Invalid ticket number.');
  return id;
};

/** The ticket's reporter (saved in the ticket's metadata when it was filed). */
async function ticketOwner(ticketId: string): Promise<{ exists: boolean; userId?: string; userEmail?: string; resolved?: boolean }> {
  const { data } = await db().from('tickets').select('description, status').eq('ticket_id', ticketId).maybeSingle();
  if (!data) return { exists: false };
  const match = String(data.description || '').match(/<!--LABASSIST_TKT_META:(.*?)-->/);
  let meta: { userId?: string; userEmail?: string } = {};
  try {
    meta = match ? JSON.parse(match[1]) : {};
  } catch {
    meta = {};
  }
  return { exists: true, userId: meta.userId, userEmail: String(meta.userEmail || '').toLowerCase() || undefined, resolved: data.status === 'RESOLVED' };
}

/** Staff can see every ticket's photos; a student only those on tickets they filed. */
async function canAccess(user: AuthUser, ticketId: string) {
  const owner = await ticketOwner(ticketId);
  if (!owner.exists) return { ok: false, owner };
  const ok = STAFF_ROLES.includes(user.role) || owner.userId === user.id || (!!owner.userEmail && owner.userEmail === user.email);
  return { ok, owner };
}

// ── GET ?ticket=TKT-… → the ticket's photos with short-lived viewing links ──
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  try {
    const ticketId = validTicketId(new URL(request.url).searchParams.get('ticket'));
    const access = await canAccess(auth.user, ticketId);
    if (!access.ok) return NextResponse.json({ error: 'You do not have permission to do this.' }, { status: access.owner.exists ? 403 : 404 });

    const { data: rows, error } = await db()
      .from('ticket_photos')
      .select('id, storage_path, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (error) {
      if (missingTable(error.message)) return NextResponse.json({ photos: [], setupRequired: true });
      throw new Error(error.message);
    }
    if (!rows || rows.length === 0) return NextResponse.json({ photos: [] });

    const { data: signed, error: signErr } = await db()
      .storage.from(PHOTO_BUCKET)
      .createSignedUrls(rows.map((r: any) => r.storage_path), PHOTO_LINK_SECONDS);
    if (signErr) throw new Error(signErr.message);

    const photos: TicketPhoto[] = rows
      .map((r: any, i: number) => ({ id: r.id, url: signed?.[i]?.signedUrl || '', createdAt: r.created_at }))
      .filter((p) => p.url);
    return NextResponse.json({ photos }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return errorResponse(err, 'api/tickets/photos');
  }
}

// ── POST multipart { ticket, file } → attach one photo to an open ticket ──
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ValidationError('Send the photo as a form upload.');
    }
    const ticketId = validTicketId(form.get('ticket'));
    const { buf, mime, ext } = await readPhotoFromForm(form);

    const access = await canAccess(auth.user, ticketId);
    if (!access.ok) return NextResponse.json({ error: 'You do not have permission to do this.' }, { status: access.owner.exists ? 403 : 404 });
    if (access.owner.resolved) throw new ValidationError('Photos can’t be added to a resolved ticket.');

    const supabase = db();
    const { count, error: countErr } = await supabase
      .from('ticket_photos')
      .select('id', { count: 'exact', head: true })
      .eq('ticket_id', ticketId);
    if (countErr) {
      if (missingTable(countErr.message)) return NextResponse.json({ error: SQL_HINT }, { status: 500 });
      throw new Error(countErr.message);
    }
    if ((count || 0) >= MAX_TICKET_PHOTOS) throw new ValidationError(`Up to ${MAX_TICKET_PHOTOS} photos can be attached to a ticket.`);

    const path = `tickets/${ticketId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, buf, { contentType: mime, upsert: false });
    if (upErr) {
      if (/bucket/i.test(upErr.message)) return NextResponse.json({ error: SQL_HINT }, { status: 500 });
      throw new Error(upErr.message);
    }
    const { data: row, error: insErr } = await supabase
      .from('ticket_photos')
      .insert({ ticket_id: ticketId, storage_path: path, mime_type: mime, size_bytes: buf.length, uploaded_by: auth.user.id })
      .select('id')
      .single();
    if (insErr) {
      await supabase.storage.from(PHOTO_BUCKET).remove([path]);
      if (missingTable(insErr.message)) return NextResponse.json({ error: SQL_HINT }, { status: 500 });
      throw new Error(insErr.message);
    }
    return NextResponse.json({ success: true, id: row.id });
  } catch (err) {
    return errorResponse(err, 'api/tickets/photos');
  }
}
