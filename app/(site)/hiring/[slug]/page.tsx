import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ApplyLink from '../../../../components/ApplyLink';
import Reveal from '../../../../components/Reveal';
import { getRolePack, getRolePacks } from '@/lib/content/roles';

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getRolePacks().map((pack) => ({ slug: pack.ad.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pack = getRolePack(slug);
  if (!pack) return {};
  return { title: pack.ad.seo.title, description: pack.ad.seo.description };
}

export default async function JobAdPage({ params }: Props) {
  const { slug } = await params;
  const pack = getRolePack(slug);
  if (!pack) notFound();
  const { ad } = pack;

  return (
    <main className="cine">
      <section className="ad-hero">
        <div className="container hero-choreo" style={{ maxWidth: '900px' }}>
          <Link
            href="/hiring"
            className="eyebrow"
            style={{ display: 'inline-block', marginBottom: '28px' }}
          >
            ← All roles
          </Link>
          <h1>{ad.title}</h1>
          <div className="ad-meta">
            <div>
              <div className="ad-meta__label">Date posted</div>
              <div>{ad.datePosted}</div>
            </div>
            <div>
              <div className="ad-meta__label">Team</div>
              <div>{ad.team}</div>
            </div>
            <div>
              <div className="ad-meta__label">Location</div>
              <div>{ad.location}</div>
            </div>
            <div>
              <div className="ad-meta__label">Type</div>
              <div>{ad.employmentType}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="container" style={{ maxWidth: '900px' }}>
        <Reveal>
          <section className="ad-section" style={{ marginTop: 0 }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>Job Summary</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '1.08rem' }}>{ad.summary}</p>
          </section>
        </Reveal>

        <Reveal>
          <section className="ad-section">
            <p className="eyebrow">{ad.role.eyebrow}</p>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>Your Role</h2>
            {ad.role.paragraphs.map((text) => (
              <p key={text.slice(0, 40)} style={{ color: 'var(--text-dim)' }}>
                {text}
              </p>
            ))}
          </section>
        </Reveal>

        <Reveal>
          <section className="ad-section">
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>Ideal Candidate</h2>
            <ul>
              {ad.idealCandidate.map((item) => (
                <li key={item.slice(0, 40)}>{item}</li>
              ))}
            </ul>
          </section>
        </Reveal>

        <Reveal>
          <section className="ad-section">
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>Requirements</h2>
            {ad.requirements.map((req) => (
              <div key={req.title} className="req-card">
                <h3 style={{ marginBottom: 0 }}>{req.title}</h3>
                <p className="req-card__tagline">{req.tagline}</p>
                <p>{req.body}</p>
              </div>
            ))}
          </section>
        </Reveal>

        <Reveal>
          <section className="ad-section">
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>
              What You&apos;ll Do
            </h2>
            {ad.whatYoullDo.map((item, i) => (
              <div key={item.slice(0, 40)} className="do-item">
                <span className="do-item__num">{String(i + 1).padStart(3, '0')}</span>
                <span>{item}</span>
              </div>
            ))}
          </section>
        </Reveal>

        <Reveal>
          <section className="ad-section">
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>
              You Shouldn&apos;t Apply If
            </h2>
            <ul>
              {ad.shouldntApply.map((item) => (
                <li key={item.slice(0, 40)}>{item}</li>
              ))}
            </ul>
          </section>
        </Reveal>

        <Reveal>
          <div className="cta-band">
            <h2>Think you&apos;re a fit? Apply today.</h2>
            <p style={{ color: 'var(--text-dim)', margin: '0 auto 30px' }}>
              The application takes 10 to 20 focused minutes. Thorough answers
              move you forward.
            </p>
            <ApplyLink slug={ad.slug}>Apply now</ApplyLink>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
