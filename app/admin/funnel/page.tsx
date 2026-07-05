import type { Metadata } from 'next';
import Link from 'next/link';
import { getRolePacks } from '@/lib/content/roles';
import { prisma } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Funnel | Halevora Admin',
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
  const ends = new Map(endCounts.map((row) => [`${row.slug}:${row.kind}`, row._count._all]));

  const sections = packs
    .map((pack) => {
      const steps = pack.form.pages
        .filter((page) => page.kind !== 'ending')
        .map((page, i) => ({
          index: i + 1,
          id: page.id,
          title: page.title,
          count: enters.get(`${pack.form.slug}:${page.id}`) ?? 0,
        }));
      const start = steps[0]?.count ?? 0;
      const submits = ends.get(`${pack.form.slug}:submit`) ?? 0;
      const dqs = ends.get(`${pack.form.slug}:dq`) ?? 0;

      // The step with the largest absolute loss from its predecessor.
      let worstDrop = -1;
      let worstIndex = -1;
      steps.forEach((step, i) => {
        if (i === 0) return;
        const loss = steps[i - 1].count - step.count;
        if (loss > worstDrop && loss > 0) {
          worstDrop = loss;
          worstIndex = i;
        }
      });

      return { pack, steps, start, submits, dqs, worstIndex };
    })
    .filter((section) => section.start > 0 || section.submits > 0 || section.dqs > 0);

  return (
    <main>
      <h1 className="adm-title">Funnel drop-off</h1>
      <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem', margin: '8px 0 22px' }}>
        Views per step, as a share of the intro. The amber bar is the step losing the most
        applicants. Counts link to the matching applications.
      </p>

      {sections.length === 0 && (
        <div className="adm-table-wrap">
          <div className="adm-empty">
            No funnel events yet. They record automatically as soon as someone opens an
            application.
          </div>
        </div>
      )}

      {sections.map(({ pack, steps, start, submits, dqs, worstIndex }) => (
        <section key={pack.form.slug} className="adm-panel" style={{ marginBottom: '18px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '14px',
              flexWrap: 'wrap',
              marginBottom: '12px',
            }}
          >
            <h2 className="adm-title" style={{ fontSize: '0.98rem' }}>
              {pack.ad.title}
            </h2>
            <span className="adm-cell-sub">
              {start} started ·{' '}
              <Link
                href={`/admin?slug=${pack.ad.slug}`}
                style={{ color: 'var(--accent)' }}
              >
                {submits} submitted
              </Link>{' '}
              ·{' '}
              <Link
                href={`/admin?slug=${pack.ad.slug}&outcome=dq`}
                style={{ color: 'var(--accent)' }}
              >
                {dqs} dq
              </Link>
              {start > 0 && <> · {Math.round((submits / start) * 100)}% conversion</>}
            </span>
          </div>

          {steps.map((step, i) => {
            const pct = start > 0 ? Math.round((step.count / start) * 100) : 0;
            const prevCount = i > 0 ? steps[i - 1].count : step.count;
            const stepPct =
              prevCount > 0 ? Math.round((step.count / prevCount) * 100) : 100;
            return (
              <div
                key={step.id}
                className={`adm-bar-row${i === worstIndex ? ' adm-bar-row--drop' : ''}`}
              >
                <span className="adm-bar-row__num">{String(step.index).padStart(2, '0')}</span>
                <span className="adm-bar-row__label" title={step.title}>
                  {step.title.replace(/\{[a-z0-9_]+\}/gi, '').trim() || step.id}
                </span>
                <div className="adm-bar">
                  <div className="adm-bar__fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="adm-bar-row__num" title={`${stepPct}% of previous step`}>
                  {step.count} · {pct}%
                </span>
              </div>
            );
          })}
        </section>
      ))}
    </main>
  );
}
