import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function Conferences() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <Breadcrumbs items={[{ label: "Конференции" }]} />

          <h1 className="text-4xl font-bold text-center mb-8">Конференции и Мероприятия</h1>

          <Tabs defaultValue="announcements" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="announcements">Анонсы</TabsTrigger>
              <TabsTrigger value="archive">Архив</TabsTrigger>
            </TabsList>

            <TabsContent value="announcements" className="mt-8">
              <div className="grid md:grid-cols-2 gap-8">
                <Card>
                  <CardContent className="p-6">
                    <Badge className="mb-2">Анонс</Badge>
                    <h3 className="text-xl font-semibold mb-2">II Конференция ВАБ</h3>
                    <p className="mb-2"><strong>Дата:</strong> 20 апреля 2025</p>
                    <p className="mb-2"><strong>Место:</strong> Санкт-Петербург</p>
                    <p className="mb-4"><strong>Спикеры:</strong> Доктор Петрова, НИИ Герцена</p>
                    <h4 className="font-semibold mb-2">Программа:</h4>
                    <ul className="list-disc list-inside mb-4 text-sm">
                      <li>10:00 - Регистрация</li>
                      <li>11:00 - Введение в ВАБ</li>
                      <li>12:00 - Клинические случаи</li>
                      <li>14:00 - Обед</li>
                      <li>15:00 - Демонстрация оборудования</li>
                    </ul>
                    <p className="text-sm text-gray-600 mb-4">Часы: 8 CME, Квоты: 100 участников</p>
                    <div className="flex gap-2">
                      <Button size="sm">Регистрация</Button>
                      <Button size="sm" variant="outline">Подробнее</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <Badge className="mb-2">Анонс</Badge>
                    <h3 className="text-xl font-semibold mb-2">Мастер-класс в НИИ Петрова</h3>
                    <p className="mb-2"><strong>Дата:</strong> 10 сентября 2025</p>
                    <p className="mb-2"><strong>Место:</strong> Москва</p>
                    <p className="mb-4"><strong>Спикеры:</strong> Доктор Иванов, НИИ Петрова</p>
                    <h4 className="font-semibold mb-2">Программа:</h4>
                    <ul className="list-disc list-inside mb-4 text-sm">
                      <li>09:00 - Приветствие</li>
                      <li>10:00 - Теоретическая часть</li>
                      <li>11:00 - Практическая демонстрация</li>
                      <li>13:00 - Обед</li>
                      <li>14:00 - Вопросы и ответы</li>
                    </ul>
                    <p className="text-sm text-gray-600 mb-4">Часы: 6 CME, Квоты: 50 участников</p>
                    <div className="flex gap-2">
                      <Button size="sm">Регистрация</Button>
                      <Button size="sm" variant="outline">Подробнее</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="archive" className="mt-8">
              <div className="space-y-8">
                <Card>
                  <CardContent className="p-6">
                    <Badge className="mb-2">Архив</Badge>
                    <h3 className="text-xl font-semibold mb-2">Первая конференция апрель 2024</h3>
                    <p className="text-gray-600 mb-4">Успешно проведена конференция с участием ведущих специалистов.</p>
                    <p className="text-sm text-gray-500 mb-4">Дата: 15.04.2024</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Видео</Button>
                      <Button size="sm" variant="outline">Фото</Button>
                      <Button size="sm" variant="outline">Материалы</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <Badge className="mb-2">Архив</Badge>
                    <h3 className="text-xl font-semibold mb-2">CMEF Шанхай апрель 2024</h3>
                    <p className="text-gray-600 mb-4">Мастер-класс на выставке для специалистов из Бразилии.</p>
                    <p className="text-sm text-gray-500 mb-4">Дата: 20.04.2024</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Видео</Button>
                      <Button size="sm" variant="outline">Фото</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <Badge className="mb-2">Архив</Badge>
                    <h3 className="text-xl font-semibold mb-2">Здравка 2024</h3>
                    <p className="text-gray-600 mb-4">Участие в выставке Здравка 2024.</p>
                    <p className="text-sm text-gray-500 mb-4">Дата: 01.10.2024</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Фото</Button>
                      <Button size="sm" variant="outline">Отчет</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <Badge className="mb-2">Архив</Badge>
                    <h3 className="text-xl font-semibold mb-2">Arab Health 2025</h3>
                    <p className="text-gray-600 mb-4">Мастер-класс на стенде для иностранных врачей.</p>
                    <p className="text-sm text-gray-500 mb-4">Дата: 01.02.2025</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Видео</Button>
                      <Button size="sm" variant="outline">Фото</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
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
