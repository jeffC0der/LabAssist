'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { MOCK_TICKETS, type Ticket, type TicketStatus, type TicketCategory } from '@/lib/mockData';

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
  setFilter: (key: keyof TicketFilters, value: string) => void;
  dispatch: (ticketId: string, assignee: string) => void;
  resolve: (ticketId: string, notes?: string) => void;
  addTicket: (ticket: Ticket) => void;
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

  const setFilter = useCallback((key: keyof TicketFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const dispatch = useCallback((ticketId: string, assignee: string) => {
    setTickets(prev => prev.map(t =>
      t.ticket_id === ticketId
        ? { ...t, status: 'DISPATCHED' as TicketStatus, assignee }
        : t
    ));
  }, []);

  const resolve = useCallback((ticketId: string, notes?: string) => {
    setTickets(prev => prev.map(t =>
      t.ticket_id === ticketId
        ? { ...t, status: 'RESOLVED' as TicketStatus, resolvedAt: new Date().toISOString(), notes }
        : t
    ));
  }, []);

  const addTicket = useCallback((ticket: Ticket) => {
    setTickets(prev => [ticket, ...prev]);
  }, []);

  const filteredTickets = tickets.filter(t => {
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
    <TicketContext.Provider value={{ tickets, filters, filteredTickets, setFilter, dispatch, resolve, addTicket }}>
      {children}
    </TicketContext.Provider>
  );
}

export function useTickets(): TicketContextValue {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error('useTickets must be inside TicketProvider');
  return ctx;
}
