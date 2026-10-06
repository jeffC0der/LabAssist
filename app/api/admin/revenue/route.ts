import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uhkpqacieloefhzrciae.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  const key = serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) return null;
  return createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface PaymentRecord {
  id: string;
  paymentNumber: string;
  invoiceNumber?: string;
  jobOrderNumber?: string;
  clientName: string;
  clientEmail?: string;
  technicianName: string;
  amount: number;
  paymentMethod: 'CASH' | 'ONLINE' | 'GCASH' | 'MAYA' | 'BANK_TRANSFER';
  paymentStatus: 'PAID' | 'UNPAID' | 'PENDING' | 'REFUNDED';
  referenceNumber?: string;
  notes?: string;
  paymentDate: string;
  createdAt?: string;
}

function rowToPayment(row: any): PaymentRecord {
  return {
    id: row.id,
    paymentNumber: row.payment_number || `PAY-${row.id.slice(0, 8)}`,
    invoiceNumber: row.invoice_number || row.invoices?.invoice_number || undefined,
    jobOrderNumber: row.job_order_number || undefined,
    clientName: row.client_name || 'Client',
    clientEmail: row.client_email || undefined,
    technicianName: row.technician_name || 'Assigned Technician',
    amount: Number(row.amount || 0),
    paymentMethod: row.payment_method || 'CASH',
    paymentStatus: row.payment_status || 'PAID',
    referenceNumber: row.reference_number || undefined,
    notes: row.notes || undefined,
    paymentDate: row.payment_date || row.created_at || new Date().toISOString(),
    createdAt: row.created_at || undefined,
  };
}

