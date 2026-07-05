import type { Metadata } from 'next';
import { Fragment_Mono, Hanken_Grotesk } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const sans = Hanken_Grotesk({
  variable: '--font-sans',
  subsets: ['latin'],
});

const mono = Fragment_Mono({
  variable: '--font-mono',
  weight: '400',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Halevora Careers',
  description:
    'Halevora builds the teams behind top online creators. Browse open remote roles and apply.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <header className="site-header">
          <div className="container site-header__inner">
            <Link href="/" className="wordmark">
              HALEVORA
            </Link>
            <nav className="site-nav">
              <Link href="/">Home</Link>
              <Link href="/hiring">Open Roles</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="container">
            <div className="site-footer__links">
              <Link href="/policy/privacy">Privacy Policy</Link>
              <Link href="/policy/terms">Terms</Link>
            </div>
            <p style={{ margin: 0 }}>
              © {new Date().getFullYear()} Halevora. All rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
