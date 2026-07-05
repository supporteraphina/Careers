import Image from 'next/image';
import Link from 'next/link';
import Reveal from '../../components/Reveal';
import { getRolePacks } from '@/lib/content/roles';

const DISCIPLINES = [
  {
    name: 'Content & Editing',
    desc: 'Short-form editors and vlog storytellers cutting daily output that millions watch.',
  },
  {
    name: 'Design',
    desc: 'Brand systems, social assets, and interfaces that make creators look inevitable.',
  },
  {
    name: 'Marketing & Copy',
    desc: 'Direct-response writing and growth strategy that turns audiences into revenue.',
  },
  {
    name: 'Support & Community',
    desc: 'Fast, human client service that keeps communities loyal at scale.',
  },
  {
    name: 'Engineering & Operations',
    desc: 'The tools, pipelines, and processes the whole machine runs on.',
  },
];

export default function HomePage() {
  const openRoles = getRolePacks().length;

  return (
    <main className="cine">
      <section className="hero mesh">
        <div className="container hero-choreo">
          <p className="eyebrow">Halevora — Careers</p>
          <h1 style={{ maxWidth: '13em' }}>
            The team behind the internet&apos;s biggest creators.
          </h1>
          <p className="hero__sub">
            Halevora runs the content, growth, and support engines for top
            online creators. Remote-first. Senior by default. Judged on output,
            nothing else.
          </p>
          <div className="hero__ctas">
            <Link href="/hiring" className="btn">
              View open roles
            </Link>
            <Link href="/hiring/south-african-talent" className="btn btn--ghost">
              South African talent
            </Link>
          </div>
        </div>
      </section>

      <section className="section--tight">
        <div className="container container--wide">
          <Reveal>
            <div className="photo" style={{ aspectRatio: '21 / 9' }}>
              <Image
                src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=2400&q=85"
                alt="A creator studio at night, consoles and instruments under violet light"
                fill
                quality={85}
                sizes="(max-width: 1760px) 100vw, 1760px"
              />
              <span className="photo__caption">Where the work happens</span>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal>
            <p className="statement">
              We are a small team with an <em>outsized footprint</em>. Every
              seat here moves numbers you can see from orbit.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section--tight">
        <div className="container">
          <Reveal>
            {DISCIPLINES.map((d) => (
              <div key={d.name} className="discipline">
                <div className="discipline__name">{d.name}</div>
                <p className="discipline__desc">{d.desc}</p>
                <span className="discipline__count">Remote · Full time</span>
              </div>
            ))}
          </Reveal>
          <Reveal delay={1}>
            <div style={{ marginTop: '34px' }}>
              <Link href="/hiring" className="btn btn--ghost">
                {openRoles} roles open now
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container container--wide">
          <Reveal>
            <div className="sa-band">
              <div className="sa-band__bg">
                <Image
                  src="https://images.unsplash.com/photo-1576485375217-d6a95e34d043?auto=format&fit=crop&w=2400&q=85"
                  alt="The Twelve Apostles above Camps Bay at golden hour, Cape Town"
                  fill
                  quality={85}
                  sizes="(max-width: 1760px) 100vw, 1760px"
                />
              </div>
              <div className="sa-band__content">
                <p className="eyebrow">South Africa</p>
                <h2>Our next hub is built around South African talent.</h2>
                <p style={{ color: 'var(--text-dim)' }}>
                  One hour off CET. English-first. Relentless standards. We are
                  hiring across every department, with equipment stipends,
                  backup-power support, and a ZAR-stable payout schedule.
                </p>
                <Link
                  href="/hiring/south-african-talent"
                  className="btn"
                  style={{ marginTop: '10px' }}
                >
                  Join the talent pool
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="split">
            <Reveal>
              <div className="photo" style={{ aspectRatio: '4 / 3' }}>
                <Image
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=85"
                  alt="The team heads-down around one table, laptops open"
                  fill
                  sizes="(max-width: 720px) 100vw, 700px"
                />
              </div>
            </Reveal>
            <Reveal delay={1}>
              <p className="eyebrow">How we work</p>
              <h2>No meetings about meetings.</h2>
              <p style={{ color: 'var(--text-dim)' }}>
                One daily call per team. Clear owners. Work ships the same week
                it is scoped. People who need hand-holding find us exhausting;
                people who want trajectory call it the best seat they ever took.
              </p>
              <p style={{ color: 'var(--text-dim)' }}>
                If that sounds like your pace, there is a role with your name on
                it.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal>
            <div className="cta-band">
              <h2>Pick your lane.</h2>
              <p style={{ color: 'var(--text-dim)', margin: '0 auto 30px' }}>
                Seven roles open. Every application gets read by a human.
              </p>
              <Link href="/hiring" className="btn">
                View open roles
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
