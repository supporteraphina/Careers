import type { Metadata } from 'next';
import Link from 'next/link';
import Reveal from '../../../components/Reveal';
import { getRolePacks } from '@/lib/content/roles';

export const metadata: Metadata = {
  title: 'Open Roles at Halevora',
  description:
    'Remote, full-time roles across content, design, support, development, and operations. Apply directly, no CV theater.',
};

export default function HiringPage() {
  const packs = getRolePacks();
  const featured = packs.filter((p) => p.ad.team === 'Halevora');
  const standard = packs.filter((p) => p.ad.team !== 'Halevora');
  const ordered = [...standard, ...featured];

  return (
    <main>
      <section className="roles-hero mesh">
        <div className="container hero-choreo">
          <p className="eyebrow">Open Roles</p>
          <h1 style={{ maxWidth: '12em' }}>Do the best work of your life.</h1>
          <p className="hero__sub">
            Every role is remote and full time. Every application gets read by
            a human. Pick your lane and show us what you can do.
          </p>
        </div>
      </section>

      <section className="section--tight">
        <div className="container">
          {ordered.length === 0 ? (
            <p style={{ color: 'var(--text-faint)' }}>
              No roles are open right now. Check back soon.
            </p>
          ) : (
            <Reveal>
              <div className="roles-list">
                {ordered.map((pack) => {
                  const isFeatured = pack.ad.team === 'Halevora';
                  return (
                    <Link
                      key={pack.ad.slug}
                      href={`/hiring/${pack.ad.slug}`}
                      className={`role-row${isFeatured ? ' role-row--featured' : ''}`}
                    >
                      <div>
                        <div className="role-row__title">{pack.ad.title}</div>
                        <div className="role-row__team">{pack.ad.team}</div>
                      </div>
                      <div className="role-row__meta">
                        {isFeatured && (
                          <span className="pill pill--accent">Talent pool</span>
                        )}
                        <span className="pill">{pack.ad.location}</span>
                        <span className="pill">{pack.ad.employmentType}</span>
                        <svg
                          className="role-row__arrow"
                          width="26"
                          height="26"
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
                  );
                })}
              </div>
            </Reveal>
          )}
        </div>
      </section>
    </main>
  );
}
