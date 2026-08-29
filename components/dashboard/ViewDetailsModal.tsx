'use client';
import React, { useEffect, useRef } from 'react';
import { X, Monitor, Keyboard, Zap, Wifi, Clock, User, CheckCircle, AlertTriangle, Radio } from 'lucide-react';
import type { Ticket } from '@/lib/mockData';
import { getCategoryColors, getStatusColors, getPriorityColors, formatFullTimestamp } from '@/lib/utils';

interface ViewDetailsModalProps {
  ticket: Ticket;
  onClose: () => void;
  onDispatch: () => void;
  onResolve: () => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'DISPLAY':      <Monitor size={18} />,
  'PERIPHERALS':  <Keyboard size={18} />,
  'POWER/UPS':    <Zap size={18} />,
  'NET/SOFTWARE': <Wifi size={18} />,
};

export default function ViewDetailsModal({ ticket, onClose, onDispatch, onResolve }: ViewDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const catColors = getCategoryColors(ticket.category);
  const statusColors = getStatusColors(ticket.status);
  const priorityColors = getPriorityColors(ticket.priority);

  // Focus trap & keyboard close
  useEffect(() => {
    modalRef.current?.focus();
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl animate-fade-in-up focus:outline-none overflow-hidden"
      >
        {/* Modal header */}
        <div className={`flex items-start justify-between px-6 py-5 border-b border-slate-700 ${catColors.bg}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${catColors.bg} border ${catColors.border} flex items-center justify-center ${catColors.text}`}>
              {CATEGORY_ICONS[ticket.category]}
            </div>
            <div>
              <h2 id="modal-title" className="text-base font-bold text-slate-100">{ticket.ticket_id}</h2>
              <p className="text-xs text-slate-400 font-mono">{ticket.lab_id} · {ticket.pc_num}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 hover:bg-slate-700 rounded-lg p-1.5 transition-all"
            aria-label="Close ticket details"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Status and Priority row */}
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusColors.text.replace('text-', 'bg-')}`} aria-hidden="true" />
              {ticket.status}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-700/50 border border-slate-600 ${priorityColors.text}`}>
              <AlertTriangle size={11} aria-hidden="true" />
              {ticket.priority} PRIORITY
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${catColors.bg} ${catColors.text} ${catColors.border}`}>
              {CATEGORY_ICONS[ticket.category]}
              <span>[{ticket.key}] {ticket.category}</span>
            </span>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Issue Description</p>
            <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/40 rounded-xl px-4 py-3 border border-slate-700">
              {ticket.description}
            </p>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-700">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={12} className="text-slate-500" aria-hidden="true" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Submitted</p>
              </div>
              <p className="text-xs text-slate-300 font-mono">{formatFullTimestamp(ticket.timestamp)}</p>
            </div>
            <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-700">
              <div className="flex items-center gap-1.5 mb-1">
                <Radio size={12} className="text-slate-500" aria-hidden="true" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Reporter</p>
              </div>
              <p className="text-xs text-slate-300">{ticket.reporter}</p>
            </div>
            {ticket.assignee && (
              <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-700">
                <div className="flex items-center gap-1.5 mb-1">
                  <User size={12} className="text-slate-500" aria-hidden="true" />
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Assignee</p>
                </div>
                <p className="text-xs text-slate-300">{ticket.assignee}</p>
              </div>
            )}
            {ticket.resolvedAt && (
              <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-700">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle size={12} className="text-emerald-500" aria-hidden="true" />
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Resolved At</p>
                </div>
                <p className="text-xs text-emerald-400 font-mono">{formatFullTimestamp(ticket.resolvedAt)}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {ticket.notes && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Technician Notes</p>
              <p className="text-xs text-slate-300 italic leading-relaxed bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
                {ticket.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {ticket.status !== 'RESOLVED' && (
          <div className="flex gap-3 px-6 pb-5">
            {ticket.status === 'PENDING' && (
              <button
                id={`modal-dispatch-${ticket.ticket_id}`}
                onClick={onDispatch}
                className="flex-1 py-2.5 rounded-xl btn-primary text-sm font-semibold flex items-center justify-center gap-2"
                aria-label={`Dispatch technician for ${ticket.ticket_id}`}
              >
                <User size={15} aria-hidden="true" />
                Dispatch Technician
              </button>
            )}
            <button
              id={`modal-resolve-${ticket.ticket_id}`}
              onClick={onResolve}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              aria-label={`Mark ${ticket.ticket_id} as resolved`}
            >
              <CheckCircle size={15} aria-hidden="true" />
              Mark Resolved
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
