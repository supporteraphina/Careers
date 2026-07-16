import Image from 'next/image';
import Link from 'next/link';
import type { RolePack } from '@/lib/content/types';
import { getRoleImage } from '@/lib/content/roleImages';

function PinIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function CaseIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function isFeaturedRole(pack: RolePack) {
  return pack.ad.team === 'Halevora';
}

/** Orders roles so the featured (talent pool) card lands last. */
export function orderRolePacks(packs: RolePack[]) {
  return [
    ...packs.filter((p) => !isFeaturedRole(p)),
    ...packs.filter((p) => isFeaturedRole(p)),
  ];
}

export default function RoleCard({ pack }: { pack: RolePack }) {
  const featured = isFeaturedRole(pack);
  const image = getRoleImage(pack.ad.slug);

  return (
    <Link
      href={`/hiring/${pack.ad.slug}`}
      className={`role-card${featured ? ' role-card--featured' : ''}`}
    >
      {image && (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          loading="eager"
          quality={featured ? 85 : 75}
          sizes={
            featured
              ? '(max-width: 2200px) 97vw, 2140px'
              : '(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw'
          }
        />
      )}
      <span className="role-card__scrim" />
      <span className="role-card__title">{pack.ad.title}</span>
      <span className="role-card__badges">
        {featured && (
          <span className="role-card__badge role-card__badge--accent">
            Talent pool
          </span>
        )}
        <span className="role-card__badge">
          <PinIcon />
          {pack.ad.location}
        </span>
        <span className="role-card__badge">
          <CaseIcon />
          {pack.ad.employmentType}
        </span>
      </span>
    </Link>
  );
}
