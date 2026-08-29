'use client';
import React from 'react';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useTickets } from '@/context/TicketContext';
import { LAB_ROOMS } from '@/lib/mockData';

const CATEGORIES = [
  { value: 'ALL',          label: 'All Categories' },
  { value: 'DISPLAY',      label: '[A] Display' },
  { value: 'PERIPHERALS',  label: '[B] Peripherals' },
  { value: 'POWER/UPS',    label: '[C] Power / UPS' },
  { value: 'NET/SOFTWARE', label: '[D] Net / Software' },
];

const STATUSES = [
  { value: 'ALL',        label: 'All Statuses' },
  { value: 'PENDING',    label: 'Pending' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'RESOLVED',   label: 'Resolved' },
];

const selectClass = `
  px-3 py-2 rounded-xl text-sm font-medium
  bg-slate-800 text-slate-300
  border border-slate-700
  focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none
  hover:border-slate-600
  transition-all cursor-pointer appearance-none
  pr-8
`;

export default function FilterBar() {
  const { filters, setFilter, filteredTickets, tickets } = useTickets();

  const handleReset = () => {
    setFilter('lab', 'All Labs');
    setFilter('category', 'ALL');
    setFilter('status', 'ALL');
    setFilter('search', '');
  };

  const hasActiveFilters =
    filters.lab !== 'All Labs' ||
    filters.category !== 'ALL' ||
    filters.status !== 'ALL' ||
    filters.search !== '';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5 p-4 glass rounded-2xl" role="search" aria-label="Filter tickets">
      <div className="flex items-center gap-2 flex-shrink-0">
        <SlidersHorizontal size={15} className="text-indigo-400" aria-hidden="true" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Filters</span>
      </div>

      <div className="flex flex-wrap gap-2.5 flex-1">
        {/* Lab Room */}
        <div className="relative">
          <label htmlFor="filter-lab" className="sr-only">Filter by lab room</label>
          <select
            id="filter-lab"
            value={filters.lab}
            onChange={e => setFilter('lab', e.target.value)}
            className={selectClass}
            aria-label="Filter by lab room"
          >
            {LAB_ROOMS.map(lab => (
              <option key={lab} value={lab}>{lab}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">▾</span>
        </div>

        {/* Category */}
        <div className="relative">
          <label htmlFor="filter-category" className="sr-only">Filter by failure category</label>
          <select
            id="filter-category"
            value={filters.category}
            onChange={e => setFilter('category', e.target.value)}
            className={selectClass}
            aria-label="Filter by failure category"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">▾</span>
        </div>

        {/* Status */}
        <div className="relative">
          <label htmlFor="filter-status" className="sr-only">Filter by ticket status</label>
          <select
            id="filter-status"
            value={filters.status}
            onChange={e => setFilter('status', e.target.value)}
            className={selectClass}
            aria-label="Filter by ticket status"
          >
            {STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">▾</span>
        </div>
      </div>

      {/* Results count + Reset */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs text-slate-500 tabular-nums" aria-live="polite" aria-label={`${filteredTickets.length} of ${tickets.length} tickets shown`}>
          <span className="font-semibold text-slate-300">{filteredTickets.length}</span>
          <span className="text-slate-600"> / {tickets.length}</span>
          <span className="ml-1">tickets</span>
        </span>

        {hasActiveFilters && (
          <button
            id="filter-reset-btn"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 hover:bg-slate-800 transition-all"
            aria-label="Reset all filters"
          >
            <RotateCcw size={12} aria-hidden="true" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
