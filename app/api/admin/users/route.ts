import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, listAllAuthUsers } from '@/lib/serverAuth';
import { errorResponse, readJson, optUuid, optEmail, oneOf } from '@/lib/validation';

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

// GET: Fetch all users (from profiles, users table, and auth)
export async function GET(request: Request) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (auth.response) return auth.response;

  try {
    const supabaseAdmin = getAdminClient();

    // 1. Fetch from profiles
    const { data: profiles, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // 2. Fetch from auth.users to ensure 100% complete list
    let authUsers: any[] = [];
    try {
      authUsers = await listAllAuthUsers(supabaseAdmin);
    } catch {}

    const profileMap = new Map<string, any>();

    (profiles || []).forEach(p => {
      profileMap.set(p.id, p);
      if (p.email) profileMap.set(p.email.toLowerCase(), p);
    });

    // Merge auth users if profile missing
    const combinedUsers = [...(profiles || [])];

    authUsers.forEach(au => {
      const email = (au.email || '').toLowerCase();
      if (!profileMap.has(au.id) && !profileMap.has(email)) {
        const meta = au.user_metadata || {};
        const name = meta.full_name || meta.name || email.split('@')[0];
        // No profile row yet: roles only ever come from profiles, so treat as STUDENT
        const role = 'STUDENT';
        combinedUsers.push({
          id: au.id,
          email: au.email,
          name,
          role,
          department: meta.department || 'Undergraduate Engineering',
          created_at: au.created_at,
          last_active_at: au.last_sign_in_at || au.created_at,
        });
      }
    });

    return NextResponse.json({ users: combinedUsers });
  } catch (err: any) {
    return errorResponse(err, 'api/admin/users');
  }
}

// POST: Update user role
export async function POST(request: Request) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (auth.response) return auth.response;

  try {
    const supabaseAdmin = getAdminClient();
    const body = await readJson(request);
    const userId = optUuid(body.userId, 'User');
    const email = optEmail(body.email);
    const newRole = oneOf(body.newRole, 'Role', ['STUDENT', 'TECHNICIAN', 'ADMIN'] as const);
    if (!userId && !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (userId === auth.user.id || (email || '').toLowerCase().trim() === auth.user.email) {
      return NextResponse.json({ error: 'You cannot change your own role.' }, { status: 400 });
    }

    const lowerEmail = (email || '').toLowerCase().trim();

    // 1. Update profiles table
    try {
      if (userId) {
        await supabaseAdmin
          .from('profiles')
          .update({ role: newRole, updated_at: new Date().toISOString() })
          .eq('id', userId);
      } else if (lowerEmail) {
        await supabaseAdmin
          .from('profiles')
          .update({ role: newRole, updated_at: new Date().toISOString() })
          .eq('email', lowerEmail);
      }
    } catch (e) {
      console.warn('profiles update error:', e);
    }

    // 3. Update auth user metadata
    if (userId) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { role: newRole },
        });
      } catch {}
    }

    // 4. If promoted to TECHNICIAN, ensure allowlist contains email
    if (newRole === 'TECHNICIAN' && lowerEmail) {
      try {
        await supabaseAdmin.from('whitelisted_technicians').upsert({
          email: lowerEmail,
          department: 'Hardware Maintenance Div.',
        });
      } catch {}
    }

    // 5. If demoted to STUDENT, remove from allowlist
    if (newRole === 'STUDENT' && lowerEmail) {
      try {
        await supabaseAdmin.from('whitelisted_technicians').delete().eq('email', lowerEmail);
      } catch {}
    }

    return NextResponse.json({ success: true, role: newRole });
  } catch (err: any) {
    return errorResponse(err, 'api/admin/users');
  }
}
