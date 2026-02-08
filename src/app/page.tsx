import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { FeaturesSection } from "@/components/FeaturesSection";
import { PartnersSection } from "@/components/PartnersSection";
import { Footer } from "@/components/Footer";
import { RequestCPModal } from "@/components/RequestCPModal";
// import { ConferencePopup } from "@/components/ConferencePopup";
import { VideoPlayer } from "@/components/VideoPlayer";
import { LatestNewsSection } from "@/components/LatestNewsSection";
import { UpcomingConferencesSection } from "@/components/UpcomingConferencesSection";
import { QuickLinksSection } from "@/components/QuickLinksSection";
import { FAQPreviewSection } from "@/components/FAQPreviewSection";
import { ArrowRight, Microscope, Heart, Brain } from "lucide-react";

export const metadata: Metadata = {
  title: "Удаление фиброаденомы (ВАБ): Система Xishan | Цена и Обучение",
  description: "Без шрамов, 15 минут. Вакуумная биопсия (ВАБ) фиброаденомы системой Xishan DK-B-MS. Официальный дистрибьютор в РФ. Узнать цену и записаться на обучение.",
  keywords: ["удаление фиброаденомы", "вакуумная биопсия", "ВАБ Xishan", "фиброаденома цена", "биопсия молочной железы", "DK-B-MS", "лечение фиброаденомы без операции"],
};

