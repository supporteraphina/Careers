import { NextResponse } from 'next/server';
import { getRolePack } from '../../../lib/content/roles';
import type { Answers } from '../../../lib/engine/types';
import { deleteDraft, getDraft, saveDraft } from '../../../lib/server/drafts';

interface DraftPayload {
  token?: string;
  slug?: string;
  pageId?: string;
  answers?: Answers;
  history?: string[];
}

export async function POST(request: Request) {
  let payload: DraftPayload;
  try {
    payload = (await request.json()) as DraftPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const pack = payload.slug ? getRolePack(payload.slug) : undefined;
  if (!pack || !payload.pageId || typeof payload.answers !== 'object') {
    return NextResponse.json({ error: 'Invalid draft' }, { status: 400 });
  }
  if (!pack.form.pages.some((p) => p.id === payload.pageId)) {
    return NextResponse.json({ error: 'Unknown page' }, { status: 400 });
  }

  const saved = await saveDraft({
    token: payload.token,
    slug: pack.ad.slug,
    pageId: payload.pageId,
    answers: payload.answers ?? {},
    history: Array.isArray(payload.history) ? payload.history.slice(0, 60) : [],
  });
  if (!saved) return NextResponse.json({ error: 'Draft too large' }, { status: 413 });

  return NextResponse.json({ ok: true, token: saved.token });
}

export async function DELETE(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token || !/^[a-f0-9-]{36}$/.test(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }
  const count = await deleteDraft(token);
  return NextResponse.json({ ok: true, count });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token || !/^[a-f0-9-]{36}$/.test(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }
  const draft = await getDraft(token);
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, draft });
}
