import Link from 'next/link';
import ActiveSessions from '@/components/admin/ActiveSessions';
import VisitStats from '@/components/admin/VisitStats';

const QUICK_LINKS = [
  {
    href: '/requests',
    label: 'Заявки',
    description: 'Просмотр лидов с сайта, быстрый разбор по статусам и экспорт.',
    icon: '/admin/icons/icon-inbox.svg',
    accent: 'from-[#f3efff] to-[#ece8ff]',
  },
  {
    href: '/contacts',
    label: 'Контакты',
    description: 'CRM-база контактов, сегментация по тегам и работа с импортами.',
    icon: '/admin/icons/icon-people.svg',
    accent: 'from-[#f2efff] to-[#f6f3ff]',
  },
  {
    href: '/news',
    label: 'Новости',
    description: 'Управление публикациями, медиаматериалами и статусом публикации.',
    icon: '/admin/icons/icon-cms.svg',
    accent: 'from-[#f6f2ff] to-[#eeebfb]',
  },
  {
    href: '/conferences',
    label: 'Мероприятия',
    description: 'Расписание конференций, карточки мероприятий и регистрационные формы.',
    icon: '/admin/icons/icon-calendar-1.svg',
    accent: 'from-[#f7f3ff] to-[#f0ecff]',
  },
  {
    href: '/banner',
    label: 'Баннер',
    description: 'Настройка главного баннера и визуальных акцентов на сайте.',
    icon: '/admin/icons/icon-notification-bing.svg',
    accent: 'from-[#f5f1ff] to-[#efe9ff]',
  },
  {
    href: '/direct',
    label: 'Автоброкер',
    description: 'Контроль кампаний Яндекс.Директ и связанных рекламных шаблонов.',
    icon: '/admin/icons/icon-analytics.svg',
    accent: 'from-[#f2efff] to-[#ece8ff]',
  },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <ActiveSessions />

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 data-frox-heading="true" className="text-2xl font-black text-[var(--frox-gray-1100)]">
              Быстрые переходы
            </h2>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group frox-shell-surface block overflow-hidden rounded-[28px] p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(52,40,121,0.12)]"
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]`}>
                  <img
                    src={item.icon}
                    alt=""
                    className="h-5 w-5 opacity-80 transition-opacity group-hover:opacity-100"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-[var(--frox-gray-900)] transition-colors group-hover:text-[var(--frox-brand-strong)]">
                    {item.label}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--frox-gray-500)]">
                    {item.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <VisitStats />
    </div>
  );
}
