'use client';
import React, { useEffect, useRef, useState } from 'react';
import { HelpCircle, X, ChevronDown, Mail, ListOrdered, MessageCircleQuestion } from 'lucide-react';
import { REPAIR_STEPS } from '@/components/landing/RepairSteps';
import { supportMailto } from '@/lib/support';

const FAQS = [
  {
    q: 'Who can use LabAssist?',
    a: 'Students and faculty of the University of Makati sign in with their @umak.edu.ph account. Technician and admin accounts are given by Campus IT.',
  },
  {
    q: 'How do I report a broken lab PC?',
    a: 'Sign in, open PC Station, tap the PC on the room map, then choose Report Issue. You can also use Submit a ticket and pick the room and PC yourself.',
  },
  {
    q: 'How do I find a free PC?',
    a: 'PC Station shows every room as it is laid out. Green PCs are ready, purple are in use, amber have a reported issue and red are under repair.',
  },
  {
    q: 'How long does a repair take?',
    a: 'It depends on the problem and on parts. After the evaluation you get a job order with an appointment, and you can follow each stage live under Repair Service.',
  },
  {
    q: 'How much does a repair cost?',
    a: 'You get an itemized invoice with the parts and materials used plus the standard service fee, so you can see everything before you pay.',
  },
  {
    q: 'How can I pay?',
    a: 'Cash, or online (GCash, Maya or bank transfer) with the payment reference number. You can pay when the job order is made or after the repair.',
  },
  {
    q: 'Can I add photos of the problem?',
    a: 'Yes. The repair form accepts up to 3 photos of the problem and 3 of the device’s condition. Only you and the technicians can see them.',
  },
  {
    q: 'I forgot my password.',
    a: 'On the sign-in page choose Forgot password. A code is emailed to your UMak address so you can set a new password.',
  },
];

type HelpTab = 'HOW' | 'FAQ';

/** Floating "?" button (lower right) with a help panel: how a repair works, and FAQs. */
export default function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<HelpTab>('HOW');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    panelRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const tabs: Array<{ id: HelpTab; label: string; icon: React.ReactNode }> = [
    { id: 'HOW', label: 'How it works', icon: <ListOrdered size={14} /> },
    { id: 'FAQ', label: 'FAQs', icon: <MessageCircleQuestion size={14} /> },
  ];

  return (
    <>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-labelledby="help-panel-title"
          className="fixed z-50 right-4 bottom-24 sm:right-6 w-[calc(100vw-2rem)] sm:w-[400px] max-h-[min(640px,calc(100dvh-8rem))] flex flex-col clay-card rounded-3xl overflow-hidden animate-scale-up"
        >
          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
            <div>
              <h2 id="help-panel-title" className="text-base font-bold text-slate-100">Need help?</h2>
              <p className="text-xs text-slate-400">How LabAssist works and common questions</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/70"
              aria-label="Close help"
            >
              <X size={16} />
            </button>
          </div>

          <div role="tablist" aria-label="Help topics" className="mx-5 grid grid-cols-2 gap-1 p-1 rounded-2xl clay-inset">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`help-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`help-panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  tab === t.id ? 'clay-chip text-slate-50' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <div
            id={`help-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`help-tab-${tab}`}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4"
          >
            {tab === 'HOW' ? (
              <ol className="space-y-3">
                {REPAIR_STEPS.map((s, i) => (
                  <li key={s.title} className="flex gap-3">
                    <span className="clay-chip flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-emerald-300" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-100">{s.title}</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <ul className="space-y-2">
                {FAQS.map((f, i) => {
                  const expanded = openFaq === i;
                  return (
                    <li key={f.q} className="rounded-2xl clay-inset">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={`faq-${i}`}
                        onClick={() => setOpenFaq(expanded ? null : i)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-100"
                      >
                        {f.q}
                        <ChevronDown size={16} className={`flex-shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </button>
                      {expanded && (
                        <p id={`faq-${i}`} className="px-4 pb-3 text-xs text-slate-400 leading-relaxed">
                          {f.a}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <a
            href={supportMailto()}
            className="flex items-center justify-center gap-2 mx-5 mb-5 mt-1 py-2.5 rounded-2xl btn-primary text-xs font-bold"
          >
            <Mail size={14} />
            Still stuck? Contact Support
          </a>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close help' : 'Help: how it works and FAQs'}
        className="fixed z-50 right-4 bottom-4 sm:right-6 sm:bottom-6 w-14 h-14 rounded-full clay-fab flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <X size={22} /> : <HelpCircle size={26} />}
      </button>
    </>
  );
}
