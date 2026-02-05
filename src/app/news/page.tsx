import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { NewsList } from "@/components/NewsList";

export const metadata: Metadata = {
  title: "Новости",
  description: "Новости и события компании Зенит: конференции, выставки, обучение, новое оборудование, партнерство с заводом Сишань. Будьте в курсе последних событий.",
};

interface NewsPageProps {
  searchParams: Promise<{ year?: string; category?: string }>;
}

export default async function News({ searchParams }: NewsPageProps) {
  const params = await searchParams;
  const initialYear = params.year || undefined;
  const initialCategory = params.category || undefined;

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-teal-100 selection:text-teal-900">
      <Header />

      <div className="pt-24 pb-12 bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 md:px-6">
          <Breadcrumbs items={[{ label: "Новости" }]} />
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mt-6 mb-4">
            Новости и события
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl">
            Будьте в курсе последних обновлений компании, мероприятий и новинок оборудования.
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
