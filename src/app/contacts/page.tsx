import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { ContactForm } from "@/components/ContactForm";
import { Phone, Mail, MapPin, Building2, ExternalLink, Shield, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Контакты",
  description: "Свяжитесь с нами: ООО «ЗЕНИТ» - официальный дистрибьютор ВАБ завода Сишань в РФ. Телефон, email, форма обратной связи.",
};

export default function Contacts() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-pink-100 selection:text-pink-900">
      <Header />

      <div className="pt-24 pb-12 bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 md:px-6">
          <Breadcrumbs items={[{ label: "Контакты" }]} />
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mt-6 mb-4">
            Свяжитесь с нами
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl">
            Мы всегда открыты для сотрудничества. Ответим на любые вопросы о продукции и партнерстве.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 md:px-6 py-12">

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24">
          {/* Contact Info */}
          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Контактная информация</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-6 flex flex-col items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium mb-1">Телефон</p>
                      <a href="tel:+78127482213" className="text-lg font-semibold text-slate-900 hover:text-pink-600 transition-colors">
                        +7 (812) 748-22-13
                      </a>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-6 flex flex-col items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-pink-600">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium mb-1">Email</p>
                      <a href="mailto:info@zenitmed.ru" className="text-lg font-semibold text-slate-900 hover:text-pink-600 transition-colors">
                        info@zenitmed.ru
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card className="mt-4 border-slate-200 shadow-sm bg-slate-50">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium mb-1">Центральный офис</p>
                    <p className="font-semibold text-slate-900 mb-1">ООО «ЗЕНИТ»</p>
                    <p className="text-slate-600 text-sm mb-2">Официальный дистрибьютор завода Xishan в РФ</p>
                    <p className="text-slate-600 text-sm">Санкт-Петербург, Богатырский проспект, 22</p>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section>
               <h2 className="text-2xl font-bold text-slate-900 mb-6">Документы</h2>
               <div className="grid sm:grid-cols-2 gap-4">
                 <a href="#" className="flex items-center p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 transition-all group">
                   <Shield className="w-5 h-5 text-slate-400 mr-3 group-hover:text-slate-600" />
                   <span className="text-sm font-medium text-slate-700">Политика конфиденциальности</span>
                 </a>
                 <a href="#" className="flex items-center p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 transition-all group">
                   <FileText className="w-5 h-5 text-slate-400 mr-3 group-hover:text-slate-600" />
                   <span className="text-sm font-medium text-slate-700">Реквизиты компании</span>
                 </a>
               </div>
            </section>
          </div>

          {/* Form */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 h-fit lg:sticky lg:top-24">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Напишите нам</h2>
              <p className="text-slate-600">
                Оставьте заявку, и мы свяжемся с вами в течение рабочего дня.
              </p>
            </div>
            <ContactForm />
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
