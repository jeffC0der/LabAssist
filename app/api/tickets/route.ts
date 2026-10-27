import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { type Ticket, type TicketStatus } from '@/lib/mockData';
import { requireAuth, STAFF_ROLES } from '@/lib/serverAuth';
import { notifyUser } from '@/lib/notifications';
import { errorResponse, readJson, reqStr, optStr, oneOf, optOneOf, optDate, PATTERNS } from '@/lib/validation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhkpqacieloefhzrciae.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  const key = serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) return null;
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function extractTicketMeta(rawDesc: string): { cleanDesc: string; userId?: string; userEmail?: string } {
  if (!rawDesc) return { cleanDesc: '' };
  const match = rawDesc.match(/<!--LABASSIST_TKT_META:(.*?)-->/);
  if (match) {
    try {
      const meta = JSON.parse(match[1]);
      const cleanDesc = rawDesc.replace(/<!--LABASSIST_TKT_META:(.*?)-->/g, '').trim();
      return { cleanDesc, userId: meta.userId, userEmail: meta.userEmail };
    } catch {
      return { cleanDesc: rawDesc.replace(/<!--LABASSIST_TKT_META:(.*?)-->/g, '').trim() };
    }
  }
  return { cleanDesc: rawDesc };
}

// Convert DB row to frontend Ticket interface
function rowToTicket(row: any): Ticket {
  const { cleanDesc, userId, userEmail } = extractTicketMeta(row.description || '');
  let resolvedStatus: TicketStatus = row.status;
  if (row.status !== 'RESOLVED' && (row.notes === 'STATUS_OVERRIDE:UNDER_REPAIR' || row.notes === 'UNDER_REPAIR' || row.description?.includes('<!--LABASSIST_STATUS:UNDER_REPAIR-->'))) {
    resolvedStatus = 'UNDER_REPAIR';
  }

  return {
    ticket_id: row.ticket_id,
    lab_id: row.lab_id,
    pc_num: row.pc_num,
    category: row.category,
    key: row.key,
    timestamp: row.created_at || new Date().toISOString(),
    status: resolvedStatus,
    reporter: row.reporter,
    description: cleanDesc.replace(/<!--LABASSIST_STATUS:UNDER_REPAIR-->/g, '').trim(),
    priority: row.priority,
    assignee: row.assignee || undefined,
    resolvedAt: row.resolved_at || undefined,
    notes: (row.notes === 'STATUS_OVERRIDE:UNDER_REPAIR' || row.notes === 'UNDER_REPAIR') ? undefined : (row.notes || undefined),
    userId: userId || row.user_id || undefined,
    userEmail: userEmail || row.user_email || undefined,
  };
}

// Convert frontend Ticket interface to DB row
function ticketToRow(ticket: Ticket) {
  let descriptionWithMeta = ticket.description;
  if (ticket.userId || ticket.userEmail) {
    const metaPayload = JSON.stringify({ userId: ticket.userId, userEmail: ticket.userEmail });
    descriptionWithMeta = `${ticket.description.replace(/<!--LABASSIST_TKT_META:(.*?)-->/g, '').trim()}\n<!--LABASSIST_TKT_META:${metaPayload}-->`;
  }

  return {
    ticket_id: ticket.ticket_id,
    lab_id: ticket.lab_id,
    pc_num: ticket.pc_num,
    category: ticket.category,
    key: ticket.key,
    priority: ticket.priority,
    status: ticket.status,
    reporter: ticket.reporter,
    description: descriptionWithMeta,
    assignee: ticket.assignee || null,
    notes: ticket.notes || null,
    resolved_at: ticket.resolvedAt || null,
    created_at: ticket.timestamp || new Date().toISOString(),
  };
}

// ── GET: Fetch all tickets ──
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase tickets query error:', error.message);
      return NextResponse.json({ error: 'Could not load tickets.' }, { status: 500 });
    }

    // Never seed placeholder tickets into the database: an empty table means no incidents yet
    const allTickets: Ticket[] = (data || []).map(rowToTicket);

    // Staff see everything. Students see their own tickets in full, and only the workstation
    // status details (no reporter identity, description or notes) for everyone else's.
    const me = auth.user;
    const isOwn = (t: Ticket) =>
      (!!t.userId && t.userId === me.id) ||
      (!!t.userEmail && t.userEmail.trim().toLowerCase() === me.email) ||
      (!t.userId && !t.userEmail && (t.reporter || '').trim().toLowerCase() === me.name.trim().toLowerCase());
    const tickets = STAFF_ROLES.includes(me.role)
      ? allTickets
      : allTickets.map((t) =>
          isOwn(t)
            ? t
            : { ...t, reporter: 'Another user', description: '', notes: undefined, userId: undefined, userEmail: undefined }
        );

    return NextResponse.json({ tickets });
  } catch (err: any) {
    console.error('Error fetching tickets:', err);
    return NextResponse.json({ error: 'Could not load tickets.' }, { status: 500 });
  }
}

