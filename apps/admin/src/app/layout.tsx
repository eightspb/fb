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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Chivo:wght@400;700;900&family=Noto+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <FetchBasePatch />
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
