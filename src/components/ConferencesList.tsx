'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Clock, ArrowRight } from "lucide-react";

interface Speaker {
  id: string;
  name: string;
  photo: string;
  credentials: string;
  report_title: string;
  report_time: string;
}

interface Conference {
  id: string;
  slug?: string;
  title: string;
  date: string;
  date_end?: string;
  description: string;
  type: string;
  location: string | null;
  speaker: string | null;
  cme_hours: number | null;
  program: string[];
  materials: string[];
  status: string;
  cover_image?: string;
  speakers?: Speaker[];
  organizer_contacts?: any;
  additional_info?: string;
}

interface NewsItem {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  date: string;
  year: string;
  images?: string[];
  category?: string;
  status?: string;
}

export function ConferencesList() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [pastNews, setPastNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Загружаем предстоящие конференции из таблицы conferences
        const confResponse = await fetch('/api/conferences?status=published');
        if (confResponse.ok) {
          const confData = await confResponse.json();
          setConferences(confData);
        }

        // Загружаем прошедшие конференции из таблицы news
        const newsResponse = await fetch('/api/news?category=Конференции');
        if (newsResponse.ok) {
          const newsData = await newsResponse.json();
          setPastNews(newsData);
        }
      } catch (error) {
        console.error('Failed to load conferences:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const parseDate = (dateStr: string) => {
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(dateStr);
    }
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date();
  };

  const formatDateRange = (start: string, end?: string) => {
    const startDate = parseDate(start);
    const day = startDate.getDate();
    const month = startDate.toLocaleString('ru-RU', { month: 'short' });
    const year = startDate.getFullYear();
    
    if (end) {
      const endDate = parseDate(end);
      const endDay = endDate.getDate();
      const endMonth = endDate.toLocaleString('ru-RU', { month: 'short' });
      const endYear = endDate.getFullYear();
      
      if (year === endYear && month === endMonth) {
        return `${day}-${endDay} ${month} ${year}`;
      } else if (year === endYear) {
        return `${day} ${month} - ${endDay} ${endMonth} ${year}`;
      } else {
        return `${day} ${month} ${year} - ${endDay} ${endMonth} ${endYear}`;
      }
    }
    
    return `${day} ${month} ${year}`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcoming = conferences.filter(c => {
    const endDate = c.date_end ? parseDate(c.date_end) : parseDate(c.date);
    endDate.setHours(0, 0, 0, 0);
    return endDate >= today;
  }).sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

  const past = conferences.filter(c => {
    const endDate = c.date_end ? parseDate(c.date_end) : parseDate(c.date);
    endDate.setHours(0, 0, 0, 0);
    return endDate < today;
  }).sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

  if (loading) {
    return <div className="text-center py-12">Загрузка мероприятий...</div>;
  }

  // Широкий тизер для предстоящих конференций
  const renderUpcomingTeaser = (event: Conference) => {
    const speakersCount = event.speakers?.length || 0;
    const conferenceUrl = event.slug || event.id;

    return (
      <Card key={event.id} className="group hover:shadow-xl transition-all border-slate-200 bg-white overflow-hidden">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image Section */}
          <div className="relative w-full aspect-[16/10] md:aspect-auto md:min-h-[400px] overflow-hidden bg-slate-100">
            {event.cover_image ? (
              <Image
                src={event.cover_image}
                alt={event.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                style={{ objectPosition: 'center 30%' }}
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
                <Calendar className="w-20 h-20 text-teal-300" />
              </div>
            )}
            
            {/* Date Badge */}
            <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Дата проведения</div>
              <div className="text-sm font-bold text-slate-900">
                {formatDateRange(event.date, event.date_end)}
              </div>
            </div>
          </div>

          {/* Content Section */}
          <CardContent className="p-8 md:p-10 flex flex-col justify-center">
            {/* Category/Type */}
            <Badge className="bg-teal-50 text-teal-700 hover:bg-teal-100 border-0 w-fit mb-4">
              {event.type}
            </Badge>
            
            <Link href={`/conferences/${conferenceUrl}`} className="block group-hover:text-teal-600 transition-colors mb-4">
              <h3 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                {event.title}
              </h3>
            </Link>
            
            {event.description && (
              <p className="text-slate-600 text-base mb-6 line-clamp-4">
                {event.description}
              </p>
            )}
            
            {/* Meta info */}
            <div className="space-y-3 text-slate-600 mb-6">
              {event.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-teal-600 flex-shrink-0" />
                  <span>{event.location}</span>
                </div>
              )}
              {speakersCount > 0 && (
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-teal-600 flex-shrink-0" />
                  <span>{speakersCount} {speakersCount === 1 ? 'спикер' : speakersCount < 5 ? 'спикера' : 'спикеров'}</span>
                </div>
              )}
              {event.cme_hours && event.cme_hours > 0 && (
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-teal-600 flex-shrink-0" />
                  <span>{event.cme_hours} часов CME</span>
                </div>
              )}
            </div>

            {/* Speakers preview */}
            {event.speakers && event.speakers.length > 0 && (
              <div className="flex items-center gap-3 mb-8">
                <div className="flex -space-x-3">
                  {event.speakers.slice(0, 5).map((speaker, idx) => (
                    <div 
                      key={speaker.id || idx}
                      className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-slate-200 shadow-sm"
                      title={speaker.name}
                    >
                      {speaker.photo ? (
                        <Image
                          src={speaker.photo}
                          alt={speaker.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-medium text-slate-500">
                          {speaker.name?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                  ))}
                  {event.speakers.length > 5 && (
                    <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600 shadow-sm">
                      +{event.speakers.length - 5}
                    </div>
                  )}
                </div>
                <span className="text-sm text-slate-500">Ведущие специалисты</span>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-teal-600 hover:bg-teal-700 text-white rounded-full px-8">
                <Link href={`/conferences/${conferenceUrl}#register`}>
                  Зарегистрироваться
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-8 border-slate-300 hover:bg-slate-50">
                <Link href={`/conferences/${conferenceUrl}`} className="flex items-center gap-2">
                  Подробнее
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </div>
      </Card>
    );
  };

  // Компактная карточка для прошедших конференций из таблицы conferences
  const renderPastCard = (event: Conference) => {
    const speakersCount = event.speakers?.length || 0;
    const conferenceUrl = event.slug || event.id;

    return (
      <Card key={event.id} className="group hover:shadow-lg transition-all border-slate-200 bg-white flex flex-col overflow-hidden h-full">
        {/* Image Section */}
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100">
          {event.cover_image ? (
            <Image
              src={event.cover_image}
              alt={event.title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ objectPosition: 'center 30%' }}
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
              <Calendar className="w-12 h-12 text-slate-300" />
            </div>
          )}
          
          {/* Date Badge */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-slate-700 shadow-sm">
            {formatDateRange(event.date, event.date_end)}
          </div>
        </div>

        <CardContent className="p-6 flex flex-col flex-grow">
          {/* Category/Type */}
          <div className="mb-4">
            <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-0">
              {event.type}
            </Badge>
          </div>
          
          <Link href={`/conferences/${conferenceUrl}`} className="block group-hover:text-teal-600 transition-colors mb-3">
            <h3 className="text-xl font-bold text-slate-900 line-clamp-3">
              {event.title}
            </h3>
          </Link>
          
          {event.description && (
            <p className="text-slate-600 text-sm line-clamp-3 mb-4 flex-grow">
              {event.description}
            </p>
          )}
          
          {/* Meta info */}
          <div className="space-y-2 text-slate-500 text-sm mb-6">
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            {speakersCount > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span>{speakersCount} {speakersCount === 1 ? 'спикер' : speakersCount < 5 ? 'спикера' : 'спикеров'}</span>
              </div>
            )}
          </div>

          {/* Speakers preview */}
          {event.speakers && event.speakers.length > 0 && (
            <div className="flex items-center gap-2 mb-6">
              <div className="flex -space-x-2">
                {event.speakers.slice(0, 4).map((speaker, idx) => (
                  <div 
                    key={speaker.id || idx}
                    className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-slate-200"
                    title={speaker.name}
                  >
                    {speaker.photo ? (
                      <Image
                        src={speaker.photo}
                        alt={speaker.name}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-medium text-slate-500">
                        {speaker.name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                ))}
                {event.speakers.length > 4 && (
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
                    +{event.speakers.length - 4}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 mt-auto border-t border-slate-100">
            <div className="flex gap-3 text-slate-400">
              {event.materials && event.materials.length > 0 && (
                <div className="flex items-center gap-1" title="Есть материалы">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium">{event.materials.length}</span>
                </div>
              )}
            </div>
            <Link 
              href={`/conferences/${conferenceUrl}`} 
              className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
            >
              Подробнее
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Компактная карточка для прошедших конференций из таблицы news
  const renderPastNewsCard = (news: NewsItem) => {
    const mainImage = news.images && news.images.length > 0 ? news.images[0] : null;
    
    return (
      <Card key={news.id} className="group hover:shadow-lg transition-all border-slate-200 bg-white flex flex-col overflow-hidden h-full">
        {/* Image Section */}
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={news.title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ objectPosition: 'center 30%' }}
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
              <Calendar className="w-12 h-12 text-slate-300" />
            </div>
          )}
          
          {/* Date Badge */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-slate-700 shadow-sm">
            {news.date}
          </div>
        </div>

        <CardContent className="p-6 flex flex-col flex-grow">
          {/* Category */}
          {news.category && (
            <div className="mb-4">
              <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-0">
                {news.category}
              </Badge>
            </div>
          )}
          
          <Link href={`/news/${news.id}`} className="block group-hover:text-teal-600 transition-colors mb-3">
            <h3 className="text-xl font-bold text-slate-900 line-clamp-3">
              {news.title}
            </h3>
          </Link>
          
          {news.shortDescription && (
            <p className="text-slate-600 text-sm line-clamp-4 mb-4 flex-grow">
              {news.shortDescription}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end pt-4 mt-auto border-t border-slate-100">
            <Link 
              href={`/news/${news.id}`} 
              className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
            >
              Подробнее
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full space-y-16">
      {/* Предстоящие конференции - широкие тизеры */}
      {upcoming.length > 0 && (
        <section className="space-y-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Предстоящие мероприятия</h2>
            <p className="text-slate-600">Зарегистрируйтесь и примите участие</p>
          </div>
          <div className="max-w-6xl mx-auto space-y-8">
            {upcoming.map((event) => renderUpcomingTeaser(event))}
          </div>
        </section>
      )}

      {/* Прошедшие мероприятия - компактные карточки */}
      {(past.length > 0 || pastNews.length > 0) && (
        <section className="space-y-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Прошедшие мероприятия</h2>
            <p className="text-slate-600">Архив конференций и мастер-классов</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Прошедшие из таблицы conferences */}
            {past.map((event) => renderPastCard(event))}
            {/* Прошедшие из таблицы news */}
            {pastNews.map((news) => renderPastNewsCard(news))}
          </div>
        </section>
      )}

      {/* Если нет ни предстоящих, ни прошедших */}
      {upcoming.length === 0 && past.length === 0 && pastNews.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-lg mb-2">Мероприятий пока нет</p>
          <p className="text-sm">Следите за обновлениями!</p>
        </div>
      )}
    </div>
  );
}
