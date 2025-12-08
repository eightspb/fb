import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { GridPattern } from "@/components/GridPattern";
import { FeaturesSection } from "@/components/FeaturesSection";
import { PartnersSection } from "@/components/PartnersSection";
import { Footer } from "@/components/Footer";
import { RequestCPModal } from "@/components/RequestCPModal";
import { ArrowRight, PlayCircle, Calendar, MapPin, Microscope, Heart, Brain } from "lucide-react";

export const metadata: Metadata = {
  title: "Главная",
  description: "Официальный дистрибьютор ВАБ завода Сишань в РФ. Клиническая ценность и передовые технологии для медицинских специалистов.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 w-full font-sans selection:bg-pink-100 selection:text-pink-900">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden pt-32 pb-16 lg:pt-32">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pink-50/50 via-slate-50 to-slate-50" />
        <GridPattern
          width={40}
          height={40}
          x={-1}
          y={-1}
          className="absolute inset-0 h-full w-full text-slate-200/50 [mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)]"
          squares={[
            [4, 4], [4, 6], [5, 5], [6, 4], [7, 6], [8, 5], [9, 4]
          ]}
        />
        
        <div className="relative z-10 container mx-auto px-4 md:px-6 lg:px-8 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-pink-100 shadow-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
            </span>
            <span className="text-sm text-slate-600 font-medium tracking-wide uppercase">Инновации в маммологии</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6 max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Официальный дистрибьютор <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-blue-600">
              ВАБ системы Xishan
            </span>
            {" "}в РФ
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Передовые технологии вакуумной аспирационной биопсии для точной диагностики и бережного лечения. Клиническая ценность для врачей и комфорт для пациентов.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <RequestCPModal>
              <Button size="lg" className="rounded-full bg-slate-900 hover:bg-slate-800 text-white px-8 h-14 text-lg shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300">
                Запросить КП
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </RequestCPModal>
            <Button size="lg" variant="outline" className="rounded-full border-2 border-slate-200 hover:border-pink-200 hover:bg-pink-50/50 px-8 h-14 text-lg text-slate-700" asChild>
              <Link href="/equipment">
                Подробнее о системе
              </Link>
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
            {[
              { value: "150+", label: "Установок по РФ" },
              { value: "90+", label: "Обученных врачей" },
              { value: "36", label: "Регионов" },
              { value: "24/7", label: "Поддержка" },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20 shadow-sm">
                <span className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-blue-600 mb-1">
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
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-500/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <Badge variant="secondary" className="bg-pink-500/10 text-pink-300 hover:bg-pink-500/20 border-0">
                  Технология
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                  Как работает система <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-blue-400">
                    Вакуумной Биопсии
                  </span>
                </h2>
                <p className="text-slate-300 text-lg leading-relaxed">
                  Уникальная конструкция зонда обеспечивает получение качественных образцов ткани при минимальной травматизации. Процедура проходит под местной анестезией и занимает всего 15-20 минут.
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span>Автоматический забор</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-2 h-2 rounded-full bg-pink-400" />
                    <span>Контроль вакуума</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    <span>Гемостаз</span>
                  </div>
                </div>
                <Button className="bg-white text-slate-900 hover:bg-slate-100 rounded-full px-8 py-6 text-lg font-medium">
                  Смотреть вебинар
                </Button>
              </div>
              
              <div className="relative aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl group cursor-pointer">
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                  <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <PlayCircle className="w-10 h-10 text-white fill-white/20" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4 p-4 bg-black/60 backdrop-blur-sm rounded-xl">
                  <p className="text-white font-medium">Демонстрация работы системы DK-B-MS</p>
                  <p className="text-slate-300 text-sm">Длительность: 04:20</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Academy / Events */}
        <section className="w-full py-24 bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Академия Xishan</h2>
                <p className="text-slate-600 text-lg max-w-2xl mb-6">
                  Регулярные обучающие мероприятия, мастер-классы и конференции для специалистов
                </p>
                <div className="text-slate-600 bg-white/50 p-6 rounded-2xl border border-slate-100">
                  <p className="mb-3 font-medium text-slate-900">
                    Обучение проводится регулярно, каждый месяц, на наших топовых учебных базах:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                      НИИ Петрова
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                      НИИ Герцена (Москва)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                      Клиника Одинцова (Санкт-Петербург)
                    </li>
                  </ul>
                </div>
              </div>
              <Button variant="outline" className="hidden md:flex" asChild>
                <Link href="/training">Все мероприятия</Link>
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  type: "Обучение",
                  title: "Курс ВАБ для начинающих",
                  date: "15 ноября 2025",
                  place: "Москва",
                  color: "pink"
                },
                {
                  type: "Конференция",
                  title: "II Конференция ВАБ",
                  date: "20 апреля 2025",
                  place: "Санкт-Петербург",
                  color: "blue"
                },
                {
                  type: "Мастер-класс",
                  title: "Практикум в НИИ Петрова",
                  date: "10 сентября 2025",
                  place: "Москва",
                  color: "purple"
                }
              ].map((event, i) => (
                <Card key={i} className="group hover:shadow-lg transition-all duration-300 border-slate-200 bg-white">
                  <CardHeader>
                    <Badge className={`w-fit mb-2 bg-${event.color}-100 text-${event.color}-700 hover:bg-${event.color}-200 border-0`}>
                      {event.type}
                    </Badge>
                    <CardTitle className="group-hover:text-pink-600 transition-colors">
                      {event.title}
                    </CardTitle>
                    <CardDescription className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> {event.date}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> {event.place}
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full rounded-lg bg-slate-50 text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-sm">
                      Записаться
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-8 md:hidden" asChild>
              <Link href="/training">Все мероприятия</Link>
            </Button>
          </div>
        </section>

        {/* Partners Section */}
        <PartnersSection />

        {/* Expert Reviews */}
        <section className="w-full py-24 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-slate-900 mb-16">Мнение экспертов</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Microscope,
                  title: "Визуализация",
                  desc: "Превосходный контроль зоны биопсии благодаря четкой ультразвуковой визуализации иглы.",
                  author: "Д-р Иванов А.А.",
                  role: "Онколог-маммолог"
                },
                {
                  icon: Heart,
                  title: "Безопасность",
                  desc: "Минимальный риск осложнений и быстрое восстановление пациентов после процедуры.",
                  author: "Д-р Петрова Е.С.",
                  role: "Хирург"
                },
                {
                  icon: Brain,
                  title: "Эргономика",
                  desc: "Удобная рукоятка и простое управление позволяют сосредоточиться на пациенте.",
                  author: "Д-р Сидоров В.В.",
                  role: "Врач УЗД"
                }
              ].map((review, i) => (
                <div key={i} className="flex flex-col items-center text-center p-8 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 text-pink-500">
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
