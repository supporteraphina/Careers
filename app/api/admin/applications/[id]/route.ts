import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';

const STATUSES = new Set(['new', 'shortlisted', 'rejected', 'hired']);

interface ReviewPayload {
  reviewStatus?: string;
  reviewNote?: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let payload: ReviewPayload;
  try {
    payload = (await request.json()) as ReviewPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (payload.reviewStatus !== undefined && !STATUSES.has(payload.reviewStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  try {
    const updated = await prisma.application.update({
      where: { id },
      data: {
        ...(payload.reviewStatus !== undefined
          ? { reviewStatus: payload.reviewStatus, reviewedAt: new Date() }
          : {}),
        ...(payload.reviewNote !== undefined
          ? { reviewNote: payload.reviewNote.slice(0, 2000) }
          : {}),
      },
    });
    return NextResponse.json({ ok: true, reviewStatus: updated.reviewStatus });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
