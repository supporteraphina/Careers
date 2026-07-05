import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { getRolePack } from '../../../lib/content/roles';
import { evaluateSubmission } from '../../../lib/engine/submission';
import type { Answers } from '../../../lib/engine/types';

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
  /** Honeypot. Any content means a bot filled the hidden field. */
  website?: string;
}

function firstAnswer(answers: Answers, ...ids: string[]): string | null {
  for (const id of ids) {
    const value = answers[id];
    if (value !== undefined && String(value).trim() !== '') return String(value);
  }
  return null;
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

  const answers = payload.answers;
  const result = evaluateSubmission(pack.form, answers);
  if (!result.ok) {
    return NextResponse.json({ error: 'Validation failed', fields: result.errors }, { status: 400 });
  }

  // Flags derived from the form definition, since field ids vary per pack.
  const fields = pack.form.pages.flatMap((p) => p.fields ?? []);
  const referralField = fields.find((f) => /referr/.test(f.id) && f.type === 'single_choice');
  const referralAnswer = referralField ? answers[referralField.id] : undefined;
  const referral =
    referralAnswer !== undefined && String(referralAnswer).toLowerCase().startsWith('yes');
  const incomeField = fields.find((f) => /income/.test(f.id) && f.type === 'number');
  const incomeRaw = incomeField ? Number(answers[incomeField.id]) : NaN;

  const application = await prisma.application.create({
    data: {
      slug: pack.ad.slug,
      role: pack.ad.title,
      outcome: result.outcome ?? 'standard',
      firstName: firstAnswer(answers, 'first_name'),
      lastName: firstAnswer(answers, 'last_name'),
      email: firstAnswer(answers, 'email'),
      country: firstAnswer(answers, 'country'),
      incomeUsd: Number.isFinite(incomeRaw) ? incomeRaw : null,
      referral,
      answers: JSON.stringify(answers),
      path: JSON.stringify(result.path),
      utm: payload.utm && Object.keys(payload.utm).length > 0 ? JSON.stringify(payload.utm) : null,
      referrerUrl: payload.referrerUrl?.slice(0, 500) ?? null,
      ip,
      lang: request.headers.get('accept-language')?.slice(0, 100) ?? null,
    },
  });

  // Outbound webhook (Make.com compatible), fire-and-forget.
  const webhookUrl = process.env.WEBHOOK_URL;
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: application.id,
        slug: application.slug,
        role: application.role,
        outcome: application.outcome,
        email: application.email,
        country: application.country,
        referral: application.referral,
        createdAt: application.createdAt,
      }),
    }).catch(() => {
      // A webhook failure must never fail the applicant's submission.
    });
  }

  return NextResponse.json({ ok: true, endingId: result.endingId });
}
