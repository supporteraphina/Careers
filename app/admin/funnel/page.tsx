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
      by: ['slug', 'pageId', 'formVersion'],
      where: { kind: 'enter' },
      _count: { _all: true },
    }),
    prisma.funnelEvent.groupBy({
      by: ['slug', 'kind', 'formVersion'],
      where: { kind: { in: ['submit', 'dq'] } },
      _count: { _all: true },
    }),
    Promise.resolve(getRolePacks()),
  ]);

  // Events carry the form version they were recorded against (null before
  // versioning). Counting only the live version keeps each funnel honest when
  // pages are added or removed; older traffic is summed separately as legacy.
  const enters = new Map<string, number>();
  const legacyEnters = new Map<string, number>();
  for (const pack of packs) {
    for (const row of enterCounts) {
      if (row.slug !== pack.form.slug) continue;
      const target = row.formVersion === pack.form.version ? enters : legacyEnters;
      const key = `${row.slug}:${row.pageId}`;
      target.set(key, (target.get(key) ?? 0) + row._count._all);
    }
  }
  const ends = new Map<string, number>();
  const legacyEnds = new Map<string, number>();
  for (const pack of packs) {
    for (const row of endCounts) {
      if (row.slug !== pack.form.slug) continue;
      const target = row.formVersion === pack.form.version ? ends : legacyEnds;
      const key = `${row.slug}:${row.kind}`;
      target.set(key, (target.get(key) ?? 0) + row._count._all);
    }
  }

  const sections = packs
    .map((pack) => {
      const livePageIds = new Set(pack.form.pages.map((page) => page.id));
      const titleById = new Map(pack.form.pages.map((page) => [page.id, page.title]));
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

      // Traffic recorded against earlier form versions, including pages that
      // no longer exist in the live definition.
      const legacySteps = [...legacyEnters.entries()]
        .filter(([key]) => key.startsWith(`${pack.form.slug}:`))
        .map(([key, count]) => {
          const id = key.slice(pack.form.slug.length + 1);
          return {
            id,
            title: titleById.get(id) ?? id,
            removed: !livePageIds.has(id),
            count,
          };
        })
        .sort((a, b) => b.count - a.count);
      const legacyStart = Math.max(0, ...legacySteps.map((step) => step.count));
      const legacySubmits = legacyEnds.get(`${pack.form.slug}:submit`) ?? 0;
      const legacyDqs = legacyEnds.get(`${pack.form.slug}:dq`) ?? 0;

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

      return {
        pack,
        steps,
        start,
        submits,
        dqs,
        worstIndex,
        legacySteps,
        legacyStart,
        legacySubmits,
        legacyDqs,
      };
    })
    .filter(
      (section) =>
        section.start > 0 ||
        section.submits > 0 ||
        section.dqs > 0 ||
        section.legacySteps.length > 0,
    );

  return (
    <main>
      <h1 className="adm-title">Funnel drop-off</h1>
      <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem', margin: '8px 0 22px' }}>
        Views per step for the live form version, as a share of the intro. The amber bar is
        the step losing the most applicants. Traffic from earlier form versions, including
        questions that no longer exist, is listed separately so it never skews the live
        numbers.
      </p>

      {sections.length === 0 && (
        <div className="adm-table-wrap">
          <div className="adm-empty">
            No funnel events yet. They record automatically as soon as someone opens an
            application.
          </div>
        </div>
      )}

      {sections.map(
        ({
          pack,
          steps,
          start,
          submits,
          dqs,
          worstIndex,
          legacySteps,
          legacyStart,
          legacySubmits,
          legacyDqs,
        }) => (
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
              {pack.ad.title}{' '}
              <span className="adm-cell-sub" style={{ fontWeight: 400 }}>
                v{pack.form.version}
              </span>
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

          {legacySteps.length > 0 && (
            <details className="adm-legacy">
              <summary className="adm-legacy__summary">
                Earlier form versions · {legacyStart} started · {legacySubmits} submitted ·{' '}
                {legacyDqs} dq
              </summary>
              {legacySteps.map((step) => {
                const pct =
                  legacyStart > 0 ? Math.round((step.count / legacyStart) * 100) : 0;
                return (
                  <div key={step.id} className="adm-bar-row">
                    <span className="adm-bar-row__num" />
                    <span className="adm-bar-row__label" title={step.title}>
                      {(step.title.replace(/\{[a-z0-9_]+\}/gi, '').trim() || step.id) +
                        (step.removed ? ' (removed)' : '')}
                    </span>
                    <div className="adm-bar">
                      <div className="adm-bar__fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="adm-bar-row__num">
                      {step.count} · {pct}%
                    </span>
                  </div>
                );
              })}
            </details>
          )}
        </section>
        ),
      )}
    </main>
  );
}
