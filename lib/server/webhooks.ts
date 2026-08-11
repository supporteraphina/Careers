// Outbound webhook reliability: one delivery row per submission, attempted
// immediately, retryable via the maintenance endpoint.

import { prisma } from '../db';
import {
  airtableConfig,
  airtableEndpoint,
  buildAirtableRecord,
  isAirtableUrl,
} from './airtable';

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

/**
 * Queue the Airtable mirror of a submission. Same delivery rows as the generic
 * webhook, so a push that fails while Airtable is down is retried rather than
 * lost, and the failure is visible in the same place.
 */
export async function enqueueAirtable(applicationId: string): Promise<string | null> {
  const config = airtableConfig();
  if (!config) return null;

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, role: true, createdAt: true, utm: true, answers: true },
  });
  if (!application) return null;

  const delivery = await prisma.webhookDelivery.create({
    data: {
      applicationId,
      url: airtableEndpoint(config.baseId, config.tableId),
      payload: JSON.stringify(buildAirtableRecord(application)),
    },
  });
  return delivery.id;
}

export async function attemptDelivery(deliveryId: string): Promise<boolean> {
  const delivery = await prisma.webhookDelivery.findUnique({ where: { id: deliveryId } });
  if (!delivery || delivery.status === 'delivered') return delivery?.status === 'delivered';

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (isAirtableUrl(delivery.url)) {
    const config = airtableConfig();
    // No key configured means the row cannot be delivered by this instance;
    // leave it pending so a later deploy with the key set picks it up.
    if (!config) return false;
    headers.authorization = `Bearer ${config.apiKey}`;
  }

  try {
    const response = await fetch(delivery.url, {
      method: 'POST',
      headers,
      body: delivery.payload,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      // Airtable explains rejected records in the body; keep it for the admin.
      const detail = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}${detail ? ` ${detail.slice(0, 200)}` : ''}`);
    }
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
