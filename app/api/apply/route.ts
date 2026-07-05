import { NextResponse } from 'next/server';
import { getRolePack } from '../../../lib/content/roles';
import type { Answers } from '../../../lib/engine/types';
import { createApplication } from '../../../lib/server/applications';
import { attemptDelivery, enqueueDelivery } from '../../../lib/server/webhooks';

// Naive per-IP rate limit; enough for a single-instance deployment.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

interface ApplyPayload {
  slug?: string;
  answers?: Answers;
  utm?: Record<string, string>;
  referrerUrl?: string;
  sessionId?: string;
  draftToken?: string;
  /** Honeypot. Any content means a bot filled the hidden field. */
  website?: string;
}

export async function POST(request: Request) {
  let payload: ApplyPayload;
  try {
    payload = (await request.json()) as ApplyPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Bots that fill the honeypot get a fake success and no stored row.
  if (payload.website) {
    return NextResponse.json({ ok: true });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Too many submissions' }, { status: 429 });
  }

  const pack = payload.slug ? getRolePack(payload.slug) : undefined;
  if (!pack || typeof payload.answers !== 'object' || payload.answers === null) {
    return NextResponse.json({ error: 'Unknown role or missing answers' }, { status: 400 });
  }

  const result = await createApplication(pack, payload.answers, {
    utm: payload.utm,
    referrerUrl: payload.referrerUrl,
    ip,
    lang: request.headers.get('accept-language'),
    sessionId: payload.sessionId,
    draftToken: payload.draftToken,
  });

  if (!result.ok) {
    return NextResponse.json({ error: 'Validation failed', fields: result.errors }, { status: 400 });
  }

  // Delivery is recorded transactionally-adjacent and attempted once here;
  // failures stay pending for the maintenance retry. Never blocks the applicant.
  const deliveryId = await enqueueDelivery(result.applicationId).catch(() => null);
  if (deliveryId) {
    attemptDelivery(deliveryId).catch(() => {});
  }

  return NextResponse.json({ ok: true, endingId: result.endingId });
}
