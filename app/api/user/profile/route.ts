import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, markSessionVerified, findAuthUserByEmail } from '@/lib/serverAuth';
import { errorResponse, optStr, optBool } from '@/lib/validation';

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
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

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

    // Users can only update their own profile: the target always comes from the verified session
    const name = optStr(body.name, 'Full name', { max: 80 });
    const department = optStr(body.department, 'Department', { max: 100 });
    const avatar = optStr(body.avatar, 'Avatar', { max: 500 });
    const requireLoginOtp = optBool(body.requireLoginOtp, 'Two-factor login');
    const userId = auth.user.id;
    const cleanEmail = auth.user.email;

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
      const match = await findAuthUserByEmail(supabaseAdmin, cleanEmail);
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

      // 3. Update auth user_metadata so it persists reliably across sessions
      if (targetUserId) {
        try {
          const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
          const currentMeta = targetUser?.user?.user_metadata || {};
          const newMeta: Record<string, any> = {
            ...currentMeta,
            ...(name !== undefined ? { full_name: name.trim(), name: name.trim() } : {}),
            ...(department !== undefined ? { department: department.trim() } : {}),
          };
          delete newMeta.require_login_otp; // legacy, user-editable copy is no longer used

          // The two-factor switch lives in app_metadata, which only the server can write
          const appMeta =
            requireLoginOtp !== undefined
              ? { ...(targetUser?.user?.app_metadata || {}), require_login_otp: !!requireLoginOtp }
              : undefined;

          await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
            user_metadata: newMeta,
            ...(appMeta ? { app_metadata: appMeta } : {}),
          });

          // Turning two-factor on keeps the session the user is already signed in with
          if (requireLoginOtp === true && auth.user.sessionId) {
            await markSessionVerified(auth.user.sessionId, targetUserId);
          }
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
    return errorResponse(err, 'api/user/profile');
  }
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    // Non-admins can only read their own profile
    const isAdmin = auth.user.role === 'ADMIN';
    const email = isAdmin ? searchParams.get('email') : auth.user.email;
    const userId = isAdmin ? searchParams.get('userId') : auth.user.id;

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
      authUser = await findAuthUserByEmail(supabaseAdmin, cleanEmail);
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
    return errorResponse(err, 'api/user/profile');
  }
}