// ── GET: Return revenue metrics and payment list purely from Supabase ──
export async function GET(request: Request) {
  const supabase = getSupabaseAdmin();
  const payments: PaymentRecord[] = [];
  const seenIds = new Set<string>();

  if (supabase) {
    // 1. Query dedicated public.payments table in Supabase
    try {
      const { data: payRows, error: payErr } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (!payErr && payRows && payRows.length > 0) {
        payRows.forEach((r) => {
          const item = rowToPayment(r);
          payments.push(item);
          seenIds.add(item.paymentNumber);
          if (item.id) seenIds.add(item.id);
        });
      }
    } catch (err) {
      console.warn('Supabase payments table fetch error:', err);
    }

    // 2. Query tickets in Supabase for any billing records stored inside notes or description
    try {
      const { data: ticketRows, error: tickErr } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (!tickErr && ticketRows && ticketRows.length > 0) {
        ticketRows.forEach((t: any) => {
          const raw = `${t.notes || ''}\n${t.description || ''}`;
          
          // Match <!--LABASSIST_BILLING:{...}-->
          const billingMatch = raw.match(/<!--LABASSIST_BILLING:(.*?)-->/);
          if (billingMatch) {
            try {
              const b = JSON.parse(billingMatch[1]);
              const key = b.paymentNumber || b.id;
              if (key && !seenIds.has(key)) {
                payments.push(b);
                seenIds.add(key);
              }
            } catch (_) {}
          }

          // Match <!--LABASSIST_WORKFLOW:{"billing":{...}}-->
          const workflowMatch = raw.match(/<!--LABASSIST_WORKFLOW:(.*?)-->/);
          if (workflowMatch) {
            try {
              const wf = JSON.parse(workflowMatch[1]);
              if (wf.billing && wf.billing.totalAmount && Number(wf.billing.totalAmount) > 0) {
                const billKey = `PAY-${t.ticket_id || t.id}`;
                if (!seenIds.has(billKey)) {
                  payments.push({
                    id: t.id,
                    paymentNumber: billKey,
                    invoiceNumber: `INV-${t.ticket_id}`,
                    jobOrderNumber: t.lab_id && t.pc_num ? `${t.lab_id}-${t.pc_num}` : undefined,
                    clientName: t.reporter || 'UMak Client',
                    clientEmail: t.user_email || undefined,
                    technicianName: t.assignee || 'Tech. Carlos Rivera',
                    amount: Number(wf.billing.totalAmount || 0),
                    paymentMethod: wf.billing.paymentMethod || 'CASH',
                    paymentStatus: wf.billing.paymentStatus || 'PAID',
                    referenceNumber: wf.billing.onlinePaymentReference || undefined,
                    notes: wf.billing.billingNotes || t.description || undefined,
                    paymentDate: wf.billing.settlementDate || t.resolved_at || t.created_at || new Date().toISOString(),
                  });
                  seenIds.add(billKey);
                }
              }
            } catch (_) {}
          }
        });
      }
    } catch (err) {
      console.warn('Supabase tickets billing query error:', err);
    }
  }

  // 1. Calculate Core KPI Cards
  const paidPayments = payments.filter((p) => p.paymentStatus === 'PAID');
  const unpaidPayments = payments.filter((p) => p.paymentStatus === 'UNPAID' || p.paymentStatus === 'PENDING');

  const grossRevenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);
  const unpaidBalances = unpaidPayments.reduce((sum, p) => sum + p.amount, 0);
  const paidCount = paidPayments.length;
  const averageOrderValue = paidCount > 0 ? grossRevenue / paidCount : 0;

  // Split Cash vs Online
  const cashPayments = paidPayments.filter((p) => p.paymentMethod === 'CASH');
  const onlinePayments = paidPayments.filter((p) =>
    ['ONLINE', 'GCASH', 'MAYA', 'BANK_TRANSFER'].includes(p.paymentMethod)
  );

  const cashTotal = cashPayments.reduce((sum, p) => sum + p.amount, 0);
  const onlineTotal = onlinePayments.reduce((sum, p) => sum + p.amount, 0);

  // 2. Technician Performance & Revenue Contribution Table
  const techMap: Record<
    string,
    {
      techName: string;
      completedRepairs: number;
      grossRevenue: number;
      cashRevenue: number;
      onlineRevenue: number;
    }
  > = {};

  paidPayments.forEach((p) => {
    const tech = p.technicianName || 'Tech. Carlos Rivera';
    if (!techMap[tech]) {
      techMap[tech] = {
        techName: tech,
        completedRepairs: 0,
        grossRevenue: 0,
        cashRevenue: 0,
        onlineRevenue: 0,
      };
    }
    techMap[tech].completedRepairs += 1;
    techMap[tech].grossRevenue += p.amount;
    if (p.paymentMethod === 'CASH') {
      techMap[tech].cashRevenue += p.amount;
    } else {
      techMap[tech].onlineRevenue += p.amount;
    }
  });

  const technicianPerformance = Object.values(techMap)
    .map((t) => ({
      ...t,
      averageTicket: t.completedRepairs > 0 ? t.grossRevenue / t.completedRepairs : 0,
      sharePercentage: grossRevenue > 0 ? Math.round((t.grossRevenue / grossRevenue) * 100) : 0,
    }))
    .sort((a, b) => b.grossRevenue - a.grossRevenue);

  // 3. Time Series Chart Data (Daily, Weekly, Monthly)
  // Daily (Past 7 days)
  const dailyMap: Record<string, { label: string; date: string; total: number; cash: number; online: number; count: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600000);
    const key = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
    dailyMap[key] = { label: dayLabel, date: key, total: 0, cash: 0, online: 0, count: 0 };
  }

  paidPayments.forEach((p) => {
    const key = new Date(p.paymentDate).toISOString().split('T')[0];
    if (dailyMap[key]) {
      dailyMap[key].total += p.amount;
      dailyMap[key].count += 1;
      if (p.paymentMethod === 'CASH') {
        dailyMap[key].cash += p.amount;
      } else {
        dailyMap[key].online += p.amount;
      }
    }
  });
  const dailyChart = Object.values(dailyMap);

  // Weekly (Past 4 weeks)
  const weeklyChart = [
    { label: 'Week 1 (3w ago)', total: 0, cash: 0, online: 0, count: 0 },
    { label: 'Week 2 (2w ago)', total: 0, cash: 0, online: 0, count: 0 },
    { label: 'Week 3 (Last Wk)', total: 0, cash: 0, online: 0, count: 0 },
    { label: 'Week 4 (Current)', total: 0, cash: 0, online: 0, count: 0 },
  ];

  const nowMs = Date.now();
  paidPayments.forEach((p) => {
    const pMs = new Date(p.paymentDate).getTime();
    const daysAgo = Math.floor((nowMs - pMs) / (24 * 3600000));
    let idx = 3;
    if (daysAgo >= 21) idx = 0;
    else if (daysAgo >= 14) idx = 1;
    else if (daysAgo >= 7) idx = 2;
    else idx = 3;

    if (weeklyChart[idx]) {
      weeklyChart[idx].total += p.amount;
      weeklyChart[idx].count += 1;
      if (p.paymentMethod === 'CASH') weeklyChart[idx].cash += p.amount;
      else weeklyChart[idx].online += p.amount;
    }
  });

  // Monthly (Past 6 calendar months computed dynamically)
  const monthlyMap: Record<string, { label: string; monthKey: string; total: number; cash: number; online: number; count: number }> = {};
  const currentDate = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    monthlyMap[monthKey] = { label, monthKey, total: 0, cash: 0, online: 0, count: 0 };
  }

  paidPayments.forEach((p) => {
    const pDate = new Date(p.paymentDate);
    const pMonthKey = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyMap[pMonthKey]) {
      monthlyMap[pMonthKey].total += p.amount;
      monthlyMap[pMonthKey].count += 1;
      if (p.paymentMethod === 'CASH') {
        monthlyMap[pMonthKey].cash += p.amount;
      } else {
        monthlyMap[pMonthKey].online += p.amount;
      }
    }
  });
  const monthlyChart = Object.values(monthlyMap);

  return NextResponse.json({
    metrics: {
      grossRevenue,
      unpaidBalances,
      averageOrderValue,
      totalOrders: payments.length,
      paidOrdersCount: paidCount,
      unpaidOrdersCount: unpaidPayments.length,
      cashTotal,
      onlineTotal,
      cashPercentage: grossRevenue > 0 ? Math.round((cashTotal / grossRevenue) * 100) : 0,
      onlinePercentage: grossRevenue > 0 ? Math.round((onlineTotal / grossRevenue) * 100) : 0,
    },
    technicianPerformance,
    charts: {
      daily: dailyChart,
      weekly: weeklyChart,
      monthly: monthlyChart,
    },
    transactions: payments,
    meta: {
      isSupabaseConnected: !!supabase,
      totalRecords: payments.length,
      lastSyncTime: new Date().toISOString(),
    },
  });
}

