import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Funnel from '../../../components/Funnel.js';
import { getRolePack, getRolePacks } from '../../../lib/content/roles.js';

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getRolePacks().map((pack) => ({ slug: pack.ad.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pack = getRolePack(slug);
  if (!pack) return {};
  return {
    title: `Apply: ${pack.ad.title} | Halevora`,
    description: pack.ad.seo.description,
    robots: { index: false },
  };
}

export default async function ApplyPage({ params }: Props) {
  const { slug } = await params;
  const pack = getRolePack(slug);
  if (!pack) notFound();

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: '18px',
          left: '24px',
          zIndex: 30,
        }}
      >
        <Link href={`/hiring/${pack.ad.slug}`} className="wordmark">
          HALEVORA
        </Link>
      </div>
      <Funnel form={pack.form} />
    </>
  );
}
