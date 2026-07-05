// Funnel analytics events. Anonymous per-session page tracking; the
// sessionId lands on the Application row at submission.

import { prisma } from '../db';

export interface FunnelEventInput {
  sessionId: string;
  slug: string;
  pageId: string;
  kind: 'enter';
}

const MAX_BATCH = 25;

export async function recordEvents(batch: FunnelEventInput[]): Promise<number> {
  const clean = batch
    .filter(
      (e) =>
        typeof e.sessionId === 'string' &&
        typeof e.slug === 'string' &&
        typeof e.pageId === 'string' &&
        e.kind === 'enter',
    )
    .slice(0, MAX_BATCH)
    .map((e) => ({
      sessionId: e.sessionId.slice(0, 64),
      slug: e.slug.slice(0, 64),
      pageId: e.pageId.slice(0, 64),
      kind: 'enter',
    }));

  if (clean.length === 0) return 0;
  const result = await prisma.funnelEvent.createMany({ data: clean });
  return result.count;
}
