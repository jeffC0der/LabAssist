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
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
  Tag,
  Check,
  ArrowRight,
  Printer,
  Edit3,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRepairs } from '@/context/RepairContext';

export type RepairJobStatus =
  | 'RECEIVED'
  | 'IN_DIAGNOSTICS'
  | 'REPAIR_IN_PROGRESS'
  | 'AWAITING_PARTS'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED';

export interface RepairJobCard {
  id: string;
  clientName: string;
  clientEmail: string;
  deviceType: 'Laptop' | 'Desktop';
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
  additionalInspectionNotes?: string;
  status: RepairJobStatus;
  technicianAssigned?: string;
  technicianNotes?: string;
  partsReplaced?: string;
  intakeDate: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

const INITIAL_JOB_CARDS: RepairJobCard[] = [
  {
    id: '01-LP-2026-0928',
    clientName: 'Marcus Vance',
    clientEmail: 'marcus.vance@umak.edu.ph',
    deviceType: 'Laptop',
    deviceModel: 'Lenovo Legion 5 15ARH05',
    serialNumber: 'PF2X9Y8Z',
    osSpecs: 'Windows 11 Home | Ryzen 5 7535HS | 16GB RAM | RTX 3050',
    reportedIssue: 'Spilled coffee on keyboard and trackpad; spacebar sticky and no display output on external HDMI port.',
    inspectionNotes: {
      scratchesDents: true,
      missingScrewsFeet: false,
      screenDamageDeadPixels: false,
      liquidDamageIndicators: true,
    },
    additionalInspectionNotes: 'Liquid residue visible near top-right palm rest. OEM 230W power brick included with unit.',
    status: 'IN_DIAGNOSTICS',
    technicianAssigned: 'Tech. Alex Torres',
    technicianNotes: 'Ultrasonic board wash completed for daughterboard. Testing HDMI IC solder pads under microscope.',
    partsReplaced: 'Keyboard membrane assembly ordered (P/N: 5CB0Z21516)',
    intakeDate: 'Today, 09:30 AM',
    priority: 'HIGH',
  },
  {
    id: '02-PC-2026-0928',
    clientName: 'Alyssa Gomez',
    clientEmail: 'alyssa.gomez@umak.edu.ph',
    deviceType: 'Desktop',
    deviceModel: 'Dell OptiPlex 7080 Micro Tower',
    serialNumber: 'DL7080-99X4',
    osSpecs: 'Windows 11 Pro | Intel Core i7-10700 | 32GB RAM | 512GB NVMe SSD',
    reportedIssue: 'Continuous 3 amber + 2 white power LED diagnostic code on boot. Fans spin up then immediately shut down.',
    inspectionNotes: {
      scratchesDents: false,
      missingScrewsFeet: true,
      screenDamageDeadPixels: false,
      liquidDamageIndicators: false,
    },
    additionalInspectionNotes: 'Two rear chassis thumb screws missing. Internal dust buildup in CPU cooler.',
    status: 'REPAIR_IN_PROGRESS',
    technicianAssigned: 'Tech. Alex Torres',
    technicianNotes: 'Reseated DIMM slot 2. Re-applied Arctic MX-4 thermal paste. Testing 24hr MemTest86 run.',
    partsReplaced: 'CMOS CR2032 battery replaced',
    intakeDate: 'Yesterday, 02:15 PM',
    priority: 'MEDIUM',
  },
  {
    id: '03-LP-2026-0928',
    clientName: 'Daniel Bautista',
    clientEmail: 'daniel.bautista@umak.edu.ph',
    deviceType: 'Laptop',
    deviceModel: 'ASUS ROG Zephyrus G14 GA402RJ',
    serialNumber: 'G14-8841Z',
    osSpecs: 'Windows 11 Home | Ryzen 9 6900HS | 16GB DDR5 | Radeon RX 6700S',
    reportedIssue: 'Overheating and thermal throttling under CAD workloads. CPU temps reach 96°C within 3 minutes of rendering.',
    inspectionNotes: {
      scratchesDents: true,
      missingScrewsFeet: false,
      screenDamageDeadPixels: false,
      liquidDamageIndicators: false,
    },
    additionalInspectionNotes: 'Chassis rubber feet intact. Minor scuff on anodized top lid.',
    status: 'READY_FOR_PICKUP',
    technicianAssigned: 'Tech. Maria Santos',
    technicianNotes: 'Liquid metal repasted on vapor chamber. Fan intake grills de-dusted. Stress test stable at 78°C under sustained load.',
    partsReplaced: 'Thermal Grizzly Conductonaut liquid metal',
    intakeDate: 'Sep 26, 11:00 AM',
    priority: 'LOW',
  },
  {
    id: '04-PC-2026-0928',
    clientName: 'Kristine Reyes',
    clientEmail: 'kristine.reyes@umak.edu.ph',
    deviceType: 'Desktop',
    deviceModel: 'Custom Engineering Workstation (Fractal Node 202)',
    serialNumber: 'ENG-LAB-CUST-04',
    osSpecs: 'Ubuntu 22.04 LTS | Ryzen 7 5800X3D | 64GB ECC RAM | RTX 4070',
    reportedIssue: 'GPU PCIe slot sagging caused intermittent PCIe x16 link disconnection, causing kernel panic during CUDA training.',
    inspectionNotes: {
      scratchesDents: false,
      missingScrewsFeet: false,
      screenDamageDeadPixels: false,
      liquidDamageIndicators: false,
    },
    additionalInspectionNotes: 'Custom dual-slot GPU anti-sag bracket requested.',
    status: 'AWAITING_PARTS',
    technicianAssigned: 'Tech. Alex Torres',
    technicianNotes: 'PCIe slot pins inspected with endoscope. Sourcing heavy-duty PCIe riser and CNC aluminum support pillar.',
    intakeDate: 'Sep 27, 04:45 PM',
    priority: 'HIGH',
  },
];

export default function TechnicianRepairsWorkbench() {
  const { user } = useAuth();
  const toast = useToast();
  const { repairs: dbRepairs, updateRepair, isLoading: repairsLoading } = useRepairs();

  // Map database repairs to local RepairJobCard type
  const jobCards: RepairJobCard[] = dbRepairs.map((r) => ({
    id: r.id,
    clientName: r.clientName,
    clientEmail: r.clientEmail,
    deviceType: r.deviceType as 'Laptop' | 'Desktop',
    deviceModel: r.deviceModel,
    serialNumber: r.serialNumber,
    osSpecs: r.osSpecs,
    reportedIssue: r.reportedIssue,
    inspectionNotes: r.inspectionNotes,
    additionalInspectionNotes: r.additionalInspectionNotes,
    status: r.status as RepairJobStatus,
    technicianAssigned: r.technicianAssigned,
    technicianNotes: r.technicianNotes,
    partsReplaced: r.partsReplaced,
    intakeDate: r.intakeDate ? new Date(r.intakeDate).toLocaleString() : 'Unknown',
    priority: r.priority,
  }));

  const [deviceFilter, setDeviceFilter] = useState<'ALL' | 'PC' | 'Laptop'>('ALL');
  const [statusFilter, setStatusFilter] = useState<RepairJobStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(jobCards.length > 0 ? jobCards[0]?.id : null);

  // Technician Note editing state
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [techNoteDraft, setTechNoteDraft] = useState<string>('');

  // Filtered Cards
  const filteredJobs = jobCards.filter((job) => {
    // Quick Device Filter
    if (deviceFilter === 'Laptop' && job.deviceType !== 'Laptop') return false;
    if (deviceFilter === 'PC' && job.deviceType !== 'Desktop') return false;

    // Status Filter
    if (statusFilter !== 'ALL' && job.status !== statusFilter) return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = `${job.id} ${job.clientName} ${job.clientEmail} ${job.deviceModel} ${job.serialNumber} ${job.reportedIssue}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }

    return true;
  });

  const laptopCount = jobCards.filter((j) => j.deviceType === 'Laptop').length;
  const pcCount = jobCards.filter((j) => j.deviceType === 'Desktop').length;

  const handleUpdateStatus = async (jobId: string, newStatus: RepairJobStatus) => {
    const success = await updateRepair(jobId, { status: newStatus });
    if (success) {
      toast.success('Status Updated', `Job card ${jobId} moved to ${newStatus.replace(/_/g, ' ')}.`);
    } else {
      toast.error('Update Failed', `Could not update status for ${jobId}.`);
    }
  };

  const handleSaveTechNote = async (jobId: string) => {
    if (!techNoteDraft.trim()) return;
    const techName = user?.name || 'Assigned Field Tech';
    const success = await updateRepair(jobId, {
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

  const getStatusBadge = (status: RepairJobStatus) => {
    switch (status) {
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            Received
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
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-purple-950/60 border border-indigo-500/20 shadow-card">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
            <Wrench size={14} className="text-indigo-400" />
            <span>Technician Repairs & Diagnostic Intake Workbench</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight">
            Device Repair Job Cards
          </h2>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-800 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-emerald-400 font-bold">{filteredJobs.length} Active Job Cards</span>
        </div>
      </div>

      {/* ── Quick Filters Bar (PC / Laptop / All) & Search ───────── */}
      <div className="glass rounded-2xl p-4 border border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-card">
        {/* Quick Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono uppercase text-slate-400 font-bold mr-1 flex items-center gap-1.5">
            <Filter size={13} />
            Quick Filters:
          </span>

          {/* ALL */}
          <button
            type="button"
            onClick={() => setDeviceFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${deviceFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-glow-indigo'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
          >
            <span>All Devices</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{jobCards.length}</span>
          </button>

          {/* PC */}
          <button
            type="button"
            onClick={() => setDeviceFilter('PC')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${deviceFilter === 'PC'
                ? 'bg-cyan-600 text-white shadow-glow-cyan'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
          >
            <Monitor size={14} />
            <span>PC / Desktop</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{pcCount}</span>
          </button>

          {/* Laptop */}
          <button
            type="button"
            onClick={() => setDeviceFilter('Laptop')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${deviceFilter === 'Laptop'
                ? 'bg-violet-600 text-white shadow-glow-indigo'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
          >
            <Laptop size={14} />
            <span>Laptop</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{laptopCount}</span>
          </button>
        </div>

        {/* Search Input & Status Filter Dropdown */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search RMA, model, client..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-indigo-500 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all font-mono"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/90 text-slate-200 border border-slate-800 focus:border-indigo-500 outline-none cursor-pointer"
            aria-label="Filter by Repair Status"
          >
            <option value="ALL">All Statuses</option>
            <option value="RECEIVED">Received</option>
            <option value="IN_DIAGNOSTICS">In Diagnostics</option>
            <option value="REPAIR_IN_PROGRESS">Repair In Progress</option>
            <option value="AWAITING_PARTS">Awaiting Parts</option>
            <option value="READY_FOR_PICKUP">Ready for Pickup</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* ── Job Cards List (Matching Client Intake Profile Layout) ─── */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center border border-slate-800/80 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
              <Wrench size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-200">No Repair Job Cards Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No active intake repairs match your current filter selection. Try clearing your search query or toggling device filters.
            </p>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const isExpanded = expandedJobId === job.id;

            return (
              <div
                key={job.id}
                className={`glass rounded-2xl border transition-all duration-200 overflow-hidden shadow-card ${isExpanded ? 'border-indigo-500/50 bg-slate-900/90 ring-1 ring-indigo-500/20' : 'border-slate-800/80 hover:border-slate-700'
                  }`}
              >
                {/* ── 1. Client & Device Intake Profile (Header Card) ── */}
                <div
                  onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                  className="p-5 cursor-pointer hover:bg-slate-800/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 select-none"
                >
                  {/* Left: Device & RMA identifier */}
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${job.deviceType === 'Laptop'
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

                      {/* Client info preview */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                        <span className="text-slate-300 flex items-center gap-1 font-sans">
                          <User size={12} className="text-slate-500" />
                          {job.clientName}
                        </span>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-400 flex items-center gap-1">
                          <Mail size={12} className="text-slate-500" />
                          {job.clientEmail}
                        </span>
                        <span className="text-slate-500">·</span>
                        <span className="text-cyan-400 flex items-center gap-1">
                          <Hash size={12} className="text-slate-500" />
                          S/N: {job.serialNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Status badge, intake timestamp, and expand toggle */}
                  <div className="flex items-center gap-3 self-end md:self-center">
                    <div className="text-right hidden sm:block">
                      <span className="text-[11px] text-slate-500 block font-mono">Intake Date</span>
                      <span className="text-xs text-slate-300 font-medium">{job.intakeDate}</span>
                    </div>

                    <div>{getStatusBadge(job.status)}</div>

                    <div className="p-1 rounded-lg bg-slate-800 text-slate-400">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* ── Expanded Job Card Content (Pre-Diagnostic + Tech Workbench) ── */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 space-y-6 bg-slate-950/40 animate-fade-in">
                    {/* Device Metadata Detailed Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* OS & Internal Hardware Specs */}
                      <div className="md:col-span-4 p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
                        <span className="text-[11px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                          <Cpu size={13} className="text-indigo-400" />
                          OS & Internal Hardware Specs
                        </span>
                        <p className="text-xs text-slate-200 font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                          {job.osSpecs}
                        </p>
                      </div>

                      {/* Primary Reported Issue */}
                      <div className="md:col-span-8 p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
                        <span className="text-[11px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                          <AlertTriangle size={13} className="text-rose-400" />
                          Reported Issue (Primary Owner Complaint)
                        </span>
                        <p className="text-xs text-slate-200 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed font-medium">
                          {job.reportedIssue}
                        </p>
                      </div>
                    </div>

                    {/* ── 2. Physical & Pre-Diagnostic Intake Inspection ── */}
                    <div className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                        <span className="text-xs font-mono uppercase text-slate-300 font-bold flex items-center gap-1.5">
                          <ShieldCheck size={14} className="text-amber-400" />
                          2. Physical & Pre-Diagnostic Intake Inspection Checklist
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">Pre-Intake Dispute Protection</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                        {/* 1. Scratches / Dents on Chassis */}
                        <div
                          className={`p-3 rounded-lg border flex items-center gap-2.5 text-xs ${job.inspectionNotes.scratchesDents
                              ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                              : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
                            }`}
                        >
                          {job.inspectionNotes.scratchesDents ? (
                            <CheckSquare size={16} className="text-amber-400 flex-shrink-0" />
                          ) : (
                            <Square size={16} className="text-slate-600 flex-shrink-0" />
                          )}
                          <span className="font-semibold">Scratches / Dents on Chassis</span>
                        </div>

                        {/* 2. Missing Screws / Rubber Feet */}
                        <div
                          className={`p-3 rounded-lg border flex items-center gap-2.5 text-xs ${job.inspectionNotes.missingScrewsFeet
                              ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                              : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
                            }`}
                        >
                          {job.inspectionNotes.missingScrewsFeet ? (
                            <CheckSquare size={16} className="text-amber-400 flex-shrink-0" />
                          ) : (
                            <Square size={16} className="text-slate-600 flex-shrink-0" />
                          )}
                          <span className="font-semibold">Missing Screws / Rubber Feet</span>
                        </div>

                        {/* 3. Screen Damage / Dead Pixels */}
                        <div
                          className={`p-3 rounded-lg border flex items-center gap-2.5 text-xs ${job.inspectionNotes.screenDamageDeadPixels
                              ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                              : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
                            }`}
                        >
                          {job.inspectionNotes.screenDamageDeadPixels ? (
                            <CheckSquare size={16} className="text-amber-400 flex-shrink-0" />
                          ) : (
                            <Square size={16} className="text-slate-600 flex-shrink-0" />
                          )}
                          <span className="font-semibold">Screen Damage / Dead Pixels</span>
                        </div>

                        {/* 4. Water / Liquid Damage Indicators */}
                        <div
                          className={`p-3 rounded-lg border flex items-center gap-2.5 text-xs ${job.inspectionNotes.liquidDamageIndicators
                              ? 'bg-rose-950/30 border-rose-500/50 text-rose-200'
                              : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
                            }`}
                        >
                          {job.inspectionNotes.liquidDamageIndicators ? (
                            <CheckSquare size={16} className="text-rose-400 flex-shrink-0" />
                          ) : (
                            <Square size={16} className="text-slate-600 flex-shrink-0" />
                          )}
                          <span className="font-semibold">Water / Liquid Damage</span>
                        </div>
                      </div>

                      {job.additionalInspectionNotes && (
                        <p className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/70 font-mono">
                          <span className="text-amber-300 font-bold mr-1">Remarks & Accessories:</span>
                          {job.additionalInspectionNotes}
                        </p>
                      )}
                    </div>

                    {/* ── 3. Technician Diagnostics & Action Workbench ── */}
                    <div className="p-4 sm:p-5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-500/20">
                        <span className="text-xs font-mono uppercase text-indigo-300 font-bold flex items-center gap-1.5">
                          <Wrench size={14} className="text-indigo-400" />
                          Technician Diagnostic Actions & Workbench
                        </span>

                        <span className="text-xs text-slate-400 font-mono">
                          Assigned: <strong className="text-slate-200">{job.technicianAssigned || 'Unassigned'}</strong>
                        </span>
                      </div>

                      {/* Diagnostic Log Notes & Parts */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-semibold">Diagnostic Findings & Actions:</span>
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
                                rows={3}
                                value={techNoteDraft}
                                onChange={(e) => setTechNoteDraft(e.target.value)}
                                placeholder="Write diagnostic findings, component test logs, and bench repairs..."
                                className="w-full p-2.5 rounded-lg bg-slate-900 border border-indigo-500 focus:outline-none text-xs text-slate-100 placeholder-slate-500 resize-none font-mono"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveTechNote(job.id)}
                                  className="py-1 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                                >
                                  Save Note
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
                            <p className="text-slate-200 bg-slate-900/80 p-3 rounded-lg border border-slate-800 leading-relaxed font-mono">
                              {job.technicianNotes || 'No diagnostic notes written yet. Click Edit Note to log repair progress.'}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-slate-400 font-semibold block">Component Parts Sourced / Replaced:</span>
                          <p className="text-slate-200 bg-slate-900/80 p-3 rounded-lg border border-slate-800 leading-relaxed font-mono">
                            {job.partsReplaced || 'No replacement components logged for this job card.'}
                          </p>
                        </div>
                      </div>

                      {/* Status Update Quick Triggers */}
                      <div className="pt-2 border-t border-indigo-500/20 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-[11px] font-mono text-slate-400 uppercase">Set Job Status:</span>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(job.id, 'IN_DIAGNOSTICS')}
                            className="py-1.5 px-3 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-all"
                          >
                            In Diagnostics
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(job.id, 'REPAIR_IN_PROGRESS')}
                            className="py-1.5 px-3 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-all"
                          >
                            Repair In Progress
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(job.id, 'AWAITING_PARTS')}
                            className="py-1.5 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all"
                          >
                            Awaiting Parts
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(job.id, 'READY_FOR_PICKUP')}
                            className="py-1.5 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all"
                          >
                            Ready for Pickup
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(job.id, 'COMPLETED')}
                            className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-glow-indigo"
                          >
                            Mark Complete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
