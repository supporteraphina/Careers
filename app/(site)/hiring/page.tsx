import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Reveal from '../../../components/Reveal';
import { getRoleImage } from '@/lib/content/roleImages';
import { getRolePacks } from '@/lib/content/roles';

export const metadata: Metadata = {
  title: 'Open Roles at Halevora',
  description:
    'Remote, full-time roles across content, design, support, development, and operations. Apply directly, no CV theater.',
};

function PinIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function CaseIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

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
          <h1>Do the best work of your life.</h1>
          <p className="hero__sub">
            Every role is remote and full time. Every application gets read by
            a human. Pick your lane and show us what you can do.
          </p>
        </div>
      </section>

      <section className="section--tight">
        <div className="container container--wide">
          {ordered.length === 0 ? (
            <p style={{ color: 'var(--text-faint)' }}>
              No roles are open right now. Check back soon.
            </p>
          ) : (
            <Reveal>
              <div className="roles-grid">
                {ordered.map((pack) => {
                  const isFeatured = pack.ad.team === 'Halevora';
                  const image = getRoleImage(pack.ad.slug);
                  return (
                    <Link
                      key={pack.ad.slug}
                      href={`/hiring/${pack.ad.slug}`}
                      className={`role-card${isFeatured ? ' role-card--featured' : ''}`}
                    >
                      {image && (
                        <Image
                          src={image.src}
                          alt={image.alt}
                          fill
                          loading="eager"
                          sizes={
                            isFeatured
                              ? '(max-width: 1120px) 100vw, 1120px'
                              : '(max-width: 720px) 100vw, 360px'
                          }
                        />
                      )}
                      <span className="role-card__scrim" />
                      <span className="role-card__title">{pack.ad.title}</span>
                      <span className="role-card__badges">
                        {isFeatured && (
                          <span className="role-card__badge role-card__badge--accent">
                            Talent pool
                          </span>
                        )}
                        <span className="role-card__badge">
                          <PinIcon />
                          {pack.ad.location}
                        </span>
                        <span className="role-card__badge">
                          <CaseIcon />
                          {pack.ad.employmentType}
                        </span>
                      </span>
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
