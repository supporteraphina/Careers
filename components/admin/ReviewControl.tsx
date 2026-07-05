'use client';

import { useState } from 'react';

const STATUSES = ['new', 'shortlisted', 'rejected', 'hired'] as const;

export default function ReviewControl({
  id,
  initialStatus,
}: {
  id: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);

  const update = async (next: string) => {
    const previous = status;
    setStatus(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/applications/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reviewStatus: next }),
      });
      if (!res.ok) setStatus(previous);
    } catch {
      setStatus(previous);
    } finally {
      setSaving(false);
    }
  };

  return (
    <select
      className="admin-select"
      value={status}
      disabled={saving}
      onChange={(event) => update(event.target.value)}
      aria-label="Review status"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
