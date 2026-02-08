"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RequestCPModal } from "@/components/RequestCPModal";
import { 
  Check, Settings, VolumeX, Target, Maximize2, Bell, 
  Scissors, RefreshCw, Smartphone, ArrowRight, Activity, 
  ShieldCheck, FileText
} from "lucide-react";
import { motion } from "framer-motion";

export default function Equipment() {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-[#10B981] selection:text-white">
      <Header />

      {/* Hero Section - Dark & Impactful */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-[#0F172A] text-white">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#1E3A8A] rounded-full blur-[120px] opacity-20"></div>
          <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] bg-[#10B981] rounded-full blur-[120px] opacity-10"></div>
        </div>

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial="initial"
              animate="animate"
              variants={staggerContainer}
              className="space-y-8"
            >
              <motion.div variants={fadeInUp}>
                <Badge className="bg-white/10 text-[#34D399] hover:bg-white/20 border-0 px-4 py-1.5 text-sm backdrop-blur-sm uppercase tracking-wider">
                  Вакуумная Биопсия
                </Badge>
              </motion.div>
              
              <motion.h1 variants={fadeInUp} className="text-4xl md:text-6xl font-bold leading-tight">
                Система вакуумной биопсии (ВАБ) <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#34D399] to-[#1E3A8A]">Xishan DK-B-MS</span>
              </motion.h1>
              
              <motion.p variants={fadeInUp} className="text-lg text-slate-100 max-w-xl leading-relaxed">
                Профессиональное оборудование для вакуумной аспирационной биопсии (ВАБ) и безоперационного удаления фиброаденом молочной железы под УЗИ-контролем. Золотой стандарт диагностики.
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-wrap gap-4">
                <RequestCPModal>
                  <Button size="lg" className="rounded-full bg-[#10B981] hover:bg-[#059669] text-white px-8 h-12 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all duration-300 hover:scale-105 border-0 font-semibold">
                    <span className="relative flex h-3 w-3 mr-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                    Узнать цену / КП
                  </Button>
                </RequestCPModal>
                <Button size="lg" className="rounded-full bg-white text-slate-900 hover:bg-slate-200 h-12 font-bold border-0">
                  <FileText className="mr-2 w-4 h-4" />
                  Тех. спецификация
                </Button>
              </motion.div>

              {/* Neumorphic Specs Overlay */}
              <motion.div variants={fadeInUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8">
                {[
                  { label: "Вакуум", value: "-85 кПа" },
                  { label: "Апертура", value: "5-30 мм" },
                  { label: "Скорость", value: "700 об/мин" },
                  { label: "Контроль", value: "УЗИ" },
                ].map((spec, i) => (
                  <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-xl">
                    <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">{spec.label}</div>
                    <div className="text-[#34D399] font-bold text-xl">{spec.value}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative h-[400px] lg:h-[600px] flex items-center justify-center"
            >
              {/* Glow Effect behind image */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#1E3A8A]/30 to-[#10B981]/30 blur-[60px] rounded-full transform scale-75"></div>
              
              <div className="relative z-10 w-full h-full">
                <Image 
                  src="/images/equipment-main.png" 
                  alt="Система вакуумной биопсии Xishan DK-B-MS" 
                  fill
                  className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                  priority
                />
                
                {/* Floating Badge 1 */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="absolute top-10 right-10 bg-slate-900/80 backdrop-blur-md border border-[#34D399]/30 p-4 rounded-2xl shadow-xl max-w-[150px]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-5 h-5 text-[#34D399]" />
                    <span className="text-xs font-bold text-white">ISO Certified</span>
                  </div>
                  <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full w-[85%] bg-[#34D399]"></div>
                  </div>
                </motion.div>

                {/* Floating Badge 2 */}
                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                  className="absolute bottom-20 left-0 bg-slate-900/80 backdrop-blur-md border border-[#1E3A8A]/50 p-4 rounded-2xl shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1E3A8A]/20 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-[#1E3A8A]" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Совместимость</div>
                      <div className="text-sm font-bold text-white">Все типы УЗИ</div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Partners/Distributors Section */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-80 grayscale hover:grayscale-0 transition-all duration-500">
             <div className="flex items-center gap-4">
                <div className="relative w-32 h-12">
                  <Image src="/images/xishan-logo-new.png" alt="Производитель Xishan S&T" fill className="object-contain" />
                </div>
                <div className="h-8 w-px bg-slate-300"></div>
                <div className="text-sm font-medium text-slate-500">
                  Производитель<br/>XISHAN S&T CO., LTD.
                </div>
             </div>
             <div className="flex items-center gap-4">
                <div className="relative w-32 h-12">
                  <Image src="/images/logo.png" alt="Дистрибьютор Зенит" fill className="object-contain" />
                </div>
                <div className="h-8 w-px bg-slate-300"></div>
                <div className="text-sm font-medium text-slate-500">
                  Дистрибьютор в РФ<br/>ООО «ЗЕНИТ»
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Technical Advantages Grid */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Технические характеристики Xishan DK-B-MS</h2>
            <p className="text-slate-700 max-w-2xl mx-auto">
              Технологическое превосходство системы для эффективной вакуумной аспирационной резекции
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Settings, title: "Плавная регулировка", desc: "Шаг настройки апертуры 1 мм", color: "text-blue-600", bg: "bg-blue-50" },
              { icon: VolumeX, title: "Тихая работа", desc: "Комфорт для врача и пациента", color: "text-teal-600", bg: "bg-teal-50" },
              { icon: Target, title: "Авто-определение", desc: "Распознавание типа иглы (7G, 10G, 12G)", color: "text-purple-600", bg: "bg-purple-50" },
              { icon: Maximize2, title: "Вариативность", desc: "Апертура от 5 мм до 30 мм", color: "text-indigo-600", bg: "bg-indigo-50" },
              { icon: Bell, title: "Smart-мониторинг", desc: "Контроль вакуума и переполнения", color: "text-red-600", bg: "bg-red-50" },
              { icon: Scissors, title: "Ротационный нож", desc: "700 об/мин ± 100 об/мин", color: "text-cyan-600", bg: "bg-cyan-50" },
              { icon: RefreshCw, title: "Режимы работы", desc: "Для обычной и плотной ткани", color: "text-orange-600", bg: "bg-orange-50" },
              { icon: Smartphone, title: "Сенсорный экран", desc: "Интуитивное управление Xishan DK-B-MS", color: "text-violet-600", bg: "bg-violet-50" },
            ].map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center mb-4`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-700">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* System Components & Dimensions */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Комплектация системы ВАБ</h2>
              <p className="text-slate-700 mb-8 leading-relaxed">
                Система вакуумной биопсии Xishan DK-B-MS включает эргономичную консоль управления, легкую рукоятку и мощную вакуумную аспирационную помпу.
              </p>
              
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Settings className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Консоль управления</h3>
                    <p className="text-slate-700 text-sm mb-2">
                      Сенсорный экран с интуитивным интерфейсом ПО Xishan DK-B-MS.
                    </p>
                    <div className="flex gap-4 text-sm font-mono text-slate-800 bg-slate-100 p-2 rounded-lg inline-block">
                      <span>60 × 50 × 140 см</span>
                      <span className="text-slate-400">|</span>
                      <span>40 кг</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Эргономичная рукоятка</h3>
                    <p className="text-slate-700 text-sm">
                      Легкая и удобная, с кнопками управления отбором (SAMPLE) и вакуумом (VAC). Кабель 3 метра для свободы движений.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Ножной переключатель</h3>
                    <p className="text-slate-700 text-sm">
                      Водонепроницаемость IPX8. Позволяет управлять процессом без помощи рук, сохраняя стерильность.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative h-[500px] bg-white rounded-3xl border border-slate-200 p-8 flex items-center justify-center">
               {/* Placeholder for component diagram or image */}
               <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl -z-10"></div>
               <Image 
                  src="/images/equipment-main.png" 
                  alt="Компоненты системы вакуумной биопсии" 
                  fill
                  className="object-contain p-8"
               />
            </div>
          </div>
        </div>
      </section>

      {/* Procedure Steps */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-16">Этапы вакуумной аспирационной биопсии</h2>
          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-8 left-[12%] right-[12%] h-0.5 bg-slate-100 z-0"></div>
            
            {[
              { step: "01", title: "Наведение", desc: "Позиционирование иглы под контролем УЗИ" },
              { step: "02", title: "Аспирация", desc: "Вакуумная фиксация образования" },
              { step: "03", title: "Срез", desc: "Ротационное иссечение тканей" },
              { step: "04", title: "Забор", desc: "Вакуумная транспортировка образца" },
            ].map((item, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-100 shadow-sm flex items-center justify-center text-xl font-bold text-slate-900 mb-6 group-hover:border-[#34D399] group-hover:text-[#34D399] transition-colors duration-300">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clinical Value Cards */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Преимущества для клиники</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-6">
                  <Maximize2 className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Регулировка апертуры</h3>
                <ul className="space-y-3">
                  {[
                    "Точность регулировки 1 мм",
                    "Длина образца от 5 мм до 30 мм",
                    "Минимальная длина всего 5 мм",
                    "Максимальное сохранение здоровых тканей"
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-700">
                      <Check className="w-5 h-5 text-blue-600 shrink-0" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mb-6">
                  <Scissors className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Тройная заточка</h3>
                <ul className="space-y-3">
                  {[
                    "Более острый и безопасный прокол",
                    "Плавная ротационная резка",
                    "Полная обработка образцов",
                    "Однонаправленный вращающийся нож"
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-700">
                      <Check className="w-5 h-5 text-teal-600 shrink-0" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Detailed Tech Specs (Light Table) */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Спецификации биопсийных зондов</h2>
              <p className="text-slate-700 max-w-xl">
                Широкий выбор игл для вакуумной биопсии (7G, 10G, 12G) позволяет работать с образованиями любого размера.
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="border-slate-200 text-slate-600 px-3 py-1">CE</Badge>
              <Badge variant="outline" className="border-slate-200 text-slate-600 px-3 py-1">ISO</Badge>
            </div>
          </div>

          <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-6 text-slate-900 font-semibold">Модель</th>
                    <th className="p-6 text-slate-900 font-semibold">Калибр (G)</th>
                    <th className="p-6 text-slate-900 font-semibold">Диаметр (мм)</th>
                    <th className="p-6 text-slate-900 font-semibold">Длина (мм)</th>
                    <th className="p-6 text-slate-900 font-semibold">Апертура (мм)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { model: "HJZX07A", g: "7G", d: "5.0", l: "110", a: "20-30" },
                    { model: "HJZX07B", g: "7G", d: "5.0", l: "100", a: "20-30" },
                    { model: "HJZX10A", g: "10G", d: "4.0", l: "110", a: "16-24" },
                    { model: "HJZX12A", g: "12G", d: "3.2", l: "110", a: "14-21" },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-6 font-mono text-blue-700 font-bold">{row.model}</td>
                      <td className="p-6 text-slate-800 font-medium">{row.g}</td>
                      <td className="p-6 text-slate-700">{row.d}</td>
                      <td className="p-6 text-slate-700">{row.l}</td>
                      <td className="p-6 text-slate-700">{row.a}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('/images/grid.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto space-y-8"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Готовы обновить оборудование?
            </h2>
            <p className="text-xl text-slate-400">
              Получите коммерческое предложение и расчет окупаемости для вашей клиники уже сегодня.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
              <RequestCPModal>
                <Button size="lg" className="h-14 px-10 rounded-full bg-[#34D399] text-[#0F172A] hover:bg-[#10B981] font-bold text-lg shadow-[0_0_30px_rgba(52,211,153,0.4)] transition-all hover:scale-105">
                  Запросить КП
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </RequestCPModal>
              <Button asChild size="lg" className="h-14 px-10 rounded-full bg-white text-slate-900 hover:bg-slate-200 font-bold text-lg border-0">
                <Link href="/contacts">
                  Связаться с менеджером
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
