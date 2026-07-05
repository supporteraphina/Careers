'use client';

// Apply CTA that carries campaign tags from the ad page into the funnel.
// The funnel records utm_* / ref only from its own URL (see Funnel.tsx), so a
// plain /apply link would drop paid-traffic attribution at the click. Reading
// window.location in an effect keeps the ad pages statically generated.

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface ApplyLinkProps {
  slug: string;
  children: React.ReactNode;
}

export default function ApplyLink({ slug, children }: ApplyLinkProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kept = new URLSearchParams();
    for (const [key, value] of params) {
      if (key.startsWith('utm_') || key === 'ref') kept.append(key, value);
    }
    const qs = kept.toString();
    if (qs) setQuery(`?${qs}`);
  }, []);

  return (
    <Link href={`/apply/${slug}${query}`} className="btn">
      {children}
    </Link>
  );
}
