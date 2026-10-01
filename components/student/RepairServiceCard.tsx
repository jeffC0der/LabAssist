'use client';
import React, { useState } from 'react';
import {
  Wrench,
  Laptop,
  Monitor,
  User,
  Mail,
  Cpu,
  Hash,
  AlertTriangle,
  CheckSquare,
  Square,
  Send,
  Sparkles,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Tag,
  ArrowRight,
  ClipboardList,
  Flame,
  Droplets,
  HelpCircle,
  QrCode,
  Layers,
  RotateCcw,
  CreditCard,
  Receipt,
  Calendar,
  MapPin,
  Lock,
  Printer,
  X,
  ExternalLink,
  XCircle,
  AlertCircle,
  Info,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRepairs, DeviceRepair, RepairStatus } from '@/context/RepairContext';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export interface RepairIntakeRequest {
  id: string;
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
  submittedAt: string;
  estimatedCompletion: string;
  confirmationDate?: string;
  pickupLocation?: string;
  readyAt?: string;
  confirmedLocation?: string;
}

const COMMON_ISSUES = [
  'No display output on boot',
  'Overheating & thermal shutdown while gaming',
  'Spilled liquid on keyboard & trackpad',
  'BSOD (Blue Screen) crash on startup',
  'Battery not charging / DC jack loose',
  'Intermittent Wi-Fi & Bluetooth dropouts',
];

export const WORKFLOW_STAGES = [
  { key: 'EVALUATION', label: 'Evaluation', shortDesc: 'Assessment' },
  { key: 'CONFIRMED', label: 'Confirmed Job Order', shortDesc: 'Approved' },
  { key: 'IN_DIAGNOSTICS', label: 'Diagnostics', shortDesc: 'Bench Check' },
  { key: 'AWAITING_PARTS', label: 'Awaiting Parts', shortDesc: 'Parts Transit' },
  { key: 'REPAIR_IN_PROGRESS', label: 'Repair In Progress', shortDesc: 'Active Repair' },
  { key: 'READY_FOR_PICKUP', label: 'Ready for Pickup', shortDesc: 'Counter Pickup' },
  { key: 'COMPLETED', label: 'Completed', shortDesc: 'Device Released' },
];

export function getStageIndex(status: string): number {
  switch (status) {
    case 'RECEIVED':
    case 'PENDING_EVALUATION':
    case 'UNDER_EVALUATION':
    case 'EVALUATED':
      return 0;
    case 'CONFIRMED':
      return 1;
    case 'IN_DIAGNOSTICS':
      return 2;
    case 'AWAITING_PARTS':
      return 3;
    case 'REPAIR_IN_PROGRESS':
      return 4;
    case 'READY_FOR_PICKUP':
      return 5;
    case 'COMPLETED':
      return 6;
    default:
      return -1; // e.g. CANCELLED
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'RECEIVED':
    case 'PENDING_EVALUATION':
    case 'UNDER_EVALUATION':
    case 'EVALUATED':
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <span>Evaluation</span>
        </span>
      );
    case 'CONFIRMED':
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span>Confirmed Job Order</span>
        </span>
      );
    case 'IN_DIAGNOSTICS':
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>In Diagnostics</span>
        </span>
      );
    case 'AWAITING_PARTS':
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Awaiting Parts</span>
        </span>
      );
    case 'REPAIR_IN_PROGRESS':
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
          <span>Repair In Progress</span>
        </span>
      );
    case 'READY_FOR_PICKUP':
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-glow-emerald">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Ready for Pickup</span>
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-700 text-white border border-emerald-500/60 flex items-center gap-1.5 shadow-glow-emerald">
          <CheckCircle2 size={13} className="text-emerald-200" />
          <span>Completed</span>
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5">
          <XCircle size={13} className="text-rose-400" />
          <span>Cancelled</span>
        </span>
      );
    default:
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span>{status.replace(/_/g, ' ')}</span>
        </span>
      );
  }
}

