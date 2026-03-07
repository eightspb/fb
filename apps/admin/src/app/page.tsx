import Link from 'next/link';
import ActiveSessions from '@/components/admin/ActiveSessions';
import VisitStats from '@/components/admin/VisitStats';

const QUICK_LINKS = [
  {
    href: '/requests',
    label: 'Заявки',
    description: 'Просмотр заявок с сайта (Контакты, КП, Обучение)',
    icon: '/admin/icons/icon-inbox.svg',
    accent: '#eeebfb',
    iconColor: 'var(--frox-brand)',
  },
  {
    href: '/contacts',
    label: 'Контакты',
    description: 'База контактов и история переписки',
    icon: '/admin/icons/icon-people.svg',
    accent: '#e6faf6',
    iconColor: 'var(--frox-green)',
  },
  {
    href: '/news',
    label: 'Новости',
    description: 'Создание, редактирование и публикация новостей',
    icon: '/admin/icons/icon-cms.svg',
    accent: '#e8f3ff',
    iconColor: 'var(--frox-blue)',
  },
  {
    href: '/conferences',
    label: 'Мероприятия',
    description: 'Редактирование списка конференций и мастер-классов',
    icon: '/admin/icons/icon-calendar-1.svg',
    accent: '#fff4ee',
    iconColor: 'var(--frox-orange)',
  },
  {
    href: '/banner',
    label: 'Баннер',
    description: 'Управление баннером на главной странице сайта',
    icon: '/admin/icons/icon-notification-bing.svg',
    accent: '#fef0f0',
    iconColor: 'var(--frox-red)',
  },
  {
    href: '/direct',
    label: 'Автоброкер',
    description: 'Настройки Яндекс.Директ и рекламных кампаний',
    icon: '/admin/icons/icon-analytics.svg',
    accent: '#e6faf6',
    iconColor: 'var(--frox-green)',
  },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--frox-gray-1100)]">Обзор</h1>
        <p className="text-sm text-[var(--frox-gray-500)] mt-1">Панель управления сайтом fibroadenoma.net</p>
      </div>

      {/* Quick links */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {QUICK_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group block bg-white rounded-2xl border border-[var(--frox-neutral-border)] p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="flex items-start gap-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: item.accent }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.icon}
                  alt=""
                  className="w-5 h-5"
                  style={{ filter: `brightness(0) saturate(100%) invert(0)` }}
                />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-[var(--frox-gray-900)] group-hover:text-[var(--frox-brand)] transition-colors">
                  {item.label}
                </div>
                <p className="text-xs text-[var(--frox-gray-500)] mt-1 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Active sessions */}
      <ActiveSessions />

      {/* Visit stats */}
      <VisitStats />
    </div>
  );
}
