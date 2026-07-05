import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import './admin.css';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="adm-shell">
      <header className="adm-topbar">
        <Link href="/admin" className="adm-topbar__brand">
          HALEVORA <em>/ ADMIN</em>
        </Link>
        <AdminNav />
        <div className="adm-topbar__side">
          <a href="/admin/export">Export CSV</a>
          <Link href="/hiring" target="_blank">
            View site ↗
          </Link>
        </div>
      </header>
      <div className="adm-container">{children}</div>
    </div>
  );
}
