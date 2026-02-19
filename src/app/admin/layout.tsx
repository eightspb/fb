'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { LayoutDashboard, FileText, Calendar, LogOut, Menu, Inbox, Settings, Terminal, Bell } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getCsrfToken } from '@/lib/csrf-client';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [newRequestsCount, setNewRequestsCount] = useState(0);

  const fetchRequestsCount = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/requests/count', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setNewRequestsCount(data.new || 0);
      }
    } catch (error) {
      console.error('Failed to fetch requests count:', error);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check on login page
      if (pathname === '/admin/login') {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/admin/auth', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          setIsAuthenticated(true);
          // Fetch requests count after auth
          fetchRequestsCount();
          // Set bypass flag only for local development
          if (process.env.NODE_ENV !== 'production') {
            localStorage.setItem('sb-admin-bypass', 'true');
          }
        } else {
          localStorage.removeItem('sb-admin-bypass');
          router.replace('/admin/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/admin/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router, fetchRequestsCount]);

  // Периодическое обновление счётчика заявок (каждые 60 сек)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(fetchRequestsCount, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchRequestsCount]);

  const handleLogout = async () => {
    try {
      const csrfToken = await getCsrfToken();
      await fetch('/api/admin/auth', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'x-csrf-token': csrfToken,
        },
      });
      // Clear bypass flag on logout
      localStorage.removeItem('sb-admin-bypass');
    } catch (error) {
      console.error('Logout error:', error);
    }
    router.replace('/admin/login');
    setIsAuthenticated(false);
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
    { href: '/admin', label: 'Главная', icon: LayoutDashboard, badge: 0 },
    { href: '/admin/requests', label: 'Заявки', icon: Inbox, badge: newRequestsCount },
    { href: '/admin/news', label: 'Новости', icon: FileText, badge: 0 },
    { href: '/admin/conferences', label: 'Мероприятия', icon: Calendar, badge: 0 },
    { href: '/admin/banner', label: 'Баннер', icon: Bell, badge: 0 },
    { href: '/admin/logs', label: 'Логи', icon: Terminal, badge: 0 },
    { href: '/admin/settings', label: 'Настройки', icon: Settings, badge: 0 },
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
                  <span className="flex-1">{item.label}</span>
                  {item.badge > 0 && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      pathname === item.href 
                        ? 'bg-white text-slate-900' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.badge}
                    </span>
                  )}
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
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {item.badge > 0 && (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    isActive 
                      ? 'bg-white text-slate-900' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
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
