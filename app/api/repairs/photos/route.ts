import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireAuth, getServiceClient, STAFF_ROLES, type AuthUser } from '@/lib/serverAuth';
import { errorResponse, ValidationError, PATTERNS } from '@/lib/validation';
import { PHOTO_KINDS, MAX_PHOTOS_PER_KIND, type PhotoKind } from '@/lib/repairPhotos';
import { PHOTO_BUCKET as BUCKET, PHOTO_LINK_SECONDS as LINK_SECONDS, readPhotoFromForm } from '@/lib/photoUpload';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SQL_HINT = 'Photo uploads are not set up yet. Run supabase_repair_photos.sql in the Supabase SQL editor.';

export interface RepairPhoto {
  id: string;
  kind: PhotoKind;
  url: string;
  createdAt: string;
}

function db() {
  const supabase = getServiceClient();
  if (!supabase) throw new Error('Database is not configured');
  return supabase;
}

/** Staff can see every repair; a student only their own (by account or email). */
async function canAccess(user: AuthUser, rma: string): Promise<boolean> {
  if (STAFF_ROLES.includes(user.role)) return true;
  const { data } = await db().from('device_repairs').select('user_id, client_email').eq('rma_number', rma).maybeSingle();
  return !!data && (data.user_id === user.id || String(data.client_email || '').toLowerCase() === user.email);
}

const validRma = (rma: unknown): string => {
  const value = String(rma || '').trim();
  if (!PATTERNS.jobOrder.test(value) || value.length > 40) throw new ValidationError('Invalid job order number.');
  return value;
};

// ── GET ?rma=… → the repair's photos with short-lived viewing links ──
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  try {
    const rma = validRma(new URL(request.url).searchParams.get('rma'));
    if (!(await canAccess(auth.user, rma))) return NextResponse.json({ error: 'You do not have permission to do this.' }, { status: 403 });

    const { data: rows, error } = await db()
      .from('repair_photos')
      .select('id, kind, storage_path, created_at')
      .eq('rma_number', rma)
      .order('created_at', { ascending: true });
    if (error) {
      if (/repair_photos/.test(error.message)) return NextResponse.json({ photos: [], setupRequired: true });
      throw new Error(error.message);
    }
    if (!rows || rows.length === 0) return NextResponse.json({ photos: [] });

    const { data: signed, error: signErr } = await db()
      .storage.from(BUCKET)
      .createSignedUrls(rows.map((r: any) => r.storage_path), LINK_SECONDS);
    if (signErr) throw new Error(signErr.message);

    const photos: RepairPhoto[] = rows
      .map((r: any, i: number) => ({ id: r.id, kind: r.kind, url: signed?.[i]?.signedUrl || '', createdAt: r.created_at }))
      .filter((p) => p.url);
    return NextResponse.json({ photos }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return errorResponse(err, 'api/repairs/photos');
  }
}

// ── POST multipart { rma, kind, file } → attach one photo ──
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
    const rma = validRma(form.get('rma'));
    const kind = String(form.get('kind') || '') as PhotoKind;
    if (!PHOTO_KINDS.includes(kind)) throw new ValidationError('Photo type must be ISSUE or CONDITION.');
    const { buf, ...type } = await readPhotoFromForm(form);

    if (!(await canAccess(auth.user, rma))) return NextResponse.json({ error: 'You do not have permission to do this.' }, { status: 403 });

    const supabase = db();
    const { count, error: countErr } = await supabase
      .from('repair_photos')
      .select('id', { count: 'exact', head: true })
      .eq('rma_number', rma)
      .eq('kind', kind);
    if (countErr) {
      if (/repair_photos/.test(countErr.message)) return NextResponse.json({ error: SQL_HINT }, { status: 500 });
      throw new Error(countErr.message);
    }
    if ((count || 0) >= MAX_PHOTOS_PER_KIND) {
      throw new ValidationError(`Up to ${MAX_PHOTOS_PER_KIND} photos can be attached for this section.`);
    }

    const path = `${rma}/${kind.toLowerCase()}/${crypto.randomUUID()}.${type.ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: type.mime, upsert: false });
    if (upErr) {
      if (/bucket/i.test(upErr.message)) return NextResponse.json({ error: SQL_HINT }, { status: 500 });
      throw new Error(upErr.message);
    }
    const { data: row, error: insErr } = await supabase
      .from('repair_photos')
      .insert({ rma_number: rma, kind, storage_path: path, mime_type: type.mime, size_bytes: buf.length, uploaded_by: auth.user.id })
      .select('id, created_at')
      .single();
    if (insErr) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw new Error(insErr.message);
    }
    return NextResponse.json({ success: true, id: row.id });
  } catch (err) {
    return errorResponse(err, 'api/repairs/photos');
  }
}
