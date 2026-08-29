'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Cpu, Wifi, User, LogOut, Shield, Wrench, GraduationCap, ChevronDown, Bell } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function Header() {
  const { user, role, signOut, isAuthenticated } = useAuth();
  const toast = useToast();
  const pathname = usePathname();
  const router = useRouter();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = () => {
    signOut();
    toast.info('Signed out', 'Session ended safely.');
    router.push('/');
  };

  const getRoleBadge = () => {
    switch (role) {
      case 'ADMIN':
        return {
          label: 'ADMIN',
          icon: <Shield size={12} />,
          badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.2)]',
        };
      case 'TECHNICIAN':
        return {
          label: 'TECHNICIAN',
          icon: <Wrench size={12} />,
          badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 shadow-glow-indigo/30',
        };
      case 'STUDENT':
      default:
        return {
          label: 'STUDENT',
          icon: <GraduationCap size={12} />,
          badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        };
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <header className="nav-blur sticky top-0 z-40 h-16 border-b border-slate-800/80" role="banner">
      <div className="max-w-[1650px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
        {/* Left: Brand Logo & WS Status */}
        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="LabAssist Home">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-glow-indigo group-hover:shadow-glow-cyan transition-all duration-300">
              <Cpu size={16} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-100">Lab</span>
              <span className="text-sm font-bold gradient-text">Assist</span>
            </div>
          </Link>

          {/* Active Workspace Status Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-slate-700/60 bg-slate-900/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 text-[11px]">
              {pathname === '/admin' || pathname.startsWith('/admin')
                ? 'Admin Operations Console'
                : pathname === '/technician'
                ? 'Technician Dispatch Board'
                : 'Student Self-Service Portal'}
            </span>
          </div>
        </div>

        {/* Center: Protected Role Navigation Links (Only Authorized Route for User's Role) */}
        <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800" role="navigation" aria-label="Main Navigation">
          {/* Student Portal Link - Accessible strictly to STUDENT */}
          {role === 'STUDENT' && (
            <Link
              href="/student"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                pathname === '/student'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <GraduationCap size={14} />
              <span>Student Portal</span>
            </Link>
          )}

          {/* Technician Link - Accessible strictly to TECHNICIAN */}
          {role === 'TECHNICIAN' && (
            <Link
              href="/technician"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                pathname === '/technician'
                  ? 'bg-indigo-600 text-white shadow-glow-indigo'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Wrench size={13} />
              <span>Technician Queue</span>
            </Link>
          )}

          {/* Admin Console Link - Accessible strictly to ADMIN */}
          {role === 'ADMIN' && (
            <Link
              href="/admin"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                pathname === '/admin'
                  ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Shield size={13} />
              <span>Admin Console</span>
            </Link>
          )}
        </nav>

        {/* Right: Notifications & User Profile */}
        <div className="flex items-center gap-2.5 flex-shrink-0">

          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button
              id="header-notif-btn"
              onClick={() => setNotifOpen(v => !v)}
              className="relative w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
              aria-label="Notifications"
            >
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border-2 border-slate-900" />
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-11 w-72 dropdown-menu p-3 z-50 animate-fade-in text-left">
                <p className="text-xs font-semibold text-slate-300 mb-2 px-1">Live Telemetry & Alerts</p>
                {[
                  { msg: 'ESP32 Cluster LAB-302 heartbeat 12ms', time: 'Just now' },
                  { msg: 'Ticket TKT-2401 logged by student', time: '4m ago' },
                  { msg: 'Locker B4 hardware loan approved', time: '14m ago' },
                ].map((n, i) => (
                  <div key={i} className="flex gap-2.5 p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
                    <span className="flex-shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full bg-indigo-400" />
                    <div>
                      <p className="text-xs text-slate-300 leading-snug">{n.msg}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Menu Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="header-user-btn"
              onClick={() => setDropdownOpen(v => !v)}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl hover:bg-slate-800 transition-all group"
              aria-label="User profile menu"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
                {user?.avatar || (role === 'ADMIN' ? 'AD' : 'ST')}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-200 leading-none truncate max-w-[120px]">
                  {user?.name || (role === 'ADMIN' ? 'Admin' : 'Student')}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${roleBadge.badge}`}>
                    {roleBadge.icon}
                    {role}
                  </span>
                </div>
              </div>
              <ChevronDown size={12} className={`text-slate-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-11 w-56 dropdown-menu z-50 overflow-hidden animate-fade-in text-left">
                <div className="px-4 py-3 border-b border-slate-700/80">
                  <p className="text-xs font-bold text-slate-200">{user?.name || 'Active User'}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email || 'authenticated@campus.edu'}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${roleBadge.badge}`}>
                      {roleBadge.icon}
                      Role: {role}
                    </span>
                  </div>
                </div>

                <div className="p-1.5 space-y-1">
                  <Link
                    href="/student"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-700/60 transition-colors"
                  >
                    <GraduationCap size={13} className="text-cyan-400" />
                    <span>Student Portal</span>
                  </Link>

                  {(role === 'TECHNICIAN' || role === 'ADMIN') && (
                    <Link
                      href="/technician"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-700/60 transition-colors"
                    >
                      <Wrench size={13} className="text-indigo-400" />
                      <span>Technician Board</span>
                    </Link>
                  )}

                  {role === 'ADMIN' && (
                    <Link
                      href="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-700/60 transition-colors"
                    >
                      <Shield size={13} className="text-violet-400" />
                      <span>Admin Console</span>
                    </Link>
                  )}

                  <div className="border-t border-slate-700 my-1" />
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
