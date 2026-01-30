import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { ConferencesList } from "@/components/ConferencesList";

export const metadata: Metadata = {
  title: "Конференции",
  description: "Анонсы и архив конференций, мастер-классов и мероприятий по вакуумной аспирационной биопсии. Участие ведущих специалистов, обмен опытом, новые технологии.",
};

export default function Conferences() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-teal-100 selection:text-teal-900">
      <Header />

      <div className="pt-24 pb-12 bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 md:px-6">
          <Breadcrumbs items={[{ label: "Конференции" }]} />
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mt-6 mb-4">
            Мероприятия
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl">
            Присоединяйтесь к профессиональному сообществу. Анонсы предстоящих событий и архив прошедших мероприятий.
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
