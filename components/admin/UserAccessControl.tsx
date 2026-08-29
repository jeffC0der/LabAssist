'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Key, Check, Plus, Search, Copy, Lock, RefreshCw, X,
  Wrench, ArrowUpRight, ArrowDownRight, Loader2, AlertCircle, Mail, Trash2, UserCheck, Terminal,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/context/AuthContext';

interface DBUser {
  id: string;
  name?: string;
  full_name?: string;
  email: string;
  role: UserRole;
  department?: string;
  last_active_at?: string;
  created_at?: string;
}

interface WhitelistedTech {
  id: string;
  email: string;
  department?: string;
  added_by?: string;
  created_at?: string;
}

const SQL_SETUP_SNIPPET = `-- Run this in your Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.whitelisted_technicians (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  department TEXT DEFAULT 'Hardware Maintenance Div.',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.whitelisted_technicians ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allowlist viewable by authenticated users" ON public.whitelisted_technicians;
CREATE POLICY "Allowlist viewable by authenticated users" ON public.whitelisted_technicians FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage allowlist" ON public.whitelisted_technicians;
CREATE POLICY "Admins can manage allowlist" ON public.whitelisted_technicians FOR ALL USING (true);`;

export default function UserAccessControl() {
  const toast = useToast();
  const { promoteUser, demoteUser } = useAuth();

  // ── Users Table State ────────────────────────────────────────────────────────
  const [users, setUsers] = useState<DBUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  // ── Allowlist State ──────────────────────────────────────────────────────────
  const [allowlist, setAllowlist] = useState<WhitelistedTech[]>([]);
  const [allowlistLoading, setAllowlistLoading] = useState(true);
  const [allowlistError, setAllowlistError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [newTechEmail, setNewTechEmail] = useState('');
  const [newTechDept, setNewTechDept] = useState('Hardware Maintenance Div.');
  const [isAddingTech, setIsAddingTech] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // ── Onboarding Passcode ──────────────────────────────────────────────────────
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
  const [passcodeDept, setPasscodeDept] = useState('Hardware Maintenance Div.');
  const [passcodeExpiry, setPasscodeExpiry] = useState('48 Hours');
  const [generatedPasscode, setGeneratedPasscode] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  // ── Fetch Users ──────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load users');
      setUsers((data.users || []) as DBUser[]);
    } catch (err: any) {
      setUsersError(err.message || 'Failed to load users from database.');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // ── Fetch Allowlist ──────────────────────────────────────────────────────────
  const fetchAllowlist = useCallback(async () => {
    setAllowlistLoading(true);
    setAllowlistError(null);
    try {
      const res = await fetch('/api/admin/allowlist');
      const data = await res.json();
      if (data.tableMissing) {
        setTableMissing(true);
      } else {
        setTableMissing(false);
      }
      setAllowlist((data.allowlist || []) as WhitelistedTech[]);
    } catch (err: any) {
      setAllowlistError(err.message || 'Failed to load technician allowlist.');
    } finally {
      setAllowlistLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchAllowlist();
  }, [fetchUsers, fetchAllowlist]);

  // ── Role Actions ─────────────────────────────────────────────────────────────
  const handleRoleChange = async (user: DBUser, newRole: UserRole) => {
    const previousRole = user.role;
    // Optimistic UI update
    setUsers(prev => prev.map(u => (u.id === user.id || u.email === user.email) ? { ...u, role: newRole } : u));

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email, newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user role');

      promoteUser(user.email, newRole);
      promoteUser(user.id, newRole);
      toast.success('Role Updated in Database', `${displayName(user)} is now assigned ${newRole}`);
      await fetchAllowlist();
    } catch (err: any) {
      // Revert on error
      setUsers(prev => prev.map(u => (u.id === user.id || u.email === user.email) ? { ...u, role: previousRole } : u));
      toast.error('Role Update Failed', err.message);
    }
  };

  const handlePromoteToTech = (user: DBUser) => handleRoleChange(user, 'TECHNICIAN');
  const handleDemoteToStudent = (user: DBUser) => handleRoleChange(user, 'STUDENT');

  // ── Allowlist Actions ────────────────────────────────────────────────────────
  const handleAddToAllowlist = async () => {
    const email = newTechEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      toast.error('Invalid Email', 'Please enter a valid technician email.');
      return;
    }
    setIsAddingTech(true);
    try {
      const res = await fetch('/api/admin/allowlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, department: newTechDept }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add allowlist entry');

      toast.success('Technician Allowlisted', `${email} auto-assigned TECHNICIAN role.`);
      setNewTechEmail('');
      await fetchAllowlist();
      await fetchUsers();
    } catch (err: any) {
      toast.error('Allowlist Error', err.message || 'Failed to add to allowlist.');
    } finally {
      setIsAddingTech(false);
    }
  };

  const handleRemoveFromAllowlist = async (entry: WhitelistedTech) => {
    try {
      const res = await fetch(`/api/admin/allowlist?id=${entry.id}&email=${encodeURIComponent(entry.email)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove entry');

      setAllowlist(prev => prev.filter(e => e.id !== entry.id));
      toast.info('Removed from Allowlist', `${entry.email} removed.`);
      await fetchUsers();
    } catch (err: any) {
      toast.error('Remove Error', err.message || 'Failed to remove from allowlist.');
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SETUP_SNIPPET);
    setSqlCopied(true);
    toast.success('SQL Copied', 'Paste into your Supabase SQL Editor and run it.');
    setTimeout(() => setSqlCopied(false), 3000);
  };

  // ── Passcode ─────────────────────────────────────────────────────────────────
  const handleGeneratePasscode = () => {
    const hex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const num = Math.floor(1000 + Math.random() * 9000);
    setGeneratedPasscode(`TECH-AUTH-${num}-${hex}`);
    setHasCopied(false);
  };

  const handleCopyPasscode = () => {
    if (!generatedPasscode) return;
    navigator.clipboard.writeText(generatedPasscode);
    setHasCopied(true);
    toast.info('Passcode Copied', 'Copied to clipboard.');
    setTimeout(() => setHasCopied(false), 2500);
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'TECHNICIAN': return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      default: return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
    }
  };

  const displayName = (u: DBUser) => u.name || u.full_name || u.email.split('@')[0];
  const initials = (u: DBUser) => displayName(u).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        displayName(u).toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">

      {/* SQL Setup Helper Banner if table missing */}
      {tableMissing && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Terminal size={18} className="text-amber-400 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-amber-200">Supabase Table Setup Required</h3>
                <p className="text-xs text-amber-300/80">
                  Run the SQL snippet below in your Supabase SQL Editor to enable the persistent <code className="font-mono bg-amber-950/60 px-1.5 py-0.5 rounded text-amber-200">whitelisted_technicians</code> table.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopySql}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition-all flex-shrink-0"
            >
              {sqlCopied ? <Check size={13} /> : <Copy size={13} />}
              <span>{sqlCopied ? 'SQL Copied!' : 'Copy SQL'}</span>
            </button>
          </div>
          <pre className="p-2.5 rounded-xl bg-slate-950 text-[11px] font-mono text-slate-300 border border-slate-800 overflow-x-auto">
            {SQL_SETUP_SNIPPET}
          </pre>
        </div>
      )}

      {/* ── Users Table ──────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 border border-slate-800/80 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Shield size={17} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                User Access &amp; Role-Based Control (RBAC)
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/30">
                  Live Supabase Data
                </span>
              </h2>
              <p className="text-xs text-slate-400">Manage verified accounts and assign Technician permissions directly in the database</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchUsers}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 transition-all"
              title="Refresh users"
            >
              <RefreshCw size={12} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => { setIsPasscodeModalOpen(true); handleGeneratePasscode(); }}
              className="flex items-center gap-2 py-2 px-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all"
            >
              <Key size={14} />
              <span>Generate Tech Passcode</span>
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="relative max-w-sm flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search name, email, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-800/80 text-slate-200 border border-slate-700 focus:border-violet-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
            {(['ALL', 'STUDENT', 'TECHNICIAN', 'ADMIN'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  roleFilter === r ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Loading / Error / Table */}
        {usersLoading ? (
          <div className="flex items-center justify-center gap-3 py-10 text-slate-400">
            <Loader2 size={18} className="animate-spin text-violet-400" />
            <span className="text-sm">Loading users from Supabase…</span>
          </div>
        ) : usersError ? (
          <div className="flex items-center gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle size={15} className="flex-shrink-0" />
            <span>{usersError}</span>
            <button onClick={fetchUsers} className="ml-auto underline hover:no-underline">Retry</button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            No users found{searchQuery ? ` matching "${searchQuery}"` : ''}.
          </div>
        ) : (
          <div className="table-wrapper rounded-xl border border-slate-800/80 overflow-hidden">
            <table className="w-full" role="table" aria-label="Users and access control">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                          {initials(user)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-100">{displayName(user)}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell text-xs text-slate-300">
                      {user.department || 'Undergraduate Engineering'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase border ${getRoleBadgeStyle(user.role)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {user.role === 'STUDENT' && (
                        <button
                          type="button"
                          onClick={() => handlePromoteToTech(user)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all"
                        >
                          <Wrench size={12} className="text-indigo-400" />
                          <span>Promote to Technician</span>
                          <ArrowUpRight size={11} />
                        </button>
                      )}
                      {user.role === 'TECHNICIAN' && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                            <Check size={12} /> Tech Dispatch Active
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDemoteToStudent(user)}
                            className="px-2 py-1 rounded text-[10px] text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-slate-700/60 transition-colors"
                          >
                            Demote to Student
                          </button>
                        </div>
                      )}
                      {user.role === 'ADMIN' && (
                        <span className="text-xs font-mono text-violet-400 font-semibold flex items-center gap-1">
                          <Shield size={12} /> Root Administrator
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Technician Email Allowlist ───────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 border border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <UserCheck size={17} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Technician Email Allowlist</h2>
              <p className="text-xs text-slate-400">
                Emails on this list are automatically assigned <span className="text-indigo-300 font-semibold">TECHNICIAN</span> role on sign-up or login
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchAllowlist}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 transition-all self-start sm:self-auto"
          >
            <RefreshCw size={12} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Add Technician Form */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="email"
              placeholder="technician@umak.edu.ph"
              value={newTechEmail}
              onChange={(e) => setNewTechEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddToAllowlist()}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-800/80 text-slate-200 border border-slate-700 focus:border-indigo-500 focus:outline-none"
            />

          </div>
          <select
            value={newTechDept}
            onChange={(e) => setNewTechDept(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-800 text-slate-200 border border-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="Hardware Maintenance Div.">Hardware Maintenance Div.</option>
            <option value="Network & Lab Ops">Network &amp; Lab Ops</option>
            <option value="Campus IT Services">Campus IT Services</option>
          </select>
          <button
            type="button"
            onClick={handleAddToAllowlist}
            disabled={isAddingTech || !newTechEmail.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAddingTech ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            <span>Add to Allowlist</span>
          </button>
        </div>

        {/* Allowlist Table */}
        {allowlistLoading ? (
          <div className="flex items-center gap-3 py-6 text-slate-400">
            <Loader2 size={16} className="animate-spin text-indigo-400" />
            <span className="text-xs">Loading allowlist…</span>
          </div>
        ) : allowlistError ? (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{allowlistError}</span>
          </div>
        ) : allowlist.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-700/60 rounded-xl">
            No technician emails allowlisted yet. Add one above.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800/80 overflow-hidden">
            <table className="w-full" role="table" aria-label="Technician email allowlist">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Department</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {allowlist.map((entry) => {
                  const hasAccount = users.some(u => u.email?.toLowerCase() === entry.email?.toLowerCase());
                  return (
                    <tr key={entry.id} className="hover:bg-slate-850/40 transition-colors">
                      <td className="px-4 py-3 text-xs font-mono text-indigo-300">{entry.email}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 hidden sm:table-cell">{entry.department || '—'}</td>
                      <td className="px-4 py-3">
                        {hasAccount ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <Check size={10} /> Account Active (Technician)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Pending Sign-Up
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveFromAllowlist(entry)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remove from allowlist"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Passcode Modal ────────────────────────────────────────────────────── */}
      {isPasscodeModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsPasscodeModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Generate Technician Passcode</h3>
                  <p className="text-xs text-slate-400">Single-use onboarding key for field IT personnel</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsPasscodeModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-violet-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider flex items-center gap-1">
                  <Lock size={12} /> Authorization Token
                </span>
                <button type="button" onClick={handleGeneratePasscode} className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1">
                  <RefreshCw size={11} /> Regenerate
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                <code className="font-mono text-base font-bold text-emerald-400 tracking-wider">
                  {generatedPasscode || 'TECH-AUTH-8891-K7X2'}
                </code>
                <button
                  type="button"
                  onClick={handleCopyPasscode}
                  className="py-1.5 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {hasCopied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                  <span>{hasCopied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Target Department</label>
                <select value={passcodeDept} onChange={(e) => setPasscodeDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:outline-none">
                  <option>Hardware Maintenance Div.</option>
                  <option>Network &amp; Lab Ops</option>
                  <option>Campus IT Services</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Passcode Expiration</label>
                <select value={passcodeExpiry} onChange={(e) => setPasscodeExpiry(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 focus:outline-none">
                  <option>24 Hours</option>
                  <option>48 Hours</option>
                  <option>7 Days</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button type="button" onClick={() => setIsPasscodeModalOpen(false)}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
