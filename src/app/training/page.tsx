import { RequestCPModal } from "@/components/RequestCPModal";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { GraduationCap, Users, Calendar, Award, CheckCircle, Activity, Microscope, Clock, UserCheck, Stethoscope } from "lucide-react";
import { PastEvents } from "@/components/PastEvents";

export const metadata: Metadata = {
  title: "Обучение ВАБ и интервенционной маммологии | Курсы для врачей",
  description: "Курс повышения квалификации по вакуумной биопсии (ВАБ) и ТАБ. 36 ак. часов. Практика на фантомах и в клинике. Преподаватель д.м.н. Одинцов В.А. Выдача удостоверения.",
  keywords: ["обучение ВАБ", "курсы маммологии", "интервенционная маммология обучение", "вакуумная биопсия обучение", "Одинцов В.А. курсы", "повышение квалификации маммологов", "мастер-класс биопсия"],
};

export default function Training() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    'name': 'Интервенционная маммология. Диагностика и лечение',
    'description': 'Комплексная программа повышения квалификации для врачей УЗД, хирургов и онкологов по методам ВАБ и ТАБ.',
    'provider': {
      '@type': 'Organization',
      'name': 'Учебный центр Xishan-Зенит',
      'sameAs': 'https://fibroadenoma.net'
    },
    'instructor': {
      '@type': 'Person',
      'name': 'Одинцов Владислав Александрович',
      'description': 'Д.м.н., онколог, хирург, врач УЗД, ведущий эксперт в области интервенционной маммологии'
    },
    'courseMode': 'in-person',
    'educationalCredentialAwarded': 'Удостоверение о повышении квалификации государственного образца',
    'timeRequired': 'P5D',
    'offers': {
      '@type': 'Offer',
      'category': 'Paid'
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-teal-100 selection:text-teal-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />

      <div className="pt-24 pb-12 bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 md:px-6">
          <Breadcrumbs items={[{ label: "Обучение" }]} />
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mt-6 mb-4 leading-tight">
            Обучение ВАБ: Курс интервенционной маммологии
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl leading-relaxed">
            Повышение квалификации для врачей-маммологов, онкологов и хирургов. 
            Регулярные мастер-классы, конференции и практические занятия на современном оборудовании.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 md:px-6 py-12">
        
        {/* Featured Course Hero Section */}
        <section className="mb-24">
           <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
             <div className="grid lg:grid-cols-[1.4fr_1fr] gap-0">
                <div className="p-8 md:p-16 flex flex-col justify-center relative z-10">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-teal-50/50 via-white to-blue-50/50 -z-10"></div>
                    
                    <div className="flex flex-wrap gap-3 mb-8 self-start">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-sm font-semibold text-slate-600">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Идет набор группы
                        </div>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-sm font-semibold text-slate-600">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            Курсы проходят ежемесячно
                        </div>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-[1.1]">
                        Интервенционная маммология. <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600">
                            Диагностика и лечение
                        </span>
                    </h2>
                    
                    <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                        Комплексная программа повышения квалификации для врачей УЗД, хирургов и онкологов. 
                        Освойте передовые методики вакуумно-аспирационной биопсии и малоинвазивных вмешательств 
                        под контролем УЗИ под руководством ведущего эксперта в области интервенционной маммологии.
                    </p>
                    
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 mb-10">
                        <div className="flex items-start gap-3">
                            <UserCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-slate-700 leading-relaxed">
                                <span className="font-semibold">Целевая аудитория:</span> сертифицированные специалисты по специальностям 
                                &quot;Ультразвуковая диагностика&quot;, &quot;Хирургия&quot;, &quot;Онкология&quot; с высшим медицинским образованием
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <RequestCPModal 
                            title="Запись на курс" 
                            description="Заполните форму для регистрации на курс. Наш менеджер свяжется с вами для подтверждения участия."
                            formType="training"
                        >
                            <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all hover:scale-105">
                                Записаться на курс
                            </Button>
                        </RequestCPModal>
                        <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-slate-300 hover:bg-slate-50 transition-all" asChild>
                            <Link href="#program">Программа курса</Link>
                        </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mt-12 pt-12 border-t border-slate-200/60">
                        <div>
                            <div className="text-3xl font-bold text-slate-900 mb-1">36</div>
                            <div className="text-sm font-medium text-slate-500">ак. часов</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-slate-900 mb-1">5</div>
                            <div className="text-sm font-medium text-slate-500">дней обучения</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-slate-900 mb-1">СПб</div>
                            <div className="text-sm font-medium text-slate-500">очно</div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-100 relative min-h-[400px] lg:min-h-full">
                    <Image 
                        src="/images/odintsov.jpg" 
                        alt="Обучение в клинике" 
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 from-5% via-slate-900/60 via-25% to-transparent to-50%"></div>
                    <div className="absolute inset-0 hidden lg:block bg-gradient-to-l from-transparent to-slate-900/20"></div>
                    
                    <div className="absolute bottom-8 left-8 right-8 text-white">
                        <div className="flex items-center gap-4 mb-2">
                             <div className="w-12 h-12 rounded-full border-2 border-white/30 overflow-hidden relative">
                                <Image src="/images/odintsov.jpg" alt="Одинцов В.А." fill className="object-cover" />
                             </div>
                             <div>
                                 <div className="font-bold text-lg">Одинцов В.А.</div>
                                 <div className="text-slate-300 text-sm">Автор курса, д.м.н.</div>
                             </div>
                        </div>
                        <p className="italic text-slate-200 text-sm pl-4 border-l-2 border-teal-500">
                            &quot;Мы даем не просто теорию, а ставим руку. Каждый курсант самостоятельно выполняет манипуляции.&quot;
                        </p>
                    </div>
                </div>
             </div>
           </div>
        </section>

        {/* Instructor Section */}
        <section className="mb-24 max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl overflow-hidden shadow-2xl">
                <div className="grid lg:grid-cols-[300px_1fr] gap-0">
                    <div className="bg-slate-800/50 p-8 flex items-center justify-center border-r border-slate-700/50">
                        <div className="relative w-48 h-48 rounded-2xl overflow-hidden shadow-xl ring-4 ring-white/10">
                            <Image src="/images/odintsov.jpg" alt="Одинцов Владислав Александрович" fill className="object-cover" />
                        </div>
                    </div>
                    <div className="p-8 md:p-12 text-white">
                        <Badge className="bg-teal-500 text-white hover:bg-teal-600 border-0 mb-4">Преподаватель курса</Badge>
                        <h3 className="text-3xl font-bold mb-2">Одинцов Владислав Александрович</h3>
                        <p className="text-teal-300 text-lg mb-6 font-medium">Доктор медицинских наук</p>
                        
                        <div className="space-y-3 text-slate-300">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                                <span>Онколог, хирург, врач УЗД, рентгенолог</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                                <span>Главный врач ООО «Клиника Одинцова»</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                                <span>Профессор кафедры лучевой диагностики, лучевой терапии и онкологии ФГБОУ ВО СГМУ Минздрава России</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                                <span>Ведущий эксперт в области интервенционной маммологии в России</span>
                            </div>
                        </div>
                        
                        <div className="mt-8 pt-6 border-t border-slate-700">
                            <p className="italic text-slate-200 text-lg leading-relaxed">
                                &quot;Мы даем не просто теорию, а ставим руку. Каждый курсант самостоятельно выполняет манипуляции 
                                под контролем опытного наставника.&quot;
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Benefits / Infographics */}
        <section className="mb-24">
            <h3 className="text-3xl font-bold text-center text-slate-900 mb-16">Почему врачи выбирают этот курс</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    {
                        icon: <Activity className="w-8 h-8 text-white" />,
                        color: "bg-teal-500",
                        title: "Практический упор",
                        desc: "Отработка навыков ТАБ и ВАБ на индивидуальных фантомах под контролем врача-онколога."
                    },
                    {
                        icon: <Microscope className="w-8 h-8 text-white" />,
                        color: "bg-blue-600",
                        title: "Современное оборудование",
                        desc: "Обучение на новейших системах ВАБ, УЗИ-аппаратах экспертного класса в реальных условиях клиники."
                    },
                    {
                        icon: <Award className="w-8 h-8 text-white" />,
                        color: "bg-purple-600",
                        title: "Документы гособразца",
                        desc: "Удостоверение о повышении квалификации установленного образца после успешного завершения курса."
                    },
                    {
                        icon: <Users className="w-8 h-8 text-white" />,
                        color: "bg-orange-500",
                        title: "Малые группы",
                        desc: "Индивидуальный подход к каждому курсанту, персональные фантомы для отработки навыков."
                    }
                ].map((item, idx) => (
                    <div key={idx} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                        <div className={`w-16 h-16 rounded-2xl ${item.color} flex items-center justify-center mb-6 shadow-md transform rotate-3`}>
                            {item.icon}
                        </div>
                        <h4 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h4>
                        <p className="text-slate-600 leading-relaxed">
                            {item.desc}
                        </p>
                    </div>
                ))}
            </div>
        </section>

        {/* Program Details Section */}
        <section id="program" className="mb-24 max-w-6xl mx-auto">
            <div className="text-center mb-16">
                 <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-0 mb-4 px-4 py-1 text-base">Программа 36 академических часов</Badge>
                 <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Детальная программа курса</h2>
                 <p className="text-slate-500 mt-4 text-lg">Пошаговое погружение в интервенционную маммологию с практическими занятиями</p>
            </div>

            <div className="space-y-6">
                {/* День 1 */}
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:border-teal-200 transition-colors shadow-md">
                    <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-8 py-6 text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-2xl border-2 border-white/30">1</div>
                            <div>
                                <div className="text-sm font-semibold uppercase tracking-wider opacity-90">День 1</div>
                                <h4 className="text-2xl font-bold">Основы УЗ-диагностики и введение в интервенционную маммологию</h4>
                            </div>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="shrink-0 w-20 text-sm font-bold text-teal-600 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    10:00
                                </div>
                                <div>
                                    <h5 className="font-bold text-slate-900 mb-2">Нормальная ультразвуковая анатомия молочной железы (мифы и реальность)</h5>
                                    <ul className="space-y-2 text-slate-600">
                                        <li className="flex items-start gap-2">
                                            <span className="text-teal-500 font-bold">•</span>
                                            <span>Сопоставление макрогистологического материала и УЗИ</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-teal-500 font-bold">•</span>
                                            <span>Варианты протоков в норме (0,2-0,3 мм) vs фиброгландулярная ткань</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-teal-500 font-bold">•</span>
                                            <span>Роль гормонов в формировании паренхимы молочной железы</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-teal-500 font-bold">•</span>
                                            <span>Клинико-эхографические примеры и варианты протоколов УЗИ</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="shrink-0 w-20 text-sm font-bold text-teal-600 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    11:00
                                </div>
                                <div>
                                    <h5 className="font-bold text-slate-900 mb-2">Диффузные изменения молочных желёз</h5>
                                    <ul className="space-y-2 text-slate-600">
                                        <li className="flex items-start gap-2">
                                            <span className="text-teal-500 font-bold">•</span>
                                            <span>Возможности УЗ-диагностики при дисгормональных состояниях</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-teal-500 font-bold">•</span>
                                            <span>Дифференциальный диагноз: аденозы, фиброзы, ФАМ (с гистологическим подтверждением)</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-teal-500 font-bold">•</span>
                                            <span>Онконастороженность при диффузных изменениях</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-teal-500 font-bold">•</span>
                                            <span>Рекомендации по консервативному лечению</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="shrink-0 w-20 text-sm font-bold text-teal-600 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    12:00
                                </div>
                                <div>
                                    <h5 className="font-bold text-slate-900 mb-2">Методы интервенционной диагностики и лечения</h5>
                                    <ul className="space-y-2 text-slate-600">
                                        <li className="flex items-start gap-2">
                                            <span className="text-teal-500 font-bold">•</span>
                                            <span>Техника выполнения тонкоигольной аспирационной биопсии (ТАБ) под УЗ-контролем</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-teal-500 font-bold">•</span>
                                            <span>Правила контроля иглы: методы &quot;Рычага&quot;, &quot;Качелей&quot;, правило &quot;циферблата&quot;</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-teal-500 font-bold">•</span>
                                            <span>Гидропрепаровка и местная анестезия под УЗ-навигацией</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-teal-500 font-bold">•</span>
                                            <span>Устройства для вакуумной аспирационной биопсии (ВАБ)</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-teal-500 font-bold">•</span>
                                            <span>Оценка начальных навыков владения ТАБ</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-6 mt-6">
                                <div className="flex gap-4">
                                    <div className="shrink-0 w-20 text-sm font-bold text-orange-600 flex items-center gap-2">
                                        <Activity className="w-4 h-4" />
                                        15:00
                                    </div>
                                    <div className="flex-grow">
                                        <h5 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                                            <span>Практическое занятие</span>
                                            <Badge className="bg-orange-500 text-white">4 часа практики</Badge>
                                        </h5>
                                        <ul className="space-y-2 text-slate-700">
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                                <span>Отработка навыков ТАБ на индивидуальных фантомах</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                                <span>Техника анестезии и гидропрепаровки под УЗ-контролем</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                                <span>Демонстрация ТАБ и ВАБ на рабочем месте в клинике</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                                <span>Контроль под наблюдением практикующего врача-онколога</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                                <span>Оценка полученных навыков</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* День 2 */}
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:border-blue-200 transition-colors shadow-md">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-6 text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-2xl border-2 border-white/30">2</div>
                            <div>
                                <div className="text-sm font-semibold uppercase tracking-wider opacity-90">День 2</div>
                                <h4 className="text-2xl font-bold">Полостные образования молочной железы</h4>
                            </div>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="shrink-0 w-20 text-sm font-bold text-blue-600 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    10:00
                                </div>
                                <div>
                                    <h5 className="font-bold text-slate-900 mb-2">BI-RADS 2 — группа наблюдения или консервативного лечения</h5>
                                    <ul className="space-y-2 text-slate-600">
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-500 font-bold">•</span>
                                            <span>Простые кисты: множественные микрокисты, многокамерные кисты, кластерные кисты</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-500 font-bold">•</span>
                                            <span>Внутрикожные кисты и их особенности</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-500 font-bold">•</span>
                                            <span>Механизм формирования кист (роль дисбиотического процесса, а не обструкции протоков)</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="shrink-0 w-20 text-sm font-bold text-blue-600 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    11:00
                                </div>
                                <div>
                                    <h5 className="font-bold text-slate-900 mb-2">BI-RADS 3 — категория, требующая лечебно-диагностической пункции</h5>
                                    <ul className="space-y-2 text-slate-600">
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-500 font-bold">•</span>
                                            <span>Осложнённые кисты: со взвесью, с уровнем, с густым содержимым</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-500 font-bold">•</span>
                                            <span>Кисты с белково-липидным осадком, макрокисты, гигантские кисты</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-500 font-bold">•</span>
                                            <span>Клинические примеры и варианты заключений УЗИ</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-500 font-bold">•</span>
                                            <span>Лечебно-диагностические методы интервенций</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="shrink-0 w-20 text-sm font-bold text-blue-600 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    12:00
                                </div>
                                <div>
                                    <h5 className="font-bold text-slate-900 mb-2">BI-RADS 4 — обязательная гистологическая верификация</h5>
                                    <ul className="space-y-2 text-slate-600">
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-500 font-bold">•</span>
                                            <span>Комплексные кисты: апокриновые, с солидным включением</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-500 font-bold">•</span>
                                            <span>Кисты с толстыми септами, микрокистозная кластерная перестройка</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-500 font-bold">•</span>
                                            <span>Показания к Core-биопсии и ВАБ</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="shrink-0 w-20 text-sm font-bold text-blue-600 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    13:00
                                </div>
                                <div>
                                    <h5 className="font-bold text-slate-900 mb-2">Демонстрация интервенционных методов лечения кист</h5>
                                    <ul className="space-y-2 text-slate-600">
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-500 font-bold">•</span>
                                            <span>Отработка навыка озонотерапии на фантомах</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-500 font-bold">•</span>
                                            <span>Отмывка густых кист под УЗ-контролем</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-500 font-bold">•</span>
                                            <span>Гидропрепаровка и анестезия комплексных кист</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-500 font-bold">•</span>
                                            <span>Выполнение ВАБ под УЗ-контролем</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-6 mt-6">
                                <div className="flex gap-4">
                                    <div className="shrink-0 w-20 text-sm font-bold text-orange-600 flex items-center gap-2">
                                        <Activity className="w-4 h-4" />
                                        15:00
                                    </div>
                                    <div className="flex-grow">
                                        <h5 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                                            <span>Практическое занятие</span>
                                            <Badge className="bg-orange-500 text-white">4 часа практики</Badge>
                                        </h5>
                                        <ul className="space-y-2 text-slate-700">
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                                <span>Отработка ТАБ полостных образований на фантомах</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                                <span>Техника анестезии и гидропрепаровки кист</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                                <span>Демонстрация процедур в кабинете клиники Одинцова</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                                <span>Контроль под наблюдением врача-онколога</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* День 3 */}
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:border-purple-200 transition-colors shadow-md">
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-8 py-6 text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-2xl border-2 border-white/30">3</div>
                            <div>
                                <div className="text-sm font-semibold uppercase tracking-wider opacity-90">День 3</div>
                                <h4 className="text-2xl font-bold">Патология протоков и мастодиния</h4>
                            </div>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="shrink-0 w-20 text-sm font-bold text-purple-600 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    10:00
                                </div>
                                <div>
                                    <h5 className="font-bold text-slate-900 mb-2">Простая дуктэктазия, BI-RADS 2</h5>
                                    <ul className="space-y-2 text-slate-600">
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500 font-bold">•</span>
                                            <span>Физиологические выделения из сосков</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500 font-bold">•</span>
                                            <span>Диагностика, причины, тактика лечения</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500 font-bold">•</span>
                                            <span>Варианты протоколов УЗИ и заключений</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500 font-bold">•</span>
                                            <span>Рекомендации по консервативному лечению</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="shrink-0 w-20 text-sm font-bold text-purple-600 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    11:00
                                </div>
                                <div>
                                    <h5 className="font-bold text-slate-900 mb-2">Осложненная дуктэктазия, BI-RADS 3</h5>
                                    <ul className="space-y-2 text-slate-600">
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500 font-bold">•</span>
                                            <span>Мутно-цветные (дисбиотические) выделения из сосков</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500 font-bold">•</span>
                                            <span>Диагностика и дифференциальная диагностика</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500 font-bold">•</span>
                                            <span>Клинические примеры и протоколы УЗИ</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500 font-bold">•</span>
                                            <span>Методы консервативного и интервенционного лечения</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="shrink-0 w-20 text-sm font-bold text-purple-600 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    12:00
                                </div>
                                <div>
                                    <h5 className="font-bold text-slate-900 mb-2">Комплексная дуктэктазия, BI-RADS 4</h5>
                                    <ul className="space-y-2 text-slate-600">
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500 font-bold">•</span>
                                            <span>Патологические выделения из сосков</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500 font-bold">•</span>
                                            <span>Лечебно-диагностические методы интервенций</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500 font-bold">•</span>
                                            <span>Тонкоигольное проточное дренирование протоков под УЗ-навигацией</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="shrink-0 w-20 text-sm font-bold text-purple-600 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    13:00
                                </div>
                                <div>
                                    <h5 className="font-bold text-slate-900 mb-2">Мастодиния — современный взгляд</h5>
                                    <ul className="space-y-2 text-slate-600">
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500 font-bold">•</span>
                                            <span>Роль пролактина и окситоцина при диффузной дуктэктазии</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500 font-bold">•</span>
                                            <span>Дисбиозы молочной железы как основная причина мастодинии</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500 font-bold">•</span>
                                            <span>Субклинические и подострые нелактационные маститы</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500 font-bold">•</span>
                                            <span>Механизм боли: роль механорецепторов в протоках (не в строме!)</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500 font-bold">•</span>
                                            <span>Клинико-эхографические комплексы в выборе тактики лечения</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-6 mt-6">
                                <div className="flex gap-4">
                                    <div className="shrink-0 w-20 text-sm font-bold text-orange-600 flex items-center gap-2">
                                        <Activity className="w-4 h-4" />
                                        15:00
                                    </div>
                                    <div className="flex-grow">
                                        <h5 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                                            <span>Практическое занятие</span>
                                            <Badge className="bg-orange-500 text-white">4 часа практики</Badge>
                                        </h5>
                                        <ul className="space-y-2 text-slate-700">
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                                <span>Отработка ТАБ полостных образований на индивидуальных фантомах</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                                <span>Техника анестезии и гидропрепаровки</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                                <span>Демонстрация ТАБ, ВАБ на рабочем месте в клинике</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                                <span>Контроль под наблюдением врача-онколога</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* День 4 */}
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:border-rose-200 transition-colors shadow-md">
                    <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-8 py-6 text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-2xl border-2 border-white/30">4</div>
                            <div>
                                <div className="text-sm font-semibold uppercase tracking-wider opacity-90">День 4</div>
                                <h4 className="text-2xl font-bold">Солидные образования молочной железы</h4>
                            </div>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="shrink-0 w-20 text-sm font-bold text-rose-600 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    10:00
                                </div>
                                <div>
                                    <h5 className="font-bold text-slate-900 mb-2">Простые узлы, BI-RADS 2</h5>
                                    <ul className="space-y-2 text-slate-600">
                                        <li className="flex items-start gap-2">
                                            <span className="text-rose-500 font-bold">•</span>
                                            <span>Доброкачественные образования без признаков злокачественности</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-rose-500 font-bold">•</span>
                                            <span>Рекомендации по консервативному лечению и наблюдению</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-rose-500 font-bold">•</span>
                                            <span>Дополнительные методы диагностики</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="shrink-0 w-20 text-sm font-bold text-rose-600 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    11:00
                                </div>
                                <div>
                                    <h5 className="font-bold text-slate-900 mb-2">Сомнительные узлы, BI-RADS 3</h5>
                                    <ul className="space-y-2 text-slate-600">
                                        <li className="flex items-start gap-2">
                                            <span className="text-rose-500 font-bold">•</span>
                                            <span>Клинические примеры сомнительных образований</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-rose-500 font-bold">•</span>
                                            <span>Варианты протоколов УЗИ и заключений</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-rose-500 font-bold">•</span>
                                            <span>Тактика ведения и показания к биопсии</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="shrink-0 w-20 text-sm font-bold text-rose-600 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    12:00
                                </div>
                                <div>
                                    <h5 className="font-bold text-slate-900 mb-2">Подозрительные узлы, BI-RADS 4 и 5</h5>
                                    <ul className="space-y-2 text-slate-600">
                                        <li className="flex items-start gap-2">
                                            <span className="text-rose-500 font-bold">•</span>
                                            <span>Солидные образования с высоким потенциалом злокачественности</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-rose-500 font-bold">•</span>
                                            <span>Типирование опухоли по УЗ-признакам</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-rose-500 font-bold">•</span>
                                            <span>Обязательность гистологической верификации</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="shrink-0 w-20 text-sm font-bold text-rose-600 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    13:00
                                </div>
                                <div>
                                    <h5 className="font-bold text-slate-900 mb-2">Демонстрация Core-биопсии и ВАБ</h5>
                                    <ul className="space-y-2 text-slate-600">
                                        <li className="flex items-start gap-2">
                                            <span className="text-rose-500 font-bold">•</span>
                                            <span>Техника Core-биопсии под УЗ-навигацией</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-rose-500 font-bold">•</span>
                                            <span>Особенности выполнения ВАБ при различных локализациях:</span>
                                        </li>
                                        <li className="flex items-start gap-2 pl-6">
                                            <span className="text-slate-400">→</span>
                                            <span>Образования более 3 см</span>
                                        </li>
                                        <li className="flex items-start gap-2 pl-6">
                                            <span className="text-slate-400">→</span>
                                            <span>Ретромаммарная локализация</span>
                                        </li>
                                        <li className="flex items-start gap-2 pl-6">
                                            <span className="text-slate-400">→</span>
                                            <span>Подкожная и субареолярная локализация</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-rose-500 font-bold">•</span>
                                            <span>Методы профилактики осложнений ВАБ</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-6 mt-6">
                                <div className="flex gap-4">
                                    <div className="shrink-0 w-20 text-sm font-bold text-orange-600 flex items-center gap-2">
                                        <Activity className="w-4 h-4" />
                                        15:00
                                    </div>
                                    <div className="flex-grow">
                                        <h5 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                                            <span>Практическое занятие</span>
                                            <Badge className="bg-orange-500 text-white">4 часа практики</Badge>
                                        </h5>
                                        <ul className="space-y-2 text-slate-700">
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                                <span>Отработка навыков ВАБ на индивидуальных фантомах</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                                <span>Демонстрация ВАБ на рабочем месте в клинике Одинцова</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                                <span>Работа с солидными образованиями различной локализации</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                                <span>Контроль под наблюдением врача-онколога</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* День 5 */}
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:border-emerald-200 transition-colors shadow-md">
                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-6 text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-2xl border-2 border-white/30">5</div>
                            <div>
                                <div className="text-sm font-semibold uppercase tracking-wider opacity-90">День 5</div>
                                <h4 className="text-2xl font-bold">Итоговая аттестация и мультимодальная визуализация</h4>
                            </div>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="shrink-0 w-20 text-sm font-bold text-emerald-600 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    10:00
                                </div>
                                <div>
                                    <h5 className="font-bold text-slate-900 mb-2">Оценка навыков выполнения ВАБ под УЗ-навигацией</h5>
                                    <ul className="space-y-2 text-slate-600">
                                        <li className="flex items-start gap-2">
                                            <span className="text-emerald-500 font-bold">•</span>
                                            <span>Практическая демонстрация полученных навыков</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-emerald-500 font-bold">•</span>
                                            <span>Самостоятельное выполнение манипуляций под контролем</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-emerald-500 font-bold">•</span>
                                            <span>Оценка техники и качества выполнения процедур</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="shrink-0 w-20 text-sm font-bold text-emerald-600 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    12:00
                                </div>
                                <div>
                                    <h5 className="font-bold text-slate-900 mb-2">Курс мультимодальной визуализации молочной железы</h5>
                                    <ul className="space-y-2 text-slate-600">
                                        <li className="flex items-start gap-2">
                                            <span className="text-emerald-500 font-bold">•</span>
                                            <span>Занятие на базе ФГБУ &quot;НМИЦ онкологии им. Н.Н. Петрова&quot;</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-emerald-500 font-bold">•</span>
                                            <span>Интеграция УЗИ, маммографии и МРТ в диагностике</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-emerald-500 font-bold">•</span>
                                            <span>Разбор сложных клинических случаев</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-emerald-500 font-bold">•</span>
                                            <span>Современные подходы к комплексной диагностике</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 mt-6">
                                <div className="flex gap-4">
                                    <div className="shrink-0 w-20 text-sm font-bold text-emerald-600 flex items-center gap-2">
                                        <Award className="w-4 h-4" />
                                        18:00
                                    </div>
                                    <div className="flex-grow">
                                        <h5 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                                            <span>Круглый стол и завершение курса</span>
                                            <Badge className="bg-emerald-500 text-white">Вручение сертификатов</Badge>
                                        </h5>
                                        <ul className="space-y-2 text-slate-700">
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                                <span>Обсуждение итогов обучения</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                                <span>Ответы на вопросы курсантов</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                                <span>Вручение удостоверений о повышении квалификации</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                                <span>Рекомендации по дальнейшему профессиональному развитию</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="mt-12 bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl border border-slate-200 p-8">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
                            <Stethoscope className="w-8 h-8 text-blue-600" />
                        </div>
                    </div>
                    <div className="flex-grow">
                        <h4 className="text-xl font-bold text-slate-900 mb-3">После прохождения обучения</h4>
                        <div className="space-y-3 text-slate-700">
                            <p className="flex items-start gap-2">
                                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                <span>Выдается <strong>удостоверение о повышении квалификации</strong> государственного образца</span>
                            </p>
                            <p className="flex items-start gap-2">
                                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                <span>Вы получите практические навыки выполнения ТАБ и ВАБ под контролем УЗИ</span>
                            </p>
                            <p className="flex items-start gap-2">
                                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                <span>Сможете самостоятельно проводить интервенционные вмешательства в своей практике</span>
                            </p>
                            <p className="flex items-start gap-2">
                                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                <span>Получите доступ к материалам курса и методическим рекомендациям</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center">
                <RequestCPModal 
                    title="Запись на курс" 
                    description="Заполните форму для регистрации на курс. Наш менеджер свяжется с вами для подтверждения участия и сообщения даты следующего набора."
                    formType="training"
                >
                    <Button size="lg" className="h-14 px-12 text-lg rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/20 transition-all hover:scale-105">
                        Записаться на курс
                    </Button>
                </RequestCPModal>
            </div>
        </section>

        {/* Past Events Section (FILTERED) */}
        <section id="past-trainings" className="bg-slate-50 -mx-4 md:-mx-6 px-4 md:px-6 py-24">
           <div className="container mx-auto">
                <div className="flex items-center justify-between gap-4 mb-12">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-900">
                            <GraduationCap className="w-7 h-7 text-teal-600" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900">Прошедшие обучения</h2>
                            <p className="text-slate-500">Фотоотчеты и новости учебного центра</p>
                        </div>
                    </div>
                </div>
                
                <PastEvents categories={['Обучение']} />
           </div>
        </section>

        {/* CTA Section */}
        <section className="mt-24 text-center py-16 bg-slate-900 rounded-3xl relative overflow-hidden">
          <div className="relative z-10 container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-4 text-white">Хотите организовать выездной цикл?</h2>
            <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
                Мы открыты к сотрудничеству с клиниками и учебными центрами в регионах. Свяжитесь с нами для обсуждения условий выездных циклов и мастер-классов.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                 <Button size="lg" className="bg-teal-600 hover:bg-teal-700 text-white px-8 rounded-full h-12 text-lg shadow-lg shadow-teal-900/20" asChild>
                    <Link href="/contacts">Связаться с нами</Link>
                </Button>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
