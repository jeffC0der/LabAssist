import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhkpqacieloefhzrciae.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    const supabaseAdmin = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })
      : null;

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: true,
        requireLoginOtp: false,
      });
    }

    // 1. Look up user in auth.users by email
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
    const user = usersList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);

    let requireLoginOtp = false;
    let name = user?.user_metadata?.full_name || user?.user_metadata?.name || cleanEmail.split('@')[0];

    if (user?.user_metadata?.require_login_otp !== undefined) {
      requireLoginOtp = !!user.user_metadata.require_login_otp;
    }

    // 2. Fallback check name from profiles
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('name')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (profile?.name) {
        name = profile.name;
      }
    } catch {}

    return NextResponse.json({
      success: true,
      requireLoginOtp,
      name,
    });
  } catch (err: any) {
    console.error('[api/user/otp-status] Error:', err);
    return NextResponse.json({
      success: true,
      requireLoginOtp: false,
    });
  }
}
