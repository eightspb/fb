import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/Header';
import { getNewsById, newsData } from '@/lib/news-data';

interface NewsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return newsData.map((news) => ({
    id: news.id,
  }));
}

export default async function NewsPage({ params }: NewsPageProps) {
  const { id } = await params;
  const news = getNewsById(id);

  if (!news) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <Link href="/" className="text-blue-600 hover:text-blue-800">Главная</Link>
            <span className="mx-2">/</span>
            <Link href="/news" className="text-blue-600 hover:text-blue-800">Новости</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-600">{news.title}</span>
          </nav>

          {/* News Header */}
          <header className="mb-8">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge>{news.year}</Badge>
              {news.category && <Badge variant="outline">{news.category}</Badge>}
              {news.tags?.map(tag => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
            <h1 className="text-4xl font-bold mb-4">{news.title}</h1>
            <div className="flex flex-wrap gap-4 text-gray-600 mb-6">
              <span>📅 {news.date}</span>
              {news.location && <span>📍 {news.location}</span>}
              {news.author && <span>✍️ {news.author}</span>}
            </div>
          </header>

          {/* Main Content */}
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="prose prose-lg max-w-none">
                {news.fullDescription.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Images Gallery */}
          {news.images && news.images.length > 0 && (
            <Card className="mb-8">
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-6">Фотографии</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {news.images.map((image, index) => (
                    <div key={index} className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={image}
                        alt={`${news.title} - фото ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Videos */}
          {news.videos && news.videos.length > 0 && (
            <Card className="mb-8">
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-6">Видео</h2>
                <div className="space-y-4">
                  {news.videos.map((video, index) => (
                    <div key={index} className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                      <video
                        controls
                        className="w-full h-full object-cover"
                        poster="/images/video-poster.jpg"
                      >
                        <source src={video} type="video/mp4" />
                        Ваш браузер не поддерживает видео.
                      </video>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          {news.documents && news.documents.length > 0 && (
            <Card className="mb-8">
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-6">Документы</h2>
                <div className="space-y-2">
                  {news.documents.map((doc, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                      <span className="text-2xl">📄</span>
                      <div className="flex-1">
                        <p className="font-medium">Документ {index + 1}</p>
                        <p className="text-sm text-gray-600">{doc.split('/').pop()}</p>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <a href={doc} target="_blank" rel="noopener noreferrer">
                          Скачать
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center pt-8 border-t">
            <Button variant="outline" asChild>
              <Link href="/news">← Все новости</Link>
            </Button>
            <Button asChild>
              <Link href="/contacts">Связаться с нами</Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold mb-4">О компании</h4>
              <p>Единственный официальный дистрибьютор ВАБ завода Сишань в РФ</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Контакты</h4>
              <p>Тел: +7 (495) 123-45-67</p>
              <p>Email: info@fb.net</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Ссылки</h4>
              <ul className="space-y-2">
                <li><Link href="/" className="hover:text-blue-400">Главная</Link></li>
                <li><Link href="/equipment" className="hover:text-blue-400">Оборудование</Link></li>
                <li><Link href="/training" className="hover:text-blue-400">Обучение</Link></li>
                <li><Link href="/news" className="hover:text-blue-400">Новости</Link></li>
                <li><Link href="/conferences" className="hover:text-blue-400">Конференции</Link></li>
                <li><Link href="/contacts" className="hover:text-blue-400">Контакты</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Социальные сети</h4>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export async function generateMetadata({ params }: NewsPageProps) {
  const { id } = await params;
  const news = getNewsById(id);

  if (!news) {
    return {
      title: 'Новость не найдена',
    };
  }

  return {
    title: `${news.title} | FB.NET`,
    description: news.shortDescription,
    openGraph: {
      title: news.title,
      description: news.shortDescription,
      images: news.images,
    },
  };
}
