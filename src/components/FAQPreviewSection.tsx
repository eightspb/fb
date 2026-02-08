'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ArrowRight, HelpCircle } from 'lucide-react';

const faqItems = [
  {
    q: "Больно ли удалять фиброаденому методом ВАБ?",
    a: "Процедура проводится под местной анестезией. Пациент чувствует только укол обезболивающего. Во время самой биопсии боли нет."
  },
  {
    q: "Остается ли шрам после вакуумной биопсии?",
    a: "Нет, шрамов не остается. Прокол составляет всего 3-5 мм и заживает бесследно, в отличие от разреза при обычной операции."
  },
  {
    q: "Чем ВАБ отличается от обычной операции?",
    a: "ВАБ — это «хирургия без скальпеля». Образование удаляется полностью через микропрокол 2-3 мм, без разрезов, швов и шрамов. Процедура проходит под местной анестезией за 20-30 минут, и вы можете сразу идти домой."
  },
  {
    q: "Можно ли делать ВАБ, если планирую беременность?",
    a: "Да! Это одно из главных преимуществ метода. При ВАБ млечные протоки не повреждаются, в отличие от традиционной операции. Это исключает риск развития мастита при будущей лактации."
  }
];

export function FAQPreviewSection() {
  return (
    <section className="w-full py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-teal-600" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Часто задаваемые вопросы
            </h2>
          </div>
          
          <p className="text-center text-lg text-slate-600 mb-12">
            Ответы на самые популярные вопросы о вакуумной аспирационной биопсии
          </p>

          <Accordion type="single" collapsible className="w-full mb-8">
            {faqItems.map((item, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`} 
                className="border-slate-200 px-4 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <AccordionTrigger className="text-left font-medium text-slate-900 hover:text-teal-600 hover:no-underline py-4">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 pb-4 leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="text-center">
            <Button variant="outline" size="lg" asChild>
              <Link href="/patients#faq">
                Все вопросы и ответы
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
