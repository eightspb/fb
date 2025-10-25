import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";

export default function Training() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="pt-20">
        <div className="page-container">
          <div className="page-max-width-wide">
            <Breadcrumbs items={[{ label: "Обучение" }]} />
          </div>
        </div>
      </div>

      <main className="page-container">
        <div className="page-max-width-wide">

          <h1 className="page-title gradient-text-pink shine-effect">Обучение</h1>

          {/* Statistics */}
          <section className="training-stats mb-12">
            <h2 className="text-3xl font-bold text-center mb-12 gradient-text-blue">Статистика обучения</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <Card className="card-hover gradient-card-pink float-animation">
                <CardContent className="card-content text-center">
                  <div className="text-3xl font-bold gradient-text-pink mb-2 shine-effect">150+</div>
                  <p className="opacity-90">Обученных врачей</p>
                </CardContent>
              </Card>
              <Card className="card-hover gradient-card-blue float-animation" style={{ animationDelay: '1s' }}>
                <CardContent className="card-content text-center">
                  <div className="text-3xl font-bold gradient-text-blue mb-2">12</div>
                  <p className="opacity-90">Городов и стран</p>
                </CardContent>
              </Card>
              <Card className="card-hover gradient-card-purple float-animation" style={{ animationDelay: '2s' }}>
                <CardContent className="card-content text-center">
                  <div className="text-3xl font-bold gradient-text-purple mb-2">Ежемесячно</div>
                  <p className="opacity-90">Проводятся курсы</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Photogallery */}
          <section className="training-gallery">
            <h2 className="text-3xl font-bold text-center mb-12 gradient-text-purple shine-effect">Фотогалерея</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="card-hover gradient-card-pink shine-effect float-animation">
                <CardContent className="card-content text-center">
                  <div className="aspect-square bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl mb-4 glass-card flex items-center justify-center">
                    <span className="text-4xl">🏥</span>
                  </div>
                  <h3 className="text-lg font-semibold gradient-text-pink">НИИ Петрова</h3>
                  <p className="text-gray-600">Обучение специалистов</p>
                </CardContent>
              </Card>
              <Card className="card-hover gradient-card-blue shine-effect float-animation" style={{ animationDelay: '1s' }}>
                <CardContent className="card-content text-center">
                  <div className="aspect-square bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl mb-4 glass-card flex items-center justify-center">
                    <span className="text-4xl">🏥</span>
                  </div>
                  <h3 className="text-lg font-semibold gradient-text-blue">МКНЦ</h3>
                  <p className="text-gray-600">Практическая подготовка</p>
                </CardContent>
              </Card>
              <Card className="card-hover gradient-card-purple shine-effect float-animation" style={{ animationDelay: '2s' }}>
                <CardContent className="card-content text-center">
                  <div className="aspect-square bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl mb-4 glass-card flex items-center justify-center">
                    <span className="text-4xl">🏥</span>
                  </div>
                  <h3 className="text-lg font-semibold gradient-text-purple">Обучение</h3>
                  <p className="text-gray-600">Сертифицированные курсы</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Program */}
          <section className="training-program">
            <h2 className="text-3xl font-bold text-center mb-12 gradient-text-pink">Программа обучения</h2>

            {/* Target Audience */}
            <Card className="mb-6 card-hover gradient-card-pink shine-effect">
              <CardContent className="card-content">
                <h3 className="text-xl font-semibold mb-4 gradient-text-pink">Для кого</h3>
                <p className="text-gray-700">
                  Курс для сертифицированных врачей «УЗ-диагностика», «Хирургия», «Онкология» с опытом ВАР/ВАБ от 1 года,
                  кто хочет повысить точность, сократить осложнения и уверенно брать сложные локализации с отличным косметическим результатом.
                </p>
              </CardContent>
            </Card>

            {/* Format and Duration */}
            <Card className="mb-6 card-hover gradient-card-blue shine-effect">
              <CardContent className="card-content">
                <h3 className="text-xl font-semibold mb-4 gradient-text-blue">Формат и длительность</h3>
                <p className="text-gray-700">
                  Очное обучение, 2 насыщенных дня, 36 академических часов. Теория + интенсивная практика с разбором реальных кейсов и пошаговыми отработками.
                </p>
              </CardContent>
            </Card>

            {/* Certificate */}
            <Card className="mb-6 card-hover gradient-card-purple shine-effect">
              <CardContent className="card-content">
                <h3 className="text-xl font-semibold mb-4 gradient-text-purple">Документ</h3>
                <p className="text-gray-700">
                  Удостоверение о повышении квалификации установленного образца на 36 часов.
                </p>
              </CardContent>
            </Card>

            {/* Cost */}
            <Card className="mb-6 card-hover gradient-card-rose shine-effect">
              <CardContent className="card-content">
                <h3 className="text-xl font-semibold mb-4 gradient-text-rose">Стоимость и условия</h3>
                <p className="text-gray-700">
                  25 000 ₽. Для партнёров ООО «Зенит» — бесплатно.
                </p>
              </CardContent>
            </Card>

            {/* Instructor */}
            <Card className="mb-6 card-hover gradient-card-pink shine-effect">
              <CardContent className="card-content">
                <h3 className="text-xl font-semibold mb-4 gradient-text-pink">Преподаватель</h3>
                <p className="text-gray-700 mb-4">
                  Одинцов Владислав Александрович — д.м.н., онколог, хирург, врач УЗД и рентгенолог; главный врач «Клиники Одинцова»,
                  ведущий специалист маммологического центра СПб клинической больницы РАН, профессор кафедры лучевой диагностики,
                  лучевой терапии и онкологии СГМУ. Сильная школа «руками» и акцент на безопасности и результате.
                </p>
              </CardContent>
            </Card>

            {/* Why Attend */}
            <Card className="mb-6 card-hover gradient-card-blue shine-effect">
              <CardContent className="card-content">
                <h3 className="text-xl font-semibold mb-4 gradient-text-blue">Почему это стоит вашего времени</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Ускорите принятие решений по BI-RADS в серых зонах и при дискордантных данных.</li>
                  <li>Освоите алгоритмы, позволяющие минимизировать кровотечения, гематомы и деформации.</li>
                  <li>Научитесь безопасно и красиво работать в субареолярной, подкожной и ретромаммарной зонах.</li>
                  <li>Получите практические лайфхаки по резекции образований &gt;5 см без потери контроля и эстетики.</li>
                  <li>Заберёте готовые протоколы и чек-листы, которые сразу внедряются в практику.</li>
                </ul>
              </CardContent>
            </Card>

            {/* What You'll Learn */}
            <Card className="mb-6 card-hover gradient-card-purple shine-effect">
              <CardContent className="card-content">
                <h3 className="text-xl font-semibold mb-4 gradient-text-purple">Что вы научитесь делать лучше уже после курса</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Быстро выбирать тактику ВАР/ВАБ по BI-RADS с учётом размера и фенотипа образования.</li>
                  <li>Снижать риски осложнений: профилактика кровотечений, гематом, кожного повреждения.</li>
                  <li>Уверенно проводить вакуумную аспирационную резекцию крупных узлов (&gt;5 см).</li>
                  <li>Работать в сложных зонах с сохранением формы железы и минимальным рубцом.</li>
                  <li>Выстраивать алгоритм при дискордантных ответах морфологии и визуализации.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Lectures */}
            <Card className="mb-6 card-hover gradient-card-rose shine-effect">
              <CardContent className="card-content">
                <h3 className="text-xl font-semibold mb-4 gradient-text-rose">Лекции (теория — концентрат практики)</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Интервенционная маммология: место ВАР/ВАБ, сильные и слабые стороны методов.</li>
                  <li>Комбинированные кисты и дуктоэктазия: ультразвук + ретроградное контрастирование, когда это меняет тактику.</li>
                  <li>Дискордантные случаи: алгоритмы принятия решения и когда пересматривать биопсию.</li>
                  <li>Солидные образования и шкала BI-RADS (US): показания к ВАБ/ВАР по размерам и типу очага.</li>
                  <li>Профилактика осложнений и сохранение эстетики: техники, доступы, контроль.</li>
                  <li>Субареолярные, подкожные, ретромаммарные образования: маршрутизация иглы и выбор траектории.</li>
                  <li>Техника вакуумной резекции &gt;5 см: этапность, контроль, завершение без сюрпризов.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Practice */}
            <Card className="mb-6 card-hover gradient-card-pink shine-effect">
              <CardContent className="card-content">
                <h3 className="text-xl font-semibold mb-4 gradient-text-pink">Практика (максимум пользы за 2 дня)</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Гидропрепаровка физраствором в сложных зонах: когда, как и сколько.</li>
                  <li>Техника натяжения кожи для подкожных узлов: предотвращаем «ступеньки» и западения.</li>
                  <li><strong>Самостоятельная работа с киноархивом:</strong>
                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                      <li>Кисты: типичные ловушки и как их обходить.</li>
                      <li>Солидные образования и Core-биопсии: выбор инструмента, глубина, траектория.</li>
                      <li>Внутрипротоковые образования: прицельность и контроль манипуляции.</li>
                      <li>Абсцессы: от аспирации до дренирования, нюансы тактики.</li>
                    </ul>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Takeaways */}
            <Card className="mb-6 card-hover gradient-card-blue shine-effect">
              <CardContent className="card-content">
                <h3 className="text-xl font-semibold mb-4 gradient-text-blue">Что заберёте с собой</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Чек-листы по подготовке и ведению пациента до/после ВАР/ВАБ.</li>
                  <li>Алгоритмы действий при несоответствиях US/морфологии.</li>
                  <li>Схемы доступов для разных локализаций, включая «неудобные» зоны.</li>
                  <li>Разбор типичных ошибок и способы их профилактики.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Who Should Attend */}
            <Card className="mb-6 card-hover gradient-card-purple shine-effect">
              <CardContent className="card-content">
                <h3 className="text-xl font-semibold mb-4 gradient-text-purple">Кому особенно зайдёт</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>УЗ-диагностам и хирургам, кто хочет повысить «проходимость» сложных случаев без роста осложнений.</li>
                  <li>Онкологам, кто стремится к предсказуемому морфологическому подтверждению и корректной тактике.</li>
                  <li>Командам, где важен быстрый и эстетически щадящий результат с минимальными повторными вмешательствами.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="mb-6 card-hover gradient-card-rose shine-effect">
              <CardContent className="card-content">
                <h3 className="text-xl font-semibold mb-4 gradient-text-rose">Итог</h3>
                <p className="text-gray-700">
                  За два дня вы систематизируете решения по BI-RADS, отточите технику в сложных зонах,
                  снизите осложнения и получите инструменты, которые на следующий рабочий день улучшат ваши результаты и отзывы пациентов.
                </p>
              </CardContent>
            </Card>

            <div className="text-center">
              <Button size="lg" className="gradient-button-pink">
                Запросить условия
              </Button>
            </div>
          </section>

          {/* Calendar */}
          <section className="training-calendar">
            <h2 className="text-3xl font-bold text-center mb-12 gradient-text-blue">Календарь курсов</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="card-hover gradient-card-pink shine-effect">
                <CardContent className="card-content">
                  <Badge className="mb-2 bg-pink-100 text-pink-800">Москва</Badge>
                  <h3 className="text-xl font-semibold mb-2 gradient-text-pink">Курс ВАБ для начинающих</h3>
                  <p className="mb-2">Дата: 15 ноября 2025</p>
                  <p className="mb-2">Спикеры: Доктор Иванов, НИИ Петрова</p>
                  <p className="mb-4">Часы: 16 CME</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="gradient-button-pink">Регистрация</Button>
                    <Button size="sm" variant="outline" className="glass-card">Программа</Button>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-hover gradient-card-blue shine-effect">
                <CardContent className="card-content">
                  <Badge className="mb-2 bg-blue-100 text-blue-800">СПб</Badge>
                  <h3 className="text-xl font-semibold mb-2 gradient-text-blue">Мастер-класс по ВАБ</h3>
                  <p className="mb-2">Дата: 20 апреля 2025</p>
                  <p className="mb-2">Спикеры: Доктор Петрова, МКНЦ</p>
                  <p className="mb-4">Часы: 8 CME</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="gradient-button-blue">Регистрация</Button>
                    <Button size="sm" variant="outline" className="glass-card">Программа</Button>
                  </div>
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
