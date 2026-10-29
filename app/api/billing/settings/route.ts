import { NextResponse } from 'next/server';
import { requireAuth, getServiceClient, STAFF_ROLES } from '@/lib/serverAuth';
import { errorResponse, readJson, reqNum } from '@/lib/validation';
import { getBillingSettings, setServiceFee, recentFeeChanges, BILLING_SQL_HINT } from '@/lib/billingSettings';
import { SERVICE_FEE_MAX } from '@/lib/serviceFee';

export const dynamic = 'force-dynamic';

const NO_DATABASE = () =>
  NextResponse.json({ error: 'Server configuration error: the database is not connected.' }, { status: 500 });

// ── GET: the current service fee (staff; admins also get the change history) ──
export async function GET(request: Request) {
  const auth = await requireAuth(request, STAFF_ROLES);
  if (auth.response) return auth.response;
  const db = getServiceClient();
  if (!db) return NO_DATABASE();

  try {
    const settings = await getBillingSettings(db);
    const history = auth.user.role === 'ADMIN' && !settings.setupRequired ? await recentFeeChanges(db) : [];
    return NextResponse.json(
      { ...settings, history, ...(settings.setupRequired ? { setupHint: BILLING_SQL_HINT } : {}) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    return errorResponse(err, 'api/billing/settings');
  }
}

// ── PUT: change the service fee (admins only). Applies to invoices created from now on. ──
export async function PUT(request: Request) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (auth.response) return auth.response;
  const db = getServiceClient();
  if (!db) return NO_DATABASE();

  try {
    const body = await readJson(request);
    const fee = Math.round(reqNum(body.serviceFee, 'Service fee', { min: 0, max: SERVICE_FEE_MAX }) * 100) / 100;
    const settings = await setServiceFee(db, fee, { id: auth.user.id, name: auth.user.name || auth.user.email });
    return NextResponse.json({ success: true, ...settings, history: await recentFeeChanges(db) });
  } catch (err) {
    return errorResponse(err, 'api/billing/settings');
  }
}
