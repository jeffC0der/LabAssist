'use client';
import React, { useState, useEffect } from 'react';
import { Send, Monitor, Keyboard, Zap, Wifi, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useTickets } from '@/context/TicketContext';
import { useToast } from '@/context/ToastContext';
import { LAB_ROOMS, type TicketCategory, type TicketKey, type Ticket } from '@/lib/mockData';

interface TicketSubmissionFormProps {
  initialLab?: string;
  initialPc?: string;
  onTicketCreated?: (ticket: Ticket) => void;
}

const CATEGORY_OPTIONS: Array<{
  key: TicketKey;
  category: TicketCategory;
  title: string;
  desc: string;
  icon: React.ReactNode;
  borderHover: string;
  bgActive: string;
  badgeColor: string;
}> = [
  {
    key: 'A',
    category: 'DISPLAY',
    title: '[A] Display',
    desc: 'Monitor, projector, HDMI glitches, flickering backlight',
    icon: <Monitor size={18} />,
    borderHover: 'hover:border-blue-500/60',
    bgActive: 'bg-blue-500/15 border-blue-500/60 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  {
    key: 'B',
    category: 'PERIPHERALS',
    title: '[B] Peripherals',
    desc: 'Keyboard stuck keys, mouse sensor, audio/headset jack',
    icon: <Keyboard size={18} />,
    borderHover: 'hover:border-violet-500/60',
    bgActive: 'bg-violet-500/15 border-violet-500/60 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]',
    badgeColor: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  },
  {
    key: 'C',
    category: 'POWER/UPS',
    title: '[C] Power/UPS',
    desc: 'Continuous UPS beeping, power tripping, dead PC unit',
    icon: <Zap size={18} />,
    borderHover: 'hover:border-red-500/60',
    bgActive: 'bg-red-500/15 border-red-500/60 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
    badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  {
    key: 'D',
    category: 'NET/SOFTWARE',
    title: '[D] Net/Software',
    desc: 'Campus Wi-Fi / DHCP, blue screen (BSOD), portal access',
    icon: <Wifi size={18} />,
    borderHover: 'hover:border-cyan-500/60',
    bgActive: 'bg-cyan-500/15 border-cyan-500/60 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
];

const PRESETS: Record<TicketCategory, string[]> = {
  'DISPLAY': ['Monitor powers on but displays "No Signal"', 'Screen has severe flickering and horizontal lines', 'Projector HDMI output disconnected'],
  'PERIPHERALS': ['Mechanical keyboard keys physically unresponsive', 'Mouse tracking sensor skips and jumps erratically', 'Front audio 3.5mm jack loose/no sound'],
  'POWER/UPS': ['UPS battery alarm beeping continuously', 'PC shuts down suddenly under heavy software load', 'Power button LED does not illuminate'],
  'NET/SOFTWARE': ['Ethernet adapter fails to obtain campus DHCP IP', 'System crashed with blue screen (BSOD) stopcode', 'University lab portal times out during exam'],
};

export default function TicketSubmissionForm({ initialLab, initialPc, onTicketCreated }: TicketSubmissionFormProps) {
  const { addTicket } = useTickets();
  const toast = useToast();

  const [labRoom, setLabRoom] = useState<string>(initialLab || 'LAB-302');
  const [pcNum, setPcNum] = useState<string>(initialPc || 'PC-07');
  const [selectedKey, setSelectedKey] = useState<TicketKey>('A');
  const [description, setDescription] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [studentName, setStudentName] = useState<string>('Student Kiosk');

  // Update fields if parent selection changes
  useEffect(() => {
    if (initialLab) setLabRoom(initialLab);
    if (initialPc) setPcNum(initialPc);
  }, [initialLab, initialPc]);

  const selectedCategoryObj = CATEGORY_OPTIONS.find(c => c.key === selectedKey)!;
  const labOptions = LAB_ROOMS.filter(r => r !== 'All Labs');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.warning('Description required', 'Please describe the fault symptoms for the IT technician.');
      return;
    }

    setIsSubmitting(true);

    // Simulate realistic non-blocking dispatch latency
    await new Promise(r => setTimeout(r, 650));

    const newTicketId = `TKT-${Math.floor(2400 + Math.random() * 900)}`;
    const newTicket: Ticket = {
      ticket_id: newTicketId,
      lab_id: labRoom,
      pc_num: pcNum.startsWith('PC-') ? pcNum : `PC-${pcNum.padStart(2, '0')}`,
      category: selectedCategoryObj.category,
      key: selectedKey,
      timestamp: new Date().toISOString(),
      status: 'PENDING',
      reporter: studentName.trim() || 'Student Kiosk',
      description: description.trim(),
      priority: isUrgent ? 'HIGH' : 'MEDIUM',
    };

    addTicket(newTicket);
    if (onTicketCreated) onTicketCreated(newTicket);

    toast.success('Ticket Submitted Successfully', `${newTicket.ticket_id} routed to the active IT Technician queue!`);

    // Reset description & keep lab context
    setDescription('');
    setIsUrgent(false);
    setIsSubmitting(false);
  };

  return (
    <div className="glass rounded-2xl p-5 border border-slate-800/80">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/70 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-glow-indigo">
            <Send size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Manual Ticket Submission
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-wider rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Instant Dispatch
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Report equipment faults directly to campus IT response teams
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Lab Room & PC Station inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="submit-lab-room" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Lab Room <span className="text-indigo-400">*</span>
            </label>
            <select
              id="submit-lab-room"
              value={labRoom}
              onChange={(e) => setLabRoom(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-800/80 text-slate-200 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer"
              required
            >
              {labOptions.map((lab) => (
                <option key={lab} value={lab} className="bg-slate-900 text-slate-200">
                  {lab}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="submit-pc-num" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Workstation PC # <span className="text-indigo-400">*</span>
            </label>
            <input
              id="submit-pc-num"
              type="text"
              value={pcNum}
              onChange={(e) => setPcNum(e.target.value)}
              placeholder="e.g. PC-07"
              className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-slate-800/80 text-slate-200 placeholder-slate-500 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
              required
            />
          </div>
        </div>

        {/* Issue Category Radio Cards */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Issue Category <span className="text-indigo-400">*</span>
            <span className="text-slate-500 font-normal ml-1">(Hardware keypad keys A–D)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {CATEGORY_OPTIONS.map((opt) => {
              const isSelected = selectedKey === opt.key;
              return (
                <div
                  key={opt.key}
                  onClick={() => setSelectedKey(opt.key)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedKey(opt.key); }}
                  tabIndex={0}
                  role="radio"
                  aria-checked={isSelected}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? opt.bgActive
                      : `bg-slate-900/50 border-slate-800/80 text-slate-300 ${opt.borderHover} hover:bg-slate-800/40`
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={isSelected ? 'text-inherit' : 'text-slate-400'}>{opt.icon}</span>
                      <span className="text-xs font-bold text-slate-100">{opt.title}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${opt.badgeColor}`}>
                      KEY [{opt.key}]
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{opt.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick symptom presets */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 block mb-1.5 flex items-center gap-1">
            <Sparkles size={11} className="text-indigo-400" />
            Quick Presets for {selectedCategoryObj.title}:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS[selectedCategoryObj.category].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setDescription(preset)}
                className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 border border-slate-700/50 transition-colors text-left"
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Description Textarea */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="submit-description" className="text-xs font-semibold text-slate-300">
              Fault Description & Symptoms <span className="text-indigo-400">*</span>
            </label>
            <span className="text-[10px] text-slate-500 font-mono">
              {description.length}/300 chars
            </span>
          </div>
          <textarea
            id="submit-description"
            rows={3}
            maxLength={300}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what went wrong, error codes on screen, or physical damage observed..."
            className="w-full p-3 rounded-xl text-xs bg-slate-800/80 text-slate-200 placeholder-slate-500 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all resize-none"
            required
          />
        </div>

        {/* Reporter Name & Priority Checkbox */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <input
              id="urgent-toggle"
              type="checkbox"
              checked={isUrgent}
              onChange={(e) => setIsUrgent(e.target.checked)}
              className="w-4 h-4 rounded text-rose-500 bg-slate-800 border-slate-700 focus:ring-rose-500 focus:ring-offset-slate-900 cursor-pointer"
            />
            <label htmlFor="urgent-toggle" className="text-xs font-semibold text-slate-300 flex items-center gap-1 cursor-pointer">
              <span className="text-rose-400">Escalate as Urgent Priority</span>
              <span className="text-[10px] text-slate-500">(Active Lab Exam / Project)</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Your Name or Kiosk ID"
              className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-800/80 text-slate-200 border border-slate-700 focus:border-indigo-500 focus:outline-none w-36"
              title="Reporter identifier"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-glow-indigo transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin text-white" />
              <span>Transmitting IoT Dispatch Packet...</span>
            </>
          ) : (
            <>
              <Send size={15} />
              <span>Transmit Hardware Failure Ticket</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
