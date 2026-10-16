'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Wifi, User, LogOut, Shield, Wrench, GraduationCap, ChevronDown, Bell, ShieldCheck, UserCog, Ticket, CreditCard } from 'lucide-react';
import { useNotifications, timeAgo, OPEN_PORTAL_TAB_EVENT } from '@/context/NotificationContext';
import type { AppNotification } from '@/app/api/notifications/route';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import ProfileSettingsModal from '@/components/profile/ProfileSettingsModal';

export default function Header() {
  const { user, role, signOut, isAuthenticated } = useAuth();
  const toast = useToast();
  const pathname = usePathname();
  const router = useRouter();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
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

  const { notifications, unreadCount, markRead, markAllRead, refreshNotifications } = useNotifications();
  const latestNotifications = notifications.slice(0, 5);

  // Students can open the full list / the related section in the portal
  const openPortalTab = (tab: string) => {
    setNotifOpen(false);
    if (typeof window !== 'undefined' && window.location.pathname === '/student') {
      window.dispatchEvent(new CustomEvent(OPEN_PORTAL_TAB_EVENT, { detail: tab }));
    } else {
      router.push(`/student?tab=${encodeURIComponent(tab)}`);
    }
  };

  const handleNotificationClick = (n: AppNotification) => {
    markRead([n.id]);
    if (role === 'STUDENT' && n.linkTab) openPortalTab(n.linkTab);
  };

  const categoryIcon = (category: AppNotification['category']) =>
    category === 'TICKET' ? (
      <Ticket size={13} className="text-cyan-400" />
    ) : category === 'REPAIR' ? (
      <Wrench size={13} className="text-violet-400" />
    ) : (
      <CreditCard size={13} className="text-emerald-400" />
    );

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
            <Image
              src="/UMakLabAssistLogo.png"
              alt="UMak LabAssist Logo"
              width={32}
              height={32}
              className="w-8 h-8 object-contain rounded-full drop-shadow-md group-hover:scale-105 transition-transform duration-300"
            />
            <div className="flex items-center">
              <span className="text-sm font-bold text-slate-100 tracking-tight">Lab</span>
              <span className="text-sm font-bold gradient-text tracking-tight">Assist</span>
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

          {/* Notification bell: the user's real notifications (newest 5, short titles) */}
          <div className="relative" ref={notifRef}>
            <button
              id="header-notif-btn"
              onClick={() => {
                if (!notifOpen) refreshNotifications();
                setNotifOpen(v => !v);
              }}
              className="relative w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 border-2 border-slate-900 text-[9px] font-bold text-white flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-11 w-80 dropdown-menu p-2 z-50 animate-fade-in text-left">
                <div className="flex items-center justify-between px-2 pt-1 pb-2">
                  <p className="text-xs font-semibold text-slate-300">Notifications</p>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllRead()}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {latestNotifications.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-slate-500">No notifications yet</p>
                ) : (
                  <div className="space-y-0.5">
                    {latestNotifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full flex gap-2.5 p-2 rounded-lg text-left transition-colors hover:bg-slate-700/50 ${
                          n.isRead ? '' : 'bg-indigo-500/5'
                        }`}
                      >
                        <span className="flex-shrink-0 w-6 h-6 mt-0.5 rounded-md bg-slate-800 flex items-center justify-center">
                          {categoryIcon(n.category)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-xs leading-snug truncate ${n.isRead ? 'text-slate-400' : 'text-slate-200 font-semibold'}`}>
                            {n.title}
                          </span>
                          <span className="block text-[10px] text-slate-500 mt-0.5">{timeAgo(n.createdAt)}</span>
                        </span>
                        {!n.isRead && <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-indigo-400" />}
                      </button>
                    ))}
                  </div>
                )}

                {role === 'STUDENT' && (
                  <button
                    type="button"
                    onClick={() => openPortalTab('NOTIFICATIONS')}
                    className="mt-1.5 w-full py-2 rounded-lg text-xs font-semibold text-indigo-300 bg-slate-800/60 hover:bg-slate-700/60 transition-colors"
                  >
                    Show All Notifications
                  </button>
                )}
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
                  {/* Each role only sees its own portal (matches the top navigation) */}
                  {role === 'STUDENT' && (
                    <Link
                      href="/student"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-700/60 transition-colors"
                    >
                      <GraduationCap size={13} className="text-cyan-400" />
                      <span>Student Portal</span>
                    </Link>
                  )}

                  {role === 'TECHNICIAN' && (
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

                  {/* Account & Security Settings Tab / Modal Trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setIsProfileModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-700/60 hover:text-slate-100 transition-colors group text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck size={13} className="text-indigo-400 group-hover:text-indigo-300" />
                      <span>Account & Security</span>
                    </div>
                    {user?.requireLoginOtp && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        OTP ON
                      </span>
                    )}
                  </button>

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

      {/* Account Profile & Security Settings Modal */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </header>
  );
}
