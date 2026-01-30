import { RequestCPModal } from "@/components/RequestCPModal";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { GraduationCap, Users, Calendar, Award, CheckCircle, Activity, Microscope } from "lucide-react";
import { PastEvents } from "@/components/PastEvents";

export const metadata: Metadata = {
  title: "Обучение и Мероприятия",
  description: "Обучающие курсы, мастер-классы и конференции по интервенционной маммологии. Расписание мероприятий и архив прошедших событий.",
};

export default function Training() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-teal-100 selection:text-teal-900">
      <Header />

      <div className="pt-24 pb-12 bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 md:px-6">
          <Breadcrumbs items={[{ label: "Обучение" }]} />
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mt-6 mb-4 leading-tight">
            Учебный центр <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600">
              Xishan-Зенит
            </span>
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
                    
                    <p className="text-lg text-slate-600 mb-10 leading-relaxed">
                        Комплексная программа повышения квалификации. Освойте передовые методики вакуумно-аспирационной биопсии и малоинвазивных вмешательств под руководством ведущих экспертов.
                    </p>

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

        {/* Benefits / Infographics */}
        <section className="mb-24">
            <h3 className="text-3xl font-bold text-center text-slate-900 mb-16">Почему врачи выбирают этот курс</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    {
                        icon: <Activity className="w-8 h-8 text-white" />,
                        color: "bg-teal-500",
                        title: "Практический упор",
                        desc: "70% времени посвящено практике на фантомах и ассистированию в операционной."
                    },
                    {
                        icon: <Microscope className="w-8 h-8 text-white" />,
                        color: "bg-blue-600",
                        title: "Современное оборудование",
                        desc: "Обучение на новейших системах ВАБ, УЗИ-аппаратах экспертного класса."
                    },
                    {
                        icon: <Award className="w-8 h-8 text-white" />,
                        color: "bg-purple-600",
                        title: "Документы гособразца",
                        desc: "Выдача удостоверения о повышении квалификации и баллы НМО."
                    },
                    {
                        icon: <Users className="w-8 h-8 text-white" />,
                        color: "bg-orange-500",
                        title: "Малые группы",
                        desc: "Индивидуальный подход к каждому курсанту, группы до 5 человек."
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
        <section id="program" className="mb-24 max-w-5xl mx-auto">
            <div className="text-center mb-16">
                 <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-0 mb-4 px-4 py-1 text-base">Программа 36 часов</Badge>
                 <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Содержание курса</h2>
                 <p className="text-slate-500 mt-4 text-lg">Пошаговое погружение в интервенционную маммологию</p>
            </div>

            <div className="space-y-6">
                {[
                    { day: "День 1", title: "Теоретические основы и диагностика", topics: ["Анатомия и физиология молочной железы", "Современные методы визуализации (УЗИ, ММГ, МРТ)", "Классификация BI-RADS", "Показания к интервенционным вмешательствам"] },
                    { day: "День 2", title: "Технические аспекты биопсии", topics: ["Виды биопсийных игл и систем", "Тонкоигольная аспирационная биопсия (ТАБ)", "Трепан-биопсия (Core-биопсия)", "Отработка навыков на фантомах"] },
                    { day: "День 3", title: "Вакуумная аспирационная биопсия (ВАБ)", topics: ["Принципы работы вакуумных систем", "Показания и противопоказания к ВАБ", "Техника выполнения процедуры", "Работа в операционной (наблюдение)"] },
                    { day: "День 4", title: "Лечебные манипуляции и осложнения", topics: ["Удаление доброкачественных образований", "Дренирование кист и абсцессов", "Маркировка образований", "Профилактика и лечение осложнений"] },
                    { day: "День 5", title: "Итоговая аттестация", topics: ["Самостоятельное выполнение манипуляций на фантомах", "Разбор сложных клинических случаев", "Итоговое тестирование", "Вручение удостоверений"] }
                ].map((day, idx) => (
                    <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-teal-200 transition-colors">
                        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-10">
                            <div className="shrink-0 flex md:flex-col items-center gap-3 md:w-32">
                                <span className="text-sm font-bold uppercase tracking-wider text-slate-400">{day.day}</span>
                                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-xl border-4 border-white shadow-sm">
                                    {idx + 1}
                                </div>
                                <div className="hidden md:block h-full w-px bg-slate-100 my-2"></div>
                            </div>
                            <div className="flex-grow">
                                <h4 className="text-xl font-bold text-slate-900 mb-4">{day.title}</h4>
                                <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                                    {day.topics.map((topic, tIdx) => (
                                        <li key={tIdx} className="flex items-start gap-2 text-slate-600">
                                            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                            <span>{topic}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <p className="text-slate-500 italic">
                    * Программа может корректироваться в зависимости от уровня подготовки группы и клинических случаев в стационаре.
                    <br/>
                    Для получения полной программы в формате PDF, пожалуйста, свяжитесь с нами.
                </p>
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
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
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
