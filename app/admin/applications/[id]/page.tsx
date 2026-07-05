import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import NoteEditor from '@/components/admin/NoteEditor';
import ReviewControl from '@/components/admin/ReviewControl';
import { prisma } from '@/lib/db';
import type { Answers, FormDefinition } from '@/lib/engine/types';

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

  const snapshot = await prisma.formSnapshot.findUnique({
    where: {
      slug_version: { slug: application.slug, version: application.formVersion },
    },
  });

  const answers = JSON.parse(application.answers) as Answers;
  const path = JSON.parse(application.path) as string[];
  const form = snapshot ? (JSON.parse(snapshot.definition) as FormDefinition) : null;
  const visited = new Set(path);

  // Question/answer pairs in form order, restricted to visited pages.
  const qa =
    form?.pages
      .filter((page) => visited.has(page.id))
      .flatMap((page) =>
        (page.fields ?? []).map((field) => ({
          pageTitle: page.title,
          label: field.label,
          value: answers[field.id],
        })),
      )
      .filter((row) => row.value !== undefined && String(row.value).trim() !== '') ?? [];

  return (
    <main className="container" style={{ paddingTop: '48px', maxWidth: '900px' }}>
      <Link href="/admin" className="eyebrow" style={{ display: 'inline-block', marginBottom: '22px' }}>
        ← All applications
      </Link>
      <h1 style={{ fontSize: '2rem' }}>
        {[application.firstName, application.lastName].filter(Boolean).join(' ') ||
          'Unnamed applicant'}
      </h1>
      <p style={{ color: 'var(--text-dim)' }}>
        {application.role} · {application.email ?? 'no email'}
      </p>

      <div className="ad-meta">
        <div>
          <div className="ad-meta__label">Submitted</div>
          <div>{application.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</div>
        </div>
        <div>
          <div className="ad-meta__label">Outcome</div>
          <div>{application.outcome === 'dq' ? 'DQ path' : 'Standard'}</div>
        </div>
        <div>
          <div className="ad-meta__label">Country</div>
          <div>{application.country ?? '—'}</div>
        </div>
        <div>
          <div className="ad-meta__label">Income USD</div>
          <div>{application.incomeUsd ?? '—'}</div>
        </div>
        <div>
          <div className="ad-meta__label">Referral</div>
          <div>{application.referral ? 'Yes' : 'No'}</div>
        </div>
        <div>
          <div className="ad-meta__label">Source</div>
          <div style={{ overflowWrap: 'anywhere' }}>
            {application.utm ?? application.referrerUrl ?? 'Direct'}
          </div>
        </div>
        <div>
          <div className="ad-meta__label">Status</div>
          <ReviewControl id={application.id} initialStatus={application.reviewStatus} />
        </div>
      </div>

      {qa.length === 0 ? (
        <p style={{ color: 'var(--text-faint)' }}>
          No form snapshot found for this application; raw answers below.
        </p>
      ) : (
        qa.map((row, i) => (
          <section key={`${row.label}-${i}`} style={{ margin: '34px 0' }}>
            <p className="eyebrow" style={{ marginBottom: '6px' }}>
              {row.pageTitle.replace(/\{[a-z0-9_]+\}/gi, '').trim() || row.label}
            </p>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.92rem', marginBottom: '8px' }}>
              {row.label}
            </div>
            <p style={{ fontSize: '1.08rem', whiteSpace: 'pre-line' }}>
              {Array.isArray(row.value) ? row.value.join(', ') : String(row.value)}
            </p>
            <hr className="hairline" style={{ marginTop: '26px' }} />
          </section>
        ))
      )}

      {qa.length === 0 && (
        <pre
          style={{
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '20px',
            overflowX: 'auto',
            fontSize: '0.85rem',
          }}
        >
          {JSON.stringify(answers, null, 2)}
        </pre>
      )}

      <div style={{ margin: '40px 0 80px' }}>
        <NoteEditor id={application.id} initialNote={application.reviewNote ?? ''} />
      </div>
    </main>
  );
}
