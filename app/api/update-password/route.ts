import { NextResponse } from 'next/server';
import { getServiceClient, findAuthUserByEmail } from '@/lib/serverAuth';
import { verifyResetToken, resetTokenIssuedAt } from '@/lib/resetToken';
import { resetLockout } from '@/lib/lockoutStore';
import { errorResponse } from '@/lib/validation';

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

    if (typeof resetToken !== 'string' || resetToken.length > 2048 || (newPassword !== undefined && typeof newPassword !== 'string')) {
      return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
    }

    const cleanEmail = verifyResetToken(resetToken);
    if (!cleanEmail) {
      return NextResponse.json(
        { success: false, error: 'Your password reset session has expired. Please request a new recovery code.' },
        { status: 401 }
      );
    }

    if (!newPassword || newPassword.length < 16 || newPassword.length > 128) {
      return NextResponse.json(
        { success: false, error: 'New password must be 16 to 128 characters.' },
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
    const targetUser = await findAuthUserByEmail(supabaseAdmin, cleanEmail);

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User account not found. Please ensure you are registered.' },
        { status: 404 }
      );
    }

    // Each reset link works once: a link issued before the last completed reset is spent
    const lastResetAt = Number(targetUser.app_metadata?.password_reset_at || 0);
    if (resetTokenIssuedAt(resetToken) <= lastResetAt) {
      return NextResponse.json(
        { success: false, error: 'This password reset has already been used. Please request a new recovery code.' },
        { status: 401 }
      );
    }

    // Update the password
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
      password: newPassword,
      app_metadata: { ...targetUser.app_metadata, password_reset_at: Date.now() },
    });

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 400 });
    }

    // A completed reset also clears any login lockout on the account
    await resetLockout(cleanEmail);

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    console.error('[update-password] Error:', err);
    return errorResponse(err, 'api/update-password');
  }
}
