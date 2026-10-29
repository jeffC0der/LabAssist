import React from 'react';

/** The repair service from drop-off to pick-up; shared by the landing page and the help panel. */
export const REPAIR_STEPS = [
  { title: 'Submit Your Device', desc: 'Sign in and fill out the repair form: your device, the problem, and optional photos.' },
  { title: 'Intake Inspection', desc: 'We note the device’s condition when you hand it over. An intake receipt is emailed to you.' },
  { title: 'Technician Evaluation', desc: 'A technician diagnoses the problem and checks whether it can be repaired.' },
  { title: 'Job Order & Appointment', desc: 'You get the confirmed job order with the date, time and place, plus a notification.' },
  { title: 'Repair in Progress', desc: 'Follow every stage of your repair live from the Repair Service tab.' },
  { title: 'Billing & Payment', desc: 'An itemized invoice: parts, materials and the standard service fee. Pay now or after the repair.' },
  { title: 'Ready for Pickup', desc: 'You are notified by email and in the portal when your device is ready.' },
  { title: 'Release & Receipt', desc: 'Collect your device and get the official release receipt, printable or as a PDF.' },
];

/** "How a repair works": numbered step cards. */
export default function RepairSteps() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-title" className="px-4 py-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 id="how-it-works-title" className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-100">
            How a Repair Works
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3 max-w-2xl mx-auto">
            From handing over your device to getting it back, every step is tracked and you’re kept informed.
          </p>
        </div>

        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {REPAIR_STEPS.map((step, i) => (
            // Same card style as the hero's feature cards and the live stats
            <li key={step.title} className="glass rounded-xl p-5 text-left flex flex-col hover:border-indigo-500/40 transition-all duration-200 group">
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold tabular-nums bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 group-hover:text-cyan-400 transition-colors"
                aria-hidden="true"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-4 text-sm font-semibold text-slate-200 leading-snug">
                <span className="sr-only">Step {i + 1}: </span>
                {step.title}
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">{step.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
