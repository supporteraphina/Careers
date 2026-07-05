import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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
    <main className="container" style={{ paddingTop: '64px', maxWidth: '860px' }}>
      <Link href="/hiring" className="eyebrow" style={{ display: 'inline-block', marginBottom: '26px' }}>
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

      <section className="ad-section">
        <h3>Job Summary</h3>
        <p style={{ color: 'var(--text-dim)' }}>{ad.summary}</p>
      </section>

      <section className="ad-section">
        <p className="eyebrow">{ad.role.eyebrow}</p>
        <h3>Your Role</h3>
        {ad.role.paragraphs.map((text) => (
          <p key={text.slice(0, 40)} style={{ color: 'var(--text-dim)' }}>
            {text}
          </p>
        ))}
      </section>

      <section className="ad-section">
        <h3>Ideal Candidate</h3>
        <ul>
          {ad.idealCandidate.map((item) => (
            <li key={item.slice(0, 40)}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="ad-section">
        <h3>Requirements</h3>
        {ad.requirements.map((req) => (
          <div key={req.title} className="req-card">
            <h3 style={{ marginBottom: 0 }}>{req.title}</h3>
            <p className="req-card__tagline">{req.tagline}</p>
            <p>{req.body}</p>
          </div>
        ))}
      </section>

      <section className="ad-section">
        <h3>What You&apos;ll Do</h3>
        {ad.whatYoullDo.map((item, i) => (
          <div key={item.slice(0, 40)} className="do-item">
            <span className="do-item__num">{String(i + 1).padStart(3, '0')}</span>
            <span>{item}</span>
          </div>
        ))}
      </section>

      <section className="ad-section">
        <h3>You Shouldn&apos;t Apply If</h3>
        <ul>
          {ad.shouldntApply.map((item) => (
            <li key={item.slice(0, 40)}>{item}</li>
          ))}
        </ul>
      </section>

      <div className="cta-band">
        <h2>Think you&apos;re a fit? Apply today.</h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: '26px' }}>
          The application takes 10 to 20 focused minutes. Thorough answers move
          you forward.
        </p>
        <Link href={`/apply/${ad.slug}`} className="btn">
          Apply now
        </Link>
      </div>
    </main>
  );
}
