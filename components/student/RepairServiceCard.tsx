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
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRepairs } from '@/context/RepairContext';
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
  status: 'RECEIVED' | 'IN_DIAGNOSTICS' | 'AWAITING_PARTS' | 'READY_FOR_PICKUP';
  submittedAt: string;
  estimatedCompletion: string;
  confirmationDate?: string;
}

const COMMON_ISSUES = [
  'No display output on boot',
  'Overheating & thermal shutdown while gaming',
  'Spilled liquid on keyboard & trackpad',
  'BSOD (Blue Screen) crash on startup',
  'Battery not charging / DC jack loose',
  'Intermittent Wi-Fi & Bluetooth dropouts',
];

const INITIAL_REPAIR_REQUESTS: RepairIntakeRequest[] = [
  {
    id: 'RMA-8921-UMAK',
    clientName: 'Marcus Vance',
    clientEmail: 'marcus.vance@umak.edu.ph',
    deviceType: 'Laptop',
    deviceModel: 'Lenovo Legion 5 15ARH05',
    serialNumber: 'PF2X9Y8Z',
    osSpecs: 'Windows 11 Home | Ryzen 5 7535HS | 16GB RAM | RTX 3050',
    reportedIssue: 'Spilled coffee on keyboard and trackpad; spacebar sticky and no display on external HDMI.',
    inspectionNotes: {
      scratchesDents: true,
      missingScrewsFeet: false,
      screenDamageDeadPixels: false,
      liquidDamageIndicators: true,
    },
    additionalInspectionNotes: 'Sticky residue around top right palm rest. Chassis has minor scuff on bottom left hinge.',
    status: 'IN_DIAGNOSTICS',
    submittedAt: 'Today at 09:30 AM',
    estimatedCompletion: 'Tomorrow, 4:00 PM',
  },
];

