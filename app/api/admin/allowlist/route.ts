import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhkpqacieloefhzrciae.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient() {
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// GET: Fetch allowlisted technicians
export async function GET() {
  try {
    const supabaseAdmin = getAdminClient();
    const { data, error } = await supabaseAdmin
      .from('whitelisted_technicians')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist in schema cache yet, return empty with table_missing flag
      if (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
        return NextResponse.json({
          allowlist: [],
          tableMissing: true,
          notice: "Table 'whitelisted_technicians' needs to be created in Supabase SQL editor.",
        });
      }
      throw error;
    }

    return NextResponse.json({ allowlist: data || [], tableMissing: false });
  } catch (err: any) {
    return NextResponse.json({
      allowlist: [],
      error: err?.message || 'Failed to fetch allowlist',
      tableMissing: err?.message?.includes('schema cache') || err?.message?.includes('does not exist'),
    });
  }
}

// POST: Add email to allowlist
export async function POST(request: Request) {
  try {
    const supabaseAdmin = getAdminClient();
    const { email, department } = await request.json();

    const lowerEmail = (email || '').toLowerCase().trim();
    if (!lowerEmail || !lowerEmail.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    // 1. Insert/upsert into whitelisted_technicians
    const { data, error } = await supabaseAdmin
      .from('whitelisted_technicians')
      .upsert({
        email: lowerEmail,
        department: department || 'Hardware Maintenance Div.',
      })
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
        return NextResponse.json({
          error: "Table 'whitelisted_technicians' does not exist in Supabase yet. Please run the SQL schema script.",
          tableMissing: true,
        }, { status: 400 });
      }
      throw error;
    }

    // 2. Also promote existing profile if user already registered
    try {
      await supabaseAdmin
        .from('profiles')
        .update({ role: 'TECHNICIAN', updated_at: new Date().toISOString() })
        .eq('email', lowerEmail);
    } catch {}

    try {
      await supabaseAdmin.from('users').update({ role: 'TECHNICIAN' }).eq('email', lowerEmail);
    } catch {}

    return NextResponse.json({ success: true, entry: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to add allowlist entry' }, { status: 500 });
  }
}

// DELETE: Remove email from allowlist
export async function DELETE(request: Request) {
  try {
    const supabaseAdmin = getAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');

    if (!id && !email) {
      return NextResponse.json({ error: 'ID or email is required' }, { status: 400 });
    }

    if (id) {
      await supabaseAdmin.from('whitelisted_technicians').delete().eq('id', id);
    } else if (email) {
      await supabaseAdmin.from('whitelisted_technicians').delete().eq('email', email.toLowerCase().trim());
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete allowlist entry' }, { status: 500 });
  }
}
