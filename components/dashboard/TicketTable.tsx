'use client';
import React, { useState } from 'react';
import { Monitor, Keyboard, Zap, Wifi, User, CheckCircle, ExternalLink, Inbox, Wrench, Sparkles } from 'lucide-react';
import { useTickets } from '@/context/TicketContext';
import { useToast } from '@/context/ToastContext';
import type { Ticket } from '@/lib/mockData';
import { getCategoryColors, getStatusColors, getPriorityColors, formatTimestamp } from '@/lib/utils';
import ViewDetailsModal from './ViewDetailsModal';
import TechnicianDispatchModal from './TechnicianDispatchModal';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'DISPLAY':      <Monitor size={14} />,
  'PERIPHERALS':  <Keyboard size={14} />,
  'POWER/UPS':    <Zap size={14} />,
  'NET/SOFTWARE': <Wifi size={14} />,
};

interface TicketRowProps {
  ticket: Ticket;
  onViewDetails: (t: Ticket) => void;
  onOpenDispatchModal: (t: Ticket) => void;
  onConfirmRepair: (t: Ticket) => void;
  onResolveTicket: (t: Ticket) => void;
}

function TicketRow({ ticket, onViewDetails, onOpenDispatchModal, onConfirmRepair, onResolveTicket }: TicketRowProps) {
  const catColors    = getCategoryColors(ticket.category);
  const statusColors = getStatusColors(ticket.status);
  const prioColors   = getPriorityColors(ticket.priority);

  return (
    <tr
      className="ticket-row border-b border-slate-700/40 animate-ticket-in cursor-pointer"
      onClick={() => onViewDetails(ticket)}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onViewDetails(ticket); }}
      role="row"
      aria-label={`Ticket ${ticket.ticket_id}: ${ticket.category} at ${ticket.lab_id} ${ticket.pc_num}`}
    >
      {/* Ticket ID */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className="font-mono text-xs font-semibold text-indigo-400">{ticket.ticket_id}</span>
      </td>

      {/* Lab / PC */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <div>
          <p className="text-xs font-semibold text-slate-200">{ticket.lab_id}</p>
          <p className="text-xs text-slate-500 font-mono">{ticket.pc_num}</p>
        </div>
      </td>

      {/* Category */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${catColors.bg} ${catColors.text} ${catColors.border}`}>
          {CATEGORY_ICONS[ticket.category]}
          <span className="hidden sm:inline">[{ticket.key}]</span>
          <span className="hidden lg:inline">{ticket.category}</span>
          <span className="sm:hidden">[{ticket.key}]</span>
        </span>
      </td>

      {/* Priority */}
      <td className="px-4 py-3.5 whitespace-nowrap hidden md:table-cell">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${prioColors.dot}`} aria-hidden="true" />
          <span className={`text-xs font-semibold ${prioColors.text}`}>{ticket.priority}</span>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusColors.text.replace('text-', 'bg-')} ${ticket.status === 'PENDING' || ticket.status === 'DISPATCHED' ? 'animate-pulse' : ''}`} aria-hidden="true" />
          {ticket.status === 'UNDER_REPAIR' ? 'UNDER REPAIR' : ticket.status}
        </span>
      </td>

      {/* Time */}
      <td className="px-4 py-3.5 whitespace-nowrap hidden sm:table-cell">
        <span className="text-xs text-slate-500">{formatTimestamp(ticket.timestamp)}</span>
      </td>

      {/* Assignee */}
      <td className="px-4 py-3.5 whitespace-nowrap hidden lg:table-cell">
        {ticket.assignee ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <User size={10} className="text-indigo-400" />
            </div>
            <span className="text-xs text-slate-300">{ticket.assignee}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-600">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          {/* Stage 1: PENDING -> Dispatch button (Yellow station) */}
          {ticket.status === 'PENDING' && (
            <button
              id={`dispatch-${ticket.ticket_id}`}
              onClick={(e) => {
                e.stopPropagation();
                onOpenDispatchModal(ticket);
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 hover:text-amber-200 transition-all whitespace-nowrap flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
              aria-label={`Dispatch technician for ${ticket.ticket_id}`}
            >
              <Wrench size={12} className="text-amber-400" />
              <span>Dispatch</span>
            </button>
          )}

          {/* Stage 2: DISPATCHED -> Confirm Repair button (Changes station display to Red Under Repair) */}
          {ticket.status === 'DISPATCHED' && (
            <button
              id={`confirm-repair-${ticket.ticket_id}`}
              onClick={(e) => {
                e.stopPropagation();
                onConfirmRepair(ticket);
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/40 hover:bg-rose-500/25 hover:text-rose-200 transition-all whitespace-nowrap flex items-center gap-1.5 shadow-[0_0_10px_rgba(244,63,94,0.15)]"
              aria-label={`Confirm repair for ${ticket.ticket_id}`}
              title="Click to confirm repair and mark station as Under Repair"
            >
              <Wrench size={13} className="text-rose-400" />
              <span>Confirm Repair</span>
            </button>
          )}

          {/* Stage 3: UNDER_REPAIR -> Mark Resolved button (Returns station to Green Online) */}
          {ticket.status === 'UNDER_REPAIR' && (
            <button
              id={`resolve-${ticket.ticket_id}`}
              onClick={(e) => {
                e.stopPropagation();
                onResolveTicket(ticket);
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25 hover:text-emerald-200 transition-all whitespace-nowrap flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
              aria-label={`Mark ${ticket.ticket_id} as resolved`}
              title="Click to resolve ticket and restore station to Online"
            >
              <CheckCircle size={13} className="text-emerald-400" />
              <span>Mark Resolved</span>
            </button>
          )}

          {/* Stage 4: RESOLVED -> Completed pill */}
          {ticket.status === 'RESOLVED' && (
            <span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-800 text-slate-400 border border-slate-700/60 inline-flex items-center gap-1">
              <CheckCircle size={11} className="text-emerald-500" />
              Resolved
            </span>
          )}

          <button
            id={`view-${ticket.ticket_id}`}
            onClick={(e) => { e.stopPropagation(); onViewDetails(ticket); }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-all ml-1"
            aria-label={`View details for ${ticket.ticket_id}`}
            title="View Details"
          >
            <ExternalLink size={14} aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function TicketTable() {
  const { filteredTickets, dispatch, confirmRepair, resolve } = useTickets();
  const toast = useToast();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketToDispatch, setTicketToDispatch] = useState<Ticket | null>(null);

  const handleConfirmDispatch = async (ticketId: string, technicianName: string, dispatchNotes?: string) => {
    await dispatch(ticketId, technicianName);
    toast.success(
      'Technician Dispatched',
      `${technicianName} assigned to ${ticketId}. Action updated to "Confirm Repair".`
    );
    setTicketToDispatch(null);
  };

  const handleConfirmRepair = async (ticket: Ticket) => {
    await confirmRepair(ticket.ticket_id);
    toast.info(
      'Repair Confirmed',
      `${ticket.pc_num} (${ticket.lab_id}) is now marked Under Repair (Red).`
    );
    setSelectedTicket(null);
  };

  const handleResolveTicket = async (ticket: Ticket) => {
    await resolve(ticket.ticket_id);
    toast.success(
      'Ticket Resolved',
      `${ticket.ticket_id} (${ticket.pc_num} in ${ticket.lab_id}) marked resolved and restored to Online (Green).`
    );
    setSelectedTicket(null);
  };

  const handleModalDispatchTrigger = () => {
    if (!selectedTicket) return;
    setTicketToDispatch(selectedTicket);
    setSelectedTicket(null);
  };

  return (
    <>
      <div className="glass rounded-2xl overflow-hidden">
        {/* Table heading */}
        <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span>Ticket Queue</span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                Live Operations
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Click any row to inspect symptoms or manage technician dispatching</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" aria-hidden="true" />
              {filteredTickets.filter(t => t.status === 'PENDING').length} pending
            </span>
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Inbox size={40} className="text-slate-600" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-400">No tickets match your filters</p>
            <p className="text-xs text-slate-600">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="w-full" role="table" aria-label="Ticket queue">
              <thead>
                <tr className="border-b border-slate-700/50" role="row">
                  {[
                    { id: 'col-id',       label: 'Ticket ID',  className: 'px-4 py-3 text-left' },
                    { id: 'col-lab',      label: 'Lab / PC',   className: 'px-4 py-3 text-left' },
                    { id: 'col-category', label: 'Category',   className: 'px-4 py-3 text-left' },
                    { id: 'col-priority', label: 'Priority',   className: 'px-4 py-3 text-left hidden md:table-cell' },
                    { id: 'col-status',   label: 'Status',     className: 'px-4 py-3 text-left' },
                    { id: 'col-time',     label: 'Time',       className: 'px-4 py-3 text-left hidden sm:table-cell' },
                    { id: 'col-assignee', label: 'Assignee',   className: 'px-4 py-3 text-left hidden lg:table-cell' },
                    { id: 'col-actions',  label: 'Actions',    className: 'px-4 py-3 text-left' },
                  ].map(col => (
                    <th
                      key={col.id}
                      scope="col"
                      className={`${col.className} text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-900/30`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody role="rowgroup">
                {filteredTickets.map((ticket) => (
                  <TicketRow
                    key={ticket.ticket_id}
                    ticket={ticket}
                    onViewDetails={setSelectedTicket}
                    onOpenDispatchModal={setTicketToDispatch}
                    onConfirmRepair={handleConfirmRepair}
                    onResolveTicket={handleResolveTicket}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <ViewDetailsModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onDispatch={handleModalDispatchTrigger}
          onConfirmRepair={() => handleConfirmRepair(selectedTicket)}
          onResolve={() => handleResolveTicket(selectedTicket)}
        />
      )}

      {/* Technician Dispatch Selection Modal (Queried from Database) */}
      {ticketToDispatch && (
        <TechnicianDispatchModal
          ticket={ticketToDispatch}
          isOpen={Boolean(ticketToDispatch)}
          onClose={() => setTicketToDispatch(null)}
          onConfirmDispatch={handleConfirmDispatch}
        />
      )}
    </>
  );
}
