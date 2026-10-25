import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyAndConsumeOtp } from '@/lib/otpStore';
import { getServiceClient, getSessionUser, markSessionVerified } from '@/lib/serverAuth';
import { issueResetToken } from '@/lib/resetToken';
import { reqEmail, reqStr, optStr, optOneOf, PATTERNS, ValidationError, errorResponse } from '@/lib/validation';

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

    let cleanEmail: string, cleanOtp: string, purpose: VerifyOtpRequestBody['purpose'] & string, name: string | undefined, password: string | undefined;
    try {
      cleanEmail = reqEmail(body.email);
      cleanOtp = reqStr(body.otpCode, 'Verification code', { max: 6, pattern: PATTERNS.sixDigits, patternMessage: 'Enter the 6-digit code.' });
      purpose = optOneOf(body.purpose, 'purpose', ['signup', 'password_reset', 'oauth_signup', 'login', 'verification'] as const) || 'verification';
      name = optStr(body.name, 'Name', { max: 80 });
      if (body.password !== undefined && body.password !== null) {
        if (typeof body.password !== 'string' || body.password.length < 6 || body.password.length > 128) {
          throw new ValidationError('Password must be between 6 and 128 characters.');
        }
        password = body.password;
      }
    } catch (err) {
      return errorResponse(err, 'verify-otp');
    }

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
        return errorResponse(err, 'api/verify-otp');
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
      // Staff complete sign-in with their authenticator app only, never an emailed code
      if (caller && caller.email === cleanEmail && caller.sessionId && caller.role === 'STUDENT') {
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
    return errorResponse(err, 'api/verify-otp');
  }
}
