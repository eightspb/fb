import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function Contacts() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={[{ label: "Контакты" }]} />

          <h1 className="text-4xl font-bold text-center mb-8">Контакты</h1>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Info */}
            <section>
              <h2 className="text-3xl font-semibold mb-6">Свяжитесь с нами</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Телефон</h3>
                  <p>+7 (495) 123-45-67</p>
                </div>
                <div>
                  <h3 className="font-semibold">Email</h3>
                  <p>info@fb.net</p>
                </div>
                <div>
                  <h3 className="font-semibold">Адрес</h3>
                  <p>Москва, ул. Примерная, д. 1</p>
                </div>
              </div>

              {/* Map Placeholder */}
              <div className="mt-8">
                <h3 className="font-semibold mb-4">Карта</h3>
                <div className="aspect-video bg-gray-200 rounded flex items-center justify-center">
                  Карта расположения
                </div>
              </div>

              {/* Legal */}
              <div className="mt-8">
                <h3 className="font-semibold mb-4">Юридические реквизиты</h3>
                <p>ООО &quot;ФБ.НЕТ&quot;<br />
                ИНН: 1234567890<br />
                КПП: 123456789<br />
                ОГРН: 1234567890123</p>
              </div>

              {/* Support */}
              <div className="mt-8">
                <h3 className="font-semibold mb-4">Поддержка</h3>
                <p>Сервисное обслуживание: support@fb.net</p>
                <p>Снабжение: supply@fb.net</p>
              </div>
            </section>

            {/* Form */}
            <section>
              <h2 className="text-3xl font-semibold mb-6">Форма обратной связи</h2>
              <Card>
                <CardContent className="p-6">
                  <form className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Имя</label>
                      <input type="text" className="w-full p-2 border rounded" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <input type="email" className="w-full p-2 border rounded" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Телефон</label>
                      <input type="tel" className="w-full p-2 border rounded" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Сообщение</label>
                      <textarea className="w-full p-2 border rounded" rows={4}></textarea>
                    </div>
                    <div>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span className="text-sm">Согласие на обработку персональных данных</span>
                      </label>
                    </div>
                    <Button type="submit" className="w-full">Отправить</Button>
                  </form>
                </CardContent>
              </Card>

              <div className="mt-8 text-center">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  Запросить КП/демо
                </Button>
              </div>
            </section>
          </div>

          {/* Policies */}
          <section className="mt-16">
            <h2 className="text-3xl font-semibold mb-6">Политики</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Согласие на обработку ПДн</h3>
                  <p className="text-sm text-gray-600">Мы соблюдаем все требования законодательства о защите персональных данных.</p>
                  <Button variant="link" size="sm">Подробнее</Button>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Условия коммуникаций</h3>
                  <p className="text-sm text-gray-600">Правила взаимодействия с клиентами и партнерами.</p>
                  <Button variant="link" size="sm">Подробнее</Button>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold mb-4">О компании</h4>
              <p>Единственный официальный дистрибьютор ВАБ завода Сишань в РФ</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Контакты</h4>
              <p>Тел: +7 (495) 123-45-67</p>
              <p>Email: info@fb.net</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Ссылки</h4>
              <ul className="space-y-2">
                <li><Link href="/" className="hover:text-blue-400">Главная</Link></li>
                <li><Link href="/equipment" className="hover:text-blue-400">Оборудование</Link></li>
                <li><Link href="/training" className="hover:text-blue-400">Обучение</Link></li>
                <li><Link href="/news" className="hover:text-blue-400">Новости</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Социальные сети</h4>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