// ── POST: Create new ticket & update workstation status to UNDER_REPAIR ──
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const supabase = getSupabaseAdmin();

  try {
    const body = await readJson(request);
    const raw = body.ticket;
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Missing required ticket fields' }, { status: 400 });
    }
    const ticket: Ticket = {
      ...raw,
      ticket_id: reqStr(raw.ticket_id, 'Ticket ID', { max: 30, pattern: PATTERNS.ticketId }),
      lab_id: reqStr(String(raw.lab_id || '').toUpperCase(), 'Room', { max: 20, pattern: PATTERNS.labCode }),
      pc_num: reqStr(raw.pc_num, 'PC number', { max: 10, pattern: PATTERNS.pcNum }),
      category: oneOf(raw.category, 'Category', ['DISPLAY', 'PERIPHERALS', 'POWER/UPS', 'NET/SOFTWARE'] as const),
      key: oneOf(raw.key, 'Key', ['A', 'B', 'C', 'D'] as const),
      priority: optOneOf(raw.priority, 'Priority', ['LOW', 'MEDIUM', 'HIGH'] as const) || 'MEDIUM',
      status: 'PENDING', // new reports always start pending
      reporter: reqStr(raw.reporter, 'Reporter', { max: 80 }),
      description: reqStr(raw.description, 'Description', { max: 1000 }),
      timestamp: optDate(raw.timestamp, 'Timestamp') || new Date().toISOString(),
      assignee: undefined,
      resolvedAt: undefined,
      notes: undefined,
      // The reporter is always the signed-in account (no filing tickets on someone else's behalf)
      userId: auth.user.id,
      userEmail: auth.user.email,
    };

    if (supabase) {
      // 1. Insert into tickets table. Plain insert (never upsert) so a report can't overwrite an
      //    existing ticket; if the ID is already taken, pick a fresh one and retry.
      let insertErr: any = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        ({ error: insertErr } = await supabase.from('tickets').insert(ticketToRow(ticket)));
        if (insertErr?.code !== '23505') break;
        const digits = attempt < 3 ? 4 : 6;
        ticket.ticket_id = `TKT-${Math.floor(10 ** (digits - 1) + Math.random() * 9 * 10 ** (digits - 1))}`;
      }
      if (insertErr) {
        console.error('Supabase ticket insert error:', insertErr);
        return NextResponse.json({ error: 'Could not save the ticket. Please try again.' }, { status: 500 });
      }

      // 2. Mark workstation as ISSUE_REPORTED (will become UNDER_REPAIR once dispatched)
      await supabase
        .from('workstations')
        .update({
          status: 'ISSUE_REPORTED',
          active_issue: `${ticket.category} issue reported (${ticket.ticket_id})`,
        })
        .match({ lab_code: ticket.lab_id, pc_num: ticket.pc_num });
    }

    return NextResponse.json({ success: true, ticket });
  } catch (err: any) {
    console.error('Ticket POST handler error:', err);
    return errorResponse(err, 'api/tickets');
  }
}

