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
      setResult(
        res.ok ? `${label}: ${JSON.stringify(data)}` : `Failed: ${data.error ?? res.status}`,
      );
    } catch {
      setResult('Request failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="adm-input"
          type="email"
          placeholder="applicant@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-label="Applicant email"
        />
        <button
          type="button"
          className="adm-btn"
          disabled={busy || !email.includes('@')}
          onClick={() => call('/api/admin/privacy', { email }, 'Deleted')}
        >
          Delete applicant data
        </button>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="adm-btn"
          disabled={busy}
          onClick={() => call('/api/admin/maintenance', { action: 'purge' }, 'Purged')}
        >
          Run retention purge
        </button>
        <button
          type="button"
          className="adm-btn"
          disabled={busy}
          onClick={() =>
            call('/api/admin/maintenance', { action: 'retry-webhooks' }, 'Webhooks')
          }
        >
          Retry failed webhooks
        </button>
      </div>
      <p className="adm-cell-sub" style={{ minHeight: '1.4em' }}>
        {result ||
          'Delete is permanent and covers applications, drafts, and events (POPIA/GDPR).'}
      </p>
    </div>
  );
}
