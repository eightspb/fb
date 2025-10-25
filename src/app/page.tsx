import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { GridPattern } from "@/components/GridPattern";
import { FeaturesSection } from "@/components/FeaturesSection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-pink-50 via-blue-50 to-white pt-20">
          <style>
            {`
              @keyframes gradient {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
              }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }

            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-20px); }
            }

            .gradient-text {
              background: linear-gradient(270deg, #ec4899, #3b82f6, #ec4899);
              background-size: 600% 600%;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              animation: gradient 8s ease infinite;
            }

            .float-animation {
              animation: float 6s ease-in-out infinite;
            }
          `}
        </style>

        <GridPattern
          width={40}
          height={40}
          x={-1}
          y={-1}
          className="absolute inset-0 h-full w-full"
          squares={[
            [4, 4],
            [4, 6],
            [5, 5],
            [6, 4],
            [7, 6],
            [8, 5],
            [9, 4],
          ]}
        />

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-10 w-64 h-64 bg-pink-300/20 rounded-full blur-3xl float-animation" />
          <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl float-animation" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-pink-200/30 to-blue-200/30 rounded-full blur-3xl float-animation" style={{ animationDelay: '4s' }} />
        </div>

        <div className="relative z-10 container mx-auto px-4 md:px-6 pt-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-100 to-blue-100 border border-pink-200/50 mb-8">
              <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></span>
              <span className="text-sm text-gray-700 font-medium">Современная медицинская технология</span>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-gray-900 to-gray-600">
                Официальный дистрибьютор ВАБ завода Сишань в РФ
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
              Клиническая ценность и передовые технологии для медицинских специалистов.
              Вакуумная аспирационная биопсия молочной железы - инновационная технология диагностики.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Button size="lg" className="rounded-full bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-600 hover:to-blue-600 text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all">
                Запросить демо/КП
                <span className="ml-2">→</span>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full border-2 border-pink-300 hover:bg-pink-50 px-8 py-6 text-lg">
                Узнать больше
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-blue-600">150+</div>
                <div className="text-gray-600 text-sm">Установок по РФ</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-blue-600">50+</div>
                <div className="text-gray-600 text-sm">Обученных врачей</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-blue-600">12</div>
                <div className="text-gray-600 text-sm">Городов и стран</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-blue-600">24/7</div>
                <div className="text-gray-600 text-sm">Поддержка</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="page-container">
      {/* Social Proof */}
      <section className="py-24 bg-gradient-to-r from-pink-50 via-white to-blue-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text-pink mb-2 shine-effect">150+</div>
              <p className="text-lg text-gray-700 font-semibold">Установок по РФ</p>
              <div className="w-16 h-1 bg-gradient-to-r from-pink-400 to-pink-600 rounded-full mx-auto mt-4"></div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text-blue mb-2 shine-effect">50+</div>
              <p className="text-lg text-gray-700 font-semibold">Обученных врачей</p>
              <div className="w-16 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mx-auto mt-4"></div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold gradient-text-purple mb-2 shine-effect">12</div>
              <p className="text-lg text-gray-700 font-semibold">Городов и стран</p>
              <div className="w-16 h-1 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full mx-auto mt-4"></div>
            </div>
          </div>
          <div className="mt-16">
            <h3 className="text-center text-2xl font-bold mb-8 gradient-text-pink">Ведущие центры</h3>
            <div className="flex justify-center space-x-8">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-100 to-pink-200 rounded-2xl glass-card flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 float-animation">
                <span className="text-2xl">🏥</span>
              </div>
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl glass-card flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 float-animation" style={{ animationDelay: '1s' }}>
                <span className="text-2xl">🏥</span>
              </div>
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl glass-card flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 float-animation" style={{ animationDelay: '2s' }}>
                <span className="text-2xl">🏥</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Spotlight */}
      <section className="py-24 bg-gradient-to-br from-blue-50 via-pink-50 to-purple-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 gradient-text-pink shine-effect">Как работает ВАБ</h2>
            <div className="aspect-video bg-gradient-to-br from-pink-100 to-blue-100 rounded-2xl mb-8 glass-card shadow-2xl">
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 pulse-pink">
                    <span className="text-4xl">🎬</span>
                  </div>
                  <p className="text-xl font-semibold gradient-text-blue mb-2">Видео демонстрация</p>
                  <p className="text-gray-600">Скоро будет доступно</p>
                </div>
              </div>
            </div>
            <div className="text-center">
              <Button className="gradient-button-pink rounded-full px-8 py-3">
                Перейти к лекциям экспертов
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Advantages */}
      <FeaturesSection />

      {/* Upcoming Events */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-pink-50/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 gradient-text-blue shine-effect">Ближайшие события</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="card-hover gradient-card-pink shine-effect float-animation">
              <CardContent className="card-content">
                <Badge className="mb-4 bg-pink-100 text-pink-800 font-semibold px-3 py-1 rounded-full">Обучение</Badge>
                <h3 className="text-xl font-semibold mb-3 gradient-text-pink">Курс ВАБ для начинающих</h3>
                <p className="text-gray-600 mb-6">Москва, 15 ноября 2025</p>
                <div className="flex gap-3">
                  <Button size="sm" className="gradient-button-pink rounded-full flex-1">Регистрация</Button>
                  <Button size="sm" variant="outline" className="rounded-full border-pink-300 hover:bg-pink-50 flex-1">Программа</Button>
                </div>
              </CardContent>
            </Card>
            <Card className="card-hover gradient-card-blue shine-effect float-animation" style={{ animationDelay: '1s' }}>
              <CardContent className="card-content">
                <Badge className="mb-4 bg-blue-100 text-blue-800 font-semibold px-3 py-1 rounded-full">Конференция</Badge>
                <h3 className="text-xl font-semibold mb-3 gradient-text-blue">II Конференция ВАБ</h3>
                <p className="text-gray-600 mb-6">СПб, 20 апреля 2025</p>
                <div className="flex gap-3">
                  <Button size="sm" className="gradient-button-blue rounded-full flex-1">Регистрация</Button>
                  <Button size="sm" variant="outline" className="rounded-full border-blue-300 hover:bg-blue-50 flex-1">Программа</Button>
                </div>
              </CardContent>
            </Card>
            <Card className="card-hover gradient-card-purple shine-effect float-animation" style={{ animationDelay: '2s' }}>
              <CardContent className="card-content">
                <Badge className="mb-4 bg-purple-100 text-purple-800 font-semibold px-3 py-1 rounded-full">Мастер-класс</Badge>
                <h3 className="text-xl font-semibold mb-3 gradient-text-purple">Мастер-класс в НИИ Петрова</h3>
                <p className="text-gray-600 mb-6">Москва, 10 сентября 2025</p>
                <div className="flex gap-3">
                  <Button size="sm" className="gradient-button-purple rounded-full flex-1">Регистрация</Button>
                  <Button size="sm" variant="outline" className="rounded-full border-purple-300 hover:bg-purple-50 flex-1">Программа</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Academy Showcase */}
      <section className="py-24 bg-gradient-to-b from-white to-blue-50/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 gradient-text-pink shine-effect">Академия</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="card-hover gradient-card-pink shine-effect float-animation">
              <CardContent className="card-content">
                <div className="aspect-video bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl mb-6 glass-card flex items-center justify-center">
                  <span className="text-4xl">🔬</span>
                </div>
                <Badge className="mb-4 bg-pink-100 text-pink-800 font-semibold px-3 py-1 rounded-full">Онкология</Badge>
                <h3 className="text-xl font-semibold mb-3 gradient-text-pink">Визуализация опухолей</h3>
                <p className="text-gray-600 mb-4">Доктор Иванов, НИИ Петрова</p>
                <Button className="gradient-button-pink rounded-full w-full">Подробнее</Button>
              </CardContent>
            </Card>
            <Card className="card-hover gradient-card-blue shine-effect float-animation" style={{ animationDelay: '1s' }}>
              <CardContent className="card-content">
                <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl mb-6 glass-card flex items-center justify-center">
                  <span className="text-4xl">❤️</span>
                </div>
                <Badge className="mb-4 bg-blue-100 text-blue-800 font-semibold px-3 py-1 rounded-full">Кардиология</Badge>
                <h3 className="text-xl font-semibold mb-3 gradient-text-blue">Сердечно-сосудистые исследования</h3>
                <p className="text-gray-600 mb-4">Доктор Петрова, МКНЦ</p>
                <Button className="gradient-button-blue rounded-full w-full">Подробнее</Button>
              </CardContent>
            </Card>
            <Card className="card-hover gradient-card-purple shine-effect float-animation" style={{ animationDelay: '2s' }}>
              <CardContent className="card-content">
                <div className="aspect-video bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl mb-6 glass-card flex items-center justify-center">
                  <span className="text-4xl">🧠</span>
                </div>
                <Badge className="mb-4 bg-purple-100 text-purple-800 font-semibold px-3 py-1 rounded-full">Неврология</Badge>
                <h3 className="text-xl font-semibold mb-3 gradient-text-purple">Нейровизуализация</h3>
                <p className="text-gray-600 mb-4">Доктор Сидоров, НИИ Герцена</p>
                <Button className="gradient-button-purple rounded-full w-full">Подробнее</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      </main>

      <Footer />
    </div>
  );
}
