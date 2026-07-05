// Outbound webhook reliability: one delivery row per submission, attempted
// immediately, retryable via the maintenance endpoint.

import { prisma } from '../db';

const MAX_ATTEMPTS = 5;
const TIMEOUT_MS = 10_000;

export async function enqueueDelivery(applicationId: string): Promise<string | null> {
  const url = process.env.WEBHOOK_URL;
  if (!url) return null;

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
  });
  if (!application) return null;

  const payload = JSON.stringify({
    id: application.id,
    slug: application.slug,
    role: application.role,
    outcome: application.outcome,
    email: application.email,
    country: application.country,
    referral: application.referral,
    createdAt: application.createdAt,
  });

  const delivery = await prisma.webhookDelivery.create({
    data: { applicationId, url, payload },
  });
  return delivery.id;
}

export async function attemptDelivery(deliveryId: string): Promise<boolean> {
  const delivery = await prisma.webhookDelivery.findUnique({ where: { id: deliveryId } });
  if (!delivery || delivery.status === 'delivered') return delivery?.status === 'delivered';

  try {
    const response = await fetch(delivery.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: delivery.payload,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: 'delivered', attempts: { increment: 1 }, deliveredAt: new Date() },
    });
    return true;
  } catch (error) {
    const attempts = delivery.attempts + 1;
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
        attempts,
        lastError: error instanceof Error ? error.message.slice(0, 300) : 'unknown',
      },
    });
    return false;
  }
}

export async function retryUndelivered(): Promise<{ retried: number; delivered: number }> {
  const rows = await prisma.webhookDelivery.findMany({
    where: { status: { in: ['pending', 'failed'] }, attempts: { lt: MAX_ATTEMPTS } },
    take: 50,
  });
  let delivered = 0;
  for (const row of rows) {
    if (await attemptDelivery(row.id)) delivered++;
  }
  return { retried: rows.length, delivered };
}
