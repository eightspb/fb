import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { ConferencesList } from "@/components/ConferencesList";

export const metadata: Metadata = {
  title: "Конференции и мастер-классы по ВАБ | Компания Зенит",
  description: "Расписание конференций, семинаров и мастер-классов по вакуумной аспирационной биопсии молочной железы. Участие ведущих экспертов, обмен опытом, новые технологии Xishan.",
  keywords: "конференции маммология, мастер-классы ВАБ, семинары биопсия, обучение врачей, медицинские выставки, Xishan мероприятия",
  openGraph: {
    title: "Конференции и обучение ВАБ | Компания Зенит",
    description: "Присоединяйтесь к профессиональному сообществу. Анонсы предстоящих событий и архив прошедших мероприятий по интервенционной маммологии.",
    url: "/conferences",
    type: "website",
  },
};

export default function Conferences() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    'name': 'Конференции и мероприятия',
    'description': 'Список предстоящих и прошедших конференций по вакуумной биопсии и маммологии.',
    'provider': {
      '@type': 'Organization',
      'name': 'Компания Зенит',
      'url': 'https://fibroadenoma.net'
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
          <Breadcrumbs items={[{ label: "Конференции" }]} />
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mt-6 mb-4">
            Конференции и мастер-классы
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl">
            Присоединяйтесь к профессиональному сообществу. Анонсы предстоящих событий и архив прошедших мероприятий по интервенционной маммологии.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 md:px-6 py-12">
        <ConferencesList />
      </main>

      <Footer />
    </div>
  );
}
