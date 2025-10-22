import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="page-container">
        <div className="page-max-width text-center">
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