export default function Home() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'MedicalOrganization',
        'name': 'Компания Зенит',
        'description': 'Официальный дистрибьютор систем вакуумной биопсии Xishan в РФ',
        'url': process.env.NEXT_PUBLIC_SITE_URL || 'https://fibroadenoma.net',
        'logo': `${process.env.NEXT_PUBLIC_SITE_URL || 'https://fibroadenoma.net'}/images/logo.png`,
        'contactPoint': {
          '@type': 'ContactPoint',
          'telephone': '+7-812-748-22-13',
          'contactType': 'sales',
          'areaServed': 'RU',
          'availableLanguage': 'Russian'
        }
      },
      {
        '@type': 'MedicalProcedure',
        'name': 'Вакуумная аспирационная биопсия (ВАБ)',
        'alternateName': 'Удаление фиброаденомы без шрамов',
        'description': 'Минимально инвазивная процедура удаления доброкачественных новообразований молочной железы под контролем УЗИ.',
        'bodyLocation': 'Breast',
        'status': 'Minimally invasive',
        'painLevel': 'Low'
      },
      {
        '@type': 'Product',
        'name': 'Xishan DK-B-MS',
        'description': 'Система для вакуумной аспирационной биопсии молочной железы',
        'brand': {
          '@type': 'Brand',
          'name': 'Xishan'
        },
        'manufacturer': {
          '@type': 'Organization',
          'name': 'Chongqing Xishan Science & Technology Co., Ltd.'
        }
      },
      {
        '@type': 'FAQPage',
        'mainEntity': [
          {
            '@type': 'Question',
            'name': 'Больно ли удалять фиброаденому методом ВАБ?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Процедура проводится под местной анестезией. Пациент чувствует только укол обезболивающего. Во время самой биопсии боли нет.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Остается ли шрам после вакуумной биопсии?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Нет, шрамов не остается. Прокол составляет всего 3-5 мм и заживает бесследно, в отличие от разреза при обычной операции.'
            }
          }
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen bg-slate-50 w-full font-sans selection:bg-teal-100 selection:text-teal-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* <ConferencePopup /> */}
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden pt-32 pb-16 lg:pt-32">
        {/* Background Image - без оптимизации для максимального качества */}
        <div 
          className="absolute inset-0 bg-cover bg-left md:bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/images/background.png)',
          }}
        />
        
        <div className="relative z-10 container mx-auto px-4 md:px-6 lg:px-8 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-teal-100 shadow-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            <span className="text-sm text-slate-600 font-medium tracking-wide uppercase">Инновации в маммологии</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6 max-w-5xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Удаление фиброаденомы методом ВАБ: <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600">
              Система Xishan DK-B-MS
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Передовые технологии вакуумной аспирационной биопсии (ВАБ) для точной диагностики и удаления фиброаденом без шрамов. Клиническая ценность для врачей и комфорт для пациентов.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <RequestCPModal>
              <Button size="lg" className="rounded-full bg-slate-900 hover:bg-slate-800 text-white px-8 h-14 text-lg shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300">
                Узнать цену / КП
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </RequestCPModal>
            <Button size="lg" variant="outline" className="rounded-full border-2 border-slate-200 hover:border-teal-200 hover:bg-teal-50/50 px-8 h-14 text-lg text-slate-700" asChild>
              <Link href="/equipment">
                Подробнее о системе
              </Link>
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
            {[
              { value: "150+", label: "Установок по РФ" },
              { value: "150+", label: "Обученных врачей" },
              { value: "58", label: "Регионов" },
              { value: "24/7", label: "Поддержка" },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20 shadow-sm">
                <span className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-blue-600 mb-1">
                  {stat.value}
                </span>
                <span className="text-sm text-slate-500 font-medium">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="flex flex-col w-full">
        
        {/* Advantages */}
        <FeaturesSection />

        {/* Video Spotlight */}
        <section className="w-full py-24 bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-500/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <Badge variant="secondary" className="bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 border-0">
                  Технология
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                  Почему ВАБ лучше операции? <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-400">
                    (Без шрамов и боли)
                  </span>
                </h2>
                <p className="text-slate-300 text-lg leading-relaxed">
                  Система Xishan DK-B-MS обеспечивает удаление фиброаденомы через прокол 3-5 мм. Процедура проходит под местной анестезией, занимает всего 15-20 минут и не оставляет шрамов. Высокая точность благодаря апертуре 1мм и вакуумному контролю гарантирует безопасность.
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span>Автоматический забор</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-2 h-2 rounded-full bg-teal-400" />
                    <span>Контроль вакуума</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    <span>Гемостаз</span>
                  </div>
                </div>
              </div>
              
              <VideoPlayer 
                src="/videos/VAB_video_cartoon.mp4"
                title="Демонстрация работы системы DK-B-MS"
              />
            </div>
          </div>
        </section>

        {/* Academy / Events */}
        <section className="w-full py-24 bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Обучение врачей: Как делать ВАБ без осложнений?</h2>
                <p className="text-slate-600 text-lg max-w-2xl mb-6">
                  Академия Xishan проводит регулярные мастер-классы и конференции для специалистов. Узнайте тонкости работы с системой DK-B-MS от ведущих экспертов.
                </p>
                <div className="text-slate-600 bg-white/50 p-6 rounded-2xl border border-slate-100 mb-6">
                  <p className="mb-3 font-medium text-slate-900">
                    Обучение проводится регулярно, каждый месяц, на наших топовых учебных базах:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      Клиника Одинцова (Санкт-Петербург)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      ФГБУ НМИЦ онкологии им. Н. Н. Петрова Минздрава России (Санкт-Петербург)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      МНИОИ им. П.А. Герцена (Москва)
                    </li>
                  </ul>
                </div>
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                  <Link href="/training">Все мероприятия</Link>
                </Button>
              </div>
              <div className="relative h-[400px] lg:h-[500px] rounded-2xl overflow-hidden shadow-lg">
                <Image 
                  src="/images/training-clinic.jpg" 
                  alt="Обучение в клинике" 
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Latest News Section */}
        <LatestNewsSection />

        {/* Upcoming Conferences Section */}
        <UpcomingConferencesSection />

        {/* Partners Section */}
        <PartnersSection />

        {/* Quick Links Section */}
        <QuickLinksSection />

        {/* FAQ Preview Section */}
        <FAQPreviewSection />

        {/* Expert Reviews */}
        <section className="w-full py-24 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-slate-900 mb-16">Отзывы врачей о системе Xishan DK-B-MS</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Microscope,
                  title: "Визуализация",
                  desc: "Превосходный контроль зоны биопсии благодаря четкой ультразвуковой визуализации иглы.",
                  author: "Приходько К.А.",
                  role: "Онколог-маммолог, хирург"
                },
                {
                  icon: Heart,
                  title: "Безопасность",
                  desc: "Минимальный риск осложнений и быстрое восстановление пациентов после процедуры.",
                  author: "Одинцов В.А.",
                  role: "Онколог-маммолог, хирург"
                },
                {
                  icon: Brain,
                  title: "Эргономика",
                  desc: "Удобная рукоятка и простое управление позволяют сосредоточиться на пациенте.",
                  author: "Скурихин С.С.",
                  role: "Онколог-маммолог, хирург"
                }
              ].map((review, i) => (
                <div key={i} className="flex flex-col items-center text-center p-8 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 text-teal-500">
                    <review.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">{review.title}</h3>
                  <p className="text-slate-600 mb-6 italic">&quot;{review.desc}&quot;</p>
                  <div className="mt-auto">
                    <p className="font-semibold text-slate-900">{review.author}</p>
                    <p className="text-sm text-slate-500">{review.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
