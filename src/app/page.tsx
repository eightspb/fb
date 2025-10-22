import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <h1 className="hero-title">
            Официальный дистрибьютор ВАБ завода Сишань в РФ
          </h1>
          <p className="hero-subtitle">
            Клиническая ценность и передовые технологии для медицинских специалистов
          </p>
          <div className="hero-buttons">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Запросить демо/КП
            </Button>
            <Button size="lg" variant="outline">
              Записаться на обучение
            </Button>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">150+</div>
              <p>Установок по РФ</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">50+</div>
              <p>Обученных врачей</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">12</div>
              <p>Городов и стран</p>
            </div>
          </div>
          <div className="mt-12">
            <h3 className="text-center text-2xl font-semibold mb-8">Ведущие центры</h3>
            <div className="flex justify-center space-x-8">
              {/* Placeholder logos */}
              <div className="w-20 h-20 bg-gray-200 rounded"></div>
              <div className="w-20 h-20 bg-gray-200 rounded"></div>
              <div className="w-20 h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Spotlight */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">Как работает ВАБ</h2>
            <div className="aspect-video bg-gray-200 rounded-lg mb-4">
              {/* Placeholder for video */}
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                Видео демонстрация
              </div>
            </div>
            <div className="text-center">
              <Button variant="outline">Перейти к лекциям экспертов</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Ближайшие события</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="card-hover">
              <CardContent className="card-content">
                <Badge className="mb-2">Обучение</Badge>
                <h3 className="text-xl font-semibold mb-2">Курс ВАБ для начинающих</h3>
                <p className="text-gray-600 mb-4">Москва, 15 ноября 2025</p>
                <div className="flex gap-2">
                  <Button size="sm">Регистрация</Button>
                  <Button size="sm" variant="outline">Программа</Button>
                </div>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardContent className="card-content">
                <Badge className="mb-2">Конференция</Badge>
                <h3 className="text-xl font-semibold mb-2">II Конференция ВАБ</h3>
                <p className="text-gray-600 mb-4">СПб, 20 апреля 2025</p>
                <div className="flex gap-2">
                  <Button size="sm">Регистрация</Button>
                  <Button size="sm" variant="outline">Программа</Button>
                </div>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardContent className="card-content">
                <Badge className="mb-2">Мастер-класс</Badge>
                <h3 className="text-xl font-semibold mb-2">Мастер-класс в НИИ Петрова</h3>
                <p className="text-gray-600 mb-4">Москва, 10 сентября 2025</p>
                <div className="flex gap-2">
                  <Button size="sm">Регистрация</Button>
                  <Button size="sm" variant="outline">Программа</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Academy Showcase */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Академия</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="card-hover">
              <CardContent className="card-content">
                <div className="aspect-video bg-gray-200 rounded mb-4"></div>
                <Badge className="mb-2">Онкология</Badge>
                <h3 className="text-xl font-semibold mb-2">Визуализация опухолей</h3>
                <p className="text-gray-600">Доктор Иванов, НИИ Петрова</p>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardContent className="card-content">
                <div className="aspect-video bg-gray-200 rounded mb-4"></div>
                <Badge className="mb-2">Кардиология</Badge>
                <h3 className="text-xl font-semibold mb-2">Сердечно-сосудистые исследования</h3>
                <p className="text-gray-600">Доктор Петрова, МКНЦ</p>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardContent className="card-content">
                <div className="aspect-video bg-gray-200 rounded mb-4"></div>
                <Badge className="mb-2">Неврология</Badge>
                <h3 className="text-xl font-semibold mb-2">Нейровизуализация</h3>
                <p className="text-gray-600">Доктор Сидоров, НИИ Герцена</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-grid">
            <div>
              <h4 className="footer-title">О компании</h4>
              <p>Единственный официальный дистрибьютор ВАБ завода Сишань в РФ</p>
            </div>
            <div>
              <h4 className="footer-title">Контакты</h4>
              <p>Тел: +7 (495) 123-45-67</p>
              <p>Email: info@fb.net</p>
            </div>
            <div>
              <h4 className="footer-title">Ссылки</h4>
              <ul className="footer-links">
                <li><Link href="/equipment" className="footer-link">Оборудование</Link></li>
                <li><Link href="/training" className="footer-link">Обучение</Link></li>
                <li><Link href="/" className="footer-link">Главная</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="footer-title">Социальные сети</h4>
              {/* Placeholder */}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
