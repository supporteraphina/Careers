'use client';

// Keyboard triage: j/→ next, k/← previous, S shortlist, X reject, H hire.
// Decisions auto-advance to the next application in the queue.

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const STATUS_KEYS: Record<string, string> = {
  s: 'shortlisted',
  x: 'rejected',
  h: 'hired',
  n: 'new',
};

export default function ReviewKeys({
  id,
  prevId,
  nextId,
}: {
  id: string;
  prevId: string | null;
  nextId: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    const onKey = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest('input, textarea, select') ||
        target.isContentEditable ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if ((key === 'arrowright' || key === 'j') && nextId) {
        event.preventDefault();
        router.push(`/admin/applications/${nextId}`);
        return;
      }
      if ((key === 'arrowleft' || key === 'k') && prevId) {
        event.preventDefault();
        router.push(`/admin/applications/${prevId}`);
        return;
      }
      const status = STATUS_KEYS[key];
      if (status) {
        event.preventDefault();
        await fetch(`/api/admin/applications/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ reviewStatus: status }),
        }).catch(() => {});
        if (nextId) router.push(`/admin/applications/${nextId}`);
        else router.refresh();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, prevId, nextId, router]);

  return null;
}
