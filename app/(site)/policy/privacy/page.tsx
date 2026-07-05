import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Halevora Careers',
  description: 'How Halevora handles applicant data during recruitment.',
};

export default function PrivacyPage() {
  return (
    <main className="container" style={{ paddingTop: '80px', maxWidth: '760px' }}>
      <p className="eyebrow">Legal</p>
      <h1>Privacy Policy</h1>
      <div style={{ color: 'var(--text-dim)' }}>
        <p>
          We collect the information you enter in an application, plus basic
          technical context (referrer and campaign parameters), for one purpose:
          evaluating your application. We keep it for 12 months, then delete it.
        </p>
        <p>
          We follow POPIA and the GDPR. You can request a copy of your data or
          its deletion at any time by writing to the address in your application
          confirmation, and we will act on it within 30 days.
        </p>
        <p>
          We never sell applicant data, and we share it only with the Halevora
          team members who review applications.
        </p>
      </div>
    </main>
  );
}
