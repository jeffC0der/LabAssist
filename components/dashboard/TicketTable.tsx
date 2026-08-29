'use client';
import React, { useState } from 'react';
import { Monitor, Keyboard, Zap, Wifi, User, CheckCircle, ExternalLink, Inbox } from 'lucide-react';
import { useTickets } from '@/context/TicketContext';
import { useToast } from '@/context/ToastContext';
import type { Ticket } from '@/lib/mockData';
import { getCategoryColors, getStatusColors, getPriorityColors, formatTimestamp } from '@/lib/utils';
import ViewDetailsModal from './ViewDetailsModal';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'DISPLAY':      <Monitor size={14} />,
  'PERIPHERALS':  <Keyboard size={14} />,
  'POWER/UPS':    <Zap size={14} />,
  'NET/SOFTWARE': <Wifi size={14} />,
};

const TECHNICIANS = ['Tech. Rivera', 'Tech. Santos', 'Tech. Cruz', 'Tech. Lim', 'Tech. Garcia'];

function TicketRow({ ticket, onViewDetails }: { ticket: Ticket; onViewDetails: (t: Ticket) => void }) {
  const { dispatch, resolve } = useTickets();
  const toast = useToast();

  const catColors    = getCategoryColors(ticket.category);
  const statusColors = getStatusColors(ticket.status);
  const prioColors   = getPriorityColors(ticket.priority);

  const handleDispatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ticket.status !== 'PENDING') return;
    const assignee = TECHNICIANS[Math.floor(Math.random() * TECHNICIANS.length)];
    dispatch(ticket.ticket_id, assignee);
    toast.success('Technician dispatched', `${assignee} assigned to ${ticket.ticket_id}`);
  };

  const handleResolve = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ticket.status === 'RESOLVED') return;
    resolve(ticket.ticket_id);
    toast.success('Ticket resolved', `${ticket.ticket_id} marked as resolved.`);
  };

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
          <span className={`w-1.5 h-1.5 rounded-full ${statusColors.text.replace('text-', 'bg-')} ${ticket.status === 'PENDING' ? 'animate-pulse' : ''}`} aria-hidden="true" />
          {ticket.status}
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
          {ticket.status === 'PENDING' && (
            <button
              id={`dispatch-${ticket.ticket_id}`}
              onClick={handleDispatch}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 hover:text-blue-300 transition-all whitespace-nowrap"
              aria-label={`Dispatch technician for ${ticket.ticket_id}`}
            >
              Dispatch
            </button>
          )}
          {ticket.status !== 'RESOLVED' && (
            <button
              id={`resolve-${ticket.ticket_id}`}
              onClick={handleResolve}
              className="p-1.5 text-xs rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 transition-all"
              aria-label={`Mark ${ticket.ticket_id} as resolved`}
              title="Mark Resolved"
            >
              <CheckCircle size={14} aria-hidden="true" />
            </button>
          )}
          <button
            id={`view-${ticket.ticket_id}`}
            onClick={(e) => { e.stopPropagation(); onViewDetails(ticket); }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-all"
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
  const { filteredTickets } = useTickets();
  const { dispatch, resolve } = useTickets();
  const toast = useToast();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const TECHNICIANS_LIST = ['Tech. Rivera', 'Tech. Santos', 'Tech. Cruz', 'Tech. Lim', 'Tech. Garcia'];

  const handleModalDispatch = () => {
    if (!selectedTicket) return;
    const assignee = TECHNICIANS_LIST[Math.floor(Math.random() * TECHNICIANS_LIST.length)];
    dispatch(selectedTicket.ticket_id, assignee);
    toast.success('Technician dispatched', `${assignee} assigned to ${selectedTicket.ticket_id}`);
    setSelectedTicket(null);
  };

  const handleModalResolve = () => {
    if (!selectedTicket) return;
    resolve(selectedTicket.ticket_id);
    toast.success('Ticket resolved', `${selectedTicket.ticket_id} has been marked as resolved.`);
    setSelectedTicket(null);
  };

  return (
    <>
      <div className="glass rounded-2xl overflow-hidden">
        {/* Table heading */}
        <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-200">Ticket Queue</h2>
            <p className="text-xs text-slate-500 mt-0.5">Click any row to view full details</p>
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
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedTicket && (
        <ViewDetailsModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onDispatch={handleModalDispatch}
          onResolve={handleModalResolve}
        />
      )}
    </>
  );
}
