import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import AuthCard from '@/components/auth/AuthCard';
import { Cpu } from 'lucide-react';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export const metadata: Metadata = {
  title: 'Sign In — LabAssist',
  description: 'Sign in or create an account to access the LabAssist IT dashboard.',
};

export default function AuthPage() {
  return (
    <main className="min-h-screen bg-base relative flex flex-col" id="auth-main">
      {/* Background effects */}
      <div
        className="absolute inset-0 dot-grid opacity-40 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.1) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      {/* Top nav bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 nav-blur">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Back to LabAssist Home">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-glow-indigo">
            <Cpu size={16} className="text-white" />
          </div>
          <span className="text-sm font-bold text-slate-100">Lab</span>
          <span className="text-sm font-bold gradient-text -ml-1.5">Assist</span>
        </Link>
        <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
          ← Back to home
        </Link>
      </div>

      {/* Auth card centered */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Suspense fallback={
            <div className="glass rounded-2xl p-8 text-center">
              <LoadingSpinner size={24} className="text-indigo-400 mx-auto" />
            </div>
          }>
            <AuthCard />
          </Suspense>
        </div>
      </div>


      {/* Footer */}
      <div className="relative z-10 text-center py-4 text-xs text-slate-700">
        LabAssist Campus IT Services · Secure Authentication
      </div>
    </main>
  );
}
