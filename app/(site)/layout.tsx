import Link from 'next/link';

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
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
    </>
  );
}
