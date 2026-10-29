import type { SupabaseClient } from '@supabase/supabase-js';
import { ValidationError } from '@/lib/validation';

// Server-side access to the admin-set service fee (sql/supabase_billing_settings.sql)

export const BILLING_SQL_HINT = 'The service fee is not set up yet. Run sql/supabase_billing_settings.sql in the Supabase SQL editor.';

export interface BillingSettings {
  serviceFee: number;
  updatedBy: string | null;
  updatedAt: string | null;
  /** The settings table doesn't exist yet: no fee is charged */
  setupRequired?: boolean;
}

const missingTable = (message = '') => /billing_settings|billing_fee_changes|does not exist|schema cache/i.test(message);

export async function getBillingSettings(db: SupabaseClient): Promise<BillingSettings> {
  const { data, error } = await db.from('billing_settings').select('service_fee, updated_by, updated_at').eq('id', 1).maybeSingle();
  if (error) {
    if (missingTable(error.message)) return { serviceFee: 0, updatedBy: null, updatedAt: null, setupRequired: true };
    throw new Error(error.message);
  }
  return {
    serviceFee: Number(data?.service_fee || 0),
    updatedBy: data?.updated_by || null,
    updatedAt: data?.updated_at || null,
  };
}

/** The current fee for a new invoice; 0 (no fee) if the settings can't be read. */
export async function currentServiceFee(db: SupabaseClient): Promise<number> {
  try {
    return (await getBillingSettings(db)).serviceFee;
  } catch (err) {
    console.warn('[billing] could not read the service fee:', (err as Error).message);
    return 0;
  }
}

export async function setServiceFee(db: SupabaseClient, fee: number, by: { id: string; name: string }) {
  const before = await getBillingSettings(db);
  // Shown to the admin as-is (a ValidationError message reaches the browser)
  if (before.setupRequired) throw new ValidationError(BILLING_SQL_HINT);
  const now = new Date().toISOString();
  const { error } = await db
    .from('billing_settings')
    .upsert({ id: 1, service_fee: fee, updated_by: by.name, updated_at: now });
  if (error) throw new Error(error.message);
  if (before.serviceFee !== fee) {
    await db.from('billing_fee_changes').insert({ old_fee: before.serviceFee, new_fee: fee, changed_by: by.name, changed_by_id: by.id });
  }
  return { serviceFee: fee, updatedBy: by.name, updatedAt: now } as BillingSettings;
}

export async function recentFeeChanges(db: SupabaseClient, limit = 5) {
  const { data, error } = await db
    .from('billing_fee_changes')
    .select('old_fee, new_fee, changed_by, changed_at')
    .order('changed_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []).map((r: any) => ({
    oldFee: r.old_fee === null ? null : Number(r.old_fee),
    newFee: Number(r.new_fee),
    changedBy: r.changed_by || 'Admin',
    changedAt: r.changed_at,
  }));
}
