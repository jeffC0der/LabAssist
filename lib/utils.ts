// ─── Utility Helpers ─────────────────────────────────────────────────────────
import type { TicketCategory, TicketStatus, Ticket } from './mockData';

export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1)  return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24)  return `${diffHrs}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatFullTimestamp(isoString: string): string {
  return new Date(isoString).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export function formatResolutionTime(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function getCategoryColors(category: TicketCategory) {
  const map: Record<TicketCategory, { bg: string; text: string; border: string; dot: string }> = {
    'DISPLAY':      { bg: 'bg-blue-500/15',   text: 'text-blue-400',   border: 'border-blue-500/30',   dot: 'bg-blue-400' },
    'PERIPHERALS':  { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/30', dot: 'bg-violet-400' },
    'POWER/UPS':    { bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/30',    dot: 'bg-red-400' },
    'NET/SOFTWARE': { bg: 'bg-cyan-500/15',   text: 'text-cyan-400',   border: 'border-cyan-500/30',   dot: 'bg-cyan-400' },
  };
  return map[category];
}

export function getStatusColors(status: TicketStatus) {
  const map: Record<TicketStatus, { bg: string; text: string; border: string }> = {
    'PENDING':    { bg: 'bg-amber-500/15',   text: 'text-amber-400',   border: 'border-amber-500/30' },
    'DISPATCHED': { bg: 'bg-blue-500/15',    text: 'text-blue-400',    border: 'border-blue-500/30' },
    'RESOLVED':   { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  };
  return map[status];
}

export function getPriorityColors(priority: Ticket['priority']) {
  const map = {
    'HIGH':   { text: 'text-red-400',    dot: 'bg-red-400' },
    'MEDIUM': { text: 'text-amber-400',  dot: 'bg-amber-400' },
    'LOW':    { text: 'text-slate-400',  dot: 'bg-slate-400' },
  };
  return map[priority];
}

export function getKeyLabel(key: string): string {
  return `[${key}]`;
}
