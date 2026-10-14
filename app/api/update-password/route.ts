import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/serverAuth';
import { verifyResetToken } from '@/lib/resetToken';
import { resetLockout } from '@/lib/lockoutStore';

// Sets a new password after a verified password-reset OTP.
// Requires the resetToken returned by /api/verify-otp (purpose: password_reset).
export async function POST(request: Request) {
  try {
    let body: { resetToken?: string; newPassword?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const { resetToken, newPassword } = body;

    const cleanEmail = verifyResetToken(resetToken || '');
    if (!cleanEmail) {
      return NextResponse.json(
        { success: false, error: 'Your password reset session has expired. Please request a new recovery code.' },
        { status: 401 }
      );
    }

    if (!newPassword || newPassword.length < 16) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 16 characters.' },
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

    // Find the user by email
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = usersList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User account not found. Please ensure you are registered.' },
        { status: 404 }
      );
    }

    // Update the password
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
      password: newPassword,
    });

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 400 });
    }

    // A completed reset also clears any login lockout on the account
    await resetLockout(cleanEmail);

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    console.error('[update-password] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
