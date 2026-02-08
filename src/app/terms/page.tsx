import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { FileText, AlertCircle, Shield, CheckCircle, XCircle, Mail, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Условия использования | ООО «ЗЕНИТ»",
  description: "Условия использования сайта ООО «ЗЕНИТ». Правила использования сайта, интеллектуальная собственность, ограничение ответственности.",
  keywords: "условия использования, правила сайта, пользовательское соглашение, ООО Зенит",
  openGraph: {
    title: "Условия использования | ООО «ЗЕНИТ»",
    description: "Условия использования сайта и пользовательское соглашение",
    url: "/terms",
    type: "website",
  },
};

export default function TermsOfUse() {
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
          <Breadcrumbs items={[{ label: "Условия использования" }]} />
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mt-6 mb-4">
            Условия использования
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl">
            Пользовательское соглашение и правила использования сайта ООО «ЗЕНИТ».
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
                  <FileText className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Общие положения</h2>
                  <p className="text-slate-700 leading-relaxed mb-4">
                    Настоящие Условия использования (далее — «Условия») определяют правила использования веб-сайта 
                    <strong> fibroadenoma.net</strong> (далее — «Сайт»), принадлежащего ООО «ЗЕНИТ» (далее — «Компания», «Мы», «Нас»).
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    Используя Сайт, вы подтверждаете, что прочитали, поняли и согласны соблюдать настоящие Условия. 
                    Если вы не согласны с какими-либо положениями, пожалуйста, прекратите использование Сайта.
                  </p>
                  <p className="text-sm text-slate-600 mt-4">
                    <strong>Дата последнего обновления:</strong> {currentDate}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Definitions */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">1. Определения</h2>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <ul className="space-y-3 text-slate-700">
                <li>
                  <strong>Сайт</strong> — веб-сайт, расположенный по адресу fibroadenoma.net, включая все его поддомены и страницы.
                </li>
                <li>
                  <strong>Пользователь</strong> — любое физическое или юридическое лицо, использующее Сайт.
                </li>
                <li>
                  <strong>Контент</strong> — любая информация, размещенная на Сайте, включая тексты, изображения, видео, графику, логотипы и другие материалы.
                </li>
                <li>
                  <strong>Услуги</strong> — информационные и иные услуги, предоставляемые Компанией через Сайт.
                </li>
              </ul>
            </div>
          </section>

          {/* Acceptance */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">2. Принятие условий</h2>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-700 leading-relaxed mb-4">
                Используя Сайт, вы подтверждаете, что:
              </p>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                  <span>Вы достигли возраста 18 лет или используете Сайт с согласия родителей или законных представителей</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                  <span>Вы имеете право заключать соглашения от своего имени или от имени организации, которую вы представляете</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                  <span>Вы прочитали и согласны соблюдать настоящие Условия и Политику конфиденциальности</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                  <span>Вы будете использовать Сайт только в законных целях</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Use of Site */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">3. Использование Сайта</h2>
            <div className="space-y-4">
              <Card className="border-slate-200">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-teal-600" />
                    3.1. Разрешенное использование
                  </h3>
                  <p className="text-slate-700 leading-relaxed mb-3">
                    Вы можете использовать Сайт для:
                  </p>
                  <ul className="space-y-2 text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 mt-1">•</span>
                      <span>Ознакомления с информацией о медицинском оборудовании и услугах Компании</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 mt-1">•</span>
                      <span>Подачи заявок на консультацию, регистрации на мероприятия</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 mt-1">•</span>
                      <span>Связи с Компанией через формы обратной связи</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 mt-1">•</span>
                      <span>Получения информации о продукции, обучении и конференциях</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    3.2. Запрещенное использование
                  </h3>
                  <p className="text-slate-700 leading-relaxed mb-3">
                    Запрещается использовать Сайт для:
                  </p>
                  <ul className="space-y-2 text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      <span>Нарушения законов Российской Федерации или международного права</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      <span>Распространения вредоносного программного обеспечения, вирусов или спама</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      <span>Попыток несанкционированного доступа к системам Сайта или данным других пользователей</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      <span>Копирования, воспроизведения или распространения контента без письменного разрешения Компании</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      <span>Использования автоматизированных систем для сбора данных (скрапинг, боты) без разрешения</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-1">•</span>
                      <span>Любых действий, которые могут нарушить работу Сайта или причинить вред Компании или другим пользователям</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Intellectual Property */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <Shield className="w-6 h-6 text-teal-600" />
              4. Интеллектуальная собственность
            </h2>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-700 leading-relaxed mb-4">
                Весь контент Сайта, включая, но не ограничиваясь текстами, графикой, логотипами, изображениями, 
                видео, программным кодом и дизайном, является собственностью Компании или ее лицензиаров и защищен 
                законодательством об интеллектуальной собственности.
              </p>
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 mt-4">
                <p className="text-sm text-slate-700">
                  <strong>Важно:</strong> Использование контента Сайта без письменного разрешения Компании запрещено. 
                  Разрешается просмотр и печать отдельных страниц для личного некоммерческого использования при условии 
                  сохранения всех уведомлений об авторских правах.
                </p>
              </div>
            </div>
          </section>

          {/* User Content */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">5. Контент пользователей</h2>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-700 leading-relaxed mb-4">
                Отправляя информацию через формы обратной связи, заявки или иным способом, вы предоставляете Компании 
                неисключительное, безвозмездное право на использование, воспроизведение, распространение и публикацию 
                такой информации в целях обработки вашего запроса и улучшения услуг.
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                Вы гарантируете, что предоставленная информация:
              </p>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Является точной и актуальной</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Не нарушает права третьих лиц</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Не содержит незаконного, оскорбительного или вредоносного контента</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Не содержит конфиденциальной информации третьих лиц без их согласия</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Medical Information Disclaimer */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600" />
              6. Отказ от ответственности за медицинскую информацию
            </h2>
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-6">
                <p className="text-slate-700 leading-relaxed mb-4">
                  <strong>ВАЖНО:</strong> Информация, размещенная на Сайте, предназначена исключительно для информационных целей 
                  и не является медицинской консультацией, диагнозом или рекомендацией по лечению.
                </p>
                <p className="text-slate-700 leading-relaxed mb-4">
                  Компания не предоставляет медицинские услуги и не заменяет консультацию квалифицированного медицинского специалиста. 
                  Информация о медицинских процедурах, оборудовании и методах лечения представлена в ознакомительных целях.
                </p>
                <ul className="space-y-2 text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 mt-1">•</span>
                    <span>Все решения относительно медицинского лечения должны приниматься только после консультации с врачом</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 mt-1">•</span>
                    <span>Компания не несет ответственности за последствия использования информации с Сайта без консультации специалиста</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 mt-1">•</span>
                    <span>Характеристики и описания медицинского оборудования могут изменяться производителем без уведомления</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Limitation of Liability */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">7. Ограничение ответственности</h2>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-700 leading-relaxed mb-4">
                Компания прилагает все усилия для обеспечения точности и актуальности информации на Сайте, однако:
              </p>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Компания не гарантирует абсолютную точность, полноту или актуальность информации</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Сайт предоставляется «как есть» без каких-либо гарантий, явных или подразумеваемых</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Компания не несет ответственности за ущерб, возникший в результате использования или невозможности использования Сайта</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Компания не гарантирует бесперебойную работу Сайта и не несет ответственности за временные сбои</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Компания не несет ответственности за действия третьих лиц, включая ссылки на внешние сайты</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Links to Third Parties */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">8. Ссылки на сторонние сайты</h2>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-700 leading-relaxed mb-4">
                Сайт может содержать ссылки на сторонние веб-сайты. Компания не контролирует и не несет ответственности 
                за содержание, политику конфиденциальности или практику таких сайтов.
              </p>
              <p className="text-slate-700 leading-relaxed">
                Размещение ссылок не означает одобрения или рекомендации Компанией этих сайтов. 
                Использование сторонних сайтов осуществляется на ваш собственный риск.
              </p>
            </div>
          </section>

          {/* Modifications */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">9. Изменения Сайта и Условий</h2>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-700 leading-relaxed mb-4">
                Компания оставляет за собой право:
              </p>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Изменять, обновлять или удалять любой контент Сайта в любое время без предварительного уведомления</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Временно или постоянно прекращать работу Сайта или его частей</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>Вносить изменения в настоящие Условия использования</span>
                </li>
              </ul>
              <p className="text-slate-700 leading-relaxed mt-4">
                Продолжение использования Сайта после внесения изменений означает ваше согласие с новыми условиями. 
                Рекомендуется периодически просматривать настоящие Условия.
              </p>
            </div>
          </section>

          {/* Termination */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">10. Прекращение доступа</h2>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-700 leading-relaxed mb-4">
                Компания оставляет за собой право в любое время и без предварительного уведомления ограничить или прекратить 
                доступ к Сайту любому пользователю, который нарушает настоящие Условия или действующее законодательство.
              </p>
            </div>
          </section>

          {/* Applicable Law */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">11. Применимое право</h2>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-700 leading-relaxed">
                Настоящие Условия использования регулируются и толкуются в соответствии с законодательством Российской Федерации. 
                Все споры подлежат разрешению в судах по месту нахождения Компании.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">12. Контактная информация</h2>
            <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-blue-50">
              <CardContent className="p-6">
                <p className="text-slate-700 leading-relaxed mb-4">
                  По всем вопросам, связанным с использованием Сайта или настоящими Условиями, вы можете обращаться:
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

          {/* Final Notice */}
          <Card className="mb-8 border-slate-300 bg-slate-100">
            <CardContent className="p-6">
              <p className="text-slate-700 text-center leading-relaxed">
                Используя Сайт, вы подтверждаете, что прочитали, поняли и согласны соблюдать все положения настоящих Условий использования.
              </p>
            </CardContent>
          </Card>

        </div>
      </main>

      <Footer />
    </div>
  );
}