// ── PATCH: Update ticket (dispatch / resolve) & update workstation status ──
export async function PATCH(request: Request) {
  const auth = await requireAuth(request, STAFF_ROLES);
  if (auth.response) return auth.response;

  const supabase = getSupabaseAdmin();

  try {
    const body = await readJson(request);
    const ticketId = reqStr(body.ticketId, 'Ticket ID', { max: 30, pattern: PATTERNS.ticketId });
    const status = oneOf(body.status, 'Status', ['PENDING', 'DISPATCHED', 'UNDER_REPAIR', 'RESOLVED'] as const);
    const assignee = optStr(body.assignee, 'Assignee', { max: 80 });
    const notes = optStr(body.notes, 'Notes', { max: 1000 });
    const resolvedAt = optDate(body.resolvedAt, 'Resolved at');
    const labId = body.labId === undefined ? undefined : reqStr(String(body.labId).toUpperCase(), 'Room', { max: 20, pattern: PATTERNS.labCode });
    const pcNum = body.pcNum === undefined ? undefined : reqStr(body.pcNum, 'PC number', { max: 10, pattern: PATTERNS.pcNum });

    if (supabase) {
      const updates: any = { status };
      if (assignee !== undefined) updates.assignee = assignee;
      if (notes !== undefined) {
        updates.notes = notes;
      } else if (status === 'RESOLVED' || status === 'DISPATCHED') {
        // Clear any previous STATUS_OVERRIDE
        updates.notes = null;
      }
      if (resolvedAt !== undefined) updates.resolved_at = resolvedAt;
      else if (status === 'RESOLVED') updates.resolved_at = new Date().toISOString();

      let targetLab = labId;
      let targetPc = pcNum;
      let targetAssignee = assignee;
      let targetCategory = 'Hardware';
      let existingTicketRow: any = null;

      // Pre-lookup ticket to get exact lab and PC
      try {
        const { data: existingTicket } = await supabase
          .from('tickets')
          .select('*')
          .eq('ticket_id', ticketId)
          .single();

        if (existingTicket) {
          existingTicketRow = existingTicket;
          targetLab = targetLab || existingTicket.lab_id;
          targetPc = targetPc || existingTicket.pc_num;
          targetAssignee = targetAssignee || existingTicket.assignee;
          targetCategory = existingTicket.category || targetCategory;
        }
      } catch (e) {
        console.warn('Ticket lookup notice:', e);
      }

      // Try updating tickets table
      try {
        const { error: updateErr } = await supabase
          .from('tickets')
          .update(updates)
          .eq('ticket_id', ticketId);

        if (updateErr) {
          if (updateErr.code === '23514' && status === 'UNDER_REPAIR') {
            // Constraint in remote DB does not yet include UNDER_REPAIR: gracefully update notes override
            console.warn('Notice: Remote tickets table check constraint does not yet include UNDER_REPAIR. Storing via fallback metadata.');
            await supabase
              .from('tickets')
              .update({
                status: 'DISPATCHED',
                notes: 'STATUS_OVERRIDE:UNDER_REPAIR',
                ...(assignee ? { assignee } : {}),
              })
              .eq('ticket_id', ticketId);
          } else {
            console.error('Supabase ticket update error:', updateErr);
          }
        }
      } catch (err) {
        console.error('Ticket update error:', err);
      }

      // ALWAYS update corresponding workstation in Supabase workstations table!
      if (targetLab && targetPc) {
        const techName = targetAssignee || 'Technician';
        const numOnly = parseInt(targetPc.replace(/\D/g, ''), 10);
        const paddedPc = !isNaN(numOnly) ? `PC-${numOnly.toString().padStart(2, '0')}` : targetPc;
        const unpaddedPc = !isNaN(numOnly) ? `PC-${numOnly.toString()}` : targetPc;

        if (status === 'DISPATCHED') {
          await supabase
            .from('workstations')
            .update({
              status: 'ISSUE_REPORTED',
              active_issue: `${targetCategory} issue reported (${ticketId}) · Dispatched: ${techName}`,
            })
            .match({ lab_code: targetLab, pc_num: targetPc });
          if (paddedPc !== targetPc) {
            await supabase.from('workstations').update({ status: 'ISSUE_REPORTED' }).match({ lab_code: targetLab, pc_num: paddedPc });
          }
          if (unpaddedPc !== targetPc) {
            await supabase.from('workstations').update({ status: 'ISSUE_REPORTED' }).match({ lab_code: targetLab, pc_num: unpaddedPc });
          }
        } else if (status === 'UNDER_REPAIR') {
          await supabase
            .from('workstations')
            .update({
              status: 'UNDER_REPAIR',
              active_issue: `${targetCategory} repair confirmed in progress (${ticketId}) · ${techName}`,
            })
            .match({ lab_code: targetLab, pc_num: targetPc });
          if (paddedPc !== targetPc) {
            await supabase.from('workstations').update({ status: 'UNDER_REPAIR', active_issue: `${targetCategory} repair confirmed in progress (${ticketId}) · ${techName}` }).match({ lab_code: targetLab, pc_num: paddedPc });
          }
          if (unpaddedPc !== targetPc) {
            await supabase.from('workstations').update({ status: 'UNDER_REPAIR', active_issue: `${targetCategory} repair confirmed in progress (${ticketId}) · ${techName}` }).match({ lab_code: targetLab, pc_num: unpaddedPc });
          }
        } else if (status === 'RESOLVED') {
          await supabase
            .from('workstations')
            .update({
              status: 'ONLINE',
              active_issue: null,
            })
            .match({ lab_code: targetLab, pc_num: targetPc });
          if (paddedPc !== targetPc) {
            await supabase.from('workstations').update({ status: 'ONLINE', active_issue: null }).match({ lab_code: targetLab, pc_num: paddedPc });
          }
          if (unpaddedPc !== targetPc) {
            await supabase.from('workstations').update({ status: 'ONLINE', active_issue: null }).match({ lab_code: targetLab, pc_num: unpaddedPc });
          }
        }
      }

      // Tell the student who reported it — two notifications per report: technician assigned, and resolved
      // (only when the status actually changed)
      if (existingTicketRow) {
        const previous = rowToTicket(existingTicketRow);
        if (previous.status !== status) {
          const tech = targetAssignee || 'A technician';
          const where = `${targetLab || previous.lab_id} ${targetPc || previous.pc_num}`;
          const resolvedNote = typeof notes === 'string' && notes.trim() ? ` Technician note: ${notes.trim()}` : '';
          const content =
            status === 'DISPATCHED'
              ? { title: `Technician assigned to ${ticketId}`, message: `${tech} has been assigned to your ${targetCategory} report for ${where}.` }
              : status === 'RESOLVED'
              ? { title: `Issue resolved: ${ticketId}`, message: `Your ${targetCategory} issue on ${where} has been resolved.${resolvedNote}` }
              : null;
          if (content) {
            await notifyUser({
              userId: previous.userId,
              email: previous.userEmail,
              category: 'TICKET',
              ...content,
              linkTab: 'SUBMIT_TICKET',
              refId: ticketId,
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, ticketId, status, assignee });
  } catch (err: any) {
    console.error('Ticket PATCH handler error:', err);
    return errorResponse(err, 'api/tickets');
  }
}
