'use client';
import React, { useState } from 'react';
import {
  Wrench,
  Laptop,
  Monitor,
  User,
  Mail,
  Phone,
  Building,
  Cpu,
  Hash,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  CheckSquare,
  Square,
  FileText,
  ChevronDown,
  ChevronUp,
  Tag,
  Check,
  ArrowRight,
  Edit3,
  Calendar,
  MapPin,
  XCircle,
  AlertCircle,
  Layers,
  Sparkles,
  ClipboardCheck,
  Package,
  Receipt,
  CreditCard,
  DollarSign,
  Plus,
  Trash2,
  Printer,
  ExternalLink,
  X,
  QrCode,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRepairs, DeviceRepair, RepairStatus } from '@/context/RepairContext';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const LAB_ROOM_OPTIONS = [
  { code: 'LAB-101', name: 'Embedded Systems & IoT Lab (1st Floor)' },
  { code: 'LAB-102', name: 'Introductory Computing Lab (1st Floor)' },
  { code: 'LAB-103', name: 'Digital Logic & Circuitry (Shannon Tech)' },
  { code: 'LAB-104', name: 'Microcontroller Design Lab (Shannon Tech)' },
  { code: 'LAB-105', name: 'AI & High Performance Studio (Von Neumann)' },
];

const CANCELLATION_REASONS = [
  'Repair is not feasible',
  'Required parts unavailable',
  'Customer does not agree to the repair/cost',
  'Client Requested Cancellation',
  'Beyond Economic Repair (BER)',
  'Other technician-specified reason',
];

