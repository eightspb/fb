import Image from "next/image";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, User, CheckCircle2, ArrowRight, Mic2, Star } from "lucide-react";
import { ConferenceRegistrationForm } from "@/components/ConferenceRegistrationForm";
import { CountdownTimer } from "@/components/CountdownTimer";

export const metadata: Metadata = {
  title: "Миниинвазивная хирургия / Молочная железа - III Конференция 2026",
  description: "Третья научно-практическая конференция по малоинвазивной хирургии молочной железы. 25 апреля 2026 года, МКНЦ имени Логинова, Москва.",
};

export default function ConferenceSMS3() {
  const conferenceDate = new Date('2026-04-25');
  const day = conferenceDate.getDate();
  const month = conferenceDate.toLocaleString('ru-RU', { month: 'long' });
  const dayOfWeek = conferenceDate.toLocaleString('ru-RU', { weekday: 'long' });

  const speakers = [
    {
      name: "Одинцов Владислав Александрович",
      title: "Д.м.н., профессор, главный врач Клиники доктора Одинцова",
      institution: "Клиника Одинцова, г. Санкт-Петербург",
      topic: "Тема доклада уточняется",
      image: "/images/speakers/odintsov.png"
    },
    {
      name: "Прокопенко Сергей Павлович",
      title: "к.м.н., заведующий отделением, Отделение комплексной диагностики и интервенционной радиологии в маммологии",
      institution: "МНИОИ им. П.А. Герцена, Москва",
      topic: "Тема доклада уточняется",
      image: "/images/speakers/prokopenko.png"
    },
    {
      name: "Бусько Екатерина Александровна",
      title: "Д.м.н., доцент, врач ультразвуковой диагностики, врач-рентгенолог, ведущий научный сотрудник",
      institution: "НМИЦ Онкологии им. Н.Н.Петрова, г. Санкт-Петербург",
      topic: "Тема доклада уточняется",
      image: "/images/speakers/busko.png"
    },
    {
      name: "Мазо Михаил Львович",
      title: "к.м.н., рентгенолог, врач УЗД, старший научный сотрудник",
      institution: "МНИОИ им. П.А. Герцена, Москва",
      topic: "Тема доклада уточняется",
      image: "/images/speakers/mazo.png"
    }
  ];

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-teal-100 selection:text-teal-900">
      <Header />

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-teal-50 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-50 rounded-full blur-3xl opacity-60" />
          <div className="absolute top-[20%] left-[10%] w-4 h-4 bg-teal-200 rounded-full opacity-40" />
          <div className="absolute bottom-[30%] right-[15%] w-6 h-6 bg-blue-200 rounded-full opacity-40" />
        </div>

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <Breadcrumbs items={[
            { label: "Конференции", href: "/conferences" },
            { label: "SMS 2026" }
          ]} />
          
          <div className="mt-8 max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full px-4 py-1.5 mb-8 shadow-sm">
              <Badge variant="secondary" className="bg-teal-100 text-teal-700 hover:bg-teal-200 border-0">
                Анонс 2026
              </Badge>
              <span className="text-sm font-medium text-slate-600">Научно-практическая конференция</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-8 leading-[1.1] tracking-tight">
              Миниинвазивная хирургия / <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600">
                Молочная железа
              </span>
            </h1>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 text-lg text-slate-600 mb-10">
              <div className="flex items-center gap-3 bg-white/50 px-4 py-2 rounded-xl border border-slate-100/50 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-slate-900 leading-none mb-1">{day} {month} 2026</div>
                  <div className="text-sm text-slate-500">{dayOfWeek}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-white/50 px-4 py-2 rounded-xl border border-slate-100/50 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-slate-900 leading-none mb-1">МКНЦ имени Логинова</div>
                  <div className="text-sm text-slate-500">г. Москва</div>
                </div>
              </div>
            </div>

            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed mb-12">
              Приглашаем вас на главное событие года в области малоинвазивной хирургии молочной железы с участием международных экспертов.
            </p>

            <div className="flex justify-center">
               <a href="#registration" className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white transition-all duration-200 bg-slate-900 font-pj rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 hover:bg-slate-800 hover:shadow-lg hover:-translate-y-1">
                  Зарегистрироваться сейчас
                  <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
               </a>
            </div>
          </div>
        </div>
      </div>

      <main>
        {/* About Section - Clean layout */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row gap-16 items-start">
              <div className="flex-1">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                  О конференции
                </h2>
                <div className="prose prose-lg prose-slate text-slate-600 leading-relaxed">
                  <p className="mb-6">
                    <span className="font-semibold text-slate-900">Третья</span> научно-практическая конференция Xishan-Зенит с международным участием станет площадкой для обмена опытом и знаниями с ведущими специалистами из <span className="font-semibold text-slate-900">России, Китая, Белоруссии, Армении, Казахстана, Грузии, Ирака и Южной Кореи</span>.
                  </p>
                  <p>
                    Прошлогоднее мероприятие показало высокий интерес к малоинвазивным методикам, и мы уверены, что вместе сможем расширить границы их применения в клинической практике.
                  </p>
                </div>
                
                <div className="mt-8 flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                        <User className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                        <div className="font-bold text-slate-900">Владислав Одинцов</div>
                        <div className="text-sm text-slate-500">д.м.н., профессор, председатель конференции</div>
                    </div>
                </div>
              </div>
              
              <div className="flex-1 bg-slate-50 rounded-3xl p-8 md:p-10 border border-slate-100">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Star className="w-5 h-5 text-teal-500 fill-teal-500" />
                  В программе
                </h3>
                <ul className="space-y-6">
                  <li className="flex gap-4">
                    <div className="mt-1 min-w-6 min-h-6 w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">Интервенционные методы</h4>
                      <p className="text-sm text-slate-600">Обсуждение актуальных аспектов применения в клинической практике.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <div className="mt-1 min-w-6 min-h-6 w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">Международный обмен</h4>
                      <p className="text-sm text-slate-600">Новые достижения в области малоинвазивной хирургии от зарубежных коллег.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <div className="mt-1 min-w-6 min-h-6 w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">Нетворкинг</h4>
                      <p className="text-sm text-slate-600">Укрепление профессиональных связей и вдохновение на новые открытия.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Speakers Section - Grid layout with hover effects */}
        <section className="py-20 bg-slate-50/50 border-y border-slate-200/60">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Наши спикеры</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Ведущие эксперты в области онкологии и малоинвазивной хирургии
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {speakers.map((speaker, index) => (
                <div 
                  key={index} 
                  className="group bg-white rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100"
                >
                  <div className="flex items-start gap-6">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200 shadow-sm relative group-hover:scale-105 transition-transform duration-300">
                      <Image 
                        src={speaker.image} 
                        alt={speaker.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-teal-700 transition-colors">
                        {speaker.name}
                      </h3>
                      <p className="text-sm font-medium text-teal-600 mb-3 uppercase tracking-wide text-xs">
                        {speaker.title.split(',')[0]}
                      </p>
                      <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                        {speaker.title.split(',').slice(1).join(',')}
                      </p>
                      <p className="text-slate-500 text-sm border-t border-slate-100 pt-3 italic flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        {speaker.institution}
                      </p>
                      <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                        <Mic2 className="w-3 h-3" />
                        {speaker.topic}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Program Placeholder */}
        <section className="py-20 bg-white">
            <div className="container mx-auto px-4 md:px-6 text-center">
                 <h2 className="text-3xl font-bold text-slate-900 mb-8">Программа мероприятия</h2>
                 <div className="max-w-3xl mx-auto border-2 border-dashed border-slate-200 rounded-3xl p-12 bg-slate-50/50">
                    <p className="text-xl text-slate-500 font-medium">
                        Полная программа конференции находится на стадии формирования
                    </p>
                    <p className="text-slate-400 mt-2">
                        Следите за обновлениями на сайте
                    </p>
                 </div>
            </div>
        </section>

        {/* Registration Section - Dark theme for contrast */}
        <section id="registration" className="py-20 bg-slate-900 text-white relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
             <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          </div>
          
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <Badge className="bg-teal-500 text-white hover:bg-teal-600 border-0 mb-6 px-4 py-1">
                    Регистрация открыта
                </Badge>
                <h2 className="text-3xl md:text-5xl font-bold mb-6">Я приеду!</h2>
                <p className="text-xl text-slate-300 mb-2">
                  Участие в конференции бесплатное. Количество мест ограничено.
                </p>
              </div>

              <div className="mb-16">
                 <CountdownTimer targetDate={conferenceDate} />
              </div>

              <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl">
                <div className="text-slate-900 mb-8 text-center">
                    <h3 className="text-2xl font-bold mb-2">Заполните анкету участника</h3>
                    <p className="text-slate-500">Это займет не более 2 минут</p>
                </div>
                <ConferenceRegistrationForm conferenceName="Миниинвазивная хирургия / Молочная железа 2026" />
              </div>
            </div>
          </div>
        </section>

        {/* Location & Contacts - Side by side */}
        <section className="py-20 bg-slate-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              {/* Location */}
              <Card className="border-0 shadow-lg bg-white overflow-hidden h-full">
                <div className="bg-teal-600 p-6 text-white">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Место проведения
                    </h3>
                </div>
                <CardContent className="p-8">
                  <p className="text-xl font-bold text-slate-900 mb-2">МКНЦ имени Логинова</p>
                  <p className="text-lg text-slate-600 mb-6">г. Москва, шоссе Энтузиастов, д. 86</p>
                  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h4 className="font-semibold text-slate-900 mb-2 text-sm uppercase">Для иногородних</h4>
                    <p className="text-slate-600 text-sm">
                      Информация о размещении и специальных условиях для иногородних участников уточняется.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Contacts */}
              <Card className="border-0 shadow-lg bg-white overflow-hidden h-full">
                <div className="bg-slate-800 p-6 text-white">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Контакты оргкомитета
                    </h3>
                </div>
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div>
                      <p className="text-slate-900 font-bold text-lg mb-1">Юлия Игоревна Борисенкова</p>
                      <p className="text-slate-500 text-sm">Генеральный директор Компании Зенит</p>
                      <p className="text-slate-500 text-sm">Генеральный директор Клиники Одинцова</p>
                    </div>
                    
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <a href="tel:+78127482213" className="flex items-center gap-3 text-slate-600 hover:text-teal-600 transition-colors group">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-teal-50 transition-colors">
                            <span className="font-bold">📞</span>
                        </div>
                        <span className="text-lg font-medium">+7 812 748 22 13</span>
                      </a>
                      <a href="mailto:info@zenitmed.ru" className="flex items-center gap-3 text-slate-600 hover:text-teal-600 transition-colors group">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-teal-50 transition-colors">
                            <span className="font-bold">✉️</span>
                        </div>
                        <span className="text-lg font-medium">info@zenitmed.ru</span>
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
