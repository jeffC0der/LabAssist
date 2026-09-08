import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhkpqacieloefhzrciae.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface UpdateProfileBody {
  userId?: string;
  email?: string;
  name?: string;
  department?: string;
  avatar?: string;
  requireLoginOtp?: boolean;
}

export async function POST(request: Request) {
  try {
    let body: UpdateProfileBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body.' },
        { status: 400 }
      );
    }

    const { userId, email, name, department, avatar, requireLoginOtp } = body;

    if (!email && !userId) {
      return NextResponse.json(
        { success: false, error: 'User ID or email is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email ? email.trim().toLowerCase() : undefined;

    // Initialize Supabase Admin client
    const supabaseAdmin = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })
      : null;

    let targetUserId = userId;

    if (!targetUserId && cleanEmail && supabaseAdmin) {
      const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
      const match = usersList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
      if (match) {
        targetUserId = match.id;
      }
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (department !== undefined) updateData.department = department.trim();
    if (avatar !== undefined) updateData.avatar = avatar;

    // 1. Update public.profiles if exists
    if (supabaseAdmin) {
      if (targetUserId) {
        try {
          await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('id', targetUserId);
        } catch (err) {
          console.warn('[api/user/profile] Error updating profiles by id:', err);
        }
      } else if (cleanEmail) {
        try {
          await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('email', cleanEmail);
        } catch (err) {
          console.warn('[api/user/profile] Error updating profiles by email:', err);
        }
      }

      // 2. Also update public.users if exists
      const usersTableData: Record<string, any> = {};
      if (name !== undefined) usersTableData.full_name = name.trim();
      if (department !== undefined) usersTableData.department = department.trim();

      if (Object.keys(usersTableData).length > 0) {
        try {
          if (targetUserId) {
            await supabaseAdmin.from('users').update(usersTableData).eq('id', targetUserId);
          } else if (cleanEmail) {
            await supabaseAdmin.from('users').update(usersTableData).eq('email', cleanEmail);
          }
        } catch {}
      }

      // 3. Update auth user_metadata so it persists reliably across sessions
      if (targetUserId) {
        try {
          const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
          const currentMeta = targetUser?.user?.user_metadata || {};
          const newMeta = {
            ...currentMeta,
            ...(name !== undefined ? { full_name: name.trim(), name: name.trim() } : {}),
            ...(department !== undefined ? { department: department.trim() } : {}),
            ...(requireLoginOtp !== undefined ? { require_login_otp: requireLoginOtp } : {}),
          };

          await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
            user_metadata: newMeta,
          });
        } catch (authErr) {
          console.warn('[api/user/profile] Error updating auth metadata:', authErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      profile: {
        id: targetUserId,
        email: cleanEmail,
        name,
        department,
        avatar,
        requireLoginOtp,
      },
    });
  } catch (err: any) {
    console.error('[api/user/profile] Server error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update profile.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const userId = searchParams.get('userId');

    if (!email && !userId) {
      return NextResponse.json(
        { success: false, error: 'Email or userId parameter is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email ? email.trim().toLowerCase() : undefined;

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
        profile: {
          email: cleanEmail,
          requireLoginOtp: false,
        },
      });
    }

    let profileData: any = null;

    if (userId) {
      const { data } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).maybeSingle();
      profileData = data;
    } else if (cleanEmail) {
      const { data } = await supabaseAdmin.from('profiles').select('*').eq('email', cleanEmail).maybeSingle();
      profileData = data;
    }

    // Also check auth metadata for require_login_otp
    let requireLoginOtp = profileData?.require_login_otp ?? false;
    let authUser: any = null;

    if (userId) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
      authUser = data?.user;
    } else if (cleanEmail) {
      const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
      authUser = usersList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
    }

    if (authUser?.user_metadata?.require_login_otp !== undefined) {
      requireLoginOtp = !!authUser.user_metadata.require_login_otp;
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: profileData?.id || authUser?.id,
        name: profileData?.name || authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || '',
        email: profileData?.email || authUser?.email || cleanEmail,
        department: profileData?.department || authUser?.user_metadata?.department || 'Undergraduate Engineering',
        role: profileData?.role || 'STUDENT',
        avatar: profileData?.avatar || '',
        requireLoginOtp: !!requireLoginOtp,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve profile.' },
      { status: 500 }
    );
  }
}
