import type { Metadata } from 'next';
import LegalPage from '@/components/landing/LegalPage';
import { SUPPORT_EMAIL } from '@/lib/support';

export const metadata: Metadata = {
  title: 'Terms of Service — UMak LabAssist',
  description: 'The rules for using UMak LabAssist, the University of Makati lab maintenance and device repair system.',
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="October 30, 2026"
      intro="By signing in to LabAssist you agree to these terms. They exist so that lab PCs get fixed quickly and repairs are handled fairly for everyone."
      sections={[
        {
          heading: 'Who may use LabAssist',
          body: (
            <p>
              LabAssist is for University of Makati students, faculty and staff with a UMak account. Technician and administrator access is
              granted by Campus IT. Keep your password and sign-in codes private; you are responsible for activity on your account.
            </p>
          ),
        },
        {
          heading: 'Reporting lab PC problems',
          body: (
            <p>
              Report only real problems, with an honest description. False or repeated reports slow down repairs for everyone and may be
              handled under University rules.
            </p>
          ),
        },
        {
          heading: 'Device repairs',
          body: (
            <ul className="list-disc pl-5 space-y-1">
              <li>Back up your files before handing over a device. LabAssist is not responsible for data lost during a repair.</li>
              <li>The device’s condition is recorded at intake, with optional photos, so it can be compared when you collect it.</li>
              <li>Repairs start after the evaluation and the confirmed job order. Some devices may be found not repairable.</li>
              <li>Collect your device once you are notified that it is ready for pickup.</li>
            </ul>
          ),
        },
        {
          heading: 'Fees and payment',
          body: (
            <p>
              Each repair invoice lists the parts and materials used plus a standard service fee. Payment is in cash or online with a
              reference number, either when the job order is made or after the repair. A device is released once its invoice is fully paid.
            </p>
          ),
        },
        {
          heading: 'Acceptable use',
          body: (
            <p>
              Do not try to access other people’s information, misuse administrator credentials, upload harmful files, or interfere with the
              system. Access may be suspended for misuse.
            </p>
          ),
        },
        {
          heading: 'Changes and contact',
          body: (
            <p>
              These terms may be updated; the date above shows the latest version. Questions? Contact{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo-400 hover:text-indigo-300">{SUPPORT_EMAIL}</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
