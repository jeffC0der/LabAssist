import Image from 'next/image';
import Link from 'next/link';
import { supportMailto } from '@/lib/support';

/** Public pages' footer: brand, copyright, and the legal / support links. */
export default function LandingFooter() {
  const linkClass = 'hover:text-slate-200 transition-colors';
  return (
    // Full width like the header (brand far left, links far right). The extra space on the right (desktop) and
    // at the bottom (phones) keeps the floating help button from covering the links.
    <footer className="border-t border-slate-800 pt-8 pb-24 md:pb-8 pl-4 sm:pl-6 lg:pl-8 pr-4 md:pr-28" role="contentinfo">
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Image src="/UMakLabAssistLogo.png" alt="UMak LabAssist Logo" width={20} height={20} className="w-5 h-5 object-contain rounded-full opacity-80" />
            <span className="font-bold text-slate-400">
              Lab<span className="text-indigo-500">Assist</span>
            </span>
          </div>
          <span>© {new Date().getFullYear()} University of Makati. All rights reserved.</span>
        </div>
        <nav aria-label="Legal and support" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link href="/privacy" className={linkClass}>Privacy Policy</Link>
          <Link href="/terms" className={linkClass}>Terms of Service</Link>
          <a href={supportMailto()} className={linkClass}>
            Contact Support
          </a>
        </nav>
      </div>
    </footer>
  );
}
