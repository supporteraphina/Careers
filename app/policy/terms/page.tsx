import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms | Halevora Careers',
  description: 'Terms for using the Halevora careers site.',
};

export default function TermsPage() {
  return (
    <main className="container" style={{ paddingTop: '80px', maxWidth: '760px' }}>
      <p className="eyebrow">Legal</p>
      <h1>Terms</h1>
      <div style={{ color: 'var(--text-dim)' }}>
        <p>
          Submitting an application does not create an employment relationship
          or an obligation on either side. Provide truthful information; we end
          processes built on false claims.
        </p>
        <p>
          All content on this site belongs to Halevora. Do not scrape, resell,
          or republish it.
        </p>
      </div>
    </main>
  );
}
