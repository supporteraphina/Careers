'use client';

import { useState } from 'react';

export default function DataControls() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);

  const call = async (path: string, body: object, label: string) => {
    setBusy(true);
    setResult('');
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      setResult(res.ok ? `${label}: ${JSON.stringify(data)}` : `Failed: ${data.error ?? res.status}`);
    } catch {
      setResult('Request failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-controls">
      <h3>Data controls</h3>
      <div className="admin-controls__row">
        <input
          className="funnel-input"
          style={{ maxWidth: '320px', fontSize: '0.95rem' }}
          type="email"
          placeholder="applicant@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-label="Applicant email"
        />
        <button
          type="button"
          className="btn btn--ghost"
          disabled={busy || !email.includes('@')}
          onClick={() => call('/api/admin/privacy', { email }, 'Deleted')}
        >
          Delete applicant data
        </button>
      </div>
      <div className="admin-controls__row">
        <button
          type="button"
          className="btn btn--ghost"
          disabled={busy}
          onClick={() => call('/api/admin/maintenance', { action: 'purge' }, 'Purged')}
        >
          Run retention purge
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={busy}
          onClick={() =>
            call('/api/admin/maintenance', { action: 'retry-webhooks' }, 'Webhooks')
          }
        >
          Retry failed webhooks
        </button>
      </div>
      <p className="funnel-help" style={{ minHeight: '1.4em' }}>
        {result || 'Delete is permanent and covers applications, drafts, and events.'}
      </p>
    </div>
  );
}
