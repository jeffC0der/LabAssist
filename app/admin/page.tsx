'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/nav/Header';
import AdminConsole from '@/components/admin/AdminConsole';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function AdminPage() {
  const { role, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const isAuthorized = isAuthenticated && role === 'ADMIN';

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/auth');
      } else if (role === 'STUDENT') {
        router.replace('/student');
      } else if (role === 'TECHNICIAN') {
        router.replace('/technician');
      }
    }
  }, [role, isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthorized) {
    return (
      <main className="min-h-screen bg-base flex flex-col items-center justify-center p-4">
        <LoadingSpinner size={28} className="text-violet-400 mb-2" />
        <p className="text-xs text-slate-400 font-mono">Verifying Root Admin Authorization...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-base pb-12" id="admin-portal-main">
      <a href="#admin-portal-main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-violet-500 focus:text-white focus:rounded-lg">
        Skip to admin console
      </a>

      <Header />

      <div className="max-w-[1650px] mx-auto px-4 sm:px-6 py-6">
        <AdminConsole />

        {/* Global Footer */}
        <div className="mt-12 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <span>LabAssist Root Infrastructure Console · Campus Lab System</span>
          <span className="flex items-center gap-1.5 font-mono text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Security Protocol: Active (TLS 1.3)
          </span>
        </div>
      </div>
    </main>
  );
}
