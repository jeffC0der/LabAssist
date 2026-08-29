'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function DashboardPage() {
  const { role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (role === 'ADMIN') {
        router.replace('/admin');
      } else if (role === 'TECHNICIAN') {
        router.replace('/technician');
      } else {
        router.replace('/student');
      }
    }
  }, [role, isLoading, router]);

  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-3">
      <LoadingSpinner size={28} />
      <p className="text-xs text-slate-400 font-medium animate-pulse">
        Directing to your authorized workspace...
      </p>
    </div>
  );
}
