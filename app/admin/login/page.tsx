'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Admin login page is deprecated — all users sign in via the unified /auth page.
// Admin credentials entered at /auth are automatically routed to /admin on success.
export default function AdminLoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/auth');
  }, [router]);
  return null;
}
