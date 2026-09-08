'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MOCK_TICKETS, type Ticket, type TicketStatus, type TicketCategory } from '@/lib/mockData';
import { supabase } from '@/lib/supabaseClient';

interface TicketFilters {
  lab: string;
  category: TicketCategory | 'ALL';
  status: TicketStatus | 'ALL';
  search: string;
}

interface TicketContextValue {
  tickets: Ticket[];
  filters: TicketFilters;
  filteredTickets: Ticket[];
  isLoading: boolean;
  setFilter: (key: keyof TicketFilters, value: string) => void;
  dispatch: (ticketId: string, assignee: string) => Promise<void>;
  resolve: (ticketId: string, notes?: string) => Promise<void>;
  addTicket: (ticket: Ticket) => Promise<void>;
  refreshTickets: () => Promise<void>;
}

const defaultFilters: TicketFilters = {
  lab: 'All Labs',
  category: 'ALL',
  status: 'ALL',
  search: '',
};

const TicketContext = createContext<TicketContextValue | null>(null);

export function TicketProvider({ children }: { children: React.ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>(MOCK_TICKETS);
  const [filters, setFilters] = useState<TicketFilters>(defaultFilters);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper to fetch latest tickets from backend / Supabase
  const refreshTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/tickets', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.tickets && Array.isArray(data.tickets) && data.tickets.length > 0) {
          setTickets(data.tickets);
        }
      }
    } catch (err) {
      console.warn('Failed to load tickets from API, using cached state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshTickets();
  }, [refreshTickets]);

  // Supabase Realtime subscription for live updates across student & technician dashboards
  useEffect(() => {
    try {
      const channel = supabase
        .channel('public:tickets:realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tickets' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newRow: any = payload.new;
              const newTicket: Ticket = {
                ticket_id: newRow.ticket_id,
                lab_id: newRow.lab_id,
                pc_num: newRow.pc_num,
                category: newRow.category,
                key: newRow.key,
                timestamp: newRow.created_at || new Date().toISOString(),
                status: newRow.status,
                reporter: newRow.reporter,
                description: newRow.description,
                priority: newRow.priority,
                assignee: newRow.assignee || undefined,
                resolvedAt: newRow.resolved_at || undefined,
                notes: newRow.notes || undefined,
              };
              setTickets((prev) => {
                if (prev.some((t) => t.ticket_id === newTicket.ticket_id)) {
                  return prev;
                }
                return [newTicket, ...prev];
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedRow: any = payload.new;
              setTickets((prev) =>
                prev.map((t) =>
                  t.ticket_id === updatedRow.ticket_id
                    ? {
                        ...t,
                        status: updatedRow.status,
                        assignee: updatedRow.assignee || undefined,
                        resolvedAt: updatedRow.resolved_at || undefined,
                        notes: updatedRow.notes || undefined,
                        priority: updatedRow.priority || t.priority,
                      }
                    : t
                )
              );
            } else if (payload.eventType === 'DELETE') {
              const oldRow: any = payload.old;
              setTickets((prev) => prev.filter((t) => t.ticket_id !== oldRow.ticket_id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Could not establish Supabase realtime channel:', err);
    }
  }, []);

  const setFilter = useCallback((key: keyof TicketFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const dispatch = useCallback(async (ticketId: string, assignee: string) => {
    // 1. Optimistic local update
    setTickets((prev) =>
      prev.map((t) =>
        t.ticket_id === ticketId
          ? { ...t, status: 'DISPATCHED' as TicketStatus, assignee }
          : t
      )
    );

    // 2. Persist to Supabase via backend API
    try {
      await fetch('/api/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, status: 'DISPATCHED', assignee }),
      });
    } catch (err) {
      console.error('Failed to dispatch ticket on server:', err);
    }
  }, []);

  const resolve = useCallback(async (ticketId: string, notes?: string) => {
    const resolvedAt = new Date().toISOString();

    // 1. Optimistic local update
    setTickets((prev) =>
      prev.map((t) =>
        t.ticket_id === ticketId
          ? { ...t, status: 'RESOLVED' as TicketStatus, resolvedAt, notes }
          : t
      )
    );

    // 2. Persist to Supabase via backend API (also resets workstation to ONLINE)
    try {
      await fetch('/api/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, status: 'RESOLVED', resolvedAt, notes }),
      });
    } catch (err) {
      console.error('Failed to resolve ticket on server:', err);
    }
  }, []);

  const addTicket = useCallback(async (ticket: Ticket) => {
    // 1. Optimistic local update
    setTickets((prev) => [ticket, ...prev]);

    // 2. Persist to Supabase via backend API (also sets workstation to UNDER_REPAIR)
    try {
      await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket }),
      });
    } catch (err) {
      console.error('Failed to add ticket on server:', err);
    }
  }, []);

  const filteredTickets = tickets.filter((t) => {
    if (filters.lab !== 'All Labs' && t.lab_id !== filters.lab) return false;
    if (filters.category !== 'ALL' && t.category !== filters.category) return false;
    if (filters.status !== 'ALL' && t.status !== filters.status) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return (
        t.ticket_id.toLowerCase().includes(q) ||
        t.lab_id.toLowerCase().includes(q) ||
        t.pc_num.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.assignee?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  return (
    <TicketContext.Provider
      value={{
        tickets,
        filters,
        filteredTickets,
        isLoading,
        setFilter,
        dispatch,
        resolve,
        addTicket,
        refreshTickets,
      }}
    >
      {children}
    </TicketContext.Provider>
  );
}

export function useTickets(): TicketContextValue {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error('useTickets must be inside TicketProvider');
  return ctx;
}
