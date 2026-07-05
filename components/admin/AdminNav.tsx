'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Applications' },
  { href: '/admin/funnel', label: 'Funnel' },
  { href: '/admin/sources', label: 'Sources' },
  { href: '/admin/data', label: 'Data' },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="adm-nav" aria-label="Admin">
      {LINKS.map((link) => {
        const current =
          link.href === '/admin'
            ? pathname === '/admin' || pathname.startsWith('/admin/applications')
            : pathname.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href} aria-current={current ? 'page' : undefined}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
