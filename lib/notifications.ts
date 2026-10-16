import { getServiceClient } from '@/lib/serverAuth';

// Server-only: create in-app notifications for users when something happens to their
// report, repair or payment. Never throws — a failed notification must not break the action.

export type NotificationCategory = 'TICKET' | 'REPAIR' | 'PAYMENT';

export interface NotifyInput {
  /** Recipient account id; when missing, resolved from `email` via profiles */
  userId?: string | null;
  email?: string | null;
  category: NotificationCategory;
  /** Short line for the bell */
  title: string;
  /** Full details for the Notifications tab */
  message: string;
  /** Student portal tab to open when clicked */
  linkTab?: string;
  /** Ticket id or job order number */
  refId?: string;
}

export async function notifyUser(input: NotifyInput): Promise<void> {
  try {
    const supabase = getServiceClient();
    if (!supabase) return;

    let userId = input.userId || null;
    if (!userId && input.email) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', input.email.trim().toLowerCase())
        .maybeSingle();
      userId = data?.id || null;
    }
    if (!userId) return;

    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      category: input.category,
      title: input.title.slice(0, 160),
      message: input.message.slice(0, 1000),
      link_tab: input.linkTab || null,
      ref_id: input.refId || null,
    });
    if (error) console.warn('[notifications] insert failed:', error.message);
  } catch (err) {
    console.warn('[notifications] notifyUser error:', err);
  }
}

const peso = (n: number) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export { peso as formatPeso };

/**
 * Title + message for a repair job moving to a new status. Only the milestones the client acts on
 * are notified (null = no notification): confirmed (with the appointment), ready for pickup,
 * completed, declined.
 */
export function repairStatusNotification(
  status: string,
  ctx: {
    rma: string;
    device: string;
    location?: string | null;
    appointment?: { date: string | null; time: string | null; location: string | null } | null;
  }
): { title: string; message: string } | null {
  const { rma, device } = ctx;
  switch (status) {
    case 'CONFIRMED': {
      const appt = ctx.appointment;
      let when = '';
      if (appt?.date) {
        const d = new Date(`${appt.date}T${appt.time || '00:00'}`);
        const dateText = isNaN(d.getTime())
          ? appt.date
          : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const timeText = appt.time && !isNaN(d.getTime())
          ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : '';
        when = ` Appointment: ${dateText}${timeText ? ` at ${timeText}` : ''}${appt.location ? `, ${appt.location}` : ''}.`;
      }
      return {
        title: `${rma}: job order confirmed`,
        message: `Your ${device} has been evaluated and job order ${rma} is confirmed.${when}`,
      };
    }
    case 'READY_FOR_PICKUP':
      return {
        title: `${rma}: ready for pickup`,
        message: `Your ${device} (job order ${rma}) is repaired and ready for pickup${ctx.location ? ` at ${ctx.location}` : ''}.`,
      };
    case 'COMPLETED':
      return {
        title: `${rma}: repair completed`,
        message: `Job order ${rma} is complete and your ${device} has been released. Thank you!`,
      };
    case 'CANCELLED':
      return {
        title: `${rma}: request declined`,
        message: `Your repair request for the ${device} (job order ${rma}) was declined or cancelled. Contact the repair desk for details.`,
      };
    default:
      return null;
  }
}
