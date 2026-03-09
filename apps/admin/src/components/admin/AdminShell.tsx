'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';

const NAV_ITEMS = [
  { href: '/', label: 'Главная', icon: '/admin/icons/icon-favorite-chart.svg' },
  { href: '/requests', label: 'Заявки', icon: '/admin/icons/icon-inbox.svg', hasBadge: true },
  { href: '/contacts', label: 'Контакты', icon: '/admin/icons/icon-people.svg' },
  { href: '/news', label: 'Новости', icon: '/admin/icons/icon-cms.svg' },
  { href: '/conferences', label: 'Мероприятия', icon: '/admin/icons/icon-calendar-1.svg' },
  { href: '/banner', label: 'Баннер', icon: '/admin/icons/icon-notification-bing.svg' },
  { href: '/direct', label: 'Автоброкер', icon: '/admin/icons/icon-analytics.svg' },
  { href: '/ai-assistant', label: 'AI Ассистент', icon: '/admin/icons/icon-ai.svg' },
  { href: '/logs', label: 'Логи', icon: '/admin/icons/icon-chart.svg' },
  { href: '/settings', label: 'Настройки', icon: '/admin/icons/icon-setting.svg' },
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
      if (!response.ok) return;
      const data = await response.json();
      setNewRequestsCount(data.new || 0);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (isLoginPath) {
        setLoading(false);
        return;
      }

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
  }, [fetchRequestsCount, isLoginPath, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(fetchRequestsCount, 60000);
    return () => clearInterval(interval);
  }, [fetchRequestsCount, isAuthenticated]);

  useEffect(() => {
    if (window.innerWidth >= 768) setMinimized(false);
  }, []);

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
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#faf9ff_0%,#f5f4fc_40%,#f5f5fa_100%)]">
        <div className="text-sm font-medium text-[var(--frox-gray-500)]">Загрузка...</div>
      </div>
    );
  }

  if (isLoginPath) return <>{children}</>;
  if (!isAuthenticated) return null;

  const isActive = (href: string) =>
    href === '/'
      ? normalizedPath === '/'
      : normalizedPath === href || normalizedPath.startsWith(href + '/');

  const currentLabel = NAV_ITEMS.find((item) => isActive(item.href))?.label ?? 'Панель управления';

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[rgba(23,19,40,0.48)] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div id="frox-layout" className={minimized ? 'minimized' : ''} style={{ background: 'transparent' }}>
        <aside
          data-mobile-open={mobileOpen ? 'true' : undefined}
          className={`
            relative flex flex-col justify-between overflow-hidden
            border-r border-white/70 bg-[rgba(255,255,255,0.92)] backdrop-blur-xl
            shadow-[0_22px_50px_rgba(52,40,121,0.08)] transition-all duration-300
            ${minimized && !mobileOpen ? 'p-[25px_10px]' : 'p-[25px]'}
            max-md:fixed max-md:left-0 max-md:top-0 max-md:z-50 max-md:h-full max-md:w-1/2
            max-md:shadow-2xl
            ${mobileOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}
          `}
          style={{ minHeight: '100vh' }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(115,100,219,0.15),transparent_32%),linear-gradient(180deg,rgba(248,246,255,0.7),rgba(255,255,255,0))]" />

          <button
            onClick={() => setMinimized(!minimized)}
            className="
              absolute top-[60px] -right-[12px] z-10 flex h-6 w-6 items-center justify-center rounded-full
              border border-white/80 bg-[rgba(255,255,255,0.96)] shadow-[0_10px_24px_rgba(52,40,121,0.1)]
              transition-all duration-200 hover:opacity-75 max-md:hidden
            "
            aria-label="Свернуть боковое меню"
          >
            <img
              src="/admin/icons/icon-arrow-left.svg"
              alt=""
              className={`h-3 w-3 transition-transform duration-300 ${minimized ? 'rotate-180' : ''}`}
            />
          </button>

          <div className="relative z-[1] flex min-h-0 flex-1 flex-col gap-0">
            <Link
              href="/"
              className={`mb-8 flex shrink-0 items-center gap-3 ${minimized && !mobileOpen ? 'w-full justify-center' : ''}`}
            >
              <img src="/admin/icons/icon-favicon.svg" alt="Admin" className="h-8 w-8 shrink-0" />
              <span
                className="sidebar-logo-full text-xl font-black tracking-tight text-[var(--frox-gray-1100)]"
                style={{ display: minimized && !mobileOpen ? 'none' : 'block' }}
              >
                Админ
              </span>
            </Link>

            <div className="mb-5 h-px w-full shrink-0 bg-[linear-gradient(90deg,rgba(115,100,219,0.08),rgba(115,100,219,0.35),rgba(115,100,219,0.08))]" />

            <nav className="flex flex-1 flex-col gap-1.5 overflow-x-hidden overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                const badge = item.hasBadge ? newRequestsCount : 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      nav-link group relative flex shrink-0 items-center gap-[10px] rounded-2xl py-[12px]
                      transition-all duration-150
                      ${minimized && !mobileOpen ? 'justify-center px-0' : 'px-[14px]'}
                      ${active
                        ? 'bg-[linear-gradient(135deg,#6150d2_0%,#7d69e6_100%)] text-white shadow-[0_18px_38px_rgba(97,80,210,0.26)]'
                        : 'text-[var(--frox-gray-500)] hover:bg-[var(--frox-brand-softer)] hover:text-[var(--frox-brand-strong)]'
                      }
                    `}
                    title={minimized && !mobileOpen ? item.label : undefined}
                  >
                    <img
                      src={item.icon}
                      alt=""
                      className={`h-5 w-5 shrink-0 transition-opacity ${active ? 'filter-white' : 'filter-black opacity-60 group-hover:opacity-80'}`}
                    />
                    <span className={`sidebar-label whitespace-nowrap text-sm font-semibold transition-all duration-200 ${minimized && !mobileOpen ? 'hidden' : 'block'}`}>
                      {item.label}
                    </span>
                    {badge > 0 && (!minimized || mobileOpen) && (
                      <span className={`sidebar-badge ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${active ? 'bg-white/20 text-white' : 'bg-[var(--frox-brand)] text-white shadow-[0_8px_18px_rgba(115,100,219,0.25)]'}`}>
                        {badge}
                      </span>
                    )}
                    {badge > 0 && minimized && !mobileOpen && (
                      <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--frox-brand)]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="relative z-[1] shrink-0 border-t border-[rgba(115,100,219,0.1)] pt-4">
            <button
              onClick={handleLogout}
              className={`
                group flex w-full items-center gap-[10px] rounded-2xl py-[11px] text-[var(--frox-gray-500)]
                transition-colors duration-150 hover:bg-[rgba(226,55,56,0.08)] hover:text-red-600
                ${minimized ? 'justify-center px-0' : 'px-[14px]'}
              `}
              title={minimized ? 'Выход' : undefined}
            >
              <img
                src="/admin/icons/icon-logout.svg"
                alt=""
                className="h-5 w-5 shrink-0 opacity-60 transition-opacity group-hover:opacity-100"
              />
              <span className={`sidebar-label whitespace-nowrap text-sm font-semibold ${minimized ? 'hidden' : 'block'}`}>
                Выход
              </span>
            </button>
          </div>
        </aside>

        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-white/80 bg-[rgba(255,255,255,0.78)] px-6 py-4 backdrop-blur-2xl shadow-[0_14px_40px_rgba(52,40,121,0.06)]">
          <div className="flex items-center gap-3">
            <button
              className="rounded-xl border border-transparent p-2 transition-colors hover:border-[rgba(115,100,219,0.12)] hover:bg-[var(--frox-brand-softer)] md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Открыть меню"
            >
              <img src="/admin/icons/icon-menu.svg" alt="" className="h-5 w-5 filter-black" />
            </button>

            <div className="hidden sm:block">
              <span data-frox-heading="true" className="text-lg font-black text-[var(--frox-gray-1100)]">
                {currentLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {newRequestsCount > 0 && (
              <Link
                href="/requests"
                className="relative rounded-xl border border-transparent p-2 transition-colors hover:border-[rgba(115,100,219,0.12)] hover:bg-[var(--frox-brand-softer)]"
                title={`${newRequestsCount} новых заявок`}
              >
                <img src="/admin/icons/icon-notification-bing.svg" alt="" className="h-5 w-5" />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--frox-red)] text-[10px] font-bold text-white">
                  {newRequestsCount > 9 ? '9+' : newRequestsCount}
                </span>
              </Link>
            )}

            <div className="flex items-center gap-2 rounded-full border border-white/80 bg-[rgba(255,255,255,0.82)] px-2 py-1 shadow-[0_10px_24px_rgba(52,40,121,0.06)]">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6150d2_0%,#8f79ef_100%)] shadow-[0_10px_22px_rgba(97,80,210,0.26)]">
                <img src="/admin/icons/icon-user.svg" alt="" className="h-4 w-4 filter-white" />
              </div>
              <span className="hidden text-sm font-semibold text-[var(--frox-gray-800)] sm:block">
                Admin
              </span>
            </div>
          </div>
        </header>

        <main className="relative overflow-x-hidden overflow-y-auto">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(115,100,219,0.08),transparent_68%)]" />
          <div className="relative p-6 md:p-8">{children}</div>
        </main>
      </div>
    </>
  );
}
