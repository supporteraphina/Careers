import type { Metadata } from 'next';
import Link from 'next/link';
import { getRolePacks } from '@/lib/content/roles';
import { prisma } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Applications | Halevora Admin',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ slug?: string; outcome?: string }>;
}

export default async function AdminPage({ searchParams }: Props) {
  const { slug, outcome } = await searchParams;
  const where = {
    ...(slug ? { slug } : {}),
    ...(outcome ? { outcome } : {}),
  };
  const [applications, packs] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    Promise.resolve(getRolePacks()),
  ]);

  const filterLink = (params: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    const merged = { slug, outcome, ...params };
    for (const [key, value] of Object.entries(merged)) {
      if (value) query.set(key, value);
    }
    const text = query.toString();
    return text ? `/admin?${text}` : '/admin';
  };

  return (
    <main className="container" style={{ paddingTop: '48px', maxWidth: '1200px' }}>
      <p className="eyebrow">Admin</p>
      <h1 style={{ fontSize: '1.8rem' }}>Applications</h1>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '18px 0 26px' }}>
        <Link href={filterLink({ slug: undefined })} className={`pill${!slug ? ' pill--accent' : ''}`}>
          All roles
        </Link>
        {packs.map((pack) => (
          <Link
            key={pack.ad.slug}
            href={filterLink({ slug: pack.ad.slug })}
            className={`pill${slug === pack.ad.slug ? ' pill--accent' : ''}`}
          >
            {pack.ad.title}
          </Link>
        ))}
        <span style={{ width: '18px' }} />
        <Link
          href={filterLink({ outcome: outcome === 'dq' ? undefined : 'dq' })}
          className={`pill${outcome === 'dq' ? ' pill--accent' : ''}`}
        >
          DQ only
        </Link>
        <a href="/admin/export" className="pill">
          Export CSV
        </a>
      </div>

      {applications.length === 0 ? (
        <p style={{ color: 'var(--text-faint)' }}>No applications yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Role</th>
                <th>Name</th>
                <th>Email</th>
                <th>Country</th>
                <th>Income USD</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <td>{app.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</td>
                  <td>{app.role}</td>
                  <td>
                    {[app.firstName, app.lastName].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td>{app.email ?? '—'}</td>
                  <td>{app.country ?? '—'}</td>
                  <td>{app.incomeUsd ?? '—'}</td>
                  <td>
                    {app.outcome === 'dq' && <span className="pill">DQ path</span>}{' '}
                    {app.referral && <span className="pill pill--accent">Referral</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