// ── POST: Record a new revenue payment into Supabase database ──
export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const {
      invoiceNumber,
      jobOrderNumber,
      clientName,
      clientEmail,
      technicianName = 'Tech. Carlos Rivera',
      amount,
      paymentMethod = 'CASH',
      paymentStatus = 'PAID',
      referenceNumber,
      notes,
      paymentDate = new Date().toISOString(),
    } = body;

    if (!clientName || !amount || isNaN(Number(amount))) {
      return NextResponse.json(
        { error: 'Client name and valid payment amount are required' },
        { status: 400 }
      );
    }

    const num = Number(amount);
    const paymentNumber = `PAY-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      paymentNumber,
      invoiceNumber: invoiceNumber || undefined,
      jobOrderNumber: jobOrderNumber || undefined,
      clientName,
      clientEmail: clientEmail || undefined,
      technicianName,
      amount: num,
      paymentMethod,
      paymentStatus,
      referenceNumber: referenceNumber || undefined,
      notes: notes || undefined,
      paymentDate,
    };

    if (supabase) {
      // 1. Try insert into public.payments
      try {
        await supabase.from('payments').insert({
          payment_number: newPayment.paymentNumber,
          invoice_number: newPayment.invoiceNumber || null,
          job_order_number: newPayment.jobOrderNumber || null,
          client_name: newPayment.clientName,
          client_email: newPayment.clientEmail || null,
          technician_name: newPayment.technicianName,
          amount: newPayment.amount,
          payment_method: newPayment.paymentMethod,
          payment_status: newPayment.paymentStatus,
          reference_number: newPayment.referenceNumber || null,
          notes: newPayment.notes || null,
          payment_date: newPayment.paymentDate,
        });
      } catch (insertErr) {
        console.warn('Payment insert into public.payments warning:', insertErr);
      }

      // 2. Persist billing metadata into Supabase tickets table
      try {
        let ticketTarget = null;
        if (jobOrderNumber) {
          const { data: tkt } = await supabase
            .from('tickets')
            .select('*')
            .or(`ticket_id.eq.${jobOrderNumber},id.eq.${jobOrderNumber}`)
            .maybeSingle();
          ticketTarget = tkt;
        }

        if (!ticketTarget && clientEmail) {
          const { data: tkt } = await supabase
            .from('tickets')
            .select('*')
            .ilike('description', `%${clientEmail}%`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          ticketTarget = tkt;
        }

        if (!ticketTarget && clientName) {
          const { data: tkt } = await supabase
            .from('tickets')
            .select('*')
            .ilike('reporter', `%${clientName}%`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          ticketTarget = tkt;
        }

        if (ticketTarget) {
          const existingNotes = ticketTarget.notes || '';
          const cleanNotes = existingNotes.replace(/<!--LABASSIST_BILLING:[\s\S]*?-->/g, '').trim();
          const updatedNotes = cleanNotes
            ? `${cleanNotes}\n<!--LABASSIST_BILLING:${JSON.stringify(newPayment)}-->`
            : `<!--LABASSIST_BILLING:${JSON.stringify(newPayment)}-->`;

          await supabase
            .from('tickets')
            .update({ notes: updatedNotes, status: paymentStatus === 'PAID' ? 'RESOLVED' : ticketTarget.status })
            .eq('id', ticketTarget.id);
        } else {
          // If no existing ticket matched, create a repair ticket with billing in Supabase
          const newTicketId = `TKT-${Math.floor(2000 + Math.random() * 8000)}`;
          await supabase.from('tickets').insert({
            ticket_id: newTicketId,
            lab_id: 'LAB-101',
            pc_num: 'PC-01',
            category: 'DISPLAY',
            key: 'A',
            priority: 'HIGH',
            status: paymentStatus === 'PAID' ? 'RESOLVED' : 'PENDING',
            reporter: clientName,
            assignee: technicianName,
            description: `Repair Service for ${clientName}\n<!--LABASSIST_TKT_META:${JSON.stringify({ userEmail: clientEmail })}-->`,
            notes: `<!--LABASSIST_BILLING:${JSON.stringify(newPayment)}-->`,
          });
        }
      } catch (tickErr) {
        console.warn('Billing persistence into Supabase tickets warning:', tickErr);
      }
    }

    return NextResponse.json({ success: true, payment: newPayment });
  } catch (err: any) {
    console.error('Payment POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
