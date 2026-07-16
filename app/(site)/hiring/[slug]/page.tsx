import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import ApplyLink from '../../../../components/ApplyLink';
import Reveal from '../../../../components/Reveal';
import { getRoleImage } from '@/lib/content/roleImages';
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

/** One advert row: label rail on the left, content on the right. */
function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Reveal>
      <section className="ad-block">
        <h2 className="ad-block__label">{label}</h2>
        <div className="ad-block__body">{children}</div>
      </section>
    </Reveal>
  );
}

export default async function JobAdPage({ params }: Props) {
  const { slug } = await params;
  const pack = getRolePack(slug);
  if (!pack) notFound();
  const { ad } = pack;
  const image = getRoleImage(ad.slug);

  const meta = [
    { label: 'Date Posted', value: ad.datePosted },
    { label: 'Team', value: ad.team },
    { label: 'Location', value: ad.location },
    { label: 'Type', value: ad.employmentType },
  ];

  return (
    <main className="cine">
      <section className="ad-hero">
        <div className="container container--wide">
          <Link href="/hiring" className="eyebrow ad-hero__back">
            ← All roles
          </Link>
          <h1 className="ad-hero__title">{ad.title}</h1>

          <div className="ad-meta">
            {meta.map((m) => (
              <div key={m.label} className="ad-meta__item">
                <div className="ad-meta__label">{m.label}</div>
                <div className="ad-meta__value">{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {image && (
        <div className="container container--wide">
          <Reveal>
            <div className="ad-photo">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                priority
                quality={85}
                sizes="(max-width: 1760px) 100vw, 1760px"
              />
            </div>
          </Reveal>
        </div>
      )}

      <div className="container container--wide">
        <Block label="Job Summary">
          <p className="ad-lede">{ad.summary}</p>
        </Block>

        <Block label="Your Role">
          <h3 className="ad-block__heading">{ad.role.eyebrow}</h3>
          {ad.role.paragraphs.map((text) => (
            <p key={text.slice(0, 40)}>{text}</p>
          ))}
        </Block>

        <Block label="Ideal Candidate">
          <ul className="ad-list">
            {ad.idealCandidate.map((item) => (
              <li key={item.slice(0, 40)}>{item}</li>
            ))}
          </ul>
        </Block>

        <Block label="Requirements">
          {ad.requirements.map((req) => (
            <div key={req.title} className="req-card">
              <h3 style={{ marginBottom: 0 }}>{req.title}</h3>
              <p className="req-card__tagline">{req.tagline}</p>
              <p>{req.body}</p>
            </div>
          ))}
        </Block>

        <Block label="What You'll Do">
          {ad.whatYoullDo.map((item, i) => (
            <div key={item.slice(0, 40)} className="do-item">
              <span className="do-item__num">{String(i + 1).padStart(3, '0')}</span>
              <span>{item}</span>
            </div>
          ))}
        </Block>

        <Block label="You Shouldn't Apply If">
          <ul className="ad-list">
            {ad.shouldntApply.map((item) => (
              <li key={item.slice(0, 40)}>{item}</li>
            ))}
          </ul>
        </Block>

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
