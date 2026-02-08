'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, MapPin } from 'lucide-react';
import { NewsItem } from '@/lib/news-data';

export function LatestNewsSection() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNews() {
      try {
        const response = await fetch('/api/news');
        if (response.ok) {
          const data: NewsItem[] = await response.json();
          // Берем последние 3 новости
          const latest = data.slice(0, 3);
          setNews(latest);
        }
      } catch (error) {
        console.error('Failed to load news:', error);
      } finally {
        setLoading(false);
      }
    }
    loadNews();
  }, []);

  if (loading) {
    return (
      <section className="w-full py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center">Загрузка новостей...</div>
        </div>
      </section>
    );
  }

  if (news.length === 0) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    try {
      // Пробуем разные форматы даты
      if (dateStr.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
        const [day, month, year] = dateStr.split('.');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      if (dateStr.match(/^\d{2}\.\d{4}$/)) {
        const [month, year] = dateStr.split('.');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="w-full py-24 bg-gradient-to-b from-white to-slate-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Последние новости
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl">
              Будьте в курсе событий компании, новых технологий и мероприятий
            </p>
          </div>
          <Button variant="outline" className="hidden md:flex" asChild>
            <Link href="/news">
              Все новости
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {news.map((item) => (
            <Link key={item.id} href={`/news/${encodeURIComponent(item.id)}`}>
              <Card className="h-full hover:shadow-lg transition-all duration-300 border-slate-200 group cursor-pointer">
                <div className="relative aspect-video overflow-hidden rounded-t-lg">
                  {item.images && item.images.length > 0 ? (
                    <Image
                      src={item.images[0]}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-teal-100 to-blue-100 flex items-center justify-center">
                      <Calendar className="w-12 h-12 text-teal-400" />
                    </div>
                  )}
                  {item.category && (
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-slate-700">
                        {item.category}
                      </span>
                    </div>
                  )}
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(item.date)}</span>
                    {item.location && (
                      <>
                        <span className="mx-1">•</span>
                        <MapPin className="w-4 h-4" />
                        <span>{item.location}</span>
                      </>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-teal-600 transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-slate-600 line-clamp-3 mb-4">
                    {item.shortDescription || item.fullDescription?.substring(0, 150)}
                  </p>
                  <div className="flex items-center text-teal-600 font-medium text-sm group-hover:gap-2 transition-all">
                    Читать далее
                    <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Button variant="outline" asChild>
            <Link href="/news">
              Все новости
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
