import type { Metadata } from 'next';
import LegalPage from '@/components/landing/LegalPage';
import { SUPPORT_EMAIL } from '@/lib/support';

export const metadata: Metadata = {
  title: 'Privacy Policy — UMak LabAssist',
  description: 'What information UMak LabAssist collects, why, and how it is protected.',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="October 30, 2026"
      intro="LabAssist is the University of Makati's system for reporting lab PC problems and managing device repairs. This page explains what information it keeps, why, and how it is protected."
      sections={[
        {
          heading: 'Information we collect',
          body: (
            <ul className="list-disc pl-5 space-y-1">
              <li>Your account: name, UMak email address, department and role.</li>
              <li>Lab tickets: the room, PC, problem category and the description you write.</li>
              <li>Repair requests: your device details (type, model, serial number), the reported problem, optional phone number and photos, and the technician’s findings.</li>
              <li>Billing: invoice items, amounts paid, payment method and payment reference numbers.</li>
              <li>Security records: sign-in attempts, verification codes, and a log of when staff view PC administrator credentials.</li>
            </ul>
          ),
        },
        {
          heading: 'How we use it',
          body: (
            <p>
              Only to run the lab and repair services: to fix reported PCs, process and track repairs, produce invoices and receipts, send
              you notifications and emails about your requests, and keep the system secure. We do not sell your information or use it for advertising.
            </p>
          ),
        },
        {
          heading: 'Who can see it',
          body: (
            <p>
              You can see your own tickets, repairs, photos, invoices and receipts. Campus IT technicians and administrators can see what
              they need to handle requests. Other students only see whether a lab PC is free, in use or being repaired, never who reported it.
            </p>
          ),
        },
        {
          heading: 'How it is protected',
          body: (
            <p>
              Information is stored in a secured database with access rules for each role. Repair photos are private and only shown through
              short-lived links. Passwords are never stored in readable form, staff sign in with an authenticator app, and inactive sessions sign out automatically.
            </p>
          ),
        },
        {
          heading: 'Services we use',
          body: <p>The database and file storage run on Supabase, and emails (codes, receipts and notifications) are sent through Brevo.</p>,
        },
        {
          heading: 'How long we keep it',
          body: <p>Records are kept as long as they are needed for lab operations, repair history and the University’s record-keeping.</p>,
        },
        {
          heading: 'Your rights',
          body: (
            <p>
              We aim to handle personal information in line with the Data Privacy Act of 2012 (Republic Act No. 10173). You may ask to see,
              correct or delete your information by contacting us at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo-400 hover:text-indigo-300">{SUPPORT_EMAIL}</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
