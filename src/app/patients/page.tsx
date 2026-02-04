'use client';

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Check, Clock, ShieldCheck, Smile, Search, Heart, AlertCircle } from "lucide-react";
import { Footer } from "@/components/Footer";
import { ClinicsMap } from "@/components/ClinicsMap";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Patients() {
  const faqItems = [
    { q: "Чем ВАБ отличается от обычной операции?", a: "ВАБ — это «хирургия без скальпеля». Образование удаляется полностью через микропрокол 2-3 мм, без разрезов, швов и шрамов. Процедура проходит под местной анестезией за 20-30 минут, и вы можете сразу идти домой. При традиционной операции требуется разрез, общий наркоз, госпитализация и длительное восстановление." },
    { q: "ВАБ — это только диагностика или полноценное лечение?", a: "ВАБ — это и диагностика, и лечение одновременно. Весь удаленный материал отправляется на гистологический анализ для точного диагноза, при этом образование (фиброаденома) удаляется полностью. Дополнительная операция не требуется." },
    { q: "Когда нужна операция, а когда достаточно ВАБ?", a: "ВАБ подходит для большинства доброкачественных образований размером до 3-4 см. К традиционной операции прибегают только в сложных случаях: при гигантских размерах образования, его глубоком расположении или при подозрении на злокачественность. Врач определит оптимальный метод после УЗИ." },
    { q: "Как подготовиться к ВАБ?", a: "Необходимо прийти на консультацию за неделю до процедуры. Врач проведет осмотр и даст рекомендации по подготовке." },
    { q: "Больно ли?", a: "Процедура проводится под местной анестезией, поэтому боли не будет. Возможны незначительные неудобства." },
    { q: "Как будет выглядеть кожа после ВАБ?", a: "На месте прокола может остаться небольшой синяк, который пройдет за 1-2 недели. Видимых шрамов не остается — только едва заметная точка, которая заживает бесследно. Форма груди сохраняется идеально." },
    { q: "Можно ли делать ВАБ, если планирую беременность?", a: "Да! Это одно из главных преимуществ метода. При ВАБ млечные протоки не повреждаются, в отличие от традиционной операции. Это исключает риск развития мастита при будущей лактации. Метод полностью безопасен для женщин, планирующих беременность." },
    { q: "Когда я узнаю результат?", a: "Результаты гистологического анализа готовы через 7-10 дней. Врач проведет консультацию и подробно объяснит результаты. Вероятность ошибки практически исключена, так как для анализа берется гораздо больше материала, чем при обычной игольной биопсии." },
    { q: "Есть ли ограничения для проведения процедуры?", a: "Процедура противопоказана при беременности, кровотечениях и некоторых других состояниях. Врач определит возможность проведения после осмотра и УЗИ." },
    { q: "Что если обнаружат рак после ВАБ?", a: "При обнаружении онкологии врач предложит индивидуальный план лечения и направит к специалистам-онкологам для дальнейшей терапии. Ранняя диагностика значительно повышает шансы на успешное лечение." },
    { q: "Может ли опухоль появиться снова?", a: "ВАБ удаляет образование полностью, но риск появления новых образований остается (как и после обычной операции). Поэтому регулярное обследование молочных желез обязательно — минимум раз в год." }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-teal-100 selection:text-teal-900">
      <Header />

      <div className="pt-24 pb-12 bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 md:px-6">
          <Breadcrumbs items={[{ label: "Пациентам" }]} />
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mt-6 mb-4">
            Пациентам
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl">
            Вакуумная аспирационная биопсия (ВАБ) — современная альтернатива традиционной операции. 
            Полное удаление образований без разрезов, шрамов и наркоза.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 md:px-6 py-12">

        {/* Hero Message - Emotional Introduction */}
        <section className="mb-20">
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl p-8 md:p-12 border border-slate-200">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                ВАБ — это не просто диагностика.<br/>Это полноценная альтернатива операции.
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                Обнаружение уплотнения в груди — момент, когда время словно останавливается. 
                Каждая женщина в такой ситуации хочет двух вещей: <span className="font-semibold text-slate-900">максимально точного ответа «что это?»</span> и 
                возможности <span className="font-semibold text-slate-900">избавиться от образования самым безопасным и эстетичным способом</span>.
              </p>
              <p className="text-lg text-slate-600 leading-relaxed">
                Раньше единственным способом полностью удалить образование была открытая операция под наркозом. 
                Но медицина шагнула вперед. Сегодня <span className="font-semibold text-teal-600">вакуумная аспирационная биопсия (ВАБ)</span> — 
                это высокотехнологичная <span className="font-semibold text-slate-900">«хирургия без скальпеля»</span>, 
                которая позволяет решить проблему через прокол размером всего 2-3 мм.
              </p>
            </div>
          </div>
        </section>

        {/* Comparison of 3 Methods */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Какой метод выбрать?</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Разберем три основных подхода к диагностике и лечению образований молочной железы
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Method 1: Needle Biopsy */}
            <Card className="border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-100 rounded-bl-full opacity-50"></div>
              <CardContent className="p-6 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="font-bold text-xl text-slate-900 mb-3">Тонкоигольная биопсия</h3>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  Быстрый метод «взять пробу». С помощью тонкой иглы врач получает клетки или фрагмент ткани.
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600">Только для диагностики</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600">Образование НЕ удаляется</span>
                  </div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                  <p className="text-xs text-slate-600 font-medium">
                    <span className="font-bold text-slate-900">Итог:</span> После такой биопсии обычно назначают операцию
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Method 2: VAB */}
            <Card className="border-2 border-teal-300 relative overflow-hidden shadow-lg">
              <div className="absolute top-3 right-3 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                Рекомендуем
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-100 rounded-bl-full opacity-30"></div>
              <CardContent className="p-6 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="font-bold text-xl text-slate-900 mb-3">Вакуумная биопсия (ВАБ)</h3>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  Революционный метод, который объединяет точность диагностики и эффективность операции.
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600">Диагностика + лечение</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600"><strong>Полное удаление</strong> образования</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600">Без разрезов и швов</span>
                  </div>
                </div>
                <div className="bg-teal-50 rounded-lg p-3 border border-teal-200">
                  <p className="text-xs text-slate-600 font-medium">
                    <span className="font-bold text-teal-900">Итог:</span> Проблема решена. Операция не нужна.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Method 3: Open Surgery */}
            <Card className="border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-100 rounded-bl-full opacity-50"></div>
              <CardContent className="p-6 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-bold text-xl text-slate-900 mb-3">Открытая операция</h3>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  Традиционная операция: разрез кожи скальпелем, разделение тканей, наложение швов.
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600">Полное удаление</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600">Общий наркоз, шрамы</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600">Длительное восстановление</span>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <p className="text-xs text-slate-600 font-medium">
                    <span className="font-bold text-slate-900">Итог:</span> Только в сложных случаях
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Comparison Table: VAB vs Surgery */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">ВАБ или операция: в чем разница?</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Наглядное сравнение показывает, почему ВАБ стала золотым стандартом
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left p-4 font-bold text-slate-900">Параметр</th>
                    <th className="text-left p-4 font-bold text-teal-600 bg-teal-50/50">Вакуумная биопсия (ВАБ)</th>
                    <th className="text-left p-4 font-bold text-slate-600">Открытая операция</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="p-4 font-medium text-slate-900">Результат</td>
                    <td className="p-4 bg-teal-50/30">
                      <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-teal-600" />
                        <span className="text-slate-700">Полное удаление образования</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-slate-400" />
                        <span className="text-slate-600">Полное удаление образования</span>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="p-4 font-medium text-slate-900">Шрам на коже</td>
                    <td className="p-4 bg-teal-50/30">
                      <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-teal-600" />
                        <span className="text-slate-700 font-semibold">Отсутствует</span>
                        <span className="text-xs text-slate-500">(только точка от прокола)</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <span className="text-slate-600">Заметный рубец от разреза</span>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="p-4 font-medium text-slate-900">Тип анестезии</td>
                    <td className="p-4 bg-teal-50/30">
                      <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-teal-600" />
                        <span className="text-slate-700">Легкая местная анестезия</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <span className="text-slate-600">Общий наркоз или сильная седация</span>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="p-4 font-medium text-slate-900">Реабилитация</td>
                    <td className="p-4 bg-teal-50/30">
                      <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-teal-600" />
                        <span className="text-slate-700 font-semibold">Быстрая</span>
                        <span className="text-xs text-slate-500">(можно на работу завтра)</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-red-500" />
                        <span className="text-slate-600">Длительная (боль, снятие швов)</span>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="p-4 font-medium text-slate-900">Форма груди</td>
                    <td className="p-4 bg-teal-50/30">
                      <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-teal-600" />
                        <span className="text-slate-700 font-semibold">Сохраняется идеально</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <span className="text-slate-600">Возможна деформация тканей</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium text-slate-900">Госпитализация</td>
                    <td className="p-4 bg-teal-50/30">
                      <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-teal-600" />
                        <span className="text-slate-700 font-semibold">Не требуется</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <span className="text-slate-600">Несколько дней в стационаре</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 bg-teal-50 rounded-xl p-6 border border-teal-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Почему стоит выбрать ВАБ?</h3>
                <p className="text-slate-700 leading-relaxed">
                  Если раньше при обнаружении фиброаденомы у женщины был выбор — «наблюдать и бояться» или «ложиться под нож», 
                  то сегодня ВАБ закрывает этот вопрос. Вы избавляетесь от опухоли <span className="font-semibold">здесь и сейчас</span>, 
                  не проходя через страх перед операционной. Это психологически комфортно, надежно и современно.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How VAB Works */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Как проходит Вакуумная аспирационная биопсия?</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Неоспоримое преимущество Вакуумной аспирационной биопсии в том, что с её помощью 
              <span className="font-semibold text-slate-900"> полностью удаляется опухоль молочной железы</span>.
            </p>
          </div>
          
          {/* Comparison with traditional method */}
          <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-2xl p-8 mb-12 border border-blue-100">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="font-bold text-slate-900">Раньше</h3>
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>Подготовка к операции несколько дней</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>Общий наркоз с рисками</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>Травматичный разрез тканей</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>Повреждение млечных протоков</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>Риск мастита при лактации</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border-2 border-teal-300 relative overflow-hidden">
                <div className="absolute top-2 right-2 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Современно
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                    <Check className="w-5 h-5 text-teal-600" />
                  </div>
                  <h3 className="font-bold text-slate-900">Сейчас</h3>
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                    <span>Без подготовки и госпитализации</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                    <span>Только местная анестезия</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                    <span>Без кровопотери и разрезов</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                    <span>Млечные протоки не повреждаются</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                    <span>Безопасно для планирующих беременность</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Technical advantages */}
          <div className="bg-white rounded-2xl p-8 mb-12 border border-slate-200 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-xl mb-2">Роботизированная точность</h3>
                <p className="text-slate-600 leading-relaxed">
                  Специальная роботизированная игла входит в нужное место без какой-либо кровопотери и разрезов тканей. 
                  Процедура проходит под постоянным контролем УЗИ, что обеспечивает максимальную точность и безопасность.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center flex-shrink-0">
                <Heart className="w-6 h-6 text-pink-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-xl mb-2">Важно для планирующих беременность</h3>
                <p className="text-slate-600 leading-relaxed">
                  При использовании метода вакуумной аспирационной биопсии млечные протоки остаются совершенно неповрежденными. 
                  Это особенно важно для женщин, планирующих беременность, так как при стандартной процедуре 
                  протоки часто рассекаются, что может привести к развитию мастита при лактации. 
                  При ВАБ подобная вероятность <span className="font-semibold text-slate-900">полностью исключена</span>.
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Выявление", desc: "Врач определяет образование по УЗИ", img: "/images/vab-steps/step-1.png" },
              { title: "Анестезия", desc: "Местное обезболивание области", img: "/images/vab-steps/step-2.png" },
              { title: "Микро-прокол", desc: "Всего 1-2 мм для введения иглы", img: "/images/vab-steps/step-3.png" },
              { title: "Введение", desc: "Зонд подводится под контролем УЗИ", img: "/images/vab-steps/step-5.png" },
              { title: "Удаление", desc: "Вакуумная аспирация образования", img: "/images/vab-steps/step-6.png" },
              { title: "Гистология", desc: "Отправка материала на анализ", img: "/images/vab-steps/step-8.png" },
              { title: "Повязка", desc: "Профилактика гематомы", img: "/images/vab-steps/step-10.png" },
              { title: "Результат", desc: "Без шрамов и госпитализации", img: "/images/vab-steps/step-11.png" },
            ].map((step, i) => (
              <Card key={i} className="overflow-hidden border-slate-200 hover:shadow-md transition-all group">
                <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                  <Image 
                    src={step.img} 
                    alt={step.title} 
                    fill 
                    className="object-cover transition-transform duration-500 group-hover:scale-105" 
                  />
                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-slate-900 shadow-sm">
                    {i + 1}
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-slate-900 mb-1">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-snug">{step.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Benefits Section */}
        <section className="mb-20">
          <div className="bg-slate-900 text-white rounded-3xl p-8 md:p-12 overflow-hidden relative">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-center mb-12">Преимущества метода</h2>
              <div className="grid md:grid-cols-4 gap-8">
                {[
                  { icon: Clock, title: "15-20 минут", desc: "Длительность процедуры" },
                  { icon: ShieldCheck, title: "Безопасно", desc: "Без общего наркоза" },
                  { icon: Smile, title: "Эстетично", desc: "Без шрамов и рубцов" },
                  { icon: Heart, title: "Комфортно", desc: "Сохранение формы груди" },
                  { icon: Search, title: "Точно", desc: "Под контролем УЗИ" },
                  { icon: Smile, title: "Без боли", desc: "Местная анестезия" },
                  { icon: Check, title: "Эффективно", desc: "Полное удаление" },
                  { icon: AlertCircle, title: "Минимум рисков", desc: "Отсутствие осложнений" },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center text-center group">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4 group-hover:bg-white/20 transition-colors group-hover:scale-110 duration-300">
                      <item.icon className="w-6 h-6 text-blue-300" />
                    </div>
                    <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                    <p className="text-slate-400 text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Info Section */}
        <section className="mb-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <h2 className="text-3xl font-bold text-slate-900 mb-6">
                ВАБ — признанная альтернатива традиционной операции
              </h2>
              <p className="text-lg text-slate-600 mb-4 leading-relaxed">
                В развитых странах вакуумная аспирационная биопсия (ВАБ) — это <span className="font-semibold text-slate-900">«золотой стандарт»</span>, 
                который вытесняет традиционные операции при лечении доброкачественных образований. 
                Метод позволяет не только получить материал для точного диагноза, но и <span className="font-semibold text-slate-900">полностью удалить</span> фиброаденомы 
                без разрезов, наркоза и госпитализации.
              </p>
              <p className="text-lg text-slate-600 mb-4 leading-relaxed">
                Опухоль молочной железы удаляется полностью через микропрокол, при этом окружающие ткани остаются совершенно неповрежденными. 
                Это революционное отличие от традиционной хирургии — вы получаете тот же результат, но без страха, боли и шрамов.
              </p>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 mb-6">
                <p className="text-sm text-slate-700 leading-relaxed">
                  <span className="font-bold text-blue-900">Важно:</span> ВАБ обеспечивает максимальную точность диагностики. 
                  Поскольку для анализа забирается гораздо больше материала, чем при обычной игле, 
                  вероятность ошибки практически исключена. Весь удаленный материал отправляется на гистологию.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex-1">
                  <div className="text-3xl font-bold text-blue-600 mb-1">1.5M+</div>
                  <div className="text-sm text-slate-600">процедур ежегодно</div>
                </div>
                <div className="bg-teal-50 rounded-xl p-4 border border-teal-100 flex-1">
                  <div className="text-3xl font-bold text-teal-600 mb-1">1 час</div>
                  <div className="text-sm text-slate-600">и вы идете домой</div>
                </div>
                <div className="bg-pink-50 rounded-xl p-4 border border-pink-100 flex-1">
                  <div className="text-3xl font-bold text-pink-600 mb-1">100%</div>
                  <div className="text-sm text-slate-600">удаление образования</div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2 bg-slate-100 rounded-3xl aspect-square relative overflow-hidden">
               {/* Placeholder for decorative image or abstract shape */}
               <div className="absolute inset-0 bg-gradient-to-br from-teal-100 to-blue-100 opacity-50"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-32 h-32 bg-white rounded-full shadow-xl flex items-center justify-center animate-pulse">
                    <Heart className="w-12 h-12 text-teal-500" />
                 </div>
               </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Часто задаваемые вопросы</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-slate-200">
                <AccordionTrigger className="text-left font-medium text-slate-900 hover:text-teal-600 hover:no-underline py-4">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* CTA Section */}
        <section className="text-center py-16 bg-gradient-to-br from-teal-50 to-blue-50 rounded-3xl border border-teal-100">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Готовы записаться?</h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Свяжитесь с нами, чтобы найти клинику в вашем городе или получить консультацию.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="rounded-full bg-slate-900 text-white hover:bg-slate-800 px-8">
              Найти клинику
            </Button>
            <Button size="lg" variant="outline" className="rounded-full border-slate-300 hover:bg-white">
              Задать вопрос
            </Button>
          </div>
        </section>

        {/* Map Section */}
        <section className="mb-20 mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Где сделать ВАБ?</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Найдите ближайшую клинику, где проводят вакуумную аспирационную биопсию на оборудовании завода Сишань.
            </p>
          </div>
          <ClinicsMap />
        </section>

      </main>

      <Footer />
    </div>
  );
}
