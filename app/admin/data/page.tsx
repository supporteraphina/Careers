import type { Metadata } from 'next';
import DataControls from '@/components/admin/DataControls';
import { prisma } from '@/lib/db';
import { relativeTime } from '@/lib/server/format';

export const metadata: Metadata = {
  title: 'Data | Halevora Admin',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

export default async function DataPage() {
  const [applications, drafts, events, snapshots, deliveries] = await Promise.all([
    prisma.application.count(),
    prisma.draft.count(),
    prisma.funnelEvent.count(),
    prisma.formSnapshot.count(),
    prisma.webhookDelivery.findMany({ orderBy: { createdAt: 'desc' }, take: 25 }),
  ]);

  const failed = deliveries.filter((d) => d.status !== 'delivered').length;

  return (
    <main>
      <h1 className="adm-title">Data</h1>

      <div className="adm-stats">
        <div className="adm-stat">
          <span className="adm-stat__value">{applications}</span>
          <span className="adm-stat__label">applications</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__value">{drafts}</span>
          <span className="adm-stat__label">open drafts</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__value">{events}</span>
          <span className="adm-stat__label">funnel events</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat__value">{snapshots}</span>
          <span className="adm-stat__label">form versions</span>
        </div>
      </div>

      <section className="adm-panel" style={{ marginBottom: '18px', maxWidth: '640px' }}>
        <p className="adm-section-title">Privacy and maintenance</p>
        <DataControls />
      </section>

      <section className="adm-panel">
        <p className="adm-section-title">
          Webhook deliveries {failed > 0 && `· ${failed} undelivered`}
        </p>
        {deliveries.length === 0 ? (
          <p className="adm-cell-sub">
            None yet. Set WEBHOOK_URL in .env to push each submission to Make.com.
          </p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Attempts</th>
                <th>Last error</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id}>
                  <td title={d.createdAt.toISOString()}>{relativeTime(d.createdAt)}</td>
                  <td>
                    <span className="adm-status">
                      <span
                        className={`adm-dot ${
                          d.status === 'delivered' ? 'adm-dot--hired' : 'adm-dot--shortlisted'
                        }`}
                      />
                      {d.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>{d.attempts}</td>
                  <td style={{ whiteSpace: 'normal', maxWidth: '360px' }}>
                    {d.lastError ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
