import type { Metadata } from 'next';
import Link from 'next/link';
import LandingHeader from '@/components/landing/LandingHeader';
import HeroSection from '@/components/landing/HeroSection';
import LiveDemoPreview from '@/components/landing/LiveDemoPreview';

export const metadata: Metadata = {
  title: 'LabAssist — Campus Lab Maintenance at the Touch of a Button',
  description: 'LabAssist bridges ESP32 physical keypad remotes with a real-time IT dispatch queue. Students report hardware failures in seconds, technicians respond instantly.',
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-base" id="main-content">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-500 focus:text-white focus:rounded-lg">
        Skip to main content
      </a>

      <LandingHeader />
      <HeroSection />
      <LiveDemoPreview />

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4" role="contentinfo">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500">Lab</span>
            <span className="font-bold text-indigo-500">Assist</span>
            <span>— IoT Lab Maintenance Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Campus IT Services · {new Date().getFullYear()}</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              System Online
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
