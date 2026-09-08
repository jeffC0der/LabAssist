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

    // Restrict registration exclusively to @umak.edu.ph domain (or system root accounts)
    const isAuthorizedExternal =
      trimmedEmail === 'labadmin@gmail.com' ||
      trimmedEmail === 'labadmin@campus.edu' ||
      trimmedEmail === 'labadmin' ||
      trimmedEmail === 'admin@campus.edu' ||
      trimmedEmail === 'labassist4umak@gmail.com' ||
      trimmedEmail === 'umak.labassist@gmail.com';

    if (!trimmedEmail.endsWith('@umak.edu.ph') && !isAuthorizedExternal) {
      return NextResponse.json(
        { error: 'Access restricted: Only @umak.edu.ph email addresses are authorized to register.' },
        { status: 403 }
      );
    }

    // Resolve role: check admin list, technician list, or whitelisted_technicians allowlist
    let assignedRole = 'STUDENT';
    let assignedDept = 'Undergraduate Engineering';

    if (
      trimmedEmail === 'labadmin@gmail.com' ||
      trimmedEmail === 'labadmin@campus.edu' ||
      trimmedEmail === 'labassist4umak@gmail.com'
    ) {
      assignedRole = 'ADMIN';
      assignedDept = 'Laboratory Administration';
    } else if (trimmedEmail === 'umak.labassist@gmail.com') {
      assignedRole = 'TECHNICIAN';
      assignedDept = 'Hardware Maintenance Div.';
    } else {
      try {
        const { data: wl } = await supabaseAdmin
          .from('whitelisted_technicians')
          .select('email')
          .eq('email', trimmedEmail)
          .maybeSingle();
        if (wl) {
          assignedRole = 'TECHNICIAN';
          assignedDept = 'Hardware Maintenance Div.';
        }
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
        department: assignedDept,
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
        role: assignedRole,
        avatar: trimmedName.substring(0, 2).toUpperCase(),
        department: assignedDept,
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
        role: assignedRole,
      });
    } catch {}

    // Ensure technician is in whitelisted_technicians
    if (assignedRole === 'TECHNICIAN') {
      try {
        await supabaseAdmin.from('whitelisted_technicians').upsert({
          email: trimmedEmail,
          department: assignedDept,
        });
      } catch {}
    }

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
