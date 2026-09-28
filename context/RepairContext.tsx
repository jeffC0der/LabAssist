'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

// ── Types ──
export type RepairStatus =
  | 'RECEIVED'
  | 'IN_DIAGNOSTICS'
  | 'REPAIR_IN_PROGRESS'
  | 'AWAITING_PARTS'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'CANCELLED';

export interface DeviceRepair {
  id: string;               // RMA number
  clientName: string;
  clientEmail: string;
  deviceType: 'Laptop' | 'Desktop' | 'Other';
  deviceModel: string;
  serialNumber: string;
  osSpecs: string;
  reportedIssue: string;
  inspectionNotes: {
    scratchesDents: boolean;
    missingScrewsFeet: boolean;
    screenDamageDeadPixels: boolean;
    liquidDamageIndicators: boolean;
  };
  additionalInspectionNotes: string;
  status: RepairStatus;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  technicianAssigned?: string;
  technicianNotes?: string;
  partsReplaced?: string;
  intakeDate: string;
  estimatedCompletion?: string;
  completedAt?: string;
  userId?: string;
}

export interface NewRepairIntake {
  clientName: string;
  clientEmail: string;
  deviceType: 'Laptop' | 'Desktop' | 'Other';
  deviceModel: string;
  serialNumber: string;
  osSpecs: string;
  reportedIssue: string;
  inspectionNotes: {
    scratchesDents: boolean;
    missingScrewsFeet: boolean;
    screenDamageDeadPixels: boolean;
    liquidDamageIndicators: boolean;
  };
  additionalInspectionNotes: string;
  userId?: string;
}

interface RepairContextValue {
  repairs: DeviceRepair[];
  isLoading: boolean;
  refreshRepairs: () => Promise<void>;
  submitRepair: (intake: NewRepairIntake) => Promise<DeviceRepair | null>;
  updateRepair: (rmaNumber: string, updates: {
    status?: RepairStatus;
    technicianName?: string;
    technicianNotes?: string;
    partsReplaced?: string;
    priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  }) => Promise<boolean>;
}

const RepairContext = createContext<RepairContextValue | null>(null);

export function RepairProvider({ children }: { children: React.ReactNode }) {
  const [repairs, setRepairs] = useState<DeviceRepair[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshRepairs = useCallback(async () => {
    try {
      const res = await fetch('/api/repairs', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.repairs && Array.isArray(data.repairs)) {
          setRepairs(data.repairs);
        }
      }
    } catch (err) {
      console.warn('Failed to load repairs from API:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshRepairs();
  }, [refreshRepairs]);

  // Supabase Realtime subscription for device_repairs
  useEffect(() => {
    try {
      const channel = supabase
        .channel('public:device_repairs:realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'device_repairs' },
          () => {
            // Refresh on any change
            refreshRepairs();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Failed to set up realtime for device_repairs:', err);
    }
  }, [refreshRepairs]);

  const submitRepair = useCallback(async (intake: NewRepairIntake): Promise<DeviceRepair | null> => {
    try {
      const res = await fetch('/api/repairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intake),
      });

      if (!res.ok) {
        const errData = await res.json();
        console.error('Repair submit error:', errData.error);
        return null;
      }

      const data = await res.json();
      if (data.repair) {
        setRepairs((prev) => [data.repair, ...prev]);
        return data.repair;
      }

      return null;
    } catch (err) {
      console.error('Repair submit network error:', err);
      return null;
    }
  }, []);

  const updateRepair = useCallback(async (
    rmaNumber: string,
    updates: {
      status?: RepairStatus;
      technicianName?: string;
      technicianNotes?: string;
      partsReplaced?: string;
      priority?: 'HIGH' | 'MEDIUM' | 'LOW';
    }
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/repairs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rmaNumber, ...updates }),
      });

      if (!res.ok) {
        const errData = await res.json();
        console.error('Repair update error:', errData.error);
        return false;
      }

      // Optimistic update
      setRepairs((prev) =>
        prev.map((r) => {
          if (r.id !== rmaNumber) return r;
          return {
            ...r,
            ...(updates.status ? { status: updates.status } : {}),
            ...(updates.technicianName ? { technicianAssigned: updates.technicianName } : {}),
            ...(updates.technicianNotes ? { technicianNotes: updates.technicianNotes } : {}),
            ...(updates.partsReplaced ? { partsReplaced: updates.partsReplaced } : {}),
            ...(updates.priority ? { priority: updates.priority } : {}),
            ...(updates.status === 'COMPLETED' ? { completedAt: new Date().toISOString() } : {}),
          };
        })
      );

      return true;
    } catch (err) {
      console.error('Repair update network error:', err);
      return false;
    }
  }, []);

  return (
    <RepairContext.Provider value={{ repairs, isLoading, refreshRepairs, submitRepair, updateRepair }}>
      {children}
    </RepairContext.Provider>
  );
}

export function useRepairs() {
  const ctx = useContext(RepairContext);
  if (!ctx) throw new Error('useRepairs must be used within RepairProvider');
  return ctx;
}
