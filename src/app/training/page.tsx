import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function Training() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs items={[{ label: "Обучение" }]} />

          <h1 className="text-4xl font-bold text-center mb-8">Обучение</h1>

          {/* Statistics */}
          <section className="mb-16">
            <h2 className="text-3xl font-semibold mb-6">Статистика обучения</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">150+</div>
                  <p>Обученных врачей</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">12</div>
                  <p>Городов и стран</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">Ежемесячно</div>
                  <p>Проводятся курсы</p>
                </CardContent>
              </Card>
            </div>
            <div className="mt-8">
              <h3 className="text-2xl font-semibold mb-4">Фотогалерея</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="aspect-square bg-gray-200 rounded flex items-center justify-center">Фото НИИ Петрова</div>
                <div className="aspect-square bg-gray-200 rounded flex items-center justify-center">Фото МКНЦ</div>
                <div className="aspect-square bg-gray-200 rounded flex items-center justify-center">Фото обучения</div>
              </div>
            </div>
          </section>

          {/* Program */}
          <section className="mb-16">
            <h2 className="text-3xl font-semibold mb-6">Программа обучения</h2>

            {/* Target Audience */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Для кого</h3>
                <p className="text-gray-700">
                  Курс для сертифицированных врачей «УЗ-диагностика», «Хирургия», «Онкология» с опытом ВАР/ВАБ от 1 года,
                  кто хочет повысить точность, сократить осложнения и уверенно брать сложные локализации с отличным косметическим результатом.
                </p>
              </CardContent>
            </Card>

            {/* Format and Duration */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Формат и длительность</h3>
                <p className="text-gray-700">
                  Очное обучение, 2 насыщенных дня, 36 академических часов. Теория + интенсивная практика с разбором реальных кейсов и пошаговыми отработками.
                </p>
              </CardContent>
            </Card>

            {/* Certificate */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Документ</h3>
                <p className="text-gray-700">
                  Удостоверение о повышении квалификации установленного образца на 36 часов.
                </p>
              </CardContent>
            </Card>

            {/* Cost */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Стоимость и условия</h3>
                <p className="text-gray-700">
                  25 000 ₽. Для партнёров ООО «Зенит» — бесплатно.
                </p>
              </CardContent>
            </Card>

            {/* Instructor */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Преподаватель</h3>
                <p className="text-gray-700 mb-4">
                  Одинцов Владислав Александрович — д.м.н., онколог, хирург, врач УЗД и рентгенолог; главный врач «Клиники Одинцова»,
                  ведущий специалист маммологического центра СПб клинической больницы РАН, профессор кафедры лучевой диагностики,
                  лучевой терапии и онкологии СГМУ. Сильная школа «руками» и акцент на безопасности и результате.
                </p>
              </CardContent>
            </Card>

            {/* Why Attend */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Почему это стоит вашего времени</h3>
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
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Что вы научитесь делать лучше уже после курса</h3>
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
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Лекции (теория — концентрат практики)</h3>
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
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Практика (максимум пользы за 2 дня)</h3>
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
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Что заберёте с собой</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Чек-листы по подготовке и ведению пациента до/после ВАР/ВАБ.</li>
                  <li>Алгоритмы действий при несоответствиях US/морфологии.</li>
                  <li>Схемы доступов для разных локализаций, включая «неудобные» зоны.</li>
                  <li>Разбор типичных ошибок и способы их профилактики.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Who Should Attend */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Кому особенно зайдёт</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>УЗ-диагностам и хирургам, кто хочет повысить «проходимость» сложных случаев без роста осложнений.</li>
                  <li>Онкологам, кто стремится к предсказуемому морфологическому подтверждению и корректной тактике.</li>
                  <li>Командам, где важен быстрый и эстетически щадящий результат с минимальными повторными вмешательствами.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Итог</h3>
                <p className="text-gray-700">
                  За два дня вы систематизируете решения по BI-RADS, отточите технику в сложных зонах,
                  снизите осложнения и получите инструменты, которые на следующий рабочий день улучшат ваши результаты и отзывы пациентов.
                </p>
              </CardContent>
            </Card>

            <div className="text-center">
              <Button size="lg" variant="outline">Запросить условия</Button>
            </div>
          </section>

          {/* Calendar */}
          <section className="mb-16">
            <h2 className="text-3xl font-semibold mb-6">Календарь курсов</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <Badge className="mb-2">Москва</Badge>
                  <h3 className="text-xl font-semibold mb-2">Курс ВАБ для начинающих</h3>
                  <p className="mb-2">Дата: 15 ноября 2025</p>
                  <p className="mb-2">Спикеры: Доктор Иванов, НИИ Петрова</p>
                  <p className="mb-4">Часы: 16 CME</p>
                  <div className="flex gap-2">
                    <Button size="sm">Регистрация</Button>
                    <Button size="sm" variant="outline">Программа</Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <Badge className="mb-2">СПб</Badge>
                  <h3 className="text-xl font-semibold mb-2">Мастер-класс по ВАБ</h3>
                  <p className="mb-2">Дата: 20 апреля 2025</p>
                  <p className="mb-2">Спикеры: Доктор Петрова, МКНЦ</p>
                  <p className="mb-4">Часы: 8 CME</p>
                  <div className="flex gap-2">
                    <Button size="sm">Регистрация</Button>
                    <Button size="sm" variant="outline">Программа</Button>
                  </div>
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
