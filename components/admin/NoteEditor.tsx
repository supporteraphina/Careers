'use client';

import { useState } from 'react';

export default function NoteEditor({
  id,
  initialNote,
}: {
  id: string;
  initialNote: string;
}) {
  const [note, setNote] = useState(initialNote);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const save = async () => {
    setState('saving');
    try {
      const res = await fetch(`/api/admin/applications/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reviewNote: note }),
      });
      setState(res.ok ? 'saved' : 'error');
    } catch {
      setState('error');
    }
  };

  return (
    <div>
      <textarea
        className="adm-textarea"
        aria-label="Review note"
        placeholder="Private note for future you…"
        value={note}
        onChange={(event) => {
          setNote(event.target.value);
          setState('idle');
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
        <button type="button" className="adm-btn" onClick={save} disabled={state === 'saving'}>
          {state === 'saving' ? 'Saving…' : 'Save note'}
        </button>
        <span className="adm-cell-sub">
          {state === 'saved' ? 'Saved.' : state === 'error' ? 'Save failed.' : ''}
        </span>
      </div>
    </div>
  );
}
