import type { Metadata } from 'next';
import Link from 'next/link';
import { getRolePacks } from '@/lib/content/roles';
import { prisma } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Funnel Drop-off | Halevora Admin',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

export default async function FunnelStatsPage() {
  const [enterCounts, endCounts, packs] = await Promise.all([
    prisma.funnelEvent.groupBy({
      by: ['slug', 'pageId'],
      where: { kind: 'enter' },
      _count: { _all: true },
    }),
    prisma.funnelEvent.groupBy({
      by: ['slug', 'kind'],
      where: { kind: { in: ['submit', 'dq'] } },
      _count: { _all: true },
    }),
    Promise.resolve(getRolePacks()),
  ]);

  const enters = new Map(
    enterCounts.map((row) => [`${row.slug}:${row.pageId}`, row._count._all]),
  );
  const ends = new Map(
    endCounts.map((row) => [`${row.slug}:${row.kind}`, row._count._all]),
  );

  return (
    <main className="container" style={{ paddingTop: '48px', maxWidth: '1240px' }}>
      <p className="eyebrow">Admin</p>
      <h1 style={{ fontSize: '1.8rem' }}>Funnel drop-off</h1>

      <div className="admin-nav">
        <Link href="/admin" className="pill">
          Applications
        </Link>
        <Link href="/admin/funnel" className="pill pill--accent">
          Funnel drop-off
        </Link>
      </div>

      <p style={{ color: 'var(--text-dim)', maxWidth: '60ch' }}>
        Page views per funnel step. The percentage is against the intro page,
        so every falling number is an applicant lost on that exact question.
      </p>

      {packs.map((pack) => {
        const start = enters.get(`${pack.form.slug}:${pack.form.pages[0].id}`) ?? 0;
        const submits = ends.get(`${pack.form.slug}:submit`) ?? 0;
        const dqs = ends.get(`${pack.form.slug}:dq`) ?? 0;
        if (start === 0 && submits === 0 && dqs === 0) return null;

        return (
          <section key={pack.form.slug} style={{ margin: '44px 0' }}>
            <h3>
              {pack.ad.title}{' '}
              <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>
                · {submits} submitted · {dqs} dq
              </span>
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Page</th>
                    <th>Title</th>
                    <th>Entered</th>
                    <th>Of start</th>
                  </tr>
                </thead>
                <tbody>
                  {pack.form.pages
                    .filter((page) => page.kind !== 'ending')
                    .map((page, i) => {
                      const count = enters.get(`${pack.form.slug}:${page.id}`) ?? 0;
                      const pct = start > 0 ? Math.round((count / start) * 100) : 0;
                      return (
                        <tr key={page.id}>
                          <td>{String(i + 1).padStart(2, '0')}</td>
                          <td>{page.id}</td>
                          <td style={{ whiteSpace: 'normal' }}>{page.title.slice(0, 70)}</td>
                          <td>{count}</td>
                          <td>{start > 0 ? `${pct}%` : '—'}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {enterCounts.length === 0 && (
        <p style={{ color: 'var(--text-faint)' }}>No funnel events recorded yet.</p>
      )}
    </main>
  );
}
