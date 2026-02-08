import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { Shield, Lock, Eye, FileText, Mail, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Политика конфиденциальности | ООО «ЗЕНИТ»",
  description: "Политика конфиденциальности и обработки персональных данных ООО «ЗЕНИТ». Информация о сборе, использовании и защите персональных данных пользователей сайта.",
  keywords: "политика конфиденциальности, персональные данные, защита данных, ООО Зенит",
  openGraph: {
    title: "Политика конфиденциальности | ООО «ЗЕНИТ»",
    description: "Политика конфиденциальности и обработки персональных данных",
    url: "/privacy",
    type: "website",
  },
};

export default function PrivacyPolicy() {
  const currentDate = new Date().toLocaleDateString('ru-RU', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-teal-100 selection:text-teal-900">
      <Header />

      <div className="pt-24 pb-12 bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 md:px-6">
          <Breadcrumbs items={[{ label: "Политика конфиденциальности" }]} />
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mt-6 mb-4">
            Политика конфиденциальности
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl">
            ООО «ЗЕНИТ» обязуется защищать конфиденциальность и безопасность персональных данных пользователей нашего сайта.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Introduction */}
          <Card className="mb-8 border-slate-200 bg-gradient-to-br from-blue-50 to-teal-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Общие положения</h2>
                  <p className="text-slate-700 leading-relaxed">
                    Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей 
                    веб-сайта <strong>fibroadenoma.net</strong> (далее — «Сайт»), принадлежащего ООО «ЗЕНИТ» (далее — «Компания», «Мы»). 
                    Используя Сайт, вы соглашаетесь с условиями настоящей Политики конфиденциальности.
                  </p>
                  <p className="text-sm text-slate-600 mt-4">
                    <strong>Дата последнего обновления:</strong> {currentDate}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Operator Info */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <FileText className="w-6 h-6 text-teal-600" />
              1. Оператор персональных данных
            </h2>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-700 leading-relaxed mb-4">
                Оператором персональных данных является:
              </p>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="font-semibold text-slate-900 mb-2">ООО «ЗЕНИТ»</p>
                <p className="text-slate-600 text-sm mb-1">
                  <strong>Адрес:</strong> 197348, г. Санкт-Петербург, Богатырский проспект, 22
                </p>
                <p className="text-slate-600 text-sm mb-1">
                  <strong>Телефон:</strong> <a href="tel:+78127482213" className="text-teal-600 hover:underline">+7 (812) 748-22-13</a>
                </p>
                <p className="text-slate-600 text-sm">
                  <strong>Email:</strong> <a href="mailto:info@zenitmed.ru" className="text-teal-600 hover:underline">info@zenitmed.ru</a>
                </p>
              </div>
            </div>
          </section>

          {/* Personal Data */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <Lock className="w-6 h-6 text-teal-600" />
              2. Какие персональные данные мы собираем
            </h2>
            <div className="space-y-4">
              <Card className="border-slate-200">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-3">2.1. Данные, предоставляемые пользователем</h3>
                  <ul className="space-y-2 text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 mt-1">•</span>
                      <span><strong>Контактные данные:</strong> имя, фамилия, отчество, номер телефона, адрес электронной почты</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 mt-1">•</span>
                      <span><strong>Профессиональные данные:</strong> должность, место работы, специализация (для медицинских специалистов)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 mt-1">•</span>
                      <span><strong>Данные запросов:</strong> информация, указанная в формах обратной связи, заявках на консультацию, регистрации на мероприятия</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-3">2.2. Автоматически собираемые данные</h3>
                  <ul className="space-y-2 text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 mt-1">•</span>
                      <span><strong>Технические данные:</strong> IP-адрес, тип браузера, операционная система, разрешение экрана</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 mt-1">•</span>
                      <span><strong>Данные о посещениях:</strong> страницы сайта, время посещения, источник перехода, действия на сайте</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 mt-1">•</span>
                      <span><strong>Cookies и аналогичные технологии:</strong> для улучшения работы сайта и анализа поведения пользователей</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Purpose */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <Eye className="w-6 h-6 text-teal-600" />
              3. Цели обработки персональных данных
            </h2>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-700 leading-relaxed mb-4">
                Компания обрабатывает персональные данные в следующих целях:
              </p>
              <ul className="space-y-3 text-slate-700">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-teal-600 text-sm font-bold">1</span>
                  </div>
                  <span>Обработка запросов и обращений пользователей, предоставление консультаций по медицинскому оборудованию</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-teal-600 text-sm font-bold">2</span>
                  </div>
                  <span>Регистрация на обучающие мероприятия, конференции и семинары</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-teal-600 text-sm font-bold">3</span>
                  </div>
                  <span>Отправка информационных материалов, новостей и обновлений о продукции и услугах</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-teal-600 text-sm font-bold">4</span>
                  </div>
                  <span>Улучшение работы сайта, анализ статистики посещений и поведения пользователей</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-teal-600 text-sm font-bold">5</span>
                  </div>
                  <span>Соблюдение требований законодательства Российской Федерации</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-teal-600 text-sm font-bold">6</span>
                  </div>
                  <span>Защита прав и законных интересов Компании и пользователей</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Legal Basis */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">4. Правовые основания обработки</h2>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-700 leading-relaxed mb-4">
                Обработка персональных данных осуществляется на основании:
              </p>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных»</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Согласия субъекта персональных данных на обработку его персональных данных</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Договоров, стороной которых является субъект персональных данных</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Иных правовых оснований, предусмотренных законодательством РФ</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Processing Methods */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">5. Способы и сроки обработки</h2>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-700 leading-relaxed mb-4">
                Обработка персональных данных осуществляется с использованием средств автоматизации и без использования таких средств, 
                включая сбор, запись, систематизацию, накопление, хранение, уточнение, извлечение, использование, передачу, 
                обезличивание, блокирование, удаление, уничтожение персональных данных.
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                <strong>Срок хранения персональных данных:</strong> до достижения целей обработки или до отзыва согласия на обработку 
                персональных данных, если иное не предусмотрено законодательством РФ. После достижения целей обработки персональные 
                данные подлежат уничтожению или обезличиванию.
              </p>
            </div>
          </section>

          {/* Data Transfer */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">6. Передача персональных данных третьим лицам</h2>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-700 leading-relaxed mb-4">
                Компания не передает персональные данные третьим лицам, за исключением следующих случаев:
              </p>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Субъект персональных данных дал согласие на такие действия</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Передача предусмотрена законодательством РФ в рамках установленной процедуры</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>В целях исполнения договора, стороной которого является субъект персональных данных</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Для обеспечения работы сайта и предоставления услуг (хостинг-провайдеры, сервисы аналитики)</span>
                </li>
              </ul>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-slate-700">
                  <strong>Важно:</strong> При передаче данных третьим лицам Компания обеспечивает соблюдение требований 
                  законодательства о защите персональных данных и заключает соответствующие соглашения о конфиденциальности.
                </p>
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">7. Меры по защите персональных данных</h2>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-700 leading-relaxed mb-4">
                Компания принимает необходимые правовые, организационные и технические меры для защиты персональных данных от 
                неправомерного доступа, уничтожения, изменения, блокирования, копирования, предоставления, распространения, 
                а также от иных неправомерных действий:
              </p>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Использование современных средств защиты информации</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Ограничение доступа к персональным данным только уполномоченным сотрудникам</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Регулярное обновление систем безопасности</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Мониторинг и контроль за обработкой персональных данных</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Обучение сотрудников правилам работы с персональными данными</span>
                </li>
              </ul>
            </div>
          </section>

          {/* User Rights */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">8. Права субъектов персональных данных</h2>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-700 leading-relaxed mb-4">
                В соответствии с законодательством РФ, субъект персональных данных имеет право:
              </p>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Получать информацию, касающуюся обработки его персональных данных</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Требовать уточнения, блокирования или уничтожения персональных данных</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Отозвать согласие на обработку персональных данных</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Обжаловать действия или бездействие Компании в уполномоченный орган по защите прав субъектов персональных данных</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Получать информацию о сроках хранения персональных данных</span>
                </li>
              </ul>
              <div className="mt-6 p-4 bg-teal-50 rounded-lg border border-teal-200">
                <p className="text-sm text-slate-700 mb-2">
                  <strong>Для реализации своих прав</strong> вы можете направить запрос по адресу:
                </p>
                <div className="flex items-start gap-3 mt-3">
                  <Mail className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                  <a href="mailto:info@zenitmed.ru" className="text-teal-600 hover:underline font-medium">
                    info@zenitmed.ru
                  </a>
                </div>
                <div className="flex items-start gap-3 mt-2">
                  <Phone className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                  <a href="tel:+78127482213" className="text-teal-600 hover:underline font-medium">
                    +7 (812) 748-22-13
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Cookies */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">9. Использование файлов Cookie</h2>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-700 leading-relaxed mb-4">
                Сайт использует файлы Cookie и аналогичные технологии для улучшения работы сайта, анализа поведения пользователей 
                и персонализации контента. Используя Сайт, вы соглашаетесь с использованием файлов Cookie в соответствии с настоящей Политикой.
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                Вы можете настроить браузер для отказа от приема файлов Cookie, однако это может ограничить функциональность Сайта.
              </p>
            </div>
          </section>

          {/* Changes */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">10. Изменения в Политике конфиденциальности</h2>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-700 leading-relaxed mb-4">
                Компания оставляет за собой право вносить изменения в настоящую Политику конфиденциальности. 
                Актуальная версия всегда доступна на данной странице.
              </p>
              <p className="text-slate-700 leading-relaxed">
                При внесении существенных изменений Компания уведомит пользователей путем размещения уведомления на Сайте 
                или отправки уведомления на указанный адрес электронной почты.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">11. Контактная информация</h2>
            <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-blue-50">
              <CardContent className="p-6">
                <p className="text-slate-700 leading-relaxed mb-4">
                  По всем вопросам, связанным с обработкой персональных данных, вы можете обращаться:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-slate-600">Email</p>
                      <a href="mailto:info@zenitmed.ru" className="text-teal-600 hover:underline font-medium">
                        info@zenitmed.ru
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-slate-600">Телефон</p>
                      <a href="tel:+78127482213" className="text-teal-600 hover:underline font-medium">
                        +7 (812) 748-22-13
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-slate-600">Почтовый адрес</p>
                      <p className="text-slate-700 font-medium">
                        197348, г. Санкт-Петербург, Богатырский проспект, 22
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
