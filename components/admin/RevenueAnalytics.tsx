'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Wallet,
  Coins,
  Receipt,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface RevenueMetrics {
  grossRevenue: number;
  unpaidBalances: number;
  averageOrderValue: number;
  totalOrders: number;
  paidOrdersCount: number;
  unpaidOrdersCount: number;
  cashTotal: number;
  onlineTotal: number;
  cashPercentage: number;
  onlinePercentage: number;
}

interface TechPerformance {
  techName: string;
  completedRepairs: number;
  grossRevenue: number;
  cashRevenue: number;
  onlineRevenue: number;
  averageTicket: number;
  sharePercentage: number;
}

interface ChartDataPoint {
  label: string;
  date?: string;
  total: number;
  cash: number;
  online: number;
  count: number;
}

interface TransactionRecord {
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
}

export default function RevenueAnalytics() {
  const toast = useToast();
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [technicians, setTechnicians] = useState<TechPerformance[]>([]);
  const [charts, setCharts] = useState<{
    daily: ChartDataPoint[];
    weekly: ChartDataPoint[];
    monthly: ChartDataPoint[];
  }>({ daily: [], weekly: [], monthly: [] });
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [meta, setMeta] = useState<{ dataSource?: string; isSupabaseConnected?: boolean; totalRecords?: number; lastSyncTime?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chart Controls
  const [timeView, setTimeView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'CASH' | 'ONLINE'>('ALL');
  const [searchTxQuery, setSearchTxQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');

  // Record Payment Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newMethod, setNewMethod] = useState<'CASH' | 'GCASH' | 'MAYA' | 'BANK_TRANSFER'>('GCASH');
  const [newStatus, setNewStatus] = useState<'PAID' | 'UNPAID'>('PAID');
  const [newTechnician, setNewTechnician] = useState('Tech. Carlos Rivera');
  const [newJobOrder, setNewJobOrder] = useState('');
  const [newReference, setNewReference] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // ── Fetch Revenue Data from Backend ──────────────────────────────────────────
  const fetchRevenueData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/revenue', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load revenue data');
      const data = await res.json();
      setMetrics(data.metrics);
      setTechnicians(data.technicianPerformance || []);
      setCharts(data.charts || { daily: [], weekly: [], monthly: [] });
      setTransactions(data.transactions || []);
      setMeta(data.meta || null);
    } catch (err: any) {
      setError(err.message || 'Error fetching revenue information');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevenueData();
  }, [fetchRevenueData]);

  // ── Record Payment Handler ───────────────────────────────────────────────────
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newAmount || isNaN(Number(newAmount)) || Number(newAmount) <= 0) {
      toast.warning('Invalid Input', 'Please provide a valid client name and amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: newClientName.trim(),
          clientEmail: newClientEmail.trim() || undefined,
          amount: Number(newAmount),
          paymentMethod: newMethod,
          paymentStatus: newStatus,
          technicianName: newTechnician,
          jobOrderNumber: newJobOrder.trim() || undefined,
          referenceNumber: newReference.trim() || undefined,
          notes: newNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      toast.success('Payment Recorded', `Successfully logged ₱${Number(newAmount).toLocaleString()} for ${newClientName}.`);
      setIsRecordModalOpen(false);

      // Reset form
      setNewClientName('');
      setNewClientEmail('');
      setNewAmount('');
      setNewJobOrder('');
      setNewReference('');
      setNewNotes('');

      // Refresh data
      await fetchRevenueData();
    } catch (err: any) {
      toast.error('Record Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Currency Formatter ────────────────────────────────────────────────────────
  const fmtMoney = (amount: number = 0) => {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // ── Chart Active Data Calculation ─────────────────────────────────────────────
  const currentChartData = useMemo(() => {
    return charts[timeView] || [];
  }, [charts, timeView]);

  const maxChartValue = useMemo(() => {
    if (!currentChartData.length) return 1000;
    const max = Math.max(...currentChartData.map((d) => d.total));
    return max > 0 ? max : 1000;
  }, [currentChartData]);

  // ── Filtered Transactions ─────────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (statusFilter !== 'ALL' && t.paymentStatus !== statusFilter) return false;
      if (channelFilter === 'CASH' && t.paymentMethod !== 'CASH') return false;
      if (channelFilter === 'ONLINE' && t.paymentMethod === 'CASH') return false;
      if (searchTxQuery) {
        const q = searchTxQuery.toLowerCase();
        return (
          t.clientName.toLowerCase().includes(q) ||
          (t.clientEmail || '').toLowerCase().includes(q) ||
          t.technicianName.toLowerCase().includes(q) ||
          t.paymentNumber.toLowerCase().includes(q) ||
          (t.invoiceNumber || '').toLowerCase().includes(q) ||
          (t.jobOrderNumber || '').toLowerCase().includes(q) ||
          (t.referenceNumber || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, statusFilter, channelFilter, searchTxQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Top Header Bar ─────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 border border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/70 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-glow-emerald">
              <DollarSign size={17} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                Revenue &amp; Income Analytics
                <span className="px-2.5 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Supabase Live ({meta?.totalRecords || transactions.length} records)</span>
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Live database analytics calculated directly from Supabase IT repair records, payment channels (Cash vs Online), and technician logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={fetchRevenueData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
              title="Refresh ledger"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin text-emerald-400' : 'text-slate-400'} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRecordModalOpen(true)}
              className="flex items-center gap-2 py-1.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
            >
              <Plus size={14} />
              <span>Record Payment</span>
            </button>
          </div>
        </div>

        {/* ── Core KPI Cards Grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Gross Revenue */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/5 border border-emerald-500/30 hover:border-emerald-500/50 transition-all relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-400">Gross Revenue</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300">
                <Coins size={15} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono tracking-tight">
              {fmtMoney(metrics?.grossRevenue)}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-400 font-semibold">
              <TrendingUp size={13} />
              <span>{metrics?.paidOrdersCount || 0} completed paid repairs</span>
            </div>
          </div>

          {/* 2. Unpaid Balances */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/5 border border-amber-500/30 hover:border-amber-500/50 transition-all relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-amber-400">Unpaid Balances</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-300">
                <Clock size={15} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-300 font-mono tracking-tight">
              {fmtMoney(metrics?.unpaidBalances)}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-400 font-semibold">
              <AlertCircle size={13} />
              <span>{metrics?.unpaidOrdersCount || 0} repairs awaiting settlement</span>
            </div>
          </div>

          {/* 3. Average Order Value */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/15 to-cyan-500/5 border border-indigo-500/30 hover:border-indigo-500/50 transition-all relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-indigo-400">Average Order Value (AOV)</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300">
                <Receipt size={15} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-indigo-300 font-mono tracking-tight">
              {fmtMoney(metrics?.averageOrderValue)}
            </p>
            <p className="text-[11px] text-slate-400 mt-2">Per completed device repair service</p>
          </div>

          {/* 4. Payment Channels Breakdown */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/5 border border-violet-500/30 hover:border-violet-500/50 transition-all relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-violet-400">Payment Gateway Mix</span>
              <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-300">
                <CreditCard size={15} />
              </div>
            </div>
            <div className="flex items-baseline justify-between text-xs font-mono mb-1.5">
              <span className="text-violet-300 font-bold">Online {metrics?.onlinePercentage || 0}%</span>
              <span className="text-emerald-400 font-bold">Cash {metrics?.cashPercentage || 0}%</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${metrics?.onlinePercentage || 0}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${metrics?.cashPercentage || 0}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {fmtMoney(metrics?.onlineTotal)} online · {fmtMoney(metrics?.cashTotal)} cash
            </p>
          </div>
        </div>
      </div>

      {/* ── Toggleable Revenue Chart with Cash vs Online Overlay ────────────── */}
      <div className="glass rounded-2xl p-5 border border-slate-800/80 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800/70">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Income Velocity &amp; Channel Overlay Comparison</span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
                {timeView.toUpperCase()} VIEW
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Compare physical Cash receipts vs Online payments (GCash, Maya, Bank Transfer)
            </p>
          </div>

          {/* Controls: Daily/Weekly/Monthly Toggle & Channel Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Time toggle */}
            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              {(['daily', 'weekly', 'monthly'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTimeView(v)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${
                    timeView === v ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {v === 'daily' ? 'Daily (7D)' : v === 'weekly' ? 'Weekly (4W)' : 'Monthly (6M)'}
                </button>
              ))}
            </div>

            {/* Overlay mode toggle */}
            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              {(['ALL', 'ONLINE', 'CASH'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannelFilter(c)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                    channelFilter === c
                      ? c === 'ONLINE'
                        ? 'bg-violet-600 text-white'
                        : c === 'CASH'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {c === 'ALL' ? 'Stacked Overlay' : c === 'ONLINE' ? 'Online Only' : 'Cash Only'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Histogram Container */}
        <div className="pt-4">
          <div className="h-56 w-full flex items-end justify-between gap-2 sm:gap-4 px-2 pb-2">
            {currentChartData.map((dp, idx) => {
              const totalHeight = Math.max(10, Math.round((dp.total / maxChartValue) * 100));
              const onlineHeight = dp.total > 0 ? Math.round((dp.online / dp.total) * 100) : 0;
              const cashHeight = dp.total > 0 ? 100 - onlineHeight : 0;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip Hover Bubble */}
                  <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-20 bg-slate-950/95 border border-slate-700 p-2 rounded-xl text-center shadow-xl min-w-[130px]">
                    <p className="text-[10px] font-bold text-slate-300">{dp.label}</p>
                    <p className="text-xs font-mono font-black text-emerald-400">{fmtMoney(dp.total)}</p>
                    <div className="flex items-center justify-between gap-2 text-[9px] text-slate-400 font-mono mt-0.5">
                      <span className="text-violet-300">Online: {fmtMoney(dp.online)}</span>
                      <span className="text-emerald-300">Cash: {fmtMoney(dp.cash)}</span>
                    </div>
                  </div>

                  {/* Top amount preview on large screens */}
                  <span className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                    {fmtMoney(channelFilter === 'ONLINE' ? dp.online : channelFilter === 'CASH' ? dp.cash : dp.total)}
                  </span>

                  {/* Main Stacked Bar */}
                  <div
                    className="w-full max-w-[48px] rounded-t-lg overflow-hidden flex flex-col justify-end transition-all duration-300 bg-slate-800/40 hover:brightness-110"
                    style={{ height: `${totalHeight}%` }}
                  >
                    {channelFilter === 'ALL' && (
                      <>
                        {/* Online portion (Top) */}
                        {dp.online > 0 && (
                          <div
                            className="w-full bg-gradient-to-t from-violet-600 to-indigo-500 transition-all duration-300"
                            style={{ height: `${onlineHeight}%` }}
                            title={`Online: ${fmtMoney(dp.online)}`}
                          />
                        )}
                        {/* Cash portion (Bottom) */}
                        {dp.cash > 0 && (
                          <div
                            className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 transition-all duration-300"
                            style={{ height: `${cashHeight}%` }}
                            title={`Cash: ${fmtMoney(dp.cash)}`}
                          />
                        )}
                      </>
                    )}

                    {channelFilter === 'ONLINE' && (
                      <div
                        className="w-full bg-gradient-to-t from-violet-600 to-indigo-500 rounded-t-lg transition-all duration-300"
                        style={{ height: `${maxChartValue > 0 ? (dp.online / maxChartValue) * 100 : 0}%` }}
                      />
                    )}

                    {channelFilter === 'CASH' && (
                      <div
                        className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-lg transition-all duration-300"
                        style={{ height: `${maxChartValue > 0 ? (dp.cash / maxChartValue) * 100 : 0}%` }}
                      />
                    )}
                  </div>

                  {/* Date Label */}
                  <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 mt-2 truncate max-w-full text-center">
                    {dp.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 border-t border-slate-800/70 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-gradient-to-r from-violet-600 to-indigo-500" />
              <span className="text-slate-300 font-semibold">Online Gateway (GCash / Maya / Bank)</span>
              <span className="font-mono text-violet-400 font-bold">({fmtMoney(metrics?.onlineTotal)})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-gradient-to-r from-emerald-600 to-teal-400" />
              <span className="text-slate-300 font-semibold">Counter Cash Settlement</span>
              <span className="font-mono text-emerald-400 font-bold">({fmtMoney(metrics?.cashTotal)})</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Technician Performance & Revenue Contribution Table ────────────── */}
      <div className="glass rounded-2xl p-5 border border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/70">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Technician Performance &amp; Revenue Contribution</h3>
              <p className="text-xs text-slate-400">Breakdown of repair volume and gross revenue generated per bench technician</p>
            </div>
          </div>
        </div>

        <div className="table-wrapper rounded-xl border border-slate-800/80 overflow-hidden">
          <table className="w-full" role="table" aria-label="Technician Revenue Contribution Table">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Tech Name</th>
                <th className="px-4 py-3 text-center">Completed Repairs</th>
                <th className="px-4 py-3 text-right">Gross Revenue Generated</th>
                <th className="px-4 py-3 text-center hidden md:table-cell">Channel Split</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Avg. Ticket Value</th>
                <th className="px-4 py-3 text-right">Revenue Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {technicians.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    No technician payment contributions recorded yet.
                  </td>
                </tr>
              ) : (
                technicians.map((t, i) => (
                  <tr key={i} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-100 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white text-[11px] font-bold">
                        {t.techName.replace('Tech. ', '').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-200">{t.techName}</p>
                        <p className="text-[10px] text-slate-500">Hardware Maintenance Div.</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-200">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                        {t.completedRepairs} jobs
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-emerald-400">
                      {fmtMoney(t.grossRevenue)}
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <div className="flex items-center justify-center gap-2 text-[11px] font-mono">
                        <span className="text-violet-400">Online: {fmtMoney(t.onlineRevenue)}</span>
                        <span className="text-slate-600">|</span>
                        <span className="text-emerald-400">Cash: {fmtMoney(t.cashRevenue)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300 hidden sm:table-cell">
                      {fmtMoney(t.averageTicket)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full"
                            style={{ width: `${t.sharePercentage}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-200 w-10 text-right">
                          {t.sharePercentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Recent Payments & Income Transactions Table ────────────────────── */}
      <div className="glass rounded-2xl p-5 border border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/70">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Receipt size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Income Payment Transactions Ledger</h3>
              <p className="text-xs text-slate-400">Individual repair invoices, payment settlements, and customer receipts</p>
            </div>
          </div>

          {/* Search and Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search Client, Ref, Tech..."
                value={searchTxQuery}
                onChange={(e) => setSearchTxQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-800/80 text-slate-200 border border-slate-700 focus:border-emerald-500 focus:outline-none w-48"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-800/80 text-slate-200 border border-slate-700 focus:border-emerald-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="PAID">Paid Settlements</option>
              <option value="UNPAID">Unpaid / Pending</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="table-wrapper rounded-xl border border-slate-800/80 overflow-hidden">
          <table className="w-full" role="table" aria-label="Transactions Ledger">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Payment ID / Invoice</th>
                <th className="px-4 py-3 text-left">Client &amp; Contact</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Technician</th>
                <th className="px-4 py-3 text-center">Payment Method</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No transactions match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-mono">
                      <p className="font-bold text-indigo-300">{tx.paymentNumber}</p>
                      <p className="text-[10px] text-slate-500">
                        {tx.invoiceNumber || tx.jobOrderNumber || 'Walk-in Settlement'}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-bold text-slate-200">{tx.clientName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{tx.clientEmail || 'No email on record'}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-300 hidden sm:table-cell">
                      {tx.technicianName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          tx.paymentMethod === 'CASH'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                        }`}
                      >
                        {tx.paymentMethod}
                        {tx.referenceNumber && ` (${tx.referenceNumber.slice(-4)})`}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-black text-emerald-400">
                      {fmtMoney(tx.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          tx.paymentStatus === 'PAID'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {tx.paymentStatus === 'PAID' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                        {tx.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-slate-400 font-mono text-[11px] hidden md:table-cell">
                      {new Date(tx.paymentDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Record Payment Modal ────────────────────────────────────────────── */}
      {isRecordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsRecordModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-glow-emerald">
                  <Coins size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Record Repair Income</h3>
                  <p className="text-xs text-slate-400">Log walk-in or online repair payment into Supabase</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRecordModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3.5 pt-1 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Quick Select Student Client (Optional)</label>
                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'aerjun') {
                      setNewClientName('Aerjun Ladines');
                      setNewClientEmail('aladines.a12345446@umak.edu.ph');
                      setNewJobOrder('TKT-2771');
                      setNewNotes('Display Monitor Repair');
                      setNewAmount('2400');
                    } else if (val === 'jeff') {
                      setNewClientName('Jeff Justine Geraga');
                      setNewClientEmail('jgeraga.k12150156@umak.edu.ph');
                      setNewJobOrder('TKT-3171');
                      setNewNotes('Keyboard and trackpad repair');
                      setNewAmount('950');
                    } else if (val === 'clyne') {
                      setNewClientName('Clyne Arvey Tayona');
                      setNewClientEmail('ctayona.k12153853@umak.edu.ph');
                      setNewJobOrder('TKT-3281');
                      setNewNotes('UPS & Power Diagnostic');
                      setNewAmount('1250');
                    } else if (val === 'dylan') {
                      setNewClientName('Dylan Sorima');
                      setNewClientEmail('dsorima.k12150455@umak.edu.ph');
                      setNewJobOrder('TKT-2598');
                      setNewNotes('Display Screen Diagnosis');
                      setNewAmount('1800');
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-emerald-500 focus:outline-none mb-2"
                >
                  <option value="">-- Choose Registered Student or Enter Manually --</option>
                  <option value="aerjun">Aerjun Ladines (aladines.a12345446@umak.edu.ph)</option>
                  <option value="jeff">Jeff Justine Geraga (jgeraga.k12150156@umak.edu.ph)</option>
                  <option value="clyne">Clyne Arvey Tayona (ctayona.k12153853@umak.edu.ph)</option>
                  <option value="dylan">Dylan Sorima (dsorima.k12150455@umak.edu.ph)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Client Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aerjun Ladines"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Amount (PHP ₱) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="1500.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-emerald-500 focus:outline-none font-mono font-bold text-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Payment Method</label>
                  <select
                    value={newMethod}
                    onChange={(e) => setNewMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="GCASH">GCash QR / Mobile</option>
                    <option value="MAYA">Maya Digital Wallet</option>
                    <option value="CASH">Counter Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer (UnionBank)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Settlement Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="PAID">PAID (Settled)</option>
                    <option value="UNPAID">UNPAID (Pending)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Assigned Technician</label>
                  <select
                    value={newTechnician}
                    onChange={(e) => setNewTechnician(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Tech. Carlos Rivera">Tech. Carlos Rivera</option>
                    <option value="Tech. Maria Santos">Tech. Maria Santos</option>
                    <option value="Tech. Cruz">Tech. Cruz</option>
                    <option value="Tech. Garcia">Tech. Garcia</option>
                    <option value="Tech. Lim">Tech. Lim</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Job Order / Ticket # (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. TKT-2771"
                    value={newJobOrder}
                    onChange={(e) => setNewJobOrder(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Client Email (For Digital Receipt)</label>
                <input
                  type="email"
                  placeholder="student@umak.edu.ph"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {newMethod !== 'CASH' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Online Reference Number</label>
                  <input
                    type="text"
                    placeholder="e.g. GC-20261005-9812450"
                    value={newReference}
                    onChange={(e) => setNewReference(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notes / Scope of Repair</label>
                <input
                  type="text"
                  placeholder="e.g. Replacement thermal paste & LCD panel service"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-glow-emerald disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                  <span>Save to Ledger</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
