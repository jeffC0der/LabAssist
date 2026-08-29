'use client';
import React, { useState } from 'react';
import { Cpu, Box, CheckCircle2, Clock, ShieldCheck, KeyRound, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { MOCK_LOANER_ITEMS, MOCK_LOANER_REQUESTS, LAB_ROOMS, type LoanerItem, type LoanerRequest } from '@/lib/mockData';
import { useToast } from '@/context/ToastContext';

export default function HardwareLoanerCard() {
  const toast = useToast();
  const [items, setItems] = useState<LoanerItem[]>(MOCK_LOANER_ITEMS);
  const [requests, setRequests] = useState<LoanerRequest[]>(MOCK_LOANER_REQUESTS);

  // Form state
  const [selectedItemId, setSelectedItemId] = useState<string>(MOCK_LOANER_ITEMS[0].id);
  const [studentName, setStudentName] = useState<string>('Marcus Vance');
  const [studentId, setStudentId] = useState<string>('2024-88912');
  const [labRoom, setLabRoom] = useState<string>('LAB-302');
  const [duration, setDuration] = useState<string>('2 Hours (Class Lab)');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'REQUEST' | 'ACTIVE_LOANS'>('REQUEST');

  const selectedItem = items.find(i => i.id === selectedItemId);
  const labOptions = LAB_ROOMS.filter(r => r !== 'All Labs');

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || selectedItem.available <= 0) {
      toast.error('Item Unavailable', 'All units of this hardware are currently on loan.');
      return;
    }

    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 600));

    // Generate random locker & PIN
    const lockerLetters = ['A', 'B', 'C', 'D'];
    const randomLocker = `LOCKER-${lockerLetters[Math.floor(Math.random() * lockerLetters.length)]}${Math.floor(1 + Math.random() * 6)}`;
    const randomPin = Math.floor(1000 + Math.random() * 9000);

    const newReq: LoanerRequest = {
      id: `REQ-${Math.floor(8800 + Math.random() * 900)}`,
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      studentName: studentName.trim() || 'Student User',
      studentId: studentId.trim() || '2024-XXXXX',
      labRoom,
      duration,
      requestedAt: 'Just now',
      status: 'APPROVED',
      lockerCode: `${randomLocker} · PIN ${randomPin}`,
    };

    // Update stock count
    setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, available: i.available - 1 } : i));
    setRequests(prev => [newReq, ...prev]);

    toast.success('Equipment Loan Approved!', `Assigned ${randomLocker} with temporary PIN ${randomPin}. Collect at Lab Assist Kiosk.`);
    setIsSubmitting(false);
    setActiveTab('ACTIVE_LOANS');
  };

  return (
    <div className="glass rounded-2xl p-5 border border-slate-800/80">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/70 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Cpu size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Hardware Loaner Request
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/30">
                Smart Locker
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Request microcontrollers, test adapters, & diagnostic gear
            </p>
          </div>
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('REQUEST')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'REQUEST'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            New Request
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ACTIVE_LOANS')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'ACTIVE_LOANS'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active Loans
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-violet-500/30 text-violet-200">
              {requests.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'REQUEST' ? (
        <form onSubmit={handleRequestSubmit} className="space-y-4">
          {/* Equipment selector cards */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Hardware Item <span className="text-violet-400">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
              {items.map((item) => {
                const isSelected = selectedItemId === item.id;
                const isAvailable = item.available > 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => isAvailable && setSelectedItemId(item.id)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      !isAvailable
                        ? 'opacity-50 bg-slate-900/30 border-slate-800 cursor-not-allowed'
                        : isSelected
                        ? 'bg-violet-950/40 border-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.2)]'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-200 truncate pr-2">{item.name}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        isAvailable
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}>
                        {item.available}/{item.total} left
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{item.category}</span>
                      <span className="font-mono text-slate-500">{item.location}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form input fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Student Name / ID <span className="text-violet-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Full Name"
                  className="w-1/2 px-3 py-2 rounded-xl text-xs bg-slate-800/80 text-slate-200 border border-slate-700 focus:border-violet-500 focus:outline-none"
                  required
                />
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="ID Number"
                  className="w-1/2 px-3 py-2 rounded-xl text-xs font-mono bg-slate-800/80 text-slate-200 border border-slate-700 focus:border-violet-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Assigned Lab & Duration <span className="text-violet-400">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={labRoom}
                  onChange={(e) => setLabRoom(e.target.value)}
                  className="w-1/2 px-2.5 py-2 rounded-xl text-xs bg-slate-800/80 text-slate-200 border border-slate-700 focus:border-violet-500 focus:outline-none cursor-pointer"
                >
                  {labOptions.map(lab => (
                    <option key={lab} value={lab} className="bg-slate-900 text-slate-200">
                      {lab}
                    </option>
                  ))}
                </select>

                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-1/2 px-2.5 py-2 rounded-xl text-xs bg-slate-800/80 text-slate-200 border border-slate-700 focus:border-violet-500 focus:outline-none cursor-pointer"
                >
                  <option value="2 Hours (Class Lab)">2 Hours</option>
                  <option value="Full Session (4 Hours)">4 Hours</option>
                  <option value="Overnight Loan">Overnight</option>
                  <option value="3-Day Capstone Project">3-Day Project</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin text-white" />
                <span>Checking Locker Availability...</span>
              </>
            ) : (
              <>
                <KeyRound size={14} />
                <span>Submit Instant Loaner Request & Generate Locker PIN</span>
              </>
            )}
          </button>
        </form>
      ) : (
        /* Active Loans View */
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                    {req.id}
                  </span>
                  <span className="text-xs font-bold text-slate-200">{req.itemName}</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-3">
                  <span>Student: <strong className="text-slate-300">{req.studentName}</strong></span>
                  <span>Room: <strong className="text-slate-300">{req.labRoom}</strong></span>
                  <span>Duration: <strong className="text-slate-300">{req.duration}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto">
                {req.lockerCode && (
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                    <KeyRound size={13} className="text-emerald-400" />
                    {req.lockerCode}
                  </div>
                )}
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {req.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