function getStatusBadge(status: string) {
  switch (status) {
    case 'RECEIVED':
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          <span>Received</span>
        </span>
      );
    case 'IN_DIAGNOSTICS':
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>In Diagnostics</span>
        </span>
      );
    case 'REPAIR_IN_PROGRESS':
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          <span>Repair In Progress</span>
        </span>
      );
    case 'AWAITING_PARTS':
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>Awaiting Parts</span>
        </span>
      );
    case 'READY_FOR_PICKUP':
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Ready for Pickup</span>
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white border border-emerald-500/50 flex items-center gap-1.5 shadow-glow-indigo">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          <span>Completed</span>
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

  // Submissions State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [latestReceipt, setLatestReceipt] = useState<RepairIntakeRequest | null>(null);

  // Map database repairs to local display type
  const repairs: RepairIntakeRequest[] = dbRepairs.map((r) => ({
    id: r.id,
    clientName: r.clientName,
    clientEmail: r.clientEmail,
    deviceType: r.deviceType as 'Laptop' | 'Desktop' | 'Other',
    deviceModel: r.deviceModel,
    serialNumber: r.serialNumber,
    osSpecs: r.osSpecs,
    reportedIssue: r.reportedIssue,
    inspectionNotes: r.inspectionNotes,
    additionalInspectionNotes: r.additionalInspectionNotes,
    status: r.status as any,
    submittedAt: r.intakeDate ? new Date(r.intakeDate).toLocaleString() : 'Unknown',
    estimatedCompletion: r.estimatedCompletion || 'TBD',
  }));

  // Filtered and sorted repair logs
  const filteredRepairs = repairs
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
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }
      if (sortBy === 'OLDEST') {
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
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
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }) + ' | ' + now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      setLatestReceipt({
        id: result.id,
        clientName: result.clientName,
        clientEmail: result.clientEmail,
        deviceType: result.deviceType as any,
        deviceModel: result.deviceModel,
        serialNumber: result.serialNumber,
        osSpecs: result.osSpecs,
        reportedIssue: result.reportedIssue,
        inspectionNotes: result.inspectionNotes,
        additionalInspectionNotes: result.additionalInspectionNotes,
        status: 'RECEIVED',
        submittedAt: 'Just now',
        estimatedCompletion: 'Within 24–48 hours',
        confirmationDate: formattedDate,
      });

      toast.success(
        'Intake Confirmed & Receipt Dispatched!',
        `Job Order No: ${result.id}. An official intake receipt has been sent to ${result.clientEmail} via Brevo.`
      );
      resetForm();
      setActiveSubTab('ACTIVE_REPAIRS');
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
              {repairs.length}
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
          {latestReceipt && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/95 to-slate-950 border border-violet-500/30 text-slate-100 space-y-5 animate-scale-up shadow-2xl">
              {/* Receipt Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <span>Device Repair Intake Receipt</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium flex items-center gap-1">
                        <Mail size={10} /> Dispatched via Brevo
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Receipt sent to <span className="text-slate-200 font-semibold">{latestReceipt.clientEmail}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-violet-500/20 text-violet-300 border border-violet-500/40">
                    Status: Received
                  </span>
                </div>
              </div>

              {/* Receipt Key Info: Name, Job Order No, Confirmation Date */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 block">Name</span>
                  <span className="text-sm text-slate-100 font-bold">{latestReceipt.clientName}</span>
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-violet-400 block">Job Order No</span>
                  <span className="text-sm font-mono font-extrabold text-violet-300">{latestReceipt.id}</span>
                  <span className="text-[10px] text-slate-500 block font-mono">Queue - Type - YYYY - MMDD</span>
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 block">Confirmation Date</span>
                  <span className="text-xs text-slate-200 font-medium">{latestReceipt.confirmationDate || latestReceipt.submittedAt}</span>
                </div>
              </div>

              {/* Device Details Box */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Laptop size={14} className="text-violet-400" />
                  <span>Device Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Device Type</span>
                    <span className="text-slate-200 font-semibold">{latestReceipt.deviceType}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Model</span>
                    <span className="text-slate-200 font-semibold">{latestReceipt.deviceModel}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Serial Number / Tag</span>
                    <span className="text-cyan-300 font-mono font-bold">{latestReceipt.serialNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Specs</span>
                    <span className="text-slate-300">{latestReceipt.osSpecs || 'N/A'}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800/60 text-xs">
                  <span className="text-slate-500 block mb-0.5">Reported Issue</span>
                  <span className="text-amber-300 font-medium">{latestReceipt.reportedIssue}</span>
                </div>
              </div>

              {/* Inspection Notes Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <span className="text-slate-500 font-medium block">Physical Condition Notes</span>
                  <div className="text-slate-200 font-medium">
                    {(() => {
                      const notes: string[] = [];
                      if (latestReceipt.inspectionNotes?.scratchesDents) notes.push('Scratches / Dents');
                      if (latestReceipt.inspectionNotes?.missingScrewsFeet) notes.push('Missing Screws / Feet');
                      if (latestReceipt.inspectionNotes?.screenDamageDeadPixels) notes.push('Screen Damage / Dead Pixels');
                      if (latestReceipt.inspectionNotes?.liquidDamageIndicators) notes.push('Liquid Damage Indicators');
                      return notes.length > 0 ? notes.join(', ') : 'Clean physical condition (No defects flagged)';
                    })()}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <span className="text-slate-500 font-medium block">Additional Inspection Remarks</span>
                  <div className="text-slate-200 font-medium">
                    {latestReceipt.additionalInspectionNotes || 'None'}
                  </div>
                </div>
              </div>
            </div>
          )}

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

            {/* Repair Cards or Image 3 Empty State */}
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
                {filteredRepairs.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
                          {req.deviceType === 'Laptop' ? <Laptop size={16} /> : <Monitor size={16} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100 text-sm">{req.deviceModel}</span>
                            <span className="font-mono text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                              {req.id}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-mono">
                            S/N: {req.serialNumber} · {req.clientName} ({req.clientEmail})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {getStatusBadge(req.status)}
                      </div>
                    </div>

                    {/* Specs & Reported Issue Box */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
                      <div className="md:col-span-4 space-y-1">
                        <span className="text-slate-500 block font-mono text-[10px] uppercase">OS & Specifications</span>
                        <p className="text-slate-300 font-mono text-[11px]">{req.osSpecs || 'N/A'}</p>
                      </div>

                      <div className="md:col-span-8 space-y-1">
                        <span className="text-slate-500 block font-mono text-[10px] uppercase">Primary Reported Complaint</span>
                        <p className="text-slate-200 font-medium">{req.reportedIssue}</p>
                      </div>
                    </div>

                    {/* Physical Condition Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] text-slate-500 font-mono uppercase">Pre-Intake Checklist:</span>
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
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
