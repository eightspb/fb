'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Calendar, MapPin, Users, Clock } from 'lucide-react';
import { Conference } from '@/lib/types/conference';

export function UpcomingConferencesSection() {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConferences() {
      try {
        const response = await fetch('/api/conferences?status=published');
        if (response.ok) {
          const data: Conference[] = await response.json();
          
          // Фильтруем предстоящие конференции
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
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

          const upcoming = data
            .filter(c => {
              const endDate = c.date_end ? parseDate(c.date_end) : parseDate(c.date);
              endDate.setHours(0, 0, 0, 0);
              return endDate >= today;
            })
            .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
            .slice(0, 2); // Берем только 2 ближайшие

          setConferences(upcoming);
        }
      } catch (error) {
        console.error('Failed to load conferences:', error);
      } finally {
        setLoading(false);
      }
    }
    loadConferences();
  }, []);

  if (loading) {
    return null;
  }

  if (conferences.length === 0) {
    return null;
  }

  const formatDateRange = (start: string, end?: string) => {
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

  return (
    <section className="w-full py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Предстоящие мероприятия
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl">
              Присоединяйтесь к конференциям, мастер-классам и обучающим программам
            </p>
          </div>
          <Button variant="outline" className="hidden md:flex" asChild>
            <Link href="/conferences">
              Все мероприятия
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {conferences.map((conference) => {
            const conferenceUrl = conference.slug 
              ? `/conferences/${conference.slug}` 
              : `/conferences/${conference.id}`;

            return (
              <Link key={conference.id} href={conferenceUrl}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-slate-200 group cursor-pointer overflow-hidden">
                  <div className="relative aspect-video overflow-hidden">
                    {conference.cover_image ? (
                      <Image
                        src={conference.cover_image}
                        alt={conference.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
                        <Calendar className="w-16 h-16 text-white/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
                      <Badge className="bg-teal-500 text-white border-0">
                        {conference.type}
                      </Badge>
                      {conference.cme_hours && 
                       typeof conference.cme_hours === 'number' && 
                       conference.cme_hours > 0 && (
                        <Badge variant="secondary" className="bg-white/90 text-slate-700">
                          <Clock className="w-3 h-3 mr-1" />
                          {conference.cme_hours} ч.
                        </Badge>
                      )}
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <h3 className="text-2xl font-bold mb-2 line-clamp-2 group-hover:text-teal-200 transition-colors">
                        {conference.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-white/90">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDateRange(conference.date, conference.date_end)}</span>
                        </div>
                        {conference.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{conference.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    {conference.description && (
                      <p className="text-slate-600 line-clamp-2 mb-4">
                        {conference.description}
                      </p>
                    )}
                    {conference.speakers && Array.isArray(conference.speakers) && conference.speakers.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                        <Users className="w-4 h-4" />
                        <span>
                          {conference.speakers.length === 1 
                            ? (typeof conference.speakers[0] === 'string' 
                                ? conference.speakers[0] 
                                : (conference.speakers[0] as any).name || String(conference.speakers[0]))
                            : `${conference.speakers.length} спикеров`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center text-teal-600 font-medium text-sm group-hover:gap-2 transition-all">
                      Подробнее
                      <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Button variant="outline" asChild>
            <Link href="/conferences">
              Все мероприятия
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
