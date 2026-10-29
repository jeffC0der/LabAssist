import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import LandingFooter from '@/components/landing/LandingFooter';

export interface LegalSection {
  heading: string;
  body: React.ReactNode;
}

/** Shared layout for the Privacy Policy and Terms of Service pages. */
export default function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: string; sections: LegalSection[] }) {
  return (
    <main className="min-h-screen bg-base hero-grid" id="main-content">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200">
          <ArrowLeft size={14} /> Back to LabAssist
        </Link>
        <h1 className="mt-6 text-3xl sm:text-4xl font-black tracking-tight text-slate-100">{title}</h1>
        <p className="mt-2 text-xs text-slate-500">Last updated {updated}</p>
        <p className="mt-6 text-sm text-slate-300 leading-relaxed">{intro}</p>
        <div className="mt-8 space-y-4">
          {sections.map((s, i) => (
            <section key={s.heading} className="clay-card rounded-2xl p-5 sm:p-6" aria-labelledby={`legal-${i}`}>
              <h2 id={`legal-${i}`} className="text-base font-bold text-slate-100">
                {i + 1}. {s.heading}
              </h2>
              <div className="mt-2 text-sm text-slate-400 leading-relaxed space-y-2">{s.body}</div>
            </section>
          ))}
        </div>
      </div>
      <LandingFooter />
    </main>
  );
}
