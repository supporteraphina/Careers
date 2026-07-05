import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import NoteEditor from '@/components/admin/NoteEditor';
import ReviewControl from '@/components/admin/ReviewControl';
import ReviewKeys from '@/components/admin/ReviewKeys';
import { prisma } from '@/lib/db';
import type { Answers, FormDefinition } from '@/lib/engine/types';
import { relativeTime } from '@/lib/server/format';

export const metadata: Metadata = {
  title: 'Application | Halevora Admin',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ApplicationPage({ params }: Props) {
  const { id } = await params;
  const application = await prisma.application.findUnique({ where: { id } });
  if (!application) notFound();

  const [snapshot, deliveries, prev, next, newerCount, total] = await Promise.all([
    prisma.formSnapshot.findUnique({
      where: {
        slug_version: { slug: application.slug, version: application.formVersion },
      },
    }),
    prisma.webhookDelivery.findMany({ where: { applicationId: id }, take: 5 }),
    prisma.application.findFirst({
      where: { createdAt: { gt: application.createdAt } },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    }),
    prisma.application.findFirst({
      where: { createdAt: { lt: application.createdAt } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    }),
    prisma.application.count({ where: { createdAt: { gt: application.createdAt } } }),
    prisma.application.count(),
  ]);

  const answers = JSON.parse(application.answers) as Answers;
  const path = JSON.parse(application.path) as string[];
  const form = snapshot ? (JSON.parse(snapshot.definition) as FormDefinition) : null;
  const visited = new Set(path);

  const qa =
    form?.pages
      .filter((page) => visited.has(page.id))
      .flatMap((page) =>
        (page.fields ?? []).map((field) => ({
          label: field.label,
          value: answers[field.id],
        })),
      )
      .filter((row) => row.value !== undefined && String(row.value).trim() !== '') ?? [];

  // For DQ runs: the last question answered before the exit.
  const dqTrigger =
    application.outcome === 'dq' && form
      ? [...path]
          .reverse()
          .map((pageId) => form.pages.find((p) => p.id === pageId))
          .find((page) => (page?.fields ?? []).length > 0)
      : null;

  const name =
    [application.firstName, application.lastName].filter(Boolean).join(' ') ||
    'Unnamed applicant';

  return (
    <main>
      <ReviewKeys id={id} prevId={prev?.id ?? null} nextId={next?.id ?? null} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap',
          marginBottom: '18px',
        }}
      >
        <Link href="/admin" className="adm-btn">
          ← Queue
        </Link>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h1 className="adm-title">{name}</h1>
          <span className="adm-cell-sub">
            {application.role} · applied {relativeTime(application.createdAt)}
          </span>
        </div>
        <span style={{ color: 'var(--text-faint)', fontSize: '0.8rem' }}>
          {newerCount + 1} of {total}
        </span>
        {prev && (
          <Link href={`/admin/applications/${prev.id}`} className="adm-btn">
            ← Prev
          </Link>
        )}
        {next && (
          <Link href={`/admin/applications/${next.id}`} className="adm-btn">
            Next →
          </Link>
        )}
      </div>

      {dqTrigger && (
        <div
          className="adm-panel"
          style={{ borderColor: 'var(--adm-status-shortlisted)', marginBottom: '18px' }}
        >
          <p className="adm-section-title" style={{ color: 'var(--adm-status-shortlisted)' }}>
            Auto-disqualified at this question
          </p>
          <p className="adm-qa__q">{dqTrigger.fields?.[0]?.label}</p>
          <p className="adm-qa__a">
            {String(answers[dqTrigger.fields?.[0]?.id ?? ''] ?? '—')}
          </p>
          <p className="adm-cell-sub" style={{ marginTop: '8px' }}>
            The applicant saw a normal thank-you page. Override by setting a status on the
            right; the flag stays for reporting.
          </p>
        </div>
      )}

      <div className="adm-review">
        <div className="adm-panel">
          {qa.length === 0 ? (
            <>
              <p className="adm-section-title">Raw answers</p>
              <pre style={{ overflowX: 'auto', fontSize: '0.8rem', margin: 0 }}>
                {JSON.stringify(answers, null, 2)}
              </pre>
            </>
          ) : (
            qa.map((row, i) => (
              <div key={`${row.label}-${i}`} className="adm-qa">
                <p className="adm-qa__q">{row.label}</p>
                <p className="adm-qa__a">
                  {Array.isArray(row.value) ? row.value.join(', ') : String(row.value)}
                </p>
              </div>
            ))
          )}
        </div>

        <aside className="adm-side">
          <div className="adm-panel">
            <p className="adm-section-title">Decision</p>
            <ReviewControl id={application.id} initialStatus={application.reviewStatus} />
            <p className="adm-cell-sub" style={{ marginTop: '10px' }}>
              <span className="adm-kbd">S</span> shortlist · <span className="adm-kbd">X</span>{' '}
              reject · <span className="adm-kbd">H</span> hire ·{' '}
              <span className="adm-kbd">J</span>/<span className="adm-kbd">K</span> next/prev
            </p>
          </div>

          <div className="adm-panel">
            <p className="adm-section-title">Details</p>
            <dl className="adm-meta-list">
              <dt>Email</dt>
              <dd>
                {application.email ? (
                  <a href={`mailto:${application.email}`} style={{ color: 'var(--accent)' }}>
                    {application.email}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
              <dt>Country</dt>
              <dd>{application.country ?? '—'}</dd>
              <dt>Income USD</dt>
              <dd>{application.incomeUsd ?? '—'}</dd>
              <dt>Referral</dt>
              <dd>{application.referral ? 'Yes' : 'No'}</dd>
              <dt>Outcome</dt>
              <dd>{application.outcome === 'dq' ? 'DQ path' : 'Completed'}</dd>
              <dt>Source</dt>
              <dd>{application.utm ?? application.referrerUrl ?? 'Direct'}</dd>
              <dt>Submitted</dt>
              <dd>{application.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</dd>
              <dt>Pages seen</dt>
              <dd>{path.length}</dd>
              {deliveries.length > 0 && (
                <>
                  <dt>Webhook</dt>
                  <dd>
                    {deliveries[0].status} ({deliveries[0].attempts} attempt
                    {deliveries[0].attempts === 1 ? '' : 's'})
                  </dd>
                </>
              )}
            </dl>
          </div>

          <div className="adm-panel">
            <p className="adm-section-title">Notes</p>
            <NoteEditor id={application.id} initialNote={application.reviewNote ?? ''} />
          </div>
        </aside>
      </div>
    </main>
  );
}
