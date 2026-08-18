// Submission service: re-validates a run and persists it transactionally.
// See docs/backend-architecture.md §Flows.

import { prisma } from '../db';
import type { RolePack } from '../content/types';
import { evaluateSubmission } from '../engine/submission';
import type { Answers } from '../engine/types';
import { meetsMinimumDuration, voiceNoteIdFrom } from '../voice/format';
import { flattenAnswers } from './transform';

export interface SubmissionMeta {
  utm?: Record<string, string>;
  referrerUrl?: string | null;
  ip?: string | null;
  lang?: string | null;
  sessionId?: string | null;
  draftToken?: string | null;
}

export type SubmissionOutcome =
  | { ok: false; errors: Record<string, string> }
  | { ok: true; applicationId: string; endingId: string | null };

function firstAnswer(answers: Answers, id: string): string | null {
  const value = answers[id];
  if (value === undefined || String(value).trim() === '') return null;
  return String(value);
}

export async function createApplication(
  pack: RolePack,
  answers: Answers,
  meta: SubmissionMeta,
): Promise<SubmissionOutcome> {
  const result = evaluateSubmission(pack.form, answers);
  if (!result.ok) return { ok: false, errors: result.errors };

  const fields = pack.form.pages.flatMap((p) => p.fields ?? []);

  // The runner can only check that an audio answer is shaped like one of our
  // links. Confirm here that the recording exists, and belongs to this form's
  // field, so a hand-written payload cannot submit a voice note that is not
  // there — or point at somebody else's.
  const voiceNoteIds: string[] = [];
  for (const field of fields) {
    if (field.type !== 'audio') continue;
    const answer = answers[field.id];
    if (answer === undefined || String(answer).trim() === '') continue;

    const noteId = voiceNoteIdFrom(String(answer));
    const note = noteId
      ? await prisma.voiceNote.findUnique({
          where: { id: noteId },
          select: { id: true, slug: true, fieldId: true, durationMs: true },
        })
      : null;

    if (!note || note.slug !== pack.form.slug || note.fieldId !== field.id) {
      return {
        ok: false,
        errors: { [field.id]: 'Record your voice note before continuing.' },
      };
    }
    // Recordings made before the field grew a floor, or under an earlier one,
    // are still in the table and still linkable. Check the stored take.
    if (!meetsMinimumDuration(note.durationMs, field.minSeconds)) {
      return {
        ok: false,
        errors: {
          [field.id]: `Your recording is too short. Record at least ${field.minSeconds} seconds.`,
        },
      };
    }
    voiceNoteIds.push(note.id);
  }
  const referralField = fields.find((f) => /referr/.test(f.id) && f.type === 'single_choice');
  const referralAnswer = referralField ? answers[referralField.id] : undefined;
  const referral =
    referralAnswer !== undefined && String(referralAnswer).toLowerCase().startsWith('yes');
  const incomeField = fields.find((f) => /income/.test(f.id) && f.type === 'number');
  const incomeRaw = incomeField ? Number(answers[incomeField.id]) : NaN;

  const application = await prisma.$transaction(async (tx) => {
    await tx.formSnapshot.upsert({
      where: { slug_version: { slug: pack.form.slug, version: pack.form.version } },
      update: {},
      create: {
        slug: pack.form.slug,
        version: pack.form.version,
        definition: JSON.stringify(pack.form),
      },
    });

    const created = await tx.application.create({
      data: {
        slug: pack.ad.slug,
        role: pack.ad.title,
        formVersion: pack.form.version,
        outcome: result.outcome ?? 'standard',
        firstName: firstAnswer(answers, 'first_name'),
        lastName: firstAnswer(answers, 'last_name'),
        email: firstAnswer(answers, 'email'),
        country: firstAnswer(answers, 'country'),
        incomeUsd: Number.isFinite(incomeRaw) ? incomeRaw : null,
        referral,
        answers: JSON.stringify(answers),
        path: JSON.stringify(result.path),
        utm:
          meta.utm && Object.keys(meta.utm).length > 0 ? JSON.stringify(meta.utm) : null,
        referrerUrl: meta.referrerUrl?.slice(0, 500) ?? null,
        ip: meta.ip ?? null,
        lang: meta.lang?.slice(0, 100) ?? null,
        sessionId: meta.sessionId?.slice(0, 64) ?? null,
        answerRows: { create: flattenAnswers(pack.form, answers) },
      },
    });

    if (meta.sessionId) {
      await tx.funnelEvent.create({
        data: {
          sessionId: meta.sessionId.slice(0, 64),
          slug: pack.ad.slug,
          pageId: result.endingId ?? 'end',
          kind: result.outcome === 'dq' ? 'dq' : 'submit',
          formVersion: pack.form.version,
        },
      });
    }

    if (meta.draftToken) {
      await tx.draft.deleteMany({ where: { token: meta.draftToken } });
    }

    // Claimed recordings are attached to a real application; the rest are
    // abandoned takes for the retention purge to collect.
    if (voiceNoteIds.length > 0) {
      await tx.voiceNote.updateMany({
        where: { id: { in: voiceNoteIds } },
        data: { claimedAt: new Date() },
      });
    }

    return created;
  });

  return { ok: true, applicationId: application.id, endingId: result.endingId };
}
