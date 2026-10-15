import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyAndConsumeOtp } from '@/lib/otpStore';
import { getServiceClient, getSessionUser, markSessionVerified } from '@/lib/serverAuth';
import { issueResetToken } from '@/lib/resetToken';

interface VerifyOtpRequestBody {
  email?: string;
  otpCode?: string;
  purpose?: 'signup' | 'password_reset' | 'oauth_signup' | 'login' | 'verification';
  name?: string;
  password?: string;
}

async function findAuthUserByEmail(supabaseAdmin: SupabaseClient, email: string) {
  const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
  return usersList?.users?.find((u) => u.email?.toLowerCase() === email) || null;
}

// Create the profile for a newly verified account. Existing profiles are never overwritten,
// so a verification can't change the role an admin assigned.
async function ensureProfile(
  supabaseAdmin: SupabaseClient,
  userId: string,
  email: string,
  name: string,
  role: string,
  department: string
): Promise<string> {
  const { data: existing } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (existing) return existing.role;

  await supabaseAdmin.from('profiles').upsert(
    {
      id: userId,
      email,
      name,
      role,
      avatar: name.substring(0, 2).toUpperCase(),
      department,
    },
    { onConflict: 'id', ignoreDuplicates: true }
  );

  if (role === 'TECHNICIAN') {
    try {
      await supabaseAdmin.from('whitelisted_technicians').upsert({ email, department });
    } catch {}
  }
  return role;
}

export async function POST(request: Request) {
  try {
    let body: VerifyOtpRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request body.' },
        { status: 400 }
      );
    }

    const { email, otpCode, purpose = 'verification', name, password } = body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email address is required.' },
        { status: 400 }
      );
    }

    if (!otpCode || typeof otpCode !== 'string' || !otpCode.trim()) {
      return NextResponse.json(
        { success: false, error: '6-digit OTP code is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otpCode.trim();

    // 1. Verify and consume OTP — the code must have been issued for this same purpose
    const verification = await verifyAndConsumeOtp(cleanEmail, cleanOtp, purpose);

    if (!verification.valid) {
      return NextResponse.json(
        { success: false, error: verification.error || 'Invalid or expired OTP code.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getServiceClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error: missing service role key.' },
        { status: 500 }
      );
    }

    // Role for NEW accounts only: allowlisted technician emails become TECHNICIAN, everyone else STUDENT.
    // Admins are only ever assigned from the Admin Console.
    let assignedRole = 'STUDENT';
    let assignedDept = 'Undergraduate Engineering';
    try {
      const { data: wl } = await supabaseAdmin
        .from('whitelisted_technicians')
        .select('email')
        .eq('email', cleanEmail)
        .maybeSingle();
      if (wl) {
        assignedRole = 'TECHNICIAN';
        assignedDept = 'Hardware Maintenance Div.';
      }
    } catch {}

    const cleanName = (name || verification.metadata?.name || '').trim() || cleanEmail.split('@')[0];

    // 2. SIGNUP: create (or activate) the confirmed account
    if (purpose === 'signup') {
      if (!password) {
        return NextResponse.json({ success: false, error: 'Password is required to complete registration.' }, { status: 400 });
      }
      try {
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password,
          email_confirm: true,
          user_metadata: {
            name: cleanName,
            full_name: cleanName,
            department: assignedDept,
          },
        });

        let userId = userData?.user?.id;

        if (createError) {
          // Account already exists (e.g. unconfirmed from an earlier attempt): the verified OTP proves
          // ownership of the email, so set the password and confirm it
          const existingUser = await findAuthUserByEmail(supabaseAdmin, cleanEmail);
          if (!existingUser) {
            console.error('[verify-otp] Create user error:', createError);
            return NextResponse.json({ success: false, error: createError.message }, { status: 400 });
          }
          userId = existingUser.id;
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password, email_confirm: true });
        }

        const role = userId
          ? await ensureProfile(supabaseAdmin, userId, cleanEmail, cleanName, assignedRole, assignedDept)
          : assignedRole;

        return NextResponse.json({
          success: true,
          message: 'Account verified and created successfully.',
          role,
        });
      } catch (err: any) {
        console.error('[verify-otp] Signup processing error:', err);
        return NextResponse.json(
          { success: false, error: err?.message || 'Failed to complete registration.' },
          { status: 500 }
        );
      }
    }

    // 3. PASSWORD RESET: hand back a short-lived token that /api/update-password requires
    if (purpose === 'password_reset') {
      const targetUser = await findAuthUserByEmail(supabaseAdmin, cleanEmail);
      if (!targetUser) {
        return NextResponse.json(
          { success: false, error: 'User account not found for password reset.' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Recovery OTP verified successfully.',
        resetToken: issueResetToken(cleanEmail),
      });
    }

    // 4. LOGIN / OAUTH FIRST-TIME VERIFICATION: create the profile if the account has none yet
    let role = assignedRole;
    try {
      const targetUser = await findAuthUserByEmail(supabaseAdmin, cleanEmail);
      if (targetUser) {
        role = await ensureProfile(supabaseAdmin, targetUser.id, cleanEmail, cleanName, assignedRole, assignedDept);
      }
    } catch {}

    // Google sign-ins already hold a Supabase session: a verified login code completes two-factor
    // login for that session (only if it belongs to the same account)
    if (purpose === 'login' || purpose === 'oauth_signup') {
      const caller = await getSessionUser(request);
      if (caller && caller.email === cleanEmail && caller.sessionId) {
        await markSessionVerified(caller.sessionId, caller.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully.',
      role,
    });
  } catch (err: any) {
    console.error('[verify-otp] Server error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error during OTP verification.' },
      { status: 500 }
    );
  }
}
