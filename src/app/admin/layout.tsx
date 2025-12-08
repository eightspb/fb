'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { LayoutDashboard, FileText, Calendar, LogOut, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // Check for bypass cookie first (local dev fallback)
      const bypassCookie = document.cookie.split('; ').find(row => row.startsWith('sb-admin-bypass='));
      const bypassStorage = typeof window !== 'undefined' ? localStorage.getItem('sb-admin-bypass') : null;
      
      if (bypassCookie || bypassStorage === 'true') {
        setIsAuthenticated(true);
        if (pathname === '/admin/login') {
          router.replace('/admin');
        }
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session && pathname !== '/admin/login') {
        router.replace('/admin/login');
      } else if (session && pathname === '/admin/login') {
        router.replace('/admin');
      } else {
        setIsAuthenticated(!!session);
      }
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Re-check bypass on auth change events too
      const bypassStorage = localStorage.getItem('sb-admin-bypass');
      if (bypassStorage === 'true') return;

      if (!session && pathname !== '/admin/login') {
        router.replace('/admin/login');
        setIsAuthenticated(false);
      } else if (session && pathname === '/admin/login') {
        router.replace('/admin');
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(!!session);
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  const handleLogout = async () => {
    // Clear bypass
    document.cookie = "sb-admin-bypass=; path=/; max-age=0";
    localStorage.removeItem('sb-admin-bypass');
    
    await supabase.auth.signOut();
    router.replace('/admin/login');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
  }

  // If on login page, just render children
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // If not authenticated (and not on login page - handled by redirect), don't render content
  if (!isAuthenticated) {
    return null;
  }

  const navItems = [
    { href: '/admin', label: 'Главная', icon: LayoutDashboard },
    { href: '/admin/news', label: 'Новости', icon: FileText },
    { href: '/admin/conferences', label: 'Мероприятия', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center">
        <span className="font-bold text-lg">Админ-панель</span>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="p-6 border-b">
              <h2 className="font-bold text-xl">Меню</h2>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    pathname === item.href
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-4 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 mt-auto"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5" />
                Выход
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r min-h-screen">
        <div className="p-6 border-b">
          <h1 className="font-bold text-xl">Админ-панель</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            Выход
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
