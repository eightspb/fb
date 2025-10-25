import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";

export default function Equipment() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="pt-20">
        <div className="page-container">
          <div className="page-max-width-wide">
            <Breadcrumbs items={[{ label: "Оборудование" }]} />
          </div>
        </div>
      </div>

      <main className="page-container">
        <div className="page-max-width-wide">

          <h1 className="page-title gradient-text-pink shine-effect">DK-B-MS Система биопсии молочной железы</h1>

          {/* Hero Section */}
          <section className="equipment-purpose">
            <Card className="card-hover gradient-card-blue shine-effect">
              <CardContent className="card-content">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h2 className="text-2xl font-bold mb-4 gradient-text-blue">Инновационная технология биопсии</h2>
                    <p className="text-lg text-gray-700 mb-6">
                      DK-B-MS представляет собой передовую систему вакуумной биопсии молочной железы под контролем УЗИ.
                      Система обеспечивает высокую точность, безопасность и эффективность процедуры взятия образцов ткани.
                    </p>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><strong className="gradient-text-pink">Производитель:</strong> CHONGQING XISHAN SCIENCE & TECHNOLOGY CO., LTD.</p>
                      <p><strong className="gradient-text-blue">Официальный представитель в РФ:</strong> ООО «ЗЕНИТ»</p>
                      <p><strong className="gradient-text-pink">Телефон:</strong> +7 812 748 22 13</p>
                      <p><strong className="gradient-text-blue">Сайт:</strong> <a href="https://zenitmed.ru" className="gradient-text-pink hover:underline">zenitmed.ru</a></p>
                    </div>
                  </div>
                  <div className="flex justify-center items-center">
                    <img src="/images/equipment-main.png" alt="DK-B-MS Система биопсии" className="max-w-full h-auto rounded-lg shadow-lg" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Technical Advantages */}
          <section className="equipment-features">
            <h2 className="text-3xl font-bold text-center mb-12 gradient-text-pink">Технические преимущества</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="card-hover gradient-card-pink float-animation">
                <CardContent className="card-content text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4 pulse-pink">
                    <span className="text-2xl">⚙️</span>
                  </div>
                  <h3 className="font-semibold mb-2">Плавная регулировка</h3>
                  <p className="text-sm opacity-90">Положения ножа в апертуре иглы</p>
                </CardContent>
              </Card>

              <Card className="card-hover gradient-card-blue float-animation" style={{ animationDelay: '1s' }}>
                <CardContent className="card-content text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🔇</span>
                  </div>
                  <h3 className="font-semibold mb-2">Высокая эффективность</h3>
                  <p className="text-sm opacity-90">И низкий уровень шума</p>
                </CardContent>
              </Card>

              <Card className="card-hover gradient-card-purple float-animation" style={{ animationDelay: '2s' }}>
                <CardContent className="card-content text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <h3 className="font-semibold mb-2">Автоматическое определение</h3>
                  <p className="text-sm opacity-90">Типа иглы</p>
                </CardContent>
              </Card>

              <Card className="card-hover gradient-card-rose float-animation" style={{ animationDelay: '3s' }}>
                <CardContent className="card-content text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📏</span>
                  </div>
                  <h3 className="font-semibold mb-2">Настройка апертуры</h3>
                  <p className="text-sm opacity-90">5мм - 30мм</p>
                </CardContent>
              </Card>

              <Card className="card-hover gradient-card-pink float-animation" style={{ animationDelay: '4s' }}>
                <CardContent className="card-content text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🔔</span>
                  </div>
                  <h3 className="font-semibold mb-2">Интеллектуальный контроль</h3>
                  <p className="text-sm opacity-90">Предупреждение о переполнении</p>
                </CardContent>
              </Card>

              <Card className="card-hover gradient-card-blue float-animation" style={{ animationDelay: '5s' }}>
                <CardContent className="card-content text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">✂️</span>
                  </div>
                  <h3 className="font-semibold mb-2">Тройная заточка</h3>
                  <p className="text-sm opacity-90">Однонаправленный нож</p>
                </CardContent>
              </Card>

              <Card className="card-hover gradient-card-purple float-animation" style={{ animationDelay: '6s' }}>
                <CardContent className="card-content text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🔄</span>
                  </div>
                  <h3 className="font-semibold mb-2">Автоматическая доставка</h3>
                  <p className="text-sm opacity-90">Непрерывный сбор образцов</p>
                </CardContent>
              </Card>

              <Card className="card-hover gradient-card-rose float-animation" style={{ animationDelay: '7s' }}>
                <CardContent className="card-content text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📱</span>
                  </div>
                  <h3 className="font-semibold mb-2">Сенсорный интерфейс</h3>
                  <p className="text-sm opacity-90">Большой экран управления</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Procedure Steps */}
          <section className="equipment-specifications">
            <h2 className="text-3xl font-bold text-center mb-12">Процедура взятия образцов тканей</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="card-hover">
                <CardContent className="card-content text-center">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-2xl font-bold">1</span>
                  </div>
                  <h3 className="font-semibold mb-3">Наведение иглы</h3>
                  <p className="text-sm text-gray-600">Под контролем УЗИ</p>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="card-content text-center">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-2xl font-bold">2</span>
                  </div>
                  <h3 className="font-semibold mb-3">Аспирация</h3>
                  <p className="text-sm text-gray-600">С помощью вакуума</p>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="card-content text-center">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-2xl font-bold">3</span>
                  </div>
                  <h3 className="font-semibold mb-3">Ротационный срез</h3>
                  <p className="text-sm text-gray-600">Ткани опухоли</p>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="card-content text-center">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-2xl font-bold">4</span>
                  </div>
                  <h3 className="font-semibold mb-3">Перенос образца</h3>
                  <p className="text-sm text-gray-600">Посредством вакуума</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Innovation Section */}
          <section className="equipment-benefits">
            <h2 className="text-3xl font-bold text-center mb-12">Инновации улучшают клинические результаты</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="card-hover">
                <CardContent className="card-content">
                  <h3 className="text-xl font-semibold mb-4 text-blue-600">Регулировка апертуры иглы</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Точность регулировки 1 мм</li>
                    <li>• Длина образца от 5 мм до 30 мм</li>
                    <li>• Минимальная длина всего 5 мм</li>
                    <li>• Максимальное сохранение здоровых тканей</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="card-content">
                  <h3 className="text-xl font-semibold mb-4 text-blue-600">Оригинальная тройная заточка</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Более острый и безопасный прокол</li>
                    <li>• Плавная ротационная резка</li>
                    <li>• Полная обработка образцов</li>
                    <li>• Однонаправленный вращающийся нож</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="card-content">
                  <h3 className="text-xl font-semibold mb-4 text-blue-600">Автоматическая доставка</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Нет необходимости останавливаться</li>
                    <li>• Экономия времени процедуры</li>
                    <li>• Упрощение процесса работы</li>
                    <li>• Непрерывный сбор образцов</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="card-content">
                  <h3 className="text-xl font-semibold mb-4 text-blue-600">Интеллектуальные возможности</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Автоматическое определение типа иглы</li>
                    <li>• Предупреждение о переполнении контейнера</li>
                    <li>• Удобный сенсорный интерфейс</li>
                    <li>• Клавиши быстрого доступа</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Specifications Table */}
          <section className="equipment-purpose">
            <h2 className="text-3xl font-bold text-center mb-12">Спецификации игл</h2>
            <Card className="card-hover">
              <CardContent className="card-content">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="border border-gray-300 p-4 text-left font-semibold">Диаметр иглы</th>
                        <th className="border border-gray-300 p-4 text-left font-semibold">Длина иглы (мм)</th>
                        <th className="border border-gray-300 p-4 text-left font-semibold">Модель</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-4">5.0 (7G)</td>
                        <td className="border border-gray-300 p-4">110</td>
                        <td className="border border-gray-300 p-4">HJZX07A</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="border border-gray-300 p-4">4.0 (10G)</td>
                        <td className="border border-gray-300 p-4">110</td>
                        <td className="border border-gray-300 p-4">HJZX10A</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-4">3.2 (12G)</td>
                        <td className="border border-gray-300 p-4">110</td>
                        <td className="border border-gray-300 p-4">HJZX12A</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* CTA Section */}
          <section className="text-center py-16">
            <div className="bg-gradient-to-r from-pink-50 via-blue-50 to-purple-50 rounded-2xl p-8 glass-card">
              <h2 className="text-3xl font-bold mb-4 gradient-text-pink">Заинтересованы в DK-B-MS?</h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Свяжитесь с нами для получения подробной информации, ценового предложения или организации демонстрации системы.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="gradient-button-pink">
                  Запросить коммерческое предложение
                </Button>
                <Button size="lg" variant="outline" className="glass-card border-pink-200 hover:bg-pink-50">
                  Связаться с нами
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
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
