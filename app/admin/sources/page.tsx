import type { Metadata } from 'next';
import { prisma } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Traffic Sources | Halevora Admin',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

/** Technical source label: utm_source beats referrer host beats Direct. */
function technicalSource(utm: string | null, referrerUrl: string | null): string {
  if (utm) {
    try {
      const parsed = JSON.parse(utm) as Record<string, string>;
      if (parsed.utm_source) return `utm: ${parsed.utm_source}`;
      if (parsed.ref) return `ref: ${parsed.ref}`;
    } catch {
      // fall through to referrer
    }
  }
  if (referrerUrl) {
    try {
      const host = new URL(referrerUrl).hostname.replace(/^www\./, '');
      if (host && host !== 'localhost') return host;
    } catch {
      // ignore unparseable referrers
    }
  }
  return 'Direct / unknown';
}

function BarTable({
  title,
  note,
  rows,
}: {
  title: string;
  note: string;
  rows: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const total = rows.reduce((a, b) => a + b.count, 0);

  return (
    <section className="adm-panel" style={{ marginBottom: '18px' }}>
      <p className="adm-section-title">{title}</p>
      <p className="adm-cell-sub" style={{ marginBottom: '12px' }}>
        {note}
      </p>
      {rows.length === 0 ? (
        <p className="adm-cell-sub">No data yet.</p>
      ) : (
        rows.map((row) => (
          <div key={row.label} className="adm-bar-row">
            <span className="adm-bar-row__num">
              {total > 0 ? `${Math.round((row.count / total) * 100)}%` : '—'}
            </span>
            <span className="adm-bar-row__label" title={row.label}>
              {row.label}
            </span>
            <div className="adm-bar">
              <div className="adm-bar__fill" style={{ width: `${(row.count / max) * 100}%` }} />
            </div>
            <span className="adm-bar-row__num">{row.count}</span>
          </div>
        ))
      )}
    </section>
  );
}

export default async function SourcesPage() {
  const [selfReported, applications] = await Promise.all([
    prisma.answer.groupBy({
      by: ['value'],
      where: { fieldId: 'traffic_source' },
      _count: { _all: true },
    }),
    prisma.application.findMany({
      select: { utm: true, referrerUrl: true },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    }),
  ]);

  const reportedRows = selfReported
    .map((row) => ({ label: row.value, count: row._count._all }))
    .sort((a, b) => b.count - a.count);

  const technicalCounts = new Map<string, number>();
  for (const app of applications) {
    const label = technicalSource(app.utm, app.referrerUrl);
    technicalCounts.set(label, (technicalCounts.get(label) ?? 0) + 1);
  }
  const technicalRows = [...technicalCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <main>
      <h1 className="adm-title">Traffic sources</h1>
      <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem', margin: '8px 0 22px' }}>
        Two views of the same applicants: what the link data says, and what they told us.
        Big gaps between the two usually mean untagged links — add utm_source to every
        placement you pay for.
      </p>

      <BarTable
        title="Self-reported"
        note='Answers to "Where did you find this role?" across all submissions.'
        rows={reportedRows}
      />

      <BarTable
        title="Measured"
        note="utm_source parameter when present, otherwise the referring site, otherwise direct."
        rows={technicalRows}
      />
    </main>
  );
}
