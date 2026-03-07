import type { Metadata } from 'next';
import './globals.css';
import AdminShell from '@/components/admin/AdminShell';
import { FetchBasePatch } from '@/components/admin/FetchBasePatch';

export const metadata: Metadata = {
  title: {
    default: 'Админ-панель',
    template: '%s | Админ-панель',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        <FetchBasePatch />
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
