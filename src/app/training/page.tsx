import { RequestCPModal } from "@/components/RequestCPModal";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Pool } from "pg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { GraduationCap, Users, Calendar, Award, CheckCircle, Activity, Microscope, Clock, UserCheck, Stethoscope, User, Briefcase, Building2 } from "lucide-react";
import { PastEvents } from "@/components/PastEvents";
import type { Speaker } from "@/lib/types/conference";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

const instructorNames = [
  "Одинцов Владислав Александрович",
  "Приходько Кирилл Андреевич",
  "Бусько Екатерина Александровна",
] as const;

type TrainingInstructor = Speaker & {
  highlights: string[];
};

const fallbackInstructors: TrainingInstructor[] = [
  {
    id: "odintsov",
    name: "Одинцов Владислав Александрович",
    photo: "/uploads/speakers/ok3m36c5g6rml7wpfol-220bf3c6.png",
    credentials: "Д.м.н., онколог, хирург, врач УЗД, профессор, главный врач Клиники доктора Одинцова",
    institution: "Клиника Одинцова, г. Санкт-Петербург",
    highlights: [
      "Автор курса и ведущий наставник практического блока",
      "Один из ключевых экспертов по интервенционной маммологии в России",
    ],
  },
  {
    id: "prikhodko",
    name: "Приходько Кирилл Андреевич",
    photo: "/uploads/speakers/ak4qsb462chmlalgmu1-fedba319.jpg",
    credentials: "Онколог, пластический хирург, врач ультразвуковой диагностики",
    institution: "Клиника Одинцова, г. Санкт-Петербург",
    highlights: [
      "Проводит клинические разборы и отработку малоинвазивных вмешательств",
      "Сочетает онкологическую, пластическую и ультразвуковую практику",
    ],
  },
  {
    id: "busko",
    name: "Бусько Екатерина Александровна",
    photo: "/uploads/speakers/ljx6ciaysbml7zje08-5d960d98.png",
    credentials: "Д.м.н., доцент, врач ультразвуковой диагностики, врач-рентгенолог, ведущий научный сотрудник",
    institution: "НМИЦ Онкологии им. Н.Н.Петрова, г. Санкт-Петербург",
    highlights: [
      "Эксперт по лучевой и ультразвуковой диагностике молочной железы",
      "Соединяет научную работу и клиническую практику федерального центра",
    ],
  },
];

async function getTrainingInstructors(): Promise<TrainingInstructor[]> {
  try {
    const result = await pool.query<{ speakers: Speaker[] }>(
      `
        SELECT speakers
        FROM conferences
        WHERE speakers IS NOT NULL
          AND speakers::text ~ $1
        ORDER BY COALESCE(updated_at, created_at) DESC NULLS LAST
        LIMIT 1
      `,
      [instructorNames.join("|")]
    );

    const speakers = result.rows[0]?.speakers;

    if (!Array.isArray(speakers)) {
      return fallbackInstructors;
    }

    const highlightsByName: Record<string, string[]> = {
      "Одинцов Владислав Александрович": [
        "Автор курса и ведущий наставник практического блока",
        "Один из ключевых экспертов по интервенционной маммологии в России",
      ],
      "Приходько Кирилл Андреевич": [
        "Проводит клинические разборы и отработку малоинвазивных вмешательств",
        "Сочетает онкологическую, пластическую и ультразвуковую практику",
      ],
      "Бусько Екатерина Александровна": [
        "Эксперт по лучевой и ультразвуковой диагностике молочной железы",
        "Соединяет научную работу и клиническую практику федерального центра",
      ],
    };

    const speakerMap = new Map(
      speakers
        .filter((speaker) => instructorNames.includes(speaker.name as (typeof instructorNames)[number]))
        .map((speaker) => [speaker.name, speaker])
    );

    const instructors = instructorNames
      .map((name) => {
        const speaker = speakerMap.get(name);
        if (!speaker) return null;

        return {
          ...speaker,
          highlights: highlightsByName[name],
        };
      })
      .filter((speaker): speaker is TrainingInstructor => speaker !== null);

    return instructors.length === instructorNames.length ? instructors : fallbackInstructors;
  } catch (error) {
    console.error("Failed to load training instructors:", error);
    return fallbackInstructors;
  }
}

