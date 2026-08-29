'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/nav/Header';
import StudentPortal from '@/components/student/StudentPortal';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function StudentPage() {
  const { user, role, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const isAuthorized = isAuthenticated && role === 'STUDENT';

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/auth');
      } else if (role === 'TECHNICIAN') {
        router.replace('/technician');
      } else if (role === 'ADMIN') {
        router.replace('/admin');
      }
    }
  }, [role, isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthorized) {
    return (
      <main className="min-h-screen bg-base flex flex-col items-center justify-center p-4">
        <LoadingSpinner size={28} className="text-cyan-400 mb-2" />
        <p className="text-xs text-slate-400 font-mono">Verifying Student Authorization...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-base pb-12" id="student-portal-main">
      <a href="#student-portal-main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-cyan-500 focus:text-white focus:rounded-lg">
        Skip to student portal
      </a>

      <Header />

      <div className="max-w-[1650px] mx-auto px-4 sm:px-6 py-6">
        <StudentPortal />

        {/* Global Footer */}
        <div className="mt-12 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <span>LabAssist Student Portal · IoT Campus Network</span>
          <span className="flex items-center gap-1.5 font-mono text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Hardware Remote Keys A–D Live
          </span>
        </div>
      </div>
    </main>
  );
}
