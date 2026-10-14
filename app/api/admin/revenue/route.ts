import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/serverAuth';

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
  const auth = await requireAuth(request, ['ADMIN']);
  if (auth.response) return auth.response;

  const supabase = getSupabaseAdmin();
  const payments: PaymentRecord[] = [];

  // Outstanding balances from saved repair invoices (cancelled Job Orders excluded)
  const outstandingBalances: number[] = [];
  // Registered technician names for the Record Payment form
  const technicianOptions: string[] = [];

  if (supabase) {
    try {
      const { data: techRows } = await supabase
        .from('profiles')
        .select('name')
        .eq('role', 'TECHNICIAN')
        .order('name', { ascending: true });
      (techRows || []).forEach((t: any) => {
        if (t.name && !technicianOptions.includes(t.name)) technicianOptions.push(t.name);
      });
    } catch (err) {
      console.warn('Supabase technician profiles fetch error:', err);
    }

    // 1. Payments ledger: every amount received from clients (recorded automatically on billing/settlement)
    try {
      const { data: payRows, error: payErr } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (payErr) {
        console.warn('Supabase payments table fetch error:', payErr.message);
      } else {
        (payRows || []).forEach((r) => payments.push(rowToPayment(r)));
      }
    } catch (err) {
      console.warn('Supabase payments table fetch error:', err);
    }

    // 2. Unpaid balances: invoice total minus amount paid for every repair invoice
    try {
      const { data: invRows, error: invErr } = await supabase
        .from('repair_invoices')
        .select('rma_number, total_amount, amount_paid');

      if (invErr) {
        console.warn('Supabase repair_invoices fetch error:', invErr.message);
      } else if (invRows && invRows.length > 0) {
        const { data: cancelledRows } = await supabase
          .from('device_repairs')
          .select('rma_number')
          .eq('status', 'CANCELLED');
        const cancelled = new Set((cancelledRows || []).map((r: any) => r.rma_number));

        invRows.forEach((r: any) => {
          if (cancelled.has(r.rma_number)) return;
          const balance = Number(r.total_amount || 0) - Number(r.amount_paid || 0);
          if (balance > 0.005) outstandingBalances.push(balance);
        });
      }
    } catch (err) {
      console.warn('Supabase repair_invoices fetch error:', err);
    }
  }

  // Net amount of a ledger entry: refunds/corrections reduce revenue
  const netAmount = (p: PaymentRecord) => (p.paymentStatus === 'REFUNDED' ? -p.amount : p.amount);

  // 1. Calculate Core KPI Cards
  const paidPayments = payments.filter((p) => p.paymentStatus === 'PAID');
  const revenuePayments = payments.filter((p) => p.paymentStatus === 'PAID' || p.paymentStatus === 'REFUNDED');
  const unpaidPayments = payments.filter((p) => p.paymentStatus === 'UNPAID' || p.paymentStatus === 'PENDING');

  const grossRevenue = revenuePayments.reduce((sum, p) => sum + netAmount(p), 0);
  const unpaidBalances =
    unpaidPayments.reduce((sum, p) => sum + p.amount, 0) +
    outstandingBalances.reduce((sum, b) => sum + b, 0);
  const unpaidOrdersCount = unpaidPayments.length + outstandingBalances.length;
  // A Job Order paid in installments counts once
  const paidCount = new Set(paidPayments.map((p) => p.jobOrderNumber || p.id)).size;
  const averageOrderValue = paidCount > 0 ? grossRevenue / paidCount : 0;

  // Split Cash vs Online
  const cashPayments = revenuePayments.filter((p) => p.paymentMethod === 'CASH');
  const onlinePayments = revenuePayments.filter((p) =>
    ['ONLINE', 'GCASH', 'MAYA', 'BANK_TRANSFER'].includes(p.paymentMethod)
  );

  const cashTotal = cashPayments.reduce((sum, p) => sum + netAmount(p), 0);
  const onlineTotal = onlinePayments.reduce((sum, p) => sum + netAmount(p), 0);

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
  const techJobs: Record<string, Set<string>> = {};

  revenuePayments.forEach((p) => {
    const tech = p.technicianName || 'Unassigned';
    if (!techMap[tech]) {
      techMap[tech] = {
        techName: tech,
        completedRepairs: 0,
        grossRevenue: 0,
        cashRevenue: 0,
        onlineRevenue: 0,
      };
      techJobs[tech] = new Set<string>();
    }
    if (p.paymentStatus === 'PAID') techJobs[tech].add(p.jobOrderNumber || p.id);
    techMap[tech].completedRepairs = techJobs[tech].size;
    techMap[tech].grossRevenue += netAmount(p);
    if (p.paymentMethod === 'CASH') {
      techMap[tech].cashRevenue += netAmount(p);
    } else {
      techMap[tech].onlineRevenue += netAmount(p);
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

  revenuePayments.forEach((p) => {
    const key = new Date(p.paymentDate).toISOString().split('T')[0];
    if (dailyMap[key]) {
      dailyMap[key].total += netAmount(p);
      dailyMap[key].count += p.paymentStatus === 'PAID' ? 1 : 0;
      if (p.paymentMethod === 'CASH') {
        dailyMap[key].cash += netAmount(p);
      } else {
        dailyMap[key].online += netAmount(p);
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
  revenuePayments.forEach((p) => {
    const pMs = new Date(p.paymentDate).getTime();
    const daysAgo = Math.floor((nowMs - pMs) / (24 * 3600000));
    let idx = 3;
    if (daysAgo >= 21) idx = 0;
    else if (daysAgo >= 14) idx = 1;
    else if (daysAgo >= 7) idx = 2;
    else idx = 3;

    if (weeklyChart[idx]) {
      weeklyChart[idx].total += netAmount(p);
      weeklyChart[idx].count += p.paymentStatus === 'PAID' ? 1 : 0;
      if (p.paymentMethod === 'CASH') weeklyChart[idx].cash += netAmount(p);
      else weeklyChart[idx].online += netAmount(p);
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

  revenuePayments.forEach((p) => {
    const pDate = new Date(p.paymentDate);
    const pMonthKey = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyMap[pMonthKey]) {
      monthlyMap[pMonthKey].total += netAmount(p);
      monthlyMap[pMonthKey].count += p.paymentStatus === 'PAID' ? 1 : 0;
      if (p.paymentMethod === 'CASH') {
        monthlyMap[pMonthKey].cash += netAmount(p);
      } else {
        monthlyMap[pMonthKey].online += netAmount(p);
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
      unpaidOrdersCount,
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
    technicianOptions,
    meta: {
      isSupabaseConnected: !!supabase,
      totalRecords: payments.length,
      lastSyncTime: new Date().toISOString(),
    },
  });
}

// ── POST: Record a new revenue payment into Supabase database ──
export async function POST(request: Request) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (auth.response) return auth.response;

  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const {
      invoiceNumber,
      jobOrderNumber,
      clientName,
      clientEmail,
      technicianName = 'Unassigned',
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
    const paymentNumber = `PAY-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

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
      const { data: inserted, error: insertErr } = await supabase
        .from('payments')
        .insert({
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
        })
        .select('id')
        .single();

      if (insertErr) {
        console.error('Payment insert into public.payments failed:', insertErr.message);
        return NextResponse.json({ error: `Payment could not be saved: ${insertErr.message}` }, { status: 500 });
      }
      if (inserted?.id) newPayment.id = inserted.id;
    }

    return NextResponse.json({ success: true, payment: newPayment });
  } catch (err: any) {
    console.error('Payment POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
