import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { RequestCPModal } from "@/components/RequestCPModal";
import { Check, Settings, VolumeX, Target, Maximize2, Bell, Scissors, RefreshCw, Smartphone, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Оборудование",
  description: "DK-B-MS - инновационная система вакуумной биопсии молочной железы под контролем УЗИ. Передовые технологии для высокой точности, безопасности и эффективности процедуры.",
};

export default function Equipment() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-pink-100 selection:text-pink-900">
      <Header />

      <div className="pt-24 pb-12 bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 md:px-6">
          <Breadcrumbs items={[{ label: "Оборудование" }]} />
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mt-6 mb-4">
            Система DK-B-MS
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl">
            Инновационная система вакуумной биопсии молочной железы под контролем УЗИ. 
            Передовые технологии для высокой точности, безопасности и эффективности.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 md:px-6 py-12">
        
        {/* Hero Section */}
        <section className="mb-20">
          <div className="bg-white rounded-3xl p-6 md:p-10 border border-slate-200 shadow-sm flex flex-col-reverse lg:flex-row gap-6 lg:gap-12 items-center">
            <div className="flex-1 space-y-6">
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0 px-4 py-1 text-sm">
                Флагманская модель
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                Инновационная технология биопсии
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                DK-B-MS представляет собой передовую систему вакуумной биопсии. 
                Система обеспечивает высокую точность, безопасность и эффективность процедуры взятия образцов ткани,
                минимизируя дискомфорт для пациента.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-4 pt-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">Производитель</p>
                  <p className="font-semibold text-slate-900">XISHAN S&T CO., LTD.</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">Дистрибьютор в РФ</p>
                  <p className="font-semibold text-slate-900">ООО «ЗЕНИТ»</p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <RequestCPModal>
                  <Button size="lg" className="rounded-full bg-pink-600 hover:bg-pink-700 text-white px-8">
                    Запросить КП
                  </Button>
                </RequestCPModal>
                <Button size="lg" variant="outline" className="rounded-full border-slate-200 hover:bg-slate-50">
                  Характеристики
                </Button>
              </div>
            </div>
            
            <div className="relative w-full h-[360px] lg:h-auto lg:flex-1 lg:min-h-[400px] flex items-center lg:items-end justify-center lg:justify-end overflow-hidden lg:overflow-visible">
              {/* Mobile/Tablet Image: Zoomed and centered */}
              <div className="absolute w-full h-full inset-0 lg:hidden p-4">
                <Image 
                  src="/images/equipment-main.png" 
                  alt="DK-B-MS Система биопсии" 
                  fill
                  className="object-contain drop-shadow-xl"
                  priority
                />
              </div>

              {/* Desktop Image: Positioned to pop out */}
              <div className="hidden lg:flex absolute lg:-bottom-10 lg:left-auto lg:right-0 lg:translate-x-[20%] lg:w-[150%] lg:h-[150%] z-10 pointer-events-none items-end justify-center">
                <Image 
                  src="/images/equipment-main.png" 
                  alt="DK-B-MS Система биопсии" 
                  fill
                  className="object-contain object-bottom drop-shadow-2xl"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Technical Advantages */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Технические преимущества</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Продуманная до мелочей конструкция для максимальной эффективности врача
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Settings, title: "Плавная регулировка", desc: "Положения ножа в апертуре иглы", color: "text-blue-500" },
              { icon: VolumeX, title: "Тихая работа", desc: "Низкий уровень шума для комфорта", color: "text-pink-500" },
              { icon: Target, title: "Авто-определение", desc: "Типа иглы и режима работы", color: "text-purple-500" },
              { icon: Maximize2, title: "Настройка апертуры", desc: "От 5 мм до 30 мм", color: "text-indigo-500" },
              { icon: Bell, title: "Smart-контроль", desc: "Предупреждение о переполнении", color: "text-rose-500" },
              { icon: Scissors, title: "Тройная заточка", desc: "Острый однонаправленный нож", color: "text-cyan-500" },
              { icon: RefreshCw, title: "Авто-доставка", desc: "Непрерывный сбор образцов", color: "text-teal-500" },
              { icon: Smartphone, title: "Сенсорный экран", desc: "Удобный интерфейс управления", color: "text-violet-500" },
            ].map((item, i) => (
              <Card key={i} className="group hover:shadow-lg transition-all duration-300 border-slate-200">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className={`w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Procedure Steps */}
        <section className="mb-20 bg-slate-900 text-white rounded-3xl p-8 md:p-16 overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-center mb-16">Этапы процедуры</h2>
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: "01", title: "Наведение", desc: "Позиционирование иглы под контролем УЗИ" },
                { step: "02", title: "Аспирация", desc: "Вакуумная фиксация образования" },
                { step: "03", title: "Срез", desc: "Ротационное иссечение тканей" },
                { step: "04", title: "Забор", desc: "Вакуумная транспортировка образца" },
              ].map((item, i) => (
                <div key={i} className="relative group">
                  {i !== 3 && (
                    <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-slate-700" />
                  )}
                  <div className="relative flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-600 border-4 border-slate-900 flex items-center justify-center text-xl font-bold mb-6 z-10 group-hover:scale-110 transition-transform">
                      {item.step}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                    <p className="text-slate-400 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Detailed Benefits */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Клиническая ценность</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardHeader>
                <CardTitle className="text-blue-700">Регулировка апертуры</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Точность регулировки 1 мм",
                    "Длина образца от 5 мм до 30 мм",
                    "Минимальная длина всего 5 мм",
                    "Максимальное сохранение здоровых тканей"
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-600">
                      <Check className="w-5 h-5 text-blue-500 shrink-0" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-pink-500 shadow-sm">
              <CardHeader>
                <CardTitle className="text-pink-700">Тройная заточка</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Более острый и безопасный прокол",
                    "Плавная ротационная резка",
                    "Полная обработка образцов",
                    "Однонаправленный вращающийся нож"
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-600">
                      <Check className="w-5 h-5 text-pink-500 shrink-0" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 shadow-sm">
              <CardHeader>
                <CardTitle className="text-purple-700">Автоматическая доставка</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Нет необходимости останавливаться",
                    "Экономия времени процедуры",
                    "Упрощение процесса работы",
                    "Непрерывный сбор образцов"
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-600">
                      <Check className="w-5 h-5 text-purple-500 shrink-0" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-500 shadow-sm">
              <CardHeader>
                <CardTitle className="text-indigo-700">Интеллектуальные возможности</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Автоматическое определение типа иглы",
                    "Предупреждение о переполнении контейнера",
                    "Удобный сенсорный интерфейс",
                    "Клавиши быстрого доступа"
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-600">
                      <Check className="w-5 h-5 text-indigo-500 shrink-0" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Specifications Table */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-8">Спецификации игл</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-6 font-semibold text-slate-900">Диаметр иглы</th>
                    <th className="p-6 font-semibold text-slate-900">Длина иглы (мм)</th>
                    <th className="p-6 font-semibold text-slate-900">Модель</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-6 text-slate-700">5.0 (7G)</td>
                    <td className="p-6 text-slate-700">110</td>
                    <td className="p-6 font-mono text-slate-600">HJZX07A</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-6 text-slate-700">4.0 (10G)</td>
                    <td className="p-6 text-slate-700">110</td>
                    <td className="p-6 font-mono text-slate-600">HJZX10A</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-6 text-slate-700">3.2 (12G)</td>
                    <td className="p-6 text-slate-700">110</td>
                    <td className="p-6 font-mono text-slate-600">HJZX12A</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center py-16 bg-gradient-to-br from-pink-50 to-blue-50 rounded-3xl border border-pink-100">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Заинтересованы в DK-B-MS?</h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Свяжитесь с нами для получения подробной информации, ценового предложения или организации демонстрации системы.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <RequestCPModal>
              <Button size="lg" className="rounded-full bg-slate-900 text-white hover:bg-slate-800 px-8">
                Запросить КП
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </RequestCPModal>
            <Link href="/contacts">
              <Button size="lg" variant="outline" className="rounded-full border-slate-300 hover:bg-white">
                Связаться с нами
              </Button>
            </Link>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
