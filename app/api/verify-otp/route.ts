import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAndConsumeOtp } from '@/lib/otpStore';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhkpqacieloefhzrciae.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface VerifyOtpRequestBody {
  email?: string;
  otpCode?: string;
  purpose?: 'signup' | 'password_reset' | 'oauth_signup' | 'login' | 'verification';
  name?: string;
  password?: string;
  newPassword?: string;
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

    const { email, otpCode, purpose, name, password, newPassword } = body;

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

    // 1. Verify and consume OTP from the server store
    const verification = verifyAndConsumeOtp(cleanEmail, cleanOtp);

    if (!verification.valid) {
      return NextResponse.json(
        { success: false, error: verification.error || 'Invalid or expired OTP code.' },
        { status: 400 }
      );
    }

    // 2. Initialize Supabase Admin Client for database and user operations
    const supabaseAdmin = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })
      : null;

    // Resolve Role: check allowlist for TECHNICIAN, root check for ADMIN, default STUDENT
    let assignedRole = 'STUDENT';
    if (cleanEmail === 'labadmin@gmail.com' || cleanEmail === 'labadmin@campus.edu') {
      assignedRole = 'ADMIN';
    } else if (supabaseAdmin) {
      try {
        const { data: wl } = await supabaseAdmin
          .from('whitelisted_technicians')
          .select('email')
          .eq('email', cleanEmail)
          .maybeSingle();
        if (wl) assignedRole = 'TECHNICIAN';
      } catch {}
    }

    const cleanName = (name || verification.metadata?.name || '').trim() || cleanEmail.split('@')[0];

    // 3. Handle SIGNUP Purpose (Create / activate confirmed account directly)
    if (purpose === 'signup' && password && supabaseAdmin) {
      try {
        // Try creating user with auto-confirmed email (bypasses Supabase email provider entirely)
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password,
          email_confirm: true,
          user_metadata: {
            name: cleanName,
            full_name: cleanName,
            role: assignedRole,
            department: 'Undergraduate Engineering',
          },
        });

        let userId = userData?.user?.id;

        if (createError) {
          // If user already exists (e.g. unconfirmed from earlier attempt), find and update their password & confirm email
          const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = usersList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);

          if (existingUser) {
            userId = existingUser.id;
            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
              password,
              email_confirm: true,
              user_metadata: {
                name: cleanName,
                full_name: cleanName,
                role: assignedRole,
                department: 'Undergraduate Engineering',
              },
            });
          } else {
            console.error('[verify-otp] Create user error:', createError);
            return NextResponse.json(
              { success: false, error: createError.message },
              { status: 400 }
            );
          }
        }

        // Upsert public.profiles and public.users tables
        if (userId) {
          try {
            await supabaseAdmin.from('profiles').upsert({
              id: userId,
              email: cleanEmail,
              name: cleanName,
              role: assignedRole,
              avatar: cleanName.substring(0, 2).toUpperCase(),
              department: 'Undergraduate Engineering',
            });
          } catch {}

          try {
            await supabaseAdmin.from('users').upsert({
              id: userId,
              email: cleanEmail,
              full_name: cleanName,
              role: assignedRole,
            });
          } catch {}
        }

        return NextResponse.json({
          success: true,
          message: 'Account verified and created successfully.',
          role: assignedRole,
        });
      } catch (err: any) {
        console.error('[verify-otp] Signup processing error:', err);
        return NextResponse.json(
          { success: false, error: err?.message || 'Failed to complete registration.' },
          { status: 500 }
        );
      }
    }

    // 4. Handle PASSWORD RESET Purpose
    if ((purpose === 'password_reset' || newPassword) && supabaseAdmin) {
      try {
        const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
        const targetUser = usersList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);

        if (!targetUser) {
          return NextResponse.json(
            { success: false, error: 'User account not found for password reset.' },
            { status: 404 }
          );
        }

        if (newPassword) {
          const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
            password: newPassword,
          });

          if (updateErr) {
            return NextResponse.json(
              { success: false, error: updateErr.message },
              { status: 400 }
            );
          }

          return NextResponse.json({
            success: true,
            message: 'Password updated successfully. You can now sign in.',
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Recovery OTP verified successfully.',
        });
      } catch (err: any) {
        console.error('[verify-otp] Password reset processing error:', err);
        return NextResponse.json(
          { success: false, error: err?.message || 'Failed to process password reset.' },
          { status: 500 }
        );
      }
    }

    // 5. General Verification (OAuth first-time login / activation)
    if (supabaseAdmin) {
      try {
        const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
        const targetUser = usersList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);

        if (targetUser) {
          try {
            await supabaseAdmin.from('profiles').upsert({
              id: targetUser.id,
              email: cleanEmail,
              name: cleanName,
              role: assignedRole,
              avatar: cleanName.substring(0, 2).toUpperCase(),
              department: 'Undergraduate Engineering',
            });
          } catch {}

          try {
            await supabaseAdmin.from('users').upsert({
              id: targetUser.id,
              email: cleanEmail,
              full_name: cleanName,
              role: assignedRole,
            });
          } catch {}
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully.',
      role: assignedRole,
    });
  } catch (err: any) {
    console.error('[verify-otp] Server error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error during OTP verification.' },
      { status: 500 }
    );
  }
}