export default function TechnicianRepairsWorkbench() {
  const { user } = useAuth();
  const toast = useToast();
  const { repairs, updateRepair, isLoading: repairsLoading } = useRepairs();

  // Workflow Stage Tabs: EVALUATION vs CONFIRMED vs COMPLETED vs CANCELLED
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<'EVALUATION' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('EVALUATION');

  // Filters & Search
  const [deviceFilter, setDeviceFilter] = useState<'ALL' | 'PC' | 'Laptop'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Evaluation Form Drafting State (keyed by repair ID)
  const [evaluationForms, setEvaluationForms] = useState<
    Record<
      string,
      {
        technicianEvaluation: string;
        repairFeasibility: 'FEASIBLE' | 'NOT_FEASIBLE' | 'BER_BEYOND_ECONOMIC_REPAIR' | 'PENDING';
        partsAvailability: 'IN_STOCK' | 'TO_ORDER' | 'CLIENT_PROVIDED' | 'NOT_AVAILABLE';
        confirmedDate: string;
        confirmedTime: string;
        confirmedLocation: string;
      }
    >
  >({});

  // Cancellation Modal State
  const [declineModalTarget, setDeclineModalTarget] = useState<DeviceRepair | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>(CANCELLATION_REASONS[0]);
  const [cancellationDescription, setCancellationDescription] = useState<string>('');
  const [isSubmittingDecline, setIsSubmittingDecline] = useState<boolean>(false);

  // Confirmation Submitting State
  const [isConfirmingId, setIsConfirmingId] = useState<string | null>(null);

  // Technician Note & Parts Editing for Confirmed Jobs
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [techNoteDraft, setTechNoteDraft] = useState<string>('');
  const [editingPartsId, setEditingPartsId] = useState<string | null>(null);
  const [partsReplacedDraft, setPartsReplacedDraft] = useState<string>('');

  // ── Billing Form & Modal State ──
  const [billingTarget, setBillingTarget] = useState<DeviceRepair | null>(null);
  const [billingItems, setBillingItems] = useState<
    Array<{ id: string; workScope: string; itemName: string; quantity: number | string; unitCost: number | string }>
  >([{ id: 'item-1', workScope: '', itemName: '', quantity: 1, unitCost: '' }]);
  const [billingPaymentTiming, setBillingPaymentTiming] = useState<'PAY_NOW' | 'PAY_AFTER_REPAIR'>('PAY_AFTER_REPAIR');
  const [billingPaymentMethod, setBillingPaymentMethod] = useState<'CASH' | 'ONLINE'>('CASH');
  const [billingAmountPaid, setBillingAmountPaid] = useState<string>('');
  const [billingOnlineReference, setBillingOnlineReference] = useState<string>('');
  const [billingNotes, setBillingNotes] = useState<string>('');
  const [isSubmittingBilling, setIsSubmittingBilling] = useState<boolean>(false);

  // ── View Invoice Modal State ──
  const [invoiceViewData, setInvoiceViewData] = useState<any | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState<boolean>(false);

  // ── Ready for Pickup Modal State ──
  const [pickupModalTarget, setPickupModalTarget] = useState<DeviceRepair | null>(null);
  const [pickupLocationInput, setPickupLocationInput] = useState<string>('Electronics Diagnostics & Repair Desk - Room 402');
  const [isSubmittingPickup, setIsSubmittingPickup] = useState<boolean>(false);

  // ── Payment Settlement Modal State ──
  const [settlementModalTarget, setSettlementModalTarget] = useState<DeviceRepair | null>(null);
  const [settlementInvoiceData, setSettlementInvoiceData] = useState<any | null>(null);
  const [settlementMethod, setSettlementMethod] = useState<'CASH' | 'ONLINE'>('CASH');
  const [settlementAmount, setSettlementAmount] = useState<string>('');
  const [settlementReference, setSettlementReference] = useState<string>('');
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState<boolean>(false);

  // ── Device Release Modal State ──
  const [releaseModalTarget, setReleaseModalTarget] = useState<DeviceRepair | null>(null);
  const [releaseRecipient, setReleaseRecipient] = useState<string>('');
  const [isSubmittingRelease, setIsSubmittingRelease] = useState<boolean>(false);
  const [isCheckingInvoice, setIsCheckingInvoice] = useState<string | null>(null);

  // ── Final Receipt Modal State ──
  const [finalReceiptData, setFinalReceiptData] = useState<any | null>(null);

  // Auto-initialize form draft for a job when expanded
  const getOrInitEvaluationForm = (job: DeviceRepair) => {
    if (evaluationForms[job.id]) {
      return evaluationForms[job.id];
    }
    const today = new Date().toISOString().split('T')[0];
    const initial = {
      technicianEvaluation: job.evaluation?.technicianEvaluation || '',
      repairFeasibility: job.evaluation?.repairFeasibility || 'FEASIBLE',
      partsAvailability: job.evaluation?.partsAvailability || 'IN_STOCK',
      confirmedDate: job.evaluation?.confirmedDate || today,
      confirmedTime: job.evaluation?.confirmedTime || '10:00',
      confirmedLocation: job.evaluation?.confirmedLocation || 'LAB-101',
    };
    return initial;
  };

  const handleFormChange = (jobId: string, field: string, value: any) => {
    setEvaluationForms((prev) => {
      const current = prev[jobId] || {
        technicianEvaluation: '',
        repairFeasibility: 'FEASIBLE',
        partsAvailability: 'IN_STOCK',
        confirmedDate: new Date().toISOString().split('T')[0],
        confirmedTime: '10:00',
        confirmedLocation: 'LAB-101',
      };
      return {
        ...prev,
        [jobId]: { ...current, [field]: value },
      };
    });
  };

  // Group repairs into workflow buckets
  const evaluationQueue = repairs.filter(
    (r) =>
      r.status === 'RECEIVED' ||
      r.status === 'PENDING_EVALUATION' ||
      r.status === 'UNDER_EVALUATION' ||
      r.status === 'EVALUATED'
  );

  const confirmedQueue = repairs.filter(
    (r) =>
      r.status === 'CONFIRMED' ||
      r.status === 'IN_DIAGNOSTICS' ||
      r.status === 'REPAIR_IN_PROGRESS' ||
      r.status === 'AWAITING_PARTS' ||
      r.status === 'READY_FOR_PICKUP'
  );

  const completedQueue = repairs.filter((r) => r.status === 'COMPLETED');

  const cancelledQueue = repairs.filter((r) => r.status === 'CANCELLED');

  // Select active dataset based on workflow tab
  const activeDataset =
    activeWorkflowTab === 'EVALUATION'
      ? evaluationQueue
      : activeWorkflowTab === 'CONFIRMED'
      ? confirmedQueue
      : activeWorkflowTab === 'COMPLETED'
      ? completedQueue
      : cancelledQueue;

  // Filter dataset by device type and search query
  const filteredJobs = activeDataset.filter((job) => {
    if (deviceFilter === 'Laptop' && job.deviceType !== 'Laptop') return false;
    if (deviceFilter === 'PC' && job.deviceType !== 'Desktop') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = `${job.id} ${job.clientName} ${job.clientEmail} ${job.deviceModel} ${job.serialNumber} ${job.reportedIssue}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }

    return true;
  });

  const laptopCount = activeDataset.filter((j) => j.deviceType === 'Laptop').length;
  const pcCount = activeDataset.filter((j) => j.deviceType === 'Desktop').length;

  // ── Action: Confirm Job Order ──
  const handleConfirmJobOrder = async (job: DeviceRepair) => {
    const formData = evaluationForms[job.id] || getOrInitEvaluationForm(job);

    if (!formData.technicianEvaluation.trim()) {
      toast.warning('Evaluation Notes Required', 'Please enter your technician assessment notes before confirming the Job Order.');
      return;
    }

    setIsConfirmingId(job.id);
    const techName = user?.name || job.technicianAssigned || 'Tech. Alex Torres';
    const techId = user?.id || job.technicianId;

    const success = await updateRepair(job.id, {
      status: 'CONFIRMED',
      technicianName: techName,
      technicianId: techId,
      technicianEvaluation: formData.technicianEvaluation.trim(),
      repairFeasibility: formData.repairFeasibility,
      partsAvailability: formData.partsAvailability,
      confirmedDate: formData.confirmedDate,
      confirmedTime: formData.confirmedTime,
      confirmedLocation: formData.confirmedLocation,
      evaluatorId: user?.id,
    });

    setIsConfirmingId(null);

    if (success) {
      toast.success(
        'Job Order Confirmed',
        `Request ${job.id} has been evaluated and moved to Confirmed Job Orders.`
      );
      // Switch view to confirmed tab to see the newly confirmed job order
      setActiveWorkflowTab('CONFIRMED');
      setExpandedJobId(job.id);
    } else {
      toast.error('Confirmation Failed', `Could not confirm job order ${job.id}.`);
    }
  };

  // ── Action: Decline & Cancel Repair Request ──
  const handleOpenDeclineModal = (job: DeviceRepair) => {
    setDeclineModalTarget(job);
    setCancellationReason(CANCELLATION_REASONS[0]);
    setCancellationDescription('');
  };

  const handleConfirmDecline = async () => {
    if (!declineModalTarget) return;

    if (!cancellationDescription.trim()) {
      toast.warning('Description Required', 'Please provide a detailed cancellation description for dispute protection.');
      return;
    }

    setIsSubmittingDecline(true);
    const techName = user?.name || 'Assigned Technician';

    const success = await updateRepair(declineModalTarget.id, {
      status: 'CANCELLED',
      cancellationReason,
      cancellationDescription: cancellationDescription.trim(),
      cancelledAt: new Date().toISOString(),
      cancelledBy: user?.id,
      technicianName: techName,
    });

    setIsSubmittingDecline(false);

    if (success) {
      toast.info(
        'Repair Request Declined',
        `Request ${declineModalTarget.id} has been cancelled with recorded reasons.`
      );
      setDeclineModalTarget(null);
    } else {
      toast.error('Decline Failed', `Could not cancel request ${declineModalTarget.id}.`);
    }
  };

  // ── Action: Update Confirmed Job Status ──
  const handleUpdateStatus = async (jobId: string, newStatus: RepairStatus) => {
    if (newStatus === 'READY_FOR_PICKUP') {
      const job = repairs.find((r) => r.id === jobId);
      if (job) {
        handleOpenPickupModal(job);
        return;
      }
    }
    if (newStatus === 'COMPLETED') {
      const job = repairs.find((r) => r.id === jobId);
      if (job) {
        handleSelectMarkComplete(job);
        return;
      }
    }
    const success = await updateRepair(jobId, { status: newStatus });
    if (success) {
      toast.success('Status Updated', `Job order ${jobId} moved to ${newStatus.replace(/_/g, ' ')}.`);
    } else {
      toast.error('Update Failed', `Could not update status for ${jobId}.`);
    }
  };

  // ── Action: Select Mark Complete (Check Payment Status First) ──
  const handleSelectMarkComplete = async (job: DeviceRepair) => {
    setIsCheckingInvoice(job.id);
    let invoice: any = null;

    try {
      const res = await fetch(`/api/repairs/invoices?jobOrderNumber=${job.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.invoice) {
          invoice = data.invoice;
        }
      }
    } catch (err) {
      console.warn('Error checking invoice for completion:', err);
    }
    setIsCheckingInvoice(null);

    const totalAmt = invoice ? Number(invoice.totalAmount || 0) : Number(job.billing?.totalAmount || 0);
    const isPaid = (invoice?.paymentStatus === 'PAID' || job.billing?.paymentStatus === 'PAID') || totalAmt === 0;

    if (isPaid) {
      // CASE 1 — Already Paid in Full (or 0 balance): Allow technician to proceed to device release
      setReleaseModalTarget(job);
      setReleaseRecipient(job.clientName);
    } else {
      // CASE 2 — Unpaid: Do not allow Job Order to immediately become Completed. Open payment settlement interface
      toast.warning(
        'Settlement Required',
        `Job Order ${job.id} is Unpaid (₱${totalAmt.toLocaleString()}). Please record payment settlement before device release.`
      );
      setSettlementModalTarget(job);
      setSettlementInvoiceData(invoice);
      setSettlementMethod('CASH');
      setSettlementAmount(totalAmt > 0 ? String(totalAmt) : '');
      setSettlementReference('');
    }
  };

  // ── Action: Confirm Payment Settlement ──
  const handleConfirmSettlement = async () => {
    if (!settlementModalTarget) return;

    const totalAmt = settlementInvoiceData ? Number(settlementInvoiceData.totalAmount || 0) : Number(settlementModalTarget.billing?.totalAmount || 0);
    const amountVal = Number(settlementAmount);

    if (isNaN(amountVal) || amountVal <= 0) {
      toast.warning('Valid Amount Required', 'Please enter the payment amount received.');
      return;
    }

    if (settlementMethod === 'ONLINE' && !settlementReference.trim()) {
      toast.warning('Online Reference Required', 'Please enter the online payment reference number (e.g. GCash / Maya trace).');
      return;
    }

    setIsSubmittingSettlement(true);

    try {
      const payload = {
        jobOrderNumber: settlementModalTarget.id,
        paymentTiming: 'PAY_AFTER_REPAIR',
        paymentStatus: 'PAID',
        paymentMethod: settlementMethod,
        amountPaid: amountVal,
        onlinePaymentReference: settlementMethod === 'ONLINE' ? settlementReference.trim() : null,
        clientName: settlementModalTarget.clientName,
        clientEmail: settlementModalTarget.clientEmail,
        deviceModel: settlementModalTarget.deviceModel,
        serialNumber: settlementModalTarget.serialNumber,
        assignedTechnician: settlementModalTarget.technicianAssigned || user?.name || 'Tech. Alex Torres',
        items: settlementInvoiceData?.items || [
          {
            workScope: settlementModalTarget.reportedIssue ? `Diagnostics & Repair: ${settlementModalTarget.reportedIssue}` : 'Device Diagnostics & Service',
            itemName: settlementModalTarget.partsReplaced || 'Standard Lab Service',
            quantity: 1,
            unitCost: totalAmt,
          }
        ],
      };

      const res = await fetch('/api/repairs/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update invoice settlement');
      }

      const resData = await res.json();

      await updateRepair(settlementModalTarget.id, {
        status: settlementModalTarget.status,
        paymentStatus: 'PAID',
        paymentMethod: settlementMethod,
        totalAmount: totalAmt,
        amountPaid: amountVal,
        onlinePaymentReference: settlementMethod === 'ONLINE' ? settlementReference.trim() : undefined,
        settlementDate: new Date().toISOString(),
      });

      toast.success(
        'Payment Settled: Paid in Full',
        `Invoice ${resData.invoice?.invoiceNumber || ''} marked Paid in Full (₱${amountVal.toLocaleString()}). Proceeding to device handover.`
      );

      const targetJob = settlementModalTarget;
      setIsSubmittingSettlement(false);
      setSettlementModalTarget(null);
      setSettlementInvoiceData(null);

      // Immediately proceed to device release step
      setReleaseModalTarget(targetJob);
      setReleaseRecipient(targetJob.clientName);
    } catch (err: any) {
      setIsSubmittingSettlement(false);
      console.error('Payment settlement error:', err);
      toast.error('Settlement Error', err.message || 'Could not record payment settlement.');
    }
  };

  // ── Action: Open & Trigger Final Release Receipt ──
  const handleOpenFinalReceipt = async (job: DeviceRepair) => {
    let invoiceInfo: any = null;
    try {
      const res = await fetch(`/api/repairs/invoices?jobOrderNumber=${job.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.invoice) {
          invoiceInfo = data.invoice;
        }
      }
    } catch (e) {
      console.warn('Could not fetch invoice for receipt:', e);
    }

    const receipt = {
      jobOrderId: job.id,
      invoiceId: invoiceInfo?.invoiceNumber || (job.billing?.totalAmount ? `INV-01-${job.id.replace(/[^0-9]/g, '').slice(-8) || '2026'}` : 'INV-STANDARD'),
      clientName: job.clientName,
      clientEmail: job.clientEmail,
      clientPhone: job.clientPhone || 'N/A',
      clientDepartment: job.clientDepartment || 'UMak CCIS',
      deviceType: job.deviceType,
      deviceModel: job.deviceModel,
      serialNumber: job.serialNumber,
      osSpecs: job.osSpecs || 'N/A',
      reportedIssue: job.reportedIssue,
      partsReplaced: job.partsReplaced || 'N/A',
      deviceReleasedTo: job.completion?.deviceReleasedTo || job.deviceReleasedTo || job.clientName,
      completedAt: job.completion?.completedAt || job.completedAt || new Date().toISOString(),
      settlementDate: job.billing?.settlementDate || job.completion?.completedAt || job.completedAt || new Date().toISOString(),
      technicianName: job.technicianAssigned || user?.name || 'Tech. Alex Torres',
      paymentStatus: job.billing?.paymentStatus || invoiceInfo?.paymentStatus || 'PAID',
      paymentMethod: job.billing?.paymentMethod || invoiceInfo?.paymentMethod || 'CASH',
      totalAmount: Number(invoiceInfo?.totalAmount || job.billing?.totalAmount || 0),
      amountPaid: Number(invoiceInfo?.amountPaid || job.billing?.amountPaid || job.billing?.totalAmount || 0),
      onlinePaymentReference: invoiceInfo?.onlinePaymentReference || job.billing?.onlinePaymentReference,
      items: invoiceInfo?.items || [
        {
          workScope: job.reportedIssue ? `Diagnostics & Repair: ${job.reportedIssue}` : 'Device Servicing & Diagnostics',
          itemName: job.partsReplaced || 'Service Labor & Quality Assurance Test',
          quantity: 1,
          unitCost: Number(job.billing?.totalAmount || 0),
        }
      ],
    };

    setFinalReceiptData(receipt);
  };

  // ── Action: Confirm Device Release & Complete Job Order ──
  const handleConfirmRelease = async () => {
    if (!releaseModalTarget) return;

    if (!releaseRecipient.trim()) {
      toast.warning('Recipient Name Required', 'Please enter the name of the person claiming the device.');
      return;
    }

    setIsSubmittingRelease(true);
    const nowIso = new Date().toISOString();
    const recipientName = releaseRecipient.trim();
    const targetJob = releaseModalTarget;

    const success = await updateRepair(targetJob.id, {
      status: 'COMPLETED',
      deviceReleasedTo: recipientName,
      completedAt: nowIso,
      clientEmail: targetJob.clientEmail,
      clientName: targetJob.clientName,
      deviceModel: targetJob.deviceModel,
    });

    setIsSubmittingRelease(false);
    setReleaseModalTarget(null);

    if (success) {
      toast.success(
        'Device Released & Job Completed',
        `Device for ${targetJob.id} officially released to ${recipientName}. Job order marked Completed.`
      );

      // Trigger Final Receipt process immediately
      handleOpenFinalReceipt({
        ...targetJob,
        status: 'COMPLETED',
        deviceReleasedTo: recipientName,
        completedAt: nowIso,
        completion: {
          deviceReleasedTo: recipientName,
          completedAt: nowIso,
        },
      });
    } else {
      toast.error('Completion Failed', `Could not complete job order ${targetJob.id}.`);
    }
  };

  // ── Action: Ready for Pickup Handlers ──
  const handleOpenPickupModal = (job: DeviceRepair) => {
    setPickupModalTarget(job);
    setPickupLocationInput(
      job.pickupLocation ||
      job.evaluation?.confirmedLocation ||
      'Electronics Diagnostics & Repair Desk - Room 402'
    );
  };

  const handleConfirmPickup = async () => {
    if (!pickupModalTarget) return;
    setIsSubmittingPickup(true);

    const loc = pickupLocationInput.trim() || 'Electronics Diagnostics & Repair Desk - Room 402';
    const nowIso = new Date().toISOString();

    const success = await updateRepair(pickupModalTarget.id, {
      status: 'READY_FOR_PICKUP',
      pickupLocation: loc,
      readyAt: nowIso,
      clientEmail: pickupModalTarget.clientEmail,
      clientName: pickupModalTarget.clientName,
      deviceModel: pickupModalTarget.deviceModel,
    });

    setIsSubmittingPickup(false);
    const targetEmail = pickupModalTarget.clientEmail;
    const targetId = pickupModalTarget.id;
    setPickupModalTarget(null);

    if (success) {
      toast.success(
        'Ready for Pickup',
        `Job Order ${targetId} is now Ready for Pickup at ${loc}. Brevo email dispatched to ${targetEmail}.`
      );
    } else {
      toast.error('Update Failed', `Could not update status for ${targetId}.`);
    }
  };

  // ── Action: Save Technician Bench Note ──
  const handleSaveTechNote = async (jobId: string) => {
    if (!techNoteDraft.trim()) return;
    const currentJob = repairs.find((r) => r.id === jobId);
    const techName = user?.name || 'Assigned Field Tech';
    const success = await updateRepair(jobId, {
      status: currentJob?.status,
      technicianNotes: techNoteDraft.trim(),
      technicianName: techName,
    });
    if (success) {
      setEditingNotesId(null);
      setTechNoteDraft('');
      toast.success('Technician Note Saved', `Updated diagnostic records for ${jobId}.`);
    } else {
      toast.error('Save Failed', `Could not save notes for ${jobId}.`);
    }
  };

  // ── Action: Save Component Parts Replaced ──
  const handleSavePartsReplaced = async (jobId: string) => {
    const currentJob = repairs.find((r) => r.id === jobId);
    const techName = user?.name || 'Assigned Field Tech';
    const success = await updateRepair(jobId, {
      status: currentJob?.status,
      partsReplaced: partsReplacedDraft.trim() || undefined,
      technicianName: techName,
    });
    if (success) {
      setEditingPartsId(null);
      setPartsReplacedDraft('');
      toast.success('Parts Record Saved', `Updated component parts log for ${jobId}.`);
    } else {
      toast.error('Save Failed', `Could not save parts log for ${jobId}.`);
    }
  };

  // ── Billing Actions & Handlers ──
  const handleOpenBillingModal = async (job: DeviceRepair) => {
    setBillingTarget(job);
    setIsSubmittingBilling(false);

    try {
      const res = await fetch(`/api/repairs/invoices?jobOrderNumber=${job.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.invoice && data.items && data.items.length > 0) {
          setBillingItems(
            data.items.map((it: any, idx: number) => ({
              id: it.id || `item-${idx}`,
              workScope: it.workScope || '',
              itemName: it.itemName || '',
              quantity: it.quantity || 1,
              unitCost: it.unitCost || '',
            }))
          );
          setBillingPaymentTiming(data.invoice.paymentTiming || 'PAY_AFTER_REPAIR');
          setBillingPaymentMethod(data.invoice.paymentMethod || 'CASH');
          setBillingAmountPaid(data.invoice.amountPaid ? String(data.invoice.amountPaid) : '');
          setBillingOnlineReference(data.invoice.onlinePaymentReference || '');
          setBillingNotes(data.invoice.billingNotes || '');
          return;
        }
      }
    } catch (err) {
      console.warn('Could not fetch existing invoice:', err);
    }

    // Default initialization
    setBillingItems([
      {
        id: 'item-1',
        workScope: job.reportedIssue ? `Diagnostics & Repair: ${job.reportedIssue}` : 'Diagnostic Bench Service & Labor',
        itemName: job.partsReplaced || '',
        quantity: 1,
        unitCost: job.billing?.totalAmount ? String(job.billing.totalAmount) : '500',
      },
    ]);
    setBillingPaymentTiming((job.billing?.paymentTiming as any) || 'PAY_AFTER_REPAIR');
    setBillingPaymentMethod((job.billing?.paymentMethod as any) || 'CASH');
    setBillingAmountPaid(job.billing?.amountPaid ? String(job.billing.amountPaid) : '');
    setBillingOnlineReference(job.billing?.onlinePaymentReference || '');
    setBillingNotes('');
  };

  const handleAddBillingItem = () => {
    setBillingItems((prev) => [
      ...prev,
      { id: `item-${Date.now()}`, workScope: '', itemName: '', quantity: 1, unitCost: '' },
    ]);
  };

  const handleRemoveBillingItem = (id: string) => {
    setBillingItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((it) => it.id !== id);
    });
  };

  const handleUpdateBillingItem = (id: string, field: string, value: any) => {
    setBillingItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const calculatedBillingTotal = billingItems.reduce((acc, curr) => {
    const qty = Math.max(1, Number(curr.quantity) || 1);
    const cost = Math.max(0, Number(curr.unitCost) || 0);
    return acc + qty * cost;
  }, 0);

  const handleGenerateInvoice = async () => {
    if (!billingTarget) return;

    for (let i = 0; i < billingItems.length; i++) {
      const item = billingItems[i];
      if (!item.workScope.trim()) {
        toast.warning(
          'Work Scope Required',
          `Please provide a Work Scope description for line item #${i + 1}.`
        );
        return;
      }
      if (item.unitCost === '' || isNaN(Number(item.unitCost)) || Number(item.unitCost) < 0) {
        toast.warning(
          'Valid Cost Required',
          `Please enter a valid cost (≥ 0) for line item #${i + 1}.`
        );
        return;
      }
    }

    if (billingPaymentTiming === 'PAY_NOW') {
      if (billingPaymentMethod === 'CASH') {
        const received = Number(billingAmountPaid);
        if (isNaN(received) || received <= 0) {
          toast.warning(
            'Amount Received Required',
            'Please enter the cash amount received from the customer for Pay Now.'
          );
          return;
        }
      } else if (billingPaymentMethod === 'ONLINE') {
        const paid = Number(billingAmountPaid);
        if (isNaN(paid) || paid <= 0) {
          toast.warning(
            'Amount Paid Required',
            'Please enter the online payment amount received from the customer.'
          );
          return;
        }
        if (!billingOnlineReference.trim()) {
          toast.warning(
            'Reference Number Required',
            'Please enter the online payment reference number (e.g. GCash/Maya reference) for Pay Now.'
          );
          return;
        }
      }
    }

    setIsSubmittingBilling(true);

    try {
      const payload = {
        jobOrderNumber: billingTarget.id,
        paymentTiming: billingPaymentTiming,
        paymentStatus: billingPaymentTiming === 'PAY_NOW' ? 'PAID' : 'UNPAID',
        paymentMethod: billingPaymentTiming === 'PAY_NOW' ? billingPaymentMethod : (billingPaymentMethod || null),
        amountPaid: billingPaymentTiming === 'PAY_NOW' ? Number(billingAmountPaid) : 0,
        onlinePaymentReference: billingPaymentTiming === 'PAY_NOW' && billingPaymentMethod === 'ONLINE' ? billingOnlineReference.trim() : null,
        billingNotes: billingNotes.trim() || undefined,
        clientName: billingTarget.clientName,
        clientEmail: billingTarget.clientEmail,
        deviceModel: billingTarget.deviceModel,
        serialNumber: billingTarget.serialNumber,
        assignedTechnician: billingTarget.technicianAssigned || user?.name || 'Tech. Alex Torres',
        items: billingItems.map((it) => ({
          workScope: it.workScope.trim(),
          itemName: it.itemName.trim() || undefined,
          quantity: Math.max(1, Number(it.quantity) || 1),
          unitCost: Number(it.unitCost) || 0,
        })),
      };

      const res = await fetch('/api/repairs/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to generate invoice');
      }

      const resData = await res.json();

      await updateRepair(billingTarget.id, {
        status: billingTarget.status,
        paymentTiming: billingPaymentTiming,
        paymentStatus: billingPaymentTiming === 'PAY_NOW' ? 'PAID' : 'UNPAID',
        paymentMethod: billingPaymentTiming === 'PAY_NOW' ? billingPaymentMethod : (billingPaymentMethod || undefined),
        totalAmount: calculatedBillingTotal,
        amountPaid: billingPaymentTiming === 'PAY_NOW' ? Number(billingAmountPaid) : 0,
        onlinePaymentReference: billingPaymentTiming === 'PAY_NOW' && billingPaymentMethod === 'ONLINE' ? billingOnlineReference.trim() : undefined,
        settlementDate: billingPaymentTiming === 'PAY_NOW' ? new Date().toISOString() : undefined,
      });

      setIsSubmittingBilling(false);
      setBillingTarget(null);

      const emailNote = resData.emailDispatched
        ? ` & notification emailed to ${billingTarget.clientEmail}`
        : '';

      toast.success(
        'Invoice Generated & Linked',
        `Invoice ${resData.invoice?.invoiceNumber || ''} created (₱${calculatedBillingTotal.toLocaleString()})${emailNote}.`
      );

      if (resData.invoice) {
        setInvoiceViewData(resData.invoice);
      }
    } catch (err: any) {
      setIsSubmittingBilling(false);
      console.error('Billing submission error:', err);
      toast.error('Billing Error', err.message || 'Could not generate invoice.');
    }
  };

  const handleViewInvoice = async (job: DeviceRepair) => {
    setIsLoadingInvoice(true);
    setInvoiceViewData(null);

    try {
      const res = await fetch(`/api/repairs/invoices?jobOrderNumber=${job.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.invoice) {
          setInvoiceViewData(data.invoice);
          setIsLoadingInvoice(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to load invoice from API:', err);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const mmdd = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const fallbackInvoice = {
      invoiceNumber: (job as any).invoiceNumber || `INV-01-${now.getFullYear()}-${mmdd}`,
      jobOrderNumber: job.id,
      issueDate: todayStr,
      paymentTiming: job.billing?.paymentTiming || 'PAY_AFTER_REPAIR',
      paymentStatus: job.billing?.paymentStatus || 'UNPAID',
      paymentMethod: job.billing?.paymentMethod || 'CASH',
      clientName: job.clientName,
      clientEmail: job.clientEmail,
      deviceModel: job.deviceModel,
      serialNumber: job.serialNumber,
      assignedTechnician: job.technicianAssigned || 'Tech. Alex Torres',
      totalAmount: job.billing?.totalAmount || 0,
      amountPaid: job.billing?.amountPaid || 0,
      onlinePaymentReference: job.billing?.onlinePaymentReference || null,
      settlementDate: job.billing?.settlementDate || null,
      items: [
        {
          id: 'item-1',
          workScope: job.reportedIssue ? `Diagnostics & Repair: ${job.reportedIssue}` : 'Bench Diagnostics & Service',
          itemName: job.partsReplaced || 'Standard Lab Service',
          quantity: 1,
          unitCost: job.billing?.totalAmount || 0,
          totalCost: job.billing?.totalAmount || 0,
        },
      ],
    };

    setInvoiceViewData(fallbackInvoice);
    setIsLoadingInvoice(false);
  };

  const getStatusBadge = (status: RepairStatus) => {
    switch (status) {
      case 'RECEIVED':
      case 'PENDING_EVALUATION':
      case 'UNDER_EVALUATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
            Received · Needs Evaluation
          </span>
        );
      case 'EVALUATED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Evaluated
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            Confirmed Job Order
          </span>
        );
      case 'IN_DIAGNOSTICS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            In Diagnostics
          </span>
        );
      case 'REPAIR_IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Repair In Progress
          </span>
        );
      case 'AWAITING_PARTS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Awaiting Parts
          </span>
        );
      case 'READY_FOR_PICKUP':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Ready for Pickup
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-900/30 text-emerald-400 border border-emerald-600/40">
            <CheckCircle2 size={12} />
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/40 text-rose-400 border border-rose-600/40">
            <XCircle size={12} />
            Cancelled / Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Top Header Banner ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-purple-950/60 border border-indigo-500/20 shadow-card">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
            <Wrench size={14} className="text-indigo-400" />
            <span>Technician Repairs & Evaluation Workbench</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight">
            Repair Service Workflow
          </h2>
        </div>

        {/* Workflow Metric Badges */}
        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          <div className="bg-slate-900/90 px-3.5 py-2 rounded-xl border border-purple-500/30 text-xs text-purple-300 flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>Evaluation: <strong>{evaluationQueue.length}</strong></span>
          </div>
          <div className="bg-slate-900/90 px-3.5 py-2 rounded-xl border border-indigo-500/30 text-xs text-indigo-300 flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>Confirmed: <strong>{confirmedQueue.length}</strong></span>
          </div>
          <div className="bg-slate-900/90 px-3.5 py-2 rounded-xl border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Completed: <strong>{completedQueue.length}</strong></span>
          </div>
        </div>
      </div>

      {/* ── Workflow Navigation Tabs ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 p-1.5 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-inner">
        {/* Tab 1: Evaluation Stage */}
        <button
          type="button"
          onClick={() => setActiveWorkflowTab('EVALUATION')}
          className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeWorkflowTab === 'EVALUATION'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow-indigo'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <ClipboardCheck size={16} />
          <span>1. Incoming Evaluation</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-extrabold ${
              activeWorkflowTab === 'EVALUATION'
                ? 'bg-white/25 text-white'
                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
            }`}
          >
            {evaluationQueue.length}
          </span>
        </button>

        {/* Tab 2: Confirmed Job Orders */}
        <button
          type="button"
          onClick={() => setActiveWorkflowTab('CONFIRMED')}
          className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeWorkflowTab === 'CONFIRMED'
              ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-glow-cyan'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Wrench size={16} />
          <span>2. Confirmed Job Orders</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-extrabold ${
              activeWorkflowTab === 'CONFIRMED'
                ? 'bg-white/25 text-white'
                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
            }`}
          >
            {confirmedQueue.length}
          </span>
        </button>

        {/* Tab 3: Completed Orders */}
        <button
          type="button"
          onClick={() => setActiveWorkflowTab('COMPLETED')}
          className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeWorkflowTab === 'COMPLETED'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-glow-emerald'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <CheckCircle2 size={16} />
          <span>3. Completed Orders</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-extrabold ${
              activeWorkflowTab === 'COMPLETED'
                ? 'bg-white/25 text-white'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {completedQueue.length}
          </span>
        </button>

        {/* Tab 4: Cancelled / Declined */}
        <button
          type="button"
          onClick={() => setActiveWorkflowTab('CANCELLED')}
          className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeWorkflowTab === 'CANCELLED'
              ? 'bg-rose-900/60 text-rose-200 border border-rose-700/60'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
          }`}
        >
          <XCircle size={15} />
          <span>Declined / Cancelled</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-400">
            {cancelledQueue.length}
          </span>
        </button>
      </div>

      {/* ── Quick Filters & Search Bar ────────────────────────────── */}
      <div className="glass rounded-2xl p-4 border border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-card">
        {/* Device Type Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono uppercase text-slate-400 font-bold mr-1 flex items-center gap-1.5">
            <Filter size={13} />
            Filter Devices:
          </span>

          <button
            type="button"
            onClick={() => setDeviceFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              deviceFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-glow-indigo'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <span>All</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{activeDataset.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setDeviceFilter('PC')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              deviceFilter === 'PC'
                ? 'bg-cyan-600 text-white shadow-glow-cyan'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Monitor size={14} />
            <span>PC / Desktop</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{pcCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setDeviceFilter('Laptop')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              deviceFilter === 'Laptop'
                ? 'bg-violet-600 text-white shadow-glow-indigo'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Laptop size={14} />
            <span>Laptop</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{laptopCount}</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ID, customer, model, serial..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-indigo-500 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all font-mono"
          />
        </div>
      </div>

      {/* ── Active Repair Request Cards List ──────────────────────── */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center border border-slate-800/80 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
              {activeWorkflowTab === 'EVALUATION' ? (
                <ClipboardCheck size={24} className="text-purple-400" />
              ) : activeWorkflowTab === 'CONFIRMED' ? (
                <Wrench size={24} className="text-indigo-400" />
              ) : activeWorkflowTab === 'COMPLETED' ? (
                <CheckCircle2 size={24} className="text-emerald-400" />
              ) : (
                <XCircle size={24} className="text-rose-400" />
              )}
            </div>
            <h3 className="text-base font-bold text-slate-200">
              {activeWorkflowTab === 'EVALUATION'
                ? 'No Pending Evaluation Requests'
                : activeWorkflowTab === 'CONFIRMED'
                ? 'No Active Confirmed Job Orders'
                : activeWorkflowTab === 'COMPLETED'
                ? 'No Completed Job Orders'
                : 'No Cancelled Requests'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {activeWorkflowTab === 'EVALUATION'
                ? 'All incoming student and staff repair requests have been evaluated or confirmed.'
                : activeWorkflowTab === 'CONFIRMED'
                ? 'No active confirmed job cards match your filter criteria.'
                : activeWorkflowTab === 'COMPLETED'
                ? 'No completed and released repair orders found.'
                : 'No job cards match your filter criteria.'}
            </p>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const isExpanded = expandedJobId === job.id;
            const formState = evaluationForms[job.id] || getOrInitEvaluationForm(job);

            return (
              <div
                key={job.id}
                className={`glass rounded-2xl border transition-all duration-200 overflow-hidden shadow-card ${
                  isExpanded
                    ? 'border-indigo-500/50 bg-slate-900/90 ring-1 ring-indigo-500/20'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* ── Header: Job/Request ID, Customer, Device, Serial, Date ── */}
                <div
                  onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                  className="p-5 cursor-pointer hover:bg-slate-800/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 select-none"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        job.deviceType === 'Laptop'
                          ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {job.deviceType === 'Laptop' ? <Laptop size={20} /> : <Monitor size={20} />}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-slate-100 text-sm sm:text-base">
                          {job.deviceModel}
                        </span>
                        <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-500/15 px-2.5 py-0.5 rounded-md border border-indigo-500/30">
                          {job.id}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {job.deviceType}
                        </span>
                      </div>

                      {/* Customer & Hardware Summary */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                        <span className="text-slate-300 flex items-center gap-1 font-sans font-medium">
                          <User size={12} className="text-slate-500" />
                          {job.clientName}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400 flex items-center gap-1">
                          <Mail size={12} className="text-slate-500" />
                          {job.clientEmail}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-cyan-400 flex items-center gap-1">
                          <Hash size={12} className="text-slate-500" />
                          S/N: {job.serialNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Header Badges */}
                  <div className="flex items-center gap-3 self-end md:self-center">
                    <div className="text-right hidden sm:block">
                      <span className="text-[10px] text-slate-500 block font-mono">Request Date</span>
                      <span className="text-xs text-slate-300 font-medium">
                        {job.intakeDate ? new Date(job.intakeDate).toLocaleDateString() : 'Today'}
                      </span>
                    </div>

                    <div>{getStatusBadge(job.status)}</div>

                    <div className="p-1 rounded-lg bg-slate-800 text-slate-400">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* ── Expanded Content ──────────────────────────────────── */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 space-y-6 bg-slate-950/50 animate-fade-in">
                    {/* Customer Contact & Device Hardware Details */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Customer Contact Card */}
                      <div className="md:col-span-4 p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2 text-xs font-mono">
                        <span className="text-[11px] uppercase text-slate-400 font-bold flex items-center gap-1.5 font-sans">
                          <User size={13} className="text-indigo-400" />
                          Customer & Submitter Information
                        </span>
                        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-1.5">
                          <div className="text-slate-200 font-sans font-bold text-sm">{job.clientName}</div>
                          <div className="text-slate-400 flex items-center gap-1.5">
                            <Mail size={12} className="text-slate-500" />
                            {job.clientEmail}
                          </div>
                          {job.clientPhone && (
                            <div className="text-slate-400 flex items-center gap-1.5">
                              <Phone size={12} className="text-slate-500" />
                              {job.clientPhone}
                            </div>
                          )}
                          <div className="text-slate-400 flex items-center gap-1.5 font-sans">
                            <Building size={12} className="text-slate-500" />
                            {job.clientDepartment || 'Undergraduate Engineering'}
                          </div>
                          <div className="text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-800">
                            <Clock size={12} className="text-slate-500" />
                            Assigned Tech: <strong className="text-slate-200">{job.technicianAssigned || 'Unassigned'}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Problem/Issue & Specifications */}
                      <div className="md:col-span-8 p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                        <span className="text-[11px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                          <AlertTriangle size={13} className="text-rose-400" />
                          Problem / Reported Issue & Hardware Specs
                        </span>
                        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-2 text-xs">
                          <p className="text-slate-200 leading-relaxed font-medium">
                            {job.reportedIssue}
                          </p>
                          <div className="pt-2 border-t border-slate-800 text-slate-400 font-mono text-[11px] flex items-center gap-1.5">
                            <Cpu size={12} className="text-indigo-400 flex-shrink-0" />
                            <span>Specs: {job.osSpecs || 'Not specified by client'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pre-Diagnostic Intake Inspection Checklist */}
                    <div className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                        <span className="text-xs font-mono uppercase text-slate-300 font-bold flex items-center gap-1.5">
                          <ShieldCheck size={14} className="text-amber-400" />
                          Intake Physical Inspection Checklist
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">Dispute Protection</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                        <div
                          className={`p-3 rounded-lg border flex items-center gap-2.5 ${
                            job.inspectionNotes.scratchesDents
                              ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                              : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
                          }`}
                        >
                          {job.inspectionNotes.scratchesDents ? (
                            <CheckSquare size={16} className="text-amber-400 flex-shrink-0" />
                          ) : (
                            <Square size={16} className="text-slate-600 flex-shrink-0" />
                          )}
                          <span className="font-semibold">Scratches / Dents</span>
                        </div>

                        <div
                          className={`p-3 rounded-lg border flex items-center gap-2.5 ${
                            job.inspectionNotes.missingScrewsFeet
                              ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                              : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
                          }`}
                        >
                          {job.inspectionNotes.missingScrewsFeet ? (
                            <CheckSquare size={16} className="text-amber-400 flex-shrink-0" />
                          ) : (
                            <Square size={16} className="text-slate-600 flex-shrink-0" />
                          )}
                          <span className="font-semibold">Missing Screws / Feet</span>
                        </div>

                        <div
                          className={`p-3 rounded-lg border flex items-center gap-2.5 ${
                            job.inspectionNotes.screenDamageDeadPixels
                              ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                              : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
                          }`}
                        >
                          {job.inspectionNotes.screenDamageDeadPixels ? (
                            <CheckSquare size={16} className="text-amber-400 flex-shrink-0" />
                          ) : (
                            <Square size={16} className="text-slate-600 flex-shrink-0" />
                          )}
                          <span className="font-semibold">Screen Damage / Pixels</span>
                        </div>

                        <div
                          className={`p-3 rounded-lg border flex items-center gap-2.5 ${
                            job.inspectionNotes.liquidDamageIndicators
                              ? 'bg-rose-950/30 border-rose-500/50 text-rose-200'
                              : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
                          }`}
                        >
                          {job.inspectionNotes.liquidDamageIndicators ? (
                            <CheckSquare size={16} className="text-rose-400 flex-shrink-0" />
                          ) : (
                            <Square size={16} className="text-slate-600 flex-shrink-0" />
                          )}
                          <span className="font-semibold">Liquid Damage (LCI)</span>
                        </div>
                      </div>

                      {(() => {
                        const cleanRemarks = (job.additionalInspectionNotes || '')
                          .replace(/<!--LABASSIST_WORKFLOW:[\s\S]*?-->/g, '')
                          .trim();
                        if (!cleanRemarks) return null;
                        return (
                          <p className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/70 font-mono">
                            <span className="text-amber-300 font-bold mr-1">Remarks & Accessories:</span>
                            {cleanRemarks}
                          </p>
                        );
                      })()}
                    </div>

                    {/* ── WORKFLOW SECTION: EVALUATION STAGE (When in Evaluation Queue) ── */}
                    {activeWorkflowTab === 'EVALUATION' && (
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/30 via-slate-900/90 to-indigo-950/30 border-2 border-purple-500/40 shadow-card space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-purple-500/30">
                          <div className="flex items-center gap-2 text-purple-200 font-bold text-sm">
                            <ClipboardCheck size={18} className="text-purple-400" />
                            <span>Technician Evaluation & Service Feasibility Stage</span>
                          </div>
                          <span className="text-xs font-mono text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/40">
                            1. Received Intake
                          </span>
                        </div>

                        {/* 2. Technician Evaluation / Assessment Notes */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                            <span>2. Technician Diagnostic Evaluation & Assessment *</span>
                            <span className="text-[11px] font-normal text-slate-400">Required before confirming</span>
                          </label>
                          <textarea
                            rows={3}
                            value={formState.technicianEvaluation}
                            onChange={(e) => handleFormChange(job.id, 'technicianEvaluation', e.target.value)}
                            placeholder="Enter technician evaluation findings, initial multimeter/bench readings, root cause assessment..."
                            className="w-full p-3 rounded-xl bg-slate-900 border border-purple-500/40 focus:border-purple-400 text-xs text-slate-100 placeholder-slate-500 outline-none resize-none font-mono"
                          />
                        </div>

                        {/* 3. Feasibility & 4. Parts Availability */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* 3. Feasibility Assessment */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              <Sparkles size={13} className="text-cyan-400" />
                              3. Repair Feasibility Assessment
                            </label>
                            <select
                              value={formState.repairFeasibility}
                              onChange={(e) => handleFormChange(job.id, 'repairFeasibility', e.target.value)}
                              className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 text-slate-100 border border-slate-700 focus:border-purple-400 outline-none cursor-pointer"
                            >
                              <option value="FEASIBLE">✅ Feasible for Bench Repair</option>
                              <option value="NOT_FEASIBLE">❌ Not Feasible (Severe PCB Damage)</option>
                              <option value="BER_BEYOND_ECONOMIC_REPAIR">⚠️ Beyond Economic Repair (BER)</option>
                              <option value="PENDING">⏳ Pending Further Inspection</option>
                            </select>
                          </div>

                          {/* 4. Parts Availability */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              <Package size={13} className="text-amber-400" />
                              4. Parts Availability
                            </label>
                            <select
                              value={formState.partsAvailability}
                              onChange={(e) => handleFormChange(job.id, 'partsAvailability', e.target.value)}
                              className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 text-slate-100 border border-slate-700 focus:border-purple-400 outline-none cursor-pointer"
                            >
                              <option value="IN_STOCK">📦 In Lab Inventory (Ready)</option>
                              <option value="TO_ORDER">🚚 Needs Sourcing / Order</option>
                              <option value="CLIENT_PROVIDED">👤 Client Providing Part</option>
                              <option value="NOT_AVAILABLE">🚫 Part Discontinued / Unavailable</option>
                            </select>
                          </div>
                        </div>

                        {/* 5. Confirmed Date, 6. Confirmed Time, 7. Confirmed Location */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {/* 5. Confirmed Date */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              <Calendar size={13} className="text-indigo-400" />
                              5. Confirmed Date
                            </label>
                            <input
                              type="date"
                              value={formState.confirmedDate}
                              onChange={(e) => handleFormChange(job.id, 'confirmedDate', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-slate-900 text-slate-100 border border-slate-700 focus:border-purple-400 outline-none"
                            />
                          </div>

                          {/* 6. Confirmed Time */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              <Clock size={13} className="text-indigo-400" />
                              6. Confirmed Time
                            </label>
                            <input
                              type="time"
                              value={formState.confirmedTime}
                              onChange={(e) => handleFormChange(job.id, 'confirmedTime', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-slate-900 text-slate-100 border border-slate-700 focus:border-purple-400 outline-none"
                            />
                          </div>

                          {/* 7. Confirmed Repair Location / Room */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              <MapPin size={13} className="text-emerald-400" />
                              7. Confirmed Repair Room
                            </label>
                            <select
                              value={formState.confirmedLocation}
                              onChange={(e) => handleFormChange(job.id, 'confirmedLocation', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-slate-100 border border-slate-700 focus:border-purple-400 outline-none cursor-pointer"
                            >
                              {LAB_ROOM_OPTIONS.map((room) => (
                                <option key={room.code} value={room.code}>
                                  {room.code} - {room.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Action Buttons: [Decline] and [Confirm Job Order] */}
                        <div className="pt-4 border-t border-purple-500/30 flex flex-wrap items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => handleOpenDeclineModal(job)}
                            className="px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <XCircle size={15} />
                            <span>Decline Request</span>
                          </button>

                          <button
                            type="button"
                            disabled={isConfirmingId === job.id}
                            onClick={() => handleConfirmJobOrder(job)}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-glow-indigo disabled:opacity-50"
                          >
                            <CheckCircle2 size={16} />
                            <span>{isConfirmingId === job.id ? 'Confirming...' : 'Confirm Job Order'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── WORKFLOW SECTION: CONFIRMED & COMPLETED JOB ORDERS (Diagnostic & Execution) ── */}
                    {(activeWorkflowTab === 'CONFIRMED' || activeWorkflowTab === 'COMPLETED') && (
                      <div className="space-y-5">
                        {/* 1. Preserved Evaluation & Appointment Header Card */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-purple-950/30 border border-indigo-500/30 space-y-3.5 text-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-indigo-500/20">
                            <div className="flex items-center gap-2 font-bold text-indigo-300">
                              <ClipboardCheck size={16} className="text-indigo-400" />
                              <span>Evaluation & Appointment Specifications</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              <span className="text-slate-400">Current Status:</span>
                              {getStatusBadge(job.status)}
                            </div>
                          </div>

                          {/* Grid with Appointment Date/Time, Location Room, Feasibility, Parts, and Assigned Tech */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 font-mono text-[11px]">
                            {/* Appointment Date & Time */}
                            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                              <span className="text-slate-500 font-sans flex items-center gap-1 font-semibold">
                                <Calendar size={12} className="text-indigo-400" />
                                Appointment Schedule:
                              </span>
                              <span className="font-bold text-slate-100 block">
                                {job.evaluation?.confirmedDate || '2026-09-28'} @ {job.evaluation?.confirmedTime || '10:00 AM'}
                              </span>
                            </div>

                            {/* Repair Location / Room */}
                            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                              <span className="text-slate-500 font-sans flex items-center gap-1 font-semibold">
                                <MapPin size={12} className="text-emerald-400" />
                                Repair Location:
                              </span>
                              <span className="font-bold text-emerald-300 block">
                                {job.evaluation?.confirmedLocation || 'LAB-101'}
                              </span>
                            </div>

                            {/* Feasibility Assessment */}
                            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                              <span className="text-slate-500 font-sans flex items-center gap-1 font-semibold">
                                <Sparkles size={12} className="text-cyan-400" />
                                Feasibility:
                              </span>
                              <span className="font-bold text-cyan-300 block">
                                {job.evaluation?.repairFeasibility === 'NOT_FEASIBLE'
                                  ? '❌ Not Feasible'
                                  : job.evaluation?.repairFeasibility === 'BER_BEYOND_ECONOMIC_REPAIR'
                                  ? '⚠️ Beyond Econ. Repair'
                                  : '✅ Feasible for Repair'}
                              </span>
                            </div>

                            {/* Parts Availability */}
                            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                              <span className="text-slate-500 font-sans flex items-center gap-1 font-semibold">
                                <Package size={12} className="text-amber-400" />
                                Parts Availability:
                              </span>
                              <span className="font-bold text-amber-300 block">
                                {job.evaluation?.partsAvailability === 'TO_ORDER'
                                  ? '🚚 To Order'
                                  : job.evaluation?.partsAvailability === 'CLIENT_PROVIDED'
                                  ? '👤 Client Provided'
                                  : job.evaluation?.partsAvailability === 'NOT_AVAILABLE'
                                  ? '🚫 Unavailable'
                                  : '📦 In Lab Stock'}
                              </span>
                            </div>
                          </div>

                          {/* Technician Diagnostic Evaluation Assessment Remarks */}
                          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1 text-xs font-mono">
                            <span className="text-indigo-300 font-bold font-sans flex items-center gap-1.5">
                              <FileText size={13} />
                              Technician Diagnostic Assessment:
                            </span>
                            <p className="text-slate-200 leading-relaxed">
                              {job.evaluation?.technicianEvaluation ||
                                job.technicianNotes ||
                                'Evaluation completed. Unit verified for servicing.'}
                            </p>
                          </div>
                        </div>

                        {/* 2. Active Diagnostics & Work Bench Logs */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-500/20">
                            <span className="text-xs font-mono uppercase text-indigo-300 font-bold flex items-center gap-1.5">
                              <Wrench size={14} className="text-indigo-400" />
                              Diagnostics, Inspection & Customer Communication Workbench
                            </span>

                            <span className="text-xs text-slate-400 font-mono">
                              Assigned Tech: <strong className="text-slate-200">{job.technicianAssigned || 'Tech. Alex Torres'}</strong>
                            </span>
                          </div>

                          {/* Customer Communication & Actual Requirements Banner */}
                          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-500/20 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-indigo-300 flex items-center gap-1.5 font-sans">
                                <Phone size={13} className="text-indigo-400" />
                                Customer Communication & Actual Repair Scope
                              </span>
                              <span className="text-[11px] font-mono text-slate-400">
                                Contact: <strong className="text-slate-200">{job.clientEmail}</strong>
                              </span>
                            </div>

                            <p className="text-slate-300 text-[11px] leading-relaxed">
                              Inspect the hardware on the bench, formulate the actual repair requirements and labor/parts estimate, then communicate with the customer for authorization.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            {/* Diagnostic Findings & Actions */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 font-semibold flex items-center gap-1">
                                  <FileText size={12} className="text-indigo-400" />
                                  Diagnostic Inspection Findings & Repair Requirements:
                                </span>
                                {editingNotesId !== job.id && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingNotesId(job.id);
                                      setTechNoteDraft(job.technicianNotes || '');
                                    }}
                                    className="text-indigo-400 hover:text-indigo-300 text-[11px] font-semibold flex items-center gap-1"
                                  >
                                    <Edit3 size={11} /> Edit Note
                                  </button>
                                )}
                              </div>

                              {editingNotesId === job.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    rows={4}
                                    value={techNoteDraft}
                                    onChange={(e) => setTechNoteDraft(e.target.value)}
                                    placeholder="Enter physical inspection findings, circuit board multimeter readings, required repair scope, and estimated cost communicated to customer..."
                                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-indigo-500 focus:outline-none text-xs text-slate-100 placeholder-slate-500 resize-none font-mono"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveTechNote(job.id)}
                                      className="py-1 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                                    >
                                      Save Findings
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingNotesId(null)}
                                      className="py-1 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-slate-200 bg-slate-900/80 p-3 rounded-lg border border-slate-800 leading-relaxed font-mono min-h-[80px]">
                                  {job.technicianNotes || 'No diagnostic findings logged yet. Click Edit Note to record component inspection and customer communication.'}
                                </p>
                              )}
                            </div>

                            {/* Component Parts Replaced */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 font-semibold flex items-center gap-1">
                                  <Package size={12} className="text-amber-400" />
                                  Component Parts Sourced / Replaced:
                                </span>
                                {editingPartsId !== job.id && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPartsId(job.id);
                                      setPartsReplacedDraft(job.partsReplaced || '');
                                    }}
                                    className="text-amber-400 hover:text-amber-300 text-[11px] font-semibold flex items-center gap-1"
                                  >
                                    <Edit3 size={11} /> Edit Parts
                                  </button>
                                )}
                              </div>

                              {editingPartsId === job.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    rows={4}
                                    value={partsReplacedDraft}
                                    onChange={(e) => setPartsReplacedDraft(e.target.value)}
                                    placeholder="Enter replacement part numbers, manufacturer details, and swapped components..."
                                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-amber-500 focus:outline-none text-xs text-slate-100 placeholder-slate-500 resize-none font-mono"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSavePartsReplaced(job.id)}
                                      className="py-1 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
                                    >
                                      Save Parts
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingPartsId(null)}
                                      className="py-1 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-slate-200 bg-slate-900/80 p-3 rounded-lg border border-slate-800 leading-relaxed font-mono min-h-[80px]">
                                  {job.partsReplaced || 'No replacement components logged yet for this Job Order.'}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* 3. Dedicated Billing & Invoice Summary Section */}
                          <div className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/25 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                                <Receipt size={15} className="text-emerald-400" />
                                <span>Billing & Invoice Specification</span>
                              </div>

                              <div className="flex items-center gap-2 font-mono text-[11px]">
                                {job.billing?.paymentStatus === 'PAID' ? (
                                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                    <CheckCircle2 size={11} /> PAID
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                    <Clock size={11} /> UNPAID ({job.billing?.paymentTiming === 'PAY_NOW' ? 'Pay Now Pending' : 'Pay After Repair'})
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
                                <span className="text-slate-500 font-sans block text-[11px]">Total Billed Amount:</span>
                                <strong className="text-base font-bold text-emerald-400 block font-mono">
                                  ₱{(job.billing?.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </strong>
                              </div>

                              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
                                <span className="text-slate-500 font-sans block text-[11px]">Payment Terms & Method:</span>
                                <strong className="text-slate-200 block text-xs">
                                  {job.billing?.paymentTiming === 'PAY_NOW' ? '⚡ Pay Now' : '🛠️ Pay After Repair'}
                                  {job.billing?.paymentMethod ? ` · ${job.billing.paymentMethod}` : ''}
                                </strong>
                              </div>

                              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
                                <span className="text-slate-500 font-sans block text-[11px]">Settlement / Reference:</span>
                                <strong className="text-slate-300 block text-[11px] truncate">
                                  {job.billing?.onlinePaymentReference
                                    ? `Ref: ${job.billing.onlinePaymentReference}`
                                    : job.billing?.paymentStatus === 'PAID'
                                    ? 'Cash Settled'
                                    : 'Awaiting Settlement'}
                                </strong>
                              </div>
                            </div>

                            {/* Billing Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                              <span className="text-[11px] text-slate-400 font-sans">
                                {job.billing?.totalAmount && job.billing.totalAmount > 0
                                  ? 'Invoice linked to Job Order. Click View to inspect full invoice specification.'
                                  : 'No invoice generated yet. Click Billing to set up scope, items, and cost.'}
                              </span>

                              <div className="flex items-center gap-2">
                                {job.billing?.totalAmount && job.billing.totalAmount > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => handleViewInvoice(job)}
                                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                                  >
                                    <FileText size={13} className="text-cyan-400" />
                                    <span>View Invoice</span>
                                  </button>
                                ) : null}

                                <button
                                  type="button"
                                  onClick={() => handleOpenBillingModal(job)}
                                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-glow-emerald"
                                >
                                  <CreditCard size={13} />
                                  <span>{job.billing?.totalAmount && job.billing.totalAmount > 0 ? 'Edit Billing / Invoice' : 'Billing / Generate Invoice'}</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Ready for Pickup Information Banner */}
                          {job.status === 'READY_FOR_PICKUP' && (
                            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 space-y-2.5 text-xs shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-500/30">
                                <div className="flex items-center gap-2 text-emerald-300 font-bold">
                                  <CheckCircle2 size={16} className="text-emerald-400 animate-pulse" />
                                  <span>Device Serviced & Ready for Customer Pickup</span>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  Ready: {job.readyAt ? new Date(job.readyAt).toLocaleString() : 'Ready for Pickup'}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                                <div>
                                  <span className="text-slate-400 block font-medium">Pickup Location:</span>
                                  <strong className="text-slate-100 font-bold text-xs">
                                    {job.pickupLocation || job.evaluation?.confirmedLocation || 'Electronics Diagnostics & Repair Desk - Room 402'}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 block font-medium">Customer Email Notification:</span>
                                  <span className="text-cyan-300 font-mono flex items-center gap-1">
                                    <Mail size={11} /> {job.clientEmail}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Completed & Released Handover Banner */}
                          {job.status === 'COMPLETED' && (
                            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-emerald-950/40 border border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.15)] space-y-3 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-500/30">
                                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                                  <ShieldCheck size={18} className="text-emerald-400" />
                                  <span>Job Order Completed &amp; Device Handover Concluded</span>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                  <CheckCircle2 size={12} /> Status: COMPLETED
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] font-mono">
                                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
                                  <span className="text-slate-500 font-sans block text-[10px] uppercase font-bold">Device Claimed &amp; Released To:</span>
                                  <strong className="text-emerald-300 block text-xs truncate">
                                    {job.deviceReleasedTo || job.completion?.deviceReleasedTo || job.clientName}
                                  </strong>
                                </div>
                                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
                                  <span className="text-slate-500 font-sans block text-[10px] uppercase font-bold">Completion Timestamp:</span>
                                  <strong className="text-slate-200 block text-xs">
                                    {(job.completedAt || job.completion?.completedAt)
                                      ? new Date(job.completedAt || job.completion!.completedAt!).toLocaleString()
                                      : new Date().toLocaleString()}
                                  </strong>
                                </div>
                                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
                                  <span className="text-slate-500 font-sans block text-[10px] uppercase font-bold">Settlement Status:</span>
                                  <strong className="text-emerald-400 block text-xs">
                                    {job.billing?.settlementDate
                                      ? `Settled (${new Date(job.billing.settlementDate).toLocaleDateString()})`
                                      : 'Paid in Full'}
                                  </strong>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-500/20">
                                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                                  <Lock size={12} className="text-emerald-400" />
                                  <span>Official release recorded. Further repair-status changes are locked.</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenFinalReceipt(job)}
                                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-glow-emerald flex items-center gap-1.5"
                                  >
                                    <Receipt size={14} />
                                    <span>View Official Release Receipt</span>
                                  </button>

                                  {user?.role === 'ADMIN' && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (confirm(`Admin Override: Reopen Job Order ${job.id} back to In Diagnostics?`)) {
                                          const ok = await updateRepair(job.id, { status: 'IN_DIAGNOSTICS', isAdmin: true });
                                          if (ok) {
                                            toast.info('Job Order Reopened', `Job order ${job.id} reopened by administrator.`);
                                          }
                                        }
                                      }}
                                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all flex items-center gap-1"
                                    >
                                      <span>Reopen (Admin)</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 4. Job Order Status Progression Controls (All 6 Required Statuses) */}
                          <div className="pt-3 border-t border-indigo-500/20 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1.5">
                                <Layers size={13} className="text-indigo-400" />
                                Update Repair Progress (Status Action Buttons):
                              </span>
                              <span className="text-[11px] font-mono text-slate-400">
                                Current: <strong className="text-slate-200">{job.status.replace(/_/g, ' ')}</strong>
                              </span>
                            </div>

                            {job.status === 'COMPLETED' ? (
                              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs flex items-center justify-between">
                                <div className="flex items-center gap-2 text-slate-300">
                                  <Lock size={14} className="text-emerald-400" />
                                  <span>Job Order is Completed and locked against further technician status modifications.</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenFinalReceipt(job)}
                                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold flex items-center gap-1"
                                >
                                  <Receipt size={12} className="text-emerald-400" />
                                  <span>Receipt</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                {/* Billing Action Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenBillingModal(job)}
                                  className="py-1.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1.5 mr-1"
                                >
                                  <CreditCard size={13} />
                                  <span>Billing</span>
                                </button>

                                {/* 1. Diagnostics */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(job.id, 'IN_DIAGNOSTICS')}
                                  className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all border ${
                                    job.status === 'IN_DIAGNOSTICS'
                                      ? 'bg-cyan-600 text-white border-cyan-400 shadow-glow-cyan'
                                      : 'bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40'
                                  }`}
                                >
                                  1. Diagnostics
                                </button>

                                {/* 2. Awaiting Parts */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(job.id, 'AWAITING_PARTS')}
                                  className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all border ${
                                    job.status === 'AWAITING_PARTS'
                                      ? 'bg-amber-600 text-white border-amber-400 shadow-glow-amber'
                                      : 'bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                                  }`}
                                >
                                  2. Awaiting Parts
                                </button>

                                {/* 3. Repair In Progress */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(job.id, 'REPAIR_IN_PROGRESS')}
                                  className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all border ${
                                    job.status === 'REPAIR_IN_PROGRESS'
                                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-glow-indigo'
                                      : 'bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 border-indigo-500/40'
                                  }`}
                                >
                                  3. Repair In Progress
                                </button>

                                {/* 4. Ready for Pickup */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(job.id, 'READY_FOR_PICKUP')}
                                  className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all border ${
                                    job.status === 'READY_FOR_PICKUP'
                                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-glow-emerald'
                                      : 'bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                                  }`}
                                >
                                  4. Ready for Pickup
                                </button>

                                {/* 5. Completed */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(job.id, 'COMPLETED')}
                                  className="py-1.5 px-3 rounded-xl text-xs font-semibold transition-all border bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-600/40"
                                >
                                  5. Completed
                                </button>

                                {/* 6. Cancel Job */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeclineModal(job)}
                                  className="py-1.5 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 text-xs font-semibold transition-all flex items-center gap-1 ml-auto"
                                >
                                  <XCircle size={13} />
                                  <span>6. Cancel Job</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── WORKFLOW SECTION: CANCELLED REASON DISPLAY (LOCKED FROM REPAIR) ── */}
                    {activeWorkflowTab === 'CANCELLED' && (
                      <div className="p-5 rounded-2xl bg-rose-950/30 border-2 border-rose-500/40 space-y-4 text-xs shadow-card">
                        <div className="flex items-center justify-between pb-3 border-b border-rose-500/30">
                          <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                            <AlertCircle size={18} />
                            <span>Cancellation Audit Record (Job Terminated)</span>
                          </div>
                          <span className="px-3 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            Status: CANCELLED
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-[11px]">
                          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                            <span className="text-slate-500 block font-sans font-semibold">Cancellation Reason:</span>
                            <strong className="text-rose-200 text-xs font-sans block">
                              {job.cancellation?.reason || 'Repair Cancelled'}
                            </strong>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                            <span className="text-slate-500 block font-sans font-semibold">Responsible Technician:</span>
                            <strong className="text-slate-200 text-xs font-sans block">
                              {job.technicianAssigned || user?.name || 'Assigned Technician'}
                            </strong>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                            <span className="text-slate-500 block font-sans font-semibold">Cancellation Date & Time:</span>
                            <strong className="text-slate-200 text-xs block">
                              {job.cancellation?.cancelledAt
                                ? new Date(job.cancellation.cancelledAt).toLocaleString()
                                : new Date().toLocaleString()}
                            </strong>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                          <span className="text-slate-400 font-semibold font-sans block">
                            Detailed Cancellation Description & Remarks:
                          </span>
                          <p className="text-slate-200 leading-relaxed font-mono text-xs">
                            {job.cancellation?.description ||
                              'This repair request was cancelled by the technician or client.'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-rose-500/20 text-[11px] font-mono text-slate-400">
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 size={13} />
                            Cancellation record saved to database & prepared for customer notification
                          </span>
                          <span className="text-rose-400 font-bold">
                            🚫 Job Order Locked (Cannot continue into repair)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── DECLINE / CANCELLATION MODAL ─────────────────────────── */}
      {declineModalTarget && (() => {
        const isConfirmedJob = !['RECEIVED', 'PENDING_EVALUATION', 'UNDER_EVALUATION', 'EVALUATED'].includes(
          declineModalTarget.status
        );
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-rose-500/40 shadow-2xl p-6 space-y-5">
              <div className="flex items-center gap-3 text-rose-400 pb-3 border-b border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-100">
                    {isConfirmedJob ? 'Cancel Job Order' : 'Decline Repair Request'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {declineModalTarget.id} · {declineModalTarget.deviceModel}
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                {/* Cancellation Reason Dropdown */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200 block">
                    Cancellation Reason Category *
                  </label>
                  <select
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-semibold focus:border-rose-500 outline-none"
                  >
                    {CANCELLATION_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Detailed Description */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200 block">
                    Detailed Cancellation Description & Remarks *
                  </label>
                  <textarea
                    rows={4}
                    value={cancellationDescription}
                    onChange={(e) => setCancellationDescription(e.target.value)}
                    placeholder={
                      isConfirmedJob
                        ? 'Explain why this active Job Order is being cancelled (e.g. diagnostics showed repair not feasible, required parts unavailable, customer declined estimated cost, etc.)...'
                        : 'Explain why this request is being declined (e.g. unrepairable multilayer board corrosion, OEM parts discontinued, beyond economic repair)...'
                    }
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-rose-500 text-slate-100 text-xs outline-none resize-none font-mono"
                  />
                </div>

                <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-slate-400 text-[11px] leading-relaxed">
                  {isConfirmedJob ? (
                    <>
                      Cancelling this Job Order will change its status to <strong className="text-rose-300">Cancelled</strong>, lock the record from advancing further in repair, and prepare the cancellation notification.
                    </>
                  ) : (
                    <>
                      Declining this request will update its status to <strong className="text-rose-300">Cancelled</strong> and preserve this audit log for the client and administration.
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeclineModalTarget(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Back / Dismiss
                </button>
                <button
                  type="button"
                  disabled={isSubmittingDecline}
                  onClick={handleConfirmDecline}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-glow-indigo disabled:opacity-50"
                >
                  {isSubmittingDecline
                    ? 'Processing...'
                    : isConfirmedJob
                    ? 'Confirm Cancel Job'
                    : 'Confirm Decline'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── BILLING & INVOICE GENERATION MODAL ─────────────────────────── */}
      {billingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-3xl my-8 rounded-2xl bg-slate-900 border border-emerald-500/40 shadow-2xl p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CreditCard size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-100">Job Order Billing & Invoice Setup</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Job Order: <strong className="text-indigo-300">{billingTarget.id}</strong> · Client: <strong className="text-slate-200">{billingTarget.clientName}</strong> ({billingTarget.deviceModel})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBillingTarget(null)}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono p-1.5 rounded-lg bg-slate-800"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-6 text-xs">
              {/* Line Items Section (Work Scope, Item, Quantity, Cost) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-200 flex items-center gap-1.5 uppercase font-mono text-[11px] text-emerald-400">
                    <FileText size={14} />
                    Work Scope & Bill of Materials (Line Items)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddBillingItem}
                    className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <Plus size={13} />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {billingItems.map((item, index) => {
                    const lineTotal = (Math.max(1, Number(item.quantity) || 1)) * (Math.max(0, Number(item.unitCost) || 0));
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-900">
                          <span className="font-mono font-bold text-slate-300">Item #{index + 1}</span>
                          {billingItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveBillingItem(item.id)}
                              className="text-rose-400 hover:text-rose-300 flex items-center gap-1"
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          {/* Work Scope */}
                          <div className="sm:col-span-5 space-y-1">
                            <label className="text-[11px] font-semibold text-slate-300 block">
                              Work Scope Description *
                            </label>
                            <input
                              type="text"
                              value={item.workScope}
                              onChange={(e) => handleUpdateBillingItem(item.id, 'workScope', e.target.value)}
                              placeholder="e.g. Motherboard Micro-soldering / Labor"
                              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:border-emerald-500 text-slate-100 text-xs outline-none"
                            />
                          </div>

                          {/* Item Name (Optional) */}
                          <div className="sm:col-span-3 space-y-1">
                            <label className="text-[11px] font-semibold text-slate-400 block">
                              Item / Part (Optional)
                            </label>
                            <input
                              type="text"
                              value={item.itemName}
                              onChange={(e) => handleUpdateBillingItem(item.id, 'itemName', e.target.value)}
                              placeholder="e.g. NVMe SSD / Liquid Metal"
                              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:border-emerald-500 text-slate-100 text-xs outline-none"
                            />
                          </div>

                          {/* Quantity (Optional) */}
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-[11px] font-semibold text-slate-400 block">
                              Qty (Opt)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateBillingItem(item.id, 'quantity', e.target.value)}
                              placeholder="1"
                              className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:border-emerald-500 text-slate-100 text-xs outline-none font-mono text-center"
                            />
                          </div>

                          {/* Cost */}
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-[11px] font-semibold text-slate-300 block">
                              Cost (₱) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unitCost}
                              onChange={(e) => handleUpdateBillingItem(item.id, 'unitCost', e.target.value)}
                              placeholder="0.00"
                              className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:border-emerald-500 text-emerald-400 font-mono text-xs outline-none font-bold text-right"
                            />
                          </div>
                        </div>

                        <div className="text-right text-[11px] font-mono text-slate-400">
                          Subtotal: <strong className="text-slate-200">₱{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Auto-calculated Total Amount Banner */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-950 to-slate-900 border border-emerald-500/40 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-xs block font-sans">Automatically Calculated Total Amount:</span>
                    <span className="text-[11px] text-slate-500 font-mono">{billingItems.length} billing line item(s)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-emerald-400 font-mono tracking-tight">
                      ₱{calculatedBillingTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Terms Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                {/* 1. Payment Timing */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200 block">
                    1. Payment Timing *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBillingPaymentTiming('PAY_NOW')}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                        billingPaymentTiming === 'PAY_NOW'
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-glow-emerald'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      ⚡ Pay Now
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingPaymentTiming('PAY_AFTER_REPAIR')}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                        billingPaymentTiming === 'PAY_AFTER_REPAIR'
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-glow-indigo'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      🛠️ Pay After Repair
                    </button>
                  </div>
                </div>

                {/* 2. Payment Method */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200 block">
                    2. Payment Method *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBillingPaymentMethod('CASH')}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                        billingPaymentMethod === 'CASH'
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-glow-emerald'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      💵 Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingPaymentMethod('ONLINE')}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                        billingPaymentMethod === 'ONLINE'
                          ? 'bg-cyan-600 text-white border-cyan-400 shadow-glow-cyan'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      📱 Online (GCash / Maya)
                    </button>
                  </div>
                </div>
              </div>

              {/* Conditional Validation Section based on Timing & Method */}
              {billingPaymentTiming === 'PAY_NOW' && billingPaymentMethod === 'CASH' && (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                    <DollarSign size={16} />
                    <span>Pay Now · Cash Settlement Requirements</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-200 block">
                        Amount Received (₱) *
                      </label>
                      <button
                        type="button"
                        onClick={() => setBillingAmountPaid(String(calculatedBillingTotal))}
                        className="text-emerald-400 hover:text-emerald-300 text-[11px] underline"
                      >
                        Set Exact Total (₱{calculatedBillingTotal.toLocaleString()})
                      </button>
                    </div>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={billingAmountPaid}
                      onChange={(e) => setBillingAmountPaid(e.target.value)}
                      placeholder={String(calculatedBillingTotal)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-500 text-emerald-300 font-mono text-sm font-bold outline-none"
                    />
                  </div>
                </div>
              )}

              {billingPaymentTiming === 'PAY_NOW' && billingPaymentMethod === 'ONLINE' && (
                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold">
                    <CreditCard size={16} />
                    <span>Pay Now · Online Payment Requirements</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-slate-200 block">
                          Amount Paid (₱) *
                        </label>
                        <button
                          type="button"
                          onClick={() => setBillingAmountPaid(String(calculatedBillingTotal))}
                          className="text-cyan-400 hover:text-cyan-300 text-[11px] underline"
                        >
                          Set Exact Total
                        </button>
                      </div>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={billingAmountPaid}
                        onChange={(e) => setBillingAmountPaid(e.target.value)}
                        placeholder={String(calculatedBillingTotal)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-500 text-cyan-300 font-mono text-sm font-bold outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-200 block">
                        Online Payment Reference Number *
                      </label>
                      <input
                        type="text"
                        value={billingOnlineReference}
                        onChange={(e) => setBillingOnlineReference(e.target.value)}
                        placeholder="e.g. GC-20260930-891234 or Maya Ref"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-500 text-slate-100 font-mono text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {billingPaymentTiming === 'PAY_AFTER_REPAIR' && (
                <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-indigo-300 text-[11px] leading-relaxed flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Pay After Repair Selected:</strong> Payment status will remain <strong className="text-amber-300">UNPAID</strong> until the repair is fully completed and picked up. Payment amount and reference number are not required at this stage.
                  </div>
                </div>
              )}

              {/* Optional Billing Notes */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 block">
                  Billing & Warranty Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={billingNotes}
                  onChange={(e) => setBillingNotes(e.target.value)}
                  placeholder="e.g. Standard 30-day laboratory service warranty for motherboard soldering and replaced components..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-500 text-slate-100 text-xs outline-none resize-none font-mono"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setBillingTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingBilling}
                onClick={handleGenerateInvoice}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-glow-emerald disabled:opacity-50 flex items-center gap-2"
              >
                <Receipt size={16} />
                <span>{isSubmittingBilling ? 'Generating Invoice...' : 'Generate & Link Invoice'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW INVOICE MODAL ─────────────────────────── */}
      {invoiceViewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl my-8 rounded-2xl bg-slate-900 border border-emerald-500/40 shadow-2xl p-6 sm:p-8 space-y-6 text-slate-200">
            {/* Invoice Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm uppercase tracking-wider">
                  <Receipt size={18} />
                  <span>LabAssist Hardware Repair Service</span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-100 mt-1">Official Repair Invoice</h2>
                <p className="text-xs text-slate-400 font-mono">
                  University of Makati · College of Computing and Information Sciences
                </p>
              </div>

              <div className="sm:text-right font-mono space-y-1 text-xs">
                <div className="inline-block px-3 py-1 rounded-full text-xs font-bold border font-sans uppercase mb-1">
                  {invoiceViewData.paymentStatus === 'PAID' ? (
                    <span className="text-emerald-400 bg-emerald-950/50 border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                      ✓ PAID
                    </span>
                  ) : (
                    <span className="text-amber-400 bg-amber-950/50 border-amber-500/40 px-2.5 py-0.5 rounded-full">
                      ⏳ UNPAID
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500">Invoice ID: </span>
                  <strong className="text-emerald-300 font-bold">{invoiceViewData.invoiceNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Linked Job Order: </span>
                  <strong className="text-indigo-300 font-bold">{invoiceViewData.jobOrderNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Issue Date: </span>
                  <span className="text-slate-300">{invoiceViewData.issueDate}</span>
                </div>
              </div>
            </div>

            {/* Client & Device Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono">
              <div className="space-y-1.5">
                <span className="text-slate-500 font-sans uppercase text-[11px] font-bold block">Customer Details:</span>
                <div><span className="text-slate-400">Client Name: </span><strong className="text-slate-100">{invoiceViewData.clientName}</strong></div>
                {invoiceViewData.clientEmail && <div><span className="text-slate-400">Email: </span><span className="text-slate-300">{invoiceViewData.clientEmail}</span></div>}
                <div><span className="text-slate-400">Assigned Tech: </span><strong className="text-slate-200">{invoiceViewData.assignedTechnician || 'Tech. Alex Torres'}</strong></div>
              </div>

              <div className="space-y-1.5">
                <span className="text-slate-500 font-sans uppercase text-[11px] font-bold block">Device Specification:</span>
                <div><span className="text-slate-400">Device Model: </span><strong className="text-slate-100">{invoiceViewData.deviceModel}</strong></div>
                <div><span className="text-slate-400">Serial Number: </span><span className="text-cyan-300 font-bold">{invoiceViewData.serialNumber}</span></div>
                <div><span className="text-slate-400">Payment Timing: </span><span className="text-indigo-300">{invoiceViewData.paymentTiming === 'PAY_NOW' ? 'Pay Now' : 'Pay After Repair'}</span></div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider block">
                Bill of Materials & Work Scope Breakdown:
              </span>
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950/60">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-slate-400 font-mono text-[11px] border-b border-slate-800 uppercase">
                    <tr>
                      <th className="p-2.5">Work Scope Description</th>
                      <th className="p-2.5">Item / Part</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Unit Cost</th>
                      <th className="p-2.5 text-right">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {(invoiceViewData.items || []).map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="p-2.5 font-sans font-semibold text-slate-100">{item.workScope}</td>
                        <td className="p-2.5 text-slate-400">{item.itemName || '—'}</td>
                        <td className="p-2.5 text-center text-slate-300">{item.quantity || 1}</td>
                        <td className="p-2.5 text-right text-slate-300">₱{Number(item.unitCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-400">₱{Number(item.totalCost || item.unitCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Summary */}
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="space-y-1">
                <div><span className="text-slate-500 font-sans">Payment Method: </span><strong className="text-slate-200">{invoiceViewData.paymentMethod || 'N/A'}</strong></div>
                {invoiceViewData.onlinePaymentReference && (
                  <div><span className="text-slate-500 font-sans">Online Reference: </span><strong className="text-cyan-300">{invoiceViewData.onlinePaymentReference}</strong></div>
                )}
                {invoiceViewData.settlementDate && (
                  <div><span className="text-slate-500 font-sans">Settled On: </span><span className="text-slate-300">{new Date(invoiceViewData.settlementDate).toLocaleString()}</span></div>
                )}
              </div>

              <div className="text-right space-y-0.5">
                <span className="text-slate-400 font-sans block text-xs">Total Amount Due:</span>
                <strong className="text-2xl font-extrabold text-emerald-400 tracking-tight block">
                  ₱{Number(invoiceViewData.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </strong>
                {invoiceViewData.paymentStatus === 'PAID' && (
                  <span className="text-emerald-400 text-[11px] font-sans font-semibold block">
                    Amount Paid: ₱{Number(invoiceViewData.amountPaid || invoiceViewData.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>

            {invoiceViewData.billingNotes && (
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 font-mono">
                <span className="font-semibold text-slate-300 block font-sans">Notes / Terms:</span>
                {invoiceViewData.billingNotes}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5 transition-all"
              >
                <Printer size={14} />
                <span>Print Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => setInvoiceViewData(null)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-glow-emerald"
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── READY FOR PICKUP CONFIRMATION MODAL ── */}
      {pickupModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-emerald-500/40 shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Mark Ready for Pickup</h3>
                  <p className="text-xs text-slate-400">Job Order: {pickupModalTarget.id} &bull; {pickupModalTarget.deviceModel}</p>
                </div>
              </div>
              <button
                onClick={() => setPickupModalTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Client:</span>
                <span className="font-semibold text-slate-200">{pickupModalTarget.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Registered Email:</span>
                <span className="font-mono text-cyan-300">{pickupModalTarget.clientEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Device:</span>
                <span className="font-semibold text-slate-200">{pickupModalTarget.deviceModel} (S/N: {pickupModalTarget.serialNumber})</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Pickup Location / Counter Desk <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={pickupLocationInput}
                onChange={(e) => setPickupLocationInput(e.target.value)}
                placeholder="e.g. Electronics Diagnostics Desk - Room 402"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                This location will be saved to the database and included in the Brevo email notification sent to the customer.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPickupModalTarget(null)}
                disabled={isSubmittingPickup}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPickup}
                disabled={isSubmittingPickup || !pickupLocationInput.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-glow-emerald flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingPickup ? (
                  <>
                    <LoadingSpinner size={14} className="text-white" />
                    <span>Updating &amp; Sending Email...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Confirm &amp; Dispatch Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PAYMENT SETTLEMENT MODAL (CASE 2: UNPAID) ── */}
      {settlementModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-amber-500/50 shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Record Payment Settlement</h3>
                  <p className="text-xs text-slate-400">
                    Job Order: <span className="font-mono text-cyan-300">{settlementModalTarget.id}</span> &bull; {settlementModalTarget.clientName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSettlementModalTarget(null);
                  setSettlementInvoiceData(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Warning Banner */}
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-300">Unpaid Invoice Balance Detected</strong>
                <span>
                  Payment must be collected and recorded before the device can be officially released and marked as Completed.
                </span>
              </div>
            </div>

            {/* Invoice Summary Box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Device Model:</span>
                <strong className="text-slate-200">{settlementModalTarget.deviceModel} (S/N: {settlementModalTarget.serialNumber})</strong>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="text-sm font-semibold text-slate-300">Total Amount Due:</span>
                <span className="text-xl font-extrabold text-amber-400 font-mono">
                  ₱{Number(settlementInvoiceData?.totalAmount || settlementModalTarget.billing?.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-200">
                Payment Method <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSettlementMethod('CASH')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    settlementMethod === 'CASH'
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-glow-emerald'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <DollarSign size={15} />
                  <span>Cash Payment</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettlementMethod('ONLINE')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    settlementMethod === 'ONLINE'
                      ? 'bg-cyan-600 text-white border-cyan-400 shadow-glow-cyan'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <QrCode size={15} />
                  <span>Online (GCash / Maya)</span>
                </button>
              </div>
            </div>

            {/* Method Inputs */}
            {settlementMethod === 'CASH' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Amount Received (₱) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settlementAmount}
                  onChange={(e) => setSettlementAmount(e.target.value)}
                  placeholder="e.g. 1850.00"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-emerald-300 font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Amount Paid (₱) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settlementAmount}
                    onChange={(e) => setSettlementAmount(e.target.value)}
                    placeholder="e.g. 1850.00"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-cyan-300 font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Online Payment Reference Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={settlementReference}
                    onChange={(e) => setSettlementReference(e.target.value)}
                    placeholder="e.g. GC-20260930-8819241 or Maya Ref"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSettlementModalTarget(null);
                  setSettlementInvoiceData(null);
                }}
                disabled={isSubmittingSettlement}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSettlement}
                disabled={isSubmittingSettlement || !settlementAmount}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-glow-emerald flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingSettlement ? (
                  <>
                    <LoadingSpinner size={14} className="text-white" />
                    <span>Recording Settlement...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Settle Payment &amp; Proceed to Handover</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DEVICE RELEASE & COMPLETION MODAL ── */}
      {releaseModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-emerald-500/50 shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Device Release &amp; Job Completion</h3>
                  <p className="text-xs text-slate-400">
                    Job Order: <span className="font-mono text-cyan-300">{releaseModalTarget.id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReleaseModalTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Payment Cleared Status */}
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span className="font-semibold">Invoice Payment Status: Paid in Full</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                SETTLED
              </span>
            </div>

            {/* Device Info */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Device:</span>
                <strong className="text-slate-200">{releaseModalTarget.deviceModel}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Serial Number:</span>
                <span className="font-mono text-cyan-300">{releaseModalTarget.serialNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Registered Customer:</span>
                <strong className="text-slate-200">{releaseModalTarget.clientName} ({releaseModalTarget.clientEmail})</strong>
              </div>
            </div>

            {/* Recipient Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Device Claimed &amp; Released To (Full Name) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={releaseRecipient}
                onChange={(e) => setReleaseRecipient(e.target.value)}
                placeholder="Full name of student / faculty / authorized representative"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Technician handover audit record. The Job Order will be officially marked Completed upon confirmation.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReleaseModalTarget(null)}
                disabled={isSubmittingRelease}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRelease}
                disabled={isSubmittingRelease || !releaseRecipient.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-glow-emerald flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingRelease ? (
                  <>
                    <LoadingSpinner size={14} className="text-white" />
                    <span>Completing Handover...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Release Device &amp; Mark Completed</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FINAL RELEASE & JOB ORDER COMPLETION RECEIPT MODAL ── */}
      {finalReceiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-3xl my-8 rounded-2xl bg-slate-900 border border-emerald-500/50 shadow-2xl p-6 sm:p-8 space-y-6">
            {/* Header / Brand */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                    <Receipt size={20} />
                  </div>
                  <div>
                    <span className="text-[11px] font-mono uppercase font-bold text-emerald-400 tracking-wider">
                      University of Makati · CCIS Lab Services
                    </span>
                    <h2 className="text-lg font-black text-slate-100">
                      Official Device Release &amp; Completion Receipt
                    </h2>
                  </div>
                </div>
                <p className="text-xs text-slate-400 font-sans">
                  Electronics Diagnostics &amp; IT Hardware Servicing Desk · Handover Verification
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-start">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Printer size={13} className="text-emerald-400" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFinalReceiptData(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Top Status & Reference Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block">Job Order Number</span>
                <span className="text-sm font-extrabold font-mono text-cyan-400 block">{finalReceiptData.jobOrderId}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block">Invoice Reference</span>
                <span className="text-sm font-bold font-mono text-emerald-400 block">{finalReceiptData.invoiceId}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block">Release Date &amp; Time</span>
                <span className="text-xs font-semibold text-slate-200 block">
                  {new Date(finalReceiptData.completedAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Client & Device Details */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-3 text-xs">
              <span className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider block">
                Equipment &amp; Custody Information
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Registered Owner:</span>
                    <strong className="text-slate-200">{finalReceiptData.clientName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">University Email:</span>
                    <span className="font-mono text-cyan-300">{finalReceiptData.clientEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Department / College:</span>
                    <span className="text-slate-300">{finalReceiptData.clientDepartment || 'UMak CCIS'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Device Released To:</span>
                    <strong className="text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {finalReceiptData.deviceReleasedTo}
                    </strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Device Model:</span>
                    <strong className="text-slate-200">{finalReceiptData.deviceModel}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Device Type:</span>
                    <span className="text-slate-300">{finalReceiptData.deviceType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Serial Number:</span>
                    <span className="font-mono text-cyan-300">{finalReceiptData.serialNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Authorized Technician:</span>
                    <strong className="text-slate-200">{finalReceiptData.technicianName}</strong>
                  </div>
                </div>
              </div>

              {/* Service & Scope Description */}
              <div className="pt-2 border-t border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold block">Work Scope &amp; Replacement Components:</span>
                <p className="text-slate-300 font-mono text-[11px] leading-relaxed bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  {finalReceiptData.partsReplaced && finalReceiptData.partsReplaced !== 'N/A'
                    ? `Parts Replaced: ${finalReceiptData.partsReplaced} · Issue Addressed: ${finalReceiptData.reportedIssue}`
                    : `Service Completed: Diagnostics, board verification, and servicing for ${finalReceiptData.reportedIssue}`}
                </p>
              </div>
            </div>

            {/* Payment & Settlement Specification */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider block">
                  Payment Settlement Summary
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 size={11} /> PAID IN FULL
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[11px]">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-slate-500 block font-sans text-[10px]">Payment Method:</span>
                  <strong className="text-slate-200 block text-xs">{finalReceiptData.paymentMethod}</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-slate-500 block font-sans text-[10px]">Reference / Trace:</span>
                  <strong className="text-slate-300 block text-xs truncate">
                    {finalReceiptData.onlinePaymentReference || 'Cash Settlement'}
                  </strong>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-slate-500 block font-sans text-[10px]">Settlement Date:</span>
                  <strong className="text-slate-200 block text-xs">
                    {new Date(finalReceiptData.settlementDate).toLocaleDateString()}
                  </strong>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 space-y-1">
                  <span className="text-emerald-400 block font-sans text-[10px] font-bold">Total Amount Paid:</span>
                  <strong className="text-emerald-300 block text-sm font-black">
                    ₱{Number(finalReceiptData.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>
            </div>

            {/* Handover Sign-off & Audit Notice */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare size={15} className="text-emerald-400" />
                <span>Device handover verified and logged in University of Makati IT Laboratory Repair Registry.</span>
              </div>
              <span className="font-mono text-emerald-400 font-bold uppercase text-[10px]">
                OFFICIALLY COMPLETED
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5"
              >
                <Printer size={13} className="text-emerald-400" />
                <span>Print Official Copy</span>
              </button>
              <button
                type="button"
                onClick={() => setFinalReceiptData(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-glow-emerald flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Done / Dismiss Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

