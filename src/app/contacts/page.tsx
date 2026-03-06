import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { ContactForm } from "@/components/ContactForm";
import { Phone, Mail, Shield, FileText, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Контакты ООО «ЗЕНИТ» | Дистрибьютор Xishan в РФ",
  description: "Свяжитесь с нами: официальный дистрибьютор систем ВАБ Xishan. Адрес: Санкт-Петербург, Богатырский пр., 22. Телефон: +7 (812) 748-22-13. Email: info@zenitmed.ru.",
  keywords: "контакты Зенит, купить ВАБ, офис Xishan Россия, телефон Зенит мед, адрес компании Зенит",
  openGraph: {
    title: "Контакты ООО «ЗЕНИТ» | Официальный дистрибьютор Xishan",
    description: "Контактная информация, адрес офиса, реквизиты и форма обратной связи.",
    url: "/contacts",
    type: "website",
  },
};

export default function Contacts() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MedicalOrganization',
    'name': 'ООО «ЗЕНИТ»',
    'description': 'Официальный дистрибьютор завода Xishan в РФ',
    'url': 'https://fibroadenoma.net/contacts',
    'logo': 'https://fibroadenoma.net/images/logo.png',
    'contactPoint': {
      '@type': 'ContactPoint',
      'telephone': '+7-812-748-22-13',
      'contactType': 'sales',
      'email': 'info@zenitmed.ru',
      'areaServed': 'RU',
      'availableLanguage': 'Russian'
    },
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': 'Богатырский проспект, 22',
      'addressLocality': 'Санкт-Петербург',
      'postalCode': '197348',
      'addressCountry': 'RU'
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-teal-100 selection:text-teal-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />

      <div className="pt-24 pb-12 bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 md:px-6">
          <Breadcrumbs items={[{ label: "Контакты" }]} />
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mt-6 mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#34D399] to-[#1E3A8A]">Свяжитесь с</span> нами
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl">
            Мы всегда открыты для сотрудничества. Ответим на любые вопросы о продукции, обучении и партнерстве.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 md:px-6 py-12">

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24">
          {/* Contact Info */}
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Контактная информация</h2>
              <div className="space-y-3">
                <a href="tel:+78127482213" className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/50 transition-all group">
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:bg-blue-100 transition-colors">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Телефон</p>
                    <p className="text-base font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">+7 (812) 748-22-13</p>
                  </div>
                </a>

                <a href="mailto:info@zenitmed.ru" className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/50 transition-all group">
                  <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 shrink-0 group-hover:bg-teal-100 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Email</p>
                    <p className="text-base font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">info@zenitmed.ru</p>
                  </div>
                </a>

                <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/80">
                  <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-0.5">Центральный офис</p>
                    <p className="font-semibold text-slate-900 text-sm">ООО «ЗЕНИТ»</p>
                    <p className="text-slate-500 text-xs mt-0.5">197348, г. Санкт-Петербург, Богатырский проспект, 22</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Form */}
          <div className="h-fit lg:sticky lg:top-24">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Напишите нам</h2>
              <p className="text-slate-600">
                Оставьте заявку, и мы свяжемся с вами в течение рабочего дня.
              </p>
            </div>
            <ContactForm />
          </div>
        </div>

        {/* Документы */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Документы</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/privacy" className="flex items-center p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 transition-all group">
              <Shield className="w-5 h-5 text-slate-400 mr-3 group-hover:text-slate-600 shrink-0" />
              <span className="text-sm font-medium text-slate-700">Политика конфиденциальности</span>
            </Link>
            <Link href="/terms" className="flex items-center p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 transition-all group">
              <FileText className="w-5 h-5 text-slate-400 mr-3 group-hover:text-slate-600 shrink-0" />
              <span className="text-sm font-medium text-slate-700">Условия использования</span>
            </Link>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
