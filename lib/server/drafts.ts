// Save-for-later drafts. The token is the capability; whoever holds the
// resume link holds the draft.

import { randomUUID } from 'node:crypto';
import { prisma } from '../db';
import type { Answers } from '../engine/types';

export interface DraftInput {
  token?: string | null;
  slug: string;
  pageId: string;
  answers: Answers;
  history: string[];
}

const MAX_DRAFT_BYTES = 64_000;

export async function saveDraft(input: DraftInput): Promise<{ token: string } | null> {
  const answersJson = JSON.stringify(input.answers ?? {});
  const historyJson = JSON.stringify(input.history ?? []);
  if (answersJson.length > MAX_DRAFT_BYTES || historyJson.length > MAX_DRAFT_BYTES) {
    return null;
  }
  const email =
    typeof input.answers?.email === 'string' && input.answers.email.includes('@')
      ? String(input.answers.email)
      : null;

  const token = input.token && /^[a-f0-9-]{36}$/.test(input.token) ? input.token : randomUUID();

  await prisma.draft.upsert({
    where: { token },
    update: { pageId: input.pageId, answers: answersJson, history: historyJson, email },
    create: {
      token,
      slug: input.slug,
      pageId: input.pageId,
      answers: answersJson,
      history: historyJson,
      email,
    },
  });

  return { token };
}

export async function deleteDraft(token: string): Promise<number> {
  const result = await prisma.draft.deleteMany({ where: { token } });
  return result.count;
}

export async function getDraft(token: string) {
  const draft = await prisma.draft.findUnique({ where: { token } });
  if (!draft) return null;
  return {
    slug: draft.slug,
    pageId: draft.pageId,
    answers: JSON.parse(draft.answers) as Answers,
    history: JSON.parse(draft.history) as string[],
  };
}
