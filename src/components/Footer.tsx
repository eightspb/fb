import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer animated-bg">
      <div className="footer-container">
        <div className="footer-grid">
          <div>
            <h4 className="footer-title gradient-text-pink">О компании</h4>
            <p>ООО «ЗЕНИТ»</p>
            <p className="text-sm mt-2">Официальный дистрибьютор ВАБ завода Сишань в РФ</p>
          </div>
          <div>
            <h4 className="footer-title gradient-text-blue">Контакты</h4>
            <p>Тел: <a href="tel:+78127482213" className="hover:gradient-text-blue transition-colors">+7 (812) 748-22-13</a></p>
            <p>Email: <a href="mailto:info@zenitmed.ru" className="hover:gradient-text-blue transition-colors">info@zenitmed.ru</a></p>
            <p className="text-sm mt-2"><a href="https://zenitmed.ru" target="_blank" rel="noopener noreferrer" className="hover:gradient-text-blue transition-colors">zenitmed.ru</a></p>
          </div>
          <div>
            <h4 className="footer-title gradient-text-pink">Ссылки</h4>
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
            <h4 className="footer-title gradient-text-blue">Социальные сети</h4>
            <div className="flex gap-4 mt-4">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-pink-600 rounded-full flex items-center justify-center hover:shadow-lg transition-shadow cursor-pointer">
                <span className="text-white text-sm">📘</span>
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center hover:shadow-lg transition-shadow cursor-pointer">
                <span className="text-white text-sm">🐦</span>
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full flex items-center justify-center hover:shadow-lg transition-shadow cursor-pointer">
                <span className="text-white text-sm">💼</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
