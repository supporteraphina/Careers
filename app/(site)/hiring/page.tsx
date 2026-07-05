import type { Metadata } from 'next';
import Link from 'next/link';
import { getRolePacks } from '@/lib/content/roles';

export const metadata: Metadata = {
  title: 'Open Roles at Halevora',
  description:
    'Remote, full-time roles across content, design, support, development, and operations. Apply directly, no CV theater.',
};

export default function HiringPage() {
  const packs = getRolePacks();

  return (
    <main className="container" style={{ paddingTop: '80px' }}>
      <p className="eyebrow">Open Roles</p>
      <h1>Work with Halevora.</h1>
      <p style={{ maxWidth: '40em', color: 'var(--text-dim)', marginBottom: '44px' }}>
        Every role is remote and full time. Every application gets read. Pick
        your lane and show us what you can do.
      </p>

      {packs.length === 0 ? (
        <p style={{ color: 'var(--text-faint)' }}>
          No roles are open right now. Check back soon.
        </p>
      ) : (
        <div className="roles-list">
          {packs.map((pack) => (
            <Link
              key={pack.ad.slug}
              href={`/hiring/${pack.ad.slug}`}
              className="role-row"
            >
              <div>
                <div className="role-row__title">{pack.ad.title}</div>
                <div className="eyebrow" style={{ marginTop: '4px' }}>
                  {pack.ad.team}
                </div>
              </div>
              <div className="role-row__meta">
                {pack.ad.team === 'Halevora' && (
                  <span className="pill pill--accent">Talent pool</span>
                )}
                <span className="pill">{pack.ad.location}</span>
                <span className="pill">{pack.ad.employmentType}</span>
                <svg
                  className="role-row__arrow"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
