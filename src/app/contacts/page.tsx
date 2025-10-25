import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";

export default function Contacts() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="pt-20">
        <div className="page-container">
          <div className="page-max-width-wide">
            <Breadcrumbs items={[{ label: "Контакты" }]} />
          </div>
        </div>
      </div>

      <main className="page-container">
        <div className="page-max-width-wide">

          <h1 className="page-title gradient-text-pink shine-effect">Контакты</h1>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Info */}
            <section>
              <h2 className="text-3xl font-bold mb-6 gradient-text-blue">Свяжитесь с нами</h2>
              <div className="space-y-6">
                <Card className="card-hover gradient-card-pink shine-effect">
                  <CardContent className="card-content">
                    <h3 className="font-semibold gradient-text-pink mb-2">📞 Телефон</h3>
                    <p className="text-gray-700"><a href="tel:+78127482213" className="hover:gradient-text-pink transition-colors">+7 (812) 748-22-13</a></p>
                  </CardContent>
                </Card>
                <Card className="card-hover gradient-card-blue shine-effect">
                  <CardContent className="card-content">
                    <h3 className="font-semibold gradient-text-blue mb-2">📧 Email</h3>
                    <p className="text-gray-700"><a href="mailto:info@zenitmed.ru" className="hover:gradient-text-blue transition-colors">info@zenitmed.ru</a></p>
                  </CardContent>
                </Card>
                <Card className="card-hover gradient-card-purple shine-effect">
                  <CardContent className="card-content">
                    <h3 className="font-semibold gradient-text-purple mb-2">🏢 Компания</h3>
                    <p className="text-gray-700">ООО «ЗЕНИТ»</p>
                    <p className="text-sm text-gray-600 mt-2">Официальный представитель в РФ</p>
                  </CardContent>
                </Card>
              </div>

              {/* Map Placeholder */}
              <div className="mt-8">
                <h3 className="font-bold mb-4 gradient-text-pink">Карта расположения</h3>
                <div className="aspect-video bg-gradient-to-br from-pink-100 to-blue-100 rounded-2xl glass-card flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🗺️</span>
                </div>
              </div>

              {/* Legal */}
              <Card className="mt-8 card-hover gradient-card-rose shine-effect">
                <CardContent className="card-content">
                  <h3 className="font-bold mb-4 gradient-text-rose">О компании</h3>
                  <p className="text-gray-700">ООО «ЗЕНИТ»<br />
                  Официальный дистрибьютор ВАБ завода Сишань в РФ<br />
                  <a href="https://zenitmed.ru" target="_blank" rel="noopener noreferrer" className="gradient-text-pink hover:underline">zenitmed.ru</a></p>
                </CardContent>
              </Card>

              {/* Support */}
              <Card className="mt-6 card-hover gradient-card-blue shine-effect">
                <CardContent className="card-content">
                  <h3 className="font-bold mb-4 gradient-text-blue">Связь с нами</h3>
                  <p className="text-gray-700 mb-2">Основной телефон: <a href="tel:+78127482213" className="gradient-text-pink hover:underline">+7 (812) 748-22-13</a></p>
                  <p className="text-gray-700">Email: <a href="mailto:info@zenitmed.ru" className="gradient-text-pink hover:underline">info@zenitmed.ru</a></p>
                </CardContent>
              </Card>
            </section>

            {/* Form */}
            <section>
              <h2 className="text-3xl font-bold mb-6 gradient-text-purple">Форма обратной связи</h2>
              <Card className="card-hover gradient-card-pink shine-effect">
                <CardContent className="card-content">
                  <form className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 gradient-text-pink">Имя</label>
                      <input type="text" className="w-full p-3 border-2 border-pink-200 rounded-xl focus:border-pink-400 focus:outline-none transition-colors glass-card" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 gradient-text-blue">Email</label>
                      <input type="email" className="w-full p-3 border-2 border-blue-200 rounded-xl focus:border-blue-400 focus:outline-none transition-colors glass-card" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 gradient-text-purple">Телефон</label>
                      <input type="tel" className="w-full p-3 border-2 border-purple-200 rounded-xl focus:border-purple-400 focus:outline-none transition-colors glass-card" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 gradient-text-rose">Сообщение</label>
                      <textarea className="w-full p-3 border-2 border-rose-200 rounded-xl focus:border-rose-400 focus:outline-none transition-colors glass-card" rows={4}></textarea>
                    </div>
                    <div>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-3 w-4 h-4 text-pink-600 rounded focus:ring-pink-500" />
                        <span className="text-sm opacity-80">Согласие на обработку персональных данных</span>
                      </label>
                    </div>
                    <Button type="submit" className="w-full gradient-button-pink rounded-full py-3 text-lg">
                      Отправить сообщение
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="mt-8 text-center">
                <Button size="lg" className="gradient-button-blue rounded-full px-8 py-3">
                  Запросить КП/демо
                </Button>
              </div>
            </section>
          </div>

          {/* Policies */}
          <section className="mt-16">
            <h2 className="text-3xl font-bold mb-12 gradient-text-pink shine-effect">Политики</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="card-hover gradient-card-blue shine-effect">
                <CardContent className="card-content">
                  <h3 className="font-bold mb-3 gradient-text-blue">Согласие на обработку ПДн</h3>
                  <p className="text-gray-700 mb-4">Мы соблюдаем все требования законодательства о защите персональных данных.</p>
                  <Button variant="link" size="sm" className="gradient-text-blue hover:gradient-text-pink">Подробнее</Button>
                </CardContent>
              </Card>
              <Card className="card-hover gradient-card-purple shine-effect">
                <CardContent className="card-content">
                  <h3 className="font-bold mb-3 gradient-text-purple">Условия коммуникаций</h3>
                  <p className="text-gray-700 mb-4">Правила взаимодействия с клиентами и партнерами.</p>
                  <Button variant="link" size="sm" className="gradient-text-purple hover:gradient-text-pink">Подробнее</Button>
                </CardContent>
              </Card>
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