function TrainingInstructorCard({ instructor }: { instructor: TrainingInstructor }) {
  return (
    <div className="group h-full bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
      <div className="h-24 bg-teal-500 relative w-full" />

      <div className="px-4 pb-6 flex flex-col items-start text-left flex-grow">
        <div className="relative w-[146px] h-[146px] -mt-[73px] mb-3 flex-shrink-0 z-10 self-center">
          {instructor.photo ? (
            <div className="relative w-full h-full rounded-full overflow-hidden border-[4px] border-white ring-[4px] ring-teal-500 shadow-lg shadow-teal-500/20 bg-white">
              <Image
                src={instructor.photo}
                alt={instructor.name}
                fill
                sizes="146px"
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center border-[4px] border-white ring-[4px] ring-teal-500 shadow-lg shadow-teal-500/20 text-slate-300">
              <User className="w-12 h-12" />
            </div>
          )}
        </div>

        <h3 className="font-bold text-slate-900 mb-2 text-lg leading-tight">
          {instructor.name}
        </h3>

        {instructor.credentials && (
          <div className="flex items-start gap-1.5 text-slate-500 mb-4 text-sm">
            <Briefcase className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
            <span className="leading-snug">{instructor.credentials}</span>
          </div>
        )}

        <div className="space-y-2 mb-4">
          {instructor.highlights.map((highlight) => (
            <div key={highlight} className="flex items-start gap-3 text-sm text-slate-600 leading-relaxed">
              <CheckCircle className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
              <span>{highlight}</span>
            </div>
          ))}
        </div>

        {instructor.institution && (
          <div className="flex items-start gap-1.5 mt-auto pt-2 w-full text-sm">
            <Building2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-teal-500" />
            <span className="text-teal-600 font-medium leading-snug">{instructor.institution}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export const metadata: Metadata = {
  title: "Обучение ВАБ и интервенционной маммологии | Курсы для врачей",
  description: "Курс повышения квалификации по вакуумной биопсии (ВАБ) и ТАБ. 36 ак. часов. Практика на фантомах и в клинике. Преподаватель д.м.н. Одинцов В.А. Выдача удостоверения.",
  keywords: ["обучение ВАБ", "курсы маммологии", "интервенционная маммология обучение", "вакуумная биопсия обучение", "Одинцов В.А. курсы", "повышение квалификации маммологов", "мастер-класс биопсия"],
};

export default async function Training() {
  const instructors = await getTrainingInstructors();
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
    'instructor': instructors.map((instructor) => ({
      '@type': 'Person',
      'name': instructor.name,
      'description': instructor.credentials,
    })),
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
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#34D399] to-[#1E3A8A]">Обучение ВАБ:</span> Курс интервенционной маммологии
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
                <div className="p-4 sm:p-6 md:p-8 lg:p-16 flex flex-col justify-center relative z-10">
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

                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                        Интервенционная маммология. <br className="hidden sm:block"/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600">
                            Диагностика и лечение
                        </span>
                    </h2>
                    
                    <p className="text-base sm:text-lg text-slate-600 mb-6 leading-relaxed">
                        Комплексная программа повышения квалификации для врачей УЗД, хирургов и онкологов. 
                        Освойте передовые методики вакуумно-аспирационной биопсии и малоинвазивных вмешательств 
                        под контролем УЗИ под руководством ведущего эксперта в области интервенционной маммологии.
                    </p>
                    
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 sm:p-5 mb-6 sm:mb-10">
                        <div className="flex items-start gap-2 sm:gap-3">
                            <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0 mt-0.5" />
                            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                                <span className="font-semibold">Целевая аудитория:</span> сертифицированные специалисты по специальностям 
                                &quot;Ультразвуковая диагностика&quot;, &quot;Хирургия&quot;, &quot;Онкология&quot; с высшим медицинским образованием
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <RequestCPModal 
                            title="Запись на курс" 
                            description="Заполните форму для регистрации на курс. Наш менеджер свяжется с вами для подтверждения участия."
                            formType="training"
                        >
                            <Button size="lg" className="h-12 sm:h-14 px-4 sm:px-6 md:px-8 text-base sm:text-lg rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all hover:scale-105 w-full sm:w-auto">
                                Записаться на курс
                            </Button>
                        </RequestCPModal>
                        <Button size="lg" variant="outline" className="h-12 sm:h-14 px-4 sm:px-6 md:px-8 text-base sm:text-lg rounded-full border-slate-300 hover:bg-slate-50 transition-all w-full sm:w-auto" asChild>
                            <Link href="#program">Программа курса</Link>
                        </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-6 mt-8 sm:mt-12 pt-8 sm:pt-12 border-t border-slate-200/60">
                        <div>
                            <div className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">36</div>
                            <div className="text-xs sm:text-sm font-medium text-slate-500">ак. часов</div>
                        </div>
                        <div>
                            <div className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">5</div>
                            <div className="text-xs sm:text-sm font-medium text-slate-500">дней обучения</div>
                        </div>
                        <div>
                            <div className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">СПб</div>
                            <div className="text-xs sm:text-sm font-medium text-slate-500">очно</div>
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
                    
                    <div className="absolute bottom-4 sm:bottom-8 left-4 sm:left-8 right-4 sm:right-8 text-white">
                        <div className="flex items-center gap-2 sm:gap-4 mb-2">
                             <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white/30 overflow-hidden relative">
                                <Image src="/images/odintsov.jpg" alt="Одинцов В.А." fill className="object-cover" />
                             </div>
                             <div>
                                 <div className="font-bold text-base sm:text-lg">Одинцов В.А.</div>
                                 <div className="text-slate-300 text-xs sm:text-sm">Автор курса, д.м.н.</div>
                             </div>
                        </div>
                        <p className="italic text-slate-200 text-xs sm:text-sm pl-2 sm:pl-4 border-l-2 border-teal-500">
                            &quot;Мы даем не просто теорию, а ставим руку. Каждый курсант самостоятельно выполняет манипуляции.&quot;
                        </p>
                    </div>
                </div>
             </div>
           </div>
        </section>

        {/* Instructor Section */}
        <section className="mb-24">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-10">
                    <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100 border-0 mb-4">Преподаватели курса</Badge>
                    <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Эксперты, которые ведут курс вместе</h3>
                </div>

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {instructors.map((instructor) => (
                        <div key={instructor.id} className="h-full">
                            <TrainingInstructorCard instructor={instructor} />
                        </div>
                    ))}
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
                    <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                        <div className="flex items-center gap-4 mb-3">
                            <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center shrink-0 shadow-md transform rotate-3`}>
                                {item.icon}
                            </div>
                            <h4 className="text-lg font-bold text-slate-900">{item.title}</h4>
                        </div>
                        <p className="text-slate-600 leading-relaxed text-base">
                            {item.desc}
                        </p>
                    </div>
                ))}
            </div>
        </section>

        {/* Program Details Section */}
        <section id="program" className="mb-16 max-w-6xl mx-auto">
            <div className="text-center mb-16">
                 <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-0 mb-4 px-4 py-1 text-base">Программа 36 академических часов</Badge>
                 <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Детальная программа курса</h2>
                 <p className="text-slate-500 mt-4 text-lg">Пошаговое погружение в интервенционную маммологию с практическими занятиями</p>
            </div>

            <div className="space-y-6">
                {/* День 1 */}
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:border-teal-200 transition-colors shadow-md">
                    <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-4 sm:px-6 md:px-8 py-4 sm:py-6 text-white">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-xl sm:text-2xl border-2 border-white/30">1</div>
                            <div>
                                <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider opacity-90">День 1</div>
                                <h4 className="text-lg sm:text-xl md:text-2xl font-bold leading-tight">Основы УЗ-диагностики и введение в интервенционную маммологию</h4>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 sm:p-6 md:p-8">
                        <div className="space-y-4 sm:space-y-6">
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <div className="shrink-0 text-sm font-bold text-teal-600 flex items-center gap-2 sm:w-20">
                                    <Clock className="w-4 h-4" />
                                    10:00
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-slate-900 mb-2 text-base sm:text-lg">Нормальная ультразвуковая анатомия молочной железы (мифы и реальность)</h5>
                                    <ul className="space-y-2 text-slate-600 text-sm sm:text-base">
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

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <div className="shrink-0 text-sm font-bold text-teal-600 flex items-center gap-2 sm:w-20">
                                    <Clock className="w-4 h-4" />
                                    11:00
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-slate-900 mb-2 text-base sm:text-lg">Диффузные изменения молочных желёз</h5>
                                    <ul className="space-y-2 text-slate-600 text-sm sm:text-base">
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

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <div className="shrink-0 text-sm font-bold text-teal-600 flex items-center gap-2 sm:w-20">
                                    <Clock className="w-4 h-4" />
                                    12:00
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-slate-900 mb-2 text-base sm:text-lg">Методы интервенционной диагностики и лечения</h5>
                                    <ul className="space-y-2 text-slate-600 text-sm sm:text-base">
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

                            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4 sm:p-6 mt-4 sm:mt-6">
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                    <div className="shrink-0 text-sm font-bold text-orange-600 flex items-center gap-2 sm:w-20">
                                        <Activity className="w-4 h-4" />
                                        15:00
                                    </div>
                                    <div className="flex-grow">
                                        <h5 className="font-bold text-slate-900 mb-2 flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
                                            <span>Практическое занятие</span>
                                            <Badge className="bg-orange-500 text-white w-fit">4 часа практики</Badge>
                                        </h5>
                                        <ul className="space-y-2 text-slate-700 text-sm sm:text-base">
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
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 sm:px-6 md:px-8 py-4 sm:py-6 text-white">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-xl sm:text-2xl border-2 border-white/30">2</div>
                            <div>
                                <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider opacity-90">День 2</div>
                                <h4 className="text-lg sm:text-xl md:text-2xl font-bold leading-tight">Полостные образования молочной железы</h4>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 sm:p-6 md:p-8">
                        <div className="space-y-4 sm:space-y-6">
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <div className="shrink-0 text-sm font-bold text-blue-600 flex items-center gap-2 sm:w-20">
                                    <Clock className="w-4 h-4" />
                                    10:00
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-slate-900 mb-2 text-base sm:text-lg">BI-RADS 2 — группа наблюдения или консервативного лечения</h5>
                                    <ul className="space-y-2 text-slate-600 text-sm sm:text-base">
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

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <div className="shrink-0 text-sm font-bold text-blue-600 flex items-center gap-2 sm:w-20">
                                    <Clock className="w-4 h-4" />
                                    11:00
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-slate-900 mb-2 text-base sm:text-lg">BI-RADS 3 — категория, требующая лечебно-диагностической пункции</h5>
                                    <ul className="space-y-2 text-slate-600 text-sm sm:text-base">
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

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <div className="shrink-0 text-sm font-bold text-blue-600 flex items-center gap-2 sm:w-20">
                                    <Clock className="w-4 h-4" />
                                    12:00
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-slate-900 mb-2 text-base sm:text-lg">BI-RADS 4 — обязательная гистологическая верификация</h5>
                                    <ul className="space-y-2 text-slate-600 text-sm sm:text-base">
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

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <div className="shrink-0 text-sm font-bold text-blue-600 flex items-center gap-2 sm:w-20">
                                    <Clock className="w-4 h-4" />
                                    13:00
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-slate-900 mb-2 text-base sm:text-lg">Демонстрация интервенционных методов лечения кист</h5>
                                    <ul className="space-y-2 text-slate-600 text-sm sm:text-base">
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

                            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4 sm:p-6 mt-4 sm:mt-6">
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                    <div className="shrink-0 text-sm font-bold text-orange-600 flex items-center gap-2 sm:w-20">
                                        <Activity className="w-4 h-4" />
                                        15:00
                                    </div>
                                    <div className="flex-grow">
                                        <h5 className="font-bold text-slate-900 mb-2 flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
                                            <span>Практическое занятие</span>
                                            <Badge className="bg-orange-500 text-white w-fit">4 часа практики</Badge>
                                        </h5>
                                        <ul className="space-y-2 text-slate-700 text-sm sm:text-base">
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
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 sm:px-6 md:px-8 py-4 sm:py-6 text-white">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-xl sm:text-2xl border-2 border-white/30">3</div>
                            <div>
                                <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider opacity-90">День 3</div>
                                <h4 className="text-lg sm:text-xl md:text-2xl font-bold leading-tight">Патология протоков и мастодиния</h4>
                            </div>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <div className="shrink-0 text-sm font-bold text-purple-600 flex items-center gap-2 sm:w-20">
                                    <Clock className="w-4 h-4" />
                                    10:00
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-slate-900 mb-2 text-base sm:text-lg">Простая дуктэктазия, BI-RADS 2</h5>
                                    <ul className="space-y-2 text-slate-600 text-sm sm:text-base">
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

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <div className="shrink-0 text-sm font-bold text-purple-600 flex items-center gap-2 sm:w-20">
                                    <Clock className="w-4 h-4" />
                                    11:00
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-slate-900 mb-2 text-base sm:text-lg">Осложненная дуктэктазия, BI-RADS 3</h5>
                                    <ul className="space-y-2 text-slate-600 text-sm sm:text-base">
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

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <div className="shrink-0 text-sm font-bold text-purple-600 flex items-center gap-2 sm:w-20">
                                    <Clock className="w-4 h-4" />
                                    12:00
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-slate-900 mb-2 text-base sm:text-lg">Комплексная дуктэктазия, BI-RADS 4</h5>
                                    <ul className="space-y-2 text-slate-600 text-sm sm:text-base">
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

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <div className="shrink-0 text-sm font-bold text-purple-600 flex items-center gap-2 sm:w-20">
                                    <Clock className="w-4 h-4" />
                                    13:00
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-slate-900 mb-2 text-base sm:text-lg">Мастодиния — современный взгляд</h5>
                                    <ul className="space-y-2 text-slate-600 text-sm sm:text-base">
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

                            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4 sm:p-6 mt-4 sm:mt-6">
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                    <div className="shrink-0 text-sm font-bold text-orange-600 flex items-center gap-2 sm:w-20">
                                        <Activity className="w-4 h-4" />
                                        15:00
                                    </div>
                                    <div className="flex-grow">
                                        <h5 className="font-bold text-slate-900 mb-2 flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
                                            <span>Практическое занятие</span>
                                            <Badge className="bg-orange-500 text-white w-fit">4 часа практики</Badge>
                                        </h5>
                                        <ul className="space-y-2 text-slate-700 text-sm sm:text-base">
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
                    <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-4 sm:px-6 md:px-8 py-4 sm:py-6 text-white">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-xl sm:text-2xl border-2 border-white/30">4</div>
                            <div>
                                <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider opacity-90">День 4</div>
                                <h4 className="text-lg sm:text-xl md:text-2xl font-bold leading-tight">Солидные образования молочной железы</h4>
                            </div>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <div className="shrink-0 text-sm font-bold text-rose-600 flex items-center gap-2 sm:w-20">
                                    <Clock className="w-4 h-4" />
                                    10:00
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-slate-900 mb-2 text-base sm:text-lg">Простые узлы, BI-RADS 2</h5>
                                    <ul className="space-y-2 text-slate-600 text-sm sm:text-base">
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

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <div className="shrink-0 text-sm font-bold text-rose-600 flex items-center gap-2 sm:w-20">
                                    <Clock className="w-4 h-4" />
                                    11:00
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-slate-900 mb-2 text-base sm:text-lg">Сомнительные узлы, BI-RADS 3</h5>
                                    <ul className="space-y-2 text-slate-600 text-sm sm:text-base">
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

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <div className="shrink-0 text-sm font-bold text-rose-600 flex items-center gap-2 sm:w-20">
                                    <Clock className="w-4 h-4" />
                                    12:00
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-slate-900 mb-2 text-base sm:text-lg">Подозрительные узлы, BI-RADS 4 и 5</h5>
                                    <ul className="space-y-2 text-slate-600 text-sm sm:text-base">
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

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <div className="shrink-0 text-sm font-bold text-rose-600 flex items-center gap-2 sm:w-20">
                                    <Clock className="w-4 h-4" />
                                    13:00
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-slate-900 mb-2 text-base sm:text-lg">Демонстрация Core-биопсии и ВАБ</h5>
                                    <ul className="space-y-2 text-slate-600 text-sm sm:text-base">
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

                            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4 sm:p-6 mt-4 sm:mt-6">
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                    <div className="shrink-0 text-sm font-bold text-orange-600 flex items-center gap-2 sm:w-20">
                                        <Activity className="w-4 h-4" />
                                        15:00
                                    </div>
                                    <div className="flex-grow">
                                        <h5 className="font-bold text-slate-900 mb-2 flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
                                            <span>Практическое занятие</span>
                                            <Badge className="bg-orange-500 text-white w-fit">4 часа практики</Badge>
                                        </h5>
                                        <ul className="space-y-2 text-slate-700 text-sm sm:text-base">
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
                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 sm:px-6 md:px-8 py-4 sm:py-6 text-white">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-xl sm:text-2xl border-2 border-white/30">5</div>
                            <div>
                                <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider opacity-90">День 5</div>
                                <h4 className="text-lg sm:text-xl md:text-2xl font-bold leading-tight">Итоговая аттестация и мультимодальная визуализация</h4>
                            </div>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <div className="shrink-0 text-sm font-bold text-emerald-600 flex items-center gap-2 sm:w-20">
                                    <Clock className="w-4 h-4" />
                                    10:00
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-slate-900 mb-2 text-base sm:text-lg">Оценка навыков выполнения ВАБ под УЗ-навигацией</h5>
                                    <ul className="space-y-2 text-slate-600 text-sm sm:text-base">
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

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                <div className="shrink-0 text-sm font-bold text-emerald-600 flex items-center gap-2 sm:w-20">
                                    <Clock className="w-4 h-4" />
                                    12:00
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-bold text-slate-900 mb-2 text-base sm:text-lg">Курс мультимодальной визуализации молочной железы</h5>
                                    <ul className="space-y-2 text-slate-600 text-sm sm:text-base">
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

                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 sm:p-6 mt-4 sm:mt-6">
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                    <div className="shrink-0 text-sm font-bold text-emerald-600 flex items-center gap-2 sm:w-20">
                                        <Award className="w-4 h-4" />
                                        18:00
                                    </div>
                                    <div className="flex-grow">
                                        <h5 className="font-bold text-slate-900 mb-2 flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
                                            <span>Круглый стол и завершение курса</span>
                                            <Badge className="bg-emerald-500 text-white w-fit">Вручение сертификатов</Badge>
                                        </h5>
                                        <ul className="space-y-2 text-slate-700 text-sm sm:text-base">
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
        <section id="past-trainings" className="bg-slate-50 -mx-4 md:-mx-6 px-4 md:px-6 pt-12 pb-24">
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
