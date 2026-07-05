import { prisma } from '@/lib/db.js';

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  const applications = await prisma.application.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const header = [
    'id',
    'createdAt',
    'slug',
    'role',
    'outcome',
    'firstName',
    'lastName',
    'email',
    'country',
    'incomeUsd',
    'referral',
    'utm',
    'referrerUrl',
    'answers',
  ];

  const rows = applications.map((app) =>
    [
      app.id,
      app.createdAt.toISOString(),
      app.slug,
      app.role,
      app.outcome,
      app.firstName,
      app.lastName,
      app.email,
      app.country,
      app.incomeUsd,
      app.referral,
      app.utm,
      app.referrerUrl,
      app.answers,
    ]
      .map(csvCell)
      .join(','),
  );

  const csv = [header.map(csvCell).join(','), ...rows].join('\r\n');

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="halevora-applications.csv"',
    },
  });
}
