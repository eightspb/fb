'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Calendar, MapPin, Users } from 'lucide-react';
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
    <section className="w-full py-12 md:py-16 bg-white overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
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
              <Link key={conference.id} href={conferenceUrl} className="block h-full min-w-0">
                <div className="group hover:shadow-lg transition-all border border-slate-200 bg-white flex flex-col overflow-hidden h-full rounded-xl">
                  {/* Image Section — flush to top */}
                  <div className="relative w-full aspect-video overflow-hidden shrink-0">
                    {conference.cover_image ? (
                      <Image
                        src={conference.cover_image}
                        alt={conference.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        style={{ objectPosition: 'center 30%' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
                        <Calendar className="w-12 h-12 text-teal-300" />
                      </div>
                    )}

                    {/* Date Badge */}
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-semibold text-slate-900 shadow-sm">
                      {formatDateRange(conference.date, conference.date_end)}
                    </div>
                  </div>

                  <CardContent className="px-4 pt-3 pb-3 flex flex-col flex-grow">
                    {/* Category/Type */}
                    <div className="mb-2">
                      <Badge className="bg-teal-50 text-teal-700 hover:bg-teal-100 border-0">
                        {conference.type}
                      </Badge>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 line-clamp-2 mb-2 group-hover:text-teal-600 transition-colors">
                      {conference.title}
                    </h3>

                    {conference.description && (
                      <p className="text-slate-600 text-sm line-clamp-2 mb-3 flex-grow">
                        {conference.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 mt-auto border-t border-slate-100">
                      <div className="flex gap-3 text-slate-400">
                        {conference.speakers && Array.isArray(conference.speakers) && conference.speakers.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">{conference.speakers.length} спикеров</span>
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-teal-600 group-hover:text-teal-700 transition-colors">
                        Подробнее
                      </span>
                    </div>
                  </CardContent>
                </div>
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
