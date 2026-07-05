// POPIA/GDPR obligations: delete-by-email and retention purge.
// See docs/backend-architecture.md and the public privacy policy (12 months).

import { prisma } from '../db';
import { retentionCutoff } from './transform';

const RETENTION_MONTHS = 12;
const DRAFT_IDLE_DAYS = 30;

export async function deleteByEmail(email: string) {
  const applications = await prisma.application.findMany({
    where: { email },
    select: { id: true, sessionId: true },
  });
  const sessionIds = applications
    .map((a) => a.sessionId)
    .filter((s): s is string => Boolean(s));

  const [events, drafts, apps] = await prisma.$transaction([
    prisma.funnelEvent.deleteMany({ where: { sessionId: { in: sessionIds } } }),
    prisma.draft.deleteMany({ where: { email } }),
    // Answer rows and webhook deliveries cascade with the application.
    prisma.application.deleteMany({ where: { email } }),
  ]);

  return { applications: apps.count, drafts: drafts.count, events: events.count };
}

export async function purge(now = new Date()) {
  const cutoff = retentionCutoff(now, RETENTION_MONTHS);
  const draftCutoff = new Date(now.getTime() - DRAFT_IDLE_DAYS * 24 * 60 * 60 * 1000);

  const [apps, drafts, events] = await prisma.$transaction([
    prisma.application.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.draft.deleteMany({ where: { updatedAt: { lt: draftCutoff } } }),
    prisma.funnelEvent.deleteMany({ where: { createdAt: { lt: cutoff } } }),
  ]);

  return { applications: apps.count, drafts: drafts.count, events: events.count, cutoff };
}
