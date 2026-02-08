import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { NewsList } from "@/components/NewsList";

export const metadata: Metadata = {
  title: "Новости компании Зенит | ВАБ Xishan",
  description: "Актуальные новости о вакуумной биопсии, новинки оборудования Xishan, отчеты с выставок и конференций. Будьте в курсе событий в мире интервенционной маммологии.",
  keywords: "новости медицины, маммология новости, Xishan оборудование, выставки здравоохранение, компания Зенит новости",
  openGraph: {
    title: "Новости и события | Компания Зенит",
    description: "Последние новости компании, анонсы мероприятий и обзоры нового оборудования для ВАБ.",
    url: "/news",
    type: "website",
  },
};

interface NewsPageProps {
  searchParams: Promise<{ year?: string; category?: string }>;
}

export default async function News({ searchParams }: NewsPageProps) {
  const params = await searchParams;
  const initialYear = params.year || undefined;
  const initialCategory = params.category || undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    'name': 'Новости компании',
    'description': 'Лента новостей и событий компании Зенит - дистрибьютора медицинского оборудования.',
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
          <Breadcrumbs items={[{ label: "Новости" }]} />
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mt-6 mb-4">
            Новости и события
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl">
            Будьте в курсе последних обновлений компании, мероприятий и новинок оборудования для вакуумной биопсии.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 md:px-6 py-12">
        <NewsList initialYear={initialYear} initialCategory={initialCategory} />
      </main>

      <Footer />
    </div>
  );
}
