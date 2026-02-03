import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { NewsGallery } from '@/components/NewsGallery';
import { NewsViewTracker } from '@/components/NewsViewTracker';
import { Calendar, MapPin, PenTool, Download, ChevronLeft, MessageSquare } from 'lucide-react';

interface NewsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/news`, {
      next: { revalidate: 3600 } // Revalidate every hour
    });
    
    if (response.ok) {
      const news = await response.json();
      if (news && news.length > 0) {
        return news.map((item: { id: string }) => ({
          id: item.id,
        }));
      }
    }
  } catch (error) {
    console.error('Error generating static params:', error);
  }
  
  // Возвращаем пустой массив если БД недоступна
  return [];
}

export default async function NewsPage({ params }: NewsPageProps) {
  const { id } = await params;
  
  const decodedId = decodeURIComponent(id);
  console.log(`[PAGE] Поиск новости: оригинальный ID="${id}", декодированный ID="${decodedId}"`);
  
  let news = null;
  try {
    if (process.env.DATABASE_URL) {
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      
      const client = await pool.connect();
      try {
        // Показываем только опубликованные новости (status = 'published' или NULL для обратной совместимости)
        const query = `
          SELECT 
            n.*,
            COALESCE(
              (SELECT json_agg(jsonb_build_object(
                'id', id,
                'image_url', image_url, 
                'order', "order",
                'has_data', (image_data IS NOT NULL)
              )) 
               FROM news_images WHERE news_id = n.id),
              '[]'::json
            ) as images,
            COALESCE(
              (SELECT json_agg(jsonb_build_object('tag', tag)) 
               FROM news_tags WHERE news_id = n.id),
              '[]'::json
            ) as tags,
            COALESCE(
              (SELECT json_agg(jsonb_build_object('video_url', video_url, 'order', "order")) 
               FROM news_videos WHERE news_id = n.id),
              '[]'::json
            ) as videos,
            COALESCE(
              (SELECT json_agg(jsonb_build_object('document_url', document_url, 'order', "order")) 
               FROM news_documents WHERE news_id = n.id),
              '[]'::json
            ) as documents
          FROM news n
          WHERE (n.id = $1 OR n.id = $2)
          AND (n.status = 'published' OR n.status IS NULL)
        `;
        
        const result = await client.query(query, [id, decodedId]);
        
        if (result.rows.length > 0) {
          const row = result.rows[0];
          
          const parseJsonArray = (value: any): any[] => {
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') {
              try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            }
            return [];
          };

          const images = parseJsonArray(row.images);
          const tags = parseJsonArray(row.tags);
          const videos = parseJsonArray(row.videos);
          const documents = parseJsonArray(row.documents);

          news = {
            id: row.id,
            title: row.title,
            shortDescription: row.short_description,
            fullDescription: row.full_description,
            date: row.date,
            year: row.year,
            category: row.category || undefined,
            location: row.location || undefined,
            author: row.author || undefined,
            // Используем только изображения из БД
            images: images
              .filter((img: any) => img.has_data) // Только изображения из БД
              .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
              .map((img: any) => `/api/images/${img.id}`),
            videos: videos.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)).map((vid: any) => vid.video_url),
            documents: documents.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)).map((doc: any) => doc.document_url),
            tags: tags.map((tag: any) => tag.tag),
          };
        }
      } finally {
        client.release();
        await pool.end();
      }
    } else {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/news/${encodeURIComponent(decodedId)}`, {
        cache: 'no-store'
      });
      
      if (response.ok) {
        news = await response.json();
      }
    }
  } catch (error) {
    console.error('Error loading news from database:', error);
  }

  if (!news) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-teal-100 selection:text-teal-900">
      <Header />

      <div className="pt-24 pb-8 bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
           <Breadcrumbs items={[
              { label: "Новости", href: "/news" },
              { label: news.title }
            ]} />
        </div>
      </div>

      <main className="container mx-auto px-4 md:px-6 py-12 max-w-4xl">
          
          {/* News Header */}
          <header className="mb-10">
            <div className="flex flex-wrap gap-2 mb-6">
              <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-sm py-1">{news.year}</Badge>
              {news.category && (
                <Link href={`/news?category=${encodeURIComponent(news.category)}`}>
                  <Badge className="cursor-pointer bg-blue-50 text-blue-700 hover:bg-blue-100 border-0 text-sm py-1 transition-colors">
                    {news.category}
                  </Badge>
                </Link>
              )}
              {/* REMOVED: Tags are no longer displayed to reduce clutter and stick to main categories only */}
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
              {news.title}
            </h1>

            <div className="flex flex-wrap gap-6 text-slate-500 text-sm border-y border-slate-100 py-4">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" /> {news.date}
              </span>
              {news.location && (
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> {news.location}
                </span>
              )}
              {news.author && (
                <span className="flex items-center gap-2">
                  <PenTool className="w-4 h-4" /> {news.author}
                </span>
              )}
              <NewsViewTracker newsId={news.id} />
            </div>
          </header>

          {/* Main Content */}
          <div className="prose prose-lg prose-slate max-w-none mb-12">
            {news.fullDescription.split('\n\n').map((paragraph: string, index: number) => (
              <p key={index} className="text-slate-700 leading-relaxed mb-6">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Images Gallery */}
          {news.images && news.images.length > 0 && (
            <NewsGallery images={news.images} title={news.title} />
          )}

          {/* Videos */}
          {news.videos && news.videos.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Видео</h2>
              <div className="space-y-6">
                {news.videos.map((video: string, index: number) => (
                  <div key={index} className="aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                    <video
                      controls
                      className="w-full h-full object-cover"
                    >
                      <source src={video} type="video/mp4" />
                      Ваш браузер не поддерживает видео.
                    </video>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Documents */}
          {news.documents && news.documents.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Документы</h2>
              <div className="grid gap-4">
                {news.documents.map((doc: string, index: number) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      <Download className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">Документ {index + 1}</p>
                      <p className="text-sm text-slate-500 truncate">{doc.split('/').pop()}</p>
                    </div>
                    <Button variant="outline" size="sm" asChild className="shrink-0">
                      <a href={doc} target="_blank" rel="noopener noreferrer">
                        Скачать
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t border-slate-200">
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/news" className="gap-2">
                <ChevronLeft className="w-4 h-4" /> Все новости
              </Link>
            </Button>
            <Button asChild className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white">
              <Link href="/contacts" className="gap-2">
                <MessageSquare className="w-4 h-4" /> Задать вопрос
              </Link>
            </Button>
          </div>
      </main>

      <Footer />
    </div>
  );
}

export async function generateMetadata({ params }: NewsPageProps): Promise<import('next').Metadata> {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  
  let news = null;
  try {
    if (process.env.DATABASE_URL) {
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      
      const client = await pool.connect();
      try {
        // Показываем только опубликованные новости
        const query = `
          SELECT 
            n.*,
            COALESCE(
              (SELECT json_agg(jsonb_build_object(
                'id', id,
                'image_url', image_url, 
                'order', "order",
                'has_data', (image_data IS NOT NULL)
              )) 
               FROM news_images WHERE news_id = n.id),
              '[]'::json
            ) as images,
            COALESCE(
              (SELECT json_agg(jsonb_build_object('tag', tag)) 
               FROM news_tags WHERE news_id = n.id),
              '[]'::json
            ) as tags,
            COALESCE(
              (SELECT json_agg(jsonb_build_object('video_url', video_url, 'order', "order")) 
               FROM news_videos WHERE news_id = n.id),
              '[]'::json
            ) as videos,
            COALESCE(
              (SELECT json_agg(jsonb_build_object('document_url', document_url, 'order', "order")) 
               FROM news_documents WHERE news_id = n.id),
              '[]'::json
            ) as documents
          FROM news n
          WHERE (n.id = $1 OR n.id = $2)
          AND (n.status = 'published' OR n.status IS NULL)
        `;
        
        const result = await client.query(query, [id, decodedId]);
        
        if (result.rows.length > 0) {
          const row = result.rows[0];
          
          const parseJsonArray = (value: any): any[] => {
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') {
              try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            }
            return [];
          };

          const images = parseJsonArray(row.images);

          news = {
            id: row.id,
            title: row.title,
            shortDescription: row.short_description,
            fullDescription: row.full_description,
            date: row.date,
            year: row.year,
            category: row.category || undefined,
            location: row.location || undefined,
            author: row.author || undefined,
            // Используем только изображения из БД (has_data = true)
            // Изображения без данных в БД пропускаются - они должны быть загружены через миграцию
            images: images
              .filter((img: any) => img.has_data) // Только изображения из БД
              .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
              .map((img: any) => `/api/images/${img.id}`),
            videos: parseJsonArray(row.videos).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)).map((vid: any) => vid.video_url),
            documents: parseJsonArray(row.documents).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)).map((doc: any) => doc.document_url),
            tags: parseJsonArray(row.tags).map((tag: any) => tag.tag),
          };
        }
      } finally {
        client.release();
        await pool.end();
      }
    } else {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/news/${encodeURIComponent(decodedId)}`, {
        cache: 'no-store'
      });
      
      if (response.ok) {
        news = await response.json();
      }
    }
  } catch (error) {
    console.error('Error loading news for metadata:', error);
  }

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
      type: 'article',
      publishedTime: news.date,
      authors: news.author ? [news.author] : undefined,
      locale: 'ru_RU',
    },
    twitter: {
      card: 'summary_large_image',
      title: news.title,
      description: news.shortDescription,
      images: news.images,
    },
  };
}
