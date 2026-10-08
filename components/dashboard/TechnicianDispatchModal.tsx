'use client';
import React, { useState, useEffect } from 'react';
import { User, Wrench, Shield, CheckCircle2, AlertCircle, X, Sparkles, Loader2, HardDrive, Radio, Clock } from 'lucide-react';
import type { Ticket } from '@/lib/mockData';
import { getCategoryColors } from '@/lib/utils';
import type { AvailableTechnician } from '@/app/api/technicians/route';

interface TechnicianDispatchModalProps {
  ticket: Ticket;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDispatch: (ticketId: string, technicianName: string, dispatchNotes?: string) => Promise<void> | void;
}

export default function TechnicianDispatchModal({
  ticket,
  isOpen,
  onClose,
  onConfirmDispatch,
}: TechnicianDispatchModalProps) {
  const [technicians, setTechnicians] = useState<AvailableTechnician[]>([]);
  const [isLoadingTechs, setIsLoadingTechs] = useState<boolean>(true);
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [dispatchNote, setDispatchNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const catColors = getCategoryColors(ticket.category);

  // Fetch available technicians from API
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingTechs(true);

    fetch('/api/technicians', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const list: AvailableTechnician[] = data.technicians || [];
        setTechnicians(list);
        if (list.length > 0 && !selectedTechId) {
          // Default select the technician with the least active tickets
          const sorted = [...list].sort((a, b) => a.activeTickets - b.activeTickets);
          setSelectedTechId(sorted[0].id);
        }
      })
      .catch((err) => {
        console.warn('Error fetching technicians for dispatch modal:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingTechs(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedTechnician = technicians.find((t) => t.id === selectedTechId);

  const handleConfirm = async () => {
    if (!selectedTechnician) return;
    setIsSubmitting(true);
    try {
      await onConfirmDispatch(ticket.ticket_id, selectedTechnician.name, dispatchNote.trim());
      onClose();
    } catch (err) {
      console.error('Dispatch confirmation failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispatch-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-slate-900 border border-slate-700/90 rounded-2xl w-full max-w-lg shadow-2xl animate-scale-up overflow-hidden space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-glow-indigo">
              <Wrench size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="dispatch-modal-title" className="text-base font-bold text-slate-100">
                  Dispatch Field Technician
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  Live IT Roster
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Assign an on-duty technician to initiate hardware repair on {ticket.pc_num}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label="Close dispatch dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 space-y-4">
          {/* Target Ticket Mini Summary */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-indigo-400">{ticket.ticket_id}</span>
                <span className="text-slate-400">·</span>
                <span className="font-semibold text-slate-200">{ticket.lab_id}</span>
                <span className="text-slate-400">·</span>
                <span className="font-mono text-cyan-300 font-bold">{ticket.pc_num}</span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1">{ticket.description}</p>
            </div>
            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${catColors.bg} ${catColors.text} ${catColors.border} whitespace-nowrap ml-2`}>
              [{ticket.key}] {ticket.category}
            </span>
          </div>

          {/* Available Technicians List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <User size={13} className="text-indigo-400" />
                Select Available Technician from Database:
              </label>
              <span className="text-[10px] font-mono text-slate-500">
                {technicians.length} Technicians active
              </span>
            </div>

            {isLoadingTechs ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 size={22} className="animate-spin text-indigo-400" />
                <span className="text-xs font-medium">Querying IT technician registry...</span>
              </div>
            ) : technicians.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-center text-xs text-slate-400">
                No technicians registered in the database yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {technicians.map((tech) => {
                  const isSelected = selectedTechId === tech.id;
                  const isBusy = tech.status === 'BUSY' || tech.activeTickets >= 3;

                  return (
                    <div
                      key={tech.id}
                      onClick={() => setSelectedTechId(tech.id)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-blue-950/40 border-blue-500/70 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                          : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            isSelected
                              ? 'bg-blue-500 text-white shadow-glow-indigo'
                              : 'bg-slate-800 border border-slate-700 text-slate-300'
                          }`}
                        >
                          <User size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200">{tech.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                              ({tech.email})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{tech.department}</p>
                          {tech.specialization && (
                            <p className="text-[10px] text-indigo-300 font-medium">
                              ★ {tech.specialization}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            isBusy
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {tech.activeTickets === 0
                            ? 'Available (0 Jobs)'
                            : `${tech.activeTickets} Active ${tech.activeTickets === 1 ? 'Job' : 'Jobs'}`}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] text-blue-400 font-bold flex items-center gap-0.5">
                            <CheckCircle2 size={11} /> Selected
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Optional Dispatch Memo */}
          <div>
            <label htmlFor="dispatch-notes-input" className="block text-xs font-semibold text-slate-400 mb-1">
              Dispatch Instructions / Bench Note <span className="text-slate-500 font-normal">(Optional)</span>:
            </label>
            <input
              id="dispatch-notes-input"
              type="text"
              placeholder="e.g. Inspect PSU cable seating and test with multimeter first..."
              value={dispatchNote}
              onChange={(e) => setDispatchNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-800 text-slate-200 border border-slate-700 focus:border-blue-500 focus:outline-none placeholder-slate-500"
            />
          </div>

          {/* Workflow note */}
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-center gap-2">
            <Sparkles size={14} className="text-indigo-400 flex-shrink-0" />
            <span>
              Confirming dispatch assigns <strong>{selectedTechnician?.name || 'the technician'}</strong> and updates the action button to <strong className="text-rose-300">Confirm Repair</strong>. The workstation display remains <span className="text-amber-300 font-semibold">Issue Reported (Yellow)</span> until repair is confirmed, which then transitions it to <span className="text-rose-300 font-semibold">Under Repair (Red)</span>.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 pt-3 border-t border-slate-800 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedTechId || isSubmitting}
            onClick={handleConfirm}
            className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-glow-indigo transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Confirming Dispatch...</span>
              </>
            ) : (
              <>
                <Wrench size={14} />
                <span>Confirm &amp; Dispatch {selectedTechnician?.name || 'Technician'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
