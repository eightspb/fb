'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Главная',
    icon: '/admin/icons/icon-favorite-chart.svg',
  },
  {
    href: '/requests',
    label: 'Заявки',
    icon: '/admin/icons/icon-inbox.svg',
    hasBadge: true,
  },
  {
    href: '/contacts',
    label: 'Контакты',
    icon: '/admin/icons/icon-people.svg',
  },
  {
    href: '/news',
    label: 'Новости',
    icon: '/admin/icons/icon-cms.svg',
  },
  {
    href: '/conferences',
    label: 'Мероприятия',
    icon: '/admin/icons/icon-calendar-1.svg',
  },
  {
    href: '/banner',
    label: 'Баннер',
    icon: '/admin/icons/icon-notification-bing.svg',
  },
  {
    href: '/direct',
    label: 'Автоброкер',
    icon: '/admin/icons/icon-analytics.svg',
  },
  {
    href: '/logs',
    label: 'Логи',
    icon: '/admin/icons/icon-chart.svg',
  },
  {
    href: '/settings',
    label: 'Настройки',
    icon: '/admin/icons/icon-setting.svg',
  },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [newRequestsCount, setNewRequestsCount] = useState(0);
  const [minimized, setMinimized] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const normalizedPath = pathname.startsWith('/admin')
    ? pathname.slice('/admin'.length) || '/'
    : pathname;
  const isLoginPath = normalizedPath === '/login';

  const fetchRequestsCount = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/requests/count', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setNewRequestsCount(data.new || 0);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (isLoginPath) { setLoading(false); return; }
      try {
        const response = await fetch('/api/admin/auth', { method: 'GET', credentials: 'include' });
        if (response.ok) {
          setIsAuthenticated(true);
          fetchRequestsCount();
          if (process.env.NODE_ENV !== 'production') {
            localStorage.setItem('sb-admin-bypass', 'true');
          }
        } else {
          localStorage.removeItem('sb-admin-bypass');
          router.replace('/login');
        }
      } catch {
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [isLoginPath, router, fetchRequestsCount]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(fetchRequestsCount, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchRequestsCount]);

  // On desktop: start expanded; on mobile: sidebar is an overlay, minimized state doesn't matter
  useEffect(() => {
    if (window.innerWidth >= 768) setMinimized(false);
  }, []);

  // Close mobile overlay when navigating
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await adminCsrfFetch('/api/admin/auth', { method: 'DELETE', credentials: 'include' });
      localStorage.removeItem('sb-admin-bypass');
    } catch {
      // silent
    }
    router.replace('/login');
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--frox-gray-100)]">
        <div className="text-[var(--frox-gray-500)] text-sm font-medium">Загрузка...</div>
      </div>
    );
  }

  if (isLoginPath) return <>{children}</>;
  if (!isAuthenticated) return null;

  const isActive = (href: string) =>
    href === '/'
      ? normalizedPath === '/'
      : normalizedPath === href || normalizedPath.startsWith(href + '/');

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        id="frox-layout"
        className={minimized ? 'minimized' : ''}
        style={{ background: 'var(--frox-gray-100)' }}
      >
        {/* ── SIDEBAR ── */}
        <aside
          data-mobile-open={mobileOpen ? 'true' : undefined}
          className={`
            relative flex flex-col justify-between
            bg-white border-r border-[var(--frox-neutral-border)]
            transition-all duration-300 overflow-hidden
            ${minimized && !mobileOpen ? 'p-[25px_10px]' : 'p-[25px]'}
            /* mobile: fixed overlay */
            max-md:fixed max-md:top-0 max-md:left-0 max-md:h-full max-md:z-50
            max-md:w-1/2 max-md:shadow-2xl
            ${mobileOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}
          `}
          style={{ minHeight: '100vh' }}
        >
          {/* Collapse toggle button */}
          <button
            onClick={() => setMinimized(!minimized)}
            className="
              absolute top-[60px] -right-[12px] z-10
              w-6 h-6 flex items-center justify-center
              bg-white border border-[var(--frox-neutral-border)]
              rounded-full cursor-pointer
              hover:opacity-75 transition-all duration-200
              max-md:hidden
            "
            aria-label="Свернуть боковое меню"
          >
            <img
              src="/admin/icons/icon-arrow-left.svg"
              alt=""
              className={`w-3 h-3 transition-transform duration-300 ${minimized ? 'rotate-180' : ''}`}
            />
          </button>

          <div className="flex flex-col gap-0 flex-1 min-h-0">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 mb-8 shrink-0">
              <img
                src="/admin/icons/icon-favicon.svg"
                alt="Admin"
                className="w-8 h-8 shrink-0"
              />
              <span
                className="sidebar-logo-full font-bold text-xl text-[var(--frox-gray-1100)] tracking-tight"
                style={{ display: minimized && !mobileOpen ? 'none' : 'block' }}
              >
                Админ
              </span>
            </Link>

            {/* Divider */}
            <div className="w-full h-px bg-[var(--frox-neutral-border)] mb-5 shrink-0" />

            {/* Navigation */}
            <nav className="flex flex-col gap-1 flex-1 overflow-y-auto overflow-x-hidden">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                const badge = item.hasBadge ? newRequestsCount : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      nav-link group flex items-center gap-[10px] rounded-xl
                      py-[11px] transition-colors duration-150 shrink-0
                      ${minimized && !mobileOpen ? 'px-0 justify-center' : 'px-[14px]'}
                      ${active
                        ? 'bg-[var(--frox-brand)] text-white'
                        : 'text-[var(--frox-gray-500)] hover:bg-[var(--frox-gray-100)]'
                      }
                    `}
                    title={minimized && !mobileOpen ? item.label : undefined}
                  >
                    <img
                      src={item.icon}
                      alt=""
                      className={`w-5 h-5 shrink-0 ${active ? 'filter-white' : 'filter-black opacity-60'}`}
                    />
                    <span className={`sidebar-label text-sm font-semibold whitespace-nowrap transition-all duration-200 ${minimized && !mobileOpen ? 'hidden' : 'block'}`}>
                      {item.label}
                    </span>
                    {badge > 0 && (!minimized || mobileOpen) && (
                      <span className={`sidebar-badge ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-[var(--frox-brand)] text-white'}`}>
                        {badge}
                      </span>
                    )}
                    {badge > 0 && minimized && !mobileOpen && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--frox-brand)] rounded-full" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Logout */}
          <div className="shrink-0 pt-4 border-t border-[var(--frox-neutral-border)]">
            <button
              onClick={handleLogout}
              className={`
                group flex items-center gap-[10px] rounded-xl w-full
                py-[11px] text-[var(--frox-gray-500)]
                hover:bg-red-50 hover:text-red-600 transition-colors duration-150
                ${minimized ? 'px-0 justify-center' : 'px-[14px]'}
              `}
              title={minimized ? 'Выход' : undefined}
            >
              <img
                src="/admin/icons/icon-logout.svg"
                alt=""
                className="w-5 h-5 shrink-0 opacity-60 group-hover:opacity-100"
              />
              <span className={`sidebar-label text-sm font-semibold whitespace-nowrap ${minimized ? 'hidden' : 'block'}`}>
                Выход
              </span>
            </button>
          </div>
        </aside>

        {/* ── HEADER ── */}
        <header className="flex items-center justify-between bg-white border-b border-[var(--frox-neutral-border)] px-6 py-4 gap-4 sticky top-0 z-30">
          {/* Left: mobile burger + page title */}
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-[var(--frox-gray-100)] transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Открыть меню"
            >
              <img src="/admin/icons/icon-menu.svg" alt="" className="w-5 h-5 filter-black" />
            </button>

            {/* Current section name */}
            <span className="text-sm font-semibold text-[var(--frox-gray-500)] hidden sm:block">
              {NAV_ITEMS.find(i => isActive(i.href))?.label ?? 'Панель управления'}
            </span>
          </div>

          {/* Right: notifications + user */}
          <div className="flex items-center gap-5">
            {newRequestsCount > 0 && (
              <Link
                href="/requests"
                className="relative p-2 rounded-lg hover:bg-[var(--frox-gray-100)] transition-colors"
                title={`${newRequestsCount} новых заявок`}
              >
                <img src="/admin/icons/icon-notification-bing.svg" alt="" className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[var(--frox-red)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {newRequestsCount > 9 ? '9+' : newRequestsCount}
                </span>
              </Link>
            )}

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[var(--frox-brand)] flex items-center justify-center shrink-0">
                <img src="/admin/icons/icon-user.svg" alt="" className="w-4 h-4 filter-white" />
              </div>
              <span className="text-sm font-semibold text-[var(--frox-gray-800)] hidden sm:block">
                Admin
              </span>
            </div>
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <main className="overflow-y-auto overflow-x-hidden">
          <div className="p-6 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
