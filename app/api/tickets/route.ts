import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MOCK_TICKETS, type Ticket } from '@/lib/mockData';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhkpqacieloefhzrciae.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Convert DB row to frontend Ticket interface
function rowToTicket(row: any): Ticket {
  return {
    ticket_id: row.ticket_id,
    lab_id: row.lab_id,
    pc_num: row.pc_num,
    category: row.category,
    key: row.key,
    timestamp: row.created_at || new Date().toISOString(),
    status: row.status,
    reporter: row.reporter,
    description: row.description,
    priority: row.priority,
    assignee: row.assignee || undefined,
    resolvedAt: row.resolved_at || undefined,
    notes: row.notes || undefined,
  };
}

// Convert frontend Ticket interface to DB row
function ticketToRow(ticket: Ticket) {
  return {
    ticket_id: ticket.ticket_id,
    lab_id: ticket.lab_id,
    pc_num: ticket.pc_num,
    category: ticket.category,
    key: ticket.key,
    priority: ticket.priority,
    status: ticket.status,
    reporter: ticket.reporter,
    description: ticket.description,
    assignee: ticket.assignee || null,
    notes: ticket.notes || null,
    resolved_at: ticket.resolvedAt || null,
    created_at: ticket.timestamp || new Date().toISOString(),
  };
}

// ── GET: Fetch all tickets (seeds DB with initial tickets if empty) ──
export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ tickets: MOCK_TICKETS });
  }

  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase tickets query warning:', error.message);
      return NextResponse.json({ tickets: MOCK_TICKETS });
    }

    // If table is empty, seed with default mock tickets
    if (!data || data.length === 0) {
      try {
        const rowsToInsert = MOCK_TICKETS.map(ticketToRow);
        await supabase.from('tickets').insert(rowsToInsert);
        return NextResponse.json({ tickets: MOCK_TICKETS });
      } catch (seedErr) {
        console.warn('Failed to auto-seed tickets table:', seedErr);
        return NextResponse.json({ tickets: MOCK_TICKETS });
      }
    }

    const tickets: Ticket[] = data.map(rowToTicket);
    return NextResponse.json({ tickets });
  } catch (err: any) {
    console.error('Error fetching tickets:', err);
    return NextResponse.json({ tickets: MOCK_TICKETS });
  }
}

// ── POST: Create new ticket & update workstation status to UNDER_REPAIR ──
export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const ticket: Ticket = body.ticket;

    if (!ticket || !ticket.ticket_id || !ticket.lab_id || !ticket.pc_num) {
      return NextResponse.json({ error: 'Missing required ticket fields' }, { status: 400 });
    }

    if (supabase) {
      // 1. Insert into tickets table
      const row = ticketToRow(ticket);
      const { error: insertErr } = await supabase
        .from('tickets')
        .upsert(row, { onConflict: 'ticket_id' });

      if (insertErr) {
        console.error('Supabase ticket insert error:', insertErr);
      }

      // 2. Mark workstation as UNDER_REPAIR
      await supabase
        .from('workstations')
        .update({
          status: 'UNDER_REPAIR',
          active_issue: `${ticket.category} issue (${ticket.ticket_id})`,
        })
        .match({ lab_code: ticket.lab_id, pc_num: ticket.pc_num });
    }

    return NextResponse.json({ success: true, ticket });
  } catch (err: any) {
    console.error('Ticket POST handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH: Update ticket (dispatch / resolve) & update workstation status ──
export async function PATCH(request: Request) {
  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const { ticketId, status, assignee, notes, resolvedAt } = body;

    if (!ticketId || !status) {
      return NextResponse.json({ error: 'ticketId and status are required' }, { status: 400 });
    }

    if (supabase) {
      const updates: any = { status };
      if (assignee !== undefined) updates.assignee = assignee;
      if (notes !== undefined) updates.notes = notes;
      if (resolvedAt !== undefined) updates.resolved_at = resolvedAt;
      else if (status === 'RESOLVED') updates.resolved_at = new Date().toISOString();

      const { data: updatedRows, error: updateErr } = await supabase
        .from('tickets')
        .update(updates)
        .eq('ticket_id', ticketId)
        .select('*');

      if (updateErr) {
        console.error('Supabase ticket update error:', updateErr);
      }

      // If resolved, update corresponding workstation back to ONLINE
      if (status === 'RESOLVED' && updatedRows && updatedRows.length > 0) {
        const row = updatedRows[0];
        await supabase
          .from('workstations')
          .update({
            status: 'ONLINE',
            active_issue: null,
          })
          .match({ lab_code: row.lab_id, pc_num: row.pc_num });
      }
    }

    return NextResponse.json({ success: true, ticketId, status, assignee });
  } catch (err: any) {
    console.error('Ticket PATCH handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
