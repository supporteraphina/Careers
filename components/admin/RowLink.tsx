'use client';

import { useRouter } from 'next/navigation';

/** Clickable table row: whole-row navigation without nesting links. */
export default function RowLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <tr
      onClick={(event) => {
        const target = event.target as HTMLElement;
        // Let real links, buttons, and form controls do their own thing.
        if (target.closest('a, button, select, input, textarea, label')) return;
        router.push(href);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target === event.currentTarget) {
          router.push(href);
        }
      }}
      tabIndex={0}
      style={{ cursor: 'pointer' }}
    >
      {children}
    </tr>
  );
}
