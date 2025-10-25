import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";

export default function Conferences() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="pt-20">
        <div className="page-container">
          <div className="page-max-width-wide">
            <Breadcrumbs items={[{ label: "Конференции" }]} />
          </div>
        </div>
      </div>

      <main className="page-container">
        <div className="page-max-width-wide">

          <h1 className="page-title gradient-text-purple shine-effect">Конференции и Мероприятия</h1>

          <Tabs defaultValue="announcements" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-pink-50 to-blue-50">
              <TabsTrigger value="announcements" className="gradient-text-pink">Анонсы</TabsTrigger>
              <TabsTrigger value="archive" className="gradient-text-blue">Архив</TabsTrigger>
            </TabsList>

            <TabsContent value="announcements" className="mt-8">
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="card-hover gradient-card-pink shine-effect float-animation">
                  <CardContent className="card-content">
                    <Badge className="mb-4 bg-pink-100 text-pink-800 font-semibold px-3 py-1 rounded-full">Анонс</Badge>
                    <h3 className="text-xl font-semibold mb-3 gradient-text-pink">II Конференция ВАБ</h3>
                    <p className="mb-3"><strong className="gradient-text-pink">Дата:</strong> 20 апреля 2025</p>
                    <p className="mb-3"><strong className="gradient-text-blue">Место:</strong> Санкт-Петербург</p>
                    <p className="mb-6"><strong className="gradient-text-purple">Спикеры:</strong> Доктор Петрова, НИИ Герцена</p>
                    <h4 className="font-semibold mb-4 gradient-text-pink">Программа:</h4>
                    <ul className="list-disc list-inside mb-6 text-sm opacity-90 space-y-1">
                      <li>10:00 - Регистрация</li>
                      <li>11:00 - Введение в ВАБ</li>
                      <li>12:00 - Клинические случаи</li>
                      <li>14:00 - Обед</li>
                      <li>15:00 - Демонстрация оборудования</li>
                    </ul>
                    <p className="text-sm opacity-80 mb-6">Часы: 8 CME, Квоты: 100 участников</p>
                    <div className="flex gap-3">
                      <Button size="sm" className="gradient-button-pink rounded-full flex-1">Регистрация</Button>
                      <Button size="sm" variant="outline" className="rounded-full border-pink-300 hover:bg-pink-50 flex-1">Подробнее</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-hover gradient-card-blue shine-effect float-animation" style={{ animationDelay: '1s' }}>
                  <CardContent className="card-content">
                    <Badge className="mb-4 bg-blue-100 text-blue-800 font-semibold px-3 py-1 rounded-full">Анонс</Badge>
                    <h3 className="text-xl font-semibold mb-3 gradient-text-blue">Мастер-класс в НИИ Петрова</h3>
                    <p className="mb-3"><strong className="gradient-text-blue">Дата:</strong> 10 сентября 2025</p>
                    <p className="mb-3"><strong className="gradient-text-purple">Место:</strong> Москва</p>
                    <p className="mb-6"><strong className="gradient-text-pink">Спикеры:</strong> Доктор Иванов, НИИ Петрова</p>
                    <h4 className="font-semibold mb-4 gradient-text-blue">Программа:</h4>
                    <ul className="list-disc list-inside mb-6 text-sm opacity-90 space-y-1">
                      <li>09:00 - Приветствие</li>
                      <li>10:00 - Теоретическая часть</li>
                      <li>11:00 - Практическая демонстрация</li>
                      <li>13:00 - Обед</li>
                      <li>14:00 - Вопросы и ответы</li>
                    </ul>
                    <p className="text-sm opacity-80 mb-6">Часы: 6 CME, Квоты: 50 участников</p>
                    <div className="flex gap-3">
                      <Button size="sm" className="gradient-button-blue rounded-full flex-1">Регистрация</Button>
                      <Button size="sm" variant="outline" className="rounded-full border-blue-300 hover:bg-blue-50 flex-1">Подробнее</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="archive" className="mt-8">
              <div className="space-y-8">
                <Card className="card-hover gradient-card-pink shine-effect">
                  <CardContent className="card-content">
                    <Badge className="mb-4 bg-pink-100 text-pink-800 font-semibold px-3 py-1 rounded-full">Архив</Badge>
                    <h3 className="text-xl font-semibold mb-3 gradient-text-pink">Первая конференция апрель 2024</h3>
                    <p className="text-gray-700 mb-6">Успешно проведена конференция с участием ведущих специалистов.</p>
                    <p className="text-sm opacity-80 mb-6">Дата: 15.04.2024</p>
                    <div className="flex gap-3">
                      <Button size="sm" variant="outline" className="rounded-full border-pink-300 hover:bg-pink-50">Видео</Button>
                      <Button size="sm" variant="outline" className="rounded-full border-pink-300 hover:bg-pink-50">Фото</Button>
                      <Button size="sm" variant="outline" className="rounded-full border-pink-300 hover:bg-pink-50">Материалы</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-hover gradient-card-blue shine-effect">
                  <CardContent className="card-content">
                    <Badge className="mb-4 bg-blue-100 text-blue-800 font-semibold px-3 py-1 rounded-full">Архив</Badge>
                    <h3 className="text-xl font-semibold mb-3 gradient-text-blue">CMEF Шанхай апрель 2024</h3>
                    <p className="text-gray-700 mb-6">Мастер-класс на выставке для специалистов из Бразилии.</p>
                    <p className="text-sm opacity-80 mb-6">Дата: 20.04.2024</p>
                    <div className="flex gap-3">
                      <Button size="sm" variant="outline" className="rounded-full border-blue-300 hover:bg-blue-50">Видео</Button>
                      <Button size="sm" variant="outline" className="rounded-full border-blue-300 hover:bg-blue-50">Фото</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-hover gradient-card-purple shine-effect">
                  <CardContent className="card-content">
                    <Badge className="mb-4 bg-purple-100 text-purple-800 font-semibold px-3 py-1 rounded-full">Архив</Badge>
                    <h3 className="text-xl font-semibold mb-3 gradient-text-purple">Здравка 2024</h3>
                    <p className="text-gray-700 mb-6">Участие в выставке Здравка 2024.</p>
                    <p className="text-sm opacity-80 mb-6">Дата: 01.10.2024</p>
                    <div className="flex gap-3">
                      <Button size="sm" variant="outline" className="rounded-full border-purple-300 hover:bg-purple-50">Фото</Button>
                      <Button size="sm" variant="outline" className="rounded-full border-purple-300 hover:bg-purple-50">Отчет</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-hover gradient-card-rose shine-effect">
                  <CardContent className="card-content">
                    <Badge className="mb-4 bg-rose-100 text-rose-800 font-semibold px-3 py-1 rounded-full">Архив</Badge>
                    <h3 className="text-xl font-semibold mb-3 gradient-text-rose">Arab Health 2025</h3>
                    <p className="text-gray-700 mb-6">Мастер-класс на стенде для иностранных врачей.</p>
                    <p className="text-sm opacity-80 mb-6">Дата: 01.02.2025</p>
                    <div className="flex gap-3">
                      <Button size="sm" variant="outline" className="rounded-full border-rose-300 hover:bg-rose-50">Видео</Button>
                      <Button size="sm" variant="outline" className="rounded-full border-rose-300 hover:bg-rose-50">Фото</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
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
