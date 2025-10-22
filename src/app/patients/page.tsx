import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function Patients() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="page-container">
        <div className="page-max-width-wide">
          <Breadcrumbs items={[{ label: "Пациентам" }]} />

          <h1 className="page-title">Пациентам</h1>

          {/* Hero Section */}
          <section className="equipment-purpose">
            <Card className="card-hover">
              <CardContent className="card-content">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h2 className="text-2xl font-bold mb-4 text-blue-600">Современная безоперационная методика</h2>
                    <p className="text-lg text-gray-700 mb-6">
                      Вакуумная аспирационная биопсия (ВАБ) - это современная малоинвазивная процедура,
                      которая позволяет получить образцы ткани молочной железы для диагностики или удалить доброкачественные образования
                      без традиционного хирургического вмешательства.
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 mb-1">1.5M+</div>
                        <div className="text-gray-600">процедур ежегодно</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 mb-1">1 час</div>
                        <div className="text-gray-600">после процедуры домой</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-lg">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white text-3xl">🔬</span>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">ВАБ под контролем УЗИ</h3>
                      <p className="text-gray-600">Безопасно и эффективно</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* How VAB Works */}
          <section className="equipment-features">
            <h2 className="text-3xl font-bold text-center mb-12">Как проходит Вакуумная аспирационная биопсия?</h2>
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <Card className="card-hover">
                  <CardContent className="card-content">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 text-xl font-bold">1</span>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Подготовка</h3>
                        <p className="text-gray-600 text-sm">Врач проводит осмотр и УЗИ-диагностику. Определяется точное расположение образования.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-hover">
                  <CardContent className="card-content">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 text-xl font-bold">2</span>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Местная анестезия</h3>
                        <p className="text-gray-600 text-sm">Проводится местное обезболивание в области проведения процедуры.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-hover">
                  <CardContent className="card-content">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 text-xl font-bold">3</span>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Введение иглы</h3>
                        <p className="text-gray-600 text-sm">Под контролем УЗИ вводится специальная игла в образование.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-hover">
                  <CardContent className="card-content">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 text-xl font-bold">4</span>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Забор ткани</h3>
                        <p className="text-gray-600 text-sm">С помощью вакуумной аспирации забираются образцы ткани для исследования.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-hover">
                  <CardContent className="card-content">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 text-xl font-bold">5</span>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Завершение</h3>
                        <p className="text-gray-600 text-sm">Накладывается повязка. Через час пациентка может идти домой.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-hover">
                  <CardContent className="card-content">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 text-xl font-bold">6</span>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Результаты</h3>
                        <p className="text-gray-600 text-sm">Гистологическое исследование полученных образцов в течение 7-10 дней.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold mb-4 text-center">Длительность процедуры: 15-45 минут</h3>
                <p className="text-gray-600 text-center">Вся процедура проводится под постоянным УЗИ-контролем для максимальной точности и безопасности.</p>
              </div>
            </div>
          </section>

          {/* Advantages */}
          <section className="equipment-benefits">
            <h2 className="text-3xl font-bold text-center mb-12">Преимущества ВАБ</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="card-hover">
                <CardContent className="card-content text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-green-600 text-2xl">🏥</span>
                  </div>
                  <h3 className="font-semibold mb-2">Без операции</h3>
                  <p className="text-sm text-gray-600">Нет необходимости в операционной и общем наркозе</p>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="card-content text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-blue-600 text-2xl">🏠</span>
                  </div>
                  <h3 className="font-semibold mb-2">Стационарозамещающая</h3>
                  <p className="text-sm text-gray-600">Через час после процедуры пациентка идет домой</p>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="card-content text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-purple-600 text-2xl">🎯</span>
                  </div>
                  <h3 className="font-semibold mb-2">Высокая точность</h3>
                  <p className="text-sm text-gray-600">УЗИ-контроль обеспечивает точное попадание в образование</p>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="card-content text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-orange-600 text-2xl">⚡</span>
                  </div>
                  <h3 className="font-semibold mb-2">Быстро</h3>
                  <p className="text-sm text-gray-600">Один специалист может провести 2-3 процедуры в час</p>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="card-content text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-red-600 text-2xl">🛡️</span>
                  </div>
                  <h3 className="font-semibold mb-2">Безопасно</h3>
                  <p className="text-sm text-gray-600">Местная анестезия, минимальный риск осложнений</p>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="card-content text-center">
                  <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-teal-600 text-2xl">💰</span>
                  </div>
                  <h3 className="font-semibold mb-2">Экономично</h3>
                  <p className="text-sm text-gray-600">Значительно дешевле традиционной хирургии</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Procedure Steps */}
          <section className="equipment-specifications">
            <h2 className="text-3xl font-bold text-center mb-12">Этапы проведения вакуумной аспирационной биопсии</h2>
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-4 gap-6">
                <Card className="card-hover">
                  <CardContent className="card-content text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-white text-2xl font-bold">1</span>
                    </div>
                    <h3 className="font-semibold mb-3">Подготовка</h3>
                    <p className="text-sm text-gray-600">Консультация врача-маммолога, УЗИ-диагностика</p>
                  </CardContent>
                </Card>

                <Card className="card-hover">
                  <CardContent className="card-content text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-white text-2xl font-bold">2</span>
                    </div>
                    <h3 className="font-semibold mb-3">Анестезия</h3>
                    <p className="text-sm text-gray-600">Местное обезболивание области вмешательства</p>
                  </CardContent>
                </Card>

                <Card className="card-hover">
                  <CardContent className="card-content text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-white text-2xl font-bold">3</span>
                    </div>
                    <h3 className="font-semibold mb-3">Процедура</h3>
                    <p className="text-sm text-gray-600">Введение иглы и забор ткани под УЗИ-контролем</p>
                  </CardContent>
                </Card>

                <Card className="card-hover">
                  <CardContent className="card-content text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-white text-2xl font-bold">4</span>
                    </div>
                    <h3 className="font-semibold mb-3">Восстановление</h3>
                    <p className="text-sm text-gray-600">Наблюдение и рекомендации по уходу</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="equipment-purpose">
            <h2 className="text-3xl font-bold text-center mb-12">Часто задаваемые вопросы</h2>
            <div className="max-w-4xl mx-auto space-y-6">
              <Card className="card-hover">
                <CardContent className="card-content">
                  <h3 className="font-semibold mb-3 text-blue-600">Больно ли делать ВАБ?</h3>
                  <p className="text-gray-600">Процедура проводится под местной анестезией, поэтому болезненные ощущения минимальны. Большинство пациенток сравнивают дискомфорт с обычной инъекцией.</p>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="card-content">
                  <h3 className="font-semibold mb-3 text-blue-600">Сколько времени занимает процедура?</h3>
                  <p className="text-gray-600">В среднем 15-45 минут, в зависимости от размера и расположения образования. После процедуры необходимо 1 час наблюдения.</p>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="card-content">
                  <h3 className="font-semibold mb-3 text-blue-600">Когда будут готовы результаты?</h3>
                  <p className="text-gray-600">Результаты гистологического исследования обычно готовы через 7-10 дней. При срочных показаниях срок может быть сокращен до 2-3 дней.</p>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="card-content">
                  <h3 className="font-semibold mb-3 text-blue-600">Остается ли шрам после процедуры?</h3>
                  <p className="text-gray-600">После ВАБ остается лишь небольшой прокол (1-2 мм), который практически незаметен и заживает без образования рубца.</p>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="card-content">
                  <h3 className="font-semibold mb-3 text-blue-600">Можно ли кормить грудью после ВАБ?</h3>
                  <p className="text-gray-600">Да, ВАБ не влияет на лактацию и не препятствует грудному вскармливанию в будущем.</p>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="card-content">
                  <h3 className="font-semibold mb-3 text-blue-600">Нужно ли брать направление от врача?</h3>
                  <p className="text-gray-600">Рекомендуется предварительная консультация маммолога. В некоторых клиниках направление обязательно для получения результатов по ОМС.</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Indications */}
          <section className="equipment-benefits">
            <h2 className="text-3xl font-bold text-center mb-12">Кому можно делать ВАБ?</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="card-hover">
                <CardContent className="card-content">
                  <h3 className="text-xl font-semibold mb-4 text-green-600">Показания для диагностики:</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Уточнение природы непальпируемого узлового образования молочной железы</li>
                    <li>• Получение материала для гистологического исследования</li>
                    <li>• Определение тканевых факторов прогноза новообразований</li>
                    <li>• Диагностика образований, видимых только при УЗИ</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="card-content">
                  <h3 className="text-xl font-semibold mb-4 text-blue-600">Показания для лечения:</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Удаление доброкачественных образований (фиброаденом)</li>
                    <li>• Альтернатива хирургическому вмешательству</li>
                    <li>• Удаление образований до 2 см и более</li>
                    <li>• Лечение множественных опухолей через один прокол</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardContent className="card-content md:col-span-2">
                  <h3 className="text-xl font-semibold mb-4 text-red-600">Противопоказания:</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Абсолютные:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Отсутствие визуализации при УЗИ</li>
                        <li>• Злокачественный характер образований</li>
                        <li>• Беременность и лактация (относительно)</li>
                      </ul>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Относительные:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Нарушения свертываемости крови</li>
                        <li>• Острые инфекционные заболевания</li>
                        <li>• Тяжелые сопутствующие заболевания</li>
                      </ul>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Ограничения:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Участки микрокальцинатов, невидимые при УЗИ</li>
                        <li>• Крупные образования (индивидуально)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center py-16">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-100 rounded-2xl p-8">
              <h2 className="text-3xl font-bold mb-4">Нужна консультация?</h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Запишитесь на прием к специалисту или получите подробную информацию о процедуре вакуумной аспирационной биопсии.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  Записаться на консультацию
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/contacts">Связаться с нами</Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>

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
              <h4 className="footer-title">Социальные сети</h4>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
