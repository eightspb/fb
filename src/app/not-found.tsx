import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 md:px-6 pt-48 md:pt-52 pb-24">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Страница не найдена</h2>
            <p className="text-gray-600 mb-8">
              Извините, запрашиваемая страница не существует или была перемещена.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link href="/">Вернуться на главную</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/contacts">Связаться с нами</Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
