import type { Metadata } from 'next';
import LandingHeader from '@/components/landing/LandingHeader';
import HeroSection from '@/components/landing/HeroSection';
import CampusStats from '@/components/landing/CampusStats';
import RepairSteps from '@/components/landing/RepairSteps';
import HelpWidget from '@/components/landing/HelpWidget';
import LandingFooter from '@/components/landing/LandingFooter';
// The ESP32 keypad demo (components/landing/LiveDemoPreview.tsx) is hidden for now; add <LiveDemoPreview /> back to show it

export const metadata: Metadata = {
  title: 'LabAssist — Campus Lab Maintenance at the Touch of a Button',
  description: 'LabAssist bridges ESP32 physical keypad remotes with a real-time IT dispatch queue. Students report hardware failures in seconds, technicians respond instantly.',
};

export default function LandingPage() {
  return (
    // The grid background runs down the whole page, behind every section
    <main className="min-h-screen bg-base hero-grid" id="main-content">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-500 focus:text-slate-50 focus:rounded-lg">
        Skip to main content
      </a>

      <LandingHeader />
      <HeroSection />
      <CampusStats />
      <RepairSteps />
      <LandingFooter />
      <HelpWidget />
    </main>
  );
}
