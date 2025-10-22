import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { newsData, getNewsByYear, getAllYears } from "@/lib/news-data";

export default function News() {
  const years = getAllYears();

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="page-container">
        <div className="page-max-width-wide">
          <Breadcrumbs items={[{ label: "Новости" }]} />

          <h1 className="page-title">Новости</h1>

          <div className="news-grid">
            {/* Main Content */}
            <div className="news-main">
              <div className="news-year-section">
                {years.map(year => {
                  const yearNews = getNewsByYear(year);
                  return (
                    <div key={year} id={year}>
                      <h2 className="news-year-header">{year} год</h2>
                      <div className="news-card">
                        {yearNews.map((news) => (
                          <Card key={news.id} className="card-hover">
                            <CardContent className="card-content">
                              <div className="flex flex-wrap gap-2 mb-4">
                                <Badge>{news.year}</Badge>
                                {news.category && <Badge variant="outline">{news.category}</Badge>}
                                {news.tags?.slice(0, 2).map(tag => (
                                  <Badge key={tag} variant="secondary">{tag}</Badge>
                                ))}
                              </div>
                              <Link href={`/news/${news.id}`}>
                                <h3 className="news-card-title">
                                  {news.title}
                                </h3>
                              </Link>
                              <p className="text-gray-600 mb-4">{news.shortDescription}</p>
                              <div className="news-card-meta">
                                <span>📅 {news.date}</span>
                                {news.location && <span>📍 {news.location}</span>}
                              </div>
                              <div className="news-card-actions">
                                <Button size="sm" variant="outline" asChild>
                                  <Link href={`/news/${news.id}`}>Подробнее</Link>
                                </Button>
                                {news.images && news.images.length > 0 && (
                                  <span className="text-sm text-gray-500">📸 {news.images.length} фото</span>
                                )}
                                {news.videos && news.videos.length > 0 && (
                                  <span className="text-sm text-gray-500">🎥 видео</span>
                                )}
                                {news.documents && news.documents.length > 0 && (
                                  <span className="text-sm text-gray-500">📄 документы</span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sidebar */}
            <div className="news-sidebar">
              <Card className="sidebar-card">
                <CardContent className="card-content">
                  <h3 className="sidebar-title">Архив новостей</h3>
                  <div className="sidebar-archive">
                    {years.map(year => {
                      const yearNews = getNewsByYear(year);
                      return (
                        <div key={year}>
                          <Link
                            href={`#${year}`}
                            className="sidebar-archive-link"
                          >
                            <div className="sidebar-archive-year">{year} год</div>
                            <div className="sidebar-archive-count">{yearNews.length} новостей</div>
                          </Link>
                        </div>
                      );
                    })}
                  </div>

                  <div className="sidebar-categories">
                    <h4 className="sidebar-categories-title">Категории</h4>
                    <div className="sidebar-categories-list">
                      <div className="sidebar-categories-item">
                        <span>Контракты</span>
                        <span className="text-gray-600">1</span>
                      </div>
                      <div className="sidebar-categories-item">
                        <span>Выставки</span>
                        <span className="text-gray-600">5</span>
                      </div>
                      <div className="sidebar-categories-item">
                        <span>Конференции</span>
                        <span className="text-gray-600">2</span>
                      </div>
                      <div className="sidebar-categories-item">
                        <span>Обучение</span>
                        <span className="text-gray-600">3</span>
                      </div>
                      <div className="sidebar-categories-item">
                        <span>Оборудование</span>
                        <span className="text-gray-600">2</span>
                      </div>
                    </div>
                  </div>

                  <div className="sidebar-subscribe">
                    <h4 className="sidebar-subscribe-title">Подписаться на новости</h4>
                    <p className="sidebar-subscribe-text">
                      Будьте в курсе последних новостей и обновлений
                    </p>
                    <Button size="sm" className="w-full" asChild>
                      <Link href="/contacts">Связаться</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
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
                <li><Link href="/equipment" className="footer-link">Оборудование</Link></li>
                <li><Link href="/training" className="footer-link">Обучение</Link></li>
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
