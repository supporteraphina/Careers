import type { Metadata } from 'next';
import { Barlow_Condensed, Fragment_Mono, Hanken_Grotesk } from 'next/font/google';
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

const display = Barlow_Condensed({
  variable: '--font-display',
  weight: ['500', '600'],
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
    <html lang="en" className={`${sans.variable} ${mono.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
