import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/serverAuth';

// ── GET: campus-wide counts for the public landing page (no sign-in) ──
// Only totals are returned: no names, emails, PC numbers or ticket details.
// Cached for a minute so visitors can't use it to load the database.

export const dynamic = 'force-dynamic';

let cache: { at: number; body: Record<string, number> } | null = null;
const CACHE_MS = 60_000;

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json(cache.body, { headers: { 'Cache-Control': 'public, max-age=60' } });
  }
  const db = getServiceClient();
  if (!db) return NextResponse.json({ error: 'Statistics are not available right now.' }, { status: 503 });

  const count = async (table: string, filter?: (q: any) => any) => {
    let q: any = db.from(table).select('*', { count: 'exact', head: true });
    if (filter) q = filter(q);
    const { count: n, error } = await q;
    if (error) throw new Error(error.message);
    return n || 0;
  };

  try {
    const [totalPcs, onlinePcs, inUsePcs, labRows] = await Promise.all([
      count('workstations'),
      count('workstations', (q) => q.eq('status', 'ONLINE')),
      count('workstations', (q) => q.eq('status', 'OCCUPIED')),
      db.from('workstations').select('lab_code'),
    ]);
    if (labRows.error) throw new Error(labRows.error.message);
    const labs = new Set((labRows.data || []).map((r: any) => r.lab_code)).size;

    const body = { labs, totalPcs, onlinePcs, inUsePcs };
    cache = { at: Date.now(), body };
    return NextResponse.json(body, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (err) {
    console.error('[public/stats]', (err as Error).message);
    return NextResponse.json({ error: 'Statistics are not available right now.' }, { status: 503 });
  }
}
