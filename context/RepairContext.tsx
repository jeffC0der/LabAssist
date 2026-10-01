'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

// ── Types ──
export type RepairStatus =
  | 'RECEIVED'
  | 'PENDING_EVALUATION'
  | 'UNDER_EVALUATION'
  | 'EVALUATED'
  | 'CONFIRMED'
  | 'IN_DIAGNOSTICS'
  | 'REPAIR_IN_PROGRESS'
  | 'AWAITING_PARTS'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'CANCELLED';

export interface RepairEvaluationData {
  evaluatorId?: string;
  technicianEvaluation?: string;
  repairFeasibility?: 'FEASIBLE' | 'NOT_FEASIBLE' | 'BER_BEYOND_ECONOMIC_REPAIR' | 'PENDING';
  partsAvailability?: 'IN_STOCK' | 'TO_ORDER' | 'CLIENT_PROVIDED' | 'NOT_AVAILABLE';
  confirmedDate?: string;
  confirmedTime?: string;
  confirmedLocation?: string;
  evaluatedAt?: string;
}

export interface RepairCancellationData {
  reason?: string;
  description?: string;
  cancelledAt?: string;
  cancelledBy?: string;
}

export interface RepairCompletionData {
  deviceReleasedTo?: string;
  completedAt?: string;
}

export interface RepairBillingData {
  paymentTiming?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  totalAmount?: number;
  amountPaid?: number;
  onlinePaymentReference?: string;
  settlementDate?: string;
}

export interface DeviceRepair {
  id: string;               // RMA / Request number
  jobOrderNo?: string;
  requestNumber?: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientDepartment?: string;
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
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';
  technicianAssigned?: string;
  technicianId?: string;
  technicianNotes?: string;
  partsReplaced?: string;
  intakeDate: string;
  estimatedCompletion?: string;
  readyAt?: string;
  pickupLocation?: string;
  deviceReleasedTo?: string;
  completedAt?: string;
  userId?: string;

  // Workflow Objects
  evaluation?: RepairEvaluationData;
  cancellation?: RepairCancellationData;
  completion?: RepairCompletionData;
  billing?: RepairBillingData;
}

export interface NewRepairIntake {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientDepartment?: string;
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
  evaluation?: RepairEvaluationData;
}

export interface UpdateRepairPayload {
  status?: RepairStatus;
  technicianName?: string;
  technicianId?: string;
  technicianNotes?: string;
  partsReplaced?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';
  // Evaluation
  technicianEvaluation?: string;
  repairFeasibility?: string;
  partsAvailability?: string;
  confirmedDate?: string;
  confirmedTime?: string;
  confirmedLocation?: string;
  evaluatorId?: string;
  // Ready for Pickup
  pickupLocation?: string;
  readyAt?: string;
  // Completion
  deviceReleasedTo?: string;
  completedAt?: string;
  // Cancellation
  cancellationReason?: string;
  cancellationDescription?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  // Billing
  paymentTiming?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  totalAmount?: number;
  amountPaid?: number;
  onlinePaymentReference?: string;
  settlementDate?: string;
  // Client Info (for emails / logging)
  clientEmail?: string;
  clientName?: string;
  deviceModel?: string;
  isAdmin?: boolean;
}

