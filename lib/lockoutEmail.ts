import { BrevoClient } from '@getbrevo/brevo';
import { generateAccountLockedEmailHtml } from '@/lib/emailTemplates';
import { decrypt } from '@/lib/aes';

/**
 * Sends a Brevo security email notifying the user that their account has been temporarily locked.
 */
export async function dispatchBrevoLockoutEmail(
  cleanEmail: string,
  lockedUntilMs: number,
  recipientName?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    let apiKey: string;
    try {
      const encKey = process.env.BREVO_API_KEY_ENC;
      if (!encKey) throw new Error('BREVO_API_KEY_ENC is not set');
      apiKey = decrypt(encKey);
    } catch (err: any) {
      console.warn('[lockout] Failed to decrypt Brevo API key:', err?.message);
      return { success: false, error: 'Brevo API key could not be decrypted' };
    }

    const brevo = new BrevoClient({
      apiKey: apiKey.trim(),
    });

    const sender = {
      name: 'UMakLabAssist Security',
      email: 'umak.labassist@gmail.com',
    };

    const lockedUntilDate = new Date(lockedUntilMs);
    const htmlContent = generateAccountLockedEmailHtml(
      cleanEmail,
      lockedUntilDate,
      15,
      recipientName
    );

    const textContent = `Security Alert: Your UMakLabAssist account (${cleanEmail}) has been locked for 15 minutes due to 6 consecutive failed password attempts. It will automatically unlock at ${lockedUntilDate.toLocaleTimeString()}. If you did not make these attempts, please reset your password once unlocked.`;

    const sendResponse = await brevo.transactionalEmails.sendTransacEmail({
      sender,
      to: [{ email: cleanEmail }],
      subject: 'Security Alert: Your Account Has Been Temporarily Locked - UMakLabAssist',
      htmlContent,
      textContent,
    });

    const messageId =
      sendResponse.messageId ||
      (sendResponse.messageIds && sendResponse.messageIds[0]) ||
      undefined;

    console.log(`[lockout] Brevo lockout email sent successfully to ${cleanEmail}, messageId: ${messageId}`);
    return { success: true, messageId };
  } catch (error: any) {
    const errorMessage = error?.body?.message || error?.message || 'Failed to dispatch lockout email via Brevo';
    console.error('[lockout] Brevo email dispatch error:', {
      error: errorMessage,
      details: error?.body || error,
    });
    return { success: false, error: errorMessage };
  }
}
