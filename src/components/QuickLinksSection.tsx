'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Stethoscope, 
  GraduationCap, 
  Microscope, 
  FileText, 
  Calendar,
  Users,
  ArrowRight
} from 'lucide-react';

const quickLinks = [
  {
    title: 'Пациентам',
    description: 'Всё о процедуре ВАБ, преимуществах и где сделать',
    href: '/patients',
    icon: Stethoscope,
    gradient: 'from-pink-50 via-rose-50 to-pink-100',
    iconBg: 'bg-gradient-to-br from-pink-500 to-rose-500',
    iconColor: 'text-white',
    accentColor: 'text-pink-600',
    decoration: 'bg-pink-200/30'
  },
  {
    title: 'Оборудование',
    description: 'Технические характеристики системы Xishan DK-B-MS',
    href: '/equipment',
    icon: Microscope,
    gradient: 'from-blue-50 via-cyan-50 to-blue-100',
    iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    iconColor: 'text-white',
    accentColor: 'text-blue-600',
    decoration: 'bg-blue-200/30'
  },
  {
    title: 'Обучение',
    description: 'Курсы повышения квалификации для врачей',
    href: '/training',
    icon: GraduationCap,
    gradient: 'from-teal-50 via-emerald-50 to-teal-100',
    iconBg: 'bg-gradient-to-br from-teal-500 to-emerald-500',
    iconColor: 'text-white',
    accentColor: 'text-teal-600',
    decoration: 'bg-teal-200/30'
  },
  {
    title: 'Конференции',
    description: 'Мероприятия, мастер-классы и выставки',
    href: '/conferences',
    icon: Calendar,
    gradient: 'from-purple-50 via-indigo-50 to-purple-100',
    iconBg: 'bg-gradient-to-br from-purple-500 to-indigo-500',
    iconColor: 'text-white',
    accentColor: 'text-purple-600',
    decoration: 'bg-purple-200/30'
  },
  {
    title: 'Новости',
    description: 'Последние события и обновления компании',
    href: '/news',
    icon: FileText,
    gradient: 'from-orange-50 via-amber-50 to-orange-100',
    iconBg: 'bg-gradient-to-br from-orange-500 to-amber-500',
    iconColor: 'text-white',
    accentColor: 'text-orange-600',
    decoration: 'bg-orange-200/30'
  },
  {
    title: 'Контакты',
    description: 'Свяжитесь с нами для консультации',
    href: '/contacts',
    icon: Users,
    gradient: 'from-slate-50 via-slate-100 to-slate-200',
    iconBg: 'bg-gradient-to-br from-slate-500 to-slate-600',
    iconColor: 'text-white',
    accentColor: 'text-slate-600',
    decoration: 'bg-slate-200/30'
  }
];

export function QuickLinksSection() {
  return (
    <section className="w-full py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Полезные разделы
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Быстрый доступ к важной информации о ВАБ, оборудовании и обучении
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 group cursor-pointer overflow-hidden relative">
                  {/* Декоративный фон */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${link.gradient} opacity-50`} />
                  
                  {/* Декоративные элементы */}
                  <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full ${link.decoration} blur-2xl group-hover:scale-150 transition-transform duration-500`} />
                  <div className={`absolute -bottom-8 -left-8 w-24 h-24 rounded-full ${link.decoration} blur-xl group-hover:scale-125 transition-transform duration-500`} />
                  
                  <CardContent className="p-6 relative z-10">
                    {/* Иконка с градиентным фоном */}
                    <div className={`w-14 h-14 rounded-2xl ${link.iconBg} flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                      <Icon className={`w-7 h-7 ${link.iconColor}`} />
                    </div>
                    
                    {/* Заголовок */}
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-teal-600 transition-colors relative z-10">
                      {link.title}
                    </h3>
                    
                    {/* Описание */}
                    <p className="text-slate-700 mb-5 line-clamp-2 leading-relaxed relative z-10">
                      {link.description}
                    </p>
                    
                    {/* Ссылка */}
                    <div className={`flex items-center ${link.accentColor} font-medium text-sm group-hover:gap-2 transition-all relative z-10`}>
                      Перейти
                      <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
