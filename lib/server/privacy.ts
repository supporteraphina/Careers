// POPIA/GDPR obligations: delete-by-email and retention purge.
// See docs/backend-architecture.md and the public privacy policy (12 months).

import { prisma } from '../db';
import type { Answers } from '../engine/types';
import { voiceNoteIdFrom } from '../voice/format';
import { retentionCutoff } from './transform';

const RETENTION_MONTHS = 12;
const DRAFT_IDLE_DAYS = 30;
/** An unclaimed recording is an abandoned take; it never became an application. */
const UNCLAIMED_VOICE_HOURS = 24;

/**
 * Voice note ids referenced by a set of applications. Recordings are not a
 * relation — the link lives inside the answers JSON — so an erasure request has
 * to read them out before the applications go.
 */
function voiceNoteIdsIn(rows: Array<{ answers: string }>): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    let answers: Answers;
    try {
      answers = JSON.parse(row.answers) as Answers;
    } catch {
      continue;
    }
    for (const value of Object.values(answers)) {
      if (Array.isArray(value)) continue;
      const id = voiceNoteIdFrom(String(value));
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

export async function deleteByEmail(email: string) {
  const applications = await prisma.application.findMany({
    where: { email },
    select: { id: true, sessionId: true, answers: true },
  });
  const sessionIds = applications
    .map((a) => a.sessionId)
    .filter((s): s is string => Boolean(s));
  const voiceNoteIds = voiceNoteIdsIn(applications);

  const [events, drafts, voice, apps] = await prisma.$transaction([
    prisma.funnelEvent.deleteMany({ where: { sessionId: { in: sessionIds } } }),
    prisma.draft.deleteMany({ where: { email } }),
    prisma.voiceNote.deleteMany({ where: { id: { in: voiceNoteIds } } }),
    // Answer rows and webhook deliveries cascade with the application.
    prisma.application.deleteMany({ where: { email } }),
  ]);

  return {
    applications: apps.count,
    drafts: drafts.count,
    events: events.count,
    voiceNotes: voice.count,
  };
}

export async function purge(now = new Date()) {
  const cutoff = retentionCutoff(now, RETENTION_MONTHS);
  const draftCutoff = new Date(now.getTime() - DRAFT_IDLE_DAYS * 24 * 60 * 60 * 1000);
  const unclaimedCutoff = new Date(now.getTime() - UNCLAIMED_VOICE_HOURS * 60 * 60 * 1000);

  // Recordings attached to expiring applications, read before those rows go.
  const expiring = await prisma.application.findMany({
    where: { createdAt: { lt: cutoff } },
    select: { answers: true },
  });
  const expiringVoiceIds = voiceNoteIdsIn(expiring);

  const [apps, drafts, events, voice] = await prisma.$transaction([
    prisma.application.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.draft.deleteMany({ where: { updatedAt: { lt: draftCutoff } } }),
    prisma.funnelEvent.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.voiceNote.deleteMany({
      where: {
        OR: [
          { id: { in: expiringVoiceIds } },
          // Takes nobody ever submitted: recorded, then abandoned mid-funnel.
          { claimedAt: null, createdAt: { lt: unclaimedCutoff } },
        ],
      },
    }),
  ]);

  return {
    applications: apps.count,
    drafts: drafts.count,
    events: events.count,
    voiceNotes: voice.count,
    cutoff,
  };
}
