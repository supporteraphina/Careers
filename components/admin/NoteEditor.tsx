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
      <label className="funnel-label" htmlFor="review-note">
        Review note
      </label>
      <textarea
        id="review-note"
        className="funnel-textarea"
        style={{ minHeight: '90px' }}
        value={note}
        onChange={(event) => {
          setNote(event.target.value);
          setState('idle');
        }}
      />
      <div className="funnel-nav" style={{ marginTop: '12px' }}>
        <button type="button" className="btn btn--ghost" onClick={save} disabled={state === 'saving'}>
          {state === 'saving' ? 'Saving…' : 'Save note'}
        </button>
        <span className="funnel-help">
          {state === 'saved' ? 'Saved.' : state === 'error' ? 'Save failed.' : ''}
        </span>
      </div>
    </div>
  );
}
