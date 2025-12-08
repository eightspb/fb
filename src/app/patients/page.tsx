'use client';

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ChevronDown, Check, Clock, ShieldCheck, Smile, Search, Heart, AlertCircle, HelpCircle } from "lucide-react";
import { useState } from "react";
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
    { q: "Как подготовиться к ВАБ?", a: "Необходимо прийти на консультацию за неделю до процедуры. Врач проведет осмотр и даст рекомендации по подготовке." },
    { q: "Есть ли ограничения для проведения процедуры?", a: "Процедура противопоказана при беременности, кровотечениях и некоторых других состояниях. Врач определит возможность проведения." },
    { q: "Когда я узнаю результат?", a: "Результаты анализа готовы через 7-10 дней. Врач проведет консультацию и объяснит результаты." },
    { q: "Больно ли?", a: "Процедура проводится под местной анестезией, поэтому боли не будет. Возможны незначительные неудобства." },
    { q: "Как будет выглядеть кожа после ВАБ?", a: "На месте прокола может остаться небольшой синяк, который пройдет за 1-2 недели. Видимых шрамов не остается." },
    { q: "Что если обнаружат рак после ВАБ?", a: "При обнаружении онкологии врач предложит план лечения и направит к специалистам для дальнейшего лечения." },
    { q: "Может ли опухоль появиться снова?", a: "ВАБ удаляет образование полностью, но риск появления новых образований остается. Регулярное обследование обязательно." }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-pink-100 selection:text-pink-900">
      <Header />

      <div className="pt-24 pb-12 bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 md:px-6">
          <Breadcrumbs items={[{ label: "Пациентам" }]} />
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mt-6 mb-4">
            Пациентам
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl">
            Все, что нужно знать о процедуре вакуумной аспирационной биопсии (ВАБ).
            Безопасно, быстро и эффективно.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 md:px-6 py-12">

        {/* How VAB Works */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Как проходит процедура?</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Вакуумная аспирационная биопсия — это минимально инвазивная процедура, 
              которая позволяет получить образцы ткани или удалить доброкачественные образования 
              под контролем УЗИ.
            </p>
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
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Современный стандарт диагностики</h2>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                Вакуумная аспирационная биопсия (ВАБ) — это &quot;золотой стандарт&quot; в диагностике новообразований молочной железы. 
                Метод позволяет не только получить материал для точного диагноза, но и полностью удалить доброкачественные образования (фиброаденомы) без разрезов.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex-1">
                  <div className="text-3xl font-bold text-blue-600 mb-1">1.5M+</div>
                  <div className="text-sm text-slate-600">процедур ежегодно</div>
                </div>
                <div className="bg-pink-50 rounded-xl p-4 border border-pink-100 flex-1">
                  <div className="text-3xl font-bold text-pink-600 mb-1">1 час</div>
                  <div className="text-sm text-slate-600">и вы идете домой</div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2 bg-slate-100 rounded-3xl aspect-square relative overflow-hidden">
               {/* Placeholder for decorative image or abstract shape */}
               <div className="absolute inset-0 bg-gradient-to-br from-pink-100 to-blue-100 opacity-50"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-32 h-32 bg-white rounded-full shadow-xl flex items-center justify-center animate-pulse">
                    <Heart className="w-12 h-12 text-pink-500" />
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
                <AccordionTrigger className="text-left font-medium text-slate-900 hover:text-pink-600 hover:no-underline py-4">
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
        <section className="text-center py-16 bg-gradient-to-br from-pink-50 to-blue-50 rounded-3xl border border-pink-100">
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
