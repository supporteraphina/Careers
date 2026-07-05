import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="container" style={{ paddingTop: '96px' }}>
      <p className="eyebrow">Halevora</p>
      <h1 style={{ maxWidth: '15em' }}>
        We build the teams behind the internet&apos;s biggest creators.
      </h1>
      <p style={{ maxWidth: '42em', color: 'var(--text-dim)', fontSize: '1.1rem' }}>
        Halevora runs the content, support, and growth engines for top online
        creators. Remote-first, senior by default, judged on output. If you want
        work that ships every day, start with our open roles.
      </p>
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '28px' }}>
        <Link href="/hiring" className="btn">
          View open roles
        </Link>
        <Link href="/hiring/south-african-talent" className="btn btn--ghost">
          South African talent
        </Link>
      </div>
    </main>
  );
}
