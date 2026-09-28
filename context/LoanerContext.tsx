'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { LoanerItem, LoanerRequest } from '@/lib/mockData';

interface LoanerContextValue {
  items: LoanerItem[];
  requests: LoanerRequest[];
  isLoading: boolean;
  refreshLoaners: () => Promise<void>;
  submitRequest: (req: {
    itemId: string;
    itemName: string;
    studentName: string;
    studentId: string;
    labRoom: string;
    duration: string;
  }) => Promise<{ success: boolean; lockerCode?: string; request?: LoanerRequest }>;
  updateRequestStatus: (requestId: string, status: string, itemId?: string) => Promise<boolean>;
}

const LoanerContext = createContext<LoanerContextValue | null>(null);

export function LoanerProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<LoanerItem[]>([]);
  const [requests, setRequests] = useState<LoanerRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshLoaners = useCallback(async () => {
    try {
      const res = await fetch('/api/loaners', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.items) setItems(data.items);
        if (data.requests) setRequests(data.requests);
      }
    } catch (err) {
      console.warn('Failed to load loaners from API:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshLoaners();
  }, [refreshLoaners]);

  // Supabase Realtime for loaner_requests
  useEffect(() => {
    try {
      const channel = supabase
        .channel('public:loaner_requests:realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'loaner_requests' },
          () => {
            refreshLoaners();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Failed to set up realtime for loaner_requests:', err);
    }
  }, [refreshLoaners]);

  const submitRequest = useCallback(async (req: {
    itemId: string;
    itemName: string;
    studentName: string;
    studentId: string;
    labRoom: string;
    duration: string;
  }): Promise<{ success: boolean; lockerCode?: string; request?: LoanerRequest }> => {
    try {
      const res = await fetch('/api/loaners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });

      if (!res.ok) {
        return { success: false };
      }

      const data = await res.json();
      if (data.success && data.request) {
        setRequests((prev) => [data.request, ...prev]);
        // Optimistic stock decrement
        setItems((prev) =>
          prev.map((i) =>
            i.id === req.itemId ? { ...i, available: Math.max(0, i.available - 1) } : i
          )
        );
        return { success: true, lockerCode: data.lockerCode, request: data.request };
      }

      return { success: false };
    } catch (err) {
      console.error('Loaner request error:', err);
      return { success: false };
    }
  }, []);

  const updateRequestStatus = useCallback(async (
    requestId: string,
    status: string,
    itemId?: string
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/loaners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status, itemId }),
      });

      if (!res.ok) return false;

      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: status as any } : r))
      );

      if (status === 'RETURNED' && itemId) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId ? { ...i, available: Math.min(i.total, i.available + 1) } : i
          )
        );
      }

      return true;
    } catch (err) {
      console.error('Loaner status update error:', err);
      return false;
    }
  }, []);

  return (
    <LoanerContext.Provider value={{ items, requests, isLoading, refreshLoaners, submitRequest, updateRequestStatus }}>
      {children}
    </LoanerContext.Provider>
  );
}

export function useLoaners() {
  const ctx = useContext(LoanerContext);
  if (!ctx) throw new Error('useLoaners must be used within LoanerProvider');
  return ctx;
}
