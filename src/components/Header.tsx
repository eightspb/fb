import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="header">
      <div className="header-container header-nav">
        <div className="header-logo">FB.NET</div>
        <nav className="header-menu">
          <Link href="/" className="header-menu-link">Главная</Link>
          <Link href="/patients" className="header-menu-link">Пациентам</Link>
          <Link href="/equipment" className="header-menu-link">Оборудование</Link>
          <Link href="/training" className="header-menu-link">Обучение</Link>
          <Link href="/news" className="header-menu-link">Новости</Link>
          <Link href="/conferences" className="header-menu-link">Конференции</Link>
          <Link href="/contacts" className="header-menu-link">Контакты</Link>
        </nav>
        <div className="header-mobile-menu">
          <Button className="header-mobile-button">Меню</Button>
        </div>
      </div>
    </header>
  );
}
