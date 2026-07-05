import type { Metadata } from 'next';
import Link from 'next/link';
import ReviewControl from '@/components/admin/ReviewControl';
import RowLink from '@/components/admin/RowLink';
import { getRolePacks } from '@/lib/content/roles';
import { prisma } from '@/lib/db';
import { answerExcerpt, relativeTime } from '@/lib/server/format';

export const metadata: Metadata = {
  title: 'Applications | Halevora Admin',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;
const STATUS_TABS = ['all', 'new', 'shortlisted', 'hired', 'rejected'] as const;

interface Props {
  searchParams: Promise<{
    q?: string;
    slug?: string;
    status?: string;
    outcome?: string;
    page?: string;
    dir?: string;
  }>;
}

export default async function AdminPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (params.q ?? '').trim().toLowerCase();
  const slug = params.slug ?? '';
  const status = STATUS_TABS.includes(params.status as never) ? params.status! : 'all';
  const dqOnly = params.outcome === 'dq';
  const dir = params.dir === 'asc' ? 'asc' : 'desc';
  const pageNum = Math.max(1, Number(params.page) || 1);

  const baseWhere = {
    ...(slug ? { slug } : {}),
    ...(dqOnly ? { outcome: 'dq' } : {}),
  };

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [rows, statusCounts, weekCount, packs] = await Promise.all([
    prisma.application.findMany({
      where: { ...baseWhere, ...(status !== 'all' ? { reviewStatus: status } : {}) },
      orderBy: { createdAt: dir },
      take: 500,
    }),
    prisma.application.groupBy({
      by: ['reviewStatus'],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.application.count({ where: { ...baseWhere, createdAt: { gte: weekAgo } } }),
    Promise.resolve(getRolePacks()),
  ]);

  const counts = new Map(statusCounts.map((r) => [r.reviewStatus, r._count._all]));
  const total = [...counts.values()].reduce((a, b) => a + b, 0);

  const filtered = q
    ? rows.filter((r) =>
        [r.firstName, r.lastName, r.email, r.country]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      )
    : rows;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pageNum, pageCount);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const link = (overrides: Record<string, string | undefined>) => {
    const merged: Record<string, string | undefined> = {
      q: params.q,
      slug,
      status,
      outcome: dqOnly ? 'dq' : undefined,
      dir: dir === 'asc' ? 'asc' : undefined,
      ...overrides,
    };
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value && value !== 'all') query.set(key, value);
    }
    const text = query.toString();
    return text ? `/admin?${text}` : '/admin';
  };

  return (
    <main>
      <h1 className="adm-title">Applications</h1>

      <div className="adm-stats">
        <div className="adm-stat">
          <span className="adm-stat__value">{total}</span>
          <span className="adm-stat__label">total</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__value">{counts.get('new') ?? 0}</span>
          <span className="adm-stat__label">awaiting review</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__value">{weekCount}</span>
          <span className="adm-stat__label">last 7 days</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__value">{counts.get('shortlisted') ?? 0}</span>
          <span className="adm-stat__label">shortlisted</span>
        </div>
      </div>

      <div className="adm-tabs">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab}
            href={link({ status: tab, page: undefined })}
            className="adm-tab"
            aria-current={status === tab ? 'page' : undefined}
          >
            {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="adm-tab__count">
              {tab === 'all' ? total : (counts.get(tab) ?? 0)}
            </span>
          </Link>
        ))}
      </div>

      <form className="adm-toolbar" method="get" action="/admin">
        <input
          type="search"
          name="q"
          className="adm-input"
          placeholder="Search name, email, country…"
          defaultValue={params.q ?? ''}
          aria-label="Search applications"
        />
        <select name="slug" className="adm-select" defaultValue={slug} aria-label="Role">
          <option value="">All roles</option>
          {packs.map((pack) => (
            <option key={pack.ad.slug} value={pack.ad.slug}>
              {pack.ad.title}
            </option>
          ))}
        </select>
        {status !== 'all' && <input type="hidden" name="status" value={status} />}
        {dqOnly && <input type="hidden" name="outcome" value="dq" />}
        <button type="submit" className="adm-btn">
          Filter
        </button>
        <Link
          href={link({ outcome: dqOnly ? undefined : 'dq', page: undefined })}
          className="adm-btn"
          style={dqOnly ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
        >
          DQ only
        </Link>
        <Link href={link({ dir: dir === 'asc' ? undefined : 'asc', page: undefined })} className="adm-btn">
          {dir === 'asc' ? 'Oldest first ↑' : 'Newest first ↓'}
        </Link>
        {(q || slug || dqOnly || status !== 'all') && (
          <Link href="/admin" className="adm-btn">
            Clear
          </Link>
        )}
      </form>

      {visible.length === 0 ? (
        <div className="adm-table-wrap">
          <div className="adm-empty">
            {total === 0
              ? 'No applications yet. Share a role link to start collecting.'
              : 'Nothing matches this filter. Clear the search or switch tabs.'}
          </div>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Role</th>
                <th>Answer preview</th>
                <th>Country</th>
                <th style={{ textAlign: 'right' }}>Income USD</th>
                <th>Flags</th>
                <th>Status</th>
                <th>Applied</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((app) => {
                const excerpt = answerExcerpt(app.answers);
                return (
                  <RowLink key={app.id} href={`/admin/applications/${app.id}`}>
                    <td>
                      <Link href={`/admin/applications/${app.id}`}>
                        <span className="adm-cell-main">
                          {app.reviewStatus === 'new' && (
                            <span
                              className="adm-dot adm-dot--new"
                              style={{ display: 'inline-block', marginRight: '7px' }}
                              title="Awaiting review"
                            />
                          )}
                          {[app.firstName, app.lastName].filter(Boolean).join(' ') ||
                            'Unnamed'}
                        </span>
                        <span className="adm-cell-sub">{app.email ?? '—'}</span>
                      </Link>
                    </td>
                    <td>{app.role}</td>
                    <td
                      style={{
                        whiteSpace: 'normal',
                        maxWidth: '320px',
                        color: 'var(--text-faint)',
                        fontSize: '0.78rem',
                      }}
                    >
                      {excerpt || '—'}
                    </td>
                    <td>{app.country ?? '—'}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {app.incomeUsd ?? '—'}
                    </td>
                    <td>
                      {app.outcome === 'dq' && <span className="adm-flag">DQ path</span>}{' '}
                      {app.referral && (
                        <span className="adm-flag adm-flag--referral">Referral</span>
                      )}
                    </td>
                    <td>
                      <ReviewControl id={app.id} initialStatus={app.reviewStatus} />
                    </td>
                    <td title={app.createdAt.toISOString()}>{relativeTime(app.createdAt)}</td>
                  </RowLink>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <div className="adm-pager">
          <span>
            {filtered.length} result{filtered.length === 1 ? '' : 's'} · page {page} of{' '}
            {pageCount}
          </span>
          {page > 1 && (
            <Link href={link({ page: String(page - 1) })} className="adm-btn">
              ← Prev
            </Link>
          )}
          {page < pageCount && (
            <Link href={link({ page: String(page + 1) })} className="adm-btn">
              Next →
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
