'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export default function Patients() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

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
    <div className="min-h-screen bg-white">
      <Header />

      <div className="pt-20">
        <div className="page-container">
          <div className="page-max-width-wide">
            <Breadcrumbs items={[{ label: "Пациентам" }]} />
          </div>
        </div>
      </div>

      <main className="page-container">
        <div className="page-max-width-wide">
          <h1 className="page-title gradient-text-pink shine-effect">Пациентам</h1>

          {/* How VAB Works */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-4 gradient-text-blue">Как проходит Вакуумная аспирационная биопсия?</h2>
            <p className="text-center text-gray-600 mb-12 max-w-3xl mx-auto">Неестественное преимущество вакуумной аспирационной биопсии в том, что с её помощью возможно получить огромное количество удалить опухоль молочной железы.</p>
            
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6">
                <div className="aspect-video bg-gradient-to-br from-pink-200 to-pink-300 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-5xl">🔬</span>
                </div>
                <h3 className="font-semibold text-gray-800">Введение оборудования на УЗИ</h3>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                <div className="aspect-video bg-gradient-to-br from-blue-200 to-blue-300 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-5xl">💉</span>
                </div>
                <h3 className="font-semibold text-gray-800">Местное обезболивание</h3>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
                <div className="aspect-video bg-gradient-to-br from-purple-200 to-purple-300 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-5xl">📊</span>
                </div>
                <h3 className="font-semibold text-gray-800">Получение образцов ткани</h3>
              </div>
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6">
                <div className="aspect-video bg-gradient-to-br from-pink-200 to-pink-300 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-5xl">✅</span>
                </div>
                <h3 className="font-semibold text-gray-800">Результаты анализа</h3>
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section className="mb-16 bg-gradient-to-r from-pink-50 via-white to-blue-50 rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-center mb-12 gradient-text-pink">Преимущества ВАБ</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">⚡</div>
                <h3 className="font-semibold mb-2 gradient-text-pink">Полное удаление опухоли за 15 минут</h3>
                <p className="text-sm text-gray-600">Быстрая и эффективная процедура</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🛡️</div>
                <h3 className="font-semibold mb-2 gradient-text-blue">Безопасность лечения без маркеров</h3>
                <p className="text-sm text-gray-600">Минимальный риск осложнений</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🔍</div>
                <h3 className="font-semibold mb-2 gradient-text-purple">Без шрамов и рубцов</h3>
                <p className="text-sm text-gray-600">Косметический результат</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">😊</div>
                <h3 className="font-semibold mb-2 gradient-text-pink">Сохранение эстетики груди</h3>
                <p className="text-sm text-gray-600">Естественный внешний вид</p>
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-6 mt-8">
              <div className="text-center">
                <div className="text-4xl mb-3">💆</div>
                <h3 className="font-semibold mb-2 gradient-text-blue">Психологический комфорт</h3>
                <p className="text-sm text-gray-600">Минимальный стресс</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🔄</div>
                <h3 className="font-semibold mb-2 gradient-text-pink">Сохранение формы груди</h3>
                <p className="text-sm text-gray-600">Восстановление функции</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">📋</div>
                <h3 className="font-semibold mb-2 gradient-text-purple">Не требует диагностического оборудования</h3>
                <p className="text-sm text-gray-600">Доступная процедура</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">✨</div>
                <h3 className="font-semibold mb-2 gradient-text-blue">Отсутствие побочных эффектов</h3>
                <p className="text-sm text-gray-600">Безопасное лечение</p>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12 gradient-text-blue">Часто задаваемые вопросы</h2>
            <div className="max-w-3xl mx-auto space-y-4">
              {faqItems.map((item, index) => (
                <Card key={index} className="border border-pink-200/50 hover:border-pink-300 transition-colors">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full p-6 flex items-center justify-between text-left"
                  >
                    <h3 className="font-semibold text-gray-800">{item.q}</h3>
                    <ChevronDown className={`w-5 h-5 text-pink-500 transition-transform ${
                      expandedFaq === index ? 'rotate-180' : ''
                    }`} />
                  </button>
                  {expandedFaq === index && (
                    <div className="px-6 pb-6 text-gray-600 border-t border-pink-200/30">
                      {item.a}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="mb-16 bg-gradient-to-r from-pink-500 to-blue-500 rounded-2xl p-12 text-white text-center">
            <h2 className="text-3xl font-bold mb-4">Готовы узнать больше?</h2>
            <p className="text-lg mb-8 opacity-90">Запишитесь на консультацию к нашим специалистам</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" className="bg-white text-pink-600 hover:bg-gray-100 rounded-full">
                Записаться на консультацию
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/20 rounded-full">
                Связаться с нами
              </Button>
            </div>
          </section>

          {/* Info Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12 gradient-text-pink">Инновационная технология биопсии</h2>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-lg text-gray-700 mb-6">
                  Вакуумная аспирационная биопсия (ВАБ) представляет собой передовую систему, которая позволяет получить точные образцы ткани для диагностики без традиционного хирургического вмешательства.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-lg">
                    <div className="text-2xl font-bold gradient-text-blue mb-1">1.5M+</div>
                    <div className="text-gray-700">процедур ежегодно</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                    <div className="text-2xl font-bold gradient-text-pink mb-1">1 час</div>
                    <div className="text-gray-700">после процедуры домой</div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-pink-100 p-8 rounded-lg">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-r from-pink-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-2xl">🔬</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 gradient-text-blue">ВАБ под контролем УЗИ</h3>
                  <p className="text-gray-600">Безопасно и эффективно</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="footer animated-bg">
        <div className="footer-container">
          <div className="footer-grid">
            <div>
              <h4 className="footer-title gradient-text-pink">О компании</h4>
              <p>Единственный официальный дистрибьютор ВАБ завода Сишань в РФ</p>
            </div>
            <div>
              <h4 className="footer-title gradient-text-blue">Контакты</h4>
              <p>Тел: +7 (495) 123-45-67</p>
              <p>Email: info@fb.net</p>
            </div>
            <div>
              <h4 className="footer-title gradient-text-pink">Ссылки</h4>
              <ul className="footer-links">
                <li><Link href="/" className="footer-link">Главная</Link></li>
                <li><Link href="/patients" className="footer-link">Пациентам</Link></li>
                <li><Link href="/equipment" className="footer-link">Оборудование</Link></li>
                <li><Link href="/training" className="footer-link">Обучение</Link></li>
                <li><Link href="/news" className="footer-link">Новости</Link></li>
                <li><Link href="/conferences" className="footer-link">Конференции</Link></li>
                <li><Link href="/contacts" className="footer-link">Контакты</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="footer-title gradient-text-blue">Социальные сети</h4>
              <div className="flex gap-4 mt-4">
                <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-pink-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">📘</span>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">🐦</span>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">💼</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