interface RepairContextValue {
  repairs: DeviceRepair[];
  isLoading: boolean;
  refreshRepairs: () => Promise<void>;
  submitRepair: (intake: NewRepairIntake) => Promise<DeviceRepair | null>;
  updateRepair: (rmaNumber: string, updates: UpdateRepairPayload) => Promise<boolean>;
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
          const uniqueRepairs: DeviceRepair[] = [];
          const seen = new Set<string>();
          for (const rep of data.repairs) {
            if (rep && rep.id && !seen.has(rep.id)) {
              seen.add(rep.id);
              uniqueRepairs.push(rep);
            }
          }
          setRepairs(uniqueRepairs);
        }
      }
    } catch (err) {
      console.warn('Failed to load repairs from API:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Broadcast helper to notify other tabs immediately
  const notifyCrossTabUpdate = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('labassist_repairs_synced_at', Date.now().toString());
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('labassist_repairs_sync');
          bc.postMessage({ type: 'REPAIRS_UPDATED', timestamp: Date.now() });
          bc.close();
        }
      }
    } catch (_) {}
  }, []);

  // Initial load
  useEffect(() => {
    refreshRepairs();
  }, [refreshRepairs]);

  // Periodic polling (every 3.5s) & tab visibility/focus sync
  useEffect(() => {
    const interval = setInterval(() => {
      refreshRepairs();
    }, 3500);

    const handleFocus = () => {
      refreshRepairs();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshRepairs();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'labassist_repairs_synced_at') {
        refreshRepairs();
      }
    };

    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('labassist_repairs_sync');
        bc.onmessage = () => {
          refreshRepairs();
        };
      } catch (_) {}
    }

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
    };
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
        setRepairs((prev) => {
          const filtered = prev.filter((r) => r.id !== data.repair.id);
          return [data.repair, ...filtered];
        });
        notifyCrossTabUpdate();
        refreshRepairs();
        return data.repair;
      }

      return null;
    } catch (err) {
      console.error('Repair submit network error:', err);
      return null;
    }
  }, [notifyCrossTabUpdate, refreshRepairs]);

  const updateRepair = useCallback(async (
    rmaNumber: string,
    updates: UpdateRepairPayload
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
            ...(updates.technicianId ? { technicianId: updates.technicianId } : {}),
            ...(updates.technicianNotes ? { technicianNotes: updates.technicianNotes } : {}),
            ...(updates.partsReplaced ? { partsReplaced: updates.partsReplaced } : {}),
            ...(updates.priority ? { priority: updates.priority } : {}),
            ...(updates.status === 'COMPLETED' ? { completedAt: new Date().toISOString() } : {}),
            evaluation: {
              ...r.evaluation,
              ...(updates.technicianEvaluation !== undefined ? { technicianEvaluation: updates.technicianEvaluation } : {}),
              ...(updates.repairFeasibility !== undefined ? { repairFeasibility: updates.repairFeasibility as any } : {}),
              ...(updates.partsAvailability !== undefined ? { partsAvailability: updates.partsAvailability as any } : {}),
              ...(updates.confirmedDate !== undefined ? { confirmedDate: updates.confirmedDate } : {}),
              ...(updates.confirmedTime !== undefined ? { confirmedTime: updates.confirmedTime } : {}),
              ...(updates.confirmedLocation !== undefined ? { confirmedLocation: updates.confirmedLocation } : {}),
              ...(updates.evaluatorId !== undefined ? { evaluatorId: updates.evaluatorId } : {}),
            },
            cancellation: updates.cancellationReason
              ? {
                  reason: updates.cancellationReason,
                  description: updates.cancellationDescription,
                  cancelledAt: updates.cancelledAt || new Date().toISOString(),
                  cancelledBy: updates.cancelledBy,
                }
              : r.cancellation,
            completion: updates.deviceReleasedTo
              ? {
                  deviceReleasedTo: updates.deviceReleasedTo,
                  completedAt: updates.completedAt || new Date().toISOString(),
                }
              : r.completion,
            billing: {
              ...r.billing,
              ...(updates.paymentTiming !== undefined ? { paymentTiming: updates.paymentTiming } : {}),
              ...(updates.paymentStatus !== undefined ? { paymentStatus: updates.paymentStatus } : {}),
              ...(updates.paymentMethod !== undefined ? { paymentMethod: updates.paymentMethod } : {}),
              ...(updates.totalAmount !== undefined ? { totalAmount: updates.totalAmount } : {}),
              ...(updates.amountPaid !== undefined ? { amountPaid: updates.amountPaid } : {}),
              ...(updates.onlinePaymentReference !== undefined ? { onlinePaymentReference: updates.onlinePaymentReference } : {}),
              ...(updates.settlementDate !== undefined ? { settlementDate: updates.settlementDate } : {}),
            },
          };
        })
      );

      notifyCrossTabUpdate();
      refreshRepairs();

      return true;
    } catch (err) {
      console.error('Repair update network error:', err);
      return false;
    }
  }, [notifyCrossTabUpdate, refreshRepairs]);

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