export default function RepairServiceCard() {
  const { user } = useAuth();
  const toast = useToast();
  const { repairs: dbRepairs, submitRepair } = useRepairs();

  // Active view tab inside Repair Service
  const [activeSubTab, setActiveSubTab] = useState<'INTAKE_FORM' | 'ACTIVE_REPAIRS'>('INTAKE_FORM');

  // Client Details (Pre-filled from logged-in student)
  const [clientName, setClientName] = useState<string>(user?.name || '');
  const [clientEmail, setClientEmail] = useState<string>(user?.email || '');

  // Keep form contact details in sync when switching user accounts
  React.useEffect(() => {
    if (user?.name) setClientName(user.name);
    if (user?.email) setClientEmail(user.email);
  }, [user]);

  // Device Metadata
  const [deviceType, setDeviceType] = useState<'Laptop' | 'Desktop' | 'Other'>('Laptop');
  const [deviceModel, setDeviceModel] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [osSpecs, setOsSpecs] = useState<string>('');
  const [reportedIssue, setReportedIssue] = useState<string>('');

  // Physical & Pre-Diagnostic Inspection Checklist
  const [scratchesDents, setScratchesDents] = useState<boolean>(false);
  const [missingScrewsFeet, setMissingScrewsFeet] = useState<boolean>(false);
  const [screenDamageDeadPixels, setScreenDamageDeadPixels] = useState<boolean>(false);
  const [liquidDamageIndicators, setLiquidDamageIndicators] = useState<boolean>(false);
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  // Repair Log Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<'ALL' | 'Laptop' | 'Desktop' | 'Other'>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'STATUS' | 'MODEL'>('NEWEST');
  const [expandedRepairId, setExpandedRepairId] = useState<string | null>(null);

  // Submissions State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Customer Modals (Invoice & Final Receipt Viewers)
  const [customerInvoiceModalTarget, setCustomerInvoiceModalTarget] = useState<DeviceRepair | null>(null);
  const [customerReceiptModalTarget, setCustomerReceiptModalTarget] = useState<DeviceRepair | null>(null);

  // Filtered repair logs: Strictly exclusive to the logged-in user account for students/faculty
  const isPrivilegedUser = user?.role === 'TECHNICIAN' || user?.role === 'ADMIN';

  const userRepairs = React.useMemo(() => {
    const seen = new Set<string>();
    return dbRepairs.filter((r) => {
      if (!r || !r.id || seen.has(r.id)) return false;
      seen.add(r.id);

      if (isPrivilegedUser) return true;
      if (!user) return false;
      const userEmailNorm = (user.email || '').trim().toLowerCase();
      const repairEmailNorm = (r.clientEmail || '').trim().toLowerCase();
      const matchesEmail = Boolean(userEmailNorm && repairEmailNorm && userEmailNorm === repairEmailNorm);
      const matchesUserId = Boolean(user.id && r.userId && r.userId === user.id);
      return matchesEmail || matchesUserId;
    });
  }, [dbRepairs, isPrivilegedUser, user]);

  // Filtered and sorted repair logs (using user-exclusive DeviceRepair dataset)
  const filteredRepairs = userRepairs
    .filter((r) => {
      const matchesDevice = deviceFilter === 'ALL' || r.deviceType === deviceFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.deviceModel.toLowerCase().includes(q) ||
        r.serialNumber.toLowerCase().includes(q) ||
        r.reportedIssue.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q);
      return matchesDevice && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'NEWEST') {
        return new Date(b.intakeDate || 0).getTime() - new Date(a.intakeDate || 0).getTime();
      }
      if (sortBy === 'OLDEST') {
        return new Date(a.intakeDate || 0).getTime() - new Date(b.intakeDate || 0).getTime();
      }
      if (sortBy === 'MODEL') {
        return a.deviceModel.localeCompare(b.deviceModel);
      }
      if (sortBy === 'STATUS') {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim() || !clientEmail.trim()) {
      toast.error('Missing Contact Details', 'Please provide client full name and valid UMak email.');
      return;
    }
    if (!deviceModel.trim()) {
      toast.error('Device Model Required', 'Please enter the model of the device.');
      return;
    }
    if (!reportedIssue.trim()) {
      toast.error('Reported Issue Required', 'Please describe the primary problem experienced with the device.');
      return;
    }

    setIsSubmitting(true);

    const result = await submitRepair({
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      deviceType,
      deviceModel: deviceModel.trim(),
      serialNumber: serialNumber.trim() || 'UNTAGGED-S/N',
      osSpecs: osSpecs.trim() || '',
      reportedIssue: reportedIssue.trim(),
      inspectionNotes: {
        scratchesDents,
        missingScrewsFeet,
        screenDamageDeadPixels,
        liquidDamageIndicators,
      },
      additionalInspectionNotes: additionalNotes.trim(),
      userId: user?.id,
    });

    setIsSubmitting(false);

    if (result) {
      toast.success(
        'Intake Confirmed & Receipt Dispatched!',
        `Job Order No: ${result.id}. An official confirmation has been dispatched to ${result.clientEmail} via Brevo.`
      );
      resetForm();
      setActiveSubTab('ACTIVE_REPAIRS');
      setExpandedRepairId(result.id);
    } else {
      toast.error('Submission Failed', 'Could not save repair intake. Please try again.');
    }
  };

  const resetForm = () => {
    setDeviceModel('');
    setSerialNumber('');
    setOsSpecs('');
    setReportedIssue('');
    setScratchesDents(false);
    setMissingScrewsFeet(false);
    setScreenDamageDeadPixels(false);
    setLiquidDamageIndicators(false);
    setAdditionalNotes('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-violet-950/60 via-slate-900/80 to-indigo-950/60 border border-violet-500/20 shadow-card">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-semibold mb-2">
            <Wrench size={14} className="text-violet-400" />
            <span>Campus IT Hardware & Device Repair Service</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight">
            Client & Machine Intake Management
          </h2>
        </div>

        {/* Sub Navigation Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('INTAKE_FORM')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${activeSubTab === 'INTAKE_FORM'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-glow-indigo'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
          >
            New Device Intake
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('ACTIVE_REPAIRS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeSubTab === 'ACTIVE_REPAIRS'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-glow-indigo'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
          >
            <span>Repair Log</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30">
              {userRepairs.length}
            </span>
          </button>
        </div>
      </div>

      {activeSubTab === 'INTAKE_FORM' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ────────────────────────────────────────────────────────── */}
          {/* 1. Client & Device Intake Profile (Header Card)           */}
          {/* ────────────────────────────────────────────────────────── */}
          <div className="glass rounded-2xl p-5 sm:p-6 border border-slate-800/80 space-y-6 shadow-card">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    1. Client & Device Intake Profile
                    <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/30">
                      Header Card
                    </span>
                  </h3>
                </div>
              </div>

              <span className="text-[11px] font-mono text-slate-500 hidden sm:inline-block">
                Auto-synced with UMak Account
              </span>
            </div>

            {/* Client Information Section */}
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                <User size={13} className="text-violet-400" />
                Client Information
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="client-name-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Full Name <span className="text-violet-400">*</span>
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      id="client-name-input"
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Marcus Vance"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="client-email-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Campus Email <span className="text-violet-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      id="client-email-input"
                      type="email"
                      required
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="e.g. marcus.vance@umak.edu.ph"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Device Metadata Section */}
            <div className="pt-4 border-t border-slate-800/60 space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                <Laptop size={13} className="text-cyan-400" />
                Device Metadata
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Device Type Selectable */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Device Type <span className="text-violet-400">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Laptop', 'Desktop', 'Other'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setDeviceType(type)}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${deviceType === type
                            ? 'bg-violet-600 text-white border-violet-500 shadow-glow-indigo'
                            : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800/60'
                          }`}
                      >
                        {type === 'Laptop' ? <Laptop size={13} /> : type === 'Desktop' ? <Monitor size={13} /> : <Cpu size={13} />}
                        <span>{type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Device Model Input */}
                <div>
                  <label htmlFor="device-model-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Model <span className="text-violet-400">*</span>
                  </label>
                  <input
                    id="device-model-input"
                    type="text"
                    required
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                    placeholder="e.g. Lenovo Legion 5 15ARH05"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
                  />
                </div>

                {/* Serial Number / Asset Tag Input */}
                <div>
                  <label htmlFor="serial-number-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Serial Number / Tag <span className="text-violet-400">*</span>
                  </label>
                  <div className="relative">
                    <Hash size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      id="serial-number-input"
                      type="text"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder="e.g. PF2X9Y8Z"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-xs text-slate-100 placeholder-slate-500 font-mono outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* OS / Specs Details */}
              <div>
                <label htmlFor="os-specs-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Operating System & Internal Hardware Specs
                </label>
                <div className="relative">
                  <Cpu size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="os-specs-input"
                    type="text"
                    value={osSpecs}
                    onChange={(e) => setOsSpecs(e.target.value)}
                    placeholder="e.g. Windows 11 Home | Ryzen 5 7535HS | 16GB RAM | RTX 3050"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-xs text-slate-100 placeholder-slate-500 font-mono outline-none transition-all"
                  />
                </div>
              </div>

              {/* Reported Issue Input & Quick Chips */}
              <div className="pt-2">
                <label htmlFor="reported-issue-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Reported Issue <span className="text-violet-400">*</span> (Primary owner complaint)
                </label>
                <textarea
                  id="reported-issue-input"
                  required
                  rows={3}
                  value={reportedIssue}
                  onChange={(e) => setReportedIssue(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-xs text-slate-100 outline-none transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────── */}
          {/* 2. Physical & Pre-Diagnostic Intake Inspection             */}
          {/* ────────────────────────────────────────────────────────── */}
          <div className="glass rounded-2xl p-5 sm:p-6 border border-slate-800/80 space-y-5 shadow-card">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    2. Physical & Pre-Diagnostic Intake Inspection
                    <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Dispute Protection
                    </span>
                  </h3>
                </div>
              </div>

              <span className="text-amber-400/80 text-xs font-mono hidden sm:flex items-center gap-1">
                <AlertTriangle size={13} />
                Intake Audit
              </span>
            </div>

            {/* Checklist Grid */}
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold block">
                Physical Condition Notes:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Scratches / Dents on Chassis */}
                <button
                  type="button"
                  onClick={() => setScratchesDents(!scratchesDents)}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${scratchesDents
                      ? 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)] text-amber-200'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                >
                  <div className="mt-0.5 text-amber-400">
                    {scratchesDents ? <CheckSquare size={17} /> : <Square size={17} className="text-slate-600" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Scratches / Dents on Chassis</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Wear marks, corner drops, gouges, or hinge abrasions.
                    </p>
                  </div>
                </button>

                {/* 2. Missing Screws / Rubber Feet */}
                <button
                  type="button"
                  onClick={() => setMissingScrewsFeet(!missingScrewsFeet)}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${missingScrewsFeet
                      ? 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)] text-amber-200'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                >
                  <div className="mt-0.5 text-amber-400">
                    {missingScrewsFeet ? <CheckSquare size={17} /> : <Square size={17} className="text-slate-600" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Missing Screws / Rubber Feet</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Bottom panel screw vacancies, stripped threads, or detached grip pads.
                    </p>
                  </div>
                </button>

                {/* 3. Screen Damage / Dead Pixels */}
                <button
                  type="button"
                  onClick={() => setScreenDamageDeadPixels(!screenDamageDeadPixels)}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${screenDamageDeadPixels
                      ? 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)] text-amber-200'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                >
                  <div className="mt-0.5 text-amber-400">
                    {screenDamageDeadPixels ? <CheckSquare size={17} /> : <Square size={17} className="text-slate-600" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Screen Damage / Dead Pixels</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Panel pressure marks, vertical lines, cracked digitizer glass, or dead subpixels.
                    </p>
                  </div>
                </button>

                {/* 4. Water / Liquid Damage Indicators */}
                <button
                  type="button"
                  onClick={() => setLiquidDamageIndicators(!liquidDamageIndicators)}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${liquidDamageIndicators
                      ? 'bg-rose-950/30 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.15)] text-rose-200'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                >
                  <div className="mt-0.5 text-rose-400">
                    {liquidDamageIndicators ? <CheckSquare size={17} /> : <Square size={17} className="text-slate-600" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Water / Liquid Damage Indicators</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tripped pink LDI stickers, board corrosion, sticky keyboard membranes.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Additional Inspector Remarks */}
            <div className="pt-2">
              <label htmlFor="additional-notes-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Additional Inspection Remarks / Accompanying Accessories
              </label>
              <textarea
                id="additional-notes-input"
                rows={2}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-slate-100 outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Form Action Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0" />
              <span>Campus IT Repair Center · Official RMA Intake Agreement Generated Upon Submit</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={resetForm}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={14} />
                Clear Form
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial py-2.5 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-glow-indigo transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size={14} className="text-white" />
                    <span>Registering Intake...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Submit Device for Repair</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* ────────────────────────────────────────────────────────── */
        /* ACTIVE REPAIRS & INTAKE SLIP LOG                           */
        /* ────────────────────────────────────────────────────────── */
        <div className="space-y-6">

          {/* List of Repair Tickets */}
          <div className="glass rounded-2xl p-5 border border-slate-800/80 space-y-4 shadow-card">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800/70">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileText size={17} className="text-violet-400" />
                Active Device Repair Logs ({filteredRepairs.length})
              </h3>
              <button
                type="button"
                onClick={() => setActiveSubTab('INTAKE_FORM')}
                className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1 self-start md:self-auto"
              >
                + Submit Another Machine
              </button>
            </div>

            {/* Search, Filter & Sorting Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              {/* Quick Device Type Filter */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(['ALL', 'Laptop', 'Desktop', 'Other'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDeviceFilter(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      deviceFilter === type
                        ? 'bg-violet-600 text-white shadow-glow-indigo'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {type === 'ALL' ? 'All Devices' : type}
                  </button>
                ))}
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                {/* Search Input */}
                <div className="relative w-full sm:w-56">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search RMA, model, S/N..."
                    className="w-full pl-3 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-violet-500 text-xs text-slate-100 placeholder-slate-500 outline-none font-mono"
                  />
                </div>

                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-950 text-slate-200 border border-slate-800 focus:border-violet-500 outline-none cursor-pointer"
                >
                  <option value="NEWEST">Sort: Newest First</option>
                  <option value="OLDEST">Sort: Oldest First</option>
                  <option value="STATUS">Sort: By Status</option>
                  <option value="MODEL">Sort: By Model (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Repair Cards or Empty State */}
            {filteredRepairs.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center border border-slate-800/80 space-y-3 my-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
                  <Wrench size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-200">No Repair Job Cards Found</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  No active intake repairs match your current filter selection. Try clearing your search query or toggling device filters.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRepairs.map((req) => {
                  const isExpanded = expandedRepairId === req.id;
                  const stageIdx = getStageIndex(req.status);
                  const isCancelled = req.status === 'CANCELLED';

                  return (
                    <div
                      key={req.id}
                      className={`glass rounded-2xl border transition-all duration-200 overflow-hidden shadow-card ${
                        isExpanded
                          ? 'border-indigo-500/50 bg-slate-900/90 ring-1 ring-indigo-500/20'
                          : 'border-slate-800/80 hover:border-slate-700 bg-slate-900/50'
                      }`}
                    >
                      {/* 1. Header: Device, ID, Customer, S/N, Date & Collapsible Toggle */}
                      <div
                        onClick={() => setExpandedRepairId(isExpanded ? null : req.id)}
                        className="p-5 cursor-pointer hover:bg-slate-800/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 select-none"
                      >
                        <div className="flex items-start sm:items-center gap-3.5">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                              req.deviceType === 'Laptop'
                                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                : req.deviceType === 'Desktop'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            }`}
                          >
                            {req.deviceType === 'Laptop' ? (
                              <Laptop size={20} />
                            ) : req.deviceType === 'Desktop' ? (
                              <Monitor size={20} />
                            ) : (
                              <Cpu size={20} />
                            )}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-extrabold text-slate-100 text-sm sm:text-base">
                                {req.deviceModel}
                              </span>
                              <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-500/15 px-2.5 py-0.5 rounded-md border border-indigo-500/30">
                                {req.id}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                {req.deviceType}
                              </span>
                            </div>

                            {/* Customer & Hardware Summary */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                              <span className="text-slate-300 flex items-center gap-1 font-sans font-medium">
                                <User size={12} className="text-slate-500" />
                                {req.clientName}
                              </span>
                              <span className="text-slate-600">·</span>
                              <span className="text-slate-400 flex items-center gap-1">
                                <Mail size={12} className="text-slate-500" />
                                {req.clientEmail}
                              </span>
                              <span className="text-slate-600">·</span>
                              <span className="text-cyan-400 flex items-center gap-1">
                                <Hash size={12} className="text-slate-500" />
                                S/N: {req.serialNumber}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Header Badges & Chevron Toggle */}
                        <div className="flex items-center gap-3 self-end md:self-center">
                          <div className="text-right hidden sm:block">
                            <span className="text-[10px] text-slate-500 block font-mono">Intake Date</span>
                            <span className="text-xs text-slate-300 font-medium">
                              {req.intakeDate ? new Date(req.intakeDate).toLocaleDateString() : 'Today'}
                            </span>
                          </div>

                          <div>{getStatusBadge(req.status)}</div>

                          <div className="p-1 rounded-lg bg-slate-800 text-slate-400">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                      </div>

                      {/* ── Collapsible Body Content ── */}
                      {isExpanded && (
                        <div className="p-5 sm:p-6 space-y-5 bg-slate-950/50 animate-fade-in">
                          {/* 2. Customer Repair Lifecycle Stepper (7 Stages: Evaluation → Confirmed → Diagnostics → Awaiting Parts → In Progress → Ready for Pickup → Completed) */}
                          {isCancelled ? (
                            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs flex items-center justify-between">
                              <div className="flex items-center gap-2 text-rose-300 font-bold">
                                <AlertCircle size={16} />
                                <span>Service Workflow Cancelled / Terminated</span>
                              </div>
                              <span className="text-[11px] font-mono text-rose-400">
                                Status: CANCELLED
                              </span>
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-2.5">
                              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pb-1">
                                <span className="flex items-center gap-1.5 text-slate-200 font-sans font-bold">
                                  <Layers size={13} className="text-violet-400" />
                                  Repair Service Lifecycle Progress:
                                </span>
                                <span className="text-cyan-300 font-bold">
                                  Stage {Math.max(1, stageIdx + 1)} of 7: {WORKFLOW_STAGES[Math.max(0, stageIdx)]?.label}
                                </span>
                              </div>

                              {/* Stepper Stage Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 pt-1">
                                {WORKFLOW_STAGES.map((stage, sIdx) => {
                                  const isPast = sIdx < stageIdx;
                                  const isCurrent = sIdx === stageIdx;

                                  return (
                                    <div
                                      key={stage.key}
                                      className={`p-2 rounded-xl border text-center transition-all ${
                                        isCurrent
                                          ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)] text-cyan-200 font-bold'
                                          : isPast
                                          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                                          : 'bg-slate-900/40 border-slate-800/80 text-slate-500'
                                      }`}
                                    >
                                      <div className="flex items-center justify-center gap-1 mb-0.5">
                                        {isPast ? (
                                          <Check size={11} className="text-emerald-400" />
                                        ) : isCurrent ? (
                                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                                        ) : (
                                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                        )}
                                        <span className="text-[10px] font-mono font-bold uppercase tracking-tight">
                                          {sIdx + 1}. {stage.label}
                                        </span>
                                      </div>
                                      <span className="text-[9px] font-sans block opacity-80 truncate">
                                        {stage.shortDesc}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 3. Stage-Specific Contextual Panels */}

                          {/* A. Ready for Pickup Customer Banner */}
                          {req.status === 'READY_FOR_PICKUP' && (
                            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/70 via-emerald-900/40 to-slate-900 border border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.2)] space-y-2.5 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-500/30">
                                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                                  <CheckCircle2 size={18} className="text-emerald-400 animate-pulse" />
                                  <span>Your Device is Serviced &amp; Ready for Pickup!</span>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  Ready: {req.readyAt ? new Date(req.readyAt).toLocaleString() : 'Ready for Pickup'}
                                </span>
                              </div>
                              <div className="space-y-1.5 pt-0.5">
                                <div className="flex items-start gap-2">
                                  <span className="text-slate-400 font-medium whitespace-nowrap text-xs">Designated Pickup Location:</span>
                                  <strong className="text-slate-100 font-bold text-xs">
                                    {req.pickupLocation || req.evaluation?.confirmedLocation || 'Electronics Diagnostics & Repair Desk - Room 402'}
                                  </strong>
                                </div>
                                <p className="text-[11px] text-slate-300 leading-relaxed">
                                  Please proceed to the desk with your valid UMak Student / Faculty ID and present Job Order <span className="font-mono text-cyan-300 font-bold">{req.id}</span> to inspect and claim your equipment.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* B. Completed & Released Handover Summary */}
                          {req.status === 'COMPLETED' && (
                            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-emerald-950/40 border border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.15)] space-y-3 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-500/30">
                                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                                  <ShieldCheck size={18} className="text-emerald-400" />
                                  <span>Repair Service Completed &amp; Device Released</span>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                  <CheckCircle2 size={12} /> Status: COMPLETED
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] font-mono">
                                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
                                  <span className="text-slate-500 font-sans block text-[10px] uppercase font-bold">Device Claimed &amp; Released To:</span>
                                  <strong className="text-emerald-300 block text-xs truncate">
                                    {req.deviceReleasedTo || req.completion?.deviceReleasedTo || req.clientName}
                                  </strong>
                                </div>
                                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
                                  <span className="text-slate-500 font-sans block text-[10px] uppercase font-bold">Handover Timestamp:</span>
                                  <strong className="text-slate-200 block text-xs">
                                    {(req.completedAt || req.completion?.completedAt)
                                      ? new Date(req.completedAt || req.completion!.completedAt!).toLocaleString()
                                      : new Date().toLocaleString()}
                                  </strong>
                                </div>
                                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
                                  <span className="text-slate-500 font-sans block text-[10px] uppercase font-bold">Settlement Status:</span>
                                  <strong className="text-emerald-400 block text-xs">
                                    {req.billing?.settlementDate
                                      ? `Settled (${new Date(req.billing.settlementDate).toLocaleDateString()})`
                                      : 'Paid in Full'}
                                  </strong>
                                </div>
                              </div>

                              <div className="flex items-center justify-end pt-2 border-t border-emerald-500/20">
                                <button
                                  type="button"
                                  onClick={() => setCustomerReceiptModalTarget(req)}
                                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-glow-emerald flex items-center gap-1.5"
                                >
                                  <Receipt size={14} />
                                  <span>View Official Release Receipt</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* C. Cancelled Audit Banner */}
                          {req.status === 'CANCELLED' && (
                            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-2 text-xs">
                              <div className="flex items-center justify-between pb-2 border-b border-rose-500/20">
                                <span className="font-bold text-rose-300">Cancellation Record Details:</span>
                                <span className="text-[11px] font-mono text-slate-400">
                                  {req.cancellation?.cancelledAt ? new Date(req.cancellation.cancelledAt).toLocaleString() : 'Cancelled'}
                                </span>
                              </div>
                              <div className="space-y-1 text-[11px]">
                                <p className="text-slate-300">
                                  <strong className="text-rose-200 font-sans">Reason:</strong> {req.cancellation?.reason || 'Repair Request Cancelled'}
                                </p>
                                {req.cancellation?.description && (
                                  <p className="text-slate-400 font-mono">
                                    <strong className="text-slate-300 font-sans">Remarks:</strong> {req.cancellation.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* D. Appointment, Schedule & Location Banner */}
                          {(() => {
                            const isEvaluationStage = ['RECEIVED', 'PENDING_EVALUATION', 'UNDER_EVALUATION', 'EVALUATED'].includes(req.status);
                            const hasTechnicianDate = Boolean(req.evaluation?.confirmedDate && req.evaluation.confirmedDate.trim());
                            const hasTechnicianTime = Boolean(req.evaluation?.confirmedTime && req.evaluation.confirmedTime.trim());
                            const hasTechnicianLocation = Boolean(
                              (req.evaluation?.confirmedLocation && req.evaluation.confirmedLocation.trim()) ||
                              (req.pickupLocation && req.pickupLocation.trim())
                            );
                            const isConfirmedOrder = !isEvaluationStage && req.status !== 'CANCELLED';

                            // Timezone-safe local date formatting
                            const formatDisplayDate = (dateStr?: string) => {
                              if (!dateStr) return '';
                              try {
                                if (dateStr.includes('-')) {
                                  const parts = dateStr.split('T')[0].split('-');
                                  if (parts.length === 3) {
                                    const y = parseInt(parts[0], 10);
                                    const m = parseInt(parts[1], 10) - 1;
                                    const d = parseInt(parts[2], 10);
                                    return new Date(y, m, d).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    });
                                  }
                                }
                                return new Date(dateStr).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                });
                              } catch {
                                return dateStr;
                              }
                            };

                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                {/* Appointment & Schedule */}
                                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase font-mono flex items-center gap-1.5">
                                      <Calendar size={13} className="text-indigo-400" />
                                      Appointment &amp; Service Schedule:
                                    </span>
                                    {isConfirmedOrder && hasTechnicianDate ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                        Confirmed
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                        Pending
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[11px] text-slate-300 space-y-1.5 font-mono">
                                    <div className="flex justify-between items-center">
                                      <span className="text-slate-400 font-sans">Scheduled Date:</span>
                                      {isConfirmedOrder && hasTechnicianDate ? (
                                        <strong className="text-slate-100">
                                          {formatDisplayDate(req.evaluation!.confirmedDate)}
                                        </strong>
                                      ) : (
                                        <span className="text-amber-400 font-sans font-medium flex items-center gap-1">
                                          <Clock size={11} /> Pending Confirmation
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex justify-between items-center">
                                      <span className="text-slate-400 font-sans">Service Time Window:</span>
                                      {isConfirmedOrder && hasTechnicianTime ? (
                                        <span className="text-slate-200 font-medium">
                                          {req.evaluation!.confirmedTime}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 font-sans italic">
                                          To be scheduled by technician
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Repair / Counter Location */}
                                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase font-mono flex items-center gap-1.5">
                                      <MapPin size={13} className="text-emerald-400" />
                                      Assigned Lab / Service Counter:
                                    </span>
                                    {isConfirmedOrder && hasTechnicianLocation ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                        Assigned
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                        Pending
                                      </span>
                                    )}
                                  </div>

                                  {isConfirmedOrder && hasTechnicianLocation ? (
                                    <div>
                                      <p className="text-slate-200 font-semibold text-xs leading-relaxed">
                                        {req.evaluation?.confirmedLocation || req.pickupLocation}
                                      </p>
                                      <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
                                        Campus Hardware Diagnostics &amp; Embedded Systems Facility
                                      </span>
                                    </div>
                                  ) : (
                                    <div>
                                      <p className="text-amber-300/90 font-medium text-xs leading-relaxed flex items-center gap-1.5">
                                        <Clock size={12} className="text-amber-400" />
                                        Pending Counter / Room Assignment
                                      </p>
                                      <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
                                        Designated bench / room will be assigned once technician confirms the job order
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {/* E. Dedicated Billing & Invoice Overview */}
                          {req.billing?.totalAmount !== undefined && req.billing.totalAmount > 0 && (
                            <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-2.5 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                                <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
                                  <CreditCard size={15} className="text-emerald-400" />
                                  <span>Billing &amp; Invoice Specification</span>
                                </div>

                                <div className="flex items-center gap-2 font-mono text-[11px]">
                                  {req.billing.paymentStatus === 'PAID' ? (
                                    <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                      <CheckCircle2 size={11} /> PAID IN FULL
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                      <Clock size={11} /> UNPAID ({req.billing.paymentTiming === 'PAY_NOW' ? 'Pay Now Pending' : 'Pay After Repair'})
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                                  <span className="text-slate-500 font-sans block text-[10px]">Total Billed Cost:</span>
                                  <strong className="text-emerald-400 font-bold text-sm block">
                                    ₱{req.billing.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </strong>
                                </div>

                                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                                  <span className="text-slate-500 font-sans block text-[10px]">Payment Method:</span>
                                  <strong className="text-slate-200 text-xs block">
                                    {req.billing.paymentMethod || (req.billing.paymentTiming === 'PAY_NOW' ? 'Cash' : 'At Pickup Counter')}
                                  </strong>
                                </div>

                                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                                  <span className="text-slate-500 font-sans block text-[10px]">Settlement / Trace:</span>
                                  <strong className="text-slate-300 text-xs block truncate">
                                    {req.billing.onlinePaymentReference
                                      ? `Ref: ${req.billing.onlinePaymentReference}`
                                      : req.billing.paymentStatus === 'PAID'
                                      ? 'Cash Settled'
                                      : 'Pending Settlement'}
                                  </strong>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                                <span className="text-slate-400">
                                  Official invoice record linked to this Job Order.
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setCustomerInvoiceModalTarget(req)}
                                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                                >
                                  <FileText size={13} />
                                  <span>View Invoice Breakdown</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* F. Specs & Reported Issue Box */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
                            <div className="md:col-span-4 space-y-1">
                              <span className="text-slate-500 block font-mono text-[10px] uppercase font-bold">OS &amp; Specifications</span>
                              <p className="text-slate-300 font-mono text-[11px] leading-relaxed">{req.osSpecs || 'N/A'}</p>
                            </div>

                            <div className="md:col-span-8 space-y-1">
                              <span className="text-slate-500 block font-mono text-[10px] uppercase font-bold">Primary Reported Complaint</span>
                              <p className="text-slate-200 font-medium leading-relaxed">{req.reportedIssue}</p>
                            </div>
                          </div>

                          {/* G. Physical Condition Badges */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-[11px] text-slate-500 font-mono uppercase font-bold">Pre-Intake Checklist:</span>
                            {req.inspectionNotes.scratchesDents && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                Chassis Scratches/Dents
                              </span>
                            )}
                            {req.inspectionNotes.missingScrewsFeet && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                Missing Screws/Feet
                              </span>
                            )}
                            {req.inspectionNotes.screenDamageDeadPixels && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                Screen/Pixel Faults
                              </span>
                            )}
                            {req.inspectionNotes.liquidDamageIndicators && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                Liquid Contact Indicator Tripped
                              </span>
                            )}
                            {!req.inspectionNotes.scratchesDents &&
                              !req.inspectionNotes.missingScrewsFeet &&
                              !req.inspectionNotes.screenDamageDeadPixels &&
                              !req.inspectionNotes.liquidDamageIndicators && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                  Pristine Physical Condition
                                </span>
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CUSTOMER INVOICE BREAKDOWN MODAL ── */}
      {customerInvoiceModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl my-8 rounded-2xl bg-slate-900 border border-emerald-500/40 shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Official Invoice Breakdown</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Job Order: <span className="text-cyan-300 font-bold">{customerInvoiceModalTarget.id}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomerInvoiceModalTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Device Details */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Device Model:</span>
                  <strong className="text-slate-200">{customerInvoiceModalTarget.deviceModel}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Serial Number:</span>
                  <span className="text-cyan-300">{customerInvoiceModalTarget.serialNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Client:</span>
                  <span className="text-slate-200">{customerInvoiceModalTarget.clientName}</span>
                </div>
              </div>

              {/* Billing Itemization */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase font-mono block">
                  Service Work Scope:
                </span>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <strong className="text-slate-200 block">Diagnostics &amp; Repair Servicing</strong>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {customerInvoiceModalTarget.partsReplaced || customerInvoiceModalTarget.reportedIssue}
                    </span>
                  </div>
                  <strong className="text-emerald-400 font-mono text-sm">
                    ₱{(customerInvoiceModalTarget.billing?.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              {/* Settlement Summary */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-sans block text-[10px]">Payment Status:</span>
                  <strong className={customerInvoiceModalTarget.billing?.paymentStatus === 'PAID' ? 'text-emerald-400' : 'text-amber-400'}>
                    {customerInvoiceModalTarget.billing?.paymentStatus === 'PAID' ? 'PAID IN FULL' : 'UNPAID'}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-sans block text-[10px]">Payment Method:</span>
                  <strong className="text-slate-200">
                    {customerInvoiceModalTarget.billing?.paymentMethod || (customerInvoiceModalTarget.billing?.paymentTiming === 'PAY_NOW' ? 'Cash' : 'At Pickup Counter')}
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCustomerInvoiceModalTarget(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOMER RELEASE RECEIPT MODAL ── */}
      {customerReceiptModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl my-8 rounded-2xl bg-slate-900 border border-emerald-500/50 shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Official Device Release Receipt</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Job Order: <span className="text-cyan-300 font-bold">{customerReceiptModalTarget.id}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Printer size={13} className="text-emerald-400" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerReceiptModalTarget(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Status Header */}
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="font-semibold">Device Released &amp; Handover Completed</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PAID IN FULL
                </span>
              </div>

              {/* Handover & Particulars */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Device Released To:</span>
                  <strong className="text-emerald-300 font-sans font-bold">
                    {customerReceiptModalTarget.deviceReleasedTo || customerReceiptModalTarget.completion?.deviceReleasedTo || customerReceiptModalTarget.clientName}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Handover Date:</span>
                  <span className="text-slate-200">
                    {(customerReceiptModalTarget.completedAt || customerReceiptModalTarget.completion?.completedAt)
                      ? new Date(customerReceiptModalTarget.completedAt || customerReceiptModalTarget.completion!.completedAt!).toLocaleString()
                      : new Date().toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Device Model:</span>
                  <strong className="text-slate-200">{customerReceiptModalTarget.deviceModel}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Serial Number:</span>
                  <span className="text-cyan-300">{customerReceiptModalTarget.serialNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Total Amount Settled:</span>
                  <strong className="text-emerald-400 text-sm font-bold">
                    ₱{(customerReceiptModalTarget.billing?.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCustomerReceiptModalTarget(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-glow-emerald"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
