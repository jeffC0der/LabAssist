import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhkpqacieloefhzrciae.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing.' },
        { status: 500 }
      );
    }

    // Initialize Supabase Admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = (name || '').trim() || trimmedEmail.split('@')[0];

    // Restrict registration exclusively to @umak.edu.ph domain (or system root admin)
    const isRootAdmin =
      trimmedEmail === 'labadmin@gmail.com' ||
      trimmedEmail === 'labadmin@campus.edu' ||
      trimmedEmail === 'labadmin' ||
      trimmedEmail === 'admin@campus.edu';

    if (!trimmedEmail.endsWith('@umak.edu.ph') && !isRootAdmin) {
      return NextResponse.json(
        { error: 'Access restricted: Only @umak.edu.ph email addresses are authorized to register.' },
        { status: 403 }
      );
    }

    // Resolve role: check whitelisted_technicians allowlist for auto TECHNICIAN assignment
    let assignedRole = 'STUDENT';
    if (trimmedEmail === 'labadmin@gmail.com' || trimmedEmail === 'labadmin@campus.edu') {
      assignedRole = 'ADMIN';
    } else {
      try {
        const { data: wl } = await supabaseAdmin
          .from('whitelisted_technicians')
          .select('email')
          .eq('email', trimmedEmail)
          .maybeSingle();
        if (wl) assignedRole = 'TECHNICIAN';
      } catch {
        // Table may not exist yet — default to STUDENT
      }
    }

    // Create user with email_confirm: true (bypasses email rate limit)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: trimmedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name: trimmedName,
        full_name: trimmedName,
        role: assignedRole,
        department: 'Undergraduate Engineering',
      },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Failed to create user record.' },
        { status: 500 }
      );
    }

    // Insert / Upsert profile in public.profiles table
    try {
      await supabaseAdmin.from('profiles').upsert({
        id: data.user.id,
        email: trimmedEmail,
        name: trimmedName,
        role: 'STUDENT',
        avatar: trimmedName.substring(0, 2).toUpperCase(),
        department: 'Undergraduate Engineering',
      });
    } catch (profileErr) {
      console.warn('Admin profile creation warning:', profileErr);
    }

    // Also attempt users table if exists
    try {
      await supabaseAdmin.from('users').upsert({
        id: data.user.id,
        email: trimmedEmail,
        full_name: trimmedName,
        role: 'STUDENT',
      });
    } catch {}

    return NextResponse.json({
      user: data.user,
      message: 'Account created successfully with auto-confirmed email.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal server error during account creation.' },
      { status: 500 }
    );
  }
}
