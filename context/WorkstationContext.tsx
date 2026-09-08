'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MOCK_WORKSTATIONS, type Workstation, type WorkstationStatus } from '@/lib/mockData';
import { supabase } from '@/lib/supabaseClient';

interface WorkstationContextValue {
  workstations: Record<string, Workstation[]>;
  isLoading: boolean;
  refreshWorkstations: () => Promise<void>;
  updateStationStatus: (labCode: string, pcNum: string, status: WorkstationStatus, issue?: string) => Promise<void>;
}

const WorkstationContext = createContext<WorkstationContextValue | null>(null);

export function WorkstationProvider({ children }: { children: React.ReactNode }) {
  const [workstations, setWorkstations] = useState<Record<string, Workstation[]>>(MOCK_WORKSTATIONS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshWorkstations = useCallback(async () => {
    try {
      const res = await fetch('/api/workstations', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.workstations && Object.keys(data.workstations).length > 0) {
          setWorkstations(data.workstations);
        }
      }
    } catch (err) {
      console.warn('Failed to load workstations from API:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshWorkstations();
  }, [refreshWorkstations]);

  // Supabase Realtime channel subscription for workstations
  useEffect(() => {
    try {
      const channel = supabase
        .channel('public:workstations:realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'workstations' },
          (payload) => {
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              const row: any = payload.new;
              const lab = row.lab_code;
              const pcId = row.pc_num;
              const status = row.status as WorkstationStatus;
              const activeIssue = row.active_issue || undefined;

              setWorkstations((prev) => {
                const labStations = prev[lab] ? [...prev[lab]] : [];
                const idx = labStations.findIndex((s) => s.id === pcId);
                if (idx >= 0) {
                  labStations[idx] = {
                    ...labStations[idx],
                    status,
                    activeIssue,
                    user: row.assigned_user || undefined,
                  };
                } else {
                  labStations.push({
                    id: pcId,
                    labId: lab,
                    status,
                    ip: row.ip_address || '10.12.0.1',
                    specs: row.specs || 'Intel Core i7 · 32GB RAM',
                    lastPing: 'Just now',
                    activeIssue,
                    user: row.assigned_user || undefined,
                  });
                }
                return { ...prev, [lab]: labStations };
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Could not establish Supabase workstation realtime channel:', err);
    }
  }, []);

  const updateStationStatus = useCallback(
    async (labCode: string, pcNum: string, status: WorkstationStatus, issue?: string) => {
      // Optimistic update
      setWorkstations((prev) => {
        const labStations = prev[labCode] ? [...prev[labCode]] : [];
        const idx = labStations.findIndex((s) => s.id === pcNum);
        if (idx >= 0) {
          labStations[idx] = { ...labStations[idx], status, activeIssue: issue };
        }
        return { ...prev, [labCode]: labStations };
      });

      try {
        await fetch('/api/workstations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            labCode,
            pcNum,
            status,
            activeIssue: issue || null,
          }),
        });
      } catch (err) {
        console.error('Failed to update workstation on server:', err);
      }
    },
    []
  );

  return (
    <WorkstationContext.Provider
      value={{
        workstations,
        isLoading,
        refreshWorkstations,
        updateStationStatus,
      }}
    >
      {children}
    </WorkstationContext.Provider>
  );
}

export function useWorkstations(): WorkstationContextValue {
  const ctx = useContext(WorkstationContext);
  if (!ctx) throw new Error('useWorkstations must be used inside WorkstationProvider');
  return ctx;
}
